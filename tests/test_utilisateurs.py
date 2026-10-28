"""Comptes, mots de passe et droits par module.

**Pourquoi ce fichier existe.** C'est la porte de l'application entière depuis
que la « vue libre » a disparu : tout passe par un compte. Les défauts de cette
couche sont silencieux par nature - un hachage faible, une fuite par le temps
de réponse ou un droit mal évalué ne cassent rien de visible, ils ouvrent.

Trois propriétés sont tenues ici, et aucune ne se lit dans le code :

  - un mot de passe n'est **jamais** stocké, ni comparé en clair ;
  - un compte inconnu coûte le **même temps** qu'un compte connu ;
  - le dernier superadministrateur ne peut pas disparaître, sinon plus
    personne ne peut gérer les comptes et l'outil est perdu.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import json
import os
import tempfile
import time
import unittest

from backend import base
from backend.metier.comptes import utilisateurs as u
from tests import muet

if TYPE_CHECKING:
    from typing import Any

    from backend.base.comptes.depot import CompteDetail

MDP = 'motdepasse-solide'
def _compte(chemin: str, nom: str) -> CompteDetail:
    """Le compte, qui doit exister : son absence fait échouer le test."""
    c = u.compte(chemin, nom)
    assert c is not None, 'compte %s absent' % nom
    return c
class BaseAvecComptes(unittest.TestCase):

    def setUp(self) -> None:
        self._dir = tempfile.TemporaryDirectory()
        self.db = os.path.join(self._dir.name, 'test.db')
        base.initialiser(self.db, muet)
        self.addCleanup(self._dir.cleanup)
class Hachage(unittest.TestCase):
    """Ce que l'empreinte garantit."""

    def test_le_mot_de_passe_n_apparait_pas_dans_l_empreinte(self) -> None:
        """L'évidence, et c'est justement pour cela qu'on l'écrit : une
        version « provisoire » qui stocke en clair ne se voit pas."""
        e = u._empreinte(MDP)
        self.assertNotIn(MDP, e)
        self.assertNotIn(MDP.encode('utf-8').hex(), e)

    def test_deux_empreintes_du_meme_mot_de_passe_different(self) -> None:
        """Le sel est aléatoire et par compte. Sans lui, deux comptes de même
        mot de passe se reconnaissent à l'œil dans la base, et une table
        pré-calculée les casse tous les deux d'un coup."""
        self.assertNotEqual(u._empreinte(MDP), u._empreinte(MDP))

    def test_l_empreinte_se_verifie(self) -> None:
        e = u._empreinte(MDP)
        self.assertTrue(u.verifier(MDP, e))
        self.assertFalse(u.verifier(MDP + 'x', e))
        self.assertFalse(u.verifier('', e))

    def test_l_algorithme_est_inscrit_dans_l_empreinte(self) -> None:
        """Sans lui, changer de paramètres rendrait invérifiables tous les
        mots de passe existants - donc verrouillerait tout le monde dehors."""
        e = u._empreinte(MDP)
        algo = e.split(u.SEPARATEUR)[0]
        self.assertIn(algo, ('scrypt', 'pbkdf2'))
        self.assertEqual(len(e.split(u.SEPARATEUR)), 4)

    def test_une_empreinte_illisible_refuse_sans_lever(self) -> None:
        """Une base corrompue ne doit pas faire tomber le service, ni laisser
        entrer. Et le refus ne doit pas se distinguer d'un mauvais mot de
        passe : le distinguer renseignerait sur l'état de la base."""
        for mauvaise in ('', 'nimporte quoi', 'scrypt$x$y', 'inconnu$a$b$c',
                         'scrypt$n=x,r=y,p=z$aaaa$bbbb', None):
            with self.subTest(empreinte=mauvaise):
                self.assertFalse(u.verifier(MDP, mauvaise))

    def test_un_type_autre_qu_une_chaine_est_refuse(self) -> None:
        """Le corps de la requête est du JSON fourni par le client :
        `mot_de_passe` peut être un nombre, une liste, `null`."""
        e = u._empreinte(MDP)
        for faux in (None, 1234, ['x'], {'a': 1}, b'bytes'):
            with self.subTest(fourni=faux):
                self.assertFalse(u.verifier(faux, e))
class ReglesDeSaisie(unittest.TestCase):

    def test_un_nom_valide_passe(self) -> None:
        for nom in ('benjamin', 'b.k', 'super_admin', 'a-1', 'ab'):
            with self.subTest(nom=nom):
                self.assertEqual(u.controler_nom(nom), nom)

    def test_un_nom_invalide_est_refuse(self) -> None:
        """Ce nom part dans le journal d'exploitation et dans les messages
        d'erreur : un espace ou un caractère de contrôle s'y lit mal et s'y
        neutralise moins bien."""
        for nom in ('', 'a', 'avec espace', 'accentué', 'a' * 33, 'x/y',
                    "quote'", '<script>', None):
            with self.subTest(nom=nom), self.assertRaises(u.Refus):
                u.controler_nom(nom)

    def test_il_n_y_a_AUCUNE_politique_de_mot_de_passe(self) -> None:
        """**Il y a eu une longueur minimale de douze. Elle a été retirée.**

        Ce test dit que c'est une décision, et non un contrôle perdu en
        route : un mot de passe d'un caractère est accepté. Ce qui protège du
        forçage est ailleurs et reste en place - l'empreinte scrypt à ~70 ms
        par essai, et la temporisation exponentielle des tentatives.
        """
        for court in ('x', 'ab', '1234', 'court'):
            with self.subTest(mot_de_passe=court):
                self.assertEqual(u.controler_mot_de_passe(court), court)

    def test_un_mot_de_passe_vide_reste_refuse(self) -> None:
        """Pas une politique mais une exigence technique : hacher `None`
        lèverait, et un compte à mot de passe vide s'ouvre en validant un
        formulaire vide."""
        for rien in ('', None, 12, b'octets'):
            with self.subTest(valeur=rien), self.assertRaises(u.Refus):
                u.controler_mot_de_passe(rien)
class CycleDeVieDesComptes(BaseAvecComptes):

    def test_aucun_compte_au_depart(self) -> None:
        """C'est ce booléen qui déclenche l'écran d'installation."""
        self.assertFalse(u.existe_un_compte(self.db))

    def test_creation_puis_authentification(self) -> None:
        u.creer(self.db, 'benjamin', MDP, superadmin=True)
        self.assertTrue(u.existe_un_compte(self.db))
        self.assertIsNotNone(u.authentifier(self.db, 'benjamin', MDP))
        self.assertIsNone(u.authentifier(self.db, 'benjamin', 'faux'))

    def test_un_nom_deja_pris_est_refuse(self) -> None:
        u.creer(self.db, 'benjamin', MDP)
        with self.assertRaises(u.Refus):
            u.creer(self.db, 'benjamin', MDP)

    def test_un_compte_desactive_ne_s_authentifie_plus(self) -> None:
        u.creer(self.db, 'lecteur', MDP, superadmin=True)
        u.creer(self.db, 'autre', MDP)
        u.modifier(self.db, 'autre', actif=False)
        self.assertIsNone(u.authentifier(self.db, 'autre', MDP))

    def test_le_changement_de_mot_de_passe_invalide_l_ancien(self) -> None:
        u.creer(self.db, 'benjamin', MDP)
        u.modifier(self.db, 'benjamin', mot_de_passe='autre-mot-de-passe')
        self.assertIsNone(u.authentifier(self.db, 'benjamin', MDP))
        self.assertIsNotNone(
            u.authentifier(self.db, 'benjamin', 'autre-mot-de-passe'))

    def test_la_suppression_emporte_les_droits(self) -> None:
        """`ON DELETE CASCADE` : sans lui, recréer un compte du même nom lui
        rendrait silencieusement les droits de son homonyme disparu."""
        u.creer(self.db, 'chef', MDP, superadmin=True)
        u.creer(self.db, 'lecteur', MDP, droits=['clients:view'])
        u.supprimer(self.db, 'lecteur')
        u.creer(self.db, 'lecteur', MDP)
        self.assertEqual(_compte(self.db, 'lecteur')['droits'], [])

    def test_l_empreinte_ne_sort_jamais_de_la_liste(self) -> None:
        """Même hachée, sa diffusion permet une attaque hors ligne - sans
        temporisation et sans trace."""
        u.creer(self.db, 'benjamin', MDP, superadmin=True)
        for c in u.lister(self.db):
            self.assertNotIn('empreinte', c)
class LeDernierSuperadmin(BaseAvecComptes):
    """Il ne peut pas disparaître.

    Ce n'est pas de la courtoisie : la gestion des comptes leur est réservée,
    donc supprimer le dernier rend l'application définitivement ingérable - il
    faudrait éditer la base à la main.
    """

    def test_on_ne_supprime_pas_le_dernier(self) -> None:
        u.creer(self.db, 'chef', MDP, superadmin=True)
        with self.assertRaises(u.Refus):
            u.supprimer(self.db, 'chef')

    def test_on_ne_desactive_pas_le_dernier(self) -> None:
        u.creer(self.db, 'chef', MDP, superadmin=True)
        with self.assertRaises(u.Refus):
            u.modifier(self.db, 'chef', actif=False)

    def test_on_supprime_l_avant_dernier(self) -> None:
        """Le garde-fou ne doit pas bloquer le cas normal : tant qu'il en
        reste un, on peut retirer les autres."""
        u.creer(self.db, 'chef', MDP, superadmin=True)
        u.creer(self.db, 'chef2', MDP, superadmin=True)
        u.supprimer(self.db, 'chef2')
        self.assertEqual(len(u.lister(self.db)), 1)

    def test_un_superadmin_desactive_ne_compte_plus(self) -> None:
        """Deux superadmins dont un désactivé, cela fait UN : supprimer
        l'actif doit être refusé."""
        u.creer(self.db, 'chef', MDP, superadmin=True)
        u.creer(self.db, 'chef2', MDP, superadmin=True)
        u.modifier(self.db, 'chef2', actif=False)
        with self.assertRaises(u.Refus):
            u.supprimer(self.db, 'chef')

    def test_un_compte_ordinaire_se_supprime_librement(self) -> None:
        u.creer(self.db, 'chef', MDP, superadmin=True)
        u.creer(self.db, 'lecteur', MDP)
        u.supprimer(self.db, 'lecteur')
        self.assertIsNone(u.compte(self.db, 'lecteur'))
class LesBooleensSortentEnBooleens(BaseAvecComptes):
    """SQLite n'a pas de type booléen : `superadmin` et `actif` y sont des
    INTEGER 0/1.

    **Ces dictionnaires partent tels quels en JSON**, et un `0` y arrive en
    nombre. Côté interface, `{compte.superadmin && <p/>}` rend alors le
    caractère « 0 » à l'écran au lieu de ne rien rendre - un zéro s'affichait
    sous chaque encadré de rôles.

    Le défaut est **entièrement muet côté serveur** : toutes les comparaisons
    Python passent, tous les contrôles d'accès fonctionnent, et il ne se voit
    qu'au pixel près à l'autre bout de la chaîne. D'où ce test, qui exige le
    TYPE et non la valeur de vérité.
    """

    def test_compte_rend_de_vrais_booleens(self) -> None:
        u.creer(self.db, 'chef', MDP, superadmin=True)
        c = _compte(self.db, 'chef')
        self.assertIsInstance(c['superadmin'], bool)
        self.assertIsInstance(c['actif'], bool)

    def test_lister_rend_de_vrais_booleens(self) -> None:
        u.creer(self.db, 'chef', MDP, superadmin=True)
        u.creer(self.db, 'lecteur', MDP)
        u.modifier(self.db, 'lecteur', actif=False)
        for c in u.lister(self.db):
            with self.subTest(compte=c['nom']):
                self.assertIsInstance(c['superadmin'], bool)
                self.assertIsInstance(c['actif'], bool)

    def test_aucun_zero_ni_un_dans_le_json_rendu(self) -> None:
        """Le contrôle tel que l'interface le subit : ce qui compte est ce qui
        traverse `json.dumps`, pas ce que Python considère comme faux."""
        u.creer(self.db, 'chef', MDP, superadmin=True)
        u.creer(self.db, 'lecteur', MDP)
        rendu = json.loads(json.dumps(u.lister(self.db)))
        for c in rendu:
            with self.subTest(compte=c['nom']):
                self.assertIn(c['superadmin'], (True, False))
                self.assertIn(c['actif'], (True, False))
class RolesInclusifs(unittest.TestCase):
    """Les rôles d'un module s'emboîtent : `admin` ⊃ `operator` ⊃ `view`.

    **Logique pure, et c'est là qu'elle doit être testée.** Un rôle mal
    comparé ne casse rien de visible : il ouvre une porte, ou il en ferme une
    à quelqu'un qui devrait la franchir. Les deux se découvrent à l'usage,
    longtemps après.
    """

    RANGS = ('view', 'operator', 'admin')

    def test_un_role_couvre_les_moins_etendus(self) -> None:
        for tenu, exige, attendu in (
                ('admin', 'view', True), ('admin', 'operator', True),
                ('admin', 'admin', True), ('operator', 'view', True),
                ('operator', 'operator', True), ('operator', 'admin', False),
                ('view', 'view', True), ('view', 'operator', False),
                ('view', 'admin', False)):
            with self.subTest(tenu=tenu, exige=exige):
                self.assertEqual(
                    u.role_suffit(tenu, exige, self.RANGS), attendu)

    def test_sans_role_rien_ne_passe(self) -> None:
        self.assertFalse(u.role_suffit(None, 'view', self.RANGS))
        self.assertFalse(u.role_suffit(None, None, self.RANGS))

    def test_un_role_quelconque_suffit_quand_rien_n_est_exige(self) -> None:
        self.assertTrue(u.role_suffit('view', None, self.RANGS))

    def test_un_role_inconnu_ne_passe_pas(self) -> None:
        """Un rôle resté en base après un renommage ne doit pas ouvrir par
        défaut : il doit fermer."""
        self.assertFalse(u.role_suffit('ancien-role', 'view', self.RANGS))

    def test_le_role_tenu_est_le_plus_eleve_trouve(self) -> None:
        """Rien n'interdit à la base de porter deux lignes pour un même
        module - migration, écriture concurrente. Mieux vaut une règle qui
        tranche qu'un résultat dépendant de l'ordre de lecture."""
        droits = ['clients:view', 'clients:admin']
        self.assertEqual(u.role_tenu(droits, 'clients', self.RANGS), 'admin')

    def test_un_autre_module_ne_deteint_pas(self) -> None:
        self.assertIsNone(
            u.role_tenu(['accueil:acces'], 'clients', self.RANGS))
class Droits(BaseAvecComptes):
    REGISTRE = {'accueil': ('acces',),
                'clients': ('view', 'operator', 'admin')}

    def roles(self, nom: str) -> dict[str, str]:
        return u.roles_par_module(u.compte(self.db, nom), self.REGISTRE)

    def test_un_compte_n_a_que_ce_qu_on_lui_accorde(self) -> None:
        u.creer(self.db, 'lecteur', MDP, droits=['accueil:acces'])
        self.assertEqual(self.roles('lecteur'), {'accueil': 'acces'})

    def test_le_role_accorde_est_celui_qui_ressort(self) -> None:
        u.creer(self.db, 'lecteur', MDP, droits=['clients:operator'])
        self.assertEqual(self.roles('lecteur'), {'clients': 'operator'})

    def test_un_superadmin_tient_le_role_le_plus_eleve_partout(self) -> None:
        u.creer(self.db, 'chef', MDP, superadmin=True)
        self.assertEqual(self.roles('chef'),
                         {'accueil': 'acces', 'clients': 'admin'})

    def test_un_superadmin_a_les_modules_AJOUTES_APRES(self) -> None:
        """**La raison d'être de l'exception superadmin.** Sans elle, ajouter
        un module obligerait à ré-accorder un droit à quelqu'un pour pouvoir
        en accorder aux autres - et un module neuf ne serait accessible à
        personne."""
        u.creer(self.db, 'chef', MDP, superadmin=True)
        apres = dict(self.REGISTRE, neuf=('lecture', 'ecriture'))
        tenus = u.roles_par_module(_compte(self.db, 'chef'), apres)
        self.assertEqual(tenus.get('neuf'), 'ecriture')

    def test_les_droits_se_remplacent_et_ne_s_accumulent_pas(self) -> None:
        u.creer(self.db, 'lecteur', MDP,
                droits=['accueil:acces', 'clients:admin'])
        u.modifier(self.db, 'lecteur', droits=['accueil:acces'])
        self.assertEqual(_compte(self.db, 'lecteur')['droits'],
                         ['accueil:acces'])

    def test_un_compte_desactive_n_a_plus_aucun_module(self) -> None:
        u.creer(self.db, 'chef', MDP, superadmin=True)
        u.creer(self.db, 'lecteur', MDP, droits=['accueil:acces'])
        u.modifier(self.db, 'lecteur', actif=False)
        self.assertEqual(self.roles('lecteur'), {})

    def test_un_compte_inconnu_n_a_rien(self) -> None:
        self.assertEqual(u.roles_par_module(None, self.REGISTRE), {})
class LeSuperadministrateurFondateur(BaseAvecComptes):
    """Qui peut nommer, et qui ne peut pas être défait.

    **C'est le seul pouvoir qui ne se partage pas.** Des superadministrateurs
    qui peuvent se rétrograder les uns les autres finissent par n'en laisser
    qu'un, et ce n'est pas forcément celui qu'on aurait choisi - c'est celui
    qui a cliqué le premier. Le fondateur est le compte créé à l'installation.

    Les règles tenues ici sont muettes par nature : une base où le fondateur a
    été rétrogradé se comporte normalement jusqu'au jour où quelqu'un cherche
    à nommer un remplaçant, et découvre que personne ne le peut plus.
    """

    def setUp(self) -> None:
        super().setUp()
        u.creer(self.db, 'chef', MDP, superadmin=True, fondateur=True)
        u.creer(self.db, 'adjoint', MDP, superadmin=True)
        u.creer(self.db, 'lecteur', MDP, droits=['accueil:acces'])

    def test_le_fondateur_est_marque(self) -> None:
        self.assertTrue(_compte(self.db, 'chef')['fondateur'])
        self.assertFalse(_compte(self.db, 'adjoint')['fondateur'])

    def test_il_n_y_en_a_QU_UN(self) -> None:
        with self.assertRaises(u.Refus):
            u.creer(self.db, 'autre', MDP, superadmin=True, fondateur=True)

    def test_un_superadmin_se_retrograde_et_reprend_des_roles(self) -> None:
        """C'est tout l'objet : rétrogradé, il redevient un compte ordinaire
        et les rôles par module valent de nouveau pour lui."""
        c = u.modifier(self.db, 'adjoint', superadmin=False,
                       droits=['clients:operator'])
        self.assertFalse(c['superadmin'])
        self.assertEqual(c['droits'], ['clients:operator'])
        roles = u.roles_par_module(c, {'accueil': ('acces',),
                                       'clients': ('view', 'operator',
                                                    'admin')})
        self.assertEqual(roles, {'clients': 'operator'})

    def test_un_compte_ordinaire_se_nomme(self) -> None:
        c = u.modifier(self.db, 'lecteur', superadmin=True)
        self.assertTrue(c['superadmin'])
        self.assertFalse(c['fondateur'])

    def test_le_fondateur_ne_se_retrograde_pas(self) -> None:
        """Le pouvoir de nommer disparaîtrait avec lui, et l'application
        n'aurait plus personne pour en désigner un autre."""
        with self.assertRaises(u.Refus):
            u.modifier(self.db, 'chef', superadmin=False)

    def test_le_fondateur_ne_se_desactive_ni_ne_se_supprime(self) -> None:
        with self.assertRaises(u.Refus):
            u.modifier(self.db, 'chef', actif=False)
        with self.assertRaises(u.Refus):
            u.supprimer(self.db, 'chef')

    def test_le_dernier_superadmin_ne_se_retrograde_pas(self) -> None:
        """Le fondateur est déjà protégé ; ce contrôle vaut pour les bases
        d'avant le drapeau, qui pourraient n'en avoir aucun."""
        with base._connexion(self.db) as cx:
            cx.execute('UPDATE "comptes.utilisateur" SET fondateur = 0')
        u.modifier(self.db, 'adjoint', superadmin=False)
        with self.assertRaises(u.Refus):
            u.modifier(self.db, 'chef', superadmin=False)

    def test_renommer_le_meme_drapeau_ne_change_rien(self) -> None:
        """Réappliquer `superadmin=True` sur un superadmin ne doit pas
        déclencher le contrôle du dernier : il n'y a pas de rétrogradation."""
        c = u.modifier(self.db, 'chef', superadmin=True)
        self.assertTrue(c['superadmin'])
class LeFondateurEstAuDessusDuSuperadmin(BaseAvecComptes):
    """Les deux portes qui laissaient un superadmin ordinaire prendre la main.

    Le fondateur était protégé de la rétrogradation, de la désactivation et de
    la suppression. Il ne l'était **ni de la nomination par une autre porte, ni
    du changement de son mot de passe** :

      - `creer(superadmin=True)` n'était pas contrôlé, alors que
        `modifier(superadmin=True)` l'était. Il suffisait de créer le compte
        déjà promu ;
      - poser un mot de passe sur le compte fondateur revenait à s'y
        connecter, donc à obtenir tout ce que les trois refus voisins
        interdisaient - et à en sortir le fondateur lui-même.

    Les deux se vérifiaient de bout en bout sur une instance réelle, et le
    journal d'exploitation n'en disait que « compte modifié ». Ce sont des
    défauts qui ne se voient pas : ils ne cassent rien, ils déplacent le
    pouvoir.
    """

    def setUp(self) -> None:
        super().setUp()
        u.creer(self.db, 'chef', MDP, superadmin=True, fondateur=True)
        u.creer(self.db, 'adjoint', MDP, superadmin=True)
        u.creer(self.db, 'lecteur', MDP, droits=['accueil:acces'])
        self.chef = _compte(self.db, 'chef')
        self.adjoint = _compte(self.db, 'adjoint')

    # -- la règle, isolée --------------------------------------------------
    def test_seul_le_fondateur_nomme(self) -> None:
        self.assertTrue(u.peut_nommer_superadmin(self.chef))
        self.assertFalse(u.peut_nommer_superadmin(self.adjoint))
        self.assertFalse(u.peut_nommer_superadmin(None))

    def test_le_fondateur_n_est_administrable_que_par_lui_meme(self) -> None:
        self.assertTrue(u.peut_administrer(self.chef, self.chef))
        self.assertFalse(u.peut_administrer(self.adjoint, self.chef))
        # Sur un compte ordinaire, un superadmin ordinaire garde la main :
        # c'est son travail, et le restreindre ferait du fondateur le seul
        # gestionnaire de comptes de l'outil.
        self.assertTrue(u.peut_administrer(self.adjoint,
                                           _compte(self.db, 'lecteur')))

    # -- porte n°1 : la création -------------------------------------------
    def test_un_superadmin_ordinaire_ne_CREE_pas_de_superadmin(self) -> None:
        with self.assertRaises(u.Refus):
            u.creer(self.db, 'complice', MDP, superadmin=True,
                    par=self.adjoint)
        self.assertIsNone(u.compte(self.db, 'complice'))

    def test_un_superadmin_ordinaire_cree_un_compte_ORDINAIRE(self) -> None:
        c = u.creer(self.db, 'stagiaire', MDP, droits=['accueil:acces'],
                    par=self.adjoint)
        self.assertFalse(c['superadmin'])

    def test_le_fondateur_cree_un_superadmin(self) -> None:
        c = u.creer(self.db, 'second', MDP, superadmin=True, par=self.chef)
        self.assertTrue(c['superadmin'])
        self.assertFalse(c['fondateur'])

    def test_l_installation_cree_le_fondateur_sans_appelant(self) -> None:
        """`par=None` est l'appelant SYSTÈME, et il n'a pas de chemin HTTP :
        c'est l'installation, qui crée précisément le premier compte alors
        qu'aucun n'existe pour l'autoriser."""
        u.supprimer(self.db, 'adjoint')
        # Le fondateur du `setUp` occupe la place ; on vérifie sur une base
        # neuve que la création système passe.
        autre = os.path.join(self._dir.name, 'neuve.db')
        base.initialiser(autre, muet)
        c = u.creer(autre, 'premier', MDP, superadmin=True, fondateur=True)
        self.assertTrue(c['fondateur'])

    # -- porte n°2 : le mot de passe ---------------------------------------
    def test_un_ordinaire_ne_change_pas_le_MOT_DE_PASSE_du_fondateur(
            self) -> None:
        """**Le défaut le plus grave des deux.** Il ne se voyait nulle part :
        la modification réussissait, et le fondateur découvrait le vol en ne
        pouvant plus se connecter."""
        with self.assertRaises(u.Refus):
            u.modifier(self.db, 'chef', mot_de_passe='vole',
                       par=self.adjoint)
        # Et le mot de passe d'origine vaut toujours : rien n'a été écrit.
        self.assertIsNotNone(u.authentifier(self.db, 'chef', MDP))
        self.assertIsNone(u.authentifier(self.db, 'chef', 'vole'))

    def test_le_fondateur_change_son_propre_mot_de_passe(self) -> None:
        u.modifier(self.db, 'chef', mot_de_passe='nouveau', par=self.chef)
        self.assertIsNotNone(u.authentifier(self.db, 'chef', 'nouveau'))

    def test_un_ordinaire_change_le_mot_de_passe_d_un_ORDINAIRE(self) -> None:
        """La contrepartie : restreindre au-delà ferait du fondateur le seul
        capable de dépanner un compte, ce qui n'est pas le but."""
        u.modifier(self.db, 'lecteur', mot_de_passe='autre', par=self.adjoint)
        self.assertIsNotNone(u.authentifier(self.db, 'lecteur', 'autre'))

    # -- les autres faces du même compte -----------------------------------
    def test_un_superadmin_ordinaire_ne_touche_a_rien_du_fondateur(
            self) -> None:
        demandes: list[dict[str, Any]] = [
            {'actif': False}, {'droits': []}, {'superadmin': False},
            {'mot_de_passe': 'x'}]
        for kwargs in demandes:
            with self.assertRaises(u.Refus, msg=kwargs):
                u.modifier(self.db, 'chef', par=self.adjoint, **kwargs)
        with self.assertRaises(u.Refus):
            u.supprimer(self.db, 'chef', par=self.adjoint)

    def test_un_superadmin_ordinaire_ne_retrograde_pas_un_pair(self) -> None:
        with self.assertRaises(u.Refus):
            u.modifier(self.db, 'adjoint', superadmin=False,
                       par=self.adjoint)
        self.assertTrue(_compte(self.db, 'adjoint')['superadmin'])
class PasDOracleParLeTemps(BaseAvecComptes):
    """Un compte inconnu doit coûter le même temps qu'un compte connu.

    Sans cela, un nom inconnu répond en une fraction de milliseconde là où un
    nom connu paie le hachage : l'écart suffit à **énumérer les comptes
    existants** sans jamais en deviner un mot de passe. Le hachage est donc
    exécuté contre une empreinte factice, même quand le compte n'existe pas.
    """

    def mesurer(self, nom: str, tours: int = 3) -> float:
        debut = time.perf_counter()
        for _ in range(tours):
            u.authentifier(self.db, nom, 'un-mot-de-passe-quelconque')
        return (time.perf_counter() - debut) / tours

    def test_un_nom_inconnu_coute_autant_qu_un_nom_connu(self) -> None:
        u.creer(self.db, 'connu', MDP, superadmin=True)
        connu = self.mesurer('connu')
        inconnu = self.mesurer('inexistant')
        # Le seuil est large à dessein : on cherche un écart d'ORDRE DE
        # GRANDEUR - celui qui sépare « on a haché » de « on a rendu tout de
        # suite » - pas une égalité que la charge de la machine rendrait
        # instable.
        self.assertGreater(inconnu, connu / 4,
                           'un nom inconnu répond trop vite : le temps de '
                           'réponse permet de deviner les comptes existants')
if __name__ == '__main__':
    unittest.main()

"""Sessions : jetons, temporisation des tentatives, cookie.

**Pourquoi ce fichier existe.** C'est de la logique pure - aucun réseau,
aucune base - et c'est ce qui tient la porte une fois le mot de passe vérifié.
Un défaut y est **parfaitement muet** : une temporisation qui n'incrémente pas
se comporte exactement comme une temporisation qui marche, jusqu'au jour où
quelqu'un essaie vraiment en boucle.

Le hachage et les comptes sont testés à part, dans `test_utilisateurs.py` :
ici le jeton ne porte qu'un NOM, et c'est tout ce qu'on en demande.
"""
from __future__ import annotations

from typing import cast

import time
import unittest

from backend.metier.comptes import sessions
class CycleDeVieDesJetons(unittest.TestCase):
    """Un jeton s'ouvre, vaut, se ferme - et expire tout seul."""

    def setUp(self) -> None:
        self.s = sessions.Sessions(ttl=3600)

    def test_un_jeton_ouvert_est_valide(self) -> None:
        self.assertEqual(self.s.utilisateur(self.s.ouvrir('benjamin')),
                         'benjamin')

    def test_deux_jetons_sont_distincts(self) -> None:
        """`secrets.token_urlsafe` : deux sessions ne doivent pas se
        confondre, et un jeton ne doit pas être devinable depuis un autre."""
        jetons = {self.s.ouvrir('benjamin') for _ in range(50)}
        self.assertEqual(len(jetons), 50)

    def test_un_jeton_ferme_ne_vaut_plus(self) -> None:
        j = self.s.ouvrir('benjamin')
        self.s.fermer(j)
        self.assertIsNone(self.s.utilisateur(j))

    def test_un_jeton_inconnu_ne_vaut_pas(self) -> None:
        self.assertIsNone(self.s.utilisateur('jeton-invente'))

    def test_l_absence_de_jeton_ne_vaut_pas(self) -> None:
        """Le cas courant : aucun cookie. Doit répondre faux sans lever - la
        route `/api/session` le demande à chaque chargement de page."""
        for rien in (None, '', 0):
            with self.subTest(valeur=rien):
                # Valeurs d'un cookie absent.
                self.assertIsNone(self.s.utilisateur(cast('str | None', rien)))

    def test_un_jeton_expire_ne_vaut_plus(self) -> None:
        """Le TTL est la seule limite de durée d'une session."""
        s = sessions.Sessions(ttl=-1)          # déjà expiré à l'ouverture
        self.assertIsNone(s.utilisateur(s.ouvrir('benjamin')))

    def test_les_jetons_expires_sont_purges(self) -> None:
        """Sinon `_jetons` grandit d'une entrée par connexion et n'est jamais
        vidé : la mémoire croît avec le nombre de sessions ouvertes depuis le
        démarrage."""
        s = sessions.Sessions(ttl=-1)
        for _ in range(10):
            s.ouvrir('benjamin')
        vivant = sessions.Sessions(ttl=3600)
        s.ttl = vivant.ttl
        s.ouvrir('benjamin')                              # déclenche le ménage
        self.assertEqual(len(s._jetons), 1)
class TemporisationDesTentatives(unittest.TestCase):
    """La progression documentée : 0, 0, 1, 2, 4, 8, 16, 32, 60, 60…

    Trois essais gratuits, puis un doublement plafonné à 60 s. C'est ce qui
    rend le forçage impraticable sans rendre la connexion pénible à qui se
    trompe une fois.
    """

    def setUp(self) -> None:
        self.s = sessions.Sessions(ttl=3600)

    def test_aucune_attente_avant_le_troisieme_echec(self) -> None:
        """Se tromper de frappe ne doit pas verrouiller l'accès."""
        for _ in range(2):
            self.s.echec('10.0.0.1')
            self.assertEqual(self.s.attente('10.0.0.1'), 0.0)

    def test_la_progression_est_exponentielle_et_plafonnee(self) -> None:
        attendus = [0, 0, 1, 2, 4, 8, 16, 32, 60, 60, 60]
        obtenus = []
        for _ in attendus:
            self.s.echec('10.0.0.2')
            obtenus.append(round(self.s.attente('10.0.0.2')))
        self.assertEqual(obtenus, attendus)

    def test_les_adresses_sont_independantes(self) -> None:
        """Un attaquant ne doit pas pouvoir verrouiller la connexion des
        autres - c'est exactement le risque que `TRUST_PROXY` adresse côté
        serveur, et il serait vain si le compteur était global."""
        for _ in range(8):
            self.s.echec('10.0.0.3')
        self.assertGreater(self.s.attente('10.0.0.3'), 0)
        self.assertEqual(self.s.attente('10.0.0.4'), 0.0)

    def test_un_succes_remet_le_compteur_a_zero(self) -> None:
        for _ in range(5):
            self.s.echec('10.0.0.5')
        self.s.succes('10.0.0.5')
        self.assertEqual(self.s.attente('10.0.0.5'), 0.0)

    def test_une_adresse_inconnue_n_attend_pas(self) -> None:
        self.assertEqual(self.s.attente('10.0.0.99'), 0.0)

    def test_les_adresses_inactives_sont_oubliees(self) -> None:
        """Sans cet oubli, `_essais` grandit d'une entrée par adresse ayant
        échoué une fois, et n'est JAMAIS vidé : la mémoire croît avec le
        nombre d'adresses distinctes rencontrées - donc, sur un service
        exposé, sans borne."""
        self.s.echec('10.0.0.6')
        self.assertIn('10.0.0.6', self.s._essais)
        # On recule l'échéance au-delà de la fenêtre d'oubli, puis un nouvel
        # échec sur une AUTRE adresse déclenche le ménage.
        nb, _ = self.s._essais['10.0.0.6']
        self.s._essais['10.0.0.6'] = (nb, time.time()
                                      - sessions.OUBLI_ESSAIS - 1)
        self.s.echec('10.0.0.7')
        self.assertNotIn('10.0.0.6', self.s._essais)

    def test_une_adresse_encore_en_attente_n_est_pas_oubliee(self) -> None:
        """L'oubli ne doit pas relâcher une temporisation en cours : ce serait
        une façon d'échapper au délai en patientant."""
        for _ in range(6):
            self.s.echec('10.0.0.8')
        self.s.echec('10.0.0.9')
        self.assertIn('10.0.0.8', self.s._essais)
        self.assertGreater(self.s.attente('10.0.0.8'), 0)
class UnJetonPorteUnNom(unittest.TestCase):
    """Ce que le jeton transporte, et ce qu'on en fait.

    Il ne portait qu'un booléen « oui, c'est l'admin » : il n'y avait qu'un
    mot de passe partagé, donc rien à nommer. Il porte maintenant le NOM du
    compte, et c'est **la** différence qui rend la traçabilité possible - le
    journal peut dire qui a éteint la collecte.
    """

    def setUp(self) -> None:
        self.s = sessions.Sessions(ttl=3600)

    def test_le_jeton_rend_le_nom_du_compte(self) -> None:
        self.assertEqual(self.s.utilisateur(self.s.ouvrir('benjamin')),
                         'benjamin')

    def test_deux_comptes_ont_des_jetons_distincts(self) -> None:
        a = self.s.ouvrir('benjamin')
        b = self.s.ouvrir('lecteur')
        self.assertEqual(self.s.utilisateur(a), 'benjamin')
        self.assertEqual(self.s.utilisateur(b), 'lecteur')

    def test_fermer_un_compte_ferme_TOUTES_ses_sessions(self) -> None:
        """Sans cela, un compte désactivé garderait ses sessions ouvertes
        jusqu'à expiration - jusqu'à une heure d'accès après révocation. Et
        toutes, pas seulement la dernière : rien n'interdit deux navigateurs.
        """
        a = self.s.ouvrir('lecteur')
        b = self.s.ouvrir('lecteur')
        autre = self.s.ouvrir('benjamin')
        self.s.fermer_compte('lecteur')
        self.assertIsNone(self.s.utilisateur(a))
        self.assertIsNone(self.s.utilisateur(b))
        # Et seulement les siennes.
        self.assertEqual(self.s.utilisateur(autre), 'benjamin')

    def test_fermer_un_compte_inconnu_ne_fait_rien(self) -> None:
        j = self.s.ouvrir('benjamin')
        self.s.fermer_compte('zorro')
        self.assertEqual(self.s.utilisateur(j), 'benjamin')
class EnteteDeCookie(unittest.TestCase):
    """Les attributs du cookie de session sont la moitié de la protection."""

    def test_les_attributs_obligatoires(self) -> None:
        """`HttpOnly` interdit la lecture par script ; `SameSite=Strict` est
        **la seule** protection anti-CSRF du service (docs/securite.md §3), il
        n'y a pas de jeton par ailleurs."""
        entete = sessions.entete_cookie('abc', 3600, False)
        for attendu in ('session=abc', 'Path=/', 'HttpOnly',
                        'SameSite=Strict', 'Max-Age=3600'):
            with self.subTest(attribut=attendu):
                self.assertIn(attendu, entete)

    def test_secure_suit_le_reglage(self) -> None:
        self.assertNotIn('Secure', sessions.entete_cookie('abc', 3600, False))
        self.assertIn('Secure', sessions.entete_cookie('abc', 3600, True))

    def test_la_deconnexion_expire_le_cookie(self) -> None:
        """`Max-Age=0` et valeur vide : le navigateur doit le jeter tout de
        suite, sans quoi un cookie mort resterait présenté à chaque requête."""
        entete = sessions.entete_cookie('', 0, False)
        self.assertIn('session=;', entete + ';')
        self.assertIn('Max-Age=0', entete)
if __name__ == '__main__':
    unittest.main()

"""UNO : règles d'une manche (`metier/uno/regles.py`) et salons partagés
(`metier/uno/salons.py`) ; présence des comptes (`metier/comptes/presence.py`)."""
from __future__ import annotations

import random
import unittest
from collections import Counter

from backend import api
from backend.metier.comptes import presence
from backend.metier.uno import regles, salons
from backend.metier.uno.regles import Carte, CoupInvalide, Partie


def partie(joueurs: tuple[str, ...] = ('ana', 'bob', 'cyd'),
           graine: int = 1) -> Partie:
    return Partie(list(joueurs), random.Random(graine))


def poser(p: Partie, joueur: str, carte: Carte, couleur: str | None = None,
          dessus: Carte | None = None) -> None:
    """Met `carte` dans la main de `joueur`, à son tour, sur `dessus`."""
    p.tour = p.ordre.index(joueur)
    p.pioche_jouable = None
    if dessus is not None:
        p.defausse.append(dessus)
        p.couleur = dessus.couleur or p.couleur
    p.mains[joueur].append(carte)
    p.jouer(joueur, carte.id, couleur)


class Paquet(unittest.TestCase):

    def test_108_cartes_reparties_selon_les_regles(self) -> None:
        cartes = regles.paquet()
        self.assertEqual(len(cartes), 108)
        self.assertEqual(len({c.id for c in cartes}), 108)
        par_valeur = Counter(c.valeur for c in cartes)
        self.assertEqual(par_valeur['0'], 4)
        self.assertEqual(par_valeur['7'], 8)
        self.assertEqual(par_valeur['+2'], 8)
        self.assertEqual(par_valeur['joker'], 4)
        self.assertEqual(par_valeur['+4'], 4)

    def test_points(self) -> None:
        self.assertEqual(Carte(0, 'rouge', '7').points, 7)
        self.assertEqual(Carte(0, 'rouge', 'passe').points, 20)
        self.assertEqual(Carte(0, None, '+4').points, 50)


class Jouabilite(unittest.TestCase):

    def test_meme_couleur_ou_meme_valeur(self) -> None:
        dessus = Carte(0, 'rouge', '5')
        self.assertTrue(regles.jouable(Carte(1, 'rouge', '9'), dessus,
                                       'rouge', []))
        self.assertTrue(regles.jouable(Carte(1, 'bleu', '5'), dessus,
                                       'rouge', []))
        self.assertFalse(regles.jouable(Carte(1, 'bleu', '6'), dessus,
                                        'rouge', []))

    def test_plus_quatre_seulement_sans_la_couleur_demandee(self) -> None:
        dessus = Carte(0, 'rouge', '5')
        p4 = Carte(1, None, '+4')
        self.assertFalse(regles.jouable(p4, dessus, 'rouge',
                                        [p4, Carte(2, 'rouge', '1')]))
        self.assertTrue(regles.jouable(p4, dessus, 'rouge',
                                       [p4, Carte(2, 'bleu', '5')]))


class Manche(unittest.TestCase):

    def test_distribution(self) -> None:
        p = partie()
        self.assertTrue(all(len(m) == 7 for m in p.mains.values()))
        self.assertIn(p.dessus.valeur, regles.CHIFFRES)
        self.assertEqual(len(p.pioche) + len(p.defausse) + 21, 108)

    def test_hors_tour_refuse(self) -> None:
        p = partie()
        autre = p.ordre[(p.tour + 1) % 3]
        with self.assertRaises(CoupInvalide):
            p.piocher(autre)

    def test_carte_non_jouable_refusee(self) -> None:
        p = partie()
        j = p.courant
        p.couleur = 'rouge'
        p.defausse.append(Carte(900, 'rouge', '5'))
        mauvaise = Carte(901, 'bleu', '6')
        p.mains[j].append(mauvaise)
        with self.assertRaises(CoupInvalide):
            p.jouer(j, mauvaise.id)

    def test_passe_saute_le_suivant(self) -> None:
        p = partie()
        poser(p, 'ana', Carte(900, 'rouge', 'passe'),
              dessus=Carte(899, 'rouge', '1'))
        self.assertEqual(p.courant, 'cyd')

    def test_inversion_change_le_sens(self) -> None:
        p = partie()
        poser(p, 'ana', Carte(900, 'rouge', 'inversion'),
              dessus=Carte(899, 'rouge', '1'))
        self.assertEqual(p.sens, -1)
        self.assertEqual(p.courant, 'cyd')

    def test_inversion_a_deux_rejoue(self) -> None:
        p = partie(('ana', 'bob'))
        poser(p, 'ana', Carte(900, 'rouge', 'inversion'),
              dessus=Carte(899, 'rouge', '1'))
        self.assertEqual(p.courant, 'ana')

    def test_plus_deux_fait_piocher_et_passer(self) -> None:
        p = partie()
        avant = len(p.mains['bob'])
        poser(p, 'ana', Carte(900, 'rouge', '+2'),
              dessus=Carte(899, 'rouge', '1'))
        self.assertEqual(len(p.mains['bob']), avant + 2)
        self.assertEqual(p.courant, 'cyd')

    def test_joker_exige_une_couleur(self) -> None:
        p = partie()
        p.tour = 0
        joker = Carte(900, None, 'joker')
        p.mains['ana'].append(joker)
        with self.assertRaises(CoupInvalide):
            p.jouer('ana', joker.id)
        p.jouer('ana', joker.id, 'vert')
        self.assertEqual(p.couleur, 'vert')

    def test_pioche_jouable_puis_passer(self) -> None:
        p = partie()
        j = p.courant
        p.couleur = 'rouge'
        p.defausse.append(Carte(899, 'rouge', '1'))
        p.pioche.append(Carte(900, 'rouge', '4'))
        carte = p.piocher(j)
        self.assertIsNotNone(carte)
        self.assertEqual(p.jouables(j), [900])
        p.passer(j)
        self.assertNotEqual(p.courant, j)

    def test_pioche_non_jouable_passe_le_tour(self) -> None:
        p = partie()
        j = p.courant
        p.couleur = 'rouge'
        p.defausse.append(Carte(899, 'rouge', '1'))
        p.pioche.append(Carte(900, 'bleu', '4'))
        self.assertIsNone(p.piocher(j))
        self.assertNotEqual(p.courant, j)

    def test_oubli_de_uno_contre(self) -> None:
        p = partie()
        p.tour = 0
        p.couleur = 'rouge'
        p.defausse.append(Carte(899, 'rouge', '1'))
        p.mains['ana'] = [Carte(903, 'rouge', '3'), Carte(904, 'vert', '8')]
        # Avant-dernière carte posée sans annonce : exposée.
        p.jouer('ana', 903)
        self.assertEqual(p.expose, 'ana')
        p.contrer('bob', 'ana')
        self.assertEqual(len(p.mains['ana']), 3)
        self.assertIsNone(p.expose)

    def test_uno_annonce_protege(self) -> None:
        p = partie()
        p.tour = 0
        p.couleur = 'rouge'
        p.defausse.append(Carte(899, 'rouge', '1'))
        p.mains['ana'] = [Carte(903, 'rouge', '3'), Carte(904, 'vert', '8')]
        p.jouer('ana', 903, uno=True)
        self.assertIsNone(p.expose)
        with self.assertRaises(CoupInvalide):
            p.contrer('bob', 'ana')

    def test_fenetre_de_contre_close_au_coup_suivant(self) -> None:
        p = partie()
        p.tour = 0
        p.couleur = 'rouge'
        p.defausse.append(Carte(899, 'rouge', '1'))
        p.mains['ana'] = [Carte(903, 'rouge', '3'), Carte(904, 'vert', '8')]
        p.jouer('ana', 903)
        self.assertEqual(p.courant, 'bob')
        p.piocher('bob')
        with self.assertRaises(CoupInvalide):
            p.contrer('cyd', 'ana')

    def test_victoire_et_points(self) -> None:
        p = partie()
        p.tour = 0
        p.couleur = 'rouge'
        p.defausse.append(Carte(899, 'rouge', '1'))
        p.mains['ana'] = [Carte(903, 'rouge', '3')]
        p.mains['bob'] = [Carte(904, 'vert', '8'), Carte(905, None, 'joker')]
        p.mains['cyd'] = [Carte(906, 'bleu', 'passe')]
        p.jouer('ana', 903)
        self.assertEqual(p.gagnant, 'ana')
        self.assertEqual(p.points, 8 + 50 + 20)
        with self.assertRaises(CoupInvalide):
            p.piocher('bob')

    def test_depart_du_joueur_courant(self) -> None:
        p = partie()
        p.tour = 1
        p.retirer('bob')
        self.assertEqual(p.courant, 'cyd')
        self.assertNotIn('bob', p.mains)
        self.assertEqual(len(p.pioche) + len(p.defausse) + 14, 108)

    def test_depart_jusqu_au_dernier_joueur(self) -> None:
        p = partie(('ana', 'bob'))
        p.retirer('bob')
        self.assertEqual(p.gagnant, 'ana')

    def test_pioche_vide_rebat_la_defausse(self) -> None:
        p = partie()
        p.defausse += p.pioche
        p.pioche = []
        j = p.courant
        avant = len(p.mains[j])
        p._tirer(j, 3)
        self.assertEqual(len(p.mains[j]), avant + 3)
        self.assertEqual(len(p.defausse), 1)

    def test_vue_ne_montre_que_sa_main(self) -> None:
        p = partie()
        vue = p.vue('ana')
        self.assertEqual(len(vue['main']), 7)
        self.assertNotIn('mains', vue)
        self.assertEqual({j['cartes'] for j in vue['joueurs']}, {7})

    def test_manche_complete_au_hasard(self) -> None:
        """Des joueurs qui posent la première carte permise finissent
        toujours par terminer la manche, sans perdre de carte."""
        for graine in range(30):
            p = partie(('a', 'b', 'c', 'd'), graine)
            for _ in range(3000):
                if p.finie:
                    break
                j = p.courant
                jouables = p.jouables(j)
                if jouables:
                    carte = next(c for c in p.mains[j] if c.id == jouables[0])
                    p.jouer(j, carte.id,
                            None if carte.couleur else 'bleu', uno=True)
                elif p.pioche_jouable is None:
                    p.piocher(j)
                else:
                    p.passer(j)
                total = (len(p.pioche) + len(p.defausse)
                         + sum(len(m) for m in p.mains.values()))
                self.assertEqual(total, 108)
            self.assertTrue(p.finie, 'graine %d' % graine)


class Tables(unittest.TestCase):

    def setUp(self) -> None:
        self.maintenant = 1000.0
        self.salons = salons.Salons(random.Random(3),
                                    horloge=lambda: self.maintenant)

    def test_creer_rejoindre_lancer(self) -> None:
        code = self.salons.creer('ana', 'Soirée', True)
        self.assertEqual(len(code), salons.LONGUEUR_CODE)
        self.salons.rejoindre(code.lower(), 'bob')
        self.salons.lancer(code, 'ana')
        vue = self.salons.vue(code, 'bob')
        self.assertEqual(vue['etat'], 'partie')
        self.assertEqual(len(vue['partie']['main']), 7)

    def test_seul_l_hote_lance(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        with self.assertRaises(salons.ErreurSalon):
            self.salons.lancer(code, 'bob')

    def test_deux_joueurs_minimum(self) -> None:
        code = self.salons.creer('ana')
        with self.assertRaises(salons.ErreurSalon):
            self.salons.lancer(code, 'ana')

    def test_pas_d_arrivee_en_cours_de_manche(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.salons.lancer(code, 'ana')
        with self.assertRaises(salons.ErreurSalon):
            self.salons.rejoindre(code, 'cyd')

    def test_non_membre_ne_voit_pas_le_jeu(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.salons.lancer(code, 'ana')
        vue = self.salons.vue(code, 'eve')
        self.assertFalse(vue['membre'])
        self.assertIsNone(vue['partie'])
        with self.assertRaises(salons.ErreurSalon):
            self.salons.agir(code, 'eve', 'piocher')

    def test_code_inconnu(self) -> None:
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.vue('ZZZZZ', 'ana')

    def test_l_hote_qui_part_passe_la_main(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.salons.quitter(code, 'ana')
        self.assertEqual(self.salons.vue(code, 'bob')['hote'], 'bob')
        self.salons.quitter(code, 'bob')
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.vue(code, 'bob')

    def test_forfait_compte_au_score(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.salons.lancer(code, 'ana')
        self.salons.quitter(code, 'bob')
        vue = self.salons.vue(code, 'ana')
        self.assertEqual(vue['etat'], 'finie')
        self.assertEqual(vue['partie']['gagnant'], 'ana')

    def test_liste_publique(self) -> None:
        publique = self.salons.creer('ana', 'A', True)
        self.salons.creer('ana', 'B', False)
        liste = self.salons.lister('bob')
        self.assertEqual([s['code'] for s in liste['ouvertes']], [publique])
        self.assertEqual(len(self.salons.lister('ana')['miennes']), 2)

    def test_expiration(self) -> None:
        code = self.salons.creer('ana')
        self.maintenant += salons.INACTIVITE + 1
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.vue(code, 'ana')

    def test_version_augmente(self) -> None:
        code = self.salons.creer('ana')
        v = self.salons.vue(code, 'ana')['version']
        self.salons.rejoindre(code, 'bob')
        self.assertGreater(self.salons.vue(code, 'ana')['version'], v)


    def test_presence_a_la_table(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.assertEqual(self.salons.vue(code, 'ana')['presents'],
                         {'ana': True, 'bob': True})
        self.maintenant += salons.PRESENCE_TABLE + 1
        # ana relit la table, bob non : bob est absent.
        self.assertEqual(self.salons.vue(code, 'ana')['presents'],
                         {'ana': True, 'bob': False})

    def test_table_abandonnee_supprimee_apres_deux_minutes(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.maintenant += salons.ABSENCE_TABLE - 1
        # bob relit la table : elle reste.
        self.salons.vue(code, 'bob')
        self.maintenant += salons.ABSENCE_TABLE - 1
        self.assertEqual(self.salons.vue(code, 'ana')['code'], code)
        # Plus personne ne la relit pendant deux minutes : supprimée.
        self.maintenant += salons.ABSENCE_TABLE + 1
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.vue(code, 'ana')
        self.assertEqual(self.salons.lister('ana')['miennes'], [])

    def test_un_spectateur_ne_garde_pas_la_table(self) -> None:
        code = self.salons.creer('ana')
        self.maintenant += salons.ABSENCE_TABLE - 1
        self.salons.regarder(code)
        self.maintenant += 2
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.regarder(code)

    def test_l_hote_exclut_un_joueur(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.salons.rejoindre(code, 'cyd')
        with self.assertRaises(salons.ErreurSalon):
            self.salons.exclure(code, 'bob', 'cyd')      # pas l'hôte
        with self.assertRaises(salons.ErreurSalon):
            self.salons.exclure(code, 'ana', 'ana')      # soi-même
        with self.assertRaises(salons.ErreurSalon):
            self.salons.exclure(code, 'ana', 'zoe')      # pas à la table
        self.salons.exclure(code, 'ana', 'bob')
        vue = self.salons.vue(code, 'bob')
        self.assertFalse(vue['membre'])
        self.assertTrue(vue['exclu'])
        self.assertEqual(vue['joueurs'], ['ana', 'cyd'])
        with self.assertRaises(salons.ErreurSalon):
            self.salons.rejoindre(code, 'bob')

    def test_exclure_en_cours_de_manche(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.salons.lancer(code, 'ana')
        self.salons.exclure(code, 'ana', 'bob')
        vue = self.salons.vue(code, 'ana')
        self.assertEqual(vue['etat'], 'finie')
        self.assertEqual(vue['partie']['gagnant'], 'ana')

    def test_le_spectateur_ne_voit_aucune_main(self) -> None:
        code = self.salons.creer('ana')
        self.salons.rejoindre(code, 'bob')
        self.assertIsNone(self.salons.regarder(code)['partie'])
        self.salons.lancer(code, 'ana')
        vue = self.salons.regarder(code.lower())
        self.assertEqual(vue['etat'], 'partie')
        self.assertNotIn('main', vue['partie'])
        self.assertNotIn('jouables', vue['partie'])
        self.assertEqual([j['cartes'] for j in vue['partie']['joueurs']],
                         [7, 7])
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.regarder('ZZZZZ')


class Evenements(unittest.TestCase):

    def test_pose_et_pioche_sont_numerotees(self) -> None:
        p = partie()
        self.assertEqual(p.vue('ana')['evenements'], [])
        dessus = Carte(200, 'rouge', '5')
        p.defausse.append(dessus)
        p.couleur = 'rouge'
        joueur = p.courant
        suivant = p.ordre[p._rang(1)]
        poser(p, joueur, Carte(201, 'rouge', '+2'))
        evts = p.vue_spectateur()['evenements']
        self.assertEqual([(e['n'], e['joueur'], e['type'], e['cartes'])
                          for e in evts],
                         [(1, joueur, 'pose', 1), (2, suivant, 'pioche', 2)])

    def test_la_vue_spectateur_n_a_pas_de_main(self) -> None:
        p = partie()
        self.assertNotIn('main', p.vue_spectateur())
        self.assertIn('main', p.vue('ana'))


class Presences(unittest.TestCase):

    def test_en_ligne_puis_hors_ligne(self) -> None:
        t = [100.0]
        p = presence.Presence(horloge=lambda: t[0])
        p.signaler('ana')
        etat = {e['nom']: e for e in p.etat(['ana', 'bob'])}
        self.assertTrue(etat['ana']['en_ligne'])
        self.assertEqual(etat['ana']['depuis'], 0)
        self.assertFalse(etat['bob']['en_ligne'])
        self.assertIsNone(etat['bob']['depuis'])
        t[0] += presence.EN_LIGNE + 1
        self.assertFalse(p.etat(['ana'])[0]['en_ligne'])

    def test_deconnexion_volontaire(self) -> None:
        p = presence.Presence()
        p.signaler('ana')
        p.oublier('ana')
        self.assertFalse(p.etat(['ana'])[0]['en_ligne'])


class Routes(unittest.TestCase):

    def test_routes_enregistrees_et_role_declare(self) -> None:
        self.assertEqual(api.ROLES['uno'], ('joueur',))
        for chemin in ('creer', 'rejoindre', 'quitter', 'exclure', 'lancer',
                       'jouer', 'piocher', 'passer', 'uno', 'contrer'):
            self.assertIn(('POST', '/api/uno/%s' % chemin), api.TABLE)
        self.assertIn(('GET', '/api/uno/salon'), api.TABLE)
        self.assertIn(('GET', '/api/uno/spectateur'), api.TABLE)
        self.assertIn(('GET', '/api/presence'), api.TABLE)


if __name__ == '__main__':
    unittest.main()

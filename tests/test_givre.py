"""Givre (`modules/givre/`) : départ, coups, colonnes qui fondent, fin de
manche, doublement et fin de partie."""
from __future__ import annotations

import random
import unittest

from backend import api
from backend.modules.givre import salons
from backend.modules.givre.regles import (
    CASES, Carte, Case, CoupInvalide, Partie, paquet)


def partie(n: int = 2) -> Partie:
    return Partie(['ana', 'bob', 'cyd', 'dan'][:n], random.Random(1))


def fixer(p: Partie, joueur: str, valeurs: list[int],
          visibles: set[int] | None = None) -> None:
    """La grille de `joueur` : 12 valeurs (colonne par colonne)."""
    p.grilles[joueur] = [
        Case(Carte(1000 + i, v), visible=bool(visibles and i in visibles))
        for i, v in enumerate(valeurs)]


def demarrer(p: Partie) -> None:
    for j in p.ordre:
        p.retourner(j, 0)
        p.retourner(j, 1)


class Donne(unittest.TestCase):

    def test_le_paquet(self) -> None:
        valeurs = [c.valeur for c in paquet()]
        self.assertEqual(len(valeurs), 150)
        self.assertEqual(valeurs.count(-2), 5)
        self.assertEqual(valeurs.count(0), 15)
        self.assertEqual(valeurs.count(12), 10)

    def test_douze_cartes_cachees_et_une_defausse(self) -> None:
        p = partie(3)
        for g in p.grilles.values():
            self.assertEqual(len(g), CASES)
            self.assertFalse(any(c.visible for c in g))
        self.assertEqual(len(p.defausse), 1)
        self.assertEqual(len(p.pioche), 150 - 36 - 1)

    def test_de_deux_a_huit_joueurs(self) -> None:
        with self.assertRaises(CoupInvalide):
            Partie(['ana'], random.Random(1))


class Depart(unittest.TestCase):

    def test_deux_cartes_chacun_puis_le_plus_gros_total(self) -> None:
        p = partie()
        fixer(p, 'ana', [1] * 12)
        fixer(p, 'bob', [9] * 12)
        p.retourner('ana', 0)
        p.retourner('ana', 1)
        with self.assertRaises(CoupInvalide):
            p.retourner('ana', 2)
        self.assertEqual(p.phase, 'depart')
        p.retourner('bob', 4)
        p.retourner('bob', 5)
        self.assertEqual(p.phase, 'jeu')
        self.assertEqual(p.courant, 'bob')

    def test_pas_de_coup_avant_le_depart(self) -> None:
        p = partie()
        with self.assertRaises(CoupInvalide):
            p.piocher('ana')


class Coups(unittest.TestCase):

    def setUp(self) -> None:
        self.p = partie()
        demarrer(self.p)
        self.j = self.p.courant
        assert self.j is not None

    def test_piocher_puis_garder(self) -> None:
        self.p.piocher(self.j)
        tiree = self.p.main
        assert tiree is not None
        ancienne = self.p.grilles[self.j][5].carte
        self.p.garder(self.j, 5)
        self.assertEqual(self.p.grilles[self.j][5].carte, tiree)
        self.assertTrue(self.p.grilles[self.j][5].visible)
        self.assertEqual(self.p.defausse[-1], ancienne)
        self.assertNotEqual(self.p.courant, self.j)

    def test_piocher_jeter_puis_retourner(self) -> None:
        self.p.piocher(self.j)
        self.p.jeter(self.j)
        self.assertTrue(self.p.doit_retourner)
        with self.assertRaises(CoupInvalide):
            self.p.retourner(self.j, 0)   # déjà visible
        self.p.retourner(self.j, 7)
        self.assertTrue(self.p.grilles[self.j][7].visible)
        self.assertNotEqual(self.p.courant, self.j)

    def test_prendre_la_defausse(self) -> None:
        dessus = self.p.defausse[-1]
        self.p.prendre(self.j, 3)
        self.assertEqual(self.p.grilles[self.j][3].carte, dessus)

    def test_pas_deux_cartes_par_tour(self) -> None:
        self.p.piocher(self.j)
        with self.assertRaises(CoupInvalide):
            self.p.piocher(self.j)
        with self.assertRaises(CoupInvalide):
            self.p.prendre(self.j, 0)

    def test_chacun_son_tour(self) -> None:
        autre = next(j for j in self.p.ordre if j != self.j)
        with self.assertRaises(CoupInvalide):
            self.p.piocher(autre)

    def test_une_colonne_identique_fond(self) -> None:
        fixer(self.p, self.j, [4, 4, 0] + [1] * 9, visibles={0, 1})
        self.p.defausse.append(Carte(9999, 4))
        self.p.prendre(self.j, 2)
        self.assertEqual([c.carte for c in self.p.grilles[self.j][:3]],
                         [None] * 3)
        self.assertEqual(self.p.defausse[-1].valeur, 4)

    def test_la_pioche_vide_reprend_la_defausse(self) -> None:
        self.p.pioche = []
        self.p.defausse = [Carte(1, 3), Carte(2, 5), Carte(3, 7)]
        self.p.piocher(self.j)
        self.assertEqual([c.valeur for c in self.p.defausse], [7])
        self.assertEqual(len(self.p.pioche), 1)


class FinDeManche(unittest.TestCase):

    def test_dernier_tour_puis_bilan_et_doublement(self) -> None:
        p = partie()
        demarrer(p)
        p.tour = 0                           # ana joue
        # ana : tout visible sauf la case 11 ; bob : petites cartes.
        fixer(p, 'ana', [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 0],
              visibles=set(range(11)))
        fixer(p, 'bob', [0] * 6 + [1, 2, 3, 1, 2, 3], visibles={0, 1})
        p.piocher('ana')
        p.jeter('ana')
        p.retourner('ana', 11)
        self.assertEqual(p.finisseur, 'ana')
        self.assertEqual(p.phase, 'jeu')
        self.assertEqual(p.courant, 'bob')
        p.piocher('bob')
        p.jeter('bob')
        p.retourner('bob', 2)
        self.assertEqual(p.phase, 'bilan')
        assert p.bilan is not None
        # ana : 48, plus que bob (la colonne de 0 de bob fond) : doublé.
        self.assertTrue(p.bilan['ana']['double'])
        self.assertEqual(p.bilan['ana']['points'], 96)
        self.assertEqual(p.scores['bob'], 12)
        self.assertIsNone(p.gagnant)
        p.suivante('bob')
        self.assertEqual(p.manche, 2)
        self.assertEqual(p.phase, 'depart')

    def test_cent_points_la_partie_s_arrete(self) -> None:
        p = partie()
        demarrer(p)
        p.scores = {'ana': 95, 'bob': 10}
        p.tour = 0
        fixer(p, 'ana', [12] * 11 + [11], visibles=set(range(11)))
        p.piocher('ana')
        p.jeter('ana')
        p.retourner('ana', 11)
        p.piocher('bob')
        p.jeter('bob')
        p.retourner('bob', 5)
        self.assertEqual(p.gagnant, 'bob')
        self.assertTrue(p.finie)


class Depart_d_un_joueur(unittest.TestCase):

    def test_seul_restant_gagne(self) -> None:
        p = partie()
        p.retirer('ana')
        self.assertEqual(p.gagnant, 'bob')

    def test_le_tour_passe_au_suivant(self) -> None:
        p = partie(3)
        demarrer(p)
        courant = p.courant
        p.piocher(courant)
        p.retirer(courant)
        self.assertIsNone(p.main)
        self.assertIn(p.courant, p.ordre)


class Tables(unittest.TestCase):

    def test_routes(self) -> None:
        for coup in ('retourner', 'piocher', 'prendre', 'garder', 'jeter',
                     'suivante'):
            self.assertIn(('POST', '/api/givre/%s' % coup), api.TABLE)

    def test_une_partie_par_le_registre(self) -> None:
        s = salons.Salons(random.Random(2))
        code = s.creer('ana')
        s.rejoindre(code, 'bob')
        s.lancer(code, 'ana')
        s.agir(code, 'ana', 'retourner', place=0)
        vue = s.vue(code, 'bob')['partie']
        self.assertEqual(vue['phase'], 'depart')
        self.assertNotEqual(vue['joueurs'][0]['grille'][0], 'cachee')
        self.assertEqual(vue['joueurs'][0]['grille'][1], 'cachee')


if __name__ == '__main__':
    unittest.main()

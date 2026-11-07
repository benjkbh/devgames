"""Trio (`modules/trio/`) : donne, révélations, trios et victoire."""
from __future__ import annotations

import random
import unittest

from backend import api
from backend.modules.trio import salons
from backend.modules.trio.regles import Carte, CoupInvalide, Partie


def partie() -> Partie:
    p = Partie(['ana', 'bob', 'cyd'], random.Random(1))
    p.tour = 0
    return p


def mains(p: Partie, **valeurs: list[int]) -> None:
    """Fixe les mains (rangées) ; le centre devient vide."""
    k = 0
    for j, vs in valeurs.items():
        p.mains[j] = [Carte(500 + k + i, v) for i, v in enumerate(sorted(vs))]
        k += 50
    p.centre = []


class Donne(unittest.TestCase):

    def test_quatre_joueurs(self) -> None:
        p = Partie(['a', 'b', 'c', 'd'], random.Random(1))
        self.assertEqual([len(m) for m in p.mains.values()], [7] * 4)
        self.assertEqual(len(p.centre), 8)

    def test_mains_rangees(self) -> None:
        p = partie()
        for m in p.mains.values():
            self.assertEqual([c.valeur for c in m],
                             sorted(c.valeur for c in m))

    def test_de_trois_a_six_joueurs(self) -> None:
        with self.assertRaises(CoupInvalide):
            Partie(['a', 'b'], random.Random(1))


class Revelations(unittest.TestCase):

    def setUp(self) -> None:
        self.p = partie()
        mains(self.p, ana=[3, 5, 9], bob=[3, 7, 12], cyd=[1, 3, 11])

    def test_deux_cartes_differentes_finissent_le_tour(self) -> None:
        self.p.demander('ana', 'ana', 'max')      # 9
        self.p.demander('ana', 'bob', 'max')      # 12
        self.assertEqual(self.p.courant, 'bob')
        self.assertEqual(self.p.revelees, [])
        assert self.p.essai is not None
        self.assertEqual([r['valeur'] for r in self.p.essai], [9, 12])

    def test_deux_identiques_le_tour_continue(self) -> None:
        self.p.demander('ana', 'ana', 'min')      # 3
        self.p.demander('ana', 'bob', 'min')      # 3
        self.assertEqual(self.p.courant, 'ana')
        self.assertEqual(len(self.p.revelees), 2)
        # La plus petite de cyd est un 1 : raté.
        self.p.demander('ana', 'cyd', 'min')
        self.assertEqual(self.p.courant, 'bob')

    def test_la_carte_suivante_si_la_plus_petite_est_revelee(self) -> None:
        self.p.demander('ana', 'ana', 'min')      # 3
        self.p.demander('ana', 'bob', 'min')      # 3
        # ana demande encore sa plus petite : le 3 est révélé, vient le 5.
        self.p.demander('ana', 'ana', 'min')
        assert self.p.essai is not None
        self.assertEqual(self.p.essai[-1]['valeur'], 5)

    def test_trio_gagne(self) -> None:
        mains(self.p, ana=[3, 5, 9], bob=[3, 7, 12], cyd=[3, 4, 11])
        self.p.demander('ana', 'ana', 'min')
        self.p.demander('ana', 'bob', 'min')
        self.p.demander('ana', 'cyd', 'min')
        self.assertEqual(self.p.trios['ana'], [3])
        self.assertEqual([c.valeur for c in self.p.mains['bob']], [7, 12])
        self.assertEqual(self.p.courant, 'bob')

    def test_le_trio_de_7_gagne_la_manche(self) -> None:
        mains(self.p, ana=[7, 7, 9], bob=[7, 8], cyd=[1, 2])
        self.p.demander('ana', 'ana', 'min')
        self.p.demander('ana', 'ana', 'min')
        self.p.demander('ana', 'bob', 'min')
        self.assertEqual(self.p.gagnant, 'ana')

    def test_le_centre(self) -> None:
        mains(self.p, ana=[4, 4], bob=[1], cyd=[2])
        self.p.centre = [Carte(1, 4), Carte(2, 9)]
        self.p.demander('ana', 'ana', 'min')
        self.p.demander('ana', 'ana', 'max')
        self.p.retourner('ana', 0)
        self.assertEqual(self.p.trios['ana'], [4])
        self.assertIsNone(self.p.centre[0])

    def test_la_main_est_vue_par_son_joueur_seulement(self) -> None:
        self.assertEqual(self.p.vue('ana')['main'], [3, 5, 9])
        self.assertNotIn('main', self.p.vue_spectateur())


class Tables(unittest.TestCase):

    def test_routes(self) -> None:
        for coup in ('demander', 'retourner'):
            self.assertIn(('POST', '/api/trio/%s' % coup), api.TABLE)

    def test_au_moins_trois_joueurs(self) -> None:
        s = salons.Salons(random.Random(2))
        code = s.creer('ana')
        s.rejoindre(code, 'bob')
        with self.assertRaises(salons.ErreurSalon):
            s.lancer(code, 'ana')


if __name__ == '__main__':
    unittest.main()

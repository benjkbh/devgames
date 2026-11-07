"""Menteur (`modules/menteur/`) : poser, crier « Menteur ! », dernières
cartes."""
from __future__ import annotations

import random
import unittest

from backend import api
from backend.modules.menteur import regles, salons
from backend.modules.menteur.regles import Carte, CoupInvalide, Partie


def partie() -> Partie:
    p = Partie(['ana', 'bob', 'cyd'], random.Random(1))
    p.tour = 0
    p.rang = 0
    return p


def donner(p: Partie, joueur: str, *cartes: tuple[str, str]) -> list[int]:
    """Met des cartes précises dans la main de `joueur` ; rend leurs ids."""
    ids = []
    for k, (rang, enseigne) in enumerate(cartes):
        c = Carte(900 + len(p.mains[joueur]) + k * 10, rang, enseigne)
        p.mains[joueur].append(c)
        ids.append(c.id)
    return ids


class Distribution(unittest.TestCase):

    def test_tout_le_jeu_est_distribue(self) -> None:
        p = Partie(['ana', 'bob', 'cyd'], random.Random(1))
        self.assertEqual(sum(len(m) for m in p.mains.values()), 52)

    def test_accords(self) -> None:
        self.assertEqual(regles.pluriel_rang('A', 1), 'un As')
        self.assertEqual(regles.pluriel_rang('D', 1), 'une Dame')
        self.assertEqual(regles.pluriel_rang('R', 2), 'deux Rois')
        self.assertEqual(regles.pluriel_rang('7', 3), 'trois 7')


class Coups(unittest.TestCase):

    def setUp(self) -> None:
        self.p = partie()

    def test_poser_fait_monter_le_rang(self) -> None:
        ids = donner(self.p, 'ana', ('A', 'pique'))
        self.p.poser('ana', ids)
        self.assertEqual(self.p.annonce, '2')
        self.assertEqual(self.p.courant, 'bob')

    def test_une_pose_de_un_a_quatre_cartes(self) -> None:
        with self.assertRaises(CoupInvalide):
            self.p.poser('ana', [])
        with self.assertRaises(CoupInvalide):
            self.p.poser('ana', [999999])

    def test_menteur_pris_ramasse_le_tas(self) -> None:
        ids = donner(self.p, 'ana', ('5', 'pique'))
        avant = len(self.p.mains['ana'])
        self.p.poser('ana', ids)
        self.p.menteur('cyd')
        self.assertEqual(len(self.p.mains['ana']), avant)
        assert self.p.revelation is not None
        self.assertTrue(self.p.revelation['menteur'])

    def test_crier_a_tort_fait_ramasser(self) -> None:
        ids = donner(self.p, 'ana', ('A', 'pique'), ('A', 'coeur'))
        avant = len(self.p.mains['bob'])
        self.p.poser('ana', ids)
        self.p.menteur('bob')
        self.assertEqual(len(self.p.mains['bob']), avant + 2)

    def test_on_ne_se_denonce_pas(self) -> None:
        ids = donner(self.p, 'ana', ('A', 'pique'))
        self.p.poser('ana', ids)
        with self.assertRaises(CoupInvalide):
            self.p.menteur('ana')

    def test_dernieres_cartes_acceptees(self) -> None:
        self.p.mains['ana'] = []
        ids = donner(self.p, 'ana', ('A', 'pique'))
        self.p.poser('ana', ids)
        with self.assertRaises(CoupInvalide):
            self.p.poser('bob', [self.p.mains['bob'][0].id])
        self.p.accepter('bob')
        self.assertEqual(self.p.gagnant, 'ana')

    def test_dernieres_cartes_contestees_a_tort(self) -> None:
        self.p.mains['ana'] = []
        ids = donner(self.p, 'ana', ('A', 'pique'))
        self.p.poser('ana', ids)
        self.p.menteur('cyd')
        self.assertEqual(self.p.gagnant, 'ana')

    def test_la_main_n_est_vue_que_par_son_joueur(self) -> None:
        self.assertIn('main', self.p.vue('ana'))
        self.assertNotIn('main', self.p.vue_spectateur())


class Tables(unittest.TestCase):

    def test_routes(self) -> None:
        for coup in ('poser', 'menteur', 'accepter'):
            self.assertIn(('POST', '/api/menteur/%s' % coup), api.TABLE)

    def test_une_manche_par_la_table(self) -> None:
        s = salons.Salons(random.Random(2))
        code = s.creer('ana')
        for j in ('bob', 'cyd'):
            s.rejoindre(code, j)
        s.lancer(code, 'ana')
        self.assertIn('main', s.vue(code, 'bob')['partie'])


if __name__ == '__main__':
    unittest.main()

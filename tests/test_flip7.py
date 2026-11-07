"""Flip 7 (`modules/flip7/`) : pioche, saut, Flip 7, cartes d'action,
points et fin de partie."""
from __future__ import annotations

import random
import unittest

from backend import api
from backend.modules.flip7 import regles, salons
from backend.modules.flip7.regles import Carte, CoupInvalide, Partie


def partie(joueurs: tuple[str, ...] = ('ana', 'bob', 'cyd')) -> Partie:
    """Une partie dont la donne est finie ; `prochaines` fixe les cartes."""
    p = Partie(list(joueurs), random.Random(1))
    return p


def manche_vierge(p: Partie, au_trait: str = 'ana') -> None:
    """Remet la manche à zéro : lignes vides, tout le monde en lice."""
    p.lignes = {j: [] for j in p.ordre}
    p.etat = {j: 'actif' for j in p.ordre}
    p.attente = None
    p.file = []
    p.a_donner = []
    p.a_passer = False
    p.bilan = None
    p.flip7 = None
    p.tour = p.ordre.index(au_trait)


def empiler(p: Partie, *cartes: tuple[str, int]) -> None:
    """Les prochaines cartes piochées, dans l'ordre."""
    for k, (t, v) in enumerate(reversed(cartes)):
        p.pioche.append(Carte(1000 + k, t, v))


class Paquet(unittest.TestCase):

    def test_94_cartes(self) -> None:
        cartes = regles.paquet()
        self.assertEqual(len(cartes), 94)
        douze = [c for c in cartes if c.type == 'nombre' and c.valeur == 12]
        self.assertEqual(len(douze), 12)

    def test_points(self) -> None:
        ligne = [Carte(1, 'nombre', 5), Carte(2, 'nombre', 3),
                 Carte(3, 'fois2'), Carte(4, 'bonus', 4)]
        self.assertEqual(regles.points(ligne), 20)
        self.assertEqual(regles.points(ligne, flip7=True), 35)


class Tours(unittest.TestCase):

    def setUp(self) -> None:
        self.p = partie()
        manche_vierge(self.p)

    def test_la_donne_donne_une_carte_a_chacun(self) -> None:
        p = partie()
        cartes = sum(len(ligne) for ligne in p.lignes.values())
        self.assertGreaterEqual(cartes, 1)
        self.assertIsNotNone(p.courant or p.attente or p.bilan)

    def test_piocher_puis_la_main_passe(self) -> None:
        empiler(self.p, ('nombre', 5))
        self.p.piocher('ana')
        self.assertEqual(self.p.lignes['ana'][-1].valeur, 5)
        self.assertEqual(self.p.courant, 'bob')

    def test_un_doublon_fait_sauter(self) -> None:
        self.p.lignes['ana'] = [Carte(1, 'nombre', 5)]
        empiler(self.p, ('nombre', 5))
        self.p.piocher('ana')
        self.assertEqual(self.p.etat['ana'], 'saute')

    def test_la_seconde_chance_sauve_du_doublon(self) -> None:
        self.p.lignes['ana'] = [Carte(1, 'nombre', 5), Carte(2, 'chance')]
        empiler(self.p, ('nombre', 5))
        self.p.piocher('ana')
        self.assertEqual(self.p.etat['ana'], 'actif')
        self.assertEqual([c.type for c in self.p.lignes['ana']], ['nombre'])

    def test_rester_garde_les_points(self) -> None:
        self.p.lignes['ana'] = [Carte(1, 'nombre', 9)]
        self.p.rester('ana')
        self.assertEqual(self.p.etat['ana'], 'reste')
        self.assertEqual(self.p.courant, 'bob')

    def test_pas_son_tour(self) -> None:
        with self.assertRaises(CoupInvalide):
            self.p.piocher('bob')

    def test_flip_7_ferme_la_manche_avec_le_bonus(self) -> None:
        self.p.lignes['ana'] = [Carte(i, 'nombre', v)
                                for i, v in enumerate((1, 2, 3, 4, 5, 6))]
        empiler(self.p, ('nombre', 7))
        self.p.piocher('ana')
        self.assertEqual(self.p.flip7, 'ana')
        self.assertIsNotNone(self.p.bilan)
        assert self.p.bilan is not None
        self.assertEqual(self.p.bilan['ana'], 28 + 15)

    def test_le_gel_arrete_la_cible(self) -> None:
        empiler(self.p, ('gel', 0))
        self.p.piocher('ana')
        self.assertEqual(self.p.attente, {'joueur': 'ana', 'carte': 'gel'})
        self.p.cibler('ana', 'cyd')
        self.assertEqual(self.p.etat['cyd'], 'reste')
        self.assertEqual(self.p.courant, 'bob')

    def test_trois_a_la_suite(self) -> None:
        empiler(self.p, ('trois', 0), ('nombre', 1), ('nombre', 2),
                ('nombre', 3))
        self.p.piocher('ana')
        self.p.cibler('ana', 'bob')
        self.assertEqual([c.valeur for c in self.p.lignes['bob']], [1, 2, 3])
        self.assertEqual(self.p.courant, 'bob')

    def test_la_manche_finit_quand_plus_personne_n_est_en_lice(self) -> None:
        for j in ('ana', 'bob', 'cyd'):
            self.p.rester(j)
        self.assertIsNotNone(self.p.bilan)
        self.p.suivante('bob')
        self.assertIsNone(self.p.bilan)
        self.assertEqual(self.p.manche, 2)

    def test_la_partie_finit_a_200_points(self) -> None:
        self.p.scores['bob'] = 195
        self.p.lignes['bob'] = [Carte(1, 'nombre', 10)]
        for j in ('ana', 'bob', 'cyd'):
            self.p.rester(j)
        self.assertEqual(self.p.gagnant, 'bob')
        with self.assertRaises(CoupInvalide):
            self.p.suivante('ana')

    def test_un_depart_laisse_le_dernier_gagner(self) -> None:
        p = partie(('ana', 'bob'))
        p.retirer('bob')
        self.assertEqual(p.gagnant, 'ana')


class Tables(unittest.TestCase):

    def test_une_partie_par_la_table(self) -> None:
        s = salons.Salons(random.Random(2))
        code = s.creer('ana')
        s.rejoindre(code, 'bob')
        s.lancer(code, 'ana')
        vue = s.vue(code, 'ana')
        self.assertEqual(len(vue['partie']['joueurs']), 2)
        self.assertIn('victoires', vue)

    def test_routes(self) -> None:
        for coup in ('piocher', 'rester', 'cibler', 'suivante', 'lever'):
            self.assertIn(('POST', '/api/flip7/%s' % coup), api.TABLE)


if __name__ == '__main__':
    unittest.main()

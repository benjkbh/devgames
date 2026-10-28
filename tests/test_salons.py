"""Tables communes à tous les jeux (`backend/commun/salons.py`) : prêt,
reprise d'une table dont l'hôte est absent, fermeture. Éprouvées sur les
tables de UNO."""
from __future__ import annotations

import random
import unittest

from backend.commun import salons as commun
from backend.modules.uno import salons


class Prets(unittest.TestCase):

    def setUp(self) -> None:
        self.maintenant = 1000.0
        self.salons = salons.Salons(random.Random(3),
                                    horloge=lambda: self.maintenant)
        self.code = self.salons.creer('ana')
        self.salons.rejoindre(self.code, 'bob')

    def test_un_joueur_se_dit_pret_puis_se_ravise(self) -> None:
        self.salons.pret(self.code, 'bob')
        self.assertEqual(self.salons.vue(self.code, 'ana')['prets'], ['bob'])
        self.salons.pret(self.code, 'bob', False)
        self.assertEqual(self.salons.vue(self.code, 'ana')['prets'], [])

    def test_la_donne_remet_les_prets_a_zero(self) -> None:
        self.salons.pret(self.code, 'bob')
        self.salons.lancer(self.code, 'ana')
        self.assertEqual(self.salons.vue(self.code, 'ana')['prets'], [])

    def test_on_ne_se_dit_pas_pret_pendant_une_manche(self) -> None:
        self.salons.lancer(self.code, 'ana')
        with self.assertRaises(salons.ErreurSalon):
            self.salons.pret(self.code, 'bob')

    def test_qui_quitte_la_table_n_est_plus_pret(self) -> None:
        self.salons.pret(self.code, 'bob')
        self.salons.quitter(self.code, 'bob')
        self.salons.rejoindre(self.code, 'bob')
        self.assertEqual(self.salons.vue(self.code, 'ana')['prets'], [])


class Reprise(unittest.TestCase):

    def setUp(self) -> None:
        self.maintenant = 1000.0
        self.salons = salons.Salons(random.Random(3),
                                    horloge=lambda: self.maintenant)
        self.code = self.salons.creer('ana')
        self.salons.rejoindre(self.code, 'bob')

    def _absent(self, secondes: float) -> None:
        """L'hôte ne relit plus la table ; bob, si."""
        self.maintenant += secondes
        self.salons.vue(self.code, 'bob')

    def test_l_hote_present_n_a_pas_d_absence(self) -> None:
        self.assertIsNone(self.salons.vue(self.code, 'bob')['absence_hote'])

    def test_l_absence_de_l_hote_est_comptee(self) -> None:
        self._absent(30)
        self.assertEqual(self.salons.vue(self.code, 'bob')['absence_hote'],
                         30)

    def test_on_ne_reprend_pas_trop_tot(self) -> None:
        self._absent(commun.DELAI_REPRISE - 1)
        with self.assertRaises(salons.ErreurSalon):
            self.salons.reprendre(self.code, 'bob')

    def test_on_reprend_la_table_d_un_hote_absent(self) -> None:
        self._absent(commun.DELAI_REPRISE)
        self.salons.reprendre(self.code, 'bob')
        vue = self.salons.vue(self.code, 'bob')
        self.assertEqual(vue['hote'], 'bob')
        self.assertIsNone(vue['absence_hote'])

    def test_qui_n_est_pas_assis_ne_reprend_rien(self) -> None:
        self._absent(commun.DELAI_REPRISE)
        with self.assertRaises(salons.ErreurSalon):
            self.salons.reprendre(self.code, 'cyd')


class Fermeture(unittest.TestCase):

    def setUp(self) -> None:
        self.salons = salons.Salons(random.Random(3))
        self.code = self.salons.creer('ana')
        self.salons.rejoindre(self.code, 'bob')

    def test_l_hote_ferme_la_table_pour_tous(self) -> None:
        self.salons.fermer(self.code, 'ana')
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.vue(self.code, 'bob')

    def test_seul_l_hote_ferme_la_table(self) -> None:
        with self.assertRaises(salons.ErreurSalon):
            self.salons.fermer(self.code, 'bob')
        self.assertTrue(self.salons.vue(self.code, 'bob')['membre'])


if __name__ == '__main__':
    unittest.main()

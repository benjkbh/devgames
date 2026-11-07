"""Tables communes à tous les jeux (`backend/commun/salons.py`) : prêt,
reprise d'une table dont l'hôte est absent, fermeture, spectateurs,
attente longue. Éprouvées sur les tables de UNO."""
from __future__ import annotations

from typing import TYPE_CHECKING

import random
import threading
import time
import unittest

from backend.commun import salons as commun
from backend.modules.uno import salons

if TYPE_CHECKING:
    from collections.abc import Callable


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


class Spectateurs(unittest.TestCase):
    """Regarder sans jouer, se lever, se rasseoir."""

    def setUp(self) -> None:
        self.salons = salons.Salons(random.Random(3))
        self.code = self.salons.creer('ana')
        self.salons.rejoindre(self.code, 'bob')

    def test_entrer_en_spectateur_sans_s_asseoir(self) -> None:
        self.salons.lever(self.code, 'cyd')
        vue = self.salons.vue(self.code, 'cyd')
        self.assertTrue(vue['spectateur'])
        self.assertFalse(vue['membre'])
        self.assertEqual(vue['spectateurs'], ['cyd'])
        self.assertNotIn('cyd', vue['joueurs'])

    def test_un_joueur_se_leve_et_se_rassoit(self) -> None:
        self.salons.lever(self.code, 'bob')
        vue = self.salons.vue(self.code, 'ana')
        self.assertEqual(vue['joueurs'], ['ana'])
        self.assertEqual(vue['spectateurs'], ['bob'])
        self.salons.rejoindre(self.code, 'bob')
        vue = self.salons.vue(self.code, 'ana')
        self.assertEqual(vue['joueurs'], ['ana', 'bob'])
        self.assertEqual(vue['spectateurs'], [])

    def test_l_hote_qui_se_leve_passe_la_main(self) -> None:
        self.salons.lever(self.code, 'ana')
        self.assertEqual(self.salons.vue(self.code, 'bob')['hote'], 'bob')

    def test_le_dernier_assis_ne_se_leve_pas(self) -> None:
        self.salons.quitter(self.code, 'bob')
        with self.assertRaises(salons.ErreurSalon):
            self.salons.lever(self.code, 'ana')

    def test_on_ne_se_leve_pas_pendant_une_manche(self) -> None:
        self.salons.lancer(self.code, 'ana')
        with self.assertRaises(salons.ErreurSalon):
            self.salons.lever(self.code, 'bob')

    def test_le_spectateur_voit_la_manche_sans_aucune_main(self) -> None:
        self.salons.lever(self.code, 'cyd')
        self.salons.lancer(self.code, 'ana')
        partie = self.salons.vue(self.code, 'cyd')['partie']
        self.assertIsNotNone(partie)
        self.assertNotIn('main', partie)
        # Pendant la manche, il ne s'assoit pas.
        with self.assertRaises(salons.ErreurSalon):
            self.salons.rejoindre(self.code, 'cyd')

    def test_un_spectateur_quitte_la_table(self) -> None:
        self.salons.lever(self.code, 'cyd')
        self.salons.quitter(self.code, 'cyd')
        vue = self.salons.vue(self.code, 'cyd')
        self.assertFalse(vue['spectateur'])
        self.assertEqual(vue['spectateurs'], [])

class AttenteLongue(unittest.TestCase):
    """`attendre` : la réponse part au premier changement de la table."""

    def setUp(self) -> None:
        self.salons = salons.Salons(random.Random(3))
        self.code = self.salons.creer('ana')
        self.version = self.salons.vue(self.code, 'ana')['version']

    def _plus_tard(self, action: Callable[[], object]) -> None:
        fil = threading.Timer(0.1, action)
        fil.start()
        self.addCleanup(fil.join)

    def test_une_version_depassee_repond_aussitot(self) -> None:
        debut = time.monotonic()
        self.salons.attendre(self.code, self.version - 1, 'ana', delai=5)
        self.assertLess(time.monotonic() - debut, 0.5)

    def test_un_changement_reveille_l_attente(self) -> None:
        self._plus_tard(lambda: self.salons.rejoindre(self.code, 'bob'))
        debut = time.monotonic()
        self.salons.attendre(self.code, self.version, 'ana', delai=5)
        self.assertLess(time.monotonic() - debut, 2)
        self.assertIn('bob', self.salons.vue(self.code, 'ana')['joueurs'])

    def test_sans_changement_l_attente_finit_au_delai(self) -> None:
        debut = time.monotonic()
        self.salons.attendre(self.code, self.version, 'ana', delai=0.3)
        self.assertGreaterEqual(time.monotonic() - debut, 0.3)

    def test_une_table_fermee_pendant_l_attente_est_introuvable(self) -> None:
        self._plus_tard(lambda: self.salons.fermer(self.code, 'ana'))
        with self.assertRaises(salons.SalonIntrouvable):
            self.salons.attendre(self.code, self.version, delai=5)

    def test_qui_attend_reste_present(self) -> None:
        maintenant = [1000.0]
        s = salons.Salons(random.Random(3), horloge=lambda: maintenant[0])
        code = s.creer('ana')
        s.rejoindre(code, 'bob')
        version = s.vue(code, 'ana')['version']
        maintenant[0] += commun.PRESENCE_TABLE * 3
        s.attendre(code, version, 'ana', delai=0.05)
        presents = s.vue(code, 'bob')['presents']
        self.assertTrue(presents['ana'])


if __name__ == '__main__':
    unittest.main()

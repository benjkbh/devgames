"""Pseudos (`metier/joueurs/pseudos.py`) : validation, réservation d'une
heure après le départ, cookie qui retrouve son pseudo. Horloge simulée."""
from __future__ import annotations

import os
import tempfile
import unittest

from backend import base
from backend.metier.joueurs import pseudos
from backend.metier.joueurs.pseudos import (RESERVATION, PseudoPris,
                                            PseudoRefuse)
from tests import muet


class Validation(unittest.TestCase):

    def test_les_espaces_sont_resserres(self) -> None:
        self.assertEqual(pseudos.nettoyer('  Ana   Lune '), 'Ana Lune')

    def test_accents_tirets_et_apostrophes_sont_permis(self) -> None:
        for pseudo in ('Éloïse', 'jean-luc', "l'ours", 'Bob_2', 'M. Loup'):
            with self.subTest(pseudo=pseudo):
                self.assertEqual(pseudos.nettoyer(pseudo), pseudo)

    def test_les_pseudos_invalides_sont_refuses(self) -> None:
        for pseudo in (None, '', 'a', 'x' * 21, '<b>', 'a;b', '---', '😀😀'):
            with self.subTest(pseudo=pseudo), self.assertRaises(PseudoRefuse):
                pseudos.nettoyer(pseudo)


class Reservation(unittest.TestCase):

    def setUp(self) -> None:
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        chemin = os.path.join(self._dir.name, 'pseudos.db')
        base.initialiser(chemin, muet)
        self.maintenant = 1_000_000.0
        self.p = pseudos.Pseudos(chemin, horloge=lambda: self.maintenant)

    def test_le_jeton_retrouve_son_pseudo(self) -> None:
        pseudo, jeton = self.p.choisir('Ana')
        self.assertEqual(pseudo, 'Ana')
        self.assertEqual(self.p.pseudo(jeton), 'Ana')
        self.assertIsNone(self.p.pseudo('jeton-inconnu'))
        self.assertIsNone(self.p.pseudo(None))

    def test_un_pseudo_actif_est_refuse_aux_autres(self) -> None:
        self.p.choisir('Ana')
        with self.assertRaises(PseudoPris) as e:
            self.p.choisir('ANA')
        self.assertEqual(e.exception.reste, RESERVATION)

    def test_l_activite_prolonge_la_reservation(self) -> None:
        _, jeton = self.p.choisir('Ana')
        self.maintenant += RESERVATION - 10
        self.p.pseudo(jeton)            # signe de vie
        self.maintenant += 60
        with self.assertRaises(PseudoPris):
            self.p.choisir('Ana')

    def test_une_heure_apres_le_depart_le_pseudo_se_libere(self) -> None:
        _, ancien = self.p.choisir('Ana')
        self.maintenant += RESERVATION
        pseudo, nouveau = self.p.choisir('ana')
        self.assertEqual(pseudo, 'ana')
        self.assertEqual(self.p.pseudo(nouveau), 'ana')
        # L'ancien détenteur a perdu son pseudo.
        self.assertIsNone(self.p.pseudo(ancien))

    def test_sans_repreneur_l_ancien_cookie_reste_valable(self) -> None:
        _, jeton = self.p.choisir('Ana')
        self.maintenant += 5 * RESERVATION
        self.assertEqual(self.p.pseudo(jeton), 'Ana')

    def test_la_deconnexion_reserve_le_pseudo_une_heure(self) -> None:
        _, jeton = self.p.choisir('Ana')
        self.maintenant += 2 * RESERVATION
        self.p.quitter(jeton)
        self.assertIsNone(self.p.pseudo(jeton))
        self.maintenant += RESERVATION - 1
        with self.assertRaises(PseudoPris):
            self.p.choisir('Ana')
        self.maintenant += 1
        self.assertEqual(self.p.choisir('Ana')[0], 'Ana')

    def test_redemander_son_pseudo_garde_le_jeton(self) -> None:
        _, jeton = self.p.choisir('Ana')
        self.assertEqual(self.p.choisir('ana', jeton), ('Ana', jeton))

    def test_changer_de_pseudo_quitte_l_ancien(self) -> None:
        _, jeton = self.p.choisir('Ana')
        pseudo, nouveau = self.p.choisir('Lune', jeton)
        self.assertEqual(pseudo, 'Lune')
        self.assertIsNone(self.p.pseudo(jeton))
        self.assertEqual(self.p.pseudo(nouveau), 'Lune')
        # Ana reste réservée une heure.
        with self.assertRaises(PseudoPris):
            self.p.choisir('Ana')

    def test_un_refus_ne_fait_pas_perdre_son_pseudo(self) -> None:
        self.p.choisir('Bob')
        _, jeton = self.p.choisir('Ana')
        with self.assertRaises(PseudoPris):
            self.p.choisir('Bob', jeton)
        self.assertEqual(self.p.pseudo(jeton), 'Ana')

    def test_les_recents_sont_ceux_encore_reserves(self) -> None:
        self.p.choisir('Ana')
        self.maintenant += RESERVATION + 1
        self.p.choisir('Bob')
        self.assertEqual([r['pseudo'] for r in self.p.recents()], ['Bob'])


if __name__ == '__main__':
    unittest.main()

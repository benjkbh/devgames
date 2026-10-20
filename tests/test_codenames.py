"""Code Names : règles d'une manche (`metier/codenames/regles.py`) et salons
partagés (`metier/codenames/salons.py`)."""
from __future__ import annotations

import random
import unittest
from collections import Counter

from backend import api
from backend.metier.codenames import mots, salons
from backend.metier.codenames.regles import (COMTE, DOMESTIQUE, CoupInvalide,
                                              Partie, normaliser)

EQUIPES = {'sang': ['ana', 'bob'], 'argent': ['cyd', 'dan']}
ORACLES = {'sang': 'ana', 'argent': 'cyd'}


def partie(graine: int = 1) -> Partie:
    return Partie({e: list(j) for e, j in EQUIPES.items()}, dict(ORACLES),
                  random.Random(graine))


def index(p: Partie, role: str, n: int = 0) -> int:
    """Le `n`-ième portrait caché de `role`."""
    return [i for i, c in enumerate(p.cartes)
            if c.role == role and not c.revelee][n]


def agent(p: Partie) -> str:
    return 'bob' if p.equipe == 'sang' else 'dan'


def oracle(p: Partie) -> str:
    return p.oracles[p.equipe]


class Mots(unittest.TestCase):

    def test_listes_sans_doublon_ni_espace(self) -> None:
        for nom, liste in mots.LISTES.items():
            with self.subTest(liste=nom):
                self.assertGreaterEqual(len(liste), 100)
                self.assertEqual(len({normaliser(m) for m in liste}),
                                 len(liste))
                self.assertFalse([m for m in liste if not m.strip()
                                  or any(c.isspace() for c in m)])


class Distribution(unittest.TestCase):

    def test_25_cartes_9_8_7_1(self) -> None:
        p = partie()
        roles = Counter(c.role for c in p.cartes)
        autre = 'argent' if p.premiere == 'sang' else 'sang'
        self.assertEqual(roles, {p.premiere: 9, autre: 8, DOMESTIQUE: 7,
                                 COMTE: 1})
        self.assertEqual(p.equipe, p.premiere)
        self.assertEqual(p.phase, 'indice')
        self.assertEqual(len({c.mot for c in p.cartes}), 25)

    def test_il_faut_deux_joueurs_et_un_oracle_par_camp(self) -> None:
        with self.assertRaises(CoupInvalide):
            Partie({'sang': ['ana'], 'argent': ['cyd', 'dan']},
                   {'sang': 'ana', 'argent': 'cyd'}, random.Random(1))
        with self.assertRaises(CoupInvalide):
            Partie({e: list(j) for e, j in EQUIPES.items()},
                   {'sang': 'cyd', 'argent': 'cyd'}, random.Random(1))


class Indice(unittest.TestCase):

    def test_seul_l_oracle_au_trait_donne_l_indice(self) -> None:
        p = partie()
        with self.assertRaises(CoupInvalide):
            p.donner_indice(agent(p), 'nuit', 2)
        autre_oracle = 'cyd' if p.equipe == 'sang' else 'ana'
        with self.assertRaises(CoupInvalide):
            p.donner_indice(autre_oracle, 'nuit', 2)
        p.donner_indice(oracle(p), 'zzzindice', 2)
        self.assertEqual(p.phase, 'devine')
        self.assertEqual(p.limite, 3)
        with self.assertRaises(CoupInvalide):
            p.donner_indice(oracle(p), 'autre', 1)       # déjà donné

    def test_un_seul_mot_hors_de_la_table(self) -> None:
        p = partie()
        o = oracle(p)
        for mot in ('', '  ', 'deux mots', 'x' * 31):
            with self.assertRaises(CoupInvalide):
                p.donner_indice(o, mot, 1)
        # Un mot de la table, même sans ses accents ni ses capitales.
        mot = p.cartes[0].mot
        with self.assertRaises(CoupInvalide):
            p.donner_indice(o, normaliser(mot).upper(), 1)
        for n in (-1, 10, 'beaucoup'):
            with self.assertRaises(CoupInvalide):
                p.donner_indice(o, 'zzz', n)

    def test_un_mot_revele_peut_servir_d_indice(self) -> None:
        p = partie()
        p.donner_indice(oracle(p), 'zzz', 1)
        i = index(p, p.equipe)
        p.reveler(agent(p), i)
        p.finir(agent(p))
        p.donner_indice(oracle(p), p.cartes[i].mot, 1)
        self.assertEqual(p.phase, 'devine')


class Reveler(unittest.TestCase):

    def setUp(self) -> None:
        self.p = partie()
        self.camp = self.p.equipe
        self.p.donner_indice(oracle(self.p), 'zzz', 2)

    def test_bonne_carte_on_continue(self) -> None:
        p = self.p
        p.reveler(agent(p), index(p, self.camp))
        self.assertEqual(p.equipe, self.camp)
        self.assertEqual(p.limite, 2)
        self.assertEqual(p.indice['trouves'], 1)

    def test_nombre_plus_un_essais_au_plus(self) -> None:
        p = self.p
        for _ in range(3):
            p.reveler(agent(p), index(p, self.camp))
        self.assertNotEqual(p.equipe, self.camp)
        self.assertEqual(p.phase, 'indice')
        self.assertEqual(p.indices[-1]['trouves'], 3)

    def test_domestique_ou_adverse_le_tour_passe(self) -> None:
        p = self.p
        p.reveler(agent(p), index(p, DOMESTIQUE))
        self.assertNotEqual(p.equipe, self.camp)
        p.donner_indice(oracle(p), 'zzz', 1)
        p.reveler(agent(p), index(p, self.camp))        # pour l'adversaire
        self.assertEqual(p.equipe, self.camp)

    def test_le_comte_fait_perdre(self) -> None:
        p = self.p
        p.reveler(agent(p), index(p, COMTE))
        self.assertTrue(p.finie)
        self.assertNotEqual(p.gagnant, self.camp)
        self.assertEqual(p.cause, 'comte')
        with self.assertRaises(CoupInvalide):
            p.reveler(agent(p), 0)

    def test_tous_ses_portraits_gagnent(self) -> None:
        p = self.p
        p.indice['nombre'] = 0                    # sans limite
        while not p.finie:
            p.reveler(agent(p), index(p, self.camp))
        self.assertEqual(p.gagnant, self.camp)
        self.assertEqual(p.cause, 'portraits')

    def test_reveler_le_dernier_portrait_adverse_le_fait_gagner(self) -> None:
        p = self.p
        adverse = 'argent' if self.camp == 'sang' else 'sang'
        for c in p.cartes:
            if c.role == adverse:
                c.revelee = True
        derniere = next(i for i, c in enumerate(p.cartes)
                        if c.role == adverse)
        p.cartes[derniere].revelee = False
        p.reveler(agent(p), derniere)
        self.assertEqual(p.gagnant, adverse)

    def test_qui_peut_reveler(self) -> None:
        p = self.p
        i = index(p, self.camp)
        with self.assertRaises(CoupInvalide):
            p.reveler(oracle(p), i)                         # l'oracle
        with self.assertRaises(CoupInvalide):
            p.reveler('dan' if self.camp == 'sang' else 'bob', i)  # adverse
        with self.assertRaises(CoupInvalide):
            p.reveler('eve', i)                             # absent
        with self.assertRaises(CoupInvalide):
            p.reveler(agent(p), 25)
        p.reveler(agent(p), i)
        with self.assertRaises(CoupInvalide):
            p.reveler(agent(p), i)                          # déjà révélée

    def test_s_arreter_apres_une_carte(self) -> None:
        p = self.p
        with self.assertRaises(CoupInvalide):
            p.finir(agent(p))
        p.reveler(agent(p), index(p, self.camp))
        p.finir(agent(p))
        self.assertNotEqual(p.equipe, self.camp)

    def test_marques(self) -> None:
        p = self.p
        p.marquer(agent(p), 3)
        self.assertEqual(p.marques, {3: [agent(p)]})
        p.marquer(agent(p), 3)
        self.assertEqual(p.marques, {})
        p.marquer(agent(p), index(p, self.camp))
        p.reveler(agent(p), index(p, self.camp))
        self.assertEqual(p.marques, {})
        with self.assertRaises(CoupInvalide):
            p.marquer(oracle(p), 3)


class Vues(unittest.TestCase):

    def test_seul_l_oracle_voit_le_grimoire(self) -> None:
        p = partie()
        self.assertTrue(all(c['role'] for c in p.vue('ana')['cartes']))
        self.assertTrue(all(c['role'] is None
                            for c in p.vue('bob')['cartes']))
        self.assertTrue(all(c['role'] is None
                            for c in p.vue_spectateur()['cartes']))
        self.assertEqual(p.vue('bob')['moi'],
                         {'equipe': 'sang', 'role': 'agent'})

    def test_une_carte_revelee_est_vue_de_tous(self) -> None:
        p = partie()
        p.donner_indice(oracle(p), 'zzz', 1)
        i = index(p, DOMESTIQUE)
        p.reveler(agent(p), i)
        self.assertEqual(p.vue('dan')['cartes'][i]['role'], DOMESTIQUE)

    def test_tout_est_devoile_a_la_fin(self) -> None:
        p = partie()
        p.donner_indice(oracle(p), 'zzz', 1)
        p.reveler(agent(p), index(p, COMTE))
        self.assertTrue(all(c['role'] for c in p.vue('bob')['cartes']))


class Depart(unittest.TestCase):

    def test_l_oracle_qui_part_est_remplace(self) -> None:
        p = Partie({'sang': ['ana', 'bob', 'eve'], 'argent': ['cyd', 'dan']},
                   dict(ORACLES), random.Random(1))
        p.retirer('ana')
        self.assertEqual(p.oracles['sang'], 'bob')
        self.assertFalse(p.finie)

    def test_un_camp_reduit_a_un_joueur_abandonne(self) -> None:
        p = partie()
        p.retirer('dan')
        self.assertEqual(p.gagnant, 'sang')
        self.assertEqual(p.cause, 'forfait')


class ManchesAuHasard(unittest.TestCase):

    def test_chaque_manche_se_termine(self) -> None:
        for graine in range(200):
            rng = random.Random(graine)
            p = partie(graine)
            while not p.finie:
                p.donner_indice(oracle(p), 'zzz', rng.randrange(4))
                while not p.finie and p.phase == 'devine':
                    cachees = [i for i, c in enumerate(p.cartes)
                               if not c.revelee]
                    if p.essais and rng.random() < .3:
                        p.finir(agent(p))
                    else:
                        p.reveler(agent(p), rng.choice(cachees))
            self.assertIn(p.gagnant, ('sang', 'argent'))


class Tables(unittest.TestCase):

    def setUp(self) -> None:
        self.t = 0.0
        self.s = salons.Salons(random.Random(3), horloge=lambda: self.t)

    def table(self, *autres: str) -> str:
        code = self.s.creer('ana', 'Manoir')
        for j in autres:
            self.s.rejoindre(code, j)
        return code

    def test_les_arrivants_equilibrent_les_camps(self) -> None:
        code = self.table('bob', 'cyd', 'dan')
        camps = self.s.vue(code, 'ana')['camps']
        self.assertEqual(Counter(camps.values()), {'sang': 2, 'argent': 2})

    def test_lancer_exige_des_camps_complets(self) -> None:
        code = self.table('bob', 'cyd')
        with self.assertRaises(salons.ErreurSalon):
            self.s.lancer(code, 'ana')
        self.s.rejoindre(code, 'dan')
        self.assertIn('oracle', self.s.vue(code, 'ana')['manque'])
        with self.assertRaises(salons.ErreurSalon):
            self.s.lancer(code, 'ana')
        camps = self.s.vue(code, 'ana')['camps']
        for e in ('sang', 'argent'):
            j = next(n for n, c in camps.items() if c == e)
            self.s.choisir(code, j, e, True)
        self.assertIsNone(self.s.vue(code, 'ana')['manque'])
        with self.assertRaises(salons.ErreurSalon):
            self.s.lancer(code, 'bob')                       # pas l'hôte
        self.s.lancer(code, 'ana')
        self.assertEqual(self.s.vue(code, 'ana')['etat'], 'partie')

    def test_un_seul_oracle_par_camp(self) -> None:
        code = self.table('bob', 'cyd', 'dan')
        self.s.choisir(code, 'ana', 'sang', True)
        with self.assertRaises(salons.ErreurSalon):
            self.s.choisir(code, 'bob', 'sang', True)
        # Changer de camp rend la place d'oracle.
        self.s.choisir(code, 'ana', 'argent')
        self.assertIsNone(self.s.vue(code, 'ana')['oracles']['sang'])
        self.s.choisir(code, 'bob', 'sang', True)
        self.assertEqual(self.s.vue(code, 'ana')['oracles']['sang'], 'bob')

    def test_melanger_puis_jouer_jusqu_a_la_victoire(self) -> None:
        code = self.table('bob', 'cyd', 'dan', 'eve')
        with self.assertRaises(salons.ErreurSalon):
            self.s.melanger(code, 'bob')
        self.s.melanger(code, 'ana')
        self.assertIsNone(self.s.vue(code, 'ana')['manque'])
        self.s.lancer(code, 'ana')
        with self.assertRaises(salons.ErreurSalon):
            self.s.choisir(code, 'ana', 'sang')          # en cours de manche
        vue = self.s.vue(code, 'ana')['partie']
        camp = vue['equipe']
        o = vue['oracles'][camp]
        a = next(j for j in vue['equipes'][camp] if j != o)
        grimoire = self.s.vue(code, o)['partie']['cartes']
        self.assertIsNone(self.s.vue(code, a)['partie']['cartes'][0]['role'])
        comte = next(i for i, c in enumerate(grimoire) if c['role'] == COMTE)
        self.s.agir(code, o, 'indice', mot='zzz', nombre=1)
        self.s.agir(code, a, 'reveler', carte=comte)
        vue = self.s.vue(code, 'ana')
        self.assertEqual(vue['etat'], 'finie')
        adverse = 'argent' if camp == 'sang' else 'sang'
        self.assertEqual(vue['victoires'], {camp: 0, adverse: 1})
        # Entre deux manches, on change de camp et on relance.
        self.s.choisir(code, 'ana', vue['camps']['ana'])
        self.s.regler(code, 'ana', 'manoir')
        with self.assertRaises(salons.ErreurSalon):
            self.s.regler(code, 'ana', 'inconnue')

    def test_pas_d_arrivee_en_cours_de_manche(self) -> None:
        code = self.table('bob', 'cyd', 'dan')
        self.s.melanger(code, 'ana')
        self.s.lancer(code, 'ana')
        with self.assertRaises(salons.ErreurSalon):
            self.s.rejoindre(code, 'eve')
        self.assertNotIn(code, [t['code'] for t in
                                self.s.lister('eve')['ouvertes']])

    def test_le_depart_d_un_joueur_en_manche(self) -> None:
        code = self.table('bob', 'cyd', 'dan')
        self.s.melanger(code, 'ana')
        self.s.lancer(code, 'ana')
        camps = self.s.vue(code, 'ana')['camps']
        partant = 'bob'
        self.s.quitter(code, partant)
        vue = self.s.vue(code, 'ana')
        self.assertEqual(vue['etat'], 'finie')       # forfait à deux contre un
        perdant = camps[partant]
        self.assertEqual(vue['victoires'][perdant], 0)
        self.assertEqual(sum(vue['victoires'].values()), 1)

    def test_exclusion_et_expiration(self) -> None:
        code = self.table('bob')
        self.s.exclure(code, 'ana', 'bob')
        with self.assertRaises(salons.ErreurSalon):
            self.s.rejoindre(code, 'bob')
        self.t += salons.ABSENCE_TABLE + 1
        with self.assertRaises(salons.SalonIntrouvable):
            self.s.vue(code, 'ana')

    def test_non_membre_ne_voit_pas_le_jeu(self) -> None:
        code = self.table('bob', 'cyd', 'dan')
        self.s.melanger(code, 'ana')
        self.s.lancer(code, 'ana')
        vue = self.s.vue(code, 'eve')
        self.assertFalse(vue['membre'])
        self.assertIsNone(vue['partie'])


class Routes(unittest.TestCase):

    def test_routes_enregistrees_et_role_declare(self) -> None:
        self.assertEqual(api.ROLES['codenames'], ('joueur',))
        for chemin in ('creer', 'rejoindre', 'quitter', 'exclure', 'choisir',
                       'melanger', 'regler', 'lancer', 'indice', 'marquer',
                       'reveler', 'finir'):
            self.assertIn(('POST', '/api/codenames/%s' % chemin), api.TABLE)
        self.assertIn(('GET', '/api/codenames/salons'), api.TABLE)
        self.assertIn(('GET', '/api/codenames/salon'), api.TABLE)


if __name__ == '__main__':
    unittest.main()

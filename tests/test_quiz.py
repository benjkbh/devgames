"""Quiz (`modules/quiz/`) : banque de questions, correction proposée,
déroulé d'une partie (temps, solution, revue par l'hôte) et historique des
questions vues."""
from __future__ import annotations

import os
import random
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from backend import api
from backend.base.commun.connexion import initialiser
from backend.modules.quiz import banque, correction, historique, salons
from backend.modules.quiz.banque import BANQUE, Banque, Question
from backend.modules.quiz.pays import PAYS
from backend.modules.quiz.regles import CoupInvalide, Partie
from tests import muet

MONDE = (Path(__file__).resolve().parent.parent / 'frontend' / 'src'
         / 'modules' / 'quiz' / 'monde.json')


class Horloge:
    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t


def q_texte(n: int, reponse: str = 'Paris') -> Question:
    return Question('t%d' % n, 'Test', 'texte', 'Question %d ?' % n,
                    (reponse,))


def q_ouverte(n: int) -> Question:
    return Question('o%d' % n, 'Test', 'ouverte', 'Citez %d.' % n,
                    indication='libre')


def q_carte(code: str) -> Question:
    return Question('cp' + code, banque.THEME_CARTE, 'carte',
                    'Placez : %s' % code, cible=code)


class LaBanque(unittest.TestCase):

    def test_une_banque_enorme(self) -> None:
        self.assertGreater(len(BANQUE.questions), 2500)
        themes = BANQUE.themes()
        self.assertGreaterEqual(len(themes), 15)

    def test_identifiants_uniques(self) -> None:
        ids = Counter(q.id for q in BANQUE.questions)
        self.assertEqual([i for i, n in ids.items() if n > 1], [])

    def test_chaque_question_a_de_quoi_corriger(self) -> None:
        for q in BANQUE.questions:
            with self.subTest(q=q.enonce):
                if q.type == 'texte':
                    self.assertTrue(q.reponses and q.reponses[0])
                elif q.type == 'ouverte':
                    self.assertTrue(q.indication)
                else:
                    self.assertIn(q.cible, PAYS)

    def test_la_premiere_reponse_admise_est_juste(self) -> None:
        for q in BANQUE.questions:
            if q.type == 'texte':
                with self.subTest(q=q.enonce):
                    self.assertTrue(correction.juste(q.reponses[0],
                                                     q.reponses))

    @unittest.skipUnless(MONDE.is_file(), 'frontend absent')
    def test_chaque_pays_est_sur_la_carte(self) -> None:
        import json
        codes = {p['c'] for p in json.loads(MONDE.read_text('utf-8'))['pays']}
        self.assertEqual(sorted(set(PAYS) - codes), [])

    def test_ligne_illisible(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / 'x.txt').write_text('Une question sans réponse\n',
                                           encoding='utf-8')
            with self.assertRaises(banque.ErreurBanque):
                banque.charger(Path(d))

    def test_vingt_parties_sans_redite(self) -> None:
        """Avec l'historique, quatre joueurs font vingt parties de vingt
        questions sans revoir une question."""
        rng = random.Random(4)
        vues: Counter[str] = Counter()
        for _ in range(20):
            qs = BANQUE.tirer(20, rng, dict(vues))
            self.assertEqual(len(qs), 20)
            for q in qs:
                vues[q.id] += 4
        self.assertEqual(max(vues.values()), 4)

    def test_des_themes_varies(self) -> None:
        qs = BANQUE.tirer(20, random.Random(5), {})
        self.assertGreaterEqual(len({q.theme for q in qs}), 8)
        for a, b in zip(qs, qs[1:], strict=False):
            self.assertNotEqual(a.theme, b.theme)

    def test_sans_carte_ni_ouvertes(self) -> None:
        qs = BANQUE.tirer(30, random.Random(6), {}, carte=False,
                          ouvertes=False)
        self.assertEqual({q.type for q in qs}, {'texte'})


class Correction(unittest.TestCase):

    def test_casse_accents_articles(self) -> None:
        self.assertTrue(correction.juste('la tour eiffel', ('Tour Eiffel',)))
        self.assertTrue(correction.juste('ETATS-UNIS', ('États-Unis',)))
        self.assertTrue(correction.juste("l'Égypte", ('Égypte',)))

    def test_fautes_de_frappe(self) -> None:
        self.assertTrue(correction.juste('Vercingetorixe',
                                         ('Vercingétorix',)))
        self.assertTrue(correction.juste('Shakespear', ('Shakespeare',)))
        self.assertFalse(correction.juste('Au', ('Ag',)))
        self.assertFalse(correction.juste('Lyon', ('Paris',)))

    def test_nombres(self) -> None:
        self.assertTrue(correction.juste('en 1789 !', ('1789',)))
        self.assertFalse(correction.juste('1788', ('1789',)))
        self.assertTrue(correction.juste('3,14', ('3,14',)))

    def test_vide(self) -> None:
        self.assertFalse(correction.juste('  ', ('Paris',)))

    def test_distance(self) -> None:
        self.assertAlmostEqual(correction.km(48.86, 2.35, 51.5, -0.12),
                               343, delta=5)


class Deroule(unittest.TestCase):

    def setUp(self) -> None:
        self.h = Horloge()
        self.p = Partie(['ana', 'bob'], [q_texte(0), q_ouverte(1),
                                          q_carte('FRA')], 20, self.h)

    def test_tout_le_monde_repond_on_passe_a_la_solution(self) -> None:
        self.p.repondre('ana', 0, 'paris')
        self.assertEqual(self.p.phase, 'question')
        self.p.repondre('ana', 0, 'Lyon')      # elle change d'avis
        self.p.repondre('bob', 0, 'Paris')
        self.assertEqual(self.p.phase, 'solution')
        self.assertEqual(self.p.auto[0], {'ana': 0.0, 'bob': 1.0})
        self.assertEqual(self.p.vue('bob')['mon_point'], 1.0)

    def test_personne_ne_voit_les_reponses_des_autres(self) -> None:
        self.p.repondre('ana', 0, 'Paris')
        v = self.p.vue('bob')
        self.assertIsNone(v['ma_reponse'])
        self.assertEqual(v['repondu'], ['ana'])
        self.assertNotIn('Paris', str(v))

    def test_le_temps_ecoule(self) -> None:
        self.p.avancer('bob', 0)               # trop tôt : rien
        self.assertEqual(self.p.phase, 'question')
        self.h.t += 21
        with self.assertRaises(CoupInvalide):
            self.p.repondre('ana', 0, 'Paris')
        self.p.avancer('bob', 0)
        self.assertEqual(self.p.phase, 'solution')
        self.p.avancer('ana', 0)               # trop tôt pour la suite
        self.assertEqual(self.p.phase, 'solution')
        self.h.t += 7
        self.p.avancer('ana', 0)
        self.assertEqual((self.p.phase, self.p.index), ('question', 1))
        self.p.avancer('ana', 0)               # un ancien signal : rien
        self.assertEqual(self.p.index, 1)

    def test_question_ouverte_sans_solution(self) -> None:
        self.p.repondre('ana', 0, 'x')
        self.p.repondre('bob', 0, 'x')
        self.p.passer('ana')
        self.p.repondre('ana', 1, 'Victor Hugo')
        self.p.repondre('bob', 1, 'Zola')
        # Pas de solution : la question suivante, directement.
        self.assertEqual((self.p.phase, self.p.index), ('question', 2))
        self.assertEqual(self.p.points[1], {'ana': None, 'bob': None})

    def test_carte(self) -> None:
        self.p.index = 2
        with self.assertRaises(CoupInvalide):
            self.p.repondre('ana', 2, pays='FRA')
        self.p.repondre('ana', 2, pays='FRA', lat=47, lon=2)
        self.p.repondre('bob', 2, pays='ESP', lat=40, lon=-3)
        self.assertEqual(self.p.auto[2], {'ana': 1.0, 'bob': 0.0})
        v = self.p.vue('ana')
        self.assertEqual(v['question']['cible'], 'FRA')
        self.assertEqual(len(v['points_carte']), 2)

    def test_un_petit_pays_tout_pres_de_sa_capitale(self) -> None:
        p = Partie(['ana'], [q_carte('VAT')], 20, self.h)
        p.repondre('ana', 0, pays='ITA', lat=41.95, lon=12.5)
        self.assertEqual(p.auto[0], {'ana': 1.0})

    def test_revue_puis_fin(self) -> None:
        for i in range(3):
            self.h.t += 30
            self.p.avancer('ana', i)
            if self.p.phase == 'solution':
                self.h.t += 10
                self.p.avancer('ana', i)
        self.assertEqual(self.p.phase, 'revue')
        v = self.p.vue('bob')
        self.assertEqual(v['revue']['index'], 0)
        self.assertEqual(len(v['sommaire']), 3)
        self.p.noter('ana', 1, 'bob', 1)
        self.p.noter('ana', 0, 'bob', 0.5)
        with self.assertRaises(CoupInvalide):
            self.p.noter('ana', 0, 'bob', 2)
        self.p.revoir('ana', 2)
        self.assertEqual(self.p.revue, 2)
        self.p.terminer('ana')
        self.assertTrue(self.p.finie)
        self.assertEqual(self.p.gagnant, 'bob')
        self.assertEqual(self.p.totaux(), {'ana': 0, 'bob': 1.5})
        self.assertEqual(len(self.p.vue('ana')['recap']), 3)

    def test_un_joueur_part_les_autres_continuent(self) -> None:
        self.p.repondre('ana', 0, 'Paris')
        self.p.retirer('bob')
        self.assertEqual(self.p.phase, 'solution')
        self.assertEqual(self.p.ordre, ['ana'])


class Tables(unittest.TestCase):

    def setUp(self) -> None:
        self.h = Horloge()
        petite = Banque([q_texte(i) for i in range(40)])
        self.s = salons.Salons(random.Random(1), self.h, banque=petite)
        self.code = self.s.creer('ana', nombre=10, duree=15, carte=False)
        self.s.rejoindre(self.code, 'bob')

    def test_reglages(self) -> None:
        v = self.s.vue(self.code, 'bob')
        self.assertEqual((v['nombre'], v['duree'], v['carte']),
                         (10, 15, False))
        self.s.regler(self.code, 'ana', {'nombre': 99, 'duree': 45})
        v = self.s.vue(self.code, 'bob')
        self.assertEqual((v['nombre'], v['duree']), (15, 45))
        with self.assertRaises(salons.ErreurSalon):
            self.s.regler(self.code, 'bob', {'nombre': 20})

    def test_seul_l_hote_mene_la_revue(self) -> None:
        self.s.lancer(self.code, 'ana')
        with self.assertRaises(salons.ErreurSalon):
            self.s.agir(self.code, 'bob', 'terminer')
        self.assertEqual(len(self.s.vue(self.code, 'ana')['partie']
                             ['joueurs']), 2)

    def test_routes(self) -> None:
        for nom in ('repondre', 'avancer', 'passer', 'noter', 'revoir',
                    'terminer', 'regler'):
            self.assertIn(('POST', '/api/quiz/%s' % nom), api.TABLE)


class Historique(unittest.TestCase):

    def test_les_questions_vues_sont_evitees(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            base = os.path.join(d, 'app.db')
            initialiser(base, muet)
            petite = Banque([q_texte(i) for i in range(30)])
            s = salons.Salons(random.Random(1), Horloge(), banque=petite)
            s.base = base
            code = s.creer('Ana', nombre=10)
            s.rejoindre(code, 'bob')
            vues: set[str] = set()
            for _ in range(3):
                s.lancer(code, 'Ana')
                ids = {q.id for q in s._salons[code].partie.questions}
                self.assertFalse(ids & vues)
                vues |= ids
                s._salons[code].partie._compter()
            self.assertEqual(len(vues), 30)
            # La casse du pseudo ne compte pas.
            self.assertEqual(len(historique.vues(base, ['ANA'])), 30)


if __name__ == '__main__':
    unittest.main()

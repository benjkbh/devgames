"""Le compte connecté, sur lui-même : changement de mot de passe et sessions.

**Pourquoi ce fichier existe.** Ces routes ne portent aucun droit de module :
n'importe quel compte les appelle, et c'est le NOM tiré de la session qui dit
sur qui elles agissent. Les défauts y sont muets : un ancien mot de passe non
exigé, ou des sessions volées qui survivent au changement, passent inaperçus
tant que personne ne s'en sert.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus
from types import SimpleNamespace

import os
import tempfile
import unittest

from backend import api, base
from backend.api.comptes import moncompte
from backend.metier.comptes import sessions, utilisateurs as u
from tests import muet

if TYPE_CHECKING:
    from typing import Any

MDP = 'motdepasse-solide'
NOUVEAU = 'un-autre-mot-de-passe'
class CompteSurLuiMeme(unittest.TestCase):

    def setUp(self) -> None:
        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        self.db = os.path.join(self._dir.name, 'test.db')
        base.initialiser(self.db, muet)
        u.creer(self.db, 'benjamin', MDP, superadmin=True, fondateur=True)
        u.creer(self.db, 'claire', MDP)
        self.sessions = sessions.Sessions(ttl=3600)
        self.lignes: list[str] = []

    def requete(self, nom: str | None, jeton: str | None = None,
                corps: Any = None) -> Any:
        compte = u.compte(self.db, nom) if nom else None
        return SimpleNamespace(
            utilisateur=nom, compte=compte, jeton=jeton, corps=corps,
            sessions=self.sessions, adresse='127.0.0.1',
            config=SimpleNamespace(db_path=self.db, session_ttl=3600),
            journal=self.lignes.append)

    def test_les_routes_sont_declarees(self) -> None:
        for methode, chemin in (('GET', '/api/compte'),
                                ('POST', '/api/compte/mot-de-passe'),
                                ('POST', '/api/compte/sessions/fermer')):
            self.assertIn((methode, chemin), api.TABLE)

    def test_sans_session_401(self) -> None:
        for route in (moncompte.compte_lire, moncompte.mot_de_passe,
                      moncompte.sessions_fermer):
            with self.subTest(route=route.__name__):
                code, _ = route(self.requete(None))
                self.assertEqual(code, HTTPStatus.UNAUTHORIZED)

    def test_un_compte_desactive_n_a_pas_acces(self) -> None:
        u.modifier(self.db, 'claire', actif=False)
        code, _ = moncompte.compte_lire(self.requete('claire'))
        self.assertEqual(code, HTTPStatus.UNAUTHORIZED)

    def test_la_lecture_rend_les_dates_et_le_nombre_de_sessions(self) -> None:
        self.sessions.ouvrir('claire')
        self.sessions.ouvrir('claire')
        self.sessions.ouvrir('benjamin')
        code, corps = moncompte.compte_lire(self.requete('claire'))
        self.assertEqual(code, HTTPStatus.OK)
        self.assertEqual(corps['nom'], 'claire')
        self.assertEqual(corps['sessions'], 2)
        self.assertEqual(corps['session_ttl'], 3600)
        self.assertIsNotNone(corps['cree_le'])
        self.assertNotIn('empreinte', corps)

    # -- mot de passe -------------------------------------------------------
    def changer(self, actuel: Any, nouveau: Any, jeton: str | None = None,
                nom: str = 'claire') -> tuple[HTTPStatus, dict[str, Any]]:
        code, corps = moncompte.mot_de_passe(self.requete(
            nom, jeton, {'actuel': actuel, 'nouveau': nouveau}))
        return code, dict(corps)  # type: ignore[arg-type]

    def test_le_mot_de_passe_change_sur_presentation_de_l_actuel(self) -> None:
        code, corps = self.changer(MDP, NOUVEAU)
        self.assertEqual(code, HTTPStatus.OK)
        self.assertIsNone(u.authentifier(self.db, 'claire', MDP))
        self.assertIsNotNone(u.authentifier(self.db, 'claire', NOUVEAU))
        self.assertEqual(corps['sessions_fermees'], 0)

    def test_un_actuel_faux_est_refuse_en_400_et_ne_change_rien(self) -> None:
        """400 et non 401 : un 401 ferait afficher le formulaire de
        connexion à quelqu'un qui s'est seulement trompé."""
        code, corps = self.changer('faux', NOUVEAU)
        self.assertEqual(code, HTTPStatus.BAD_REQUEST)
        self.assertIn('actuel', corps['champs'])
        self.assertIsNotNone(u.authentifier(self.db, 'claire', MDP))

    def test_l_absence_d_actuel_est_refusee(self) -> None:
        for rien in (None, '', 0, ['x']):
            with self.subTest(actuel=rien):
                # Un essai raté temporise : chaque cas repart d'une table
                # d'essais vierge.
                self.sessions = sessions.Sessions(ttl=3600)
                code, _ = self.changer(rien, NOUVEAU)
                self.assertEqual(code, HTTPStatus.BAD_REQUEST)
        self.assertIsNotNone(u.authentifier(self.db, 'claire', MDP))

    def test_un_nouveau_vide_ou_identique_est_refuse(self) -> None:
        for nouveau in ('', None, MDP):
            with self.subTest(nouveau=nouveau):
                self.sessions = sessions.Sessions(ttl=3600)
                code, corps = self.changer(MDP, nouveau)
                self.assertEqual(code, HTTPStatus.BAD_REQUEST)
                self.assertIn('nouveau', corps['champs'])
        self.assertIsNotNone(u.authentifier(self.db, 'claire', MDP))

    def test_les_autres_sessions_sont_fermees_pas_celle_ci(self) -> None:
        ici = self.sessions.ouvrir('claire')
        ailleurs = self.sessions.ouvrir('claire')
        autre_compte = self.sessions.ouvrir('benjamin')
        code, corps = self.changer(MDP, NOUVEAU, jeton=ici)
        self.assertEqual(code, HTTPStatus.OK)
        self.assertEqual(corps['sessions_fermees'], 1)
        self.assertEqual(self.sessions.utilisateur(ici), 'claire')
        self.assertIsNone(self.sessions.utilisateur(ailleurs))
        self.assertEqual(self.sessions.utilisateur(autre_compte), 'benjamin')

    def test_le_fondateur_change_son_propre_mot_de_passe(self) -> None:
        code, _ = self.changer(MDP, NOUVEAU, nom='benjamin')
        self.assertEqual(code, HTTPStatus.OK)
        self.assertIsNotNone(u.authentifier(self.db, 'benjamin', NOUVEAU))

    def test_les_essais_rates_alimentent_la_temporisation(self) -> None:
        """Sans cela, une session volée devinerait l'actuel sans frein."""
        for _ in range(6):
            self.changer('faux', NOUVEAU)
        code, _ = self.changer(MDP, NOUVEAU)
        self.assertEqual(code, HTTPStatus.TOO_MANY_REQUESTS)
        self.assertIsNotNone(u.authentifier(self.db, 'claire', MDP))

    def test_le_journal_ne_contient_aucun_mot_de_passe(self) -> None:
        self.changer(MDP, NOUVEAU)
        self.assertEqual(len(self.lignes), 1)
        for secret in (MDP, NOUVEAU):
            self.assertNotIn(secret, self.lignes[0])

    def test_on_n_agit_que_sur_son_propre_compte(self) -> None:
        """Le corps peut citer un autre nom : il n'est jamais lu."""
        code, _ = moncompte.mot_de_passe(self.requete(
            'claire', None, {'nom': 'benjamin', 'actuel': MDP,
                             'nouveau': NOUVEAU}))
        self.assertEqual(code, HTTPStatus.OK)
        self.assertIsNotNone(u.authentifier(self.db, 'benjamin', MDP))
        self.assertIsNotNone(u.authentifier(self.db, 'claire', NOUVEAU))

    # -- sessions -----------------------------------------------------------
    def test_fermer_les_autres_sessions(self) -> None:
        ici = self.sessions.ouvrir('claire')
        self.sessions.ouvrir('claire')
        self.sessions.ouvrir('claire')
        code, corps = moncompte.sessions_fermer(self.requete('claire', ici))
        self.assertEqual(code, HTTPStatus.OK)
        self.assertEqual(corps['sessions_fermees'], 2)  # type: ignore[index]
        self.assertEqual(self.sessions.nombre('claire'), 1)
        self.assertEqual(self.sessions.utilisateur(ici), 'claire')
class CompteDesSessions(unittest.TestCase):
    def test_nombre_ignore_les_sessions_expirees(self) -> None:
        s = sessions.Sessions(ttl=-1)
        s.ouvrir('claire')
        self.assertEqual(s.nombre('claire'), 0)

    def test_fermer_autres_sans_session_courante_ferme_tout(self) -> None:
        s = sessions.Sessions(ttl=3600)
        s.ouvrir('claire')
        s.ouvrir('claire')
        self.assertEqual(s.fermer_autres('claire', None), 2)
        self.assertEqual(s.nombre('claire'), 0)

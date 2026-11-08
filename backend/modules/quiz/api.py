"""`/api/quiz/*` : tables du quiz, ouvertes à tout joueur qui a un pseudo.

Les routes communes des tables viennent de `backend/commun/routes_salons.py` ;
un coup par route (`Salons.COUPS`), et `regler` (l'hôte, entre deux
parties). Chaque route donne au registre le chemin de la base, où vit
l'historique des questions vues (`historique.py`).

Signalements, pour tout joueur qui a un pseudo :
    POST signaler       question, motif, commentaire : la question est
                        écartée des tirages
    GET  signalements   les questions signalées, avec leurs signalements
    POST retablir       question : elle revient aux tirages
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...commun import jeux
from ...commun.routage import corps_objet, exige
from ...commun.routes_salons import RoutesSalons
from . import historique
from .banque import BANQUE
from .regles import CoupInvalide
from .salons import Salons

if TYPE_CHECKING:
    from typing import Any

    from ...commun.routage import Reponse, Route
    from ...serveur import Requete

TABLES = RoutesSalons('quiz', CoupInvalide)
REGLAGES = ('nombre', 'duree', 'carte', 'ouvertes', 'images')


def _avec_base(route: Route) -> Route:
    def avec_base(req: Requete) -> Reponse:
        req.etat('quiz').base = req.config.db_path
        return route(req)
    avec_base.__name__ = route.__name__
    return avec_base


def signaler(req: Requete) -> Reponse:
    refus = exige(req)
    if refus:
        return refus
    corps = corps_objet(req)
    question = str(corps.get('question') or '')
    if question not in BANQUE.par_id:
        return HTTPStatus.NOT_FOUND, {'erreur': 'Question inconnue.'}
    motif = str(corps.get('motif') or 'autre')
    if motif not in historique.MOTIFS:
        motif = 'autre'
    commentaire = ''.join(c for c in str(corps.get('commentaire') or '')
                          if c.isprintable()).strip()
    historique.signaler(req.config.db_path, question, str(req.pseudo),
                        motif, commentaire)
    req.journal('quiz : question %s signalée (%s)' % (question, motif))
    return HTTPStatus.OK, {'ok': True}


def lister_signalements(req: Requete) -> Reponse:
    refus = exige(req)
    if refus:
        return refus
    par_question = historique.signalements(req.config.db_path)
    questions: list[dict[str, Any]] = []
    for qid, liste in par_question.items():
        q = BANQUE.par_id.get(qid)
        if q is None:
            continue        # question retirée ou modifiée depuis
        questions.append({**q.vue_solution(), 'fichier': q.fichier,
                          'signalements': liste})
    questions.sort(key=lambda q: q['signalements'][0]['date'], reverse=True)
    return HTTPStatus.OK, {
        'questions': questions, 'motifs': historique.MOTIFS,
        # Signalements de questions qui n'existent plus (corrigées).
        'orphelins': [qid for qid in par_question
                      if qid not in BANQUE.par_id]}


def retablir(req: Requete) -> Reponse:
    refus = exige(req)
    if refus:
        return refus
    question = str(corps_objet(req).get('question') or '')
    historique.retablir(req.config.db_path, question)
    req.journal('quiz : question %s rétablie' % question)
    return HTTPStatus.OK, {'ok': True}


_ROUTES: dict[tuple[str, str], Route] = {
    ('POST', '/api/quiz/signaler'): signaler,
    ('GET', '/api/quiz/signalements'): lister_signalements,
    ('POST', '/api/quiz/retablir'): retablir,
    **TABLES.routes(lambda s, corps, j: s.creer(
        j, corps.get('nom'), corps.get('public', True),
        **{k: corps.get(k) for k in REGLAGES})),
    **TABLES.demandes(regler=lambda s, corps, j: s.regler(
        corps.get('code'), j,
        {k: corps[k] for k in REGLAGES if k in corps})),
    **TABLES.coups(Salons.COUPS, jeux.parametres(Salons)),
}

ROUTES: dict[tuple[str, str], Route] = {
    cle: _avec_base(route) for cle, route in _ROUTES.items()}

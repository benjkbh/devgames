"""`/api/quiz/*` : tables du quiz, ouvertes à tout joueur qui a un pseudo.

Les routes communes des tables viennent de `backend/commun/routes_salons.py` ;
un coup par route (`Salons.COUPS`), et `regler` (l'hôte, entre deux
parties). Chaque route donne au registre le chemin de la base, où vit
l'historique des questions vues (`historique.py`).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from ...commun import jeux
from ...commun.routes_salons import RoutesSalons
from .regles import CoupInvalide
from .salons import Salons

if TYPE_CHECKING:
    from ...commun.routage import Reponse, Route
    from ...serveur import Requete

TABLES = RoutesSalons('quiz', CoupInvalide)
REGLAGES = ('nombre', 'duree', 'carte', 'ouvertes')


def _avec_base(route: Route) -> Route:
    def avec_base(req: Requete) -> Reponse:
        req.etat('quiz').base = req.config.db_path
        return route(req)
    avec_base.__name__ = route.__name__
    return avec_base


_ROUTES: dict[tuple[str, str], Route] = {
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

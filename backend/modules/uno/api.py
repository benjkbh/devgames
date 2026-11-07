"""`/api/uno/*` : tables de UNO, ouvertes à tout joueur qui a un pseudo.

Les routes communes des tables viennent de `backend/commun/routes_salons.py`.
Seule route sans pseudo : `spectateur`, qui montre une table (par son code)
sans aucune main.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...commun.routes_salons import RoutesSalons, version_attendue
from ...commun.salons import SalonIntrouvable
from .regles import CoupInvalide

if TYPE_CHECKING:
    from typing import Any

    from ...commun.routage import Reponse, Route
    from ...serveur import Requete
    from .salons import Salons

TABLES = RoutesSalons('uno', CoupInvalide)


def spectateur(req: Requete) -> Reponse:
    """Une table vue d'un spectateur, sans pseudo (`?code=`) ; avec
    `&version=`, attente longue comme pour les joueurs."""
    code = req.parametre('code')
    try:
        version = version_attendue(req)
        if version is not None:
            TABLES.salons(req).attendre(code, version)
        return HTTPStatus.OK, TABLES.salons(req).regarder(code)
    except SalonIntrouvable as e:
        return HTTPStatus.NOT_FOUND, {'erreur': str(e)}


def _creer(s: Salons, corps: dict[str, Any], j: str) -> str:
    return s.creer(j, corps.get('nom'), corps.get('public', True),
                   corps.get('regles'))


def _regler(s: Salons, corps: dict[str, Any], j: str) -> None:
    s.regler(corps.get('code'), j, corps.get('regles'))


ROUTES: dict[tuple[str, str], Route] = {
    **TABLES.routes(_creer),
    # Sans session : regarder une table, par son code, sans voir les mains.
    ('GET', TABLES.chemin('spectateur')): spectateur,
    **TABLES.demandes(regler=_regler),
    # `cible` : avec la règle du 7, le joueur dont on prend la main ; avec
    # `contrer`, le joueur contré.
    **TABLES.coups(('jouer', 'piocher', 'passer', 'uno', 'contrer'),
                   ('carte', 'couleur', 'uno', 'cible')),
}

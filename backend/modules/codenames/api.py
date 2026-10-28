"""`/api/codenames/*` : tables de Code Names (rôle `joueur` du module
`codenames`).

Les routes communes des tables viennent de `backend/commun/routes_salons.py`.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from ...commun.routes_salons import RoutesSalons
from .regles import CoupInvalide

if TYPE_CHECKING:
    from typing import Any

    from ...commun.routage import Route
    from .salons import Salons

TABLES = RoutesSalons('codenames', 'joueur', CoupInvalide)


def _creer(s: Salons, corps: dict[str, Any], j: str) -> str:
    return s.creer(j, corps.get('nom'), corps.get('public', True),
                   corps.get('liste'))


def _choisir(s: Salons, corps: dict[str, Any], j: str) -> None:
    s.choisir(corps.get('code'), j, corps.get('equipe'),
              bool(corps.get('oracle')))


def _melanger(s: Salons, corps: dict[str, Any], j: str) -> None:
    s.melanger(corps.get('code'), j)


def _regler(s: Salons, corps: dict[str, Any], j: str) -> None:
    s.regler(corps.get('code'), j, corps.get('liste'))


ROUTES: dict[tuple[str, str], Route] = {
    **TABLES.routes(_creer),
    **TABLES.demandes(choisir=_choisir, melanger=_melanger, regler=_regler),
    **TABLES.coups(('indice', 'marquer', 'reveler', 'finir'),
                   ('mot', 'nombre', 'carte')),
}

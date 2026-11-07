"""`/api/menteur/*` : tables du Menteur, ouvertes à tout joueur qui a un
pseudo.

Les routes communes des tables viennent de `backend/commun/routes_salons.py` ;
un coup par route (`Salons.COUPS`).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from ...commun import jeux
from ...commun.routes_salons import RoutesSalons
from .regles import CoupInvalide
from .salons import Salons

if TYPE_CHECKING:
    from ...commun.routage import Route

TABLES = RoutesSalons('menteur', CoupInvalide)

ROUTES: dict[tuple[str, str], Route] = {
    **TABLES.routes(jeux.creation()),
    **TABLES.coups(Salons.COUPS, jeux.parametres(Salons)),
}

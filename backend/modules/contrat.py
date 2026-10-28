"""Contrat d'un module : ce qu'il apporte au noyau, déclaré dans son
manifeste (`backend/modules/<module>/__init__.py`, constante `MODULE`).

Le noyau (serveur, comptes, droits) ne connaît aucun module : il lit le
registre (`backend/modules/__init__.py`) pour les rôles accordables, les
routes, l'état en mémoire et le schéma.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from dataclasses import dataclass, field

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping

    from ..commun.routage import Route


@dataclass(frozen=True)
class Module:
    # Identifiant partagé avec l'interface, stocké dans la table des droits.
    cle: str
    # Rôles accordables, du moins au plus étendu ; chacun contient les
    # précédents. Au moins un.
    roles: tuple[str, ...]
    # (méthode, chemin exact) -> route. Une route commence par
    # `exige(req, cle, role)`, sauf une route publique, documentée comme
    # telle.
    routes: Mapping[tuple[str, str], Route] = field(default_factory=dict)
    # Fabrique de l'état en mémoire du module (tables de jeu…), appelée une
    # fois au démarrage du serveur ; les routes le lisent par
    # `req.etat(cle)`.
    etat: Callable[[], object] | None = None
    # DDL des tables du module (`CREATE TABLE IF NOT EXISTS`), ajouté au
    # schéma de la base.
    schema: str = ''
    # Taille maximale du corps d'une route, en octets, quand elle dépasse la
    # valeur par défaut du serveur (8 Kio).
    taille_corps: Mapping[tuple[str, str], int] = field(default_factory=dict)

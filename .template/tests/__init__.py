"""Tests du backend. Bibliothèque standard seule, comme le code qu'ils testent.

    python -m unittest discover -s tests -t .

Les bases de test vivent dans un répertoire temporaire ; aucun test ne touche
au réseau ni aux données réelles.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import dataclasses

from backend import config

if TYPE_CHECKING:
    from typing import Any


def muet(niveau: str, message: str) -> None:
    """Journal des tests : `initialiser` en exige un."""


def config_test(**modifs: Any) -> config.Config:
    """Les défauts de `config.charger`, sans lire l'environnement de la
    machine qui joue les tests, avec `modifs` en surcharge."""
    return dataclasses.replace(config.charger({}), **modifs)

"""Registre des modules : la seule liste à compléter pour en ajouter un.

L'ordre est celui de l'interface (`frontend/src/coque/modules.jsx`) et de la
grille des droits. Le contrat d'un module est décrit dans `contrat.py` ; le
modèle le plus simple est `accueil/`, le plus complet `uno/`.
"""
from __future__ import annotations

from .accueil import MODULE as _ACCUEIL
from .codenames import MODULE as _CODENAMES
from .contrat import Module
from .uno import MODULE as _UNO

MODULES: tuple[Module, ...] = (_ACCUEIL, _UNO, _CODENAMES)

"""Constantes lues par le serveur et par l'interface.

`constantes.json` est la seule source pour les modules de l'interface et les
rôles accordables, du moins au plus étendu. Python le charge ici ;
`frontend/src/coque/modules.jsx` doit déclarer les mêmes clés dans le même
ordre (contrôle : `tests/test_partage.py`).
"""
from __future__ import annotations

from typing import Any

import json
from pathlib import Path

CONSTANTES: dict[str, Any] = json.loads(
    Path(__file__).with_name('constantes.json').read_text(encoding='utf-8'))

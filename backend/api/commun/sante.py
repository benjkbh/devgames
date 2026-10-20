"""`GET /api/sante`, sans session : sonde d'un orchestrateur ou de Docker."""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ... import base

if TYPE_CHECKING:
    from .acces import Reponse
    from ...serveur import Requete


def sante(req: Requete) -> Reponse:
    """200 si la base répond, 503 sinon. N'expose aucun détail."""
    etat = {'base': 'ok' if base.lisible(req.config.db_path)
            else 'inaccessible'}
    code = (HTTPStatus.OK if etat['base'] == 'ok'
            else HTTPStatus.SERVICE_UNAVAILABLE)
    return code, etat

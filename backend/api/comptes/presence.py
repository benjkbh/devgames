"""`GET /api/presence` : contrôle de santé de l'interface et présence des
comptes.

Ouvert à tout compte actif : l'interface l'appelle toutes les 10 s pour
savoir si le serveur répond (et si la base est lisible) et qui est en ligne.
L'appel vaut lui-même signe de vie du compte.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ... import base
from ...metier.comptes import utilisateurs
from ..commun.acces import NON_CONNECTE

if TYPE_CHECKING:
    from ..commun.acces import Reponse
    from ...serveur import Requete


def presence(req: Requete) -> Reponse:
    c = req.compte if req.utilisateur else None
    if c is None or not c['actif']:
        return NON_CONNECTE
    lisible = base.lisible(req.config.db_path)
    noms = ([x['nom'] for x in utilisateurs.lister(req.config.db_path)
             if x['actif']] if lisible else [c['nom']])
    return HTTPStatus.OK, {
        'serveur': 'ok',
        'base': 'ok' if lisible else 'inaccessible',
        'moi': c['nom'],
        'comptes': req.presence.etat(noms),
    }

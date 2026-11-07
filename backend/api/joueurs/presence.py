"""`GET /api/presence` : contrôle de santé de l'interface et présence des
joueurs.

Ouvert à tout joueur qui a un pseudo : l'interface l'appelle toutes les 10 s
pour savoir si le serveur répond (et si la base est lisible) et qui est là.
L'appel vaut lui-même signe de vie. La liste : les joueurs en ligne, puis
ceux dont le pseudo est encore réservé (actifs dans l'heure).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import sqlite3
from http import HTTPStatus

from ... import base
from ...commun.routage import exige

if TYPE_CHECKING:
    from typing import Any

    from ...commun.routage import Reponse
    from ...serveur import Requete


def presence(req: Requete) -> Reponse:
    refus = exige(req)
    if refus:
        return refus
    lisible = base.lisible(req.config.db_path)
    recents: list[dict[str, Any]] = []
    if lisible:
        try:
            recents = req.pseudos.recents()
        except sqlite3.Error:
            lisible = False
    # Les pseudos réservés, et ceux que la mémoire voit sans la base (le
    # joueur de cette requête au moins).
    noms = [r['pseudo'] for r in recents]
    noms += [n for n in [req.pseudo] if n not in noms]
    en_base = {r['pseudo']: r['depuis'] for r in recents}
    joueurs = []
    for etat in req.presence.etat(noms):
        if etat['depuis'] is None:
            etat['depuis'] = en_base.get(etat['nom'])
        joueurs.append(etat)
    return HTTPStatus.OK, {
        'serveur': 'ok',
        'base': 'ok' if lisible else 'inaccessible',
        'moi': req.pseudo,
        'joueurs': joueurs,
    }

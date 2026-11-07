"""Lecture et écriture des pseudos (`"joueurs.pseudo"`).

Reçoit des empreintes de jeton déjà calculées et des instants en epoch ; la
règle de réservation (sa durée) vient de l'appelant, `metier/joueurs/`.
"""
from __future__ import annotations

from typing import TypedDict

from ..commun.connexion import _connexion, _verrou_ecriture
from ..commun.dates import epoch, iso


class Ligne(TypedDict):
    pseudo: str
    activite: int


def par_jeton(chemin: str, empreinte: str) -> Ligne | None:
    """Le pseudo détenu par ce jeton, ou None."""
    with _connexion(chemin) as cx:
        r = cx.execute(
            'SELECT pseudo, activite_date FROM "joueurs.pseudo" '
            'WHERE jeton_empreinte = ?', (empreinte,)).fetchone()
    if r is None:
        return None
    return {'pseudo': r['pseudo'], 'activite': epoch(r['activite_date']) or 0}


def reserver(chemin: str, cle: str, pseudo: str, empreinte: str,
             maintenant: float, reservation: int) -> int | None:
    """Donne `pseudo` au jeton `empreinte`, s'il est libre : jamais pris, ou
    inactif depuis `reservation` secondes. Rend None si c'est fait, sinon les
    secondes qui restent avant qu'il se libère. Lecture et écriture dans la
    même transaction, sous le verrou d'écriture."""
    with _verrou_ecriture, _connexion(chemin) as cx:
        r = cx.execute('SELECT activite_date FROM "joueurs.pseudo" '
                       'WHERE cle = ?', (cle,)).fetchone()
        if r is not None:
            ecoule = maintenant - (epoch(r['activite_date']) or 0)
            if ecoule < reservation:
                return max(1, int(reservation - ecoule))
        date = iso(maintenant)
        cx.execute(
            'INSERT OR REPLACE INTO "joueurs.pseudo" (cle, pseudo, '
            'jeton_empreinte, creation_date, activite_date) '
            'VALUES (?, ?, ?, ?, ?)', (cle, pseudo, empreinte, date, date))
    return None


def toucher(chemin: str, empreinte: str, maintenant: float) -> None:
    """Signe de vie du détenteur du jeton."""
    with _verrou_ecriture, _connexion(chemin) as cx:
        cx.execute('UPDATE "joueurs.pseudo" SET activite_date = ? '
                   'WHERE jeton_empreinte = ?', (iso(maintenant), empreinte))


def liberer(chemin: str, empreinte: str, maintenant: float) -> None:
    """Déconnexion : le jeton ne vaut plus rien, et l'heure de réservation
    part de maintenant."""
    with _verrou_ecriture, _connexion(chemin) as cx:
        cx.execute('UPDATE "joueurs.pseudo" SET jeton_empreinte = NULL, '
                   'activite_date = ? WHERE jeton_empreinte = ?',
                   (iso(maintenant), empreinte))


def recents(chemin: str, depuis: float) -> list[Ligne]:
    """Pseudos actifs depuis `depuis` (epoch), du plus récent au plus
    ancien."""
    with _connexion(chemin) as cx:
        lignes = cx.execute(
            'SELECT pseudo, activite_date FROM "joueurs.pseudo" '
            'WHERE activite_date >= ? ORDER BY activite_date DESC',
            (iso(depuis),)).fetchall()
    return [{'pseudo': r['pseudo'], 'activite': epoch(r['activite_date']) or 0}
            for r in lignes]


def compter(chemin: str) -> int:
    with _connexion(chemin) as cx:
        return int(cx.execute(
            'SELECT count(*) FROM "joueurs.pseudo"').fetchone()[0])

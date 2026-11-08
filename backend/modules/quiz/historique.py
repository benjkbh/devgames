"""Historique des questions posées à chaque joueur : `"quiz.vue"`.

Au lancement d'une partie, le tirage évite les questions que les joueurs
assis ont déjà vues ; les questions tirées entrent aussitôt à leur
historique. Un joueur est désigné par son pseudo sans la casse, comme dans
`"joueurs.pseudo"`.
"""
from __future__ import annotations

import time

# La base s'importe à l'appel : son schéma lit le registre des modules, qui
# importe ce module.

SCHEMA = """
-- Questions du quiz déjà posées à un joueur : le tirage les évite.
CREATE TABLE IF NOT EXISTS "quiz.vue" (
    joueur   TEXT     NOT NULL,     -- pseudo sans la casse
    question TEXT     NOT NULL,     -- identifiant (`banque.Question.id`)
    date     DATETIME NOT NULL,
    PRIMARY KEY (joueur, question)
);
"""


def _cle(joueur: str) -> str:
    return joueur.casefold()


def vues(chemin: str, joueurs: list[str]) -> dict[str, int]:
    """Question -> nombre de ces joueurs qui l'ont déjà vue."""
    if not joueurs:
        return {}
    from ...base.commun.connexion import _connexion
    cles = [_cle(j) for j in joueurs]
    with _connexion(chemin) as cx:
        lignes = cx.execute(
            'SELECT question, count(*) AS n FROM "quiz.vue" WHERE joueur IN '
            '(%s) GROUP BY question' % ','.join('?' * len(cles)),
            cles).fetchall()
    return {r['question']: r['n'] for r in lignes}


def noter(chemin: str, joueurs: list[str], questions: list[str]) -> None:
    from ...base.commun.connexion import _connexion, _verrou_ecriture
    from ...base.commun.dates import iso
    date = iso(time.time())
    with _verrou_ecriture, _connexion(chemin) as cx:
        cx.executemany(
            'INSERT OR REPLACE INTO "quiz.vue" (joueur, question, date) '
            'VALUES (?, ?, ?)',
            [(_cle(j), q, date) for j in joueurs for q in questions])

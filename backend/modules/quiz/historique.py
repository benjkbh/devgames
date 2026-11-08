"""Historique des questions posées à chaque joueur (`"quiz.vue"`), et
questions signalées non conformes (`"quiz.signalement"`).

Au lancement d'une partie, le tirage évite les questions que les joueurs
assis ont déjà vues ; les questions tirées entrent aussitôt à leur
historique. Un joueur est désigné par son pseudo sans la casse, comme dans
`"joueurs.pseudo"`.

Une question signalée par un joueur est écartée des tirages, jusqu'à ce
qu'on la rétablisse depuis la page des signalements (une fois la question
corrigée dans son fichier, ou le signalement jugé infondé).
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

-- Questions signalées non conformes : écartées du tirage jusqu'à ce qu'on
-- les rétablisse. Un signalement par joueur et par question (le dernier).
CREATE TABLE IF NOT EXISTS "quiz.signalement" (
    question    TEXT     NOT NULL,
    joueur      TEXT     NOT NULL,     -- pseudo tel qu'écrit
    motif       TEXT     NOT NULL,
    commentaire TEXT     NOT NULL DEFAULT '',
    date        DATETIME NOT NULL,
    PRIMARY KEY (question, joueur)
);
"""

# Motifs d'un signalement.
MOTIFS = {
    'reponse': 'Réponse fausse ou incomplète',
    'ambigue': 'Question ambiguë',
    'image': 'Image cassée ou trompeuse',
    'difficile': 'Trop obscure',
    'autre': 'Autre',
}
COMMENTAIRE_MAX = 300


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


def signaler(chemin: str, question: str, joueur: str, motif: str,
             commentaire: str) -> None:
    from ...base.commun.connexion import _connexion, _verrou_ecriture
    from ...base.commun.dates import iso
    with _verrou_ecriture, _connexion(chemin) as cx:
        cx.execute(
            'INSERT OR REPLACE INTO "quiz.signalement" (question, joueur, '
            'motif, commentaire, date) VALUES (?, ?, ?, ?, ?)',
            (question, joueur, motif, commentaire[:COMMENTAIRE_MAX],
             iso(time.time())))


def signalees(chemin: str) -> set[str]:
    """Les questions signalées : écartées du tirage."""
    from ...base.commun.connexion import _connexion
    with _connexion(chemin) as cx:
        return {r['question'] for r in cx.execute(
            'SELECT DISTINCT question FROM "quiz.signalement"')}


def signalements(chemin: str) -> dict[str, list[dict[str, str]]]:
    """Question -> ses signalements, du plus récent au plus ancien."""
    from ...base.commun.connexion import _connexion
    par_question: dict[str, list[dict[str, str]]] = {}
    with _connexion(chemin) as cx:
        for r in cx.execute(
                'SELECT question, joueur, motif, commentaire, date FROM '
                '"quiz.signalement" ORDER BY date DESC'):
            par_question.setdefault(r['question'], []).append({
                'joueur': r['joueur'], 'motif': r['motif'],
                'commentaire': r['commentaire'], 'date': r['date']})
    return par_question


def retablir(chemin: str, question: str) -> None:
    """La question revient aux tirages : ses signalements sont effacés."""
    from ...base.commun.connexion import _connexion, _verrou_ecriture
    with _verrou_ecriture, _connexion(chemin) as cx:
        cx.execute('DELETE FROM "quiz.signalement" WHERE question = ?',
                   (question,))

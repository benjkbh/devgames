"""Accès à la base SQLite : connexion, verrou d'écriture, initialisation."""
from __future__ import annotations

from typing import TYPE_CHECKING

import contextlib
import os
import sqlite3
import threading

from ..schema import SCHEMA

if TYPE_CHECKING:
    from collections.abc import Callable, Generator

# Une seule écriture à la fois dans le processus ; SQLite sérialise le reste.
_verrou_ecriture = threading.Lock()


class BaseInaccessible(Exception):
    """La base ne peut pas être ouverte ou initialisée."""


@contextlib.contextmanager
def _connexion(chemin: str) -> Generator[sqlite3.Connection]:
    """Connexion validée à la sortie du bloc, puis fermée."""
    dossier = os.path.dirname(chemin)
    if dossier:
        os.makedirs(dossier, exist_ok=True)
    cx = sqlite3.connect(chemin, timeout=10)
    cx.row_factory = sqlite3.Row
    cx.execute('PRAGMA foreign_keys=ON')
    try:
        with cx:
            yield cx
    finally:
        cx.close()


def lisible(chemin: str) -> bool:
    """La base s'ouvre et répond à une lecture."""
    try:
        with _connexion(chemin) as cx:
            cx.execute('SELECT count(*) FROM sqlite_master').fetchone()
    except (sqlite3.Error, OSError):
        return False
    return True


def _diagnostic(chemin: str) -> str | None:
    """Pourquoi `chemin` n'est pas exploitable, ou None si la cause est
    ailleurs."""
    dossier = os.path.dirname(os.path.abspath(chemin))
    if not os.path.isdir(dossier):
        return "le répertoire %s n'existe pas." % dossier
    if os.path.isdir(chemin):
        return ('%s est un répertoire : `DB_PATH` doit désigner le fichier '
                'de base.' % chemin)
    if not os.access(dossier, os.W_OK | os.X_OK):
        return "le répertoire %s n'est pas inscriptible." % dossier
    if os.path.exists(chemin) and not os.access(chemin, os.R_OK | os.W_OK):
        return ("le fichier %s n'est pas accessible en lecture-écriture."
                % chemin)
    return None


def initialiser(chemin: str, logger: Callable[[str, str], None]) -> str:
    """Crée les tables manquantes. Lève `BaseInaccessible`.

    `CREATE TABLE IF NOT EXISTS` ne modifie pas une table existante : un
    changement de forme demande une migration (voir le README).
    """
    logger('info', 'base : ouverture de %s' % chemin)
    try:
        with _connexion(chemin) as cx:
            cx.executescript(SCHEMA)
    except (sqlite3.DatabaseError, OSError) as e:
        raise BaseInaccessible(
            'base de données inutilisable : %s\n\n%s'
            % (chemin, _diagnostic(chemin)
               or '%s: %s' % (type(e).__name__, e))) from e
    return chemin

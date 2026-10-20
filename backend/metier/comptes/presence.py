"""Présence des comptes : dernier signe de vie de chacun, en mémoire.

Toute requête authentifiée compte comme signe de vie (`serveur.Requete`), et
l'interface en envoie une au moins toutes les 10 s (`GET /api/presence`, son
contrôle de santé). Un compte est en ligne s'il s'est manifesté depuis moins
de `EN_LIGNE` secondes. Comme les sessions, la présence est perdue au
redémarrage.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import threading
import time

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable
    from typing import Any

EN_LIGNE = 30


class Presence:
    def __init__(self, horloge: Callable[[], float] = time.time) -> None:
        self._vus: dict[str, float] = {}
        self._verrou = threading.Lock()
        self._horloge = horloge

    def signaler(self, nom: str) -> None:
        with self._verrou:
            self._vus[nom] = self._horloge()

    def oublier(self, nom: str) -> None:
        """Déconnexion volontaire : hors ligne tout de suite."""
        with self._verrou:
            self._vus.pop(nom, None)

    def etat(self, noms: Iterable[str]) -> list[dict[str, Any]]:
        """Pour chaque nom : en ligne ou non, et secondes depuis le dernier
        signe de vie (None : jamais vu depuis le démarrage)."""
        maintenant = self._horloge()
        with self._verrou:
            vus = dict(self._vus)
        etat = []
        for nom in noms:
            vu = vus.get(nom)
            depuis = None if vu is None else max(0, int(maintenant - vu))
            etat.append({'nom': nom,
                         'en_ligne': depuis is not None and depuis < EN_LIGNE,
                         'depuis': depuis})
        return etat

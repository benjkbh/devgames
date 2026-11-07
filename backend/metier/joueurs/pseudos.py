"""Pseudos : n'importe qui entre en choisissant un pseudo, sans compte ni mot
de passe.

Le pseudo choisi est lié au navigateur par un cookie qui porte un jeton
aléatoire ; la base n'en garde que l'empreinte. Un pseudo est réservé tant
que son joueur est actif, puis `RESERVATION` secondes après sa dernière
activité ou sa déconnexion : personne d'autre ne peut le prendre pendant ce
temps. Passé ce délai, le premier qui le choisit l'obtient, et l'ancien jeton
ne vaut plus rien. Tant que personne ne l'a repris, le cookie de son joueur
reste valable.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import hashlib
import re
import secrets
import threading
import time
import unicodedata

from ...base.joueurs import depot

if TYPE_CHECKING:
    from collections.abc import Callable

COOKIE = 'joueur'
# Durée de vie du cookie : il est le seul lien entre un navigateur et son
# pseudo.
DUREE_COOKIE = 30 * 86400
# Réservation d'un pseudo après la dernière activité de son joueur (s).
RESERVATION = 3600
# Les signes de vie ne sont écrits en base qu'à cet intervalle (s) au plus :
# une requête par seconde (le sondage des tables) n'écrit pas à chaque fois.
ECRITURE_ACTIVITE = 60
LONGUEUR_MIN = 2
LONGUEUR_MAX = 20
# Lettres (accents compris), chiffres, espace, tiret, souligné, point,
# apostrophe.
_PERMIS = re.compile(r"^[\w .'’-]+$")


class PseudoRefuse(Exception):
    """Pseudo invalide : le message est montré tel quel."""


class PseudoPris(Exception):
    """Pseudo réservé par un autre joueur ; `reste` : secondes avant qu'il se
    libère."""

    def __init__(self, reste: int) -> None:
        minutes = max(1, (reste + 59) // 60)
        super().__init__('Ce pseudo est déjà pris. Il se libère une heure '
                         'après le départ de son joueur (encore %d min).'
                         % minutes)
        self.reste = reste


def nettoyer(pseudo: object) -> str:
    """Le pseudo tel qu'il sera affiché : espaces resserrés. `PseudoRefuse`
    s'il ne convient pas."""
    texte = unicodedata.normalize('NFC', ' '.join(str(pseudo or '').split()))
    if len(texte) < LONGUEUR_MIN:
        raise PseudoRefuse('Le pseudo doit faire au moins %d caractères.'
                           % LONGUEUR_MIN)
    if len(texte) > LONGUEUR_MAX:
        raise PseudoRefuse('Le pseudo fait au plus %d caractères.'
                           % LONGUEUR_MAX)
    if not _PERMIS.match(texte) or not any(c.isalnum() for c in texte):
        raise PseudoRefuse('Lettres, chiffres, espaces, tirets, points et '
                           'apostrophes seulement.')
    return texte


def cle(pseudo: str) -> str:
    """Le pseudo sans la casse : « Ana » et « ana » sont le même."""
    return pseudo.casefold()


def empreinte(jeton: str) -> str:
    return hashlib.sha256(jeton.encode('utf-8')).hexdigest()


def entete_cookie(valeur: str, max_age: int, secure: bool) -> str:
    parts = ['%s=%s' % (COOKIE, valeur), 'Path=/', 'HttpOnly',
             'SameSite=Strict', 'Max-Age=%d' % max_age]
    if secure:
        parts.append('Secure')
    return '; '.join(parts)


class Pseudos:
    """Pseudos d'une base. `horloge` : temps en epoch (simulé en test).

    Le lien jeton → pseudo est gardé en mémoire après sa première lecture :
    une requête de joueur ne lit pas la base. Toute écriture passe par cette
    instance (un seul processus sert la base), qui oublie aussitôt un lien
    devenu faux (pseudo repris, déconnexion)."""

    def __init__(self, chemin: str,
                 horloge: Callable[[], float] = time.time) -> None:
        self.chemin = chemin
        self._horloge = horloge
        # Pseudo de chaque jeton déjà lu, par empreinte.
        self._connus: dict[str, str] = {}
        # Dernière écriture du signe de vie, par empreinte de jeton.
        self._ecrits: dict[str, float] = {}
        self._verrou = threading.Lock()

    def pseudo(self, jeton: str | None) -> str | None:
        """Le pseudo détenu par ce jeton, ou None ; vaut signe de vie."""
        if not jeton:
            return None
        e = empreinte(jeton)
        with self._verrou:
            pseudo = self._connus.get(e)
        if pseudo is None:
            ligne = depot.par_jeton(self.chemin, e)
            if ligne is None:
                return None
            pseudo = ligne['pseudo']
            with self._verrou:
                self._connus[e] = pseudo
                self._ecrits[e] = max(self._ecrits.get(e, 0),
                                      ligne['activite'])
        maintenant = self._horloge()
        with self._verrou:
            ecrire = maintenant - self._ecrits.get(e, 0) >= ECRITURE_ACTIVITE
            if ecrire:
                self._ecrits[e] = maintenant
        if ecrire:
            depot.toucher(self.chemin, e, maintenant)
        return pseudo

    def choisir(self, demande: object, jeton: str | None = None) -> tuple[
            str, str]:
        """Donne le pseudo demandé au navigateur ; rend `(pseudo, jeton)`.

        `jeton` : celui que le navigateur tient déjà. S'il détient déjà ce
        pseudo, rien ne change ; s'il en détient un autre, il le quitte.
        `PseudoRefuse` ou `PseudoPris` sinon.
        """
        pseudo = nettoyer(demande)
        actuel = self.pseudo(jeton)
        if actuel is not None and cle(actuel) == cle(pseudo):
            return actuel, str(jeton)
        nouveau = secrets.token_urlsafe(32)
        reste = depot.reserver(self.chemin, cle(pseudo), pseudo,
                               empreinte(nouveau), self._horloge(),
                               RESERVATION)
        if reste is not None:
            raise PseudoPris(reste)
        # Un ancien détenteur de ce pseudo (parti depuis une heure) le perd.
        with self._verrou:
            for e, connu in list(self._connus.items()):
                if cle(connu) == cle(pseudo):
                    del self._connus[e]
                    self._ecrits.pop(e, None)
        # Le nouveau est acquis : l'ancien pseudo est quitté (refusé, le
        # joueur l'aurait gardé).
        if actuel is not None:
            self.quitter(jeton)
        return pseudo, nouveau

    def quitter(self, jeton: str | None) -> None:
        """Déconnexion : le jeton ne vaut plus rien ; le pseudo reste réservé
        une heure."""
        if not jeton:
            return
        e = empreinte(jeton)
        with self._verrou:
            self._connus.pop(e, None)
            self._ecrits.pop(e, None)
        depot.liberer(self.chemin, e, self._horloge())

    def recents(self) -> list[dict[str, object]]:
        """Pseudos encore réservés, avec les secondes depuis leur dernière
        activité connue en base."""
        maintenant = self._horloge()
        return [{'pseudo': ligne['pseudo'],
                 'depuis': max(0, int(maintenant - ligne['activite']))}
                for ligne in depot.recents(self.chemin,
                                           maintenant - RESERVATION)]

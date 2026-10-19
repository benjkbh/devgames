"""Salons de UNO, en mémoire : création, partage par code, manches.

Un salon est désigné par un code de 5 caractères, à partager (le lien
`/uno/<code>` l'ouvre). Le créateur en est l'hôte : il lance les manches. Les
joueurs sont des comptes de l'application. Un salon `public` est listé aux
autres joueurs tant qu'aucune manche n'est en cours.

Comme les sessions, les salons vivent en mémoire : un redémarrage du service
les efface. Un salon sans activité depuis `INACTIVITE` secondes est retiré.
Un verrou unique sérialise les accès (les requêtes arrivent sur des fils
distincts).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import random
import secrets
import threading
import time
from dataclasses import dataclass, field

from .regles import CoupInvalide, Partie

if TYPE_CHECKING:
    from collections.abc import Callable
    from typing import Any

ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   # sans 0/O ni 1/I
LONGUEUR_CODE = 5
MIN_JOUEURS = 2
MAX_JOUEURS = 10
MAX_SALONS = 500
NOM_MAX = 40
INACTIVITE = 2 * 3600
# Un joueur dont l'interface n'a pas relu la table depuis ce délai (s) est
# montré absent : onglet fermé, réseau coupé (l'interface relit chaque
# seconde).
PRESENCE_TABLE = 8


class SalonIntrouvable(Exception):
    """Code inconnu ou salon expiré."""


class ErreurSalon(CoupInvalide):
    """Demande refusée : le message est montré au joueur."""


@dataclass
class Salon:
    code: str
    nom: str
    hote: str
    public: bool
    joueurs: list[str]
    touche: float
    partie: Partie | None = None
    manches: int = 0
    scores: dict[str, int] = field(default_factory=dict)
    # Points de la manche finie déjà ajoutés aux scores.
    comptee: bool = False
    # Dernière lecture de la table par chaque joueur (horloge du registre).
    vus: dict[str, float] = field(default_factory=dict)
    # Augmente à chaque changement : l'interface sait si elle doit relire.
    version: int = 0

    @property
    def etat(self) -> str:
        if self.partie is None:
            return 'attente'
        return 'finie' if self.partie.finie else 'partie'

    def resume(self) -> dict[str, Any]:
        return {'code': self.code, 'nom': self.nom, 'hote': self.hote,
                'public': self.public, 'etat': self.etat,
                'joueurs': list(self.joueurs)}


def _nettoyer_nom(nom: object, defaut: str) -> str:
    texte = ''.join(c for c in str(nom or '') if c.isprintable()).strip()
    return texte[:NOM_MAX] or defaut


class Salons:
    """Registre des salons. `rng` : hasard des parties (fixé en test)."""

    def __init__(self, rng: random.Random | None = None,
                 horloge: Callable[[], float] = time.monotonic) -> None:
        self._salons: dict[str, Salon] = {}
        self._verrou = threading.Lock()
        self._rng = rng or random.Random()
        self._horloge = horloge

    # -- outils internes (sous verrou) ---------------------------------------
    def _purger(self) -> None:
        limite = self._horloge() - INACTIVITE
        for code in [c for c, s in self._salons.items() if s.touche < limite]:
            del self._salons[code]

    def _salon(self, code: object) -> Salon:
        self._purger()
        salon = self._salons.get(str(code or '').strip().upper())
        if salon is None:
            raise SalonIntrouvable('Table introuvable : vérifiez le code, ou '
                                   'elle a expiré.')
        return salon

    def _membre(self, code: object, joueur: str) -> Salon:
        salon = self._salon(code)
        if joueur not in salon.joueurs:
            raise ErreurSalon("Vous n'êtes pas assis à cette table.")
        return salon

    def _toucher(self, salon: Salon) -> None:
        salon.touche = self._horloge()
        salon.version += 1

    def _nouveau_code(self) -> str:
        while True:
            code = ''.join(secrets.choice(ALPHABET)
                           for _ in range(LONGUEUR_CODE))
            if code not in self._salons:
                return code

    def _compter(self, salon: Salon) -> None:
        """Manche finie : ajoute les points du gagnant (une seule fois)."""
        p = salon.partie
        if p is not None and p.gagnant is not None and not salon.comptee:
            salon.scores[p.gagnant] = salon.scores.get(p.gagnant, 0) + p.points
            salon.comptee = True

    # -- salons --------------------------------------------------------------
    def creer(self, joueur: str, nom: object = '',
              public: bool = True) -> str:
        with self._verrou:
            self._purger()
            if len(self._salons) >= MAX_SALONS:
                raise ErreurSalon('Trop de tables ouvertes : réessayez plus '
                                  'tard.')
            code = self._nouveau_code()
            self._salons[code] = Salon(
                code=code, nom=_nettoyer_nom(nom, 'Table de %s' % joueur),
                hote=joueur, public=bool(public), joueurs=[joueur],
                touche=self._horloge(), vus={joueur: self._horloge()})
            return code

    def rejoindre(self, code: object, joueur: str) -> str:
        with self._verrou:
            salon = self._salon(code)
            if joueur in salon.joueurs:
                return salon.code
            if salon.etat == 'partie':
                raise ErreurSalon('Une manche est en cours : attendez la '
                                  'fin pour vous asseoir.')
            if len(salon.joueurs) >= MAX_JOUEURS:
                raise ErreurSalon('La table est complète (%d joueurs).'
                                  % MAX_JOUEURS)
            salon.joueurs.append(joueur)
            salon.vus[joueur] = self._horloge()
            self._toucher(salon)
            return salon.code

    def quitter(self, code: object, joueur: str) -> None:
        with self._verrou:
            salon = self._membre(code, joueur)
            salon.joueurs.remove(joueur)
            salon.scores.pop(joueur, None)
            salon.vus.pop(joueur, None)
            if salon.partie is not None:
                salon.partie.retirer(joueur)
                self._compter(salon)
            if not salon.joueurs:
                del self._salons[salon.code]
                return
            if salon.hote == joueur:
                salon.hote = salon.joueurs[0]
            self._toucher(salon)

    def lancer(self, code: object, joueur: str) -> None:
        """Nouvelle manche, par l'hôte, avec tous les joueurs assis."""
        with self._verrou:
            salon = self._membre(code, joueur)
            if salon.hote != joueur:
                raise ErreurSalon("Seul l'hôte lance la manche.")
            if salon.etat == 'partie':
                raise ErreurSalon('Une manche est déjà en cours.')
            if len(salon.joueurs) < MIN_JOUEURS:
                raise ErreurSalon('Il faut au moins %d joueurs.'
                                  % MIN_JOUEURS)
            salon.partie = Partie(salon.joueurs, self._rng)
            salon.comptee = False
            salon.manches += 1
            self._toucher(salon)

    def agir(self, code: object, joueur: str, action: str,
             **params: Any) -> None:
        """Un coup de la manche en cours : jouer, piocher, passer, uno,
        contrer. `CoupInvalide` si la règle l'interdit."""
        with self._verrou:
            salon = self._membre(code, joueur)
            p = salon.partie
            if p is None or p.finie:
                raise ErreurSalon("Aucune manche en cours.")
            if action == 'jouer':
                try:
                    carte = int(params.get('carte'))  # type: ignore[arg-type]
                except (TypeError, ValueError):
                    raise ErreurSalon('Carte illisible.') from None
                p.jouer(joueur, carte, params.get('couleur'),
                        bool(params.get('uno')))
            elif action == 'piocher':
                p.piocher(joueur)
            elif action == 'passer':
                p.passer(joueur)
            elif action == 'uno':
                p.dire_uno(joueur)
            elif action == 'contrer':
                p.contrer(joueur, str(params.get('cible') or ''))
            else:
                raise ErreurSalon('Action inconnue.')
            self._compter(salon)
            self._toucher(salon)

    # -- lecture -------------------------------------------------------------
    def vue(self, code: object, joueur: str) -> dict[str, Any]:
        """Le salon vu par `joueur`. Non assis : de quoi décider de
        s'asseoir (nom, joueurs, état), sans rien du jeu."""
        with self._verrou:
            salon = self._salon(code)
            maintenant = self._horloge()
            if joueur in salon.joueurs:
                # Lire la table vaut présence (sans changer la version).
                salon.vus[joueur] = maintenant
            vue: dict[str, Any] = {
                **salon.resume(),
                'membre': joueur in salon.joueurs,
                'moi': joueur,
                'version': salon.version,
                'manches': salon.manches,
                'scores': {j: salon.scores.get(j, 0) for j in salon.joueurs},
                'presents': {
                    j: maintenant - salon.vus.get(j, float('-inf'))
                    < PRESENCE_TABLE for j in salon.joueurs},
                'min_joueurs': MIN_JOUEURS,
                'max_joueurs': MAX_JOUEURS,
                'partie': None,
            }
            if vue['membre'] and salon.partie is not None:
                vue['partie'] = salon.partie.vue(joueur)
            return vue

    def lister(self, joueur: str) -> dict[str, list[dict[str, Any]]]:
        """Tables publiques en attente d'une manche, et tables du joueur."""
        with self._verrou:
            self._purger()
            miennes = [s.resume() for s in self._salons.values()
                       if joueur in s.joueurs]
            ouvertes = [s.resume() for s in self._salons.values()
                        if s.public and s.etat != 'partie'
                        and joueur not in s.joueurs
                        and len(s.joueurs) < MAX_JOUEURS]
            return {'miennes': miennes, 'ouvertes': ouvertes[:50]}

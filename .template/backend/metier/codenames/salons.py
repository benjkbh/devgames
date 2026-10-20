"""Salons de Code Names, en mémoire : création, partage par code, camps,
manches.

Comme au UNO, un salon est désigné par un code de 5 caractères (le lien
`/codenames/<code>` l'ouvre) ; son créateur en est l'hôte. Entre deux manches,
chaque joueur choisit son camp (Vampires ou Chasseurs) et peut se proposer
oracle ; l'hôte peut répartir tout le monde au hasard, choisir la liste de
mots, exclure un joueur et lancer la manche. Un salon `public` est listé aux autres
joueurs tant qu'aucune manche n'est en cours.

Les salons vivent en mémoire : un redémarrage les efface. Un salon sans
activité depuis `INACTIVITE` secondes est retiré, comme un salon dont aucun
joueur n'a relu la table depuis `ABSENCE_TABLE` secondes. Un verrou unique
sérialise les accès.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import random
import secrets
import threading
import time
from dataclasses import dataclass, field

from .mots import LISTE_DEFAUT, LISTES
from .regles import EQUIPES, CoupInvalide, Partie

if TYPE_CHECKING:
    from collections.abc import Callable
    from typing import Any

ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   # sans 0/O ni 1/I
LONGUEUR_CODE = 5
MIN_JOUEURS = 4
MAX_JOUEURS = 16
MAX_SALONS = 500
NOM_MAX = 40
INACTIVITE = 2 * 3600
PRESENCE_TABLE = 8
ABSENCE_TABLE = 120


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
    # Camp choisi par chaque joueur (None : pas encore choisi).
    camps: dict[str, str | None] = field(default_factory=dict)
    # Oracle de chaque camp, s'il y en a un.
    oracles: dict[str, str | None] = field(
        default_factory=lambda: {e: None for e in EQUIPES})
    liste: str = LISTE_DEFAUT
    partie: Partie | None = None
    manches: int = 0
    victoires: dict[str, int] = field(
        default_factory=lambda: {e: 0 for e in EQUIPES})
    comptee: bool = False
    vus: dict[str, float] = field(default_factory=dict)
    version: int = 0
    exclus: set[str] = field(default_factory=set)

    @property
    def derniere_presence(self) -> float:
        return max((self.vus.get(j, float('-inf')) for j in self.joueurs),
                   default=self.touche)

    @property
    def etat(self) -> str:
        if self.partie is None:
            return 'attente'
        return 'finie' if self.partie.finie else 'partie'

    def membres(self, equipe: str) -> list[str]:
        return [j for j in self.joueurs if self.camps.get(j) == equipe]

    def manque(self) -> str | None:
        """Pourquoi la manche ne peut pas commencer, ou None."""
        if len(self.joueurs) < MIN_JOUEURS:
            return 'Il faut au moins %d joueurs.' % MIN_JOUEURS
        for e, nom in (('sang', 'Vampires'), ('argent', 'Chasseurs')):
            if len(self.membres(e)) < 2:
                return 'Les %s doivent être au moins deux.' % nom
            if self.oracles[e] is None:
                return 'Les %s n’ont pas d’oracle.' % nom
        if any(self.camps.get(j) is None for j in self.joueurs):
            return 'Chaque joueur doit choisir son camp.'
        return None

    def resume(self) -> dict[str, Any]:
        return {'code': self.code, 'nom': self.nom, 'hote': self.hote,
                'public': self.public, 'etat': self.etat,
                'joueurs': list(self.joueurs), 'liste': self.liste}


def _nettoyer_nom(nom: object, defaut: str) -> str:
    texte = ''.join(c for c in str(nom or '') if c.isprintable()).strip()
    return texte[:NOM_MAX] or defaut


def _liste(liste: object) -> str:
    return liste if isinstance(liste, str) and liste in LISTES \
        else LISTE_DEFAUT


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
        maintenant = self._horloge()
        for code in [c for c, s in self._salons.items()
                     if s.touche < maintenant - INACTIVITE
                     or s.derniere_presence < maintenant - ABSENCE_TABLE]:
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

    def _hote(self, code: object, joueur: str, quoi: str) -> Salon:
        salon = self._membre(code, joueur)
        if salon.hote != joueur:
            raise ErreurSalon("Seul l'hôte %s." % quoi)
        return salon

    @staticmethod
    def _hors_manche(salon: Salon) -> None:
        if salon.etat == 'partie':
            raise ErreurSalon('Une manche est en cours : attendez sa fin.')

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
        p = salon.partie
        if p is not None and p.gagnant is not None and not salon.comptee:
            salon.victoires[p.gagnant] += 1
            salon.comptee = True

    @staticmethod
    def _placer(salon: Salon, joueur: str) -> None:
        """Assied `joueur` dans le camp le moins nombreux."""
        salon.camps[joueur] = min(
            EQUIPES, key=lambda e: (len(salon.membres(e)), EQUIPES.index(e)))

    # -- salons --------------------------------------------------------------
    def creer(self, joueur: str, nom: object = '', public: bool = True,
              liste: object = None) -> str:
        with self._verrou:
            self._purger()
            if len(self._salons) >= MAX_SALONS:
                raise ErreurSalon('Trop de tables ouvertes : réessayez plus '
                                  'tard.')
            code = self._nouveau_code()
            salon = Salon(
                code=code, nom=_nettoyer_nom(nom, 'Manoir de %s' % joueur),
                hote=joueur, public=bool(public), joueurs=[joueur],
                touche=self._horloge(), vus={joueur: self._horloge()},
                liste=_liste(liste))
            self._placer(salon, joueur)
            self._salons[code] = salon
            return code

    def rejoindre(self, code: object, joueur: str) -> str:
        with self._verrou:
            salon = self._salon(code)
            if joueur in salon.joueurs:
                return salon.code
            if joueur in salon.exclus:
                raise ErreurSalon('Vous avez été exclu de cette table.')
            if salon.etat == 'partie':
                raise ErreurSalon('Une manche est en cours : attendez la '
                                  'fin pour vous asseoir.')
            if len(salon.joueurs) >= MAX_JOUEURS:
                raise ErreurSalon('La table est complète (%d joueurs).'
                                  % MAX_JOUEURS)
            salon.joueurs.append(joueur)
            salon.vus[joueur] = self._horloge()
            self._placer(salon, joueur)
            self._toucher(salon)
            return salon.code

    def _retirer(self, salon: Salon, joueur: str) -> None:
        salon.joueurs.remove(joueur)
        salon.vus.pop(joueur, None)
        salon.camps.pop(joueur, None)
        for e in EQUIPES:
            if salon.oracles[e] == joueur:
                salon.oracles[e] = None
        if salon.partie is not None:
            salon.partie.retirer(joueur)
            self._compter(salon)
            # L'oracle de remplacement le reste pour la suite.
            for e, oracle in salon.partie.oracles.items():
                if salon.oracles[e] is None and oracle in salon.joueurs:
                    salon.oracles[e] = oracle
        if not salon.joueurs:
            del self._salons[salon.code]
            return
        if salon.hote == joueur:
            salon.hote = salon.joueurs[0]
        self._toucher(salon)

    def quitter(self, code: object, joueur: str) -> None:
        with self._verrou:
            self._retirer(self._membre(code, joueur), joueur)

    def exclure(self, code: object, joueur: str, cible: object) -> None:
        with self._verrou:
            salon = self._hote(code, joueur, 'exclut un joueur')
            cible = str(cible or '')
            if cible == joueur:
                raise ErreurSalon('Vous ne pouvez pas vous exclure : '
                                  'quittez la table.')
            if cible not in salon.joueurs:
                raise ErreurSalon("Ce joueur n'est pas à la table.")
            salon.exclus.add(cible)
            self._retirer(salon, cible)

    def choisir(self, code: object, joueur: str, equipe: object,
                oracle: object = False) -> None:
        """`joueur` rejoint un camp, et s'en propose l'oracle (ou cesse de
        l'être), entre deux manches."""
        with self._verrou:
            salon = self._membre(code, joueur)
            self._hors_manche(salon)
            if equipe not in EQUIPES:
                raise ErreurSalon('Camp inconnu.')
            ancien = salon.camps.get(joueur)
            if ancien is not None and salon.oracles[ancien] == joueur \
                    and (ancien != equipe or not oracle):
                salon.oracles[ancien] = None
            salon.camps[joueur] = str(equipe)
            if oracle:
                place = salon.oracles[str(equipe)]
                if place not in (None, joueur):
                    raise ErreurSalon('%s est déjà l’oracle de ce camp.'
                                      % place)
                salon.oracles[str(equipe)] = joueur
            self._toucher(salon)

    def melanger(self, code: object, joueur: str) -> None:
        """L'hôte répartit les joueurs au hasard et désigne les oracles."""
        with self._verrou:
            salon = self._hote(code, joueur, 'répartit les camps')
            self._hors_manche(salon)
            ordre = list(salon.joueurs)
            self._rng.shuffle(ordre)
            premier = self._rng.randrange(2)
            for i, j in enumerate(ordre):
                salon.camps[j] = EQUIPES[(i + premier) % 2]
            for e in EQUIPES:
                membres = [j for j in ordre if salon.camps[j] == e]
                salon.oracles[e] = membres[0] if membres else None
            self._toucher(salon)

    def regler(self, code: object, joueur: str, liste: object) -> None:
        """L'hôte choisit la liste de mots, entre deux manches."""
        with self._verrou:
            salon = self._hote(code, joueur, 'choisit les mots')
            self._hors_manche(salon)
            if liste not in LISTES:
                raise ErreurSalon('Liste de mots inconnue.')
            salon.liste = str(liste)
            self._toucher(salon)

    def lancer(self, code: object, joueur: str) -> None:
        with self._verrou:
            salon = self._hote(code, joueur, 'lance la manche')
            if salon.etat == 'partie':
                raise ErreurSalon('Une manche est déjà en cours.')
            raison = salon.manque()
            if raison:
                raise ErreurSalon(raison)
            salon.partie = Partie(
                {e: salon.membres(e) for e in EQUIPES},
                {e: str(salon.oracles[e]) for e in EQUIPES},
                self._rng, salon.liste)
            salon.comptee = False
            salon.manches += 1
            self._toucher(salon)

    def agir(self, code: object, joueur: str, action: str,
             **params: Any) -> None:
        """Un coup de la manche : indice, marquer, reveler, finir."""
        with self._verrou:
            salon = self._membre(code, joueur)
            p = salon.partie
            if p is None or p.finie:
                raise ErreurSalon('Aucune manche en cours.')
            if action == 'indice':
                p.donner_indice(joueur, params.get('mot'),
                                params.get('nombre'))
            elif action == 'marquer':
                p.marquer(joueur, params.get('carte'))
            elif action == 'reveler':
                p.reveler(joueur, params.get('carte'))
            elif action == 'finir':
                p.finir(joueur)
            else:
                raise ErreurSalon('Action inconnue.')
            self._compter(salon)
            self._toucher(salon)

    # -- lecture -------------------------------------------------------------
    def _commun(self, salon: Salon) -> dict[str, Any]:
        maintenant = self._horloge()
        return {
            **salon.resume(),
            'version': salon.version,
            'manches': salon.manches,
            'victoires': dict(salon.victoires),
            'camps': {j: salon.camps.get(j) for j in salon.joueurs},
            'oracles': dict(salon.oracles),
            'presents': {
                j: maintenant - salon.vus.get(j, float('-inf'))
                < PRESENCE_TABLE for j in salon.joueurs},
            'manque': salon.manque(),
            'min_joueurs': MIN_JOUEURS,
            'max_joueurs': MAX_JOUEURS,
        }

    def vue(self, code: object, joueur: str) -> dict[str, Any]:
        """Le salon vu par `joueur` ; non assis, sans rien du jeu."""
        with self._verrou:
            salon = self._salon(code)
            membre = joueur in salon.joueurs
            if membre:
                salon.vus[joueur] = self._horloge()
            vue = {
                **self._commun(salon),
                'membre': membre,
                'exclu': joueur in salon.exclus,
                'moi': joueur,
                'partie': None,
            }
            if membre and salon.partie is not None:
                vue['partie'] = salon.partie.vue(joueur)
            return vue

    def lister(self, joueur: str) -> dict[str, list[dict[str, Any]]]:
        with self._verrou:
            self._purger()
            miennes = [s.resume() for s in self._salons.values()
                       if joueur in s.joueurs]
            ouvertes = [s.resume() for s in self._salons.values()
                        if s.public and s.etat != 'partie'
                        and joueur not in s.joueurs
                        and len(s.joueurs) < MAX_JOUEURS]
            return {'miennes': miennes, 'ouvertes': ouvertes[:50]}

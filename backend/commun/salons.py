"""Tables de jeu en mémoire, communes à tous les jeux : création, partage par
code, hôte, exclusion, présence, manches, expiration.

Un salon est désigné par un code de 5 caractères, à partager (le lien
`/<module>/<code>` l'ouvre). Le créateur en est l'hôte : il lance les manches.
Les joueurs sont des comptes de l'application. Un salon `public` est listé aux
autres joueurs tant qu'aucune manche n'est en cours. L'hôte peut exclure un
joueur (il ne peut plus s'asseoir).

Comme les sessions, les salons vivent en mémoire : un redémarrage du service
les efface. Un salon sans activité depuis `INACTIVITE` secondes est retiré,
comme un salon dont aucun joueur n'a relu la table depuis `ABSENCE_TABLE`
secondes. Un verrou unique sérialise les accès (les requêtes arrivent sur des
fils distincts).

Un jeu dérive `Salon` (ce que la table garde entre deux manches) et `Salons`
(ses règles de table), et fournit sa manche : un objet qui a `finie`,
`gagnant`, `retirer(joueur)` et `vue(joueur)`. Les crochets à redéfinir sont
regroupés en tête de `Salons`.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar, Generic, TypeVar

import random
import secrets
import threading
import time
from dataclasses import dataclass, field

if TYPE_CHECKING:
    from collections.abc import Callable
    from typing import Any

ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   # sans 0/O ni 1/I
LONGUEUR_CODE = 5
MAX_SALONS = 500
NOM_MAX = 40
INACTIVITE = 2 * 3600
# Un joueur dont l'interface n'a pas relu la table depuis ce délai (s) est
# montré absent : onglet fermé, réseau coupé (l'interface relit chaque
# seconde).
PRESENCE_TABLE = 8
# Une table que plus aucun joueur ne regarde depuis ce délai (s) est supprimée.
ABSENCE_TABLE = 120
# Un joueur assis peut reprendre la table d'un hôte absent depuis ce délai (s).
DELAI_REPRISE = 60


class SalonIntrouvable(Exception):
    """Code inconnu ou salon expiré."""


class ErreurSalon(Exception):
    """Demande refusée : le message est montré au joueur."""


@dataclass
class Salon:
    code: str
    nom: str
    hote: str
    public: bool
    joueurs: list[str]
    touche: float
    # Manche en cours ou dernière manche jouée (objet du jeu).
    partie: Any = None
    manches: int = 0
    # Résultat de la manche finie déjà compté.
    comptee: bool = False
    # Dernière lecture de la table par chaque joueur (horloge du registre).
    vus: dict[str, float] = field(default_factory=dict)
    # Augmente à chaque changement : l'interface sait si elle doit relire.
    version: int = 0
    # Joueurs exclus par l'hôte : ils ne peuvent plus s'asseoir.
    exclus: set[str] = field(default_factory=set)
    # Joueurs qui se sont dits prêts pour la prochaine manche.
    prets: set[str] = field(default_factory=set)

    @property
    def derniere_presence(self) -> float:
        """Dernière lecture de la table par l'un des joueurs assis."""
        return max((self.vus.get(j, float('-inf')) for j in self.joueurs),
                   default=self.touche)

    @property
    def etat(self) -> str:
        if self.partie is None:
            return 'attente'
        return 'finie' if self.partie.finie else 'partie'

    def reglages(self) -> dict[str, Any]:
        """Réglages propres au jeu, montrés dans la liste des tables."""
        return {}

    def resume(self) -> dict[str, Any]:
        return {'code': self.code, 'nom': self.nom, 'hote': self.hote,
                'public': self.public, 'etat': self.etat,
                'joueurs': list(self.joueurs), **self.reglages()}


def nettoyer_nom(nom: object, defaut: str) -> str:
    texte = ''.join(c for c in str(nom or '') if c.isprintable()).strip()
    return texte[:NOM_MAX] or defaut


S = TypeVar('S', bound=Salon)


class Salons(Generic[S]):
    """Registre des salons d'un jeu. `rng` : hasard des parties (fixé en
    test) ; `horloge` : temps des expirations (simulé en test)."""

    # -- à fixer par le jeu --------------------------------------------------
    MIN_JOUEURS: ClassVar[int] = 2
    MAX_JOUEURS: ClassVar[int] = 10
    # Nom d'une table créée sans nom (`%s` : l'hôte).
    NOM_DEFAUT: ClassVar[str] = 'Table de %s'
    # Erreur levée pour une demande refusée : une sous-classe d'`ErreurSalon`
    # (et de l'erreur de coup du jeu, pour qu'une route n'en attrape qu'une).
    Erreur: ClassVar[type[ErreurSalon]] = ErreurSalon

    def _nouveau(self, code: str, nom: str, joueur: str, public: bool,
                 **reglages: Any) -> S:
        """Le salon que `joueur` crée, avec les réglages du jeu."""
        raise NotImplementedError

    def _assis(self, salon: S, joueur: str) -> None:
        """`joueur` vient de s'asseoir (créateur compris)."""

    def _oublier(self, salon: S, joueur: str) -> None:
        """`joueur` quitte la table : ce que le salon gardait de lui."""

    def _manque(self, salon: S) -> str | None:
        """Pourquoi la manche ne peut pas commencer, ou None."""
        if len(salon.joueurs) < self.MIN_JOUEURS:
            return 'Il faut au moins %d joueurs.' % self.MIN_JOUEURS
        return None

    def _partie(self, salon: S) -> Any:
        """Une nouvelle manche, avec les joueurs assis."""
        raise NotImplementedError

    def _jouer(self, salon: S, joueur: str, action: str,
               params: dict[str, Any]) -> None:
        """Un coup de `joueur` dans la manche en cours."""
        raise NotImplementedError

    def _compter_gagnant(self, salon: S, partie: Any) -> None:
        """Manche finie : le résultat entre au palmarès de la table."""

    def _vue_table(self, salon: S) -> dict[str, Any]:
        """Ce que le jeu ajoute à la vue de la table (scores, camps…)."""
        return {}

    # -- registre ------------------------------------------------------------
    def __init__(self, rng: random.Random | None = None,
                 horloge: Callable[[], float] = time.monotonic) -> None:
        self._salons: dict[str, S] = {}
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

    def _salon(self, code: object) -> S:
        self._purger()
        salon = self._salons.get(str(code or '').strip().upper())
        if salon is None:
            raise SalonIntrouvable('Table introuvable : vérifiez le code, ou '
                                   'elle a expiré.')
        return salon

    def _membre(self, code: object, joueur: str) -> S:
        salon = self._salon(code)
        if joueur not in salon.joueurs:
            raise self.Erreur("Vous n'êtes pas assis à cette table.")
        return salon

    def _hote(self, code: object, joueur: str, quoi: str) -> S:
        """Le salon, si `joueur` en est l'hôte ; `quoi` : ce qu'il fait."""
        salon = self._membre(code, joueur)
        if salon.hote != joueur:
            raise self.Erreur("Seul l'hôte %s." % quoi)
        return salon

    def _hors_manche(self, salon: S, message: str = 'Une manche est en '
                     'cours : attendez sa fin.') -> None:
        if salon.etat == 'partie':
            raise self.Erreur(message)

    def _toucher(self, salon: S) -> None:
        salon.touche = self._horloge()
        salon.version += 1

    def _nouveau_code(self) -> str:
        while True:
            code = ''.join(secrets.choice(ALPHABET)
                           for _ in range(LONGUEUR_CODE))
            if code not in self._salons:
                return code

    def _compter(self, salon: S) -> None:
        """Manche finie : compte son résultat (une seule fois)."""
        p = salon.partie
        if p is not None and p.gagnant is not None and not salon.comptee:
            self._compter_gagnant(salon, p)
            salon.comptee = True

    def _retirer(self, salon: S, joueur: str) -> None:
        """`joueur` n'est plus à la table : il sort de la manche, l'hôte
        passe au suivant, la table vide disparaît."""
        salon.joueurs.remove(joueur)
        salon.vus.pop(joueur, None)
        salon.prets.discard(joueur)
        self._oublier(salon, joueur)
        if salon.partie is not None:
            salon.partie.retirer(joueur)
            self._compter(salon)
        if not salon.joueurs:
            del self._salons[salon.code]
            return
        if salon.hote == joueur:
            salon.hote = salon.joueurs[0]
        self._toucher(salon)

    # -- salons --------------------------------------------------------------
    def _creer(self, joueur: str, nom: object, public: object,
               **reglages: Any) -> str:
        with self._verrou:
            self._purger()
            if len(self._salons) >= MAX_SALONS:
                raise self.Erreur('Trop de tables ouvertes : réessayez plus '
                                  'tard.')
            code = self._nouveau_code()
            salon = self._nouveau(
                code, nettoyer_nom(nom, self.NOM_DEFAUT % joueur), joueur,
                bool(public), **reglages)
            salon.vus[joueur] = self._horloge()
            self._assis(salon, joueur)
            self._salons[code] = salon
            return code

    def rejoindre(self, code: object, joueur: str) -> str:
        with self._verrou:
            salon = self._salon(code)
            if joueur in salon.joueurs:
                return salon.code
            if joueur in salon.exclus:
                raise self.Erreur('Vous avez été exclu de cette table.')
            self._hors_manche(salon, 'Une manche est en cours : attendez la '
                                     'fin pour vous asseoir.')
            if len(salon.joueurs) >= self.MAX_JOUEURS:
                raise self.Erreur('La table est complète (%d joueurs).'
                                  % self.MAX_JOUEURS)
            salon.joueurs.append(joueur)
            salon.vus[joueur] = self._horloge()
            self._assis(salon, joueur)
            self._toucher(salon)
            return salon.code

    def quitter(self, code: object, joueur: str) -> None:
        with self._verrou:
            self._retirer(self._membre(code, joueur), joueur)

    def exclure(self, code: object, joueur: str, cible: object) -> None:
        """L'hôte exclut `cible` : il quitte la table, et ne peut plus s'y
        asseoir."""
        with self._verrou:
            salon = self._hote(code, joueur, 'exclut un joueur')
            cible = str(cible or '')
            if cible == joueur:
                raise self.Erreur('Vous ne pouvez pas vous exclure : '
                                  'quittez la table.')
            if cible not in salon.joueurs:
                raise self.Erreur("Ce joueur n'est pas à la table.")
            salon.exclus.add(cible)
            self._retirer(salon, cible)

    def lancer(self, code: object, joueur: str) -> None:
        """Nouvelle manche, par l'hôte, avec tous les joueurs assis."""
        with self._verrou:
            salon = self._hote(code, joueur, 'lance la manche')
            self._hors_manche(salon, 'Une manche est déjà en cours.')
            raison = self._manque(salon)
            if raison:
                raise self.Erreur(raison)
            salon.partie = self._partie(salon)
            salon.prets.clear()
            salon.comptee = False
            salon.manches += 1
            self._toucher(salon)

    def pret(self, code: object, joueur: str, pret: object = True) -> None:
        """`joueur` se dit prêt pour la prochaine manche (ou ne l'est
        plus)."""
        with self._verrou:
            salon = self._membre(code, joueur)
            self._hors_manche(salon)
            if pret:
                salon.prets.add(joueur)
            else:
                salon.prets.discard(joueur)
            self._toucher(salon)

    def reprendre(self, code: object, joueur: str) -> None:
        """`joueur` devient l'hôte d'une table dont l'hôte est absent depuis
        `DELAI_REPRISE` secondes."""
        with self._verrou:
            salon = self._membre(code, joueur)
            if salon.hote == joueur:
                return
            absence = self._absence(salon, salon.hote)
            if absence is None or absence < DELAI_REPRISE:
                raise self.Erreur("L'hôte est encore là : la table ne se "
                                  'reprend qu’après %d s d’absence.'
                                  % DELAI_REPRISE)
            salon.hote = joueur
            self._toucher(salon)

    def fermer(self, code: object, joueur: str) -> None:
        """L'hôte ferme la table : elle disparaît pour tous."""
        with self._verrou:
            salon = self._hote(code, joueur, 'ferme la table')
            del self._salons[salon.code]

    def agir(self, code: object, joueur: str, action: str,
             **params: Any) -> None:
        """Un coup de la manche en cours ; l'erreur de coup du jeu si sa
        règle l'interdit."""
        with self._verrou:
            salon = self._membre(code, joueur)
            p = salon.partie
            if p is None or p.finie:
                raise self.Erreur('Aucune manche en cours.')
            self._jouer(salon, joueur, action, params)
            self._compter(salon)
            self._toucher(salon)

    # -- lecture -------------------------------------------------------------
    def _absence(self, salon: S, joueur: str) -> float | None:
        """Secondes depuis que `joueur` n'a plus relu la table, s'il est
        absent ; None s'il est là."""
        ecart = self._horloge() - salon.vus.get(joueur, float('-inf'))
        return ecart if ecart >= PRESENCE_TABLE else None

    def _commun(self, salon: S) -> dict[str, Any]:
        maintenant = self._horloge()
        absence = self._absence(salon, salon.hote)
        return {
            **salon.resume(),
            'version': salon.version,
            'manches': salon.manches,
            'presents': {
                j: maintenant - salon.vus.get(j, float('-inf'))
                < PRESENCE_TABLE for j in salon.joueurs},
            'min_joueurs': self.MIN_JOUEURS,
            'max_joueurs': self.MAX_JOUEURS,
            'prets': [j for j in salon.joueurs if j in salon.prets],
            # Absence de l'hôte (s, arrondie), et délai pour reprendre sa
            # table.
            'absence_hote': None if absence is None
            or absence == float('inf') else int(absence),
            'delai_reprise': DELAI_REPRISE,
            **self._vue_table(salon),
        }

    def vue(self, code: object, joueur: str) -> dict[str, Any]:
        """Le salon vu par `joueur`. Non assis : de quoi décider de
        s'asseoir (nom, joueurs, état), sans rien du jeu."""
        with self._verrou:
            salon = self._salon(code)
            membre = joueur in salon.joueurs
            if membre:
                # Lire la table vaut présence (sans changer la version).
                salon.vus[joueur] = self._horloge()
            vue: dict[str, Any] = {
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
        """Tables publiques en attente d'une manche, et tables du joueur."""
        with self._verrou:
            self._purger()
            miennes = [s.resume() for s in self._salons.values()
                       if joueur in s.joueurs]
            ouvertes = [s.resume() for s in self._salons.values()
                        if s.public and s.etat != 'partie'
                        and joueur not in s.joueurs
                        and len(s.joueurs) < self.MAX_JOUEURS]
            return {'miennes': miennes, 'ouvertes': ouvertes[:50]}

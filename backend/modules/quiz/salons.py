"""Tables du quiz, sur le registre commun (`backend/commun/salons.py`) :
réglages de la partie (nombre de questions, temps, carte, questions
ouvertes), victoires par joueur, et revue réservée à l'hôte.

Au lancement, les questions sont tirées en évitant celles que les joueurs
assis ont déjà vues (`historique.py`), si le registre connaît la base
(`base`, posé par les routes) ; sans base (tests), le tirage est libre.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from dataclasses import dataclass

from ...commun import jeux, salons as commun
from ...commun.salons import SalonIntrouvable  # noqa: F401
from . import historique
from .banque import BANQUE, Banque
from .regles import CoupInvalide, Partie

if TYPE_CHECKING:
    from collections.abc import Callable
    import random

MIN_JOUEURS = 2
MAX_JOUEURS = 12
NOMBRES = (10, 15, 20, 25, 30)
DUREES = (15, 20, 30, 45, 60)
NOMBRE_DEFAUT = 15
DUREE_DEFAUT = 30


class ErreurSalon(commun.ErreurSalon, CoupInvalide):
    """Demande refusée : le message est montré au joueur."""


@dataclass
class Salon(jeux.Salon):
    nombre: int = NOMBRE_DEFAUT
    duree: int = DUREE_DEFAUT
    carte: bool = True
    ouvertes: bool = True

    def reglages(self) -> dict[str, Any]:
        return {'nombre': self.nombre, 'duree': self.duree,
                'carte': self.carte, 'ouvertes': self.ouvertes}


def _choix(valeur: object, permis: tuple[int, ...], defaut: int) -> int:
    try:
        v = int(valeur)  # type: ignore[call-overload]
    except (TypeError, ValueError):
        return defaut
    return v if v in permis else defaut


def _oui(valeur: object, defaut: bool = True) -> bool:
    return defaut if valeur is None else bool(valeur)


class Salons(jeux.Salons):
    MIN_JOUEURS = MIN_JOUEURS
    MAX_JOUEURS = MAX_JOUEURS
    NOM_DEFAUT = 'Plateau de %s'
    Erreur = ErreurSalon
    COUPS = {
        'repondre': ('index', 'texte', 'pays', 'lat', 'lon'),
        'avancer': ('index',),
        'passer': (),
        'noter': ('index', 'cible', 'point'),
        'revoir': ('index',),
        'terminer': (),
    }
    # Coups réservés à l'hôte de la table.
    HOTE = {'passer', 'noter', 'revoir', 'terminer'}

    def __init__(self, rng: random.Random | None = None,
                 horloge: Callable[[], float] | None = None,
                 banque: Banque = BANQUE) -> None:
        if horloge is None:
            super().__init__(rng)
        else:
            super().__init__(rng, horloge)
        self.banque = banque
        # Chemin de la base, pour l'historique des joueurs (routes).
        self.base: str | None = None

    def _nouveau(self, code: str, nom: str, joueur: str, public: bool,
                 **reglages: Any) -> Salon:
        salon = Salon(code=code, nom=nom, hote=joueur, public=public,
                      joueurs=[joueur], touche=self._horloge())
        self._appliquer(salon, reglages)
        return salon

    @staticmethod
    def _appliquer(salon: Salon, reglages: dict[str, Any]) -> None:
        salon.nombre = _choix(reglages.get('nombre'), NOMBRES,
                              NOMBRE_DEFAUT)
        salon.duree = _choix(reglages.get('duree'), DUREES, DUREE_DEFAUT)
        salon.carte = _oui(reglages.get('carte'))
        salon.ouvertes = _oui(reglages.get('ouvertes'))

    def _partie(self, salon: Salon) -> Partie:  # type: ignore[override]
        vues = (historique.vues(self.base, salon.joueurs)
                if self.base else {})
        questions = self.banque.tirer(salon.nombre, self._rng, vues,
                                      carte=salon.carte,
                                      ouvertes=salon.ouvertes)
        if self.base:
            historique.noter(self.base, salon.joueurs,
                             [q.id for q in questions])
        return Partie(salon.joueurs, questions, salon.duree, self._horloge)

    def _jouer(self, salon: Salon, joueur: str,  # type: ignore[override]
               action: str, params: dict[str, Any]) -> None:
        if action in self.HOTE and joueur != salon.hote:
            raise self.Erreur("Seul l'hôte mène la revue.")
        super()._jouer(salon, joueur, action, params)

    def creer(self, joueur: str, nom: object = '',
              public: bool = True, **reglages: Any) -> str:
        return self._creer(joueur, nom, public, **reglages)

    def regler(self, code: object, joueur: str,
               reglages: dict[str, Any]) -> None:
        """L'hôte change les réglages, entre deux parties."""
        with self._verrou:
            salon = self._hote(code, joueur, 'règle la partie')
            assert isinstance(salon, Salon)
            self._hors_manche(salon)
            self._appliquer(salon, {**salon.reglages(), **reglages})
            self._toucher(salon)

    def _vue_table(  # type: ignore[override]
            self, salon: Salon) -> dict[str, Any]:
        return {**super()._vue_table(salon),
                'banque': len(self.banque.questions)}

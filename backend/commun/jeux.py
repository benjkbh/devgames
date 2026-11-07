"""Tables d'un jeu « simple », sur le registre commun (`salons.py`) : pas de
réglage de table, des victoires comptées par joueur, et des coups transmis
tels quels à la manche.

Un jeu dérive `Salons` en fixant `MIN_JOUEURS`, `MAX_JOUEURS`, `NOM_DEFAUT`,
son `Erreur`, sa manche (`Partie`, construite avec les joueurs assis et le
hasard du registre) et `COUPS` : pour chaque coup, les paramètres lus dans le
corps de la requête, passés dans l'ordre à la méthode du même nom de la
manche (`partie.<coup>(joueur, *paramètres)`).
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any, ClassVar

from dataclasses import dataclass, field

from . import salons as commun

if TYPE_CHECKING:
    from collections.abc import Callable

    from .routes_salons import Creation


@dataclass
class Salon(commun.Salon):
    # Manches gagnées par chaque joueur assis.
    victoires: dict[str, int] = field(default_factory=dict)


class Salons(commun.Salons[Salon]):
    # La manche du jeu : `Partie(joueurs, rng)`.
    Partie: ClassVar[Callable[..., Any]]
    # Coup -> paramètres lus dans le corps, dans l'ordre de la méthode.
    COUPS: ClassVar[dict[str, tuple[str, ...]]] = {}

    def _nouveau(self, code: str, nom: str, joueur: str, public: bool,
                 **reglages: Any) -> Salon:
        return Salon(code=code, nom=nom, hote=joueur, public=public,
                     joueurs=[joueur], touche=self._horloge())

    def _oublier(self, salon: Salon, joueur: str) -> None:
        salon.victoires.pop(joueur, None)

    def _partie(self, salon: Salon) -> Any:
        return type(self).Partie(salon.joueurs, self._rng)

    def _compter_gagnant(self, salon: Salon, partie: Any) -> None:
        salon.victoires[partie.gagnant] = (
            salon.victoires.get(partie.gagnant, 0) + 1)

    def _jouer(self, salon: Salon, joueur: str, action: str,
               params: dict[str, Any]) -> None:
        if action not in self.COUPS:
            raise self.Erreur('Action inconnue.')
        getattr(salon.partie, action)(
            joueur, *[params.get(p) for p in self.COUPS[action]])

    def _vue_table(self, salon: Salon) -> dict[str, Any]:
        return {'victoires': {j: salon.victoires.get(j, 0)
                              for j in salon.joueurs}}

    def creer(self, joueur: str, nom: object = '',
              public: bool = True) -> str:
        return self._creer(joueur, nom, public)


def creation() -> Creation:
    """La création d'une table d'un jeu simple : un nom et sa visibilité."""
    return lambda s, corps, j: s.creer(j, corps.get('nom'),
                                       corps.get('public', True))


def parametres(salons: type[Salons]) -> tuple[str, ...]:
    """Tous les paramètres lus par les coups du jeu, sans doublon."""
    return tuple(dict.fromkeys(p for ps in salons.COUPS.values() for p in ps))

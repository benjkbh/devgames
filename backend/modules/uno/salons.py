"""Tables de UNO, sur le registre commun (`backend/commun/salons.py`) :
scores, règles facultatives, et la vue d'un spectateur.

N'importe qui, connecté ou non, peut regarder une table dont il a le code,
sans voir aucune main.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from dataclasses import dataclass, field

from ...commun import salons as commun
from ...commun.salons import (ABSENCE_TABLE, INACTIVITE,  # noqa: F401
                              LONGUEUR_CODE, PRESENCE_TABLE, SalonIntrouvable)
from .regles import CoupInvalide, Partie, nettoyer_regles

if TYPE_CHECKING:
    from typing import Any

MIN_JOUEURS = 2
MAX_JOUEURS = 10


class ErreurSalon(commun.ErreurSalon, CoupInvalide):
    """Demande refusée : le message est montré au joueur."""


@dataclass
class Salon(commun.Salon):
    scores: dict[str, int] = field(default_factory=dict)
    # Règles facultatives, choisies par l'hôte entre deux manches.
    regles: dict[str, bool] = field(default_factory=lambda: nettoyer_regles(
        None))

    def reglages(self) -> dict[str, Any]:
        return {'regles': dict(self.regles)}


class Salons(commun.Salons[Salon]):
    MIN_JOUEURS = MIN_JOUEURS
    MAX_JOUEURS = MAX_JOUEURS
    NOM_DEFAUT = 'Table de %s'
    Erreur = ErreurSalon

    def _nouveau(self, code: str, nom: str, joueur: str, public: bool,
                 **reglages: Any) -> Salon:
        return Salon(code=code, nom=nom, hote=joueur, public=public,
                     joueurs=[joueur], touche=self._horloge(),
                     regles=nettoyer_regles(reglages.get('regles')))

    def _oublier(self, salon: Salon, joueur: str) -> None:
        salon.scores.pop(joueur, None)

    def _partie(self, salon: Salon) -> Partie:
        return Partie(salon.joueurs, self._rng, salon.regles)

    def _compter_gagnant(self, salon: Salon, partie: Any) -> None:
        """Ajoute les points de la manche au gagnant."""
        salon.scores[partie.gagnant] = (salon.scores.get(partie.gagnant, 0)
                                        + partie.points)

    def _jouer(self, salon: Salon, joueur: str, action: str,
               params: dict[str, Any]) -> None:
        """jouer, piocher, passer, uno, contrer."""
        p = salon.partie
        if action == 'jouer':
            try:
                carte = int(params.get('carte'))  # type: ignore[arg-type]
            except (TypeError, ValueError):
                raise ErreurSalon('Carte illisible.') from None
            p.jouer(joueur, carte, params.get('couleur'),
                    bool(params.get('uno')), params.get('cible'))
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

    def _vue_table(self, salon: Salon) -> dict[str, Any]:
        return {'scores': {j: salon.scores.get(j, 0) for j in salon.joueurs}}

    # -- propre au UNO -------------------------------------------------------
    def creer(self, joueur: str, nom: object = '', public: bool = True,
              regles: object = None) -> str:
        return self._creer(joueur, nom, public, regles=regles)

    def regler(self, code: object, joueur: str, regles: object) -> None:
        """L'hôte change les règles de la table, entre deux manches."""
        with self._verrou:
            salon = self._hote(code, joueur, 'change les règles')
            self._hors_manche(salon, 'Les règles ne changent pas en cours de '
                                     'manche.')
            # Les règles absentes de la demande gardent leur valeur.
            salon.regles = nettoyer_regles({**salon.regles,
                                            **(regles if isinstance(
                                                regles, dict) else {})})
            self._toucher(salon)

    def regarder(self, code: object) -> dict[str, Any]:
        """La table vue d'un spectateur (sans compte) : le jeu, sans aucune
        main. Regarder ne vaut pas présence : seuls les joueurs gardent la
        table en vie."""
        with self._verrou:
            salon = self._salon(code)
            return {
                **self._commun(salon),
                'partie': (salon.partie.vue_spectateur()
                           if salon.partie is not None else None),
            }

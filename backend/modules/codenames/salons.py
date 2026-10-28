"""Tables de Code Names, sur le registre commun
(`backend/commun/salons.py`) : camps, oracles, liste de mots et victoires.

Entre deux manches, chaque joueur choisit son camp (Vampires ou Chasseurs) et
peut se proposer oracle ; l'hôte peut répartir tout le monde au hasard,
choisir la liste de mots et lancer la manche.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from dataclasses import dataclass, field

from ...commun import salons as commun
from ...commun.salons import (ABSENCE_TABLE, INACTIVITE,  # noqa: F401
                              PRESENCE_TABLE, SalonIntrouvable)
from .mots import LISTE_DEFAUT, LISTES
from .regles import EQUIPES, CoupInvalide, Partie

if TYPE_CHECKING:
    from typing import Any

MIN_JOUEURS = 4
MAX_JOUEURS = 16


class ErreurSalon(commun.ErreurSalon, CoupInvalide):
    """Demande refusée : le message est montré au joueur."""


@dataclass
class Salon(commun.Salon):
    # Camp choisi par chaque joueur (None : pas encore choisi).
    camps: dict[str, str | None] = field(default_factory=dict)
    # Oracle de chaque camp, s'il y en a un.
    oracles: dict[str, str | None] = field(
        default_factory=lambda: {e: None for e in EQUIPES})
    liste: str = LISTE_DEFAUT
    victoires: dict[str, int] = field(
        default_factory=lambda: {e: 0 for e in EQUIPES})

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

    def reglages(self) -> dict[str, Any]:
        return {'liste': self.liste}


def _liste(liste: object) -> str:
    return liste if isinstance(liste, str) and liste in LISTES \
        else LISTE_DEFAUT


class Salons(commun.Salons[Salon]):
    MIN_JOUEURS = MIN_JOUEURS
    MAX_JOUEURS = MAX_JOUEURS
    NOM_DEFAUT = 'Manoir de %s'
    Erreur = ErreurSalon

    def _nouveau(self, code: str, nom: str, joueur: str, public: bool,
                 **reglages: Any) -> Salon:
        return Salon(code=code, nom=nom, hote=joueur, public=public,
                     joueurs=[joueur], touche=self._horloge(),
                     liste=_liste(reglages.get('liste')))

    def _assis(self, salon: Salon, joueur: str) -> None:
        """Assied `joueur` dans le camp le moins nombreux."""
        salon.camps[joueur] = min(
            EQUIPES, key=lambda e: (len(salon.membres(e)), EQUIPES.index(e)))

    def _oublier(self, salon: Salon, joueur: str) -> None:
        salon.camps.pop(joueur, None)
        for e in EQUIPES:
            if salon.oracles[e] == joueur:
                salon.oracles[e] = None

    def _retirer(self, salon: Salon, joueur: str) -> None:
        super()._retirer(salon, joueur)
        # L'oracle de remplacement le reste pour la suite.
        if salon.partie is not None:
            for e, oracle in salon.partie.oracles.items():
                if salon.oracles[e] is None and oracle in salon.joueurs:
                    salon.oracles[e] = oracle

    def _manque(self, salon: Salon) -> str | None:
        return salon.manque()

    def _partie(self, salon: Salon) -> Partie:
        return Partie(
            {e: salon.membres(e) for e in EQUIPES},
            {e: str(salon.oracles[e]) for e in EQUIPES},
            self._rng, salon.liste)

    def _compter_gagnant(self, salon: Salon, partie: Any) -> None:
        salon.victoires[partie.gagnant] += 1

    def _jouer(self, salon: Salon, joueur: str, action: str,
               params: dict[str, Any]) -> None:
        """indice, marquer, reveler, finir."""
        p = salon.partie
        if action == 'indice':
            p.donner_indice(joueur, params.get('mot'), params.get('nombre'))
        elif action == 'marquer':
            p.marquer(joueur, params.get('carte'))
        elif action == 'reveler':
            p.reveler(joueur, params.get('carte'))
        elif action == 'finir':
            p.finir(joueur)
        else:
            raise ErreurSalon('Action inconnue.')

    def _vue_table(self, salon: Salon) -> dict[str, Any]:
        return {
            'victoires': dict(salon.victoires),
            'camps': {j: salon.camps.get(j) for j in salon.joueurs},
            'oracles': dict(salon.oracles),
            'manque': salon.manque(),
        }

    # -- propre à Code Names -------------------------------------------------
    def creer(self, joueur: str, nom: object = '', public: bool = True,
              liste: object = None) -> str:
        return self._creer(joueur, nom, public, liste=liste)

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

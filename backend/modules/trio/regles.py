"""Règles de Trio, sans état serveur : une `Partie` (une manche).

Règles retenues :
  - 36 cartes, de 1 à 12, chacune en trois exemplaires. Chaque joueur reçoit
    une main, rangée de la plus petite à la plus grande carte ; le reste est
    posé face cachée au centre (3 joueurs : 9 cartes chacun et 9 au centre ;
    4 : 7 et 8 ; 5 : 6 et 6 ; 6 : 5 et 6) ;
  - à son tour, on cherche un trio en révélant des cartes une à une : la plus
    petite ou la plus grande carte encore cachée de la main d'un joueur
    (la sienne comprise), ou une carte du centre ;
  - tant que les cartes révélées sont identiques, on continue. Deux cartes
    différentes : le tour s'arrête et tout redevient caché. Trois cartes
    identiques : on gagne ce trio, et le tour passe ;
  - on gagne la manche avec trois trios, ou tout de suite avec le trio de 7.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import random
from dataclasses import dataclass

if TYPE_CHECKING:
    from typing import Any

# Joueurs -> (cartes par main, cartes au centre).
DONNE = {3: (9, 9), 4: (7, 8), 5: (6, 6), 6: (5, 6)}
TRIOS_GAGNANTS = 3
SEPT = 7
JOURNAL_MAX = 30


class CoupInvalide(Exception):
    """Coup refusé : le message est montré au joueur."""


@dataclass(frozen=True)
class Carte:
    id: int
    valeur: int


class Partie:
    def __init__(self, joueurs: list[str], rng: random.Random) -> None:
        if len(joueurs) not in DONNE:
            raise CoupInvalide('Trio se joue de 3 à 6 joueurs.')
        self.ordre = list(joueurs)
        cartes = [Carte(i, 1 + i // 3) for i in range(36)]
        rng.shuffle(cartes)
        par_main, _ = DONNE[len(self.ordre)]
        self.mains: dict[str, list[Carte]] = {}
        for k, j in enumerate(self.ordre):
            self.mains[j] = sorted(cartes[k * par_main:(k + 1) * par_main],
                                   key=lambda c: (c.valeur, c.id))
        # Le centre : des emplacements fixes, vides une fois la carte prise.
        self.centre: list[Carte | None] = list(
            cartes[len(self.ordre) * par_main:])
        self.trios: dict[str, list[int]] = {j: [] for j in self.ordre}
        self.tour = rng.randrange(len(self.ordre))
        # Cartes révélées pendant le tour : [{source, joueur, cote, place,
        # carte}].
        self.revelees: list[dict[str, Any]] = []
        # Le dernier essai manqué, pour que chacun s'en souvienne.
        self.essai: list[dict[str, Any]] | None = None
        self.gagnant: str | None = None
        self.journal: list[str] = []
        self._noter('%s commence.' % self.courant)

    @property
    def finie(self) -> bool:
        return self.gagnant is not None

    @property
    def courant(self) -> str:
        return self.ordre[self.tour]

    def _noter(self, ligne: str) -> None:
        self.journal.append(ligne)
        del self.journal[:-JOURNAL_MAX]

    def _cachees(self, joueur: str) -> list[int]:
        """Rangs des cartes de `joueur` encore cachées ce tour-ci."""
        prises = {r['carte'].id for r in self.revelees
                  if r['source'] == 'main' and r['joueur'] == joueur}
        return [i for i, c in enumerate(self.mains[joueur])
                if c.id not in prises]

    # -- coups ---------------------------------------------------------------
    def _exige_tour(self, joueur: str) -> None:
        if self.finie:
            raise CoupInvalide('La manche est terminée.')
        if joueur not in self.mains:
            raise CoupInvalide('Vous ne jouez pas cette manche.')
        if joueur != self.courant:
            raise CoupInvalide("Ce n'est pas votre tour.")

    def demander(self, joueur: str, cible: object, cote: object) -> None:
        """Révèle la plus petite (`cote` = min) ou la plus grande (max)
        carte encore cachée de `cible`."""
        self._exige_tour(joueur)
        cible = str(cible or '')
        if cible not in self.mains:
            raise CoupInvalide('Ce joueur n’est pas à la table.')
        if cote not in ('min', 'max'):
            raise CoupInvalide('La plus petite ou la plus grande carte ?')
        cachees = self._cachees(cible)
        if not cachees:
            raise CoupInvalide('%s n’a plus de carte cachée.' % cible)
        place = cachees[0] if cote == 'min' else cachees[-1]
        carte = self.mains[cible][place]
        self._reveler({'source': 'main', 'joueur': cible, 'cote': cote,
                       'place': place, 'carte': carte}, joueur)

    def retourner(self, joueur: str, place: object) -> None:
        """Retourne la carte du centre à l'emplacement `place`."""
        self._exige_tour(joueur)
        try:
            i = int(place)  # type: ignore[call-overload]
        except (TypeError, ValueError):
            raise CoupInvalide('Emplacement illisible.') from None
        if not 0 <= i < len(self.centre) or self.centre[i] is None:
            raise CoupInvalide('Il n’y a pas de carte à cet emplacement.')
        if any(r['source'] == 'centre' and r['place'] == i
               for r in self.revelees):
            raise CoupInvalide('Cette carte est déjà retournée.')
        carte = self.centre[i]
        assert carte is not None
        self._reveler({'source': 'centre', 'joueur': None, 'cote': None,
                       'place': i, 'carte': carte}, joueur)

    def _reveler(self, revelee: dict[str, Any], joueur: str) -> None:
        self.revelees.append(revelee)
        self.essai = None
        valeurs = [r['carte'].valeur for r in self.revelees]
        ou = ('au centre' if revelee['source'] == 'centre'
              else 'chez %s' % revelee['joueur'])
        self._noter('%s révèle un %d %s.' % (joueur, valeurs[-1], ou))
        if len(set(valeurs)) > 1:
            self.essai = [self._vue_revelee(r) for r in self.revelees]
            self.revelees = []
            self._noter('Raté : tout redevient caché.')
            self._suivant()
            return
        if len(valeurs) == 3:
            self._prendre_trio(joueur, valeurs[0])

    def _prendre_trio(self, joueur: str, valeur: int) -> None:
        for r in self.revelees:
            if r['source'] == 'main':
                self.mains[r['joueur']].remove(r['carte'])
            else:
                self.centre[r['place']] = None
        self.revelees = []
        self.trios[joueur].append(valeur)
        self._noter('%s gagne le trio de %d !' % (joueur, valeur))
        if valeur == SEPT or len(self.trios[joueur]) >= TRIOS_GAGNANTS:
            self.gagnant = joueur
            self._noter('%s gagne la manche.' % joueur)
            return
        self._suivant()

    def _suivant(self) -> None:
        self.tour = (self.tour + 1) % len(self.ordre)

    def retirer(self, joueur: str) -> None:
        """Le joueur quitte la manche : ses cartes vont au centre."""
        if joueur not in self.mains:
            return
        i = self.ordre.index(joueur)
        self.revelees = [r for r in self.revelees
                         if r['source'] != 'main' or r['joueur'] != joueur]
        self.centre += self.mains.pop(joueur)
        self.trios.pop(joueur, None)
        self.ordre.remove(joueur)
        self._noter('%s quitte la table.' % joueur)
        if self.finie:
            return
        if len(self.ordre) == 1:
            self.gagnant = self.ordre[0]
            self._noter('%s gagne par forfait.' % self.gagnant)
            return
        if i == self.tour:
            # Son tour s'arrête : ce qu'il avait révélé redevient caché.
            self.revelees = []
        elif i < self.tour:
            self.tour -= 1
        self.tour %= len(self.ordre)

    # -- vue -----------------------------------------------------------------
    @staticmethod
    def _vue_revelee(r: dict[str, Any]) -> dict[str, Any]:
        return {'source': r['source'], 'joueur': r['joueur'],
                'place': r['place'], 'valeur': r['carte'].valeur}

    def _vue_commune(self) -> dict[str, Any]:
        revelees = [self._vue_revelee(r) for r in self.revelees]
        visibles = {(r['source'], r['joueur'], r['place']): r['valeur']
                    for r in revelees}
        return {
            'joueurs': [{
                'nom': j,
                'cartes': len(self.mains[j]),
                # Ce que le tour a révélé de sa main : place -> valeur.
                'revelees': {str(p): v for (s, qui, p), v in visibles.items()
                             if s == 'main' and qui == j},
                'trios': list(self.trios[j]),
            } for j in self.ordre],
            # Le centre : None (emplacement vide), 0 (carte cachée) ou la
            # valeur d'une carte retournée ce tour-ci.
            'centre': [None if c is None else
                       visibles.get(('centre', None, i), 0)
                       for i, c in enumerate(self.centre)],
            'tour': None if self.finie else self.courant,
            'revelees': revelees,
            'essai': self.essai,
            'objectif': TRIOS_GAGNANTS,
            'gagnant': self.gagnant,
            'journal': list(self.journal[-14:]),
        }

    def vue(self, joueur: str) -> dict[str, Any]:
        """Sa propre main est visible : chacun connaît ses cartes."""
        return {**self._vue_commune(),
                'main': [c.valeur for c in self.mains.get(joueur, [])]}

    def vue_spectateur(self) -> dict[str, Any]:
        return self._vue_commune()

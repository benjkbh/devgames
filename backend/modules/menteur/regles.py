"""Règles du Menteur, sans état serveur : une `Partie` (une manche).

Règles retenues :
  - un jeu de 52 cartes, distribué en entier (certains ont une carte de
    plus) ;
  - à son tour, on pose face cachée de 1 à 4 cartes sur le tas, en annonçant
    qu'elles sont toutes du rang demandé. Le rang monte à chaque pose : As,
    2, 3… Valet, Dame, Roi, puis de nouveau As ;
  - tant que le joueur suivant n'a pas posé, n'importe quel autre joueur peut
    crier « Menteur ! » : les cartes posées sont retournées. Si l'une n'est
    pas du rang annoncé, le menteur ramasse tout le tas ; sinon, c'est celui
    qui a crié qui le ramasse ;
  - qui pose ses dernières cartes ne gagne qu'une fois la pose acceptée : le
    joueur suivant laisse passer, ou celui qui crie « Menteur » se trompe.
    Pris à mentir, il ramasse le tas et la manche continue.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import random
from dataclasses import dataclass

if TYPE_CHECKING:
    from typing import Any

ENSEIGNES = ('pique', 'coeur', 'carreau', 'trefle')
RANGS = ('A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R')
NOMS_RANGS = {'A': 'As', 'V': 'Valet', 'D': 'Dame', 'R': 'Roi'}
POSE_MAX = 4
JOURNAL_MAX = 30


class CoupInvalide(Exception):
    """Coup refusé : le message est montré au joueur."""


def nom_rang(rang: str) -> str:
    return NOMS_RANGS.get(rang, rang)


def pluriel_rang(rang: str, n: int) -> str:
    """« un As », « une Dame », « trois 7 », « deux Rois »."""
    if n == 1:
        return '%s %s' % ('une' if rang == 'D' else 'un', nom_rang(rang))
    mots = {2: 'deux', 3: 'trois', 4: 'quatre'}
    return '%s %s%s' % (mots.get(n, str(n)), nom_rang(rang),
                        's' if rang in NOMS_RANGS else '')


@dataclass(frozen=True)
class Carte:
    id: int
    rang: str
    enseigne: str

    def vue(self) -> dict[str, Any]:
        return {'id': self.id, 'rang': self.rang, 'enseigne': self.enseigne}


def paquet() -> list[Carte]:
    return [Carte(i, r, e) for i, (e, r) in enumerate(
        (e, r) for e in ENSEIGNES for r in RANGS)]


def _ordre_main(c: Carte) -> tuple[int, int]:
    return RANGS.index(c.rang), ENSEIGNES.index(c.enseigne)


class Partie:
    def __init__(self, joueurs: list[str], rng: random.Random) -> None:
        if len(joueurs) < 2:
            raise CoupInvalide('Il faut au moins deux joueurs.')
        self.ordre = list(joueurs)
        cartes = paquet()
        rng.shuffle(cartes)
        self.mains: dict[str, list[Carte]] = {j: [] for j in self.ordre}
        for i, c in enumerate(cartes):
            self.mains[self.ordre[i % len(self.ordre)]].append(c)
        self.tour = rng.randrange(len(self.ordre))
        # Rang à annoncer à la prochaine pose.
        self.rang = 0
        self.tas: list[Carte] = []
        # La dernière pose, encore contestable : {joueur, ids, rang}.
        self.pose: dict[str, Any] | None = None
        # Le dernier « Menteur ! » : {appelant, poseur, rang, cartes, menteur,
        # ramasse}.
        self.revelation: dict[str, Any] | None = None
        self.gagnant: str | None = None
        self.journal: list[str] = []
        self._noter('%s commence : à lui de poser des As.' % self.courant)

    @property
    def finie(self) -> bool:
        return self.gagnant is not None

    @property
    def courant(self) -> str:
        return self.ordre[self.tour]

    @property
    def annonce(self) -> str:
        return RANGS[self.rang]

    def _noter(self, ligne: str) -> None:
        self.journal.append(ligne)
        del self.journal[:-JOURNAL_MAX]

    def _verifier(self, joueur: str) -> None:
        if self.finie:
            raise CoupInvalide('La manche est terminée.')
        if joueur not in self.mains:
            raise CoupInvalide('Vous ne jouez pas cette manche.')

    def _attend_verdict(self) -> bool:
        """Le dernier poseur a vidé sa main : sa pose doit être acceptée ou
        contestée avant toute autre."""
        return self.pose is not None and not self.mains[self.pose['joueur']]

    # -- coups ---------------------------------------------------------------
    def poser(self, joueur: str, cartes: object) -> None:
        self._verifier(joueur)
        if joueur != self.courant:
            raise CoupInvalide("Ce n'est pas votre tour.")
        if self._attend_verdict():
            raise CoupInvalide('%s a posé ses dernières cartes : laissez '
                               'passer, ou criez « Menteur ! ».'
                               % self.pose['joueur'])  # type: ignore[index]
        if not isinstance(cartes, list) or not 1 <= len(cartes) <= POSE_MAX:
            raise CoupInvalide('Posez de 1 à %d cartes.' % POSE_MAX)
        main = self.mains[joueur]
        choisies = []
        for ident in cartes:
            carte = next((c for c in main if c.id == ident), None)
            if carte is None or carte in choisies:
                raise CoupInvalide('Ces cartes ne sont pas dans votre main.')
            choisies.append(carte)
        for c in choisies:
            main.remove(c)
        self.tas += choisies
        self.pose = {'joueur': joueur, 'ids': [c.id for c in choisies],
                     'rang': self.annonce}
        self.revelation = None
        annonce = pluriel_rang(self.annonce, len(choisies))
        self._noter('%s pose %s.' % (joueur, annonce))
        self.rang = (self.rang + 1) % len(RANGS)
        self.tour = (self.tour + 1) % len(self.ordre)

    def menteur(self, joueur: str) -> None:
        """« Menteur ! » sur la dernière pose."""
        self._verifier(joueur)
        p = self.pose
        if p is None:
            raise CoupInvalide('Il n’y a rien à contester.')
        if p['joueur'] == joueur:
            raise CoupInvalide('On ne se dénonce pas soi-même.')
        poseur = p['joueur']
        cartes = [c for c in self.tas if c.id in p['ids']]
        menti = any(c.rang != p['rang'] for c in cartes)
        ramasse = poseur if menti else joueur
        self.mains[ramasse] += self.tas
        self.tas = []
        self.pose = None
        self.revelation = {
            'appelant': joueur, 'poseur': poseur, 'rang': p['rang'],
            'cartes': [c.vue() for c in cartes], 'menteur': menti,
            'ramasse': ramasse,
        }
        if menti:
            self._noter('%s crie « Menteur ! » : %s mentait et ramasse le '
                        'tas.' % (joueur, poseur))
        else:
            self._noter('%s crie « Menteur ! » à tort : %s disait vrai, %s '
                        'ramasse le tas.' % (joueur, poseur, joueur))
            if not self.mains[poseur]:
                self._gagner(poseur)

    def accepter(self, joueur: str) -> None:
        """Le joueur suivant laisse passer les dernières cartes d'un autre."""
        self._verifier(joueur)
        if not self._attend_verdict():
            raise CoupInvalide('Il n’y a rien à accepter.')
        if joueur != self.courant:
            raise CoupInvalide('C’est au joueur suivant de laisser passer.')
        self._gagner(self.pose['joueur'])  # type: ignore[index]

    def _gagner(self, joueur: str) -> None:
        self.gagnant = joueur
        self.pose = None
        self._noter('%s n’a plus de cartes : il gagne la manche !' % joueur)

    def retirer(self, joueur: str) -> None:
        """Le joueur quitte la manche : ses cartes vont sous le tas."""
        if joueur not in self.mains:
            return
        i = self.ordre.index(joueur)
        self.tas[:0] = self.mains.pop(joueur)
        self.ordre.remove(joueur)
        if self.pose is not None and self.pose['joueur'] == joueur:
            self.pose = None
        self._noter('%s quitte la table.' % joueur)
        if self.finie:
            return
        if len(self.ordre) == 1:
            self._gagner(self.ordre[0])
            return
        # Le joueur au trait parti, la main passe à celui qui le suivait.
        if i < self.tour:
            self.tour -= 1
        self.tour %= len(self.ordre)

    # -- vue -----------------------------------------------------------------
    def _vue_commune(self) -> dict[str, Any]:
        p = self.pose
        return {
            'joueurs': [{'nom': j, 'cartes': len(self.mains[j])}
                        for j in self.ordre],
            'tour': None if self.finie else self.courant,
            'annonce': self.annonce,
            'tas': len(self.tas),
            'pose': ({'joueur': p['joueur'], 'nombre': len(p['ids']),
                      'rang': p['rang']} if p else None),
            'verdict': self._attend_verdict(),
            'revelation': self.revelation,
            'gagnant': self.gagnant,
            'journal': list(self.journal[-14:]),
        }

    def vue(self, joueur: str) -> dict[str, Any]:
        main = sorted(self.mains.get(joueur, []), key=_ordre_main)
        return {**self._vue_commune(), 'main': [c.vue() for c in main]}

    def vue_spectateur(self) -> dict[str, Any]:
        return self._vue_commune()

"""Règles de Givre, sans état serveur : une `Partie` (une partie complète,
jouée en plusieurs manches, jusqu'à `OBJECTIF` points). Jeu de « golf » :
on cherche à finir avec le moins de points possible.

Règles retenues :
  - 150 cartes-glaçons : cinq -2, dix -1, quinze 0, et dix de chaque nombre
    de 1 à 12 ;
  - chaque joueur reçoit 12 cartes, face cachée, en grille de 3 lignes sur
    4 colonnes. Une carte ouvre la défausse. Pour commencer, chacun retourne
    deux cartes de sa grille ; le plus gros total ouvre la première manche ;
  - à son tour, on prend la carte de la défausse, ou on pioche. La carte
    prise de la défausse remplace une carte de la grille (cachée ou non),
    qui part, face visible, sur la défausse. La carte piochée, on peut la
    garder de même, ou la jeter sur la défausse et retourner une carte
    cachée de sa grille ;
  - une colonne de trois cartes visibles identiques fond : ses cartes vont
    sur la défausse, elles ne comptent plus ;
  - quand un joueur n'a plus de carte cachée, chacun des autres joue un
    dernier tour. Puis toutes les cartes sont retournées et comptées. Celui
    qui a fini la manche voit ses points doublés s'il n'a pas, seul, le plus
    petit total (et que ce total est positif) ;
  - la partie s'arrête à la fin de la manche où quelqu'un atteint 100
    points : le plus petit total gagne (à égalité, une manche de plus).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import random
from dataclasses import dataclass

if TYPE_CHECKING:
    from typing import Any

OBJECTIF = 100
LIGNES = 3
COLONNES = 4
CASES = LIGNES * COLONNES
DEPART = 2
JOURNAL_MAX = 30


class CoupInvalide(Exception):
    """Coup refusé : le message est montré au joueur."""


@dataclass(frozen=True)
class Carte:
    id: int
    valeur: int


def paquet() -> list[Carte]:
    """Les 150 cartes, dans l'ordre."""
    valeurs = [-2] * 5 + [-1] * 10 + [0] * 15
    for n in range(1, 13):
        valeurs += [n] * 10
    return [Carte(i, v) for i, v in enumerate(valeurs)]


@dataclass
class Case:
    carte: Carte | None       # None : la colonne a fondu
    visible: bool = False


class Partie:
    def __init__(self, joueurs: list[str], rng: random.Random) -> None:
        if not 2 <= len(joueurs) <= 8:
            raise CoupInvalide('Givre se joue de 2 à 8 joueurs.')
        self.rng = rng
        self.ordre = list(joueurs)
        self.scores = {j: 0 for j in self.ordre}
        self.manche = 0
        self.gagnant: str | None = None
        self.journal: list[str] = []
        # Celui qui a fini la manche précédente ouvre la suivante.
        self.ouvreur: str | None = None
        self._ouvrir_manche()

    # -- manche --------------------------------------------------------------
    def _ouvrir_manche(self) -> None:
        self.manche += 1
        cartes = paquet()
        self.rng.shuffle(cartes)
        self.grilles: dict[str, list[Case]] = {}
        for j in self.ordre:
            self.grilles[j] = [Case(cartes.pop()) for _ in range(CASES)]
        self.pioche = cartes
        self.defausse: list[Carte] = [self.pioche.pop()]
        # depart : chacun retourne deux cartes ; jeu ; bilan.
        self.phase = 'depart'
        self.tour = 0
        # Carte piochée, en attente d'être gardée ou jetée.
        self.main: Carte | None = None
        # La carte piochée a été jetée : il faut retourner une carte.
        self.doit_retourner = False
        # Joueur qui a tout retourné le premier ; joueurs qui ont encore un
        # tour à jouer après lui.
        self.finisseur: str | None = None
        self.derniers: list[str] = []
        self.bilan: dict[str, dict[str, Any]] | None = None
        self.dernier_coup: dict[str, Any] | None = None
        self._noter('Manche %d : retournez deux cartes.' % self.manche)

    @property
    def finie(self) -> bool:
        return self.gagnant is not None

    @property
    def courant(self) -> str | None:
        if self.phase != 'jeu' or self.finie:
            return None
        return self.ordre[self.tour]

    def _noter(self, ligne: str) -> None:
        self.journal.append(ligne)
        del self.journal[:-JOURNAL_MAX]

    def _visibles(self, joueur: str) -> int:
        return sum(1 for c in self.grilles[joueur]
                   if c.carte is not None and c.visible)

    def _cachees(self, joueur: str) -> int:
        return sum(1 for c in self.grilles[joueur]
                   if c.carte is not None and not c.visible)

    def total_visible(self, joueur: str) -> int:
        return sum(c.carte.valeur for c in self.grilles[joueur]
                   if c.carte is not None and c.visible)

    def _piocher(self) -> Carte:
        if not self.pioche:
            # La défausse, sauf sa carte du dessus, redevient la pioche.
            dessus = self.defausse.pop()
            self.pioche = self.defausse
            self.rng.shuffle(self.pioche)
            self.defausse = [dessus]
            self._noter('La défausse est mélangée : nouvelle pioche.')
        return self.pioche.pop()

    # -- coups ---------------------------------------------------------------
    @staticmethod
    def _place(place: object) -> int:
        try:
            i = int(place)  # type: ignore[call-overload]
        except (TypeError, ValueError):
            raise CoupInvalide('Case illisible.') from None
        if not 0 <= i < CASES:
            raise CoupInvalide('Cette case n’existe pas.')
        return i

    def _membre(self, joueur: str) -> None:
        if self.finie:
            raise CoupInvalide('La partie est terminée.')
        if joueur not in self.grilles:
            raise CoupInvalide('Vous ne jouez pas cette partie.')

    def _exige_tour(self, joueur: str) -> None:
        self._membre(joueur)
        if self.phase != 'jeu':
            raise CoupInvalide('Ce n’est pas le moment.')
        if joueur != self.courant:
            raise CoupInvalide("Ce n'est pas votre tour.")

    def retourner(self, joueur: str, place: object) -> None:
        """Retourne une carte cachée : au départ (deux par joueur), ou après
        avoir jeté la carte piochée."""
        self._membre(joueur)
        i = self._place(place)
        case = self.grilles[joueur][i]
        if case.carte is None or case.visible:
            raise CoupInvalide('Cette carte est déjà retournée.')
        if self.phase == 'depart':
            if self._visibles(joueur) >= DEPART:
                raise CoupInvalide('Vous avez déjà retourné vos deux cartes.')
            case.visible = True
            if all(self._visibles(j) >= DEPART for j in self.ordre):
                self._commencer()
            return
        self._exige_tour(joueur)
        if not self.doit_retourner:
            raise CoupInvalide('Piochez ou prenez la défausse d’abord.')
        case.visible = True
        self.doit_retourner = False
        self.dernier_coup = {'joueur': joueur, 'type': 'retourne',
                             'place': i, 'valeur': case.carte.valeur}
        self._noter('%s retourne un %d.' % (joueur, case.carte.valeur))
        self._fin_de_tour(joueur, i)

    def _commencer(self) -> None:
        self.phase = 'jeu'
        if self.ouvreur in self.ordre:
            self.tour = self.ordre.index(self.ouvreur)
        else:
            totaux = [self.total_visible(j) for j in self.ordre]
            self.tour = totaux.index(max(totaux))
        self._noter('%s ouvre la manche.' % self.courant)

    def piocher(self, joueur: str) -> None:
        self._exige_tour(joueur)
        if self.main is not None or self.doit_retourner:
            raise CoupInvalide('Vous avez déjà pris une carte.')
        self.main = self._piocher()
        self.dernier_coup = None
        self._noter('%s pioche un %d.' % (joueur, self.main.valeur))

    def prendre(self, joueur: str, place: object) -> None:
        """Prend la carte de la défausse et la pose à `place`."""
        self._exige_tour(joueur)
        if self.main is not None or self.doit_retourner:
            raise CoupInvalide('Vous avez déjà pris une carte.')
        i = self._place(place)
        if self.grilles[joueur][i].carte is None:
            raise CoupInvalide('Cette colonne a fondu.')
        carte = self.defausse.pop()
        self._poser(joueur, i, carte, 'defausse')

    def garder(self, joueur: str, place: object) -> None:
        """Pose la carte piochée à `place`."""
        self._exige_tour(joueur)
        if self.main is None:
            raise CoupInvalide('Piochez d’abord.')
        i = self._place(place)
        if self.grilles[joueur][i].carte is None:
            raise CoupInvalide('Cette colonne a fondu.')
        carte, self.main = self.main, None
        self._poser(joueur, i, carte, 'pioche')

    def jeter(self, joueur: str) -> None:
        """Jette la carte piochée : il faut ensuite retourner une carte."""
        self._exige_tour(joueur)
        if self.main is None:
            raise CoupInvalide('Piochez d’abord.')
        self.defausse.append(self.main)
        self._noter('%s jette le %d.' % (joueur, self.main.valeur))
        self.main = None
        self.doit_retourner = True

    def _poser(self, joueur: str, i: int, carte: Carte, source: str) -> None:
        case = self.grilles[joueur][i]
        ancienne = case.carte
        assert ancienne is not None
        self.defausse.append(ancienne)
        case.carte, case.visible = carte, True
        self.dernier_coup = {'joueur': joueur, 'type': 'pose', 'place': i,
                             'valeur': carte.valeur, 'source': source,
                             'remplace': ancienne.valeur}
        self._noter('%s pose un %d %s, à la place d’un %d.' % (
            joueur, carte.valeur,
            'de la défausse' if source == 'defausse' else 'pioché',
            ancienne.valeur))
        self._fin_de_tour(joueur, i)

    def _fin_de_tour(self, joueur: str, i: int) -> None:
        self._fondre(joueur, i // LIGNES)
        if self.finisseur is None and self._cachees(joueur) == 0:
            self.finisseur = joueur
            k = self.ordre.index(joueur)
            self.derniers = self.ordre[k + 1:] + self.ordre[:k]
            self._noter('%s a tout retourné : dernier tour pour les autres !'
                        % joueur)
        elif self.finisseur is not None and joueur in self.derniers:
            self.derniers.remove(joueur)
        if self.finisseur is not None and not self.derniers:
            self._fermer_manche()
            return
        self.tour = (self.tour + 1) % len(self.ordre)

    def _fondre(self, joueur: str, colonne: int) -> None:
        cases = self.grilles[joueur][colonne * LIGNES:(colonne + 1) * LIGNES]
        if not all(c.carte is not None and c.visible for c in cases):
            return
        valeurs = {c.carte.valeur for c in cases if c.carte is not None}
        if len(valeurs) != 1:
            return
        for c in cases:
            assert c.carte is not None
            self.defausse.append(c.carte)
            c.carte, c.visible = None, False
        self._noter('La colonne de %d de %s fond !' % (valeurs.pop(), joueur))

    def _fermer_manche(self) -> None:
        for j in self.ordre:
            for c in self.grilles[j]:
                if c.carte is not None:
                    c.visible = True
            for col in range(COLONNES):
                self._fondre(j, col)
        totaux = {j: self.total_visible(j) for j in self.ordre}
        self.bilan = {}
        f = self.finisseur
        for j in self.ordre:
            points = totaux[j]
            double = False
            if j == f and points > 0 and any(
                    totaux[k] <= points for k in self.ordre if k != j):
                points *= 2
                double = True
            self.scores[j] += points
            self.bilan[j] = {'points': points, 'double': double}
        self._noter('Fin de la manche %d : %s.' % (self.manche, ', '.join(
            '%s %+d' % (j, b['points']) for j, b in self.bilan.items())))
        self.phase = 'bilan'
        self.ouvreur = f
        self.main = None
        self.doit_retourner = False
        if max(self.scores.values()) >= OBJECTIF:
            meilleur = min(self.scores.values())
            premiers = [j for j in self.ordre if self.scores[j] == meilleur]
            if len(premiers) == 1:
                self.gagnant = premiers[0]
                self._noter('%s gagne la partie avec %d points.'
                            % (self.gagnant, meilleur))
            else:
                self._noter('Égalité en tête : une manche de plus.')

    def suivante(self, joueur: str) -> None:
        """Ouvre la manche suivante, après le bilan."""
        self._membre(joueur)
        if self.phase != 'bilan':
            raise CoupInvalide('La manche n’est pas finie.')
        self._ouvrir_manche()

    def retirer(self, joueur: str) -> None:
        """Le joueur quitte la partie : ses cartes disparaissent."""
        if joueur not in self.grilles:
            return
        i = self.ordre.index(joueur)
        courant = self.courant
        self.ordre.remove(joueur)
        del self.grilles[joueur]
        self.scores.pop(joueur, None)
        if self.bilan is not None:
            self.bilan.pop(joueur, None)
        if joueur in self.derniers:
            self.derniers.remove(joueur)
        self._noter('%s quitte la table.' % joueur)
        if self.finie:
            return
        if len(self.ordre) == 1:
            self.gagnant = self.ordre[0]
            self._noter('%s gagne par forfait.' % self.gagnant)
            return
        if courant == joueur:
            # Sa carte en main retourne sur la défausse ; le suivant joue.
            if self.main is not None:
                self.defausse.append(self.main)
            self.main = None
            self.doit_retourner = False
            self.tour = i % len(self.ordre)
        elif i < self.tour:
            self.tour -= 1
        self.tour %= len(self.ordre)
        if self.phase == 'depart' and all(
                self._visibles(j) >= DEPART for j in self.ordre):
            self._commencer()
        if self.finisseur == joueur:
            self.finisseur = None
            self.derniers = []
        elif (self.phase == 'jeu' and self.finisseur is not None
              and not self.derniers):
            self._fermer_manche()

    # -- vue -----------------------------------------------------------------
    def _vue_grille(self, joueur: str) -> list[int | str | None]:
        """Chaque case : la valeur visible, 'cachee', ou None (fondue)."""
        return [None if c.carte is None else
                (c.carte.valeur if c.visible else 'cachee')
                for c in self.grilles[joueur]]

    def vue(self, joueur: str | None = None) -> dict[str, Any]:
        """Tout se voit de tous : aucune carte n'est secrète pour un seul."""
        return {
            'joueurs': [{
                'nom': j,
                'grille': self._vue_grille(j),
                'visible': self.total_visible(j),
                'score': self.scores[j],
                'pret': self.phase != 'depart' or self._visibles(j) >= DEPART,
            } for j in self.ordre],
            'phase': self.phase,
            'manche': self.manche,
            'tour': self.courant,
            'pioche': len(self.pioche),
            'defausse': self.defausse[-1].valeur if self.defausse else None,
            # La carte piochée se voit de tous : elle sera posée ou jetée.
            'main': self.main.valeur if self.main is not None else None,
            'doit_retourner': self.doit_retourner,
            'finisseur': self.finisseur,
            'derniers': list(self.derniers),
            'dernier_coup': self.dernier_coup,
            'bilan': self.bilan,
            'objectif': OBJECTIF,
            'gagnant': self.gagnant,
            'journal': list(self.journal[-14:]),
            'lignes': LIGNES,
            'colonnes': COLONNES,
        }

    def vue_spectateur(self) -> dict[str, Any]:
        return self.vue()

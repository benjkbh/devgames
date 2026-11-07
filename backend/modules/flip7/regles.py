"""Règles de Flip 7, sans état serveur : une `Partie` (une partie complète,
jouée en plusieurs manches, jusqu'à `OBJECTIF` points).

Règles retenues :
  - 94 cartes : les nombres de 0 à 12, chacun en autant d'exemplaires que sa
    valeur (un seul 0 et un seul 1, douze 12) ; six modificateurs (+2, +4,
    +6, +8, +10 et ×2) ; trois Gel, trois Trois-à-la-suite et trois Seconde
    chance ;
  - à l'ouverture d'une manche, chaque joueur reçoit une carte, face visible.
    Puis, à son tour, un joueur encore en lice pioche une carte, ou s'arrête
    et garde ses points de la manche ;
  - piocher un nombre qu'on a déjà devant soi fait sauter : zéro point pour
    la manche. Une Seconde chance l'évite (elle part avec le doublon) ; on
    n'en garde qu'une, une seconde est donnée à un autre joueur en lice ;
  - sept nombres différents devant soi : « Flip 7 », la manche s'arrête
    aussitôt et ce joueur marque 15 points de plus ;
  - Gel : celui qui la tire choisit un joueur en lice (lui compris), qui
    s'arrête et garde ses points. Trois-à-la-suite : le joueur choisi pioche
    trois cartes d'affilée ; un Gel ou un Trois-à-la-suite tiré pendant ces
    trois cartes est joué ensuite, par lui ;
  - points d'une manche : la somme des nombres, doublée par le ×2, plus les
    modificateurs, plus 15 pour un Flip 7. La partie s'arrête à la fin de la
    manche où quelqu'un atteint 200 points : le plus haut score gagne (à
    égalité, une manche de plus).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import random
from dataclasses import dataclass

if TYPE_CHECKING:
    from typing import Any

OBJECTIF = 200
BONUS_FLIP7 = 15
SEPT = 7
JOURNAL_MAX = 30
EVENEMENTS_MAX = 40

# Cartes spéciales : type -> nom affiché.
NOMS = {'gel': 'Gel', 'trois': 'Trois-à-la-suite', 'chance': 'Seconde chance',
        'fois2': '×2'}


class CoupInvalide(Exception):
    """Coup refusé : le message est montré au joueur."""


@dataclass(frozen=True)
class Carte:
    id: int
    # nombre · bonus (modificateur +n) · fois2 · gel · trois · chance
    type: str
    valeur: int = 0

    @property
    def nom(self) -> str:
        if self.type == 'nombre':
            return str(self.valeur)
        if self.type == 'bonus':
            return '+%d' % self.valeur
        return NOMS[self.type]

    def vue(self) -> dict[str, Any]:
        return {'id': self.id, 'type': self.type, 'valeur': self.valeur,
                'nom': self.nom}


def paquet() -> list[Carte]:
    """Les 94 cartes, dans l'ordre."""
    cartes: list[tuple[str, int]] = [('nombre', 0)]
    for n in range(1, 13):
        cartes += [('nombre', n)] * n
    cartes += [('bonus', v) for v in (2, 4, 6, 8, 10)] + [('fois2', 0)]
    for t in ('gel', 'trois', 'chance'):
        cartes += [(t, 0)] * 3
    return [Carte(i, t, v) for i, (t, v) in enumerate(cartes)]


def points(ligne: list[Carte], flip7: bool = False) -> int:
    """Points d'une ligne de cartes qui n'a pas sauté."""
    nombres = sum(c.valeur for c in ligne if c.type == 'nombre')
    if any(c.type == 'fois2' for c in ligne):
        nombres *= 2
    return (nombres + sum(c.valeur for c in ligne if c.type == 'bonus')
            + (BONUS_FLIP7 if flip7 else 0))


class Partie:
    def __init__(self, joueurs: list[str], rng: random.Random) -> None:
        if len(joueurs) < 2:
            raise CoupInvalide('Il faut au moins deux joueurs.')
        self.rng = rng
        self.ordre = list(joueurs)
        self.scores = {j: 0 for j in self.ordre}
        self.pioche = paquet()
        self.rng.shuffle(self.pioche)
        self.defausse: list[Carte] = []
        self.manche = 0
        self.donneur = self.rng.randrange(len(self.ordre))
        self.gagnant: str | None = None
        self.journal: list[str] = []
        self.evenements: list[dict[str, Any]] = []
        self._ouvrir_manche()

    # -- état ----------------------------------------------------------------
    @property
    def finie(self) -> bool:
        return self.gagnant is not None

    @property
    def courant(self) -> str | None:
        if self.bilan is not None or self.finie or self.attente is not None:
            return None
        return self.ordre[self.tour] if self.tour is not None else None

    def _noter(self, ligne: str) -> None:
        self.journal.append(ligne)
        del self.journal[:-JOURNAL_MAX]

    def _evenement(self, joueur: str, carte: Carte) -> None:
        n = self.evenements[-1]['n'] + 1 if self.evenements else 1
        self.evenements.append({'n': n, 'joueur': joueur, 'carte': carte.id})
        del self.evenements[:-EVENEMENTS_MAX]

    def en_lice(self) -> list[str]:
        return [j for j in self.ordre if self.etat[j] == 'actif']

    def _nombres(self, joueur: str) -> list[int]:
        return [c.valeur for c in self.lignes[joueur] if c.type == 'nombre']

    def _a_chance(self, joueur: str) -> bool:
        return any(c.type == 'chance' for c in self.lignes[joueur])

    # -- manche --------------------------------------------------------------
    def _ouvrir_manche(self) -> None:
        self.manche += 1
        self.lignes: dict[str, list[Carte]] = {j: [] for j in self.ordre}
        # actif · reste (s'arrête, garde ses points) · saute (zéro point)
        self.etat = {j: 'actif' for j in self.ordre}
        self.flip7: str | None = None
        self.bilan: dict[str, int] | None = None
        # Une carte d'action à jouer : {joueur, carte (gel · trois)}.
        self.attente: dict[str, str] | None = None
        # Actions tirées pendant un Trois-à-la-suite, jouées ensuite par
        # `attente_de`.
        self.file: list[str] = []
        self.attente_de: str | None = None
        # Le joueur au trait a fini son coup (une carte d'action tirée) : le
        # tour passe dès que les actions sont jouées.
        self.a_passer = False
        self.tour: int | None = None
        self.donneur = (self.donneur + 1) % len(self.ordre)
        # La donne : une carte à chacun, en commençant après le donneur.
        n = len(self.ordre)
        self.a_donner = [self.ordre[(self.donneur + 1 + k) % n]
                         for k in range(n)]
        self._noter('Manche %d : %s distribue.'
                    % (self.manche, self.ordre[self.donneur]))
        self._poursuivre()

    def _poursuivre(self) -> None:
        """Continue la donne, puis le jeu, tant qu'aucune carte d'action
        n'attend sa cible et que la manche n'est pas finie."""
        while self.attente is None and self.bilan is None:
            if self.file:
                j = self.attente_de
                if j is not None and self.etat.get(j) == 'actif':
                    self._demander(j, self.file.pop(0))
                    continue
                self.file.clear()
            if self.a_donner:
                j = self.a_donner.pop(0)
                if self.etat[j] == 'actif':
                    self._tirer(j)
                continue
            if not self.en_lice():
                self._fermer_manche()
                return
            # La donne finie, le joueur après le donneur commence ; un coup
            # fini, ou un joueur au trait qui n'est plus en lice, passe la
            # main.
            if self.tour is None or self.a_passer \
                    or self.etat[self.ordre[self.tour]] != 'actif':
                if self.tour is None:
                    self.tour = self.donneur
                self.a_passer = False
                self._passer_au_suivant()
            return

    def _passer_au_suivant(self) -> None:
        n = len(self.ordre)
        depart = self.tour if self.tour is not None else self.donneur
        for k in range(1, n + 1):
            i = (depart + k) % n
            if self.etat[self.ordre[i]] == 'actif':
                self.tour = i
                return
        self._fermer_manche()

    def _piocher_carte(self) -> Carte:
        if not self.pioche:
            self.pioche = self.defausse
            self.defausse = []
            self.rng.shuffle(self.pioche)
        if not self.pioche:
            raise CoupInvalide('Plus aucune carte à piocher.')
        return self.pioche.pop()

    def _demander(self, joueur: str, carte: str) -> None:
        """Une carte d'action attend sa cible ; seul en lice, on se la joue."""
        lice = self.en_lice()
        if lice == [joueur]:
            self._appliquer(joueur, carte, joueur)
        else:
            self.attente = {'joueur': joueur, 'carte': carte}
            self.attente_de = joueur

    def _tirer(self, joueur: str, dans_trois: bool = False) -> None:
        """`joueur` reçoit une carte de la pioche, et la carte agit."""
        carte = self._piocher_carte()
        self._evenement(joueur, carte)
        ligne = self.lignes[joueur]
        if carte.type == 'nombre':
            if carte.valeur in self._nombres(joueur):
                if self._a_chance(joueur):
                    chance = next(c for c in ligne if c.type == 'chance')
                    ligne.remove(chance)
                    self.defausse += [chance, carte]
                    self._noter('%s tire un second %d : sa Seconde chance le '
                                'sauve.' % (joueur, carte.valeur))
                else:
                    ligne.append(carte)
                    self.etat[joueur] = 'saute'
                    self._noter('%s tire un second %d et saute !'
                                % (joueur, carte.valeur))
                return
            ligne.append(carte)
            self._noter('%s tire %d.' % (joueur, carte.valeur))
            if len(set(self._nombres(joueur))) >= SEPT:
                self.flip7 = joueur
                self._noter('Flip 7 pour %s : +%d !' % (joueur, BONUS_FLIP7))
                self._fermer_manche()
            return
        if carte.type in ('bonus', 'fois2'):
            ligne.append(carte)
            self._noter('%s tire %s.' % (joueur, carte.nom))
            return
        if carte.type == 'chance':
            if not self._a_chance(joueur):
                ligne.append(carte)
                self._noter('%s tire une Seconde chance.' % joueur)
                return
            autre = next((j for j in self.en_lice()
                          if j != joueur and not self._a_chance(j)), None)
            if autre is None:
                self.defausse.append(carte)
                self._noter('%s tire une Seconde chance de trop.' % joueur)
            else:
                self.lignes[autre].append(carte)
                self._noter('%s donne une Seconde chance à %s.'
                            % (joueur, autre))
            return
        # Gel ou Trois-à-la-suite.
        self.defausse.append(carte)
        self._noter('%s tire %s.' % (joueur, carte.nom))
        if dans_trois:
            self.file.append(carte.type)
        else:
            self._demander(joueur, carte.type)

    def _appliquer(self, joueur: str, carte: str, cible: str) -> None:
        if carte == 'gel':
            self.etat[cible] = 'reste'
            self._noter('%s gèle %s, qui garde ses points.'
                        % (joueur, cible if cible != joueur else 'son jeu'))
            return
        self._noter('%s : trois cartes à la suite pour %s.' % (joueur, cible))
        self.attente_de = cible
        for _ in range(3):
            if self.etat[cible] != 'actif' or self.bilan is not None:
                break
            self._tirer(cible, dans_trois=True)

    def _fermer_manche(self) -> None:
        self.bilan = {}
        for j in self.ordre:
            gain = 0 if self.etat[j] == 'saute' else points(
                self.lignes[j], self.flip7 == j)
            self.bilan[j] = gain
            self.scores[j] += gain
        self.attente = None
        self.file = []
        self.a_donner = []
        self._noter('Fin de la manche %d : %s.' % (self.manche, ', '.join(
            '%s +%d' % (j, g) for j, g in self.bilan.items())))
        meilleur = max(self.scores.values())
        en_tete = [j for j in self.ordre if self.scores[j] == meilleur]
        if meilleur >= OBJECTIF and len(en_tete) == 1:
            self.gagnant = en_tete[0]
            self._noter('%s gagne la partie avec %d points.'
                        % (self.gagnant, meilleur))

    # -- coups ---------------------------------------------------------------
    def _exige_tour(self, joueur: str) -> None:
        if self.finie:
            raise CoupInvalide('La partie est terminée.')
        if joueur not in self.etat:
            raise CoupInvalide('Vous ne jouez pas cette partie.')
        if self.attente is not None:
            raise CoupInvalide('%s choisit d’abord sa cible.'
                               % self.attente['joueur'])
        if joueur != self.courant:
            raise CoupInvalide("Ce n'est pas votre tour.")

    def piocher(self, joueur: str) -> None:
        self._exige_tour(joueur)
        self._tirer(joueur)
        self.a_passer = True
        self._poursuivre()

    def rester(self, joueur: str) -> None:
        self._exige_tour(joueur)
        self.etat[joueur] = 'reste'
        self._noter('%s s’arrête avec %d points.'
                    % (joueur, points(self.lignes[joueur])))
        self.a_passer = True
        self._poursuivre()

    def cibler(self, joueur: str, cible: object) -> None:
        """Le joueur qui a tiré un Gel ou un Trois-à-la-suite le joue."""
        a = self.attente
        if a is None or a['joueur'] != joueur:
            raise CoupInvalide("Vous n'avez pas de carte à jouer.")
        cible = str(cible or '')
        if self.etat.get(cible) != 'actif':
            raise CoupInvalide('Choisissez un joueur encore en lice.')
        self.attente = None
        self._appliquer(joueur, a['carte'], cible)
        self._poursuivre()

    def suivante(self, joueur: str) -> None:
        """Ouvre la manche suivante, après le bilan."""
        if self.finie:
            raise CoupInvalide('La partie est terminée.')
        if joueur not in self.etat:
            raise CoupInvalide('Vous ne jouez pas cette partie.')
        if self.bilan is None:
            raise CoupInvalide('La manche est en cours.')
        for ligne in self.lignes.values():
            self.defausse += ligne
        self._ouvrir_manche()

    def retirer(self, joueur: str) -> None:
        """Le joueur quitte la partie ; seul restant, l'autre gagne."""
        if joueur not in self.ordre:
            return
        i = self.ordre.index(joueur)
        courant = self.tour is not None and i == self.tour
        self.defausse += self.lignes.pop(joueur, [])
        self.ordre.remove(joueur)
        self.etat.pop(joueur, None)
        self.scores.pop(joueur, None)
        if self.bilan is not None:
            self.bilan.pop(joueur, None)
        self.a_donner = [j for j in self.a_donner if j != joueur]
        self._noter('%s quitte la table.' % joueur)
        if self.finie:
            return
        if len(self.ordre) == 1:
            self.gagnant = self.ordre[0]
            self._noter('%s gagne par forfait.' % self.gagnant)
            return
        if self.donneur >= len(self.ordre):
            self.donneur = 0
        if self.attente is not None and self.attente['joueur'] == joueur:
            self.attente = None
            self.file = []
        if self.tour is not None:
            if i < self.tour:
                self.tour -= 1
            elif courant:
                self.tour = (i - 1) % len(self.ordre)
                self.a_passer = True
        if self.bilan is None:
            self._poursuivre()

    # -- vue -----------------------------------------------------------------
    def vue(self, joueur: str | None = None) -> dict[str, Any]:
        """Tout est visible : la même vue pour chacun."""
        return {
            'joueurs': [{
                'nom': j,
                'etat': self.etat[j],
                'ligne': [c.vue() for c in self.lignes[j]],
                'points': 0 if self.etat[j] == 'saute' else points(
                    self.lignes[j], self.flip7 == j),
                'score': self.scores[j],
            } for j in self.ordre],
            'tour': self.courant,
            'attente': dict(self.attente) if self.attente else None,
            'manche': self.manche,
            'donneur': self.ordre[self.donneur],
            'bilan': dict(self.bilan) if self.bilan is not None else None,
            'flip7': self.flip7,
            'pioche': len(self.pioche),
            'objectif': OBJECTIF,
            'gagnant': self.gagnant,
            'journal': list(self.journal[-14:]),
            'evenements': list(self.evenements),
        }

    def vue_spectateur(self) -> dict[str, Any]:
        return self.vue(None)

"""Règles de Code Names, au manoir : une `Partie` (une manche), sans état
serveur.

Deux camps s'affrontent dans la galerie des portraits : les Vampires (`sang`)
et les Chasseurs (`argent`). Chaque camp a un oracle, qui voit le grimoire (à
qui appartient chaque portrait), et des agents, qui ne voient que les mots.

  - 25 cartes tirées d'une liste de mots : 9 pour le camp qui commence (tiré
    au sort), 8 pour l'autre, 7 domestiques (neutres) et le Comte ;
  - à son tour, l'oracle donne un indice : un seul mot, qui n'est pas l'un des
    mots encore cachés de la table, et un nombre (0 : sans limite) ;
  - ses agents révèlent alors des cartes, une à une, jusqu'à nombre + 1 (sans
    limite pour 0). Un portrait de leur camp : ils peuvent continuer ; un
    domestique ou un portrait adverse : le tour passe ; le Comte : leur camp
    perd sur-le-champ. Après une première carte, ils peuvent s'arrêter ;
  - un camp gagne quand tous ses portraits sont révélés, même par
    l'adversaire ;
  - les agents peuvent marquer des cartes (suggestions visibles de tous)
    avant de les révéler.

Un joueur qui part : s'il était oracle, un agent de son camp le remplace ; un
camp réduit à moins de deux joueurs perd par forfait.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import unicodedata
from dataclasses import dataclass

from .mots import LISTE_DEFAUT, LISTES

if TYPE_CHECKING:
    import random
    from typing import Any

EQUIPES = ('sang', 'argent')
NOMS = {'sang': 'Vampires', 'argent': 'Chasseurs'}
DOMESTIQUE = 'domestique'
COMTE = 'comte'
TAILLE = 25
CARTES_PREMIER = 9
CARTES_SECOND = 8
DOMESTIQUES = 7
NOMBRE_MAX = 9
INDICE_MAX = 30
JOURNAL_MAX = 40


class CoupInvalide(Exception):
    """Coup refusé : le message est montré au joueur."""


def autre(equipe: str) -> str:
    return EQUIPES[1] if equipe == EQUIPES[0] else EQUIPES[0]


def normaliser(mot: str) -> str:
    """Mot comparable : minuscules, sans accents ni espaces autour."""
    decompose = unicodedata.normalize('NFD', mot.strip().lower())
    return ''.join(c for c in decompose if not unicodedata.combining(c))


@dataclass
class Carte:
    mot: str
    role: str            # 'sang', 'argent', DOMESTIQUE ou COMTE
    revelee: bool = False
    par: str | None = None


class Partie:
    """Une manche. `equipes` : les joueurs de chaque camp ; `oracles` :
    l'oracle de chaque camp, parmi ses joueurs."""

    def __init__(self, equipes: dict[str, list[str]],
                 oracles: dict[str, str], rng: random.Random,
                 liste: str = LISTE_DEFAUT) -> None:
        for e in EQUIPES:
            joueurs = equipes.get(e) or []
            if len(joueurs) < 2:
                raise CoupInvalide('Chaque camp doit compter au moins deux '
                                   'joueurs : un oracle et un agent.')
            if oracles.get(e) not in joueurs:
                raise CoupInvalide('Chaque camp doit avoir son oracle.')
        self.equipes = {e: list(equipes[e]) for e in EQUIPES}
        self.oracles = {e: oracles[e] for e in EQUIPES}
        self.liste = liste if liste in LISTES else LISTE_DEFAUT
        self.premiere = rng.choice(EQUIPES)
        roles = ([self.premiere] * CARTES_PREMIER
                 + [autre(self.premiere)] * CARTES_SECOND
                 + [DOMESTIQUE] * DOMESTIQUES + [COMTE])
        rng.shuffle(roles)
        mots = rng.sample(LISTES[self.liste], TAILLE)
        self.cartes = [Carte(m, r) for m, r in zip(mots, roles)]
        self.equipe = self.premiere
        # 'indice' : l'oracle du camp au trait réfléchit ; 'devine' : ses
        # agents révèlent des cartes.
        self.phase = 'indice'
        self.indice: dict[str, Any] | None = None
        self.essais = 0
        # Suggestions des agents du camp au trait : carte -> joueurs.
        self.marques: dict[int, list[str]] = {}
        # Indices donnés, dans l'ordre : {equipe, mot, nombre, trouves}.
        self.indices: list[dict[str, Any]] = []
        self.gagnant: str | None = None
        self.cause: str | None = None       # 'portraits', 'comte', 'forfait'
        self.journal: list[str] = []
        self._noter('Les %s ouvrent la partie, avec %d portraits à trouver.'
                    % (NOMS[self.premiere], CARTES_PREMIER))

    # -- état ----------------------------------------------------------------
    @property
    def finie(self) -> bool:
        return self.gagnant is not None

    def equipe_de(self, joueur: str) -> str | None:
        return next((e for e in EQUIPES if joueur in self.equipes[e]), None)

    def est_oracle(self, joueur: str) -> bool:
        return joueur in self.oracles.values()

    def restants(self, equipe: str) -> int:
        return sum(1 for c in self.cartes
                   if c.role == equipe and not c.revelee)

    @property
    def limite(self) -> int | None:
        """Cartes que les agents peuvent encore révéler ce tour (None : sans
        limite)."""
        if self.indice is None:
            return 0
        if self.indice['nombre'] == 0:
            return None
        return self.indice['nombre'] + 1 - self.essais

    def _noter(self, ligne: str) -> None:
        self.journal.append(ligne)
        del self.journal[:-JOURNAL_MAX]

    def _exige_agent(self, joueur: str) -> None:
        if self.finie:
            raise CoupInvalide('La manche est terminée.')
        equipe = self.equipe_de(joueur)
        if equipe is None:
            raise CoupInvalide('Vous ne jouez pas cette manche.')
        if equipe != self.equipe:
            raise CoupInvalide("Ce n'est pas le tour de votre camp.")
        if self.est_oracle(joueur):
            raise CoupInvalide("L'oracle ne révèle pas de carte : il guide "
                               "ses agents.")
        if self.phase != 'devine':
            raise CoupInvalide("Attendez l'indice de votre oracle.")

    def _carte(self, index: object) -> Carte:
        try:
            i = int(index)  # type: ignore[call-overload]
        except (TypeError, ValueError):
            raise CoupInvalide('Carte illisible.') from None
        if not 0 <= i < TAILLE:
            raise CoupInvalide('Carte illisible.')
        return self.cartes[i]

    # -- coups ---------------------------------------------------------------
    def donner_indice(self, joueur: str, mot: object, nombre: object) -> None:
        if self.finie:
            raise CoupInvalide('La manche est terminée.')
        if self.oracles.get(self.equipe) != joueur:
            raise CoupInvalide("Seul l'oracle du camp au trait donne "
                               "l'indice.")
        if self.phase != 'indice':
            raise CoupInvalide('L’indice est déjà donné : vos agents '
                               'cherchent.')
        texte = ''.join(c for c in str(mot or '') if c.isprintable()).strip()
        if not texte:
            raise CoupInvalide('Donnez un mot.')
        if any(c.isspace() for c in texte):
            raise CoupInvalide('Un seul mot, sans espace.')
        if len(texte) > INDICE_MAX:
            raise CoupInvalide('Mot trop long (%d caractères au plus).'
                               % INDICE_MAX)
        cle = normaliser(texte)
        if any(normaliser(c.mot) == cle for c in self.cartes
               if not c.revelee):
            raise CoupInvalide('Ce mot est sur la table : choisissez-en un '
                               'autre.')
        try:
            n = int(nombre)  # type: ignore[call-overload]
        except (TypeError, ValueError):
            raise CoupInvalide('Nombre illisible.') from None
        if not 0 <= n <= NOMBRE_MAX:
            raise CoupInvalide('Le nombre va de 0 (sans limite) à %d.'
                               % NOMBRE_MAX)
        self.indice = {'equipe': self.equipe, 'mot': texte, 'nombre': n,
                       'trouves': 0}
        self.indices.append(self.indice)
        self.phase = 'devine'
        self.essais = 0
        self.marques = {}
        self._noter('%s (oracle des %s) : « %s », %s.' % (
            joueur, NOMS[self.equipe], texte, n if n else 'sans limite'))

    def marquer(self, joueur: str, index: object) -> None:
        """Pose ou retire la suggestion de `joueur` sur une carte."""
        self._exige_agent(joueur)
        carte = self._carte(index)
        if carte.revelee:
            raise CoupInvalide('Cette carte est déjà révélée.')
        i = self.cartes.index(carte)
        qui = self.marques.setdefault(i, [])
        if joueur in qui:
            qui.remove(joueur)
        else:
            qui.append(joueur)
        if not qui:
            del self.marques[i]

    def reveler(self, joueur: str, index: object) -> None:
        self._exige_agent(joueur)
        carte = self._carte(index)
        if carte.revelee:
            raise CoupInvalide('Cette carte est déjà révélée.')
        carte.revelee = True
        carte.par = joueur
        self.essais += 1
        self.marques.pop(self.cartes.index(carte), None)
        equipe = self.equipe
        if carte.role == COMTE:
            self._noter('%s ouvre le cercueil de « %s » : le Comte s’éveille '
                        '!' % (joueur, carte.mot))
            self._terminer(autre(equipe), 'comte')
            return
        if carte.role == equipe and self.indice is not None:
            self.indice['trouves'] += 1
        qui = (NOMS[carte.role].lower() if carte.role in EQUIPES
               else 'un domestique')
        self._noter('%s révèle « %s » : %s.' % (
            joueur, carte.mot,
            'un portrait des %s' % qui if carte.role in EQUIPES else qui))
        for e in (equipe, autre(equipe)):
            if self.restants(e) == 0:
                self._terminer(e, 'portraits')
                return
        if carte.role != equipe:
            self._fin_de_tour()
        elif self.limite == 0:
            self._noter('Les %s ont épuisé leurs essais.' % NOMS[equipe])
            self._fin_de_tour()

    def finir(self, joueur: str) -> None:
        """Les agents s'arrêtent, après au moins une carte."""
        self._exige_agent(joueur)
        if self.essais == 0:
            raise CoupInvalide('Révélez au moins une carte avant de vous '
                               'arrêter.')
        self._noter('%s arrête là pour les %s.' % (joueur, NOMS[self.equipe]))
        self._fin_de_tour()

    def _fin_de_tour(self) -> None:
        self.equipe = autre(self.equipe)
        self.phase = 'indice'
        self.indice = None
        self.essais = 0
        self.marques = {}

    def _terminer(self, equipe: str, cause: str) -> None:
        self.gagnant = equipe
        self.cause = cause
        self.phase = 'fin'
        self.indice = None
        self.marques = {}
        self._noter('Les %s remportent la manche.' % NOMS[equipe])

    def retirer(self, joueur: str) -> None:
        """Le joueur quitte la manche : un agent reprend son rôle d'oracle ;
        un camp de moins de deux joueurs perd par forfait."""
        equipe = self.equipe_de(joueur)
        if equipe is None:
            return
        self.equipes[equipe].remove(joueur)
        for qui in self.marques.values():
            if joueur in qui:
                qui.remove(joueur)
        self.marques = {i: q for i, q in self.marques.items() if q}
        self._noter('%s quitte le manoir.' % joueur)
        if self.finie:
            return
        if len(self.equipes[equipe]) < 2:
            self._noter('Les %s, trop peu nombreux, abandonnent.'
                        % NOMS[equipe])
            self._terminer(autre(equipe), 'forfait')
            return
        if self.oracles[equipe] == joueur:
            self.oracles[equipe] = self.equipes[equipe][0]
            self._noter('%s devient l’oracle des %s.'
                        % (self.oracles[equipe], NOMS[equipe]))

    # -- vue -----------------------------------------------------------------
    def _vue(self, grimoire: bool) -> dict[str, Any]:
        """La manche ; `grimoire` : le rôle de chaque carte (oracle, ou
        manche finie)."""
        voit = grimoire or self.finie
        return {
            'cartes': [{
                'mot': c.mot,
                'revelee': c.revelee,
                'par': c.par,
                'role': c.role if c.revelee or voit else None,
                'marques': list(self.marques.get(i, [])),
            } for i, c in enumerate(self.cartes)],
            'equipes': {e: list(self.equipes[e]) for e in EQUIPES},
            'oracles': dict(self.oracles),
            'restants': {e: self.restants(e) for e in EQUIPES},
            'premiere': self.premiere,
            'equipe': None if self.finie else self.equipe,
            'phase': self.phase,
            'indice': dict(self.indice) if self.indice else None,
            'limite': self.limite if self.phase == 'devine' else None,
            'essais': self.essais,
            'indices': [dict(i) for i in self.indices],
            'liste': self.liste,
            'gagnant': self.gagnant,
            'cause': self.cause,
            'journal': list(self.journal[-15:]),
        }

    def vue(self, joueur: str) -> dict[str, Any]:
        """Ce que voit `joueur` : le grimoire s'il est oracle."""
        equipe = self.equipe_de(joueur)
        oracle = self.est_oracle(joueur)
        return {
            **self._vue(oracle),
            'moi': {'equipe': equipe,
                    'role': 'oracle' if oracle else 'agent'},
        }

    def vue_spectateur(self) -> dict[str, Any]:
        return {**self._vue(False), 'moi': None}

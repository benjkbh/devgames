"""Règles du UNO classique, sans état serveur : une `Partie` (une manche).

Règles retenues (règles de base) :
  - 108 cartes : par couleur, un 0, deux de chaque chiffre de 1 à 9, deux
    Passe, deux Inversion, deux +2 ; plus 4 jokers et 4 +4 ;
  - 7 cartes par joueur ; la première carte retournée est un chiffre (une
    carte d'action ou un joker retourné repart sous la pioche) ;
  - on pose une carte de même couleur, de même valeur ou de même symbole, ou
    un joker ; le +4 n'est permis qu'à qui n'a aucune carte de la couleur
    demandée (la règle est appliquée par le serveur, sans contestation) ;
  - Passe : le suivant passe son tour ; Inversion : le sens change (à deux
    joueurs, elle fait passer le tour) ; +2 / +4 : le suivant pioche 2 / 4
    cartes et passe son tour ; pas de cumul des +2 / +4 ;
  - qui ne peut ou ne veut pas jouer pioche une carte ; si elle est jouable,
    il peut la poser aussitôt ou passer, sinon son tour s'achève ;
  - UNO : qui pose son avant-dernière carte doit l'annoncer. Tant qu'il ne
    l'a pas fait, un autre joueur peut le contrer avant que le joueur
    suivant n'agisse : il pioche alors 2 cartes ;
  - la manche s'arrête quand un joueur n'a plus de carte. Il marque la
    somme des cartes restant aux autres : chiffre = sa valeur, action = 20,
    joker et +4 = 50.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from dataclasses import dataclass

if TYPE_CHECKING:
    import random
    from typing import Any

COULEURS = ('rouge', 'jaune', 'vert', 'bleu')
CHIFFRES = tuple(str(n) for n in range(10))
ACTIONS = ('passe', 'inversion', '+2')
NOIRES = ('joker', '+4')
TAILLE_MAIN = 7
JOURNAL_MAX = 30


class CoupInvalide(Exception):
    """Coup refusé : le message est montré au joueur."""


@dataclass(frozen=True)
class Carte:
    id: int
    couleur: str | None     # None pour les jokers et +4
    valeur: str

    def vue(self) -> dict[str, Any]:
        return {'id': self.id, 'couleur': self.couleur or 'noir',
                'valeur': self.valeur}

    @property
    def points(self) -> int:
        if self.valeur in NOIRES:
            return 50
        if self.valeur in ACTIONS:
            return 20
        return int(self.valeur)

    @property
    def nom(self) -> str:
        if self.couleur is None:
            return 'Joker' if self.valeur == 'joker' else '+4'
        nom = {'passe': 'Passe', 'inversion': 'Inversion'}.get(
            self.valeur, self.valeur)
        return '%s %s' % (nom, self.couleur)


def paquet() -> list[Carte]:
    """Les 108 cartes, dans l'ordre ; identifiants 0 à 107."""
    valeurs: list[tuple[str | None, str]] = []
    for c in COULEURS:
        valeurs.append((c, '0'))
        for v in CHIFFRES[1:] + ACTIONS:
            valeurs += [(c, v), (c, v)]
    for v in NOIRES:
        valeurs += [(None, v)] * 4
    return [Carte(i, c, v) for i, (c, v) in enumerate(valeurs)]


def jouable(carte: Carte, dessus: Carte, couleur: str,
            main: list[Carte]) -> bool:
    """`carte` peut-elle être posée sur `dessus`, `couleur` étant demandée ?"""
    if carte.valeur == 'joker':
        return True
    if carte.valeur == '+4':
        return not any(c.couleur == couleur for c in main)
    return carte.couleur == couleur or carte.valeur == dessus.valeur


class Partie:
    """Une manche entre `joueurs` (2 à 10), dans l'ordre de la table."""

    def __init__(self, joueurs: list[str], rng: random.Random) -> None:
        if not 2 <= len(joueurs) <= 10:
            raise CoupInvalide('Il faut entre 2 et 10 joueurs.')
        self.rng = rng
        self.ordre = list(joueurs)
        self.pioche = paquet()
        rng.shuffle(self.pioche)
        self.mains: dict[str, list[Carte]] = {
            j: [self.pioche.pop() for _ in range(TAILLE_MAIN)]
            for j in self.ordre}
        # Première carte : un chiffre ; le reste repart sous la pioche.
        premiere = self.pioche.pop()
        while premiere.valeur not in CHIFFRES:
            self.pioche.insert(0, premiere)
            premiere = self.pioche.pop()
        self.defausse = [premiere]
        self.couleur: str = premiere.couleur or COULEURS[0]
        self.sens = 1
        self.tour = rng.randrange(len(self.ordre))
        # Carte piochée ce tour, jouable : seule carte que le joueur peut
        # encore poser, sinon il passe.
        self.pioche_jouable: int | None = None
        self.uno_dit: set[str] = set()
        # Joueur à une carte qui n'a pas dit UNO, contrable.
        self.expose: str | None = None
        self.gagnant: str | None = None
        self.points = 0
        self.journal: list[str] = []
        self._noter('La partie commence avec %s. %s ouvre le jeu.'
                    % (premiere.nom, self.courant))

    # -- état ----------------------------------------------------------------
    @property
    def courant(self) -> str:
        return self.ordre[self.tour]

    @property
    def dessus(self) -> Carte:
        return self.defausse[-1]

    @property
    def finie(self) -> bool:
        return self.gagnant is not None

    def jouables(self, joueur: str) -> list[int]:
        """Identifiants des cartes que `joueur` peut poser maintenant."""
        if self.finie or joueur != self.courant:
            return []
        main = self.mains[joueur]
        if self.pioche_jouable is not None:
            return [self.pioche_jouable]
        return [c.id for c in main
                if jouable(c, self.dessus, self.couleur, main)]

    def _noter(self, ligne: str) -> None:
        self.journal.append(ligne)
        del self.journal[:-JOURNAL_MAX]

    def _rang(self, pas: int) -> int:
        return (self.tour + pas * self.sens) % len(self.ordre)

    def _avancer(self, pas: int = 1) -> None:
        self.tour = self._rang(pas)
        self.pioche_jouable = None

    def _tirer(self, joueur: str, n: int) -> list[Carte]:
        """`joueur` pioche `n` cartes ; la défausse est rebattue au besoin."""
        tirees = []
        for _ in range(n):
            if not self.pioche:
                self.pioche = self.defausse[:-1]
                self.defausse = self.defausse[-1:]
                self.rng.shuffle(self.pioche)
                if not self.pioche:
                    break
            tirees.append(self.pioche.pop())
        self.mains[joueur] += tirees
        if len(self.mains[joueur]) > 1:
            self.uno_dit.discard(joueur)
            if self.expose == joueur:
                self.expose = None
        return tirees

    def _exige_tour(self, joueur: str) -> None:
        if self.finie:
            raise CoupInvalide('La manche est terminée.')
        if joueur not in self.mains:
            raise CoupInvalide('Vous ne jouez pas cette manche.')
        if joueur != self.courant:
            raise CoupInvalide("Ce n'est pas votre tour.")

    def _fin_de_fenetre(self, joueur: str) -> None:
        """Un autre joueur agit : on ne peut plus contrer l'exposé."""
        if self.expose is not None and self.expose != joueur:
            self.expose = None

    # -- coups ---------------------------------------------------------------
    def jouer(self, joueur: str, carte_id: int, couleur: str | None = None,
              uno: bool = False) -> None:
        self._exige_tour(joueur)
        main = self.mains[joueur]
        carte = next((c for c in main if c.id == carte_id), None)
        if carte is None:
            raise CoupInvalide("Cette carte n'est pas dans votre main.")
        if carte_id not in self.jouables(joueur):
            if self.pioche_jouable is not None:
                raise CoupInvalide('Vous ne pouvez poser que la carte '
                                   'piochée, ou passer.')
            if carte.valeur == '+4':
                raise CoupInvalide('Le +4 ne se pose que sans carte de la '
                                   'couleur demandée.')
            raise CoupInvalide('Cette carte ne peut pas être posée.')
        if carte.couleur is None and couleur not in COULEURS:
            raise CoupInvalide('Choisissez une couleur.')

        self._fin_de_fenetre(joueur)
        main.remove(carte)
        self.defausse.append(carte)
        self.couleur = carte.couleur or str(couleur)
        if uno:
            self.uno_dit.add(joueur)
        annonce = (' et annonce %s' % self.couleur) if carte.couleur is None \
            else ''
        self._noter('%s pose %s%s.' % (joueur, carte.nom, annonce))
        if len(main) == 1:
            if joueur in self.uno_dit:
                self._noter('%s : « UNO ! »' % joueur)
            else:
                self.expose = joueur
        else:
            self.uno_dit.discard(joueur)

        pas = 1
        n = len(self.ordre)
        if carte.valeur == 'passe':
            self._noter('%s passe son tour.' % self.ordre[self._rang(1)])
            pas = 2
        elif carte.valeur == 'inversion':
            self.sens = -self.sens
            pas = 2 if n == 2 else 1
            self._noter('Le sens du jeu change.')
        elif carte.valeur in ('+2', '+4'):
            victime = self.ordre[self._rang(1)]
            k = 2 if carte.valeur == '+2' else 4
            self._tirer(victime, k)
            self._noter('%s pioche %d cartes et passe son tour.'
                        % (victime, k))
            pas = 2

        if not main:
            self._terminer(joueur)
            return
        self._avancer(pas)

    def piocher(self, joueur: str) -> Carte | None:
        """Pioche une carte ; rend la carte si elle est jouable (le joueur
        peut la poser ou passer), sinon None (le tour passe)."""
        self._exige_tour(joueur)
        if self.pioche_jouable is not None:
            raise CoupInvalide('Vous avez déjà pioché : posez la carte ou '
                               'passez.')
        self._fin_de_fenetre(joueur)
        tirees = self._tirer(joueur, 1)
        self._noter('%s pioche une carte.' % joueur)
        if tirees and jouable(tirees[0], self.dessus, self.couleur,
                              self.mains[joueur]):
            self.pioche_jouable = tirees[0].id
            return tirees[0]
        self._avancer()
        return None

    def passer(self, joueur: str) -> None:
        self._exige_tour(joueur)
        if self.pioche_jouable is None:
            raise CoupInvalide('Piochez une carte avant de passer.')
        self._noter('%s passe.' % joueur)
        self._avancer()

    def dire_uno(self, joueur: str) -> None:
        if self.finie or joueur not in self.mains:
            raise CoupInvalide('Rien à annoncer.')
        n = len(self.mains[joueur])
        if n > 2 or (n == 2 and joueur != self.courant):
            raise CoupInvalide('UNO s’annonce avec une ou deux cartes en '
                               'main, avant de poser l’avant-dernière.')
        self.uno_dit.add(joueur)
        if self.expose == joueur:
            self.expose = None
            self._noter('%s : « UNO ! »' % joueur)

    def contrer(self, joueur: str, cible: str) -> None:
        if self.finie or joueur not in self.mains:
            raise CoupInvalide('Rien à contrer.')
        if cible == joueur or self.expose != cible:
            raise CoupInvalide('Trop tard : ce joueur ne peut plus être '
                               'contré.')
        self.expose = None
        self._tirer(cible, 2)
        self._noter('%s contre %s, qui avait oublié UNO : 2 cartes.'
                    % (joueur, cible))

    def retirer(self, joueur: str) -> None:
        """Le joueur quitte la manche : ses cartes repartent sous la pioche.
        S'il ne reste qu'un joueur, il gagne par forfait."""
        if joueur not in self.mains:
            return
        i = self.ordre.index(joueur)
        self.pioche[:0] = self.mains.pop(joueur)
        self.ordre.remove(joueur)
        self.uno_dit.discard(joueur)
        if self.expose == joueur:
            self.expose = None
        self._noter('%s quitte la table.' % joueur)
        if self.finie:
            return
        if len(self.ordre) == 1:
            self.tour = 0
            self.gagnant = self.ordre[0]
            self.points = 0
            self._noter('%s gagne par forfait.' % self.gagnant)
            return
        if i < self.tour:
            self.tour -= 1
        elif i == self.tour:
            # La main passe au suivant dans le sens du jeu.
            self.tour = (i if self.sens == 1 else i - 1) % len(self.ordre)
            self.pioche_jouable = None

    def _terminer(self, joueur: str) -> None:
        self.gagnant = joueur
        self.expose = None
        self.pioche_jouable = None
        self.points = sum(c.points for j, main in self.mains.items()
                          if j != joueur for c in main)
        self._noter('%s gagne la manche et marque %d points.'
                    % (joueur, self.points))

    # -- vue -----------------------------------------------------------------
    def vue(self, joueur: str) -> dict[str, Any]:
        """Ce que `joueur` voit : sa main, le nombre de cartes des autres."""
        main = self.mains.get(joueur, [])
        return {
            'joueurs': [{
                'nom': j,
                'cartes': len(self.mains[j]),
                'uno': j in self.uno_dit and len(self.mains[j]) == 1,
                'expose': self.expose == j,
            } for j in self.ordre],
            'main': [c.vue() for c in main],
            'jouables': self.jouables(joueur),
            'uno_annonce': joueur in self.uno_dit,
            'dessus': self.dessus.vue(),
            'couleur': self.couleur,
            'sens': self.sens,
            'tour': None if self.finie else self.courant,
            'pioche': len(self.pioche),
            'pioche_jouable': (self.pioche_jouable
                               if joueur == self.courant else None),
            'journal': list(self.journal[-12:]),
            'gagnant': self.gagnant,
            'points': self.points,
        }

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

Règles de la table (`REGLES`, choisies par l'hôte, copiées dans la manche) :
  - `pioche_jusqua` : qui ne peut pas jouer pioche jusqu'à tirer une carte
    jouable (qu'il peut poser ou garder) au lieu d'une seule carte ;
  - `sept_zero` : poser un 7 échange sa main avec celle d'un joueur au choix ;
    poser un 0 fait passer toutes les mains au joueur suivant, dans le sens du
    jeu. Une dernière carte posée gagne la manche sans autre effet ; échanger
    ou faire tourner les mains efface les UNO annoncés ou à contrer ;
  - `rapidite` : qui tient une carte identique à celle du dessus (même
    couleur et même valeur, jokers exclus) peut la poser hors de son tour ;
    le jeu reprend alors après lui, comme s'il avait joué à son tour ;
  - `suites` : après un chiffre, le joueur peut enchaîner dans le même tour
    le chiffre suivant de la même couleur (5, 6, 7… ou 5, 4, 3… : la deuxième
    carte fixe le sens), ou s'arrêter (`passer`). Un 7 ou un 0 qui échange ou
    fait tourner les mains (`sept_zero`) clôt la suite.
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
# Événements de la manche gardés pour les interfaces (animations).
EVENEMENTS_MAX = 12
# Règles facultatives d'une table, et leur valeur par défaut.
REGLES: dict[str, bool] = {'pioche_jusqua': False, 'sept_zero': False,
                           'rapidite': False, 'suites': False}


def nettoyer_regles(brut: object) -> dict[str, bool]:
    """Les règles connues, en booléens ; le reste est ignoré."""
    donnees = brut if isinstance(brut, dict) else {}
    return {cle: bool(donnees.get(cle, defaut))
            for cle, defaut in REGLES.items()}


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

    def __init__(self, joueurs: list[str], rng: random.Random,
                 regles: object = None) -> None:
        if not 2 <= len(joueurs) <= 10:
            raise CoupInvalide('Il faut entre 2 et 10 joueurs.')
        self.rng = rng
        self.regles = nettoyer_regles(regles)
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
        # Suite en cours du joueur courant : couleur, dernier chiffre posé et
        # sens (+1, -1, ou 0 tant qu'il n'est pas fixé).
        self.suite: dict[str, Any] | None = None
        self.uno_dit: set[str] = set()
        # Joueur à une carte qui n'a pas dit UNO, contrable.
        self.expose: str | None = None
        self.gagnant: str | None = None
        self.points = 0
        self.journal: list[str] = []
        # Pose et pioche, numérotées : l'interface rejoue ceux qu'elle n'a pas
        # encore vus (glissement des cartes). `{n, joueur, type, cartes}`.
        self.evenements: list[dict[str, Any]] = []
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
        if self.finie or joueur not in self.mains:
            return []
        main = self.mains[joueur]
        if joueur != self.courant:
            # Règle de rapidité : les cartes identiques au dessus.
            return [c.id for c in main if self._identique(c)]
        if self.suite is not None:
            return [c.id for c in main if self._prolonge(c)]
        if self.pioche_jouable is not None:
            return [self.pioche_jouable]
        return [c.id for c in main
                if jouable(c, self.dessus, self.couleur, main)]

    def _identique(self, carte: Carte) -> bool:
        """Carte posable hors tour (règle de rapidité)."""
        return (self.regles['rapidite'] and carte.couleur is not None
                and carte.couleur == self.dessus.couleur
                and carte.valeur == self.dessus.valeur)

    def _prolonge(self, carte: Carte) -> bool:
        """`carte` prolonge-t-elle la suite en cours ?"""
        s = self.suite
        if s is None or carte.couleur != s['couleur'] \
                or carte.valeur not in CHIFFRES:
            return False
        ecart = int(carte.valeur) - s['valeur']
        return ecart in (1, -1) and s['sens'] in (0, ecart)

    def _noter(self, ligne: str) -> None:
        self.journal.append(ligne)
        del self.journal[:-JOURNAL_MAX]

    def _evenement(self, joueur: str, type_: str, cartes: int = 1,
                   **autres: Any) -> None:
        n = self.evenements[-1]['n'] + 1 if self.evenements else 1
        self.evenements.append({'n': n, 'joueur': joueur, 'type': type_,
                                'cartes': cartes, **autres})
        del self.evenements[:-EVENEMENTS_MAX]

    def _rang(self, pas: int) -> int:
        return (self.tour + pas * self.sens) % len(self.ordre)

    def _avancer(self, pas: int = 1) -> None:
        self.tour = self._rang(pas)
        self.pioche_jouable = None
        self.suite = None

    def _tirer(self, joueur: str, n: int,
               evenement: bool = True) -> list[Carte]:
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
        if tirees and evenement:
            self._evenement(joueur, 'pioche', len(tirees))
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
              uno: bool = False, cible: str | None = None) -> None:
        if self.finie:
            raise CoupInvalide('La manche est terminée.')
        if joueur not in self.mains:
            raise CoupInvalide('Vous ne jouez pas cette manche.')
        main = self.mains[joueur]
        carte = next((c for c in main if c.id == carte_id), None)
        if carte is None:
            raise CoupInvalide("Cette carte n'est pas dans votre main.")
        rapide = joueur != self.courant
        if rapide and not self._identique(carte):
            raise CoupInvalide("Ce n'est pas votre tour.")
        if not rapide and carte_id not in self.jouables(joueur):
            if self.suite is not None:
                raise CoupInvalide('Posez le chiffre suivant de votre suite, '
                                   'ou arrêtez-la.')
            if self.pioche_jouable is not None:
                raise CoupInvalide('Vous ne pouvez poser que la carte '
                                   'piochée, ou passer.')
            if carte.valeur == '+4':
                raise CoupInvalide('Le +4 ne se pose que sans carte de la '
                                   'couleur demandée.')
            raise CoupInvalide('Cette carte ne peut pas être posée.')
        if carte.couleur is None and couleur not in COULEURS:
            raise CoupInvalide('Choisissez une couleur.')
        echange = (self.regles['sept_zero'] and carte.valeur == '7'
                   and len(main) > 1)
        if echange and (cible not in self.mains or cible == joueur):
            raise CoupInvalide('Choisissez le joueur dont vous prenez la '
                               'main.')

        self._fin_de_fenetre(joueur)
        if rapide:
            # Rapidité : le jeu reprend depuis lui.
            self._noter('%s pose une carte identique, hors de son tour !'
                        % joueur)
            self.tour = self.ordre.index(joueur)
            self.pioche_jouable = None
            self.suite = None
        suite = self.suite
        main.remove(carte)
        self.defausse.append(carte)
        self._evenement(joueur, 'pose')
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
        if echange:
            self._echanger(joueur, str(cible))
        elif self.regles['sept_zero'] and carte.valeur == '0':
            self._tourner()
        elif self.regles['suites'] and carte.valeur in CHIFFRES:
            # Suite : le joueur garde la main s'il peut la prolonger.
            self.pioche_jouable = None
            self.suite = {
                'couleur': carte.couleur, 'valeur': int(carte.valeur),
                'sens': (int(carte.valeur) - suite['valeur']
                         if suite is not None else 0)}
            if any(self._prolonge(c) for c in main):
                return
        self._avancer(pas)

    def _oublier_uno(self, *joueurs: str) -> None:
        """Les mains ont changé : plus de UNO annoncé ni à contrer."""
        for j in joueurs:
            self.uno_dit.discard(j)
        if self.expose in joueurs:
            self.expose = None

    def _echanger(self, joueur: str, cible: str) -> None:
        """Règle du 7 : `joueur` et `cible` échangent leur main."""
        self.mains[joueur], self.mains[cible] = (
            self.mains[cible], self.mains[joueur])
        self._oublier_uno(joueur, cible)
        self._noter('%s échange sa main avec %s.' % (joueur, cible))
        self._evenement(joueur, 'echange', cible=cible)

    def _tourner(self) -> None:
        """Règle du 0 : chaque main passe au joueur suivant, dans le sens du
        jeu."""
        n = len(self.ordre)
        anciennes = {j: self.mains[j] for j in self.ordre}
        for i, j in enumerate(self.ordre):
            self.mains[self.ordre[(i + self.sens) % n]] = anciennes[j]
        self._oublier_uno(*self.ordre)
        self._noter('Toutes les mains passent au joueur suivant.')
        self._evenement(self.courant, 'rotation')

    def piocher(self, joueur: str) -> Carte | None:
        """Pioche une carte ; rend la carte si elle est jouable (le joueur
        peut la poser ou passer), sinon None (le tour passe)."""
        self._exige_tour(joueur)
        if self.pioche_jouable is not None:
            raise CoupInvalide('Vous avez déjà pioché : posez la carte ou '
                               'passez.')
        if self.suite is not None:
            raise CoupInvalide('Prolongez votre suite, ou arrêtez-la.')
        self._fin_de_fenetre(joueur)
        tirees: list[Carte] = []
        while True:
            une = self._tirer(joueur, 1, evenement=False)
            tirees += une
            # Sans la règle, une seule carte ; avec, jusqu'à une jouable.
            if (not une or not self.regles['pioche_jusqua']
                    or jouable(une[0], self.dessus, self.couleur,
                               self.mains[joueur])):
                break
        if tirees:
            self._evenement(joueur, 'pioche', len(tirees))
        self._noter('%s pioche %s.' % (
            joueur, 'une carte' if len(tirees) <= 1
            else '%d cartes' % len(tirees)))
        if tirees and jouable(tirees[-1], self.dessus, self.couleur,
                              self.mains[joueur]):
            self.pioche_jouable = tirees[-1].id
            return tirees[-1]
        self._avancer()
        return None

    def passer(self, joueur: str) -> None:
        self._exige_tour(joueur)
        if self.suite is not None:
            self._noter('%s arrête sa suite.' % joueur)
        elif self.pioche_jouable is None:
            raise CoupInvalide('Piochez une carte avant de passer.')
        else:
            self._noter('%s passe.' % joueur)
        self._avancer()

    def dire_uno(self, joueur: str) -> None:
        if self.finie or joueur not in self.mains:
            raise CoupInvalide('Rien à annoncer.')
        n = len(self.mains[joueur])
        # Avec deux cartes : à son tour, ou prêt à poser hors tour.
        if n > 2 or (n == 2 and joueur != self.courant
                     and not self.jouables(joueur)):
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
            self.suite = None

    def _terminer(self, joueur: str) -> None:
        self.gagnant = joueur
        self.expose = None
        self.pioche_jouable = None
        self.suite = None
        self.points = sum(c.points for j, main in self.mains.items()
                          if j != joueur for c in main)
        self._noter('%s gagne la manche et marque %d points.'
                    % (joueur, self.points))

    # -- vue -----------------------------------------------------------------
    def _vue_commune(self) -> dict[str, Any]:
        """Ce que tout le monde voit, joueur ou spectateur : le nombre de
        cartes de chacun, la défausse, le tour."""
        return {
            'joueurs': [{
                'nom': j,
                'cartes': len(self.mains[j]),
                'uno': j in self.uno_dit and len(self.mains[j]) == 1,
                'expose': self.expose == j,
            } for j in self.ordre],
            'dessus': self.dessus.vue(),
            'couleur': self.couleur,
            'sens': self.sens,
            'tour': None if self.finie else self.courant,
            'pioche': len(self.pioche),
            'journal': list(self.journal[-12:]),
            'evenements': list(self.evenements),
            'regles': dict(self.regles),
            'gagnant': self.gagnant,
            'points': self.points,
        }

    def vue(self, joueur: str) -> dict[str, Any]:
        """Ce que `joueur` voit : sa main, le nombre de cartes des autres."""
        main = self.mains.get(joueur, [])
        return {
            **self._vue_commune(),
            'main': [c.vue() for c in main],
            'jouables': self.jouables(joueur),
            'uno_annonce': joueur in self.uno_dit,
            'pioche_jouable': (self.pioche_jouable
                               if joueur == self.courant else None),
            # Le joueur courant peut prolonger sa suite ou l'arrêter.
            'suite': self.suite is not None and joueur == self.courant,
        }

    def vue_spectateur(self) -> dict[str, Any]:
        """Ce que voit un spectateur : le jeu, sans aucune main."""
        return self._vue_commune()

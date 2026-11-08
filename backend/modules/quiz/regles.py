"""Règles du quiz de culture générale, sans état serveur : une `Partie`.

Déroulé :
  - question : chacun écrit sa réponse (ou place un point sur la carte)
    avant la fin du temps ; il peut la changer tant que le temps court. Tout
    le monde a répondu : on passe aussitôt. Personne ne voit la réponse des
    autres ;
  - solution : pour une question à réponse attendue (texte ou carte), la
    réponse est montrée quelques secondes (et les points de chacun sur la
    carte). Une question ouverte passe sans rien montrer : l'hôte la jugera ;
  - revue : la dernière question passée, l'hôte revoit chaque question avec
    toutes les réponses. La correction automatique propose un point pour les
    réponses attendues ; l'hôte confirme ou renverse, et donne (ou non) le
    point des questions ouvertes. Tout le monde suit la revue ;
  - fin : l'hôte clôt la revue ; le plus de points gagne (le premier dans
    l'ordre de la table, à égalité, avec la mention des ex æquo).

Le temps vient d'une horloge (`horloge()`, en secondes) : la fin d'une
question ou d'une solution n'est constatée qu'à un coup (`avancer`), que
chaque interface envoie quand son compte à rebours tombe à zéro.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from . import correction
from .pays import ALIAS, PAYS, PETITS, RAYON_PETIT

if TYPE_CHECKING:
    from collections.abc import Callable
    from typing import Any

    from .banque import Question

REPONSE_MAX = 200
# Durée de la solution montrée (s), selon le type de question.
SOLUTION = {'texte': 6, 'carte': 9}
# Marge accordée aux horloges des interfaces (s).
MARGE = 0.4


class CoupInvalide(Exception):
    """Coup refusé : le message est montré au joueur."""


class Partie:
    def __init__(self, joueurs: list[str], questions: list[Question],
                 duree: int, horloge: Callable[[], float]) -> None:
        if not questions:
            raise CoupInvalide('Aucune question à poser.')
        self.ordre = list(joueurs)
        self.questions = questions
        self.duree = duree
        self.horloge = horloge
        # Par question : joueur -> réponse ({texte} ou {pays, lat, lon}).
        self.reponses: list[dict[str, dict[str, Any]]] = [
            {} for _ in questions]
        # Par question : joueur -> point proposé (1, 0, ou None : à juger).
        self.auto: list[dict[str, float | None]] = [{} for _ in questions]
        # Par question : joueur -> point retenu par l'hôte.
        self.points: list[dict[str, float | None]] = [{} for _ in questions]
        self.phase = 'question'
        self.index = 0
        self.fin = horloge() + duree
        # Question revue par l'hôte.
        self.revue = 0
        self.gagnant: str | None = None
        self.ex_aequo: list[str] = []

    @property
    def finie(self) -> bool:
        return self.phase == 'fin'

    @property
    def question(self) -> Question:
        return self.questions[self.index]

    def reste(self) -> float:
        return max(0.0, self.fin - self.horloge())

    # -- réponses -------------------------------------------------------------
    def _exige(self, joueur: str) -> None:
        if joueur not in self.ordre:
            raise CoupInvalide('Vous ne jouez pas cette partie.')

    def repondre(self, joueur: str, index: object, texte: object = None,
                 pays: object = None, lat: object = None,
                 lon: object = None) -> None:
        self._exige(joueur)
        if self.phase != 'question' or str(index) != str(self.index):
            raise CoupInvalide('Trop tard : la question est passée.')
        if self.reste() <= 0:
            raise CoupInvalide('Trop tard : le temps est écoulé.')
        q = self.question
        if q.type == 'carte':
            try:
                la, lo = float(lat), float(lon)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                raise CoupInvalide('Placez un point sur la carte.') from None
            if not (-90 <= la <= 90 and -180 <= lo <= 180):
                raise CoupInvalide('Ce point est hors de la carte.')
            code = str(pays or '')[:3].upper() or None
            reponse: dict[str, Any] = {'pays': code, 'lat': round(la, 3),
                                       'lon': round(lo, 3)}
        else:
            t = ''.join(c for c in str(texte or '') if c.isprintable())
            t = t.strip()[:REPONSE_MAX]
            if not t:
                raise CoupInvalide('Écrivez une réponse.')
            reponse = {'texte': t}
        self.reponses[self.index][joueur] = reponse
        if all(j in self.reponses[self.index] for j in self.ordre):
            self._cloturer()

    def avancer(self, joueur: str, index: object) -> None:
        """Le temps de la question (ou de la solution) `index` est écoulé ;
        sans effet si c'est déjà fait, ou si le temps court encore."""
        self._exige(joueur)
        if str(index) != str(self.index) or self.reste() > MARGE:
            return
        if self.phase == 'question':
            self._cloturer()
        elif self.phase == 'solution':
            self._suivante()

    def passer(self, joueur: str) -> None:
        """L'hôte passe la solution sans attendre la fin du temps."""
        self._exige(joueur)
        if self.phase != 'solution':
            raise CoupInvalide('Il n’y a pas de solution à passer.')
        self._suivante()

    def _corriger(self, i: int) -> None:
        q = self.questions[i]
        for j in self.ordre:
            r = self.reponses[i].get(j)
            if q.type == 'ouverte':
                point = None if r else 0.0
            elif r is None:
                point = 0.0
            elif q.type == 'carte':
                point = 1.0 if self._bon_point(q, r) else 0.0
            else:
                point = 1.0 if correction.juste(r['texte'], q.reponses) \
                    else 0.0
            self.auto[i][j] = point
            self.points[i][j] = point

    @staticmethod
    def _bon_point(q: Question, r: dict[str, Any]) -> bool:
        code = ALIAS.get(r.get('pays') or '', r.get('pays'))
        if code == q.cible:
            return True
        p = PAYS[q.cible]
        return q.cible in PETITS and correction.km(
            r['lat'], r['lon'], p.lat, p.lon) <= RAYON_PETIT

    def _cloturer(self) -> None:
        self._corriger(self.index)
        q = self.question
        if q.type in SOLUTION:
            self.phase = 'solution'
            self.fin = self.horloge() + SOLUTION[q.type]
        else:
            self._suivante()

    def _suivante(self) -> None:
        if self.index + 1 < len(self.questions):
            self.index += 1
            self.phase = 'question'
            self.fin = self.horloge() + self.duree
        else:
            self.phase = 'revue'
            self.revue = 0

    # -- revue (l'hôte) -------------------------------------------------------
    def _exige_revue(self) -> None:
        if self.phase != 'revue':
            raise CoupInvalide('La revue n’a pas commencé.')

    def _index(self, index: object) -> int:
        try:
            i = int(index)  # type: ignore[call-overload]
        except (TypeError, ValueError):
            raise CoupInvalide('Question illisible.') from None
        if not 0 <= i < len(self.questions):
            raise CoupInvalide('Cette question n’existe pas.')
        return i

    def noter(self, joueur: str, index: object, cible: object,
              point: object) -> None:
        """Le point de `cible` à la question `index` : 1, ½ ou 0."""
        self._exige_revue()
        i = self._index(index)
        cible = str(cible or '')
        if cible not in self.ordre:
            raise CoupInvalide('Ce joueur n’est pas à la table.')
        try:
            p = float(point)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            raise CoupInvalide('Point illisible.') from None
        if p not in (0, 0.5, 1):
            raise CoupInvalide('Un point, un demi-point, ou rien.')
        self.points[i][cible] = p

    def revoir(self, joueur: str, index: object) -> None:
        """L'hôte montre la question `index` à la revue."""
        self._exige_revue()
        self.revue = self._index(index)

    def terminer(self, joueur: str) -> None:
        """L'hôte clôt la revue : les points sont comptés."""
        self._exige_revue()
        self._compter()

    def _compter(self) -> None:
        self.phase = 'fin'
        totaux = self.totaux()
        if not totaux:
            return
        meilleur = max(totaux.values())
        premiers = [j for j in self.ordre if totaux[j] == meilleur]
        self.gagnant = premiers[0]
        self.ex_aequo = premiers[1:]

    def totaux(self) -> dict[str, float]:
        return {j: sum(p.get(j) or 0 for p in self.points)
                for j in self.ordre}

    def retirer(self, joueur: str) -> None:
        if joueur not in self.ordre:
            return
        self.ordre.remove(joueur)
        for reponses in self.reponses:
            reponses.pop(joueur, None)
        for points in (*self.auto, *self.points):
            points.pop(joueur, None)
        # Les autres continuent, même seul.
        if self.finie:
            return
        if not self.ordre:
            self._compter()
            return
        if (self.phase == 'question'
                and all(j in self.reponses[self.index] for j in self.ordre)):
            self._cloturer()

    # -- vue ------------------------------------------------------------------
    def _vue_reponse(self, i: int, j: str) -> dict[str, Any]:
        return {'joueur': j, 'reponse': self.reponses[i].get(j),
                'auto': self.auto[i].get(j),
                'point': self.points[i].get(j)}

    def _vue_revue(self, i: int) -> dict[str, Any]:
        return {'index': i, 'question': self.questions[i].vue_solution(),
                'reponses': [self._vue_reponse(i, j) for j in self.ordre]}

    def _vue_commune(self) -> dict[str, Any]:
        v: dict[str, Any] = {
            'phase': self.phase,
            'index': self.index,
            'total': len(self.questions),
            'duree': self.duree,
            'joueurs': list(self.ordre),
            'gagnant': self.gagnant,
            'ex_aequo': list(self.ex_aequo),
        }
        if self.phase in ('question', 'solution'):
            i = self.index
            v['reste'] = round(self.reste(), 2)
            v['repondu'] = [j for j in self.ordre if j in self.reponses[i]]
            if self.phase == 'question':
                v['question'] = self.question.vue()
            else:
                v['question'] = self.question.vue_solution()
                if self.question.type == 'carte':
                    v['points_carte'] = [
                        {'joueur': j, **self.reponses[i][j],
                         'point': self.auto[i].get(j)}
                        for j in self.ordre if j in self.reponses[i]]
        if self.phase in ('revue', 'fin'):
            v['scores'] = self.totaux()
            # Le sommaire : par question, ce qui reste à juger.
            v['sommaire'] = [{
                'index': i, 'type': q.type, 'theme': q.theme,
                'a_juger': sum(1 for j in self.ordre
                               if self.points[i].get(j) is None),
                'justes': sum(1 for j in self.ordre
                              if (self.points[i].get(j) or 0) > 0),
            } for i, q in enumerate(self.questions)]
        if self.phase == 'revue':
            v['revue'] = self._vue_revue(self.revue)
        if self.phase == 'fin':
            v['recap'] = [self._vue_revue(i)
                          for i in range(len(self.questions))]
        return v

    def vue(self, joueur: str) -> dict[str, Any]:
        v = self._vue_commune()
        if self.phase in ('question', 'solution'):
            v['ma_reponse'] = self.reponses[self.index].get(joueur)
            if self.phase == 'solution':
                v['mon_point'] = self.auto[self.index].get(joueur)
        return v

    def vue_spectateur(self) -> dict[str, Any]:
        return self._vue_commune()

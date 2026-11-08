"""La banque de questions : les fichiers de `questions/`, plus les questions
tirées de la table des pays (`pays.py`).

Un fichier de questions est du texte, une question par ligne :

    @ Histoire                                 le thème du fichier
    # commentaire
    En quelle année… ? = 1789                  réponse attendue
    Qui a peint… ? = Léonard de Vinci | Vinci  variantes admises après |
    Citez un roi de France. ~ Louis XIV…       question ouverte : après ~,
                                               une indication pour l'hôte
    [a1b2c3.jpg] Qui a peint ce tableau ? = …  avec une image (fichier de
                                               `frontend/public/quiz/img/`)
    {🦁👑} Quel est ce film ? = Le Roi lion     avec un rébus d'emojis

Les images viennent de sources libres ; leur auteur et leur licence sont
dans `questions/credits.tsv` (fichier, auteur, licence, source), montrés
avec la solution. Le nom d'un fichier d'image est une empreinte : il ne
trahit pas la réponse.

Une question « = » est corrigée d'office (proposition que l'hôte revoit) et
sa réponse est montrée à la fin du temps ; une question ouverte « ~ » n'a
pas de réponse unique : l'hôte la juge pendant la revue, sans rien montrer
avant. Une question est désignée par un identifiant stable (empreinte de son
énoncé) : l'historique des joueurs (`historique.py`) s'en sert.
"""
from __future__ import annotations

import hashlib
from typing import Any
import math
import random
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from .correction import normaliser
from .pays import PAYS

DOSSIER = Path(__file__).resolve().parent / 'questions'
THEME_CARTE = 'Carte du monde'
THEME_CAPITALES = 'Capitales'
# Part des questions de carte dans une partie qui les inclut.
PART_CARTE = 0.2
# Poids d'un thème au tirage, par rapport aux autres (1 par défaut) : les
# capitales, nombreuses et toutes semblables, reviennent moins.
POIDS = {THEME_CAPITALES: 0.5, 'Drapeaux': 0.5, 'Silhouettes de pays': 0.5}
# Les thèmes illustrés, nombreux, pèsent moins : environ un tiers d'une partie.
POIDS_ILLUSTRE = 0.85
# Les questions illustrées (image ou rébus) : un réglage de la table.
URL_IMAGES = '/quiz/img/'
CREDITS = DOSSIER / 'credits.tsv'


@dataclass(frozen=True)
class Question:
    id: str
    theme: str
    # texte (réponse attendue) · ouverte (jugée par l'hôte) · carte
    type: str
    enonce: str
    # Réponses admises (texte), la première est montrée.
    reponses: tuple[str, ...] = ()
    # Ouverte : ce que l'hôte peut attendre.
    indication: str = ''
    # Carte : le code du pays à placer.
    cible: str = ''
    # Illustration : un fichier d'image (et son crédit), ou un rébus.
    image: str = ''
    credit: str = ''
    source: str = ''
    rebus: str = ''
    # Fichier de questions d'où elle vient (vide : tirée des pays).
    fichier: str = ''

    @property
    def illustree(self) -> bool:
        return bool(self.image or self.rebus)

    @property
    def solution(self) -> str:
        if self.type == 'carte':
            return PAYS[self.cible].nom
        if self.type == 'ouverte':
            return self.indication
        return self.reponses[0]

    def vue(self) -> dict[str, object]:
        """Ce que les joueurs voient pendant la question."""
        v: dict[str, object] = {'id': self.id, 'theme': self.theme,
                                'type': self.type, 'enonce': self.enonce}
        if self.image:
            v['image'] = URL_IMAGES + self.image
        if self.rebus:
            v['rebus'] = self.rebus
        return v

    def vue_solution(self) -> dict[str, object]:
        v = {**self.vue(), 'solution': self.solution}
        if self.credit:
            v['credit'] = self.credit
        if self.source:
            v['source'] = self.source
        if self.type == 'texte':
            v['variantes'] = list(self.reponses[1:])
        if self.type == 'carte':
            p = PAYS[self.cible]
            v.update(cible=self.cible, lat=p.lat, lon=p.lon)
        return v


def empreinte(texte: str) -> str:
    return hashlib.sha1(texte.encode('utf-8')).hexdigest()[:12]


class ErreurBanque(Exception):
    """Ligne illisible dans un fichier de questions."""


def lire_credits(chemin: Path = CREDITS) -> dict[str, tuple[str, str]]:
    """Fichier d'image -> (« auteur · licence », adresse de la source)."""
    if not chemin.is_file():
        return {}
    credits = {}
    for ligne in chemin.read_text(encoding='utf-8').splitlines():
        champs = ligne.split('	')
        if len(champs) >= 3 and not ligne.startswith('#'):
            auteur, licence = champs[1].strip(), champs[2].strip()
            source = champs[3].strip() if len(champs) > 3 else ''
            credits[champs[0]] = (
                ' · '.join(x for x in (auteur, licence) if x), source)
    return credits


def _illustration(ligne: str) -> tuple[str, str, str]:
    """(image, rébus, reste de la ligne) d'une ligne de question."""
    if ligne.startswith('[') and ']' in ligne:
        image, reste = ligne[1:].split(']', 1)
        return image.strip(), '', reste.strip()
    if ligne.startswith('{') and '}' in ligne:
        rebus, reste = ligne[1:].split('}', 1)
        return '', rebus.strip(), reste.strip()
    return '', '', ligne


def lire_fichier(chemin: Path,
                 credits: dict[str, tuple[str, str]] | None = None,
                 ) -> list[Question]:
    theme = chemin.stem.capitalize()
    credits = credits or {}
    questions = []
    for n, brute in enumerate(chemin.read_text(encoding='utf-8')
                              .splitlines(), 1):
        ligne = brute.strip()
        if not ligne or ligne.startswith('#'):
            continue
        if ligne.startswith('@'):
            theme = ligne[1:].strip()
            continue
        image, rebus, ligne = _illustration(ligne)
        credit, source = credits.get(image, ('', ''))
        illus: dict[str, Any] = {
            'image': image, 'rebus': rebus, 'credit': credit,
            'source': source, 'fichier': chemin.name}
        # L'empreinte tient compte de l'illustration : « Quel est ce pays ? »
        # revient sous mille images.
        cle = image + rebus
        if ' = ' in ligne:
            enonce, reste = ligne.split(' = ', 1)
            reponses = tuple(r.strip() for r in reste.split('|')
                             if r.strip())
            if not reponses:
                raise ErreurBanque('%s:%d : réponse vide' % (chemin.name, n))
            questions.append(Question(
                't' + empreinte(cle + enonce.strip()), theme, 'texte',
                enonce.strip(), reponses, **illus))
        elif ' ~ ' in ligne:
            enonce, indication = ligne.split(' ~ ', 1)
            questions.append(Question(
                'o' + empreinte(cle + enonce.strip()), theme, 'ouverte',
                enonce.strip(), indication=indication.strip(), **illus))
        else:
            raise ErreurBanque('%s:%d : ni « = » ni « ~ »' % (chemin.name, n))
    return questions


def questions_pays() -> list[Question]:
    """Placer un pays, placer le pays d'une capitale, nommer une capitale."""
    qs = []
    for p in PAYS.values():
        qs.append(Question('cp' + p.code, THEME_CARTE, 'carte',
                           'Placez sur la carte : %s' % p.nom, cible=p.code))
        if not p.capitale:
            continue
        qs.append(Question('ct' + p.code, THEME_CAPITALES, 'texte',
                           'Quelle est la capitale %s ?' % p.de,
                           (p.capitale, *p.variantes)))
        if normaliser(p.capitale) != normaliser(p.nom):
            qs.append(Question('cc' + p.code, THEME_CARTE, 'carte',
                               'Placez le pays dont la capitale est %s'
                               % p.capitale, cible=p.code))
    return qs


def charger(dossier: Path = DOSSIER) -> list[Question]:
    qs = []
    credits = lire_credits(dossier / CREDITS.name)
    for chemin in sorted(dossier.glob('*.txt')):
        qs += lire_fichier(chemin, credits)
    qs += questions_pays()
    vus: set[str] = set()
    uniques = []
    for q in qs:
        if q.id not in vus:
            vus.add(q.id)
            uniques.append(q)
    return uniques


class Banque:
    def __init__(self, questions: list[Question]) -> None:
        self.questions = questions
        self.par_id = {q.id: q for q in questions}

    def themes(self) -> dict[str, int]:
        compte: dict[str, int] = defaultdict(int)
        for q in self.questions:
            compte[q.theme] += 1
        return dict(compte)

    def tirer(self, n: int, rng: random.Random, vues: dict[str, int],
              carte: bool = True, ouvertes: bool = True,
              images: bool = True,
              exclues: frozenset[str] | set[str] = frozenset(),
              ) -> list[Question]:
        """`n` questions, de thèmes variés, en évitant celles que les joueurs
        ont déjà vues (`vues` : question -> nombre de joueurs qui l'ont vue).
        Chaque question est tirée dans un thème pris au hasard (poids : la
        racine du nombre de questions restantes), jamais deux fois de suite
        le même ; la carte vaut `PART_CARTE` des questions. `exclues` : les
        questions écartées (signalées non conformes)."""
        candidates = [q for q in self.questions
                      if (carte or q.type != 'carte')
                      and (ouvertes or q.type != 'ouverte')
                      and (images or not q.illustree)
                      and q.id not in exclues]
        rng.shuffle(candidates)
        # Les moins vues d'abord ; à vue égale, l'ordre du mélange.
        candidates.sort(key=lambda q: vues.get(q.id, 0))
        par_theme: dict[str, list[Question]] = defaultdict(list)
        for q in candidates:
            par_theme[q.theme].append(q)
        choisies: list[Question] = []
        precedent: str | None = None
        for _ in range(n):
            themes = [t for t, qs in par_theme.items() if qs]
            if not themes:
                break
            vue_min = min(vues.get(par_theme[t][0].id, 0) for t in themes)
            # Un thème épuisé des questions jamais vues attend les autres.
            themes = [t for t in themes
                      if vues.get(par_theme[t][0].id, 0) == vue_min]
            if carte and THEME_CARTE in themes and len(themes) > 1:
                if rng.random() < PART_CARTE and precedent != THEME_CARTE:
                    themes = [THEME_CARTE]
                else:
                    themes.remove(THEME_CARTE)
            if (len(themes) > 1 and precedent is not None
                    and precedent in themes):
                themes.remove(precedent)
            poids = [math.sqrt(len(par_theme[t])) * POIDS.get(
                t, POIDS_ILLUSTRE if par_theme[t][0].illustree else 1)
                for t in themes]
            theme = rng.choices(themes, poids)[0]
            choisies.append(par_theme[theme].pop(0))
            precedent = theme
        return choisies


BANQUE = Banque(charger())

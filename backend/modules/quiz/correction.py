"""Correction automatique d'une réponse libre : une proposition, que l'hôte
confirme ou renverse pendant la revue.

Une réponse est juste si, une fois normalisée (casse, accents, ponctuation et
article de tête retirés), elle égale l'une des réponses admises, à quelques
fautes de frappe près (distance d'édition bornée selon la longueur). Une
réponse attendue numérique (« 1789 ») se compare aux nombres de la réponse.
"""
from __future__ import annotations

import math
import re
import unicodedata

ARTICLES = {'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd',
            'the', 'a', 'an', 'el', 'los', 'las', 'il', 'lo', 'der', 'die',
            'das'}
_NON_ALNUM = re.compile(r'[^a-z0-9]+')
_NOMBRE = re.compile(r'-?\d+(?:[.,]\d+)?')


def normaliser(texte: str) -> str:
    """Minuscules sans accents ni ponctuation, sans article de tête."""
    t = unicodedata.normalize('NFKD', str(texte).lower())
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = t.replace('œ', 'oe').replace('æ', 'ae').replace('ß', 'ss')
    t = t.replace('&', ' et ')
    mots = _NON_ALNUM.sub(' ', t).split()
    while len(mots) > 1 and mots[0] in ARTICLES:
        mots.pop(0)
    return ' '.join(mots)


def distance(a: str, b: str) -> int:
    """Distance d'édition (Levenshtein)."""
    if len(a) < len(b):
        a, b = b, a
    precedente = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        ligne = [i]
        for j, cb in enumerate(b, 1):
            ligne.append(min(precedente[j] + 1, ligne[j - 1] + 1,
                             precedente[j - 1] + (ca != cb)))
        precedente = ligne
    return precedente[-1]


def tolerance(attendue: str) -> int:
    n = len(attendue.replace(' ', ''))
    if n <= 3:
        return 0
    if n <= 6:
        return 1
    if n <= 11:
        return 2
    return 3


def _nombres(texte: str) -> list[str]:
    return [n.replace(',', '.') for n in _NOMBRE.findall(texte)]


def juste(reponse: str, admises: tuple[str, ...] | list[str]) -> bool:
    r = normaliser(reponse)
    if not r:
        return False
    for admise in admises:
        a = normaliser(admise)
        if not a:
            continue
        if _NOMBRE.fullmatch(admise.strip().replace(' ', '')):
            if admise.strip().replace(' ', '').replace(',', '.') in \
                    _nombres(reponse.replace(' ', '')):
                return True
            continue
        if r == a or r.replace(' ', '') == a.replace(' ', ''):
            return True
        if distance(r, a) <= tolerance(a):
            return True
    return False


def km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance à vol d'oiseau, en kilomètres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = (math.sin(dp / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2)
    return 2 * 6371 * math.asin(min(1.0, math.sqrt(h)))

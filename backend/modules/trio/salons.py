"""Tables de Trio, sur la base des jeux simples (`backend/commun/jeux.py`) :
victoires par joueur, coups transmis à la manche (`regles.py`)."""
from __future__ import annotations

from ...commun import jeux, salons as commun
from ...commun.salons import SalonIntrouvable  # noqa: F401
from .regles import CoupInvalide, Partie

MIN_JOUEURS = 3
MAX_JOUEURS = 6


class ErreurSalon(commun.ErreurSalon, CoupInvalide):
    """Demande refusée : le message est montré au joueur."""


class Salons(jeux.Salons):
    MIN_JOUEURS = MIN_JOUEURS
    MAX_JOUEURS = MAX_JOUEURS
    NOM_DEFAUT = 'Observatoire de %s'
    Erreur = ErreurSalon
    Partie = Partie
    COUPS = {
        'demander': ('cible', 'cote'),
        'retourner': ('place',),
    }

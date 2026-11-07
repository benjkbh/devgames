# flake8: noqa: F401  - réexports.
from __future__ import annotations

from typing import TYPE_CHECKING

from ..commun.routage import Fichier, Texte, exige
from .commun import sante
from .joueurs import presence, session
from ..modules import MODULES as _MODULES

if TYPE_CHECKING:
    from ..commun.routage import Route

# Clés des modules, dans l'ordre du registre. Tout joueur qui a un pseudo les
# ouvre tous.
MODULES = tuple(m.cle for m in _MODULES)

# Routes du noyau : (méthode, chemin exact) -> fonction.
NOYAU: dict[tuple[str, str], Route] = {
    # == joueur =============================================================
    # Sans pseudo : le pseudo de ce navigateur, le choisir, l'oublier.
    ('GET', '/api/session'): session.session_etat,
    ('POST', '/api/pseudo'): session.choisir,
    ('POST', '/api/logout'): session.quitter,

    # Sonde de santé, sans pseudo.
    ('GET', '/api/sante'): sante.sante,
    # Santé vue de l'interface et présence des joueurs : avec un pseudo.
    ('GET', '/api/presence'): presence.presence,
}


def _assembler() -> dict[tuple[str, str], Route]:
    """Routes du noyau et de chaque module (`backend/modules/`). Un chemin
    déclaré deux fois est une erreur de montage, signalée au démarrage."""
    table = dict(NOYAU)
    for m in _MODULES:
        for cle, route in m.routes.items():
            if cle in table:
                raise ValueError('route %s %s déclarée deux fois (module %s)'
                                 % (cle[0], cle[1], m.cle))
            table[cle] = route
    return table


# Toutes les routes exposées. Une route de module commence par
# `exige(req)` ; ses routes sont documentées dans son manifeste.
TABLE = _assembler()

# Taille maximale du corps d'une requête, en octets, quand elle dépasse la
# valeur par défaut du serveur (8 Kio).
TAILLE_CORPS: dict[tuple[str, str], int] = {
    cle: taille for m in _MODULES for cle, taille in m.taille_corps.items()}

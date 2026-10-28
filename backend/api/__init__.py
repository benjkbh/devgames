# flake8: noqa: F401  - réexports.
from __future__ import annotations

from typing import TYPE_CHECKING

from .commun.acces import (DROITS, MODULE_COMPTES, MODULES, ROLES, Fichier,
                           Texte, exige, exige_superadmin)
from .commun import sante
from .comptes import gestion, moncompte, presence, session
from ..modules import MODULES as _MODULES

if TYPE_CHECKING:
    from ..commun.routage import Route

# Routes du noyau : (méthode, chemin exact) -> fonction.
NOYAU: dict[tuple[str, str], Route] = {
    # == comptes ============================================================
    ('GET', '/api/session'): session.session_etat,
    ('POST', '/api/login'): session.session_ouvrir,
    ('POST', '/api/logout'): session.session_fermer,
    # Ouverte tant qu'aucun compte n'existe, fermée définitivement ensuite.
    ('POST', '/api/installation'): session.installation,

    # Le compte connecté, sur lui-même : tout compte, sans droit de module.
    ('GET', '/api/compte'): moncompte.compte_lire,
    ('POST', '/api/compte/mot-de-passe'): moncompte.mot_de_passe,
    ('POST', '/api/compte/sessions/fermer'): moncompte.sessions_fermer,

    # Superadmin uniquement ; le drapeau superadmin, au seul fondateur.
    ('GET', '/api/comptes'): gestion.comptes_lister,
    ('POST', '/api/comptes/creer'): gestion.comptes_creer,
    ('POST', '/api/comptes/modifier'): gestion.comptes_modifier,
    ('POST', '/api/comptes/supprimer'): gestion.comptes_supprimer,

    # Sonde de santé, sans session.
    ('GET', '/api/sante'): sante.sante,
    # Santé vue de l'interface et présence des comptes : tout compte actif.
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
# `exige(req, module, role)` ; ses routes sont documentées dans son manifeste.
TABLE = _assembler()

# Taille maximale du corps d'une requête, en octets, quand elle dépasse la
# valeur par défaut du serveur (8 Kio).
TAILLE_CORPS: dict[tuple[str, str], int] = {
    cle: taille for m in _MODULES for cle, taille in m.taille_corps.items()}

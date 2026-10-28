from __future__ import annotations

from typing import TYPE_CHECKING

from ...commun.routage import (NON_CONNECTE, REFUS, Fichier,  # noqa: F401
                               Texte, corps_objet, exige, exige_superadmin,
                               parametre_epoch, parametre_limite)
from ...metier.comptes import utilisateurs
from ...modules import MODULES as _MODULES

if TYPE_CHECKING:
    from typing import Any

    from ...commun.routage import Reponse  # noqa: F401
    from ...serveur import Requete
# Modules et rôles accordables, du moins au plus étendu ; rôles inclusifs,
# un seul par compte et par module. Chaque module les déclare dans son
# manifeste (`backend/modules/<module>/__init__.py`, où sont documentées ses
# routes) ; `frontend/src/modules/<module>/index.jsx` déclare les mêmes, avec
# leurs libellés (contrôle : `tests/test_partage.py`).
ROLES: dict[str, tuple[str, ...]] = {m.cle: m.roles for m in _MODULES}

MODULES = tuple(ROLES)

# Clés de droit accordables, `module:role`, stockées dans `comptes.droit`.
DROITS = tuple(utilisateurs.cle_droit(m, r)
               for m, roles in ROLES.items() for r in roles)

# Réservé aux superadmins, volontairement absent de `MODULES`.
MODULE_COMPTES = 'comptes'
def vue_du_compte(req: Requete) -> dict[str, Any] | None:
    """Ce que l'interface a besoin de savoir de la session en cours."""
    c = req.compte
    if c is None:
        return None
    roles = utilisateurs.roles_par_module(c, ROLES)
    return {
        'nom': c['nom'],
        'superadmin': bool(c['superadmin']),
        # Seul le fondateur nomme ou rétrograde un superadmin.
        'fondateur': bool(c['fondateur']),
        'cree_le': c['cree_le'],
        # Modules réellement ouverts et rôle tenu sur chacun, calculés ici
        # pour que l'interface ne duplique pas la règle.
        'modules': [m for m in MODULES if m in roles],
        'roles': roles,
    }

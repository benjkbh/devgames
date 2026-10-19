from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...metier.comptes import utilisateurs
from ...partage import CONSTANTES

if TYPE_CHECKING:
    from typing import Any

    from ...serveur import Requete
# Modules et rôles accordables, du moins au plus étendu ; rôles inclusifs,
# un seul par compte et par module. Liste dans `partage/constantes.json` ;
# `frontend/src/coque/modules.jsx` y ajoute les libellés (contrôle :
# `tests/test_partage.py`).
#
# Documenter ici, pour chaque module, ce que chaque rôle ouvre :
#
# clients   view      GET /api/clients
#           operator  POST /api/clients/{creer,modifier}
#           admin     POST /api/clients/supprimer
#
# uno       joueur    GET /api/uno/{salons,salon} ; POST /api/uno/{creer,
#                     rejoindre,quitter,exclure,regler,lancer,jouer,piocher,
#                     passer,uno,contrer} ; GET /api/uno/spectateur est sans compte
#                     (une table vue sans aucune main)
ROLES: dict[str, tuple[str, ...]] = {
    module: tuple(roles) for module, roles in CONSTANTES['modules'].items()}

MODULES = tuple(ROLES)

# Clés de droit accordables, `module:role`, stockées dans `comptes.droit`.
DROITS = tuple(utilisateurs.cle_droit(m, r)
               for m, roles in ROLES.items() for r in roles)

# Réservé aux superadmins, volontairement absent de `MODULES`.
MODULE_COMPTES = 'comptes'
class Texte:
    """Corps texte déjà formaté, pour une route qui ne rend pas du JSON."""

    entetes = ()

    def __init__(self, corps: Any, ctype: str) -> None:
        self.corps = corps.encode('utf-8')
        self.ctype = ctype
class Fichier:
    """Fichier à télécharger ; nom filtré contre l'injection d'en-tête."""

    def __init__(self, corps: Any, ctype: str, nom: str) -> None:
        self.corps = corps
        self.ctype = ctype
        propre = ''.join(c for c in nom if c.isalnum() or c in ' .-_')[:100]
        self.entetes = (('Content-Disposition',
                         'attachment; filename="%s"' % (propre or 'export')),)
if TYPE_CHECKING:
    # Retour d'une route : dict sérialisé en JSON, ou Texte/Fichier tel quel.
    Reponse = tuple[HTTPStatus, dict[str, Any] | Texte | Fichier]
def parametre_limite(req: Requete, defaut: Any, plafond: int) -> int:
    """Paramètre `limite`, borné à [1, plafond] ; `defaut` si illisible."""
    try:
        return min(plafond, max(1, int(req.parametre('limite',
                                                     str(defaut)))))
    except ValueError:
        return defaut
def parametre_epoch(req: Requete, nom: str) -> int | None:
    """Borne de date en epoch (s), ou None si absente ou illisible."""
    brut = req.parametre(nom)
    if not brut:
        return None
    try:
        v = int(float(brut))
    except ValueError:
        return None
    return v if v > 0 else None
# -- contrôle d'accès --------------------------------------------------------
REFUS = (HTTPStatus.FORBIDDEN, {'erreur': "Vous n'avez pas accès à cette "
                                          'fonctionnalité.'})
NON_CONNECTE = (HTTPStatus.UNAUTHORIZED, {'erreur': 'Connexion requise.'})
def exige(req: Requete, module: str,
           role: str | None = None) -> Reponse | None:
    """À appeler en tête de route. `(code, objet)` à rendre tel quel, ou None.

    `role` : rôle minimal exigé ; absent, un rôle quelconque suffit.
    401 sans session (l'interface montre la connexion), 403 sinon.
    """
    if req.utilisateur is None:
        return NON_CONNECTE
    if not req.peut(module, role):
        return REFUS
    return None
def exige_superadmin(req: Requete) -> Reponse | None:
    if req.utilisateur is None:
        return NON_CONNECTE
    c = req.compte
    if c is None or not c['actif'] or not c['superadmin']:
        return REFUS
    return None
def corps_objet(req: Requete) -> dict[str, Any]:
    """Corps JSON de la requête s'il est un objet, sinon `{}`."""
    return req.corps if isinstance(req.corps, dict) else {}
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

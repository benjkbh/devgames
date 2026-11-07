"""Ce qu'une route utilise : réponses, contrôle d'accès, lecture du corps et
des paramètres.

Hors du paquet `api` : un module (`backend/modules/`) l'importe sans charger
le registre des routes, qui l'importe lui-même.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

if TYPE_CHECKING:
    from typing import Any

    from ..serveur import Requete
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
    from collections.abc import Callable

    # Retour d'une route : dict sérialisé en JSON, ou Texte/Fichier tel quel.
    Reponse = tuple[HTTPStatus, dict[str, Any] | Texte | Fichier]
    # Une route : la requête, sa réponse.
    Route = Callable[[Requete], Reponse]
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
# Tout joueur qui a choisi un pseudo ouvre tous les modules : le seul
# contrôle est d'en avoir un.
SANS_PSEUDO = (HTTPStatus.UNAUTHORIZED, {'erreur': 'Choisissez un pseudo.'})
def exige(req: Requete) -> Reponse | None:
    """À appeler en tête de route. `(code, objet)` à rendre tel quel, ou None.

    401 sans pseudo : l'interface montre alors le choix du pseudo.
    """
    if req.pseudo is None:
        return SANS_PSEUDO
    return None
def corps_objet(req: Requete) -> dict[str, Any]:
    """Corps JSON de la requête s'il est un objet, sinon `{}`."""
    return req.corps if isinstance(req.corps, dict) else {}

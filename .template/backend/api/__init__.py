# flake8: noqa: F401  - réexports.
from .commun.acces import (DROITS, MODULE_COMPTES, MODULES, ROLES, Fichier,
                           Texte, exige, exige_superadmin)
from .commun import sante
from .comptes import gestion, moncompte, session

# Toutes les routes exposées : (méthode, chemin exact) -> fonction.
# Une route de module commence par `exige(req, module, role)`.
TABLE = {
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
}

# Taille maximale du corps d'une requête, en octets, quand elle dépasse la
# valeur par défaut du serveur (8 Kio).
TAILLE_CORPS: dict[tuple[str, str], int] = {}

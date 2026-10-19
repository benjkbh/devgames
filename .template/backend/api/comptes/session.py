from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...metier.comptes import utilisateurs
from ..commun.acces import MODULES, ROLES, vue_du_compte

if TYPE_CHECKING:
    from ..commun.acces import Reponse
    from ...serveur import Requete
# -- session ----------------------------------------------------------------
def session_etat(req: Requete) -> Reponse:
    """État de la session ; `installation_requise` tant qu'aucun compte."""
    return HTTPStatus.OK, {
        'compte': vue_du_compte(req),
        'installation_requise': not utilisateurs.existe_un_compte(
            req.config.db_path),
        'modules': list(MODULES),
        'roles': {m: list(r) for m, r in ROLES.items()},
    }
def session_ouvrir(req: Requete) -> Reponse:
    reste = req.sessions.attente(req.adresse)
    if reste > 0:
        return HTTPStatus.TOO_MANY_REQUESTS, {
            'erreur': 'Trop de tentatives. Réessayez dans %d s.'
                      % int(reste + 1)}
    d = req.corps if isinstance(req.corps, dict) else {}
    nom = (d.get('nom') or '').strip()
    compte = utilisateurs.authentifier(req.config.db_path, nom,
                                       d.get('mot_de_passe'))
    if compte is None:
        req.sessions.echec(req.adresse)
        # Même message pour nom inconnu et mot de passe faux (énumération).
        return HTTPStatus.UNAUTHORIZED, {
            'erreur': 'Identifiants incorrects.'}
    req.sessions.succes(req.adresse)
    req.ouvrir_session(compte['nom'])
    req.journal('connexion')
    return HTTPStatus.OK, {'compte': vue_du_compte(req)}
def session_fermer(req: Requete) -> Reponse:
    if req.utilisateur:
        req.journal('déconnexion')
    req.fermer_session()
    return HTTPStatus.OK, {'compte': None}
def installation(req: Requete) -> Reponse:
    """Crée le premier compte (superadmin fondateur), sans session.

    409 dès qu'un compte existe.
    """
    if utilisateurs.existe_un_compte(req.config.db_path):
        return HTTPStatus.CONFLICT, {
            'erreur': 'Un compte existe déjà : utilisez le formulaire de '
                      'connexion.'}
    d = req.corps if isinstance(req.corps, dict) else {}
    try:
        compte = utilisateurs.creer(req.config.db_path,
                                    (d.get('nom') or '').strip(),
                                    d.get('mot_de_passe'),
                                    superadmin=True, fondateur=True)
    except utilisateurs.Refus as e:
        return HTTPStatus.BAD_REQUEST, {'erreur': str(e)}
    req.ouvrir_session(compte['nom'])
    req.journal('installation : superadministrateur créé')
    return HTTPStatus.CREATED, {'compte': vue_du_compte(req)}

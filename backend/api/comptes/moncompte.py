"""`/api/compte/*` : le compte connecté, sur lui-même.

Ouvert à tout compte actif, sans droit de module : on n'agit jamais que sur son
propre compte (le nom vient de la session, jamais de la requête).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...metier.comptes import utilisateurs
from ..commun.acces import NON_CONNECTE, corps_objet

if TYPE_CHECKING:
    from ...base.comptes.depot import CompteDetail
    from ..commun.acces import Reponse
    from ...serveur import Requete
def _courant(req: Requete) -> CompteDetail | None:
    """Le compte de la session, s'il est actif."""
    c = req.compte if req.utilisateur else None
    return c if c is not None and c['actif'] else None
# -- lecture -----------------------------------------------------------------
def compte_lire(req: Requete) -> Reponse:
    """Ce que la page du compte affiche en plus de la session : dates, nombre
    de sessions ouvertes et durée de vie d'une session."""
    c = _courant(req)
    if c is None:
        return NON_CONNECTE
    return HTTPStatus.OK, {
        'nom': c['nom'],
        'cree_le': c['cree_le'],
        'maj': c['maj'],
        'sessions': req.sessions.nombre(c['nom']),
        'session_ttl': req.config.session_ttl,
    }
# -- mot de passe ------------------------------------------------------------
def mot_de_passe(req: Requete) -> Reponse:
    """Change son propre mot de passe, sur présentation de l'actuel.

    L'ancien mot de passe est exigé : une session volée ne suffit pas à
    prendre le compte. Un essai raté compte dans la temporisation de
    connexion. Les autres sessions du compte sont fermées. Les refus de saisie
    sont rendus champ par champ, en `400` : un `401` ferait montrer le
    formulaire de connexion.
    """
    c = _courant(req)
    if c is None:
        return NON_CONNECTE
    reste = req.sessions.attente(req.adresse)
    if reste > 0:
        return HTTPStatus.TOO_MANY_REQUESTS, {
            'erreur': 'Trop de tentatives. Réessayez dans %d s.'
                      % int(reste + 1)}
    d = corps_objet(req)
    actuel, nouveau = d.get('actuel'), d.get('nouveau')
    if not utilisateurs.verifier(actuel, c['empreinte']):
        req.sessions.echec(req.adresse)
        return HTTPStatus.BAD_REQUEST, {
            'erreur': 'Mot de passe actuel incorrect.',
            'champs': {'actuel': 'Mot de passe actuel incorrect.'}}
    req.sessions.succes(req.adresse)
    if nouveau == actuel:
        return HTTPStatus.BAD_REQUEST, {
            'erreur': "Le nouveau mot de passe doit différer de l'actuel.",
            'champs': {'nouveau': 'Identique au mot de passe actuel.'}}
    try:
        # Contrôlé ici : `modifier` lit `None` comme « ne pas changer ».
        utilisateurs.controler_mot_de_passe(nouveau)
        utilisateurs.modifier(req.config.db_path, c['nom'],
                              mot_de_passe=nouveau, par=c)
    except utilisateurs.Refus as e:
        return HTTPStatus.BAD_REQUEST, {
            'erreur': str(e), 'champs': {'nouveau': str(e)}}
    fermees = req.sessions.fermer_autres(c['nom'], req.jeton)
    req.journal('mot de passe modifié (%d autre(s) session(s) fermée(s))'
                % fermees)
    return HTTPStatus.OK, {'ok': True, 'sessions_fermees': fermees}
# -- sessions ----------------------------------------------------------------
def sessions_fermer(req: Requete) -> Reponse:
    """Ferme les autres sessions du compte (autres navigateurs, autres
    postes) et garde celle-ci."""
    c = _courant(req)
    if c is None:
        return NON_CONNECTE
    fermees = req.sessions.fermer_autres(c['nom'], req.jeton)
    req.journal('autres sessions fermées : %d' % fermees)
    return HTTPStatus.OK, {'sessions_fermees': fermees}

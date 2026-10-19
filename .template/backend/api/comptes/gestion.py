"""`/api/comptes/*` : superadmins ; drapeau superadmin au seul fondateur."""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...metier.comptes import utilisateurs
from ..commun.acces import (DROITS, MODULES, ROLES,
                            exige_superadmin)

if TYPE_CHECKING:
    from collections.abc import Iterable, Mapping
    from typing import Any

    from ..commun.acces import Reponse
    from ...serveur import Requete
# -- gestion des comptes ----------------------------------------------------
def comptes_lister(req: Requete) -> Reponse:
    refus = exige_superadmin(req)
    if refus:
        return refus
    return HTTPStatus.OK, {
        'comptes': utilisateurs.lister(req.config.db_path),
        'modules': list(MODULES),
        'roles': {m: list(r) for m, r in ROLES.items()},
    }
REFUS_NOMMER = (HTTPStatus.FORBIDDEN, {
    'erreur': 'Seul le superadministrateur fondateur peut nommer ou '
              'rétrograder un superadministrateur.'})
REFUS_FONDATEUR = (HTTPStatus.FORBIDDEN, {
    'erreur': 'Le compte fondateur ne peut être administré que par '
              'lui-même.'})
def comptes_creer(req: Requete) -> Reponse:
    """Crée un compte ; le créer superadmin exige le fondateur."""
    refus = exige_superadmin(req)
    if refus:
        return refus
    d = req.corps if isinstance(req.corps, dict) else {}
    superadmin = bool(d.get('superadmin'))
    if superadmin and not utilisateurs.peut_nommer_superadmin(req.compte):
        return REFUS_NOMMER
    try:
        compte = utilisateurs.creer(
            req.config.db_path, (d.get('nom') or '').strip(),
            d.get('mot_de_passe'), droits=_droits_valides(d.get('droits')),
            superadmin=superadmin, par=req.compte)
    except utilisateurs.Refus as e:
        return HTTPStatus.BAD_REQUEST, {'erreur': str(e)}
    req.journal('compte créé : %s%s'
                % (compte['nom'], ' (superadmin)' if superadmin else ''))
    return HTTPStatus.CREATED, {'compte': _sans_empreinte(compte)}
def comptes_modifier(req: Requete) -> Reponse:
    """Modifie un compte.

    Drapeau superadmin accordé ou retiré par le seul fondateur ; le compte
    fondateur n'est modifiable que par lui-même.
    """
    refus = exige_superadmin(req)
    if refus:
        return refus
    d = req.corps if isinstance(req.corps, dict) else {}
    nom = (d.get('nom') or '').strip()
    actif = d.get('actif')
    if actif is not None and not isinstance(actif, bool):
        return HTTPStatus.BAD_REQUEST, {
            'erreur': 'champ booléen « actif » attendu'}
    superadmin = d.get('superadmin')
    if superadmin is not None:
        if not isinstance(superadmin, bool):
            return HTTPStatus.BAD_REQUEST, {
                'erreur': 'champ booléen « superadmin » attendu'}
        if not utilisateurs.peut_nommer_superadmin(req.compte):
            return REFUS_NOMMER
    # Contrôle sur le compte visé, quel que soit le champ modifié.
    cible = utilisateurs.compte(req.config.db_path, nom)
    if cible is not None and not utilisateurs.peut_administrer(req.compte,
                                                               cible):
        return REFUS_FONDATEUR
    try:
        compte = utilisateurs.modifier(
            req.config.db_path, nom,
            mot_de_passe=d.get('mot_de_passe'),
            droits=(None if d.get('droits') is None
                    else _droits_valides(d.get('droits'))),
            actif=actif, superadmin=superadmin, par=req.compte)
    except utilisateurs.Refus as e:
        return HTTPStatus.BAD_REQUEST, {'erreur': str(e)}
    # Droits relus à chaque requête : seule la désactivation ferme les
    # sessions.
    if actif is False:
        req.sessions.fermer_compte(nom)
    if superadmin is not None:
        req.journal('%s : superadmin %s'
                    % (nom, 'accordé' if superadmin else 'retiré'))
    req.journal('compte modifié : %s' % nom)
    return HTTPStatus.OK, {'compte': _sans_empreinte(compte)}
def comptes_supprimer(req: Requete) -> Reponse:
    refus = exige_superadmin(req)
    if refus:
        return refus
    d = req.corps if isinstance(req.corps, dict) else {}
    nom = (d.get('nom') or '').strip()
    if nom == req.utilisateur:
        return HTTPStatus.BAD_REQUEST, {
            'erreur': 'On ne supprime pas son propre compte.'}
    try:
        utilisateurs.supprimer(req.config.db_path, nom, par=req.compte)
    except utilisateurs.Refus as e:
        return HTTPStatus.BAD_REQUEST, {'erreur': str(e)}
    req.sessions.fermer_compte(nom)
    req.journal('compte supprimé : %s' % nom)
    return HTTPStatus.OK, {'nom': nom}
def _droits_valides(demandes: Iterable[object] | None) -> list[str]:
    """Droits connus seulement, le rôle le plus élevé par module."""
    retenus: dict[str, str] = {}
    for cle in (demandes or []):
        if cle not in DROITS:
            continue
        module, _, role = str(cle).partition(utilisateurs.SEPARATEUR_ROLE)
        rangs = ROLES[module]
        precedent = retenus.get(module)
        if precedent is None or rangs.index(role) > rangs.index(precedent):
            retenus[module] = role
    return [utilisateurs.cle_droit(m, r) for m, r in sorted(retenus.items())]
def _sans_empreinte(compte: Mapping[str, Any]) -> dict[str, Any]:
    return {c: v for c, v in compte.items() if c != 'empreinte'}

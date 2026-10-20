"""Comptes, mots de passe et droits par module.

Un droit est un rôle unique par module, écrit `module:role` ; les rôles sont
ordonnés du moins au plus étendu et chacun contient les précédents. Le
superadmin ignore la table des droits et tient tous les modules. Le
fondateur, créé à l'installation, est le seul à nommer ou retirer un
superadmin.

Le registre des modules (`api/commun/acces.py`) est reçu en paramètre.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import base64
import hashlib
import hmac
import os
import re

from ...base.comptes import depot

if TYPE_CHECKING:
    from collections.abc import (Callable, Collection, Iterable, Mapping,
                                 Sequence)

    from ...base.comptes.depot import Compte, CompteDetail

# -- hachage -----------------------------------------------------------------
# Paramètres scrypt pour une connexion interactive : 32 Mio, ~70 ms par essai.
SCRYPT = {'n': 2 ** 14, 'r': 8, 'p': 1, 'dklen': 32}

# Repli si l'interpréteur n'a pas scrypt (il dépend d'OpenSSL).
PBKDF2_ITERATIONS = 600_000

# Algorithme et paramètres sont écrits dans l'empreinte : les anciennes restent
# vérifiables après un changement de réglage.
SEPARATEUR = '$'

# Le nom apparaît dans le journal, les messages d'erreur et les URL.
NOM_VALIDE = re.compile(r'^[A-Za-z0-9._-]{2,32}$')
def _empreinte(mot_de_passe: str, sel: bytes | None = None) -> str:
    """Empreinte au format `algo$parametres$sel$condensat`, tout en base64."""
    sel = sel or os.urandom(16)
    if hasattr(hashlib, 'scrypt'):
        brut = hashlib.scrypt(mot_de_passe.encode('utf-8'), salt=sel, **SCRYPT)
        params = 'n=%d,r=%d,p=%d' % (SCRYPT['n'], SCRYPT['r'], SCRYPT['p'])
        algo = 'scrypt'
    else:
        brut = hashlib.pbkdf2_hmac('sha256', mot_de_passe.encode('utf-8'),
                                   sel, PBKDF2_ITERATIONS)
        params = 'i=%d' % PBKDF2_ITERATIONS
        algo = 'pbkdf2'
    b64 = base64.b64encode
    return SEPARATEUR.join([algo, params, b64(sel).decode('ascii'),
                            b64(brut).decode('ascii')])
def verifier(mot_de_passe: object, empreinte: str | None) -> bool:
    """Vrai si le mot de passe correspond. Temps constant, ne lève jamais."""
    if not isinstance(mot_de_passe, str) or not empreinte:
        return False
    try:
        algo, params, sel64, attendu64 = empreinte.split(SEPARATEUR)
        sel = base64.b64decode(sel64)
        attendu = base64.b64decode(attendu64)
        if algo == 'scrypt':
            reglages = dict(p.split('=') for p in params.split(','))
            obtenu = hashlib.scrypt(
                mot_de_passe.encode('utf-8'), salt=sel,
                n=int(reglages['n']), r=int(reglages['r']),
                p=int(reglages['p']), dklen=len(attendu))
        elif algo == 'pbkdf2':
            iterations = int(params.split('=')[1])
            obtenu = hashlib.pbkdf2_hmac('sha256',
                                         mot_de_passe.encode('utf-8'),
                                         sel, iterations, len(attendu))
        else:
            return False
    except (ValueError, KeyError, TypeError):
        # Empreinte illisible : même réponse qu'un mauvais mot de passe.
        return False
    return hmac.compare_digest(obtenu, attendu)
# -- règles ------------------------------------------------------------------
def controler_nom(nom: str | None) -> str:
    nom = (nom or '').strip()
    if not NOM_VALIDE.match(nom):
        raise Refus('Le nom doit faire 2 à 32 caractères, parmi lettres, '
                    'chiffres, point, tiret et souligné.')
    return nom
def controler_mot_de_passe(mot_de_passe: object) -> str:
    """Exige une chaîne non vide, sans autre politique. Lève `Refus`."""
    if not isinstance(mot_de_passe, str) or not mot_de_passe:
        raise Refus('Le mot de passe ne peut pas être vide.')
    return mot_de_passe
# -- rôles -------------------------------------------------------------------
# Un droit s'écrit `module:role`.
SEPARATEUR_ROLE = ':'
def cle_droit(module: str, role: str | None) -> str:
    return '%s%s%s' % (module, SEPARATEUR_ROLE, role)
def role_tenu(droits: Collection[str], module: str,
              roles: Sequence[str]) -> str | None:
    """Le plus élevé des rôles tenus sur ce module, ou None.

    `roles` est ordonné du moins au plus étendu.
    """
    for role in reversed(list(roles)):
        if cle_droit(module, role) in droits:
            return role
    return None
def peut_nommer_superadmin(demandeur: Compte | None) -> bool:
    """Seul le fondateur accorde ou retire le superadmin, à la création
    comme à la modification."""
    return bool(demandeur and demandeur.get('fondateur'))
def peut_administrer(demandeur: Compte | None,
                     cible: Compte | None) -> bool:
    """Le compte du fondateur, mot de passe compris, n'est administrable que
    par lui-même."""
    if not demandeur:
        return False
    if cible and cible.get('fondateur'):
        return demandeur.get('nom') == cible.get('nom')
    return True
def role_suffit(tenu: str | None, exige: str | None,
                roles: Sequence[str]) -> bool:
    """Vrai si `tenu` couvre `exige` : un rôle contient les précédents."""
    if tenu is None:
        return False
    liste = list(roles)
    if exige is None:
        return True
    try:
        return liste.index(tenu) >= liste.index(exige)
    except ValueError:
        return False
# -- lecture -----------------------------------------------------------------
# Réexportés du dépôt : les appelants passent par ce module.
compte = depot.compte
lister = depot.lister
existe_un_compte = depot.existe_un_compte

Refus = depot.Refus
def authentifier(chemin: str, nom: str,
                 mot_de_passe: object) -> CompteDetail | None:
    """Le compte si le mot de passe est bon, None sinon.

    Un compte inconnu ou inactif coûte le même temps, pour ne pas révéler les
    noms existants.
    """
    c = compte(chemin, nom)
    if c is None or not c['actif']:
        verifier(mot_de_passe if isinstance(mot_de_passe, str) else '',
                 _EMPREINTE_FACTICE)
        return None
    if not verifier(mot_de_passe, c['empreinte']):
        return None
    return c
def roles_par_module(compte_: CompteDetail | None,
                     registre: Mapping[str, Sequence[str]]) -> dict[str, str]:
    """`{module: role}` pour les modules ouverts au compte.

    `registre` est `{module: (role_le_plus_faible, …, role_le_plus_fort)}`.
    Un superadmin tient le rôle le plus élevé de chaque module.
    """
    if compte_ is None or not compte_['actif']:
        return {}
    if compte_['superadmin']:
        return {m: roles[-1] for m, roles in registre.items() if roles}
    tenus = {}
    for module, roles in registre.items():
        role = role_tenu(compte_['droits'], module, roles)
        if role is not None:
            tenus[module] = role
    return tenus
# -- écriture ----------------------------------------------------------------
# Contrôler la demande, hacher, puis confier au dépôt, qui tient les
# invariants de la table. `par=None` : appelant système, sans contrôle.
def creer(chemin: str, nom: str, mot_de_passe: object,
          droits: Iterable[str] | None = (), superadmin: bool | None = False,
          fondateur: bool = False,
          par: Compte | None = None) -> CompteDetail:
    """Crée un compte. Lève `Refus` si le nom est pris ou la demande invalide.

    `par` : compte demandeur ; créer un superadmin est une nomination.
    L'empreinte est calculée hors du verrou d'écriture du dépôt.
    """
    if superadmin and par is not None and not peut_nommer_superadmin(par):
        raise Refus('Seul le superadministrateur fondateur peut nommer un '
                    'superadministrateur.')
    nom = controler_nom(nom)
    mdp = controler_mot_de_passe(mot_de_passe)
    return depot.creer(chemin, nom, _empreinte(mdp), droits=droits,
                       superadmin=superadmin, fondateur=fondateur)
def modifier(chemin: str, nom: str, mot_de_passe: str | None = None,
             droits: Iterable[str] | None = None, actif: bool | None = None,
             superadmin: bool | None = None,
             par: Compte | None = None) -> CompteDetail:
    """Change ce qui est fourni, laisse le reste. Renvoie le compte à jour.

    `par` : compte demandeur, contrôlé ici même si la route l'a déjà fait.
    Lève `Refus`.
    """
    if (superadmin is not None and par is not None
            and not peut_nommer_superadmin(par)):
        raise Refus('Seul le superadministrateur fondateur peut nommer ou '
                    'rétrograder un superadministrateur.')
    empreinte = None
    if mot_de_passe is not None:
        controler_mot_de_passe(mot_de_passe)
        empreinte = _empreinte(mot_de_passe)
    return depot.modifier(
        chemin, nom, empreinte=empreinte, droits=droits, actif=actif,
        superadmin=superadmin,
        autorise=_habilitation(
            par, 'Le superadministrateur fondateur ne peut être modifié '
                 'que par lui-même.'))
def supprimer(chemin: str, nom: str,
              par: Compte | None = None) -> None:
    """Supprime un compte. Refuse le dernier superadmin et le fondateur."""
    return depot.supprimer(
        chemin, nom,
        autorise=_habilitation(
            par, 'Le superadministrateur fondateur ne peut être '
                 'administré que par lui-même.'))
def _habilitation(par: Compte | None,
                  motif: str) -> Callable[[Compte], str | None] | None:
    """Contrôle `cible -> motif de refus ou None`, évalué par le dépôt sous
    son verrou d'écriture. None si `par` est None."""
    if par is None:
        return None
    return lambda cible: None if peut_administrer(par, cible) else motif
# Vérifiée pour un compte inconnu, afin que l'échec coûte le même temps.
_EMPREINTE_FACTICE = _empreinte(base64.b64encode(os.urandom(24)).decode())

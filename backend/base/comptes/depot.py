"""CRUD des comptes : `utilisateur` et `droit`.

Reçoit des empreintes déjà calculées ; ne hache rien. Les invariants sur le
contenu de la table sont vérifiés dans la transaction de l'écriture.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, TypedDict, cast

import time

from ..commun.connexion import _connexion, _verrou_ecriture
from ..commun.dates import epoch, iso

if TYPE_CHECKING:
    import sqlite3
    from collections.abc import Callable, Iterable
    from typing import Any
class Refus(Exception):
    """Demande refusée, message montrable tel quel.

    Réexportée par `utilisateurs.py`.
    """
# Colonnes 0/1 converties en bool avant de quitter le module : en JSON, un
# `0` s'afficherait côté interface (`{x && <p/>}` rend « 0 »).
BOOLEENS = ('superadmin', 'actif', 'fondateur')
class Compte(TypedDict):
    """Un compte : son nom et ses drapeaux (ligne lue sous verrou)."""
    nom: str
    superadmin: bool
    fondateur: bool
    actif: bool
class CompteDetail(Compte):
    """Un compte tel que le rend `compte()`, empreinte et droits compris."""
    empreinte: str
    cree_le: int | None
    maj: int | None
    droits: list[str]
class CompteListe(Compte):
    """Un compte tel que le rend `lister()`, sans l'empreinte."""
    cree_le: int | None
    maj: int | None
    droits: list[str]

# Colonnes de `"comptes.utilisateur"` sous les clés de l'interface.
_CLES = {'nom': 'nom', 'empreinte': 'mot_de_passe_empreinte',
         'superadmin': 'superadmin', 'fondateur': 'fondateur',
         'actif': 'actif', 'cree_le': 'creation_date',
         'maj': 'modification_date'}
def _sql(*cles: str) -> str:
    return ', '.join('%s AS %s' % (_CLES[c], c) for c in cles)
def _normaliser(d: dict[str, Any]) -> dict[str, Any]:
    for cle in BOOLEENS:
        if cle in d:
            d[cle] = bool(d[cle])
    for cle in ('cree_le', 'maj'):
        if cle in d:
            d[cle] = epoch(d[cle])
    return d
# -- lecture -----------------------------------------------------------------
def compte(chemin: str, nom: str) -> CompteDetail | None:
    """L'utilisateur et ses droits, ou None."""
    with _connexion(chemin) as cx:
        ligne = cx.execute(
            'SELECT %s FROM "comptes.utilisateur" WHERE nom = ?'
            % _sql('nom', 'empreinte', 'superadmin', 'fondateur', 'actif',
                   'cree_le', 'maj'), (nom,)).fetchone()
        if ligne is None:
            return None
        droits = [d['module'] for d in cx.execute(
            'SELECT module FROM "comptes.droit" WHERE utilisateur_nom = ?'
            ' ORDER BY module', (nom,))]
    d = _normaliser(dict(ligne))
    d['droits'] = droits
    return cast(CompteDetail, d)
def lister(chemin: str) -> list[CompteListe]:
    """Tous les comptes, avec leurs droits, sans les empreintes."""
    with _connexion(chemin) as cx:
        comptes = [dict(ligne) for ligne in cx.execute(
            'SELECT %s FROM "comptes.utilisateur"'
            ' ORDER BY fondateur DESC, superadmin DESC, nom'
            % _sql('nom', 'superadmin', 'fondateur', 'actif', 'cree_le',
                   'maj'))]
        droits: dict[str, list[str]] = {}
        for ligne in cx.execute('SELECT utilisateur_nom, module'
                                '  FROM "comptes.droit"'):
            droits.setdefault(ligne['utilisateur_nom'], []).append(
                ligne['module'])
    for c in comptes:
        c['droits'] = sorted(droits.get(c['nom'], []))
    return [cast(CompteListe, _normaliser(c)) for c in comptes]
def existe_un_compte(chemin: str) -> bool:
    """Au moins un compte ; sinon l'installation est ouverte."""
    with _connexion(chemin) as cx:
        return cx.execute(
            'SELECT 1 FROM "comptes.utilisateur" LIMIT 1'
        ).fetchone() is not None
# -- écriture ----------------------------------------------------------------
def _relu(chemin: str, nom: str) -> CompteDetail:
    """Le compte qu'on vient d'écrire ; lève `Refus` s'il a disparu."""
    c = compte(chemin, nom)
    if c is None:
        raise Refus('Compte inconnu : %s' % nom)
    return c
def creer(chemin: str, nom: str, empreinte: str | None,
          droits: Iterable[str] | None = (), superadmin: bool | None = False,
          fondateur: bool = False) -> CompteDetail:
    """Insère un compte et ses droits. Rend le compte relu.

    `empreinte` : déjà calculée, hors du verrou d'écriture.
    """
    maintenant = iso(time.time())
    with _verrou_ecriture, _connexion(chemin) as cx:
        if cx.execute('SELECT 1 FROM "comptes.utilisateur" WHERE nom = ?',
                      (nom,)).fetchone():
            raise Refus('Le compte « %s » existe déjà.' % nom)
        # Jamais deux fondateurs.
        if fondateur and cx.execute('SELECT 1 FROM "comptes.utilisateur"'
                                    ' WHERE fondateur = 1').fetchone():
            raise Refus('Un superadministrateur fondateur existe déjà.')
        cx.execute(
            'INSERT INTO "comptes.utilisateur" (nom, mot_de_passe_empreinte,'
            '   superadmin, fondateur, actif, creation_date,'
            '   modification_date)'
            ' VALUES (?,?,?,?,1,?,?)',
            (nom, empreinte, 1 if superadmin else 0, 1 if fondateur else 0,
             maintenant, maintenant))
        _poser_droits(cx, nom, droits)
    return _relu(chemin, nom)
def modifier(
        chemin: str, nom: str, empreinte: str | None = None,
        droits: Iterable[str] | None = None, actif: bool | None = None,
        superadmin: bool | None = None,
        autorise: Callable[[Compte], str | None] | None = None
        ) -> CompteDetail:
    """Change ce qui est fourni, laisse le reste. Rend le compte à jour.

    `autorise(cible)`, appelée sur la ligne lue dans la transaction, rend
    None ou le motif du refus.
    """
    with _verrou_ecriture, _connexion(chemin) as cx:
        c = _lire_sous_verrou(cx, nom)
        if autorise is not None:
            motif = autorise(c)
            if motif:
                raise Refus(motif)
        # Le fondateur n'est jamais rétrogradé, désactivé ni supprimé.
        if superadmin is not None and c['fondateur'] and not superadmin:
            raise Refus('Le superadministrateur fondateur ne peut pas être '
                        'rétrogradé : personne ne pourrait plus nommer les '
                        'autres.')
        if empreinte:
            cx.execute('UPDATE "comptes.utilisateur"'
                       '   SET mot_de_passe_empreinte = ?,'
                       '       modification_date = ? WHERE nom = ?',
                       (empreinte, iso(time.time()), nom))
        if superadmin is not None and bool(superadmin) != c['superadmin']:
            # Il reste toujours un superadministrateur actif.
            if not superadmin and _derniers_superadmins(cx) <= 1:
                raise Refus('Impossible de rétrograder le dernier '
                            'superadministrateur : plus personne ne pourrait '
                            'gérer les comptes.')
            cx.execute('UPDATE "comptes.utilisateur"'
                       '   SET superadmin = ?, modification_date = ?'
                       ' WHERE nom = ?',
                       (1 if superadmin else 0, iso(time.time()), nom))
        if actif is not None:
            if c['fondateur'] and not actif:
                raise Refus('Le superadministrateur fondateur ne peut pas '
                            'être désactivé.')
            dernier = (c['superadmin'] and not actif
                       and _derniers_superadmins(cx) <= 1)
            if dernier:
                raise Refus('Impossible de désactiver le dernier '
                            'superadministrateur : plus personne ne pourrait '
                            'gérer les comptes.')
            cx.execute('UPDATE "comptes.utilisateur"'
                       '   SET actif = ?, modification_date = ?'
                       ' WHERE nom = ?',
                       (1 if actif else 0, iso(time.time()), nom))
        if droits is not None:
            cx.execute('DELETE FROM "comptes.droit" WHERE utilisateur_nom = ?',
                       (nom,))
            _poser_droits(cx, nom, droits)
    return _relu(chemin, nom)
def supprimer(
        chemin: str, nom: str,
        autorise: Callable[[Compte], str | None] | None = None) -> None:
    """Supprime un compte ; refuse le fondateur et le dernier superadmin.

    Droits supprimés explicitement, sans compter sur `ON DELETE CASCADE`.
    """
    with _verrou_ecriture, _connexion(chemin) as cx:
        c = _lire_sous_verrou(cx, nom)
        if autorise is not None:
            motif = autorise(c)
            if motif:
                raise Refus(motif)
        if c['fondateur']:
            raise Refus('Le superadministrateur fondateur ne peut pas être '
                        'supprimé.')
        if c['superadmin'] and _derniers_superadmins(cx) <= 1:
            raise Refus('Impossible de supprimer le dernier '
                        'superadministrateur : plus personne ne pourrait '
                        'gérer les comptes.')
        cx.execute('DELETE FROM "comptes.droit" WHERE utilisateur_nom = ?',
                   (nom,))
        cx.execute('DELETE FROM "comptes.utilisateur" WHERE nom = ?', (nom,))
# -- primitives, toutes sous la transaction de l'appelant --------------------
def _lire_sous_verrou(cx: sqlite3.Connection, nom: str) -> Compte:
    """La ligne, lue dans la transaction d'écriture.

    Pas `compte()`, qui ouvre sa propre connexion et lit hors transaction.
    """
    ligne = cx.execute(
        'SELECT %s FROM "comptes.utilisateur" WHERE nom = ?'
        % _sql('nom', 'superadmin', 'fondateur', 'actif'), (nom,)).fetchone()
    if ligne is None:
        raise Refus('Compte inconnu : %s' % nom)
    return cast(Compte, _normaliser(dict(ligne)))
def _derniers_superadmins(cx: sqlite3.Connection) -> int:
    return cx.execute('SELECT COUNT(*) AS n FROM "comptes.utilisateur"'
                      ' WHERE superadmin = 1 AND actif = 1'
                      ).fetchone()['n']
def _poser_droits(cx: sqlite3.Connection, nom: str,
                  droits: Iterable[str] | None) -> None:
    cx.executemany('INSERT OR IGNORE INTO "comptes.droit"'
                   ' (utilisateur_nom, module) VALUES (?,?)',
                   [(nom, m) for m in sorted(set(droits or ()))])

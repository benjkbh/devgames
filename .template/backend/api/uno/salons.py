"""`/api/uno/*` : tables de UNO (rôle `joueur` du module `uno`).

Le joueur est toujours le compte de la session, jamais un nom reçu. Les
actions rendent la table à jour, vue par le joueur : l'interface n'attend
pas le sondage suivant.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...metier.uno.regles import CoupInvalide
from ...metier.uno.salons import SalonIntrouvable
from ..commun.acces import corps_objet, exige

if TYPE_CHECKING:
    from collections.abc import Callable

    from ..commun.acces import Reponse
    from ...serveur import Requete

MODULE = 'uno'
ROLE = 'joueur'


def _proteger(req: Requete, action: Callable[[str], Reponse]) -> Reponse:
    """Contrôle d'accès, puis `action(joueur)` ; erreurs de jeu en 4xx."""
    refus = exige(req, MODULE, ROLE)
    if refus:
        return refus
    joueur = str(req.utilisateur)
    try:
        return action(joueur)
    except SalonIntrouvable as e:
        return HTTPStatus.NOT_FOUND, {'erreur': str(e)}
    except CoupInvalide as e:
        return HTTPStatus.CONFLICT, {'erreur': str(e)}


# -- lecture -----------------------------------------------------------------
def lister(req: Requete) -> Reponse:
    """Tables publiques ouvertes et tables où le joueur est assis."""
    return _proteger(req, lambda j: (HTTPStatus.OK, req.uno.lister(j)))


def salon(req: Requete) -> Reponse:
    """Une table, vue par le joueur (`?code=`)."""
    return _proteger(req, lambda j: (
        HTTPStatus.OK, req.uno.vue(req.parametre('code'), j)))


# -- table -------------------------------------------------------------------
def creer(req: Requete) -> Reponse:
    corps = corps_objet(req)

    def action(j: str) -> Reponse:
        code = req.uno.creer(j, corps.get('nom'), corps.get('public', True))
        req.journal('uno : table %s créée' % code)
        return HTTPStatus.OK, req.uno.vue(code, j)
    return _proteger(req, action)


def rejoindre(req: Requete) -> Reponse:
    corps = corps_objet(req)

    def action(j: str) -> Reponse:
        code = req.uno.rejoindre(corps.get('code'), j)
        return HTTPStatus.OK, req.uno.vue(code, j)
    return _proteger(req, action)


def quitter(req: Requete) -> Reponse:
    corps = corps_objet(req)

    def action(j: str) -> Reponse:
        req.uno.quitter(corps.get('code'), j)
        return HTTPStatus.OK, {'ok': True}
    return _proteger(req, action)


def lancer(req: Requete) -> Reponse:
    corps = corps_objet(req)

    def action(j: str) -> Reponse:
        req.uno.lancer(corps.get('code'), j)
        return HTTPStatus.OK, req.uno.vue(corps.get('code'), j)
    return _proteger(req, action)


# -- coups -------------------------------------------------------------------
def _coup(nom: str) -> Callable[[Requete], Reponse]:
    """Route d'un coup de jeu : `jouer`, `piocher`, `passer`, `uno`,
    `contrer`. Le corps porte `code` et les paramètres du coup."""
    def route(req: Requete) -> Reponse:
        corps = corps_objet(req)

        def action(j: str) -> Reponse:
            req.uno.agir(corps.get('code'), j, nom,
                         carte=corps.get('carte'),
                         couleur=corps.get('couleur'),
                         uno=corps.get('uno'),
                         cible=corps.get('cible'))
            return HTTPStatus.OK, req.uno.vue(corps.get('code'), j)
        return _proteger(req, action)
    route.__name__ = 'uno_%s' % nom
    return route


jouer = _coup('jouer')
piocher = _coup('piocher')
passer = _coup('passer')
dire_uno = _coup('uno')
contrer = _coup('contrer')

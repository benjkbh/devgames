"""`/api/codenames/*` : tables de Code Names (rôle `joueur` du module
`codenames`).

Le joueur est toujours le compte de la session, jamais un nom reçu. Les
actions rendent la table à jour, vue par le joueur : l'interface n'attend
pas le sondage suivant.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...metier.codenames.regles import CoupInvalide
from ...metier.codenames.salons import SalonIntrouvable
from ..commun.acces import corps_objet, exige

if TYPE_CHECKING:
    from collections.abc import Callable
    from typing import Any

    from ...metier.codenames.salons import Salons
    from ..commun.acces import Reponse
    from ...serveur import Requete

    # Une demande sur la table : `appel(salons, corps, joueur)`.
    Appel = Callable[[Salons, dict[str, Any], str], None]

MODULE = 'codenames'
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
    return _proteger(req, lambda j: (HTTPStatus.OK,
                                     req.codenames.lister(j)))


def salon(req: Requete) -> Reponse:
    """Une table, vue par le joueur (`?code=`)."""
    return _proteger(req, lambda j: (
        HTTPStatus.OK, req.codenames.vue(req.parametre('code'), j)))


# -- table et coups ----------------------------------------------------------
def creer(req: Requete) -> Reponse:
    corps = corps_objet(req)

    def action(j: str) -> Reponse:
        code = req.codenames.creer(j, corps.get('nom'),
                                   corps.get('public', True),
                                   corps.get('liste'))
        req.journal('codenames : table %s créée' % code)
        return HTTPStatus.OK, req.codenames.vue(code, j)
    return _proteger(req, action)


def rejoindre(req: Requete) -> Reponse:
    corps = corps_objet(req)

    def action(j: str) -> Reponse:
        code = req.codenames.rejoindre(corps.get('code'), j)
        return HTTPStatus.OK, req.codenames.vue(code, j)
    return _proteger(req, action)


def quitter(req: Requete) -> Reponse:
    corps = corps_objet(req)

    def action(j: str) -> Reponse:
        req.codenames.quitter(corps.get('code'), j)
        return HTTPStatus.OK, {'ok': True}
    return _proteger(req, action)


def _route(appel: Appel) -> Callable[[Requete], Reponse]:
    """Route d'une demande sur la table : `appel(salons, corps, joueur)`,
    puis la table vue par le joueur."""
    def route(req: Requete) -> Reponse:
        corps = corps_objet(req)

        def action(j: str) -> Reponse:
            appel(req.codenames, corps, j)
            return HTTPStatus.OK, req.codenames.vue(corps.get('code'), j)
        return _proteger(req, action)
    route.__name__ = 'codenames_%s' % appel.__name__
    return route


def _exclure(s: Salons, corps: dict[str, Any],
             j: str) -> None:
    s.exclure(corps.get('code'), j, corps.get('joueur'))


def _choisir(s: Salons, corps: dict[str, Any],
             j: str) -> None:
    s.choisir(corps.get('code'), j, corps.get('equipe'),
              bool(corps.get('oracle')))


def _melanger(s: Salons, corps: dict[str, Any],
              j: str) -> None:
    s.melanger(corps.get('code'), j)


def _regler(s: Salons, corps: dict[str, Any],
            j: str) -> None:
    s.regler(corps.get('code'), j, corps.get('liste'))


def _lancer(s: Salons, corps: dict[str, Any],
            j: str) -> None:
    s.lancer(corps.get('code'), j)


def _coup(nom: str) -> Appel:
    def appel(s: Salons, corps: dict[str, Any],
              j: str) -> None:
        s.agir(corps.get('code'), j, nom, mot=corps.get('mot'),
               nombre=corps.get('nombre'), carte=corps.get('carte'))
    appel.__name__ = nom
    return appel


exclure = _route(_exclure)
choisir = _route(_choisir)
melanger = _route(_melanger)
regler = _route(_regler)
lancer = _route(_lancer)
indice = _route(_coup('indice'))
marquer = _route(_coup('marquer'))
reveler = _route(_coup('reveler'))
finir = _route(_coup('finir'))

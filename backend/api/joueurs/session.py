"""Le joueur de ce navigateur : son pseudo, le choix d'un pseudo, la
déconnexion. Routes ouvertes sans pseudo."""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from ...commun.routage import corps_objet
from ...metier.joueurs.pseudos import PseudoPris, PseudoRefuse
from ...modules import MODULES

if TYPE_CHECKING:
    from ...commun.routage import Reponse
    from ...serveur import Requete


def session_etat(req: Requete) -> Reponse:
    """Le pseudo de ce navigateur (None : à choisir) et les modules."""
    return HTTPStatus.OK, {
        'pseudo': req.pseudo,
        'modules': [m.cle for m in MODULES],
    }


def choisir(req: Requete) -> Reponse:
    """`POST /api/pseudo` `{pseudo}` : le pseudo est donné à ce navigateur
    (cookie). 400 s'il est invalide ; 409 s'il est réservé, avec `reste`,
    les secondes avant qu'il se libère."""
    ancien = req.pseudo
    try:
        pseudo = req.choisir_pseudo(corps_objet(req).get('pseudo'))
    except PseudoRefuse as e:
        return HTTPStatus.BAD_REQUEST, {'erreur': str(e)}
    except PseudoPris as e:
        return HTTPStatus.CONFLICT, {'erreur': str(e), 'reste': e.reste}
    if pseudo != ancien:
        req.journal('pseudo choisi%s' % (' (était %s)' % ancien
                                         if ancien else ''))
    return HTTPStatus.OK, {'pseudo': pseudo}


def quitter(req: Requete) -> Reponse:
    """`POST /api/logout` : le navigateur oublie son pseudo, qui reste
    réservé une heure."""
    if req.pseudo:
        req.journal('déconnexion')
    req.quitter()
    return HTTPStatus.OK, {'pseudo': None}

"""Routes des tables d'un jeu (`backend/commun/salons.py`), sous
`/api/<module>/`.

Le joueur est toujours le compte de la session, jamais un nom reçu. Les
demandes rendent la table à jour, vue par le joueur : l'interface n'attend
pas le sondage suivant. Le registre des tables est l'état en mémoire du
module (`Module.etat`), lu par `req.etat(module)`.

Routes fournies par `routes()` :

    GET  salons                tables ouvertes et tables du joueur
    GET  salon?code=           une table, vue par le joueur
    POST creer                 nom, public et réglages du jeu
    POST rejoindre, quitter    code
    POST exclure               code, joueur (hôte)
    POST lancer                code (hôte)
    POST pret                  code, pret : prêt pour la prochaine manche
    POST reprendre             code : devenir hôte, l'hôte absent depuis
                               `DELAI_REPRISE`
    POST fermer                code (hôte) : la table disparaît pour tous

Le jeu y ajoute ses demandes (`demandes()`) et ses coups (`coups()`).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from http import HTTPStatus

from .routage import corps_objet, exige
from .salons import ErreurSalon, SalonIntrouvable

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable
    from typing import Any

    from ..serveur import Requete
    from .routage import Reponse, Route

    # Une demande sur la table : `appel(salons, corps, joueur)`.
    Appel = Callable[[Any, dict[str, Any], str], None]
    # Création : `creer(salons, corps, joueur)` rend le code de la table.
    Creation = Callable[[Any, dict[str, Any], str], str]


class RoutesSalons:
    """Routes des tables du module `module`, ouvertes au rôle `role`.
    `erreur` : l'erreur de coup du jeu, rendue en 409 comme les refus du
    salon."""

    def __init__(self, module: str, role: str,
                 erreur: type[Exception] = ErreurSalon) -> None:
        self.module = module
        self.role = role
        self.erreurs = (ErreurSalon, erreur)

    def chemin(self, nom: str) -> str:
        return '/api/%s/%s' % (self.module, nom)

    def salons(self, req: Requete) -> Any:
        """Le registre des tables du module (sa classe `Salons`)."""
        return req.etat(self.module)

    def proteger(self, req: Requete,
                 action: Callable[[str], Reponse]) -> Reponse:
        """Contrôle d'accès, puis `action(joueur)` ; erreurs de jeu en 4xx."""
        refus = exige(req, self.module, self.role)
        if refus:
            return refus
        joueur = str(req.utilisateur)
        try:
            return action(joueur)
        except SalonIntrouvable as e:
            return HTTPStatus.NOT_FOUND, {'erreur': str(e)}
        except self.erreurs as e:
            return HTTPStatus.CONFLICT, {'erreur': str(e)}

    def demande(self, nom: str, appel: Appel) -> Route:
        """Route d'une demande sur la table, puis la table vue par le
        joueur."""
        def route(req: Requete) -> Reponse:
            corps = corps_objet(req)

            def action(j: str) -> Reponse:
                appel(self.salons(req), corps, j)
                return HTTPStatus.OK, self.salons(req).vue(corps.get('code'),
                                                           j)
            return self.proteger(req, action)
        route.__name__ = '%s_%s' % (self.module, nom)
        return route

    # -- routes --------------------------------------------------------------
    def routes(self, creer: Creation) -> dict[tuple[str, str], Route]:
        """Les routes communes ; `creer` crée la table avec les réglages du
        jeu lus dans le corps."""
        def lister(req: Requete) -> Reponse:
            return self.proteger(req, lambda j: (
                HTTPStatus.OK, self.salons(req).lister(j)))

        def salon(req: Requete) -> Reponse:
            return self.proteger(req, lambda j: (
                HTTPStatus.OK,
                self.salons(req).vue(req.parametre('code'), j)))

        def creation(req: Requete) -> Reponse:
            corps = corps_objet(req)

            def action(j: str) -> Reponse:
                code = creer(self.salons(req), corps, j)
                req.journal('%s : table %s créée' % (self.module, code))
                return HTTPStatus.OK, self.salons(req).vue(code, j)
            return self.proteger(req, action)

        def rejoindre(req: Requete) -> Reponse:
            corps = corps_objet(req)

            def action(j: str) -> Reponse:
                code = self.salons(req).rejoindre(corps.get('code'), j)
                return HTTPStatus.OK, self.salons(req).vue(code, j)
            return self.proteger(req, action)

        def quitter(req: Requete) -> Reponse:
            corps = corps_objet(req)

            def action(j: str) -> Reponse:
                self.salons(req).quitter(corps.get('code'), j)
                return HTTPStatus.OK, {'ok': True}
            return self.proteger(req, action)

        def fermer(req: Requete) -> Reponse:
            corps = corps_objet(req)

            def action(j: str) -> Reponse:
                self.salons(req).fermer(corps.get('code'), j)
                req.journal('%s : table %s fermée' % (self.module,
                                                      corps.get('code')))
                return HTTPStatus.OK, {'ok': True}
            return self.proteger(req, action)

        return {
            ('GET', self.chemin('salons')): lister,
            ('GET', self.chemin('salon')): salon,
            ('POST', self.chemin('creer')): creation,
            ('POST', self.chemin('rejoindre')): rejoindre,
            ('POST', self.chemin('quitter')): quitter,
            ('POST', self.chemin('exclure')): self.demande(
                'exclure', lambda s, corps, j: s.exclure(
                    corps.get('code'), j, corps.get('joueur'))),
            ('POST', self.chemin('lancer')): self.demande(
                'lancer', lambda s, corps, j: s.lancer(corps.get('code'), j)),
            ('POST', self.chemin('pret')): self.demande(
                'pret', lambda s, corps, j: s.pret(
                    corps.get('code'), j, bool(corps.get('pret', True)))),
            ('POST', self.chemin('reprendre')): self.demande(
                'reprendre', lambda s, corps, j: s.reprendre(
                    corps.get('code'), j)),
            ('POST', self.chemin('fermer')): fermer,
        }

    def demandes(self, **appels: Appel) -> dict[tuple[str, str], Route]:
        """Demandes propres au jeu : `POST /api/<module>/<nom>`."""
        return {('POST', self.chemin(nom)): self.demande(nom, appel)
                for nom, appel in appels.items()}

    def coups(self, noms: Iterable[str],
              params: Iterable[str]) -> dict[tuple[str, str], Route]:
        """Un coup de la manche par route : `POST /api/<module>/<nom>`
        appelle `agir(code, joueur, nom, **params lus dans le corps)`."""
        params = tuple(params)

        def appel_de(nom: str) -> Appel:
            return lambda s, corps, j: s.agir(
                corps.get('code'), j, nom,
                **{p: corps.get(p) for p in params})
        return {('POST', self.chemin(nom)): self.demande(nom, appel_de(nom))
                for nom in noms}

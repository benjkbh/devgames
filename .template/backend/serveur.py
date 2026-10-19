from __future__ import annotations

from typing import TYPE_CHECKING

import json
import mimetypes
import traceback
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from . import api
from .metier.comptes import presence, sessions, utilisateurs
from .metier.uno import salons

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable
    from typing import Any

    from .base.comptes.depot import CompteDetail
    from .config import Config
    from urllib.parse import ParseResult


# Bundle Vite et API servis depuis la même origine, sans script en ligne.
# Pour autoriser une origine externe (images, API), l'ajouter ici, à la
# directive concernée, et la justifier.
CSP = ("default-src 'self'; base-uri 'none'; form-action 'self'; "
       "frame-ancestors 'none'; object-src 'none'")

# Caractères de contrôle échappés avant le journal (anti-forge d'entrées).
_CTRL = {c: '\\x%02x' % c for c in list(range(32)) + [127]}
def _sans_controle(texte: object) -> str:
    return str(texte).translate(_CTRL)
def _adresse_client(handler: BaseHTTPRequestHandler, sauts: int) -> str:
    """Adresse du client, remontée de `sauts` maillons de X-Forwarded-For.

    `sauts` à 0 : l'en-tête, fourni par le client, est ignoré.
    """
    pair = handler.address_string()
    if sauts <= 0:
        return pair
    maillons = [m.strip() for m
                in handler.headers.get('X-Forwarded-For', '').split(',')
                if m.strip()]
    if len(maillons) < sauts:
        return pair
    return _sans_controle(maillons[-sauts])[:64]
class CorpsInvalide(Exception):
    """Corps non consommé en entier : l'appelant doit fermer la connexion."""

    def __init__(self, code: int, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message

# Types que mimetypes ne devine pas toujours correctement sous Windows.
TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.map': 'application/json; charset=utf-8',
}
class Requete:
    """Ce qu'une route reçoit."""

    def __init__(self, handler: Handler, url: ParseResult,
                 corps: Any) -> None:
        self._h = handler
        self.config = handler.server.config
        self.sessions = handler.server.sessions
        # Tables de UNO, en mémoire comme les sessions.
        self.uno = handler.server.uno
        self.presence = handler.server.presence
        self.url = url
        self.corps = corps
        self.brut = getattr(handler, 'corps_brut', b'')
        self.adresse = _adresse_client(handler, self.config.trust_proxy)
        # Jeton de la session en cours : sert à fermer les autres sessions du
        # compte sans fermer celle-ci.
        self.jeton: str | None = handler.jeton()
        # Nom du compte seulement : les droits sont relus en base par `compte`.
        self.utilisateur: str | None = self.sessions.utilisateur(self.jeton)
        # Toute requête authentifiée vaut signe de vie du compte.
        if self.utilisateur:
            self.presence.signaler(self.utilisateur)
        self.cookie: str | None = None
        self._compte: CompteDetail | None = None

    def parametre(self, nom: str, defaut: Any = '') -> Any:
        return (parse_qs(self.url.query).get(nom) or [defaut])[0]

    @property
    def compte(self) -> CompteDetail | None:
        """Compte courant et ses droits, ou None. Lu une fois par requête."""
        if self._compte is None and self.utilisateur:
            self._compte = utilisateurs.compte(self.config.db_path,
                                               self.utilisateur)
        return self._compte

    def peut(self, module: str, role: str | None = None) -> bool:
        """L'utilisateur tient-il au moins ce rôle sur ce module ?

        `role` absent : un rôle quelconque suffit. Rôles inclusifs
        (`admin` > `operator` > `view`) ; un superadmin passe partout.
        """
        c = self.compte
        if c is None or not c['actif']:
            return False
        if c['superadmin']:
            return module in api.ROLES
        rangs = api.ROLES.get(module)
        if not rangs:
            return False
        tenu = utilisateurs.role_tenu(c['droits'], module, rangs)
        return utilisateurs.role_suffit(tenu, role, rangs)

    def ouvrir_session(self, nom: str) -> None:
        self.cookie = sessions.entete_cookie(self.sessions.ouvrir(nom),
                                             self.config.session_ttl,
                                             self.config.cookie_secure)
        self.utilisateur = nom
        self._compte = None
        self.presence.signaler(nom)

    def fermer_session(self) -> None:
        if self.jeton:
            self.sessions.fermer(self.jeton)
        if self.utilisateur:
            self.presence.oublier(self.utilisateur)
        self.cookie = sessions.entete_cookie('', 0, self.config.cookie_secure)
        self.utilisateur = None
        self._compte = None

    def journal(self, message: str) -> None:
        """Une ligne de journal, préfixée de l'adresse et du compte."""
        qui = '%s %s' % (self.adresse, self.utilisateur or '-')
        self._h.server.logger('info', '%s %s' % (qui, _sans_controle(message)))

    def erreur(self, message: str) -> None:
        """Erreur de route, avec la trace, au journal seulement."""
        qui = '%s %s' % (self.adresse, self.utilisateur or '-')
        self._h.server.logger('erreur', '%s %s\n%s' % (
            qui, _sans_controle(message), traceback.format_exc()))

class Handler(BaseHTTPRequestHandler):
    server: Serveur  # pyright: ignore[reportIncompatibleVariableOverride]

    protocol_version = 'HTTP/1.1'
    server_version = 'backend'

    # Secondes d'inactivité avant fermeture : un fil par connexion persistante.
    # Doit rester au-dessus du délai de rafraîchissement de l'interface.
    timeout = 30

    # En-têtes et corps partent en deux écritures : sans cela, Nagle et
    # l'acquittement retardé ajoutent ~40 ms à chaque réponse.
    disable_nagle_algorithm = True

    def log_message(self, format: str,  # noqa: A002 - nom de la classe mère
                    *args: object) -> None:
        # Ligne de requête fournie par le client : neutralisée avant journal.
        self.server.logger('info', '%s %s' % (self.address_string(),
                                              _sans_controle(format % args)))

    # -- primitives --------------------------------------------------------
    def jeton(self) -> str | None:
        brut = self.headers.get('Cookie')
        if not brut:
            return None
        morceau = SimpleCookie(brut).get(sessions.COOKIE)
        return morceau.value if morceau else None

    def _entetes_communs(self, ctype: str, taille: int,
                         cookie: str | None = None, cache: bool = False,
                         entetes: Iterable[tuple[str, str]] = ()) -> None:
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(taille))
        self.send_header('Cache-Control',
                         'public, max-age=31536000, immutable' if cache
                         else 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', CSP)
        if self.server.config.dev_origin:
            # Serveur de dév. Vite : cookie de session en cross-origin.
            self.send_header('Access-Control-Allow-Origin',
                             self.server.config.dev_origin)
            self.send_header('Access-Control-Allow-Credentials', 'true')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        for nom, valeur in entetes:
            self.send_header(nom, valeur)

    def envoyer(self, code: int, corps: Any, ctype: str,
                cookie: str | None = None, cache: bool = False,
                entetes: Iterable[tuple[str, str]] = ()) -> None:
        # Posé avant le premier octet : une écriture interrompue a déjà
        # commencé la réponse, `_sauf` ne doit pas en envoyer une seconde.
        self._repondu = True
        self.send_response(code)
        if self.close_connection:
            # Prévient un proxy amont de ne pas réutiliser la connexion.
            self.send_header('Connection', 'close')
        self._entetes_communs(ctype, len(corps), cookie, cache, entetes)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(corps)

    def envoyer_json(self, code: int, objet: Any,
                     cookie: str | None = None) -> None:
        corps = json.dumps(objet, ensure_ascii=False).encode('utf-8')
        self.envoyer(code, corps, 'application/json; charset=utf-8', cookie)

    def lire_corps(self, maxi: int = 8192) -> Any:
        """Consomme le corps (`maxi` octets au plus) et le décode en JSON.

        None si le corps est absent ou illisible mais entièrement consommé.
        Lève `CorpsInvalide` si le corps ne peut pas être lu jusqu'au bout,
        car des octets restants seraient relus comme la requête suivante.
        Octets bruts dans `corps_brut` (signature, webhook…).
        """
        self.corps_brut = b''
        if self.headers.get('Transfer-Encoding'):
            # Découpage en blocs non décodé : fin du corps inconnue.
            raise CorpsInvalide(HTTPStatus.NOT_IMPLEMENTED,
                                'Transfer-Encoding non supporté')
        brut = self.headers.get('Content-Length')
        if brut is None:
            return None
        try:
            n = int(brut)
        except ValueError:
            raise CorpsInvalide(HTTPStatus.BAD_REQUEST,
                                'Content-Length illisible') from None
        if n < 0:
            raise CorpsInvalide(HTTPStatus.BAD_REQUEST,
                                'Content-Length négatif')
        if n > maxi:
            raise CorpsInvalide(HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                                'corps trop volumineux : %d octets, '
                                'maximum %d' % (n, maxi))
        if n == 0:
            return None
        donnees = self.rfile.read(n)
        if len(donnees) != n:
            raise CorpsInvalide(HTTPStatus.BAD_REQUEST, 'corps incomplet')
        self.corps_brut = donnees
        try:
            return json.loads(donnees.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return None

    # -- statiques ---------------------------------------------------------
    def servir_statique(self, chemin: str) -> None:
        racine = self.server.config.static_dir.resolve()
        if not racine.is_dir():
            return self.envoyer_json(HTTPStatus.SERVICE_UNAVAILABLE, {
                'erreur': "Interface absente : le build Vite n'a pas été "
                          'déposé dans %s.' % racine})
        rel = chemin.lstrip('/') or 'index.html'
        try:
            cible = (racine / rel).resolve()
            # Traversée de répertoire : la cible doit rester sous la racine.
            cible.relative_to(racine)
        except (ValueError, OSError):
            cible = racine / 'index.html'
        if not cible.is_file():
            # Chemin inconnu : index.html, pour le routage côté client.
            cible = racine / 'index.html'
        if not cible.is_file():
            return self.envoyer_json(HTTPStatus.NOT_FOUND,
                                     {'erreur': 'index.html introuvable'})
        suffixe = cible.suffix.lower()
        ctype = TYPES.get(suffixe) or mimetypes.guess_type(str(cible))[0] \
            or 'application/octet-stream'
        # Noms empreintés par Vite sous assets/ : cache illimité.
        cache = rel.startswith('assets/')
        self.envoyer(HTTPStatus.OK, cible.read_bytes(), ctype, cache=cache)

    # -- dispatch ----------------------------------------------------------
    def _traiter(self, methode: str) -> None:
        url = urlparse(self.path)
        # Handler réutilisé d'une requête à l'autre sur la même connexion.
        self._repondu = False
        # Corps toujours consommé avant l'aiguillage, quelle que soit la
        # méthode, sinon la connexion est désynchronisée.
        try:
            corps = self.lire_corps(api.TAILLE_CORPS.get(
                (methode, url.path), 8192))
        except CorpsInvalide as e:
            self.close_connection = True
            return self.envoyer_json(e.code, {'erreur': e.message})
        route = api.TABLE.get((methode, url.path))
        if route is None:
            if methode in ('GET', 'HEAD') and not url.path.startswith('/api/'):
                # Même filet que les routes d'API : 500 journalisé plutôt
                # qu'une connexion coupée sans réponse.
                return self._sauf(url.path,
                                  lambda: self.servir_statique(url.path))
            return self.envoyer_json(HTTPStatus.NOT_FOUND,
                                     {'erreur': 'ressource inconnue'})
        requete = Requete(self, url, corps if methode == 'POST' else None)

        def repondre() -> None:
            code, objet = route(requete)
            # `api.Texte` / `api.Fichier` : la route fixe son propre type.
            if isinstance(objet, (api.Texte, api.Fichier)):
                return self.envoyer(code, objet.corps, objet.ctype,
                                    requete.cookie, entetes=objet.entetes)
            self.envoyer_json(code, objet, requete.cookie)

        self._sauf(url.path, repondre)

    def _sauf(self, chemin: str, action: Callable[[], object]) -> None:
        """Exécute `action`, et rend un 500 plutôt que de couper la connexion.

        Le détail de l'exception part au journal, jamais au client.
        """
        try:
            action()
        except Exception as e:                                   # noqa: BLE001
            self.server.logger('erreur', '%s erreur sur %s : %s: %s\n%s' % (
                self.address_string(), _sans_controle(chemin),
                type(e).__name__, e, traceback.format_exc()))
            if self._repondu:
                # Réponse déjà commencée : un 500 serait lu comme la réponse
                # à la requête suivante. On ferme.
                self.close_connection = True
                return
            self.envoyer_json(HTTPStatus.INTERNAL_SERVER_ERROR,
                              {'erreur': 'erreur interne'})

    def do_GET(self) -> None:
        self._traiter('GET')

    def do_HEAD(self) -> None:
        self._traiter('GET')

    def do_POST(self) -> None:
        self._traiter('POST')

    def do_OPTIONS(self) -> None:
        """Préflight CORS du serveur de développement Vite."""
        self.send_response(HTTPStatus.NO_CONTENT)
        if self.server.config.dev_origin:
            self.send_header('Access-Control-Allow-Origin',
                             self.server.config.dev_origin)
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST')
        self.send_header('Content-Length', '0')
        self.end_headers()
class Serveur(ThreadingHTTPServer):
    """Porte ce que les routes partagent : configuration, logger, sessions,
    présence des comptes et état en mémoire des modules (tables de UNO)."""

    def __init__(self, config: Config,
                 logger: Callable[[str, str], None]) -> None:
        super().__init__(('0.0.0.0', config.listen_port), Handler)
        self.config = config
        self.logger = logger
        self.sessions = sessions.Sessions(config.session_ttl)
        self.presence = presence.Presence()
        self.uno = salons.Salons()


def creer(config: Config, logger: Callable[[str, str], None]) -> Serveur:
    return Serveur(config, logger)

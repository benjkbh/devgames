"""Le serveur HTTP : consommation du corps, adresse du client, statiques,
authentification.

**Pourquoi ce fichier existe.** L'invariant **I5** de docs/securite.md - *le
corps d'une requête est toujours consommé, ou la connexion fermée* - avait un
incident d'origine documenté et **aucune vérification automatique** : quatre
`curl` dans une checklist manuelle, qu'on rejoue quand on y pense.

L'incident : une version antérieure renvoyait `None` sans lire les octets du
corps, qui étaient ensuite interprétés comme la requête SUIVANTE sur la même
connexion persistante. *Vérifié à l'époque : un corps commençant par
« GET /api/etat… » était réellement exécuté, et sa réponse s'ajoutait à la
première.* Inoffensif en direct ; dès qu'un proxy mutualise ses connexions
vers le backend, la requête et les réponses glissent sur la connexion d'un
autre utilisateur.

Deux niveaux, parce qu'aucun ne suffit seul :

  - `ConsommationDuCorps` teste `lire_corps` isolément, sur un faux handler.
    Rapide, précis, il dit QUELLE règle a cédé ;
  - `ConnexionPersistante` fait le tour complet sur une vraie socket. C'est le
    seul niveau où l'invariant a un sens : « une seule réponse » ne se vérifie
    pas sans connexion réelle.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, cast

import dataclasses
import http.client
import io
import json
import os
import pathlib
import socket
import tempfile
import threading
import unittest
from unittest import mock
from http import HTTPStatus
from urllib.parse import quote, urlencode

from backend import api, base, serveur
from tests import config_test, muet

if TYPE_CHECKING:
    from http.server import BaseHTTPRequestHandler
    from typing import Any

    from backend.serveur import Requete

class FauxHandler:
    """Le strict minimum que `lire_corps` touche : `headers` et `rfile`.

    On n'instancie pas `BaseHTTPRequestHandler` : son constructeur ouvre une
    socket et traite la requête. On emprunte donc la méthode à la classe et on
    lui fournit les deux attributs qu'elle lit - ce qui rend visible, au
    passage, à quel point sa dépendance à l'environnement est étroite.
    """

    def __init__(self, entetes: dict[str, str], corps: bytes = b'') -> None:
        self.headers = entetes
        self.rfile = io.BytesIO(corps)

    lire_corps = serveur.Handler.lire_corps
class ConsommationDuCorps(unittest.TestCase):

    def handler(self, corps: bytes = b'', **entetes: str) -> FauxHandler:
        return FauxHandler(entetes, corps)

    # -- ce qui est lisible ------------------------------------------------
    def test_un_corps_json_valide(self) -> None:
        corps = b'{"actif": true}'
        h = self.handler(corps, **{'Content-Length': str(len(corps))})
        self.assertEqual(h.lire_corps(), {'actif': True})

    def test_absence_de_corps(self) -> None:
        """Pas de `Content-Length` : il n'y a rien à lire, et c'est le cas de
        la quasi-totalité des requêtes."""
        self.assertIsNone(self.handler().lire_corps())

    def test_corps_de_longueur_nulle(self) -> None:
        self.assertIsNone(self.handler(b'', **{'Content-Length': '0'})
                          .lire_corps())

    # -- ce qui est illisible MAIS entièrement consommé --------------------
    def test_json_invalide_mais_consomme(self) -> None:
        """La distinction qui porte tout l'invariant : le corps est illisible,
        donc on rend `None` - mais les octets ont été LUS, donc la connexion
        reste saine et peut servir la requête suivante."""
        corps = b'ceci nest pas du json'
        h = self.handler(corps, **{'Content-Length': str(len(corps))})
        self.assertIsNone(h.lire_corps())
        self.assertEqual(h.rfile.read(), b'',
                         'des octets du corps sont restés dans le tampon')

    def test_utf8_invalide_mais_consomme(self) -> None:
        corps = b'\xff\xfe pas de l utf-8'
        h = self.handler(corps, **{'Content-Length': str(len(corps))})
        self.assertIsNone(h.lire_corps())
        self.assertEqual(h.rfile.read(), b'')

    # -- ce qui NE PEUT PAS être consommé : la connexion doit se fermer ----
    def test_transfer_encoding_refuse(self) -> None:
        """`BaseHTTPRequestHandler` ne décode pas le découpage en blocs : on
        ne sait pas où s'arrête le corps, donc on ne peut pas le jeter. C'est
        la voie classique de la désynchronisation de requêtes."""
        h = self.handler(b'4\r\ntest\r\n0\r\n\r\n',
                         **{'Transfer-Encoding': 'chunked'})
        with self.assertRaises(serveur.CorpsInvalide) as e:
            h.lire_corps()
        self.assertEqual(e.exception.code, HTTPStatus.NOT_IMPLEMENTED)

    def test_transfer_encoding_prime_sur_content_length(self) -> None:
        """Les deux en-têtes ensemble sont *la* recette du request smuggling :
        deux intermédiaires peuvent délimiter le corps différemment. Le refus
        doit l'emporter."""
        h = self.handler(b'4\r\ntest\r\n0\r\n\r\n',
                         **{'Transfer-Encoding': 'chunked',
                            'Content-Length': '4'})
        with self.assertRaises(serveur.CorpsInvalide):
            h.lire_corps()

    def test_content_length_illisible(self) -> None:
        h = self.handler(b'abc', **{'Content-Length': 'douze'})
        with self.assertRaises(serveur.CorpsInvalide) as e:
            h.lire_corps()
        self.assertEqual(e.exception.code, HTTPStatus.BAD_REQUEST)

    def test_content_length_negatif(self) -> None:
        h = self.handler(b'abc', **{'Content-Length': '-1'})
        with self.assertRaises(serveur.CorpsInvalide) as e:
            h.lire_corps()
        self.assertEqual(e.exception.code, HTTPStatus.BAD_REQUEST)

    def test_corps_trop_volumineux(self) -> None:
        """On refuse **sans lire** : lire 10 Mo pour les jeter serait offrir
        un déni de service. D'où la fermeture de connexion qui accompagne le
        413 - c'est le seul cas où l'on renonce délibérément à consommer."""
        h = self.handler(b'x' * 100, **{'Content-Length': '999999'})
        with self.assertRaises(serveur.CorpsInvalide) as e:
            h.lire_corps()
        self.assertEqual(e.exception.code, HTTPStatus.REQUEST_ENTITY_TOO_LARGE)

    def test_corps_incomplet(self) -> None:
        """Le client annonce plus qu'il n'envoie : ce qui reste à lire ne
        viendra jamais, la connexion est perdue de toute façon."""
        h = self.handler(b'abc', **{'Content-Length': '100'})
        with self.assertRaises(serveur.CorpsInvalide) as e:
            h.lire_corps()
        self.assertEqual(e.exception.code, HTTPStatus.BAD_REQUEST)
class NeutralisationDesJournaux(unittest.TestCase):
    """Les lignes de journal portent des données fournies par le client."""

    def test_les_caracteres_de_controle_sont_neutralises(self) -> None:
        """Sans cela, un simple saut de ligne dans une ligne de requête forge
        une entrée de journal complète - et le journal est ce qu'on lit pour
        comprendre un incident."""
        forge = 'GET /a\r\n127.0.0.1 "GET /admin" 200'
        sortie = serveur._sans_controle(forge)
        self.assertNotIn('\r', sortie)
        self.assertNotIn('\n', sortie)
        self.assertIn('\\x0d\\x0a', sortie)

    def test_le_texte_ordinaire_est_intact(self) -> None:
        """La neutralisation ne doit pas rendre les journaux illisibles : les
        accents et la ponctuation passent."""
        self.assertEqual(serveur._sans_controle('relevé de POSTE-02@SITE-D'),
                         'relevé de POSTE-02@SITE-D')

    def test_le_caractere_de_suppression_est_neutralise(self) -> None:
        self.assertEqual(serveur._sans_controle('a\x7fb'), 'a\\x7fb')
class AdresseDuClient(unittest.TestCase):
    """`X-Forwarded-For` n'est cru qu'à hauteur de `TRUST_PROXY`.

    L'enjeu n'est pas la justesse du journal : c'est que l'adresse SERT DE CLÉ
    à la temporisation des tentatives. En croire l'en-tête sans limite laisse
    l'appelant changer d'identité à chaque essai - donc annule la
    temporisation. Ne pas y croire du tout, derrière un proxy, range toutes
    les tentatives sous une seule clé - donc un attaquant verrouille la vue
    admin pour tout le monde.
    """

    class Faux:
        def __init__(self, pair: str, xff: str | None = None) -> None:
            self._pair = pair
            self.headers = {'X-Forwarded-For': xff} if xff else {}

        def address_string(self) -> str:
            return self._pair

    def adresse(self, h: Faux, sauts: int) -> str:
        """`_adresse_client` sur le faux : il n'a que ce qu'elle lit."""
        return serveur._adresse_client(
            cast('BaseHTTPRequestHandler', h), sauts)

    def test_sans_proxy_l_entete_est_ignore(self) -> None:
        h = self.Faux('10.0.0.1', '1.2.3.4')
        self.assertEqual(self.adresse(h, 0), '10.0.0.1')

    def test_un_saut_prend_le_dernier_maillon(self) -> None:
        """Le dernier maillon est celui que le proxy de confiance a AJOUTÉ ;
        ceux d'avant viennent du client et ne valent rien."""
        h = self.Faux('10.0.0.1', 'forge, 1.2.3.4')
        self.assertEqual(self.adresse(h, 1), '1.2.3.4')

    def test_deux_sauts_remontent_d_un_cran(self) -> None:
        h = self.Faux('10.0.0.1', '9.9.9.9, 1.2.3.4, 5.6.7.8')
        self.assertEqual(self.adresse(h, 2), '1.2.3.4')

    def test_un_entete_trop_court_retombe_sur_la_socket(self) -> None:
        """Le client annonce moins de sauts qu'il n'en existe : on ne peut pas
        savoir lequel est de confiance, on ne devine pas."""
        h = self.Faux('10.0.0.1', '1.2.3.4')
        self.assertEqual(self.adresse(h, 2), '10.0.0.1')

    def test_l_entete_est_neutralise_et_borne(self) -> None:
        """L'adresse retenue part au journal : elle vient du client, elle est
        donc traitée comme telle."""
        h = self.Faux('10.0.0.1', 'a\r\nb' + 'x' * 200)
        adresse = self.adresse(h, 1)
        self.assertNotIn('\n', adresse)
        self.assertLessEqual(len(adresse), 64)
class ConnexionPersistante(unittest.TestCase):
    """L'invariant I5 de bout en bout, sur une vraie socket.

    C'est le seul niveau où « une seule réponse » veut dire quelque chose :
    le défaut d'origine produisait DEUX réponses à une requête, et aucun test
    unitaire de `lire_corps` ne peut voir cela.
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls._dir = tempfile.TemporaryDirectory()
        # Un `Path`, comme en production : `servir_statique` appelle
        # `.resolve()` dessus.
        statique = pathlib.Path(cls._dir.name) / 'static'
        statique.mkdir()
        (statique / 'index.html').write_text(
            '<!doctype html><title>interface</title>', encoding='utf-8')
        # Port 0 : l'OS en attribue un libre.
        cls.cfg = config_test(db_path=os.path.join(cls._dir.name, 'etat.db'),
                              static_dir=statique, listen_port=0)
        from backend import base
        base.initialiser(cls.cfg.db_path, muet)
        # Route de test gardée par un module : sert aux contrôles de droits.
        cls._routes = mock.patch.dict(api.TABLE, {
            ('GET', '/api/_module'):
                lambda req: api.exige(req, 'accueil') or (HTTPStatus.OK, {}),
        })
        cls._routes.start()
        cls.srv = serveur.creer(cls.cfg, muet)
        cls.port = cls.srv.server_address[1]
        cls.fil = threading.Thread(target=cls.srv.serve_forever, daemon=True)
        cls.fil.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._routes.stop()
        cls.srv.shutdown()
        cls.srv.server_close()
        cls._dir.cleanup()

    def brut(self, requete: bytes) -> bytes:
        """Envoie des octets bruts et rend TOUT ce que le serveur répond."""
        s = socket.create_connection(('127.0.0.1', self.port), 5)
        s.settimeout(3)
        try:
            s.sendall(requete)
            recu = b''
            while True:
                try:
                    bout = s.recv(65536)
                except socket.timeout:
                    break
                if not bout:
                    break
                recu += bout
            return recu
        finally:
            s.close()

    def test_un_corps_clandestin_n_est_pas_execute(self) -> None:
        """**Le défaut d'origine.** Un GET porteur d'un corps qui ressemble à
        une requête : ces octets doivent être CONSOMMÉS, pas interprétés. Une
        seule réponse doit sortir."""
        clandestin = b'GET /api/session HTTP/1.1\r\nHost: x\r\n\r\n'
        recu = self.brut(
            b'GET /api/session HTTP/1.1\r\nHost: x\r\n'
            + b'Content-Length: %d\r\n\r\n' % len(clandestin) + clandestin)
        self.assertEqual(recu.count(b'HTTP/1.1 200'), 1,
                         'le corps a été interprété comme une seconde requête')

    def test_413_ferme_la_connexion_et_ne_repond_qu_une_fois(self) -> None:
        """Le corps n'est pas consommé - c'est assumé - donc la connexion DOIT
        être annoncée fermée, sinon les octets restants deviennent la requête
        suivante."""
        recu = self.brut(
            b'POST /api/login HTTP/1.1\r\nHost: x\r\n'
            b'Content-Type: application/json\r\n'
            b'Content-Length: 999999\r\n\r\n' + b'x' * 200)
        self.assertIn(b'413', recu.split(b'\r\n')[0])
        self.assertIn(b'Connection: close', recu)
        self.assertEqual(recu.count(b'HTTP/1.1 '), 1)

    def test_chunked_refuse_et_connexion_fermee(self) -> None:
        recu = self.brut(
            b'POST /api/login HTTP/1.1\r\nHost: x\r\n'
            b'Transfer-Encoding: chunked\r\n\r\n'
            b'4\r\ntest\r\n0\r\n\r\n')
        self.assertIn(b'501', recu.split(b'\r\n')[0])
        self.assertIn(b'Connection: close', recu)
        self.assertEqual(recu.count(b'HTTP/1.1 '), 1)

    def test_deux_requetes_sur_la_meme_connexion(self) -> None:
        """Le pendant positif : une connexion saine sert bien deux requêtes.
        Sans ce test, fermer la connexion à tout propos ferait passer les
        précédents sans rien garantir."""
        s = socket.create_connection(('127.0.0.1', self.port), 5)
        s.settimeout(3)
        try:
            corps = b'{"x": 1}'
            s.sendall(b'GET /api/session HTTP/1.1\r\nHost: x\r\n'
                      + b'Content-Length: %d\r\n\r\n' % len(corps) + corps)
            s.sendall(b'GET /api/session HTTP/1.1\r\nHost: x\r\n\r\n')
            recu = b''
            while recu.count(b'HTTP/1.1 200') < 2:
                bout = s.recv(65536)
                if not bout:
                    break
                recu += bout
            self.assertEqual(recu.count(b'HTTP/1.1 200'), 2)
        finally:
            s.close()

    # -- contrôles de la checklist de mise en production --------------------
    def demande(
            self, chemin: str, methode: str = 'GET', corps: str | None = None,
            entetes: dict[str, str] | None = None,
    ) -> tuple[int, dict[str, str], bytes]:
        cx = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            cx.request(methode, chemin, corps, entetes or {})
            r = cx.getresponse()
            return r.status, dict(r.getheaders()), r.read()
        finally:
            cx.close()

    def test_toutes_les_routes_de_donnees_exigent_une_session(self) -> None:
        """**Il n'y a pas de vue libre.** Toute route qui rend des données
        répond `401` sans session - et non `403` : la distinction compte
        pour l'interface, qui montre le formulaire sur l'un et un refus sur
        l'autre. Rendre `403` dans les deux cas ferait tourner en rond
        quelqu'un dont la session a simplement expiré.

        `/api/sante` et `/api/session` sont les exceptions.
        """
        for chemin in ('/api/comptes', '/api/compte', '/api/_module'):
            with self.subTest(route=chemin):
                code, _, _ = self.demande(chemin)
                self.assertEqual(code, HTTPStatus.UNAUTHORIZED)
        for chemin in ('/api/comptes/creer', '/api/comptes/modifier',
                       '/api/comptes/supprimer',
                       '/api/compte/mot-de-passe',
                       '/api/compte/sessions/fermer'):
            with self.subTest(route=chemin):
                code, _, _ = self.demande(
                    chemin, 'POST', json.dumps({'actif': False}),
                    {'Content-Type': 'application/json'})
                self.assertEqual(code, HTTPStatus.UNAUTHORIZED)

    def test_les_entetes_de_securite_sont_presents(self) -> None:
        code, entetes, _ = self.demande('/api/session')
        self.assertEqual(code, HTTPStatus.OK)
        self.assertIn('Content-Security-Policy', entetes)
        self.assertEqual(entetes.get('X-Frame-Options'), 'DENY')
        self.assertEqual(entetes.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(entetes.get('Referrer-Policy'), 'no-referrer')
        self.assertEqual(entetes.get('Cache-Control'), 'no-store')

    def test_la_politique_de_contenu_reste_sur_l_origine(self) -> None:
        """Ni script, ni style, ni connexion ne sortent de l'origine du
        site : toute dérogation est une décision, et ce test la rend
        visible."""
        _, entetes, _ = self.demande('/api/session')
        politique = entetes['Content-Security-Policy']
        self.assertIn("default-src 'self'", politique)
        for directive in ('script-src', 'style-src', 'connect-src',
                          'frame-src'):
            self.assertNotIn(directive, politique)
        self.assertNotIn('https://', politique)

    def test_la_traversee_de_repertoire_rend_l_interface(self) -> None:
        """La cible doit rester sous la racine : un chemin qui en sort rend
        `index.html`, jamais le fichier visé. Les trois formes sont testées -
        brute, encodée, et à séparateur encodé - parce que c'est le décodage
        d'URL qui fait la différence entre les trois."""
        for chemin in ('/../../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd',
                       '/..%2f..%2fetc%2fpasswd',
                       '/....//....//etc/passwd'):
            with self.subTest(chemin=chemin):
                code, _, corps = self.demande(chemin)
                self.assertEqual(code, HTTPStatus.OK)
                self.assertIn(b'interface', corps)
                self.assertNotIn(b'root:', corps)

    def test_un_chemin_inconnu_rend_l_interface(self) -> None:
        """Routage côté client : `/clients/admin` n'existe pas sur disque et
        doit tout de même rendre l'application sur un rechargement direct."""
        code, entetes, corps = self.demande('/clients/admin')
        self.assertEqual(code, HTTPStatus.OK)
        self.assertIn(b'interface', corps)
        self.assertIn('text/html', entetes.get('Content-Type', ''))

    def test_une_erreur_en_servant_un_statique_rend_un_500(self) -> None:
        """**L'asymétrie que ces tests ont trouvée.** Les routes d'API ont un
        filet qui rend un 500 et journalise ; le service de fichiers n'en
        avait pas, et une exception - fichier disparu entre le contrôle et la
        lecture, droits changés, erreur d'E/S - fermait la connexion sans
        réponse et sans une ligne de journal.

        On la provoque en rendant `STATIC_DIR` momentanément illisible pour
        `resolve()`, ce qui est le plus court chemin vers une exception
        inattendue à cet endroit précis."""
        avant = self.srv.config
        try:
            self.srv.config = dataclasses.replace(
                avant, static_dir=object())    # ni Path, ni chemin
            code, entetes, corps = self.demande('/une-page')
            self.assertEqual(code, HTTPStatus.INTERNAL_SERVER_ERROR)
            self.assertIn('application/json', entetes.get('Content-Type', ''))
            # Le détail reste au journal : cette route n'est pas authentifiée.
            self.assertNotIn(b'AttributeError', corps)
        finally:
            self.srv.config = avant

    def test_une_route_inconnue_de_l_api_ne_sert_pas_l_interface(self) -> None:
        """Sous `/api/`, un 404 JSON - et non `index.html`, qui ferait croire
        à un client que la route existe."""
        code, entetes, _ = self.demande('/api/nexiste-pas')
        self.assertEqual(code, HTTPStatus.NOT_FOUND)
        self.assertIn('application/json', entetes.get('Content-Type', ''))

class RouteDeSante(ConnexionPersistante):
    """`GET /api/sante` : sans session, 200 tant que la base répond."""

    def test_sans_session_la_base_repond(self) -> None:
        code, _, corps = self.demande('/api/sante')
        self.assertEqual(code, HTTPStatus.OK)
        self.assertEqual(json.loads(corps)['base'], 'ok')

    def test_un_fichier_qui_n_est_pas_une_base_n_est_pas_lisible(self) -> None:
        chemin = os.path.join(self._dir.name, 'pas-une-base.db')
        with open(chemin, 'wb') as f:
            f.write(b'ceci n est pas une base' * 100)
        self.assertFalse(base.lisible(chemin))
        self.assertTrue(base.lisible(self.cfg.db_path))


class SpectateurUno(ConnexionPersistante):
    """`GET /api/uno/spectateur` : la seule route du UNO sans session, et
    sans aucune main ; le reste du module exige toujours un compte."""

    def test_regarder_une_table_sans_session(self) -> None:
        code_table = self.srv.uno.creer('ana', 'Veillée')
        self.srv.uno.rejoindre(code_table, 'bob')
        self.srv.uno.lancer(code_table, 'ana')
        code, _, corps = self.demande('/api/uno/spectateur?code=%s'
                                      % code_table.lower())
        self.assertEqual(code, HTTPStatus.OK)
        vue = json.loads(corps)
        self.assertEqual(vue['nom'], 'Veillée')
        self.assertNotIn('main', vue['partie'])

    def test_table_inconnue(self) -> None:
        code, _, _ = self.demande('/api/uno/spectateur?code=ZZZZZ')
        self.assertEqual(code, HTTPStatus.NOT_FOUND)

    def test_le_reste_du_module_exige_une_session(self) -> None:
        code, _, _ = self.demande('/api/uno/salon?code=ZZZZZ')
        self.assertEqual(code, HTTPStatus.UNAUTHORIZED)
        code, _, _ = self.demande(
            '/api/uno/exclure', 'POST', json.dumps({'code': 'ZZZZZ'}),
            {'Content-Type': 'application/json'})
        self.assertEqual(code, HTTPStatus.UNAUTHORIZED)


class ParcoursDAuthentification(ConnexionPersistante):
    """Comptes, droits et installation, de bout en bout sur socket réelle.

    `utilisateurs.py` est testé isolément dans `test_utilisateurs.py`. Ici on
    vérifie le CÂBLAGE, qui est l'autre moitié : un contrôle de droits correct
    mais branché après la lecture des données ne protégerait rien, et cela ne
    se voit qu'en traversant la route.
    """

    MDP = 'motdepasse-de-test'

    def setUp(self) -> None:
        # Base vierge de comptes à chaque test : l'installation ne s'ouvre
        # qu'une fois, et la partager entre tests les rendrait dépendants de
        # leur ordre d'exécution.
        from backend import base
        with base._connexion(self.cfg.db_path) as cx:
            cx.execute('DELETE FROM "comptes.droit"')
            cx.execute('DELETE FROM "comptes.utilisateur"')
        self.srv.sessions.succes('127.0.0.1')
        self.addCleanup(self.srv.sessions.succes, '127.0.0.1')

    def poster(self, chemin: str, corps: dict[str, Any],
               cookie: str | None = None) -> tuple[int, dict[str, str], bytes]:
        entetes = {'Content-Type': 'application/json'}
        if cookie:
            entetes['Cookie'] = cookie
        return self.demande(chemin, 'POST', json.dumps(corps), entetes)

    def creer(self, nom: str, droits: list[str], cookie: str | None) -> None:
        code, _, corps = self.poster(
            '/api/comptes/creer',
            {'nom': nom, 'mot_de_passe': self.MDP, 'droits': droits}, cookie)
        self.assertEqual(code, HTTPStatus.CREATED, corps)

    def installer(self, nom: str = 'chef') -> str:
        code, entetes, _ = self.poster('/api/installation',
                                       {'nom': nom, 'mot_de_passe': self.MDP})
        self.assertEqual(code, HTTPStatus.CREATED)
        return entetes['Set-Cookie'].split(';')[0]

    def connecter(self, nom: str,
                  mot_de_passe: str | None = None) -> tuple[int, str, bytes]:
        code, entetes, corps = self.poster(
            '/api/login',
            {'nom': nom, 'mot_de_passe': mot_de_passe or self.MDP})
        return code, entetes.get('Set-Cookie', '').split(';')[0], corps

    # -- installation ------------------------------------------------------
    def test_l_installation_est_annoncee_tant_qu_aucun_compte_n_existe(
            self) -> None:
        _, _, corps = self.demande('/api/session')
        self.assertTrue(json.loads(corps)['installation_requise'])

    def test_l_installation_cree_un_superadmin_et_ouvre_la_session(
            self) -> None:
        cookie = self.installer()
        _, _, corps = self.demande('/api/session', entetes={'Cookie': cookie})
        d = json.loads(corps)
        self.assertFalse(d['installation_requise'])
        self.assertEqual(d['compte']['nom'], 'chef')
        self.assertTrue(d['compte']['superadmin'])

    def test_l_installation_se_referme_definitivement(self) -> None:
        """**Le garde-fou de cette route.** Elle écrit sans session : elle
        doit se fermer dès qu'un compte existe, sinon n'importe qui se crée un
        superadministrateur à tout moment."""
        self.installer()
        code, _, _ = self.poster('/api/installation',
                                 {'nom': 'pirate', 'mot_de_passe': self.MDP})
        self.assertEqual(code, HTTPStatus.CONFLICT)

    def test_un_mot_de_passe_court_est_ACCEPTE_a_l_installation(self) -> None:
        """**Il n'y a plus de politique de mot de passe.** Ce test le dit
        explicitement : ce n'est pas un contrôle perdu en route."""
        code, _, _ = self.poster('/api/installation',
                                 {'nom': 'chef', 'mot_de_passe': 'x'})
        self.assertEqual(code, HTTPStatus.CREATED)

    def test_un_mot_de_passe_vide_est_refuse_a_l_installation(self) -> None:
        code, _, corps = self.poster('/api/installation',
                                     {'nom': 'chef', 'mot_de_passe': ''})
        self.assertEqual(code, HTTPStatus.BAD_REQUEST)
        self.assertIn('vide', json.loads(corps)['erreur'])
        # …et l'installation reste ouverte : un refus ne doit pas verrouiller
        # l'application avant qu'un compte n'existe.
        _, _, corps = self.demande('/api/session')
        self.assertTrue(json.loads(corps)['installation_requise'])

    # -- connexion ---------------------------------------------------------
    def test_la_connexion_ouvre_une_session_nommee(self) -> None:
        self.installer()
        code, cookie, corps = self.connecter('chef')
        self.assertEqual(code, HTTPStatus.OK)
        self.assertIn('session=', cookie)
        self.assertEqual(json.loads(corps)['compte']['nom'], 'chef')

    def test_le_cookie_est_durci(self) -> None:
        self.installer()
        _, entetes, _ = self.poster(
            '/api/login', {'nom': 'chef', 'mot_de_passe': self.MDP})
        brut = entetes['Set-Cookie']
        for attendu in ('HttpOnly', 'SameSite=Strict', 'Path=/'):
            with self.subTest(attribut=attendu):
                self.assertIn(attendu, brut)

    def test_un_nom_inconnu_et_un_mauvais_mot_de_passe_se_ressemblent(
            self) -> None:
        """Les distinguer permettrait d'énumérer les comptes existants sans
        jamais en deviner un mot de passe."""
        self.installer()
        _, _, a = self.connecter('chef', 'mauvais-mot-de-passe')
        _, _, b = self.connecter('zorro', 'mauvais-mot-de-passe')
        self.assertEqual(json.loads(a)['erreur'], json.loads(b)['erreur'])

    def test_la_temporisation_se_declenche(self) -> None:
        self.installer()
        for _ in range(3):
            code, _, _ = self.connecter('chef', 'faux')
            self.assertEqual(code, HTTPStatus.UNAUTHORIZED)
        code, _, _ = self.connecter('chef', 'faux')
        self.assertEqual(code, HTTPStatus.TOO_MANY_REQUESTS)

    def test_la_deconnexion_ferme_la_session(self) -> None:
        cookie = self.installer()
        self.poster('/api/logout', {}, cookie)
        code, _, _ = self.demande('/api/_module', entetes={'Cookie': cookie})
        self.assertEqual(code, HTTPStatus.UNAUTHORIZED)

    # -- droits ------------------------------------------------------------
    def test_un_compte_restreint_n_ouvre_que_son_module(self) -> None:
        chef = self.installer()
        self.creer('lecteur', ['storybook:acces'], chef)
        _, cookie, corps = self.connecter('lecteur')
        self.assertEqual(json.loads(corps)['compte']['modules'],
                         ['storybook'])
        # `accueil` ne lui est pas accordé : 403, et non 401 - il EST
        # identifié, ce n'est simplement pas pour lui.
        code, _, _ = self.demande('/api/_module', entetes={'Cookie': cookie})
        self.assertEqual(code, HTTPStatus.FORBIDDEN)

    def test_un_compte_ordinaire_ne_gere_pas_les_comptes(self) -> None:
        chef = self.installer()
        self.creer('lecteur', ['accueil:acces', 'accueil:acces'], chef)
        _, cookie, _ = self.connecter('lecteur')
        code, _, _ = self.demande('/api/comptes', entetes={'Cookie': cookie})
        self.assertEqual(code, HTTPStatus.FORBIDDEN)

    def test_un_droit_retire_prend_effet_SANS_reconnexion(self) -> None:
        """Les droits sont relus à chaque requête, jamais figés à l'ouverture
        de session. Les figer laisserait un accès retiré valable jusqu'à
        l'expiration - une heure par défaut."""
        chef = self.installer()
        self.creer('lecteur', ['accueil:acces'], chef)
        _, cookie, _ = self.connecter('lecteur')
        code, _, _ = self.demande('/api/_module', entetes={'Cookie': cookie})
        self.assertEqual(code, HTTPStatus.OK)
        self.poster('/api/comptes/modifier',
                    {'nom': 'lecteur', 'droits': []}, chef)
        code, _, _ = self.demande('/api/_module', entetes={'Cookie': cookie})
        self.assertEqual(code, HTTPStatus.FORBIDDEN)

    def test_une_desactivation_ferme_la_session_ouverte(self) -> None:
        """Sans cela, un compte désactivé garderait son accès jusqu'à
        expiration du jeton."""
        chef = self.installer()
        self.creer('lecteur', ['accueil:acces'], chef)
        _, cookie, _ = self.connecter('lecteur')
        self.poster('/api/comptes/modifier',
                    {'nom': 'lecteur', 'actif': False}, chef)
        code, _, _ = self.demande('/api/_module', entetes={'Cookie': cookie})
        self.assertEqual(code, HTTPStatus.UNAUTHORIZED)

    def test_un_droit_inconnu_n_est_pas_accorde(self) -> None:
        """Un droit fantôme n'ouvrirait rien et resterait incompréhensible
        dans la grille."""
        chef = self.installer()
        _, _, corps = self.poster(
            '/api/comptes/creer',
            {'nom': 'lecteur', 'mot_de_passe': self.MDP,
             'droits': ['accueil:acces', 'accueil:roi', 'invente:acces',
                        'accueil']}, chef)
        self.assertEqual(json.loads(corps)['compte']['droits'],
                         ['accueil:acces'])

    def test_le_role_tenu_est_rendu_a_l_interface(self) -> None:
        """L'interface montre ou cache le chevron, les onglets et
        l'interrupteur selon ce champ. Le lui faire déduire des droits bruts
        dupliquerait la règle d'inclusion des rôles, qui finirait par
        diverger."""
        chef = self.installer()
        self.creer('op', ['accueil:acces'], chef)
        _, _, corps = self.connecter('op')
        self.assertEqual(json.loads(corps)['compte']['roles'],
                         {'accueil': 'acces'})

    def test_un_superadmin_tient_le_role_le_plus_eleve(self) -> None:
        self.installer()
        _, _, corps = self.connecter('chef')
        self.assertEqual(json.loads(corps)['compte']['roles'],
                         {'accueil': 'acces', 'uno': 'joueur',
                          'storybook': 'acces'})

    def test_on_ne_supprime_pas_son_propre_compte(self) -> None:
        chef = self.installer()
        code, _, _ = self.poster('/api/comptes/supprimer', {'nom': 'chef'},
                                 chef)
        self.assertEqual(code, HTTPStatus.BAD_REQUEST)

    def test_SEUL_LE_FONDATEUR_nomme_et_retrograde(self) -> None:
        """Le compte créé à l'installation, et lui seul.

        Un autre superadministrateur gère les comptes - droits, mots de passe,
        activation - mais ne touche pas au drapeau. C'est la seule différence
        entre les deux, et elle n'existe que pour empêcher qu'ils se
        rétrogradent les uns les autres jusqu'à ce qu'il n'en reste qu'un.
        """
        chef = self.installer()            # le fondateur
        self.creer('adjoint', [], chef)
        self.poster('/api/comptes/modifier',
                    {'nom': 'adjoint', 'superadmin': True}, chef)
        self.creer('lecteur', [], chef)
        _, adjoint, _ = self.connecter('adjoint')
        # L'adjoint est superadmin : il gère les comptes…
        code, _, _ = self.demande('/api/comptes',
                                  entetes={'Cookie': adjoint})
        self.assertEqual(code, HTTPStatus.OK)
        # …mais pas le drapeau.
        code, _, corps = self.poster('/api/comptes/modifier',
                                     {'nom': 'lecteur', 'superadmin': True},
                                     adjoint)
        self.assertEqual(code, HTTPStatus.FORBIDDEN)
        self.assertIn('fondateur', json.loads(corps)['erreur'])
        # Le fondateur, lui, rétrograde l'adjoint.
        code, _, corps = self.poster('/api/comptes/modifier',
                                     {'nom': 'adjoint', 'superadmin': False},
                                     chef)
        self.assertEqual(code, HTTPStatus.OK, corps)
        self.assertFalse(json.loads(corps)['compte']['superadmin'])

    def test_un_superadmin_retrograde_PERD_ses_modules(self) -> None:
        """Les droits sont relus à chaque requête : la rétrogradation prend
        effet sans reconnexion, comme un droit retiré."""
        chef = self.installer()
        self.creer('adjoint', [], chef)
        self.poster('/api/comptes/modifier',
                    {'nom': 'adjoint', 'superadmin': True}, chef)
        _, adjoint, _ = self.connecter('adjoint')
        code, _, _ = self.demande('/api/_module', entetes={'Cookie': adjoint})
        self.assertEqual(code, HTTPStatus.OK)
        self.poster('/api/comptes/modifier',
                    {'nom': 'adjoint', 'superadmin': False}, chef)
        code, _, _ = self.demande('/api/_module', entetes={'Cookie': adjoint})
        self.assertEqual(code, HTTPStatus.FORBIDDEN)
        # …et il ne gère plus les comptes.
        code, _, _ = self.demande('/api/comptes', entetes={'Cookie': adjoint})
        self.assertEqual(code, HTTPStatus.FORBIDDEN)

    def test_la_session_dit_qui_est_le_fondateur(self) -> None:
        """L'interface s'en sert pour montrer le levier de nomination - et ne
        pas le montrer à qui recevrait un refus en cliquant."""
        chef = self.installer()
        _, _, corps = self.demande('/api/session', entetes={'Cookie': chef})
        self.assertTrue(json.loads(corps)['compte']['fondateur'])

    def test_le_drapeau_attend_un_booleen(self) -> None:
        chef = self.installer()
        self.creer('lecteur', [], chef)
        code, _, _ = self.poster('/api/comptes/modifier',
                                 {'nom': 'lecteur', 'superadmin': 'oui'}, chef)
        self.assertEqual(code, HTTPStatus.BAD_REQUEST)

    def test_la_liste_des_comptes_ne_porte_aucune_empreinte(self) -> None:
        chef = self.installer()
        _, _, corps = self.demande('/api/comptes', entetes={'Cookie': chef})
        self.assertNotIn(b'empreinte', corps)
        self.assertNotIn(self.MDP.encode(), corps)

    # -- les deux portes dérobées vers le compte fondateur ------------------
    # Ces deux tests sont des RÉGRESSIONS : les deux chemins fonctionnaient, et
    # ont été reproduits de bout en bout sur une instance réelle avant d'être
    # fermés. Ils vivent ici, au niveau de la route, parce que c'est là qu'ils
    # vivaient : `utilisateurs.py` tenait déjà la règle voisine, et c'est une
    # route qui ne la posait pas.

    def test_un_superadmin_ne_CREE_pas_un_superadmin(self) -> None:
        """La porte n°1 : la règle était sur `modifier`, pas sur `creer`.

        Refuser la promotion d'un compte existant et accepter la création d'un
        compte déjà promu, c'est le même pouvoir par deux portes, dont une
        seule était fermée. Il suffisait de créer le complice promu.
        """
        chef = self.installer()
        self.creer('adjoint', [], chef)
        self.poster('/api/comptes/modifier',
                    {'nom': 'adjoint', 'superadmin': True}, chef)
        _, adjoint, _ = self.connecter('adjoint')
        code, _, corps = self.poster(
            '/api/comptes/creer',
            {'nom': 'complice', 'mot_de_passe': self.MDP,
             'superadmin': True}, adjoint)
        self.assertEqual(code, HTTPStatus.FORBIDDEN)
        self.assertIn('fondateur', json.loads(corps)['erreur'])
        # Le compte n'existe pas : le refus précède l'écriture.
        _, _, liste = self.demande('/api/comptes', entetes={'Cookie': chef})
        self.assertNotIn('complice',
                         [c['nom'] for c in json.loads(liste)['comptes']])
        # Le même appel SANS le drapeau reste permis : gérer les comptes
        # ordinaires est le travail d'un superadministrateur.
        code, _, _ = self.poster(
            '/api/comptes/creer',
            {'nom': 'stagiaire', 'mot_de_passe': self.MDP}, adjoint)
        self.assertEqual(code, HTTPStatus.CREATED)

    def test_un_superadmin_ne_prend_pas_le_COMPTE_du_fondateur(self) -> None:
        """La porte n°2, et la plus grave : le mot de passe du fondateur.

        Le fondateur était protégé de la rétrogradation, de la désactivation
        et de la suppression - trois refus explicites. Poser un mot de passe
        sur son compte n'était pas contrôlé, et donnait les trois d'un coup :
        on se connecte à sa place, on hérite du pouvoir de nommer, et on le
        laisse dehors. La protection ne peut pas s'énumérer champ par champ,
        elle porte sur le COMPTE.
        """
        chef = self.installer()
        self.creer('adjoint', [], chef)
        self.poster('/api/comptes/modifier',
                    {'nom': 'adjoint', 'superadmin': True}, chef)
        _, adjoint, _ = self.connecter('adjoint')
        code, _, corps = self.poster(
            '/api/comptes/modifier',
            {'nom': 'chef', 'mot_de_passe': 'vole-par-adjoint'}, adjoint)
        self.assertEqual(code, HTTPStatus.FORBIDDEN)
        self.assertIn('fondateur', json.loads(corps)['erreur'])
        # Le mot de passe volé n'ouvre rien…
        code, _, _ = self.connecter('chef', 'vole-par-adjoint')
        self.assertEqual(code, HTTPStatus.UNAUTHORIZED)
        # …et celui du fondateur vaut toujours : rien n'a été écrit.
        self.srv.sessions.succes('127.0.0.1')
        code, _, _ = self.connecter('chef')
        self.assertEqual(code, HTTPStatus.OK)

    def test_le_fondateur_change_SON_mot_de_passe(self) -> None:
        """La contrepartie à ne pas casser : il reste maître de son compte."""
        chef = self.installer()
        code, _, corps = self.poster(
            '/api/comptes/modifier',
            {'nom': 'chef', 'mot_de_passe': 'nouveau-mot-de-passe'}, chef)
        self.assertEqual(code, HTTPStatus.OK, corps)
        code, _, _ = self.connecter('chef', 'nouveau-mot-de-passe')
        self.assertEqual(code, HTTPStatus.OK)
if __name__ == '__main__':
    unittest.main()

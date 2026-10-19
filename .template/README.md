# Gabarit d'application web

Base réutilisable : **authentification, comptes, droits par module et
catalogue de composants**, sans aucune logique métier. Frontend React/Vite,
backend Python sans dépendance (bibliothèque standard, SQLite).

```
.template/
  frontend/   coque, connexion, comptes, mon compte, ui/, storybook
  backend/    serveur HTTP, sessions, comptes et droits, base SQLite
  tests/      tests du backend (unittest)
  Dockerfile  build de l'interface puis service
```

## Démarrer une application

1. Copier le contenu de `.template/` à la racine du nouveau dépôt.
2. Nommer l'application : `frontend/src/commun/appli.js`,
   `frontend/index.html`, `frontend/package.json`, `backend/config.py`
   (`NOM_APPLI`), `pyproject.toml`.
3. Backend : `python -m backend` (variables : `backend/config.py`). Au premier
   démarrage, l'interface demande de créer le superadministrateur fondateur.
4. Frontend : `cd frontend && npm install && npm run dev` (le proxy relaie
   `/api` vers `BACKEND_URL`, par défaut `http://127.0.0.1:8080`).
5. Vérifier : `python -m unittest discover -s tests -t .` et
   `cd frontend && npm run verifier`.
6. Docker : `docker build -t mon-application .`

## Ajouter un module (de bout en bout)

1. **Clés partagées** : `backend/partage/constantes.json`, entrée
   `module: [rôles du moins au plus étendu]`.
2. **Frontend** : dossier `frontend/src/modules/<nom>/` et entrée dans
   `MODULES` (`frontend/src/coque/modules.jsx`), mêmes clés et même ordre ;
   `tests/test_partage.py` le contrôle. Le modèle est
   `modules/accueil/Accueil.jsx`.
3. **Backend** : une fonction de route par action, qui commence par
   `refus = exige(req, 'module', 'role')` ; l'enregistrer dans `api.TABLE`
   (`backend/api/__init__.py`). Les droits côté interface ne font que
   masquer : seul `exige` protège.
4. **Base** : `backend/base/<module>/schema.py` (constante `SCHEMA`) ajouté à
   `MORCEAUX` dans `backend/base/schema.py`.

Une page publique (jeton dans l'URL) : route sans `exige` côté serveur,
préfixe `PUBLIC` dans `frontend/src/App.jsx`.

## Modèle de comptes

- Un compte tient **un rôle par module** ; les rôles s'incluent
  (`admin` ⊃ `operator` ⊃ `view`).
- Le **superadmin** tient tous les modules, présents et à venir, et gère les
  comptes. Le **fondateur** (créé à l'installation) est le seul à nommer ou
  rétrograder un superadmin, et son compte n'est administrable que par
  lui-même. Il reste toujours un superadmin actif.
- Droits relus en base à chaque requête (un retrait prend effet sans
  reconnexion) ; sessions en mémoire (un redémarrage déconnecte tout le
  monde) ; mots de passe en scrypt salé ; temporisation exponentielle des
  échecs de connexion par adresse.

## API fournie

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/session` | libre : compte courant, `installation_requise` |
| POST | `/api/login`, `/api/logout` | libre |
| POST | `/api/installation` | libre tant qu'aucun compte n'existe |
| GET | `/api/compte` ; POST `/api/compte/mot-de-passe`, `/api/compte/sessions/fermer` | tout compte actif |
| GET | `/api/comptes` ; POST `/api/comptes/{creer,modifier,supprimer}` | superadmin |
| GET | `/api/sante` | libre : 200 si la base répond |
| GET | `/api/presence` | tout compte actif : santé vue de l'interface (sondée toutes les 10 s) et comptes en ligne |
| GET | `/api/uno/salons`, `/api/uno/salon?code=` | rôle `uno:joueur` |
| POST | `/api/uno/{creer,rejoindre,quitter,lancer}` | rôle `uno:joueur` |
| POST | `/api/uno/{jouer,piocher,passer,uno,contrer}` | rôle `uno:joueur` |

## Module UNO

Tables de UNO en mémoire (`backend/metier/uno/`) : règles de base dans
`regles.py` (le détail en tête de fichier), salons dans `salons.py`. Une table
se partage par son code de 5 caractères ou par le lien `/uno/<code>` ; le
créateur en est l'hôte et lance les manches (2 à 10 joueurs). Comme les
sessions, les tables disparaissent au redémarrage, ou après 2 h sans
activité. L'interface (`frontend/src/modules/uno/`) relit la table chaque
seconde, ce qui permet aussi de montrer qui est encore à la table ; les
cartes sont dessinées par le composant `CarteJeu` de `ui/`, dans la palette
du site (jetons `--uno-*`). Une musique d'ambiance, synthétisée dans le
navigateur (`modules/uno/ambiance.js`, aucun fichier audio), accompagne le
module, avec volume et silence mémorisés sur le poste.

## Santé et présence

L'interface relit `GET /api/presence` toutes les 10 s
(`frontend/src/coque/presence.jsx`) : un bandeau prévient quand le serveur ne
répond plus, que sa base est illisible ou que la session a expiré, et le pied
du menu montre l'état du serveur et les comptes en ligne (popup : en ligne,
puis hors ligne avec la dernière activité). Toute requête authentifiée vaut
signe de vie ; un compte est en ligne pendant 30 s après le dernier.

## Ce qui n'est pas inclus

- **Migrations** : le schéma n'utilise que `CREATE TABLE IF NOT EXISTS`, qui
  ne modifie pas une table existante. Le projet d'origine a un moteur de
  migrations versionnées (`backend/base/migrations.py`) ainsi qu'une
  réparation de base corrompue (`backend/base/commun/reparation.py`), à
  reprendre dès qu'une base de production doit évoluer.
- **Sessions persistantes, SSO, politique de mot de passe** : à ajouter selon
  le besoin (`backend/metier/comptes/`).

Les données de démonstration du Storybook (pointeuses, commandes…) sont
fictives et peuvent être renommées librement.

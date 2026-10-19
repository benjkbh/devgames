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

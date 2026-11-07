# Jeux de la veillée

Jeux à plusieurs dans le navigateur (UNO, Code Names). **Pas de compte** : on
entre en choisissant un pseudo, et tous les jeux sont ouverts. Frontend
React/Vite, backend Python sans dépendance (bibliothèque standard, SQLite).

```
frontend/          coque : choix du pseudo, menu, page principale
  src/commun/      requêtes ; salons/ : API et accueil des tables de jeu
  src/modules/     un dossier par module, avec son manifeste (index.jsx)
backend/           serveur HTTP, pseudos, base SQLite
  commun/          outils de route ; salons : tables de jeu et leurs routes
  modules/         un paquet par module, avec son manifeste (__init__.py)
storybook/         bibliothèque de composants (ui/) et son catalogue,
                   projet et image à part
tests/             tests du backend (unittest)
Dockerfile         build de l'interface puis service
```

## Démarrer une application

1. Copier le contenu de `.template/` à la racine du nouveau dépôt.
2. Nommer l'application : `frontend/src/commun/appli.js`,
   `frontend/index.html`, `frontend/package.json`, `backend/config.py`
   (`NOM_APPLI`), `pyproject.toml`.
3. Backend : `python -m backend` (variables : `backend/config.py`). La base
   (`DB_PATH`) garde les pseudos.
4. Frontend : `cd frontend && npm install && npm run dev` (le proxy relaie
   `/api` vers `BACKEND_URL`, par défaut `http://127.0.0.1:8080`).
5. Vérifier : `python -m unittest discover -s tests -t .`,
   `cd frontend && npm run verifier` et `cd storybook && npm run verifier`.
6. Docker : `docker compose up -d --build` (`compose.yaml`, qui construit le
   `Dockerfile`), puis http://localhost:8080. La base est dans le volume
   `donnees` ; `PORT=9000` change le port publié.

## Storybook

La bibliothèque de composants (`storybook/ui/`) et son catalogue forment un
projet autonome, sans compte ni serveur. L'application l'importe par l'alias
`@ui` (`frontend/vite.config.js`) ; il n'en existe qu'une copie.

- Développement : `cd storybook && npm install && npm run dev`
  (http://localhost:6006).
- Vérification : `npm run verifier` rend chaque fiche, et échoue si un export
  de `ui/` n'a pas sa fiche.
- Docker, depuis `storybook/` : `docker build -t storybook .` puis
  `docker run --rm -p 6006:8080 storybook`. Fichiers statiques derrière
  nginx, sur le port 8080.

## Ajouter un module (de bout en bout)

Un module est autonome : un dossier de chaque côté, avec un manifeste. Le
noyau (coque, serveur, pseudos) n'en connaît aucun autrement que par les deux
registres. Tout joueur qui a un pseudo ouvre tous les modules.

1. **Backend** : paquet `backend/modules/<cle>/` dont `__init__.py` définit
   `MODULE = Module(...)` (contrat : `backend/modules/contrat.py`) : routes
   sous `/api/<cle>/`, état en mémoire, schéma de base. Chaque route
   commence par `refus = exige(req)` (`backend/commun/routage.py`) : il faut
   un pseudo. L'inscrire dans `MODULES` (`backend/modules/__init__.py`).
   Modèles : `accueil/` (sans route), `uno/` (complet).
2. **Frontend** : dossier `frontend/src/modules/<cle>/` dont `index.jsx`
   exporte le manifeste (contrat en tête de `frontend/src/coque/modules.jsx`) :
   même clé, avec libellé, chemin, icône, racine. L'inscrire
   dans `MODULES` de `coque/modules.jsx`, dans le même ordre ;
   `tests/test_partage.py` contrôle l'accord des deux registres.

Un jeu à tables (code, hôte, exclusion, manches) dérive `Salon` et `Salons`
de `backend/commun/salons.py`, monte ses routes avec `RoutesSalons`
(`backend/commun/routes_salons.py`), et côté interface reprend
`apiSalons` et `AccueilSalons` (`frontend/src/commun/salons/`).

Une page publique (sans pseudo) : route sans `exige` côté serveur,
documentée dans le manifeste, et entrée `publiques` du manifeste
d'interface, aiguillée par `frontend/src/App.jsx` avant le choix du pseudo.

## Pseudos

- On entre en choisissant un **pseudo** (2 à 20 caractères : lettres,
  chiffres, espaces, tirets, points, apostrophes), unique sans tenir compte de
  la casse. Pas de compte, pas de mot de passe ; tout joueur ouvre tous les
  jeux.
- Le pseudo est lié au navigateur par un **cookie** (`joueur`, HttpOnly,
  SameSite=Strict, 30 jours) qui porte un jeton aléatoire ; la base
  (`"joueurs.pseudo"`) n'en garde que l'empreinte SHA-256.
- Un pseudo est **réservé une heure** après la dernière activité de son joueur,
  ou après sa déconnexion (« Changer de pseudo » dans le menu) : personne ne
  peut le prendre pendant ce temps, pas même le navigateur qui vient de le
  quitter. Passé ce délai, le premier qui le choisit l'obtient ; tant que
  personne ne l'a repris, le cookie de son joueur reste valable.
- Règles dans `backend/metier/joueurs/pseudos.py` (`RESERVATION`), écriture en
  base dans `backend/base/joueurs/`. L'activité est écrite au plus une fois
  par minute.

## API fournie

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/session` | libre : le pseudo de ce navigateur (ou `null`), les modules |
| POST | `/api/pseudo` `{pseudo}` | libre : prend le pseudo et pose le cookie ; 400 invalide, 409 réservé (`reste` : secondes) |
| POST | `/api/logout` | libre : oublie le pseudo, réservé encore une heure |
| GET | `/api/sante` | libre : 200 si la base répond |
| GET | `/api/presence` | pseudo : santé vue de l'interface (sondée toutes les 10 s), joueurs en ligne et partis depuis moins d'une heure |
| GET | `/api/uno/salons`, `/api/uno/salon?code=[&version=]` | pseudo ; avec `version`, attente longue |
| POST | `/api/uno/{creer,rejoindre,quitter,exclure,regler,lancer,pret,reprendre,fermer}` | pseudo |
| POST | `/api/uno/{jouer,piocher,passer,uno,contrer}` | pseudo |
| GET | `/api/uno/spectateur?code=[&version=]` | libre : une table vue sans pseudo, sans aucune main |
| GET | `/api/codenames/salons`, `/api/codenames/salon?code=[&version=]` | pseudo ; avec `version`, attente longue |
| POST | `/api/codenames/{creer,rejoindre,quitter,exclure,pret,reprendre,fermer,choisir,melanger,regler,lancer}` | pseudo |
| POST | `/api/codenames/{indice,marquer,reveler,finir}` | pseudo |

## Module UNO

Tables de UNO en mémoire (`backend/modules/uno/`) : règles de base dans
`regles.py` (le détail en tête de fichier), salons dans `salons.py`. Une table
se partage par son code de 5 caractères ou par le lien `/uno/<code>` ; le
créateur en est l'hôte, lance les manches (2 à 10 joueurs) et peut exclure un
joueur (qui ne peut plus s'y asseoir). Les tables vivent en mémoire : elles
disparaissent au redémarrage, après 2 h sans activité, ou dès que plus aucun
joueur ne la regarde depuis 2 minutes.

**Règles de la table** : l'hôte choisit à la création, puis entre deux
manches (`POST /api/uno/regler`), des règles facultatives, copiées dans la
manche au lancement : *piocher jusqu'à pouvoir jouer*, *7 et 0* (un 7
échange sa main avec le joueur de son choix, un 0 fait passer toutes les mains
dans le sens du jeu), *rapidité* (une carte identique au dessus se pose hors
de son tour, le jeu reprend après celui qui l'a posée) et *suites* (après un
chiffre, on enchaîne dans le même tour les chiffres suivants de la même
couleur, puis on s'arrête par `POST /api/uno/passer`). Elles sont définies dans `REGLES`
(`backend/modules/uno/regles.py`) et `frontend/src/modules/uno/regles.js` :
ajouter une règle, c'est une entrée de chaque côté et son effet dans `Partie`.

**Spectateurs** : le lien `/spectateur/<code>` montre la table (joueurs, nombre
de leurs cartes, défausse, tour, journal, jamais une main) sans avoir à
choisir de pseudo. C'est la seule page publique de l'application : entrée `publiques`
du manifeste `frontend/src/modules/uno/index.jsx` et
`GET /api/uno/spectateur`, sans `exige` ; le code de
la table en est le secret, comme pour s'y asseoir. Un spectateur ne garde pas
la table en vie.

**Tables communes à tous les jeux** (`backend/commun/salons.py`) : chacun peut
se dire prêt pour la prochaine manche (`pret`, remis à zéro à la donne) ;
quand l'hôte ne relit plus la table depuis `DELAI_REPRISE` (60 s), un joueur
assis peut la reprendre et en devenir l'hôte (`reprendre`) ; l'hôte peut
fermer la table pour tous (`fermer`). L'accueil (`AccueilSalons`) : ouvrir
une table (nom, visibilité, réglages du jeu), la rejoindre par un code saisi
case par case (un lien collé se répartit tout seul), listes de ses tables et
des tables ouvertes.

**Mise à jour en direct** : pas de relecture à intervalle fixe. L'interface
demande la table en donnant la version qu'elle a déjà (`salon?version=`) ; le
serveur ne répond qu'au premier changement (un coup, un joueur qui arrive,
s'absente ou revient), ou au bout de 25 s (`attendre`, `ATTENTE`), et
l'interface repose aussitôt la question (`frontend/src/commun/salons/table.js`,
`useTable`). Un coup arrive ainsi chez tous les joueurs en quelques dizaines de
millisecondes ; sa propre action s'affiche dès la réponse du serveur, qui rend
la table à jour. Un joueur qui attend compte comme présent. Chaque attente
occupe un fil du serveur, ce qui convient à l'échelle d'une veillée.

**Interface** (`frontend/src/modules/uno/`) : la table se met à jour en direct
(voir ci-dessus), ce qui permet aussi de montrer qui est encore à la table. En-tête de
la table (retour, nom, état, musique, quitter ou fermer) et salle d'attente
dans `Salle.jsx` : les places autour de la table, puis, pour l'hôte,
l'invitation (code, lien pour jouer, lien spectateur) et les variantes en
tuiles à cocher (`ReglesUno.jsx`, les mêmes qu'à la création) ; pour un
joueur assis, le récapitulatif des règles, le bouton « Prêt » et, si l'hôte
s'absente, de quoi reprendre la table. En manche, l'ordre de jeu et le journal
sont à droite du tapis (`Cote.jsx`), pour le joueur comme pour le spectateur.
Le tapis
(`Tapis.jsx`) est commun au joueur et au spectateur : plateau de bois et de
feutre, joueurs assis autour, pioche et défausse dans l'anneau de la couleur
demandée que parcourent les flèches du sens du jeu. Le bouton UNO n'apparaît
qu'avec une carte à venir (avec deux cartes, seulement si l'on peut en poser
une) ; en face, un gros bouton « Contre UNO » apparaît tant qu'un joueur qui
n'a pas dit UNO peut être contré (jusqu'à la fin du tour du joueur suivant).
En fin de manche, l'hôte rechoisit les règles et tous peuvent inviter d'autres
joueurs (code et liens), sans quitter la table. Le décor (lune, loup, sapins, bougies) est dans
`Tapis.jsx`. La taille des cartes, et donc du tapis, suit la hauteur de la
fenêtre (`--uno-l` dans `uno.css`) : tout tient dans un écran de 1080p. Les poses et les pioches glissent (`animations.js`),
les cartes piochées une à une, toutes les 0,2 s :
le serveur numérote ces événements dans la vue de la manche (`evenements`), et
l'interface rejoue ceux qu'elle n'a pas vus. Pendant une manche, quitter la
table par le menu, un lien ou le bouton « précédent » demande confirmation
(`useBlocker`, d'où le routeur de données de `main.jsx`). Les cartes sont
dessinées par le composant `CarteJeu` de `ui/`, dans la palette du site
(jetons `--uno-*`) ; leur dos est une pleine lune et une patte de loup. La page
tient sur téléphone (cartes et tapis resserrés sous 720 px).

**Son** : tout est synthétisé dans le navigateur, aucun fichier audio
(`modules/uno/ambiance.js` pour le moteur, `pistes.js` pour les morceaux,
`effets.js` pour les bruitages, `synthese.js` pour les voix). Deux morceaux : la
veillée (lente, à la table) et la partie (plus vive, pendant la manche), que
`Table` aiguille d'un fondu enchaîné à l'autre. À chaque carte posée ou
piochée, un bruitage est tiré au hasard parmi trois. Le son part au clic sur
UNO dans le menu (`auClic` du manifeste `modules/uno/index.jsx`), monte et descend en
fondu à l'entrée et à la sortie du module (`SonUno`, à la racine du module) ;
son contrôle (`Lecteur`) est dans l'en-tête de chaque page. Volume, silence et
bruitages sont mémorisés sur le poste.

## Module Code Names

Code Names au manoir (`backend/modules/codenames/`) : les Vampires (`sang`)
contre les Chasseurs (`argent`), dans la galerie des portraits. Règles dans
`regles.py` (le détail en tête de fichier), listes de mots dans `mots.py`
(classique, manoir, mélange), salons dans `salons.py`, sur le modèle du UNO :
code de 5 caractères, lien `/codenames/<code>`, hôte, exclusion, tables en
mémoire (mêmes délais d'expiration).

Entre deux manches, chacun choisit son camp et peut s'en proposer l'oracle
(`POST /api/codenames/choisir`) ; l'hôte peut tout répartir au hasard
(`melanger`), choisir la liste de mots (`regler`) et lancer la manche dès que
chaque camp a un oracle et au moins un agent (4 à 16 joueurs). L'oracle voit le
grimoire (le rôle de chaque carte) ; ses agents marquent des cartes (vu de
tous) puis les révèlent. Le Comte fait perdre le camp qui le révèle.

**Interface** (`frontend/src/modules/codenames/`) : une salle du manoir la nuit
(damas prune, cadres dorés, chauves-souris), qui reste sombre dans les deux
thèmes. Dessins (sceaux des camps, du domestique et du Comte, manoir de
l'accueil, icône du menu) dans `decor.jsx`, galerie dans `Galerie.jsx`, styles
dans `codenames.css` (préfixe `cn-`). Pas de musique ni de page spectateur.

## Santé et présence

L'interface relit `GET /api/presence` toutes les 10 s
(`frontend/src/coque/presence.jsx`) : un bandeau prévient quand le serveur ne
répond plus, que sa base est illisible ou que le pseudo est perdu, et le pied
du menu montre l'état du serveur et les joueurs en ligne (popup : en ligne,
puis partis depuis moins d'une heure). Toute requête d'un joueur vaut signe de
vie ; il est en ligne pendant 30 s après le dernier.

## Ce qui n'est pas inclus

- **Migrations** : le schéma n'utilise que `CREATE TABLE IF NOT EXISTS`, qui
  ne modifie pas une table existante. Le projet d'origine a un moteur de
  migrations versionnées (`backend/base/migrations.py`) ainsi qu'une
  réparation de base corrompue (`backend/base/commun/reparation.py`), à
  reprendre dès qu'une base de production doit évoluer.
- **Tables des anciens comptes** : une base créée avant le passage aux
  pseudos garde ses tables `"comptes.utilisateur"` et `"comptes.droit"`,
  désormais inutilisées ; on peut les supprimer.

Les données de démonstration du Storybook (pointeuses, commandes…) sont
fictives et peuvent être renommées librement.

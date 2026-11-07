import accueil from '../modules/accueil';
import uno from '../modules/uno';
import codenames from '../modules/codenames';

// Registre des modules, lu par le menu latéral (entrées) et par `App`
// (routes). La coque ne connaît aucun module autrement que par ce registre.
// Tout joueur qui a un pseudo les ouvre tous ; le premier est la page
// d'atterrissage.
//
// Ajouter un module : un dossier `modules/<cle>/` dont `index.jsx` exporte
// son manifeste, et son import ici, dans `MODULES`. Le serveur a le même
// registre (`backend/modules/__init__.py`) : mêmes clés, même ordre ;
// `tests/test_partage.py` le contrôle.
//
// Manifeste d'un module (modèle : `modules/accueil/index.jsx`) :
//   cle        identifiant partagé avec le serveur ; c'est aussi le nom du
//              dossier
//   categorie  rubrique du menu latéral ; les rubriques suivent l'ordre de
//              première apparition dans ce registre
//   chemin     racine de ses routes (`<chemin>/*`)
//   libelle    entrée du menu ; `Ico` : son icône
//   Composant  sa racine ; elle reçoit `session` (`session.pseudo`)
//   auClic     (facultatif) appelé au clic sur l'entrée du menu, dans le geste
//              de l'utilisateur : le module peut y amorcer ce que le
//              navigateur n'autorise qu'après un geste (le son du UNO)
//   publiques  (facultatif) pages sans pseudo, `[{ chemin, Composant }]` :
//              traitées avant le choix du pseudo
//
// Contrat de sa racine :
//   1. elle rend sa disposition dans `#zone`, colonne flex : une barre
//      horizontale éventuelle, puis son contenu (`modules/accueil/`) ;
//   2. le module porte son état, son API et ses constantes dans son dossier ;
//      les briques partagées sont dans `@ui` (composants, `storybook/ui`) et
//      `commun/` (requêtes, tables de jeu).
export const MODULES = [accueil, uno, codenames];

// Pages publiques de tous les modules.
export const PAGES_PUBLIQUES = MODULES.flatMap((m) => m.publiques || []);

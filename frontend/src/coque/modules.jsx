import accueil from '../modules/accueil';
import uno from '../modules/uno';
import codenames from '../modules/codenames';

// Registre des modules, lu par le menu latéral (entrées) et par `App`
// (routes). La coque ne connaît aucun module autrement que par ce registre.
//
// Ajouter un module : un dossier `modules/<cle>/` dont `index.jsx` exporte
// son manifeste, et son import ici, dans `MODULES`. Le serveur a le même
// registre (`backend/modules/__init__.py`) : mêmes clés, mêmes rôles, même
// ordre ; `tests/test_partage.py` le contrôle.
//
// Manifeste d'un module (modèle : `modules/accueil/index.jsx`) :
//   cle        identifiant partagé avec le serveur, stocké dans la table des
//              droits ; c'est aussi le nom du dossier
//   categorie  rubrique du menu latéral ; les rubriques suivent l'ordre de
//              première apparition dans ce registre
//   chemin     racine de ses routes (`<chemin>/*`)
//   libelle    entrée du menu ; `Ico` : son icône
//   Composant  sa racine ; elle reçoit `session`
//   roles      rôles accordables, du moins au plus étendu, chacun contenant
//              les précédents (`admin` ⊃ `operator` ⊃ `view`) ; un compte en
//              tient un seul par module
//   auClic     (facultatif) appelé au clic sur l'entrée du menu, dans le geste
//              de l'utilisateur : le module peut y amorcer ce que le
//              navigateur n'autorise qu'après un geste (le son du UNO)
//   publiques  (facultatif) pages hors authentification,
//              `[{ chemin, Composant }]` : traitées avant le contrôle d'accès
//
// Contrat de sa racine :
//   1. elle rend sa disposition dans `#zone`, colonne flex : une barre
//      horizontale éventuelle, puis son contenu (`modules/accueil/`) ;
//   2. le module porte son état, son API et ses constantes dans son dossier ;
//      les briques partagées sont dans `@ui` (composants, `storybook/ui`) et `commun/`
//      (requêtes, tables de jeu).
//
// La gestion des comptes n'est pas un module : réservée aux
// superadministrateurs, elle est ajoutée à part par le menu.
//
// Exemple de module à trois rôles (view < operator < admin) :
//   {
//     cle: 'clients', categorie: 'Exploitation', chemin: '/clients',
//     libelle: 'Clients', Ico: IcoPointeuse, Composant: Clients,
//     roles: [
//       { cle: 'view', libelle: 'Consultation', resume: '…' },
//       { cle: 'operator', libelle: 'Opérateur', resume: '…' },
//       { cle: 'admin', libelle: 'Administration', resume: '…' },
//     ],
//   }
export const MODULES = [accueil, uno, codenames];

// Pages publiques de tous les modules.
export const PAGES_PUBLIQUES = MODULES.flatMap((m) => m.publiques || []);

// Clé d'un droit, telle que le serveur la stocke.
export const cleDroit = (module, role) => `${module}:${role}`;

// Rôle tenu par une session sur un module, ou null. Il est fourni par
// `/api/session`.
export function roleTenu(session, module) {
  const roles = (session.compte && session.compte.roles) || {};
  return roles[module] || null;
}

// La session tient-elle au moins ce rôle sur ce module ? Sans `role`, teste la
// simple ouverture du module. Sert à masquer les actions, ne contrôle rien
// (docs/securite.md I3).
export function peut(session, module, role) {
  const entree = MODULES.find((m) => m.cle === module);
  if (!entree) return false;
  const tenu = roleTenu(session, module);
  if (!tenu) return false;
  const rangs = entree.roles.map((r) => r.cle);
  const iTenu = rangs.indexOf(tenu);
  const iExige = role ? rangs.indexOf(role) : 0;
  return iTenu >= 0 && iExige >= 0 && iTenu >= iExige;
}

// Modules qu'une session peut ouvrir, d'après la liste de `/api/session`.
export function modulesVisibles(session) {
  const ouverts = (session.compte && session.compte.modules) || [];
  return MODULES.filter((m) => ouverts.includes(m.cle));
}

// Chemin du module d'atterrissage, vers lequel `/` redirige : le premier
// module que la session peut ouvrir, ou null.
export function moduleDefaut(session) {
  const visibles = modulesVisibles(session);
  return visibles.length ? visibles[0].chemin : null;
}

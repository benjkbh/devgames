import Accueil from '../modules/accueil/Accueil';
import Storybook from '../modules/storybook/Storybook';
import { IcoDashboard, IcoPanneau } from '../ui';

// Registre des modules, lu par le menu latéral (entrées) et par `App`
// (routes). Ajouter un module : une entrée ici et un dossier dans `modules/`.
//
// Contrat d'un module :
//   1. il reçoit `session` et `setSession` ;
//   2. il rend sa disposition dans `#zone`, colonne flex : une barre
//      horizontale éventuelle, puis son contenu (exemple complet dans
//      `modules/accueil/Accueil.jsx`) ;
//   3. il porte son état, son API et ses constantes dans son dossier.
//
// La gestion des comptes n'est pas un module : réservée aux
// superadministrateurs, elle est ajoutée à part par le menu.

// `categorie` range le module sous une rubrique du menu latéral ; les
// rubriques suivent l'ordre de première apparition dans ce registre.
//
// `cle` est l'identifiant partagé avec le serveur (`routes.ROLES`), stocké dans
// la table des droits ; un test vérifie l'accord des modules et des rôles, dans
// le même ordre. `chemin` ne sert qu'au routage.
//
// Les rôles sont ordonnés du moins au plus étendu et chacun contient les
// précédents : `admin` contient `operator`, qui contient `view`. Un compte
// tient un seul rôle par module.
export const MODULES = [
  {
    cle: 'accueil',
    categorie: 'Général',
    chemin: '/accueil',
    libelle: 'Accueil',
    Ico: IcoDashboard,
    Composant: Accueil,
    roles: [
      {
        cle: 'acces',
        libelle: 'Accès',
        resume: 'Ouvre la page d’accueil.',
      },
    ],
  },
  // Exemple de module à trois rôles (view < operator < admin) :
  // {
  //   cle: 'clients', categorie: 'Exploitation', chemin: '/clients',
  //   libelle: 'Clients', Ico: IcoPointeuse, Composant: Clients,
  //   roles: [
  //     { cle: 'view', libelle: 'Consultation', resume: '…' },
  //     { cle: 'operator', libelle: 'Opérateur', resume: '…' },
  //     { cle: 'admin', libelle: 'Administration', resume: '…' },
  //   ],
  // },
  {
    cle: 'storybook',
    categorie: 'Développement',
    chemin: '/storybook',
    libelle: 'Composants',
    Ico: IcoPanneau,
    Composant: Storybook,
    roles: [
      {
        cle: 'acces',
        libelle: 'Accès',
        resume: 'Ouvre le catalogue des composants réutilisables de '
          + 'l’interface.',
      },
    ],
  },
];

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

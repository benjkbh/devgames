import {
  CATEGORIES, DEPENDANCES, ORDRE, PREMIERES,
} from './fiches/arbre';
import { BACS } from './fiches/bacs';
import { FICHES as DONNEES } from './fiches/donnees';
import { FICHES as FORMULAIRE } from './fiches/formulaire';
import { FICHES as HOOKS } from './fiches/hooks';
import { FICHES as NOUVEAUX } from './fiches/nouveaux';
import { FICHES as PRIMITIVES } from './fiches/primitives';
import { FICHES as RETOUR } from './fiches/retour';

// Catalogue des composants réutilisables de `ui/`, une fiche par composant.
// Une fiche :
//   cle, nom, resume   identité et rôle ;
//   props              [{ nom, type, defaut, description }] ;
//   exemples           [{ titre, Rendu, code }] : `Rendu` est un composant, il
//                      peut porter un état ;
//   bac                bac à sable (`fiches/bacs.jsx`), facultatif.
// Le catalogue y ajoute, d'après `fiches/arbre.js` (à ne pas écrire dans la
// fiche) :
//   groupe, dependances  catégorie (badge, menu) et imports réels ; le menu
//                      range par catégorie et montre, par un chevron, les
//                      composants qui en dépendent.
// Pour ajouter un composant : une fiche dans le fichier de sa famille, sa
// catégorie et ses dépendances dans `arbre.js`, et si possible un bac dans
// `bacs.jsx`.
const FICHES = [
  ...PRIMITIVES, ...NOUVEAUX, ...FORMULAIRE, ...RETOUR, ...DONNEES, ...HOOKS,
].map((f) => {
  const groupe = CATEGORIES[f.cle];
  // Une fiche sans catégorie sortirait du menu sans bruit : on s'arrête.
  if (!groupe) {
    throw new Error(`Storybook : la fiche « ${f.cle} » n’a pas de catégorie `
      + 'dans `fiches/arbre.js` (PAR_CATEGORIE).');
  }
  if (!ORDRE.includes(groupe)) {
    throw new Error(`Storybook : la catégorie « ${groupe} » de la fiche `
      + `« ${f.cle} » est absente de ORDRE (fiches/arbre.js).`);
  }
  return {
    ...f,
    groupe,
    bac: BACS[f.cle],
    dependances: DEPENDANCES[f.cle] || [],
  };
});

const premiere = (f) => (PREMIERES.includes(f.cle) ? 0 : 1);

export const CATALOGUE = FICHES.slice()
  .sort((a, b) => (ORDRE.indexOf(a.groupe) - ORDRE.indexOf(b.groupe))
    || (premiere(a) - premiere(b)) || a.nom.localeCompare(b.nom, 'fr'));

// Fiches des composants qui s'appuient sur `cle`.
export const dependants = (cle, fiches = CATALOGUE) => fiches
  .filter((f) => f.dependances.includes(cle));

// Catégories présentes dans `fiches`, dans l'ordre du menu, avec leurs fiches.
export function categories(fiches = CATALOGUE) {
  return ORDRE.map((nom) => ({
    nom,
    fiches: fiches.filter((f) => f.groupe === nom),
  })).filter((c) => c.fiches.length);
}

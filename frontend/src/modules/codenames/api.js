import { apiSalons } from '../../commun/salons/api';

// API du module Code Names (`backend/modules/codenames/api.py`) : les routes
// communes des tables (`commun/salons/api.js`), les camps et les coups.

const tables = apiSalons('codenames');

export const {
  lireTables, lireTable, rejoindre, quitter, exclure, lancer, lienTable,
} = tables;

export const creerTable = (nom, publique, liste) => tables.creerTable(
  nom, publique, { liste });
// Rejoindre un camp ; `oracle` : s'en proposer l'oracle (ou cesser de l'être).
export const choisir = (code, equipe, oracle) => tables.demander('choisir',
  { code, equipe, oracle });
export const melanger = (code) => tables.demander('melanger', { code });
export const regler = (code, liste) => tables.demander('regler',
  { code, liste });
// `nombre` : 0 pour un indice sans limite.
export const donnerIndice = (code, mot, nombre) => tables.demander('indice',
  { code, mot, nombre });
export const marquer = (code, carte) => tables.demander('marquer',
  { code, carte });
export const reveler = (code, carte) => tables.demander('reveler',
  { code, carte });
export const finir = (code) => tables.demander('finir', { code });

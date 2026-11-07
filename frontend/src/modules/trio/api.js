import { apiSalons } from '../../commun/salons/api';

// API du module Trio (`backend/modules/trio/api.py`) : les routes communes
// des tables (`commun/salons/api.js`) et les coups.

export const api = apiSalons('trio');

// Révèle la plus petite (`min`) ou la plus grande (`max`) carte cachée de
// `cible`.
export const demander = (code, cible, cote) => api.demander('demander',
  { code, cible, cote });
// Retourne la carte du centre à l'emplacement `place`.
export const retourner = (code, place) => api.demander('retourner', { code, place });

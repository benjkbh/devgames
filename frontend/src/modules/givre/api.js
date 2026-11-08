import { apiSalons } from '../../commun/salons/api';

// API du module Givre (`backend/modules/givre/api.py`) : les routes communes
// des tables (`commun/salons/api.js`) et les coups.

export const api = apiSalons('givre');

// Retourne la carte cachée de sa grille à la case `place` (0 à 11).
export const retourner = (code, place) => api.demander('retourner', { code, place });
// Pioche une carte : elle se garde (`garder`) ou se jette (`jeter`).
export const piocher = (code) => api.demander('piocher', { code });
// Prend la carte de la défausse et la pose à la case `place`.
export const prendre = (code, place) => api.demander('prendre', { code, place });
// Pose la carte piochée à la case `place`.
export const garder = (code, place) => api.demander('garder', { code, place });
// Jette la carte piochée : il faut ensuite retourner une carte.
export const jeter = (code) => api.demander('jeter', { code });
// Ouvre la manche suivante, après le bilan.
export const suivante = (code) => api.demander('suivante', { code });

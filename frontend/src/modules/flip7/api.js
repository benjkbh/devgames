import { apiSalons } from '../../commun/salons/api';

// API du module Flip 7 (`backend/modules/flip7/api.py`) : les routes communes
// des tables (`commun/salons/api.js`) et les coups.

export const api = apiSalons('flip7');

export const piocher = (code) => api.demander('piocher', { code });
export const rester = (code) => api.demander('rester', { code });
// Le Gel ou le Trois-à-la-suite qu'on vient de tirer, joué sur `cible`.
export const cibler = (code, cible) => api.demander('cibler', { code, cible });
export const suivante = (code) => api.demander('suivante', { code });

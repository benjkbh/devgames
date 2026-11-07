import { apiSalons } from '../../commun/salons/api';

// API du module Menteur (`backend/modules/menteur/api.py`) : les routes
// communes des tables (`commun/salons/api.js`) et les coups.

export const api = apiSalons('menteur');

// Pose face cachée des cartes (ids) en annonçant le rang demandé.
export const poser = (code, cartes) => api.demander('poser', { code, cartes });
export const crier = (code) => api.demander('menteur', { code });
// Laisser passer les dernières cartes d'un joueur (il gagne).
export const accepter = (code) => api.demander('accepter', { code });

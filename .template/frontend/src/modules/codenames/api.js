import { lire, poster } from '../../commun/requete';

// API du module Code Names (`backend/api/codenames/salons.py`). Les actions
// rendent la table à jour, vue par le joueur.

export const lireTables = () => lire('/api/codenames/salons');
export const lireTable = ({ code }) => lire('/api/codenames/salon', { code });

export const creerTable = (nom, publique, liste) => poster(
  '/api/codenames/creer', { nom, public: publique, liste });
export const rejoindre = (code) => poster('/api/codenames/rejoindre', { code });
export const quitter = (code) => poster('/api/codenames/quitter', { code });
export const exclure = (code, joueur) => poster('/api/codenames/exclure',
  { code, joueur });
// Rejoindre un camp ; `oracle` : s'en proposer l'oracle (ou cesser de l'être).
export const choisir = (code, equipe, oracle) => poster(
  '/api/codenames/choisir', { code, equipe, oracle });
export const melanger = (code) => poster('/api/codenames/melanger', { code });
export const regler = (code, liste) => poster('/api/codenames/regler',
  { code, liste });
export const lancer = (code) => poster('/api/codenames/lancer', { code });

// `nombre` : 0 pour un indice sans limite.
export const donnerIndice = (code, mot, nombre) => poster(
  '/api/codenames/indice', { code, mot, nombre });
export const marquer = (code, carte) => poster('/api/codenames/marquer',
  { code, carte });
export const reveler = (code, carte) => poster('/api/codenames/reveler',
  { code, carte });
export const finir = (code) => poster('/api/codenames/finir', { code });

export const lienTable = (code) => `${window.location.origin}/codenames/${code}`;

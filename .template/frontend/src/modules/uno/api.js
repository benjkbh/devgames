import { lire, poster } from '../../commun/requete';

// API du module UNO (`backend/api/uno/salons.py`). Les actions rendent la
// table à jour, vue par le joueur.

export const lireTables = () => lire('/api/uno/salons');
export const lireTable = ({ code }) => lire('/api/uno/salon', { code });
// Une table vue d'un spectateur : sans session, sans aucune main.
export const lireSpectateur = ({ code }) => lire('/api/uno/spectateur', { code });

export const creerTable = (nom, publique, regles) => poster('/api/uno/creer',
  { nom, public: publique, regles });
export const regler = (code, regles) => poster('/api/uno/regler',
  { code, regles });
export const rejoindre = (code) => poster('/api/uno/rejoindre', { code });
export const quitter = (code) => poster('/api/uno/quitter', { code });
export const exclure = (code, joueur) => poster('/api/uno/exclure',
  { code, joueur });
export const lancer = (code) => poster('/api/uno/lancer', { code });

// `cible` : avec la règle du 7, le joueur dont on prend la main.
export const jouer = (code, carte, couleur, uno, cible) => poster(
  '/api/uno/jouer', { code, carte, couleur, uno, cible });
export const piocher = (code) => poster('/api/uno/piocher', { code });
export const passer = (code) => poster('/api/uno/passer', { code });
export const direUno = (code) => poster('/api/uno/uno', { code });
export const contrer = (code, cible) => poster('/api/uno/contrer',
  { code, cible });

// Liens à partager : s'asseoir à une table (compte requis) ou la regarder
// (sans compte).
export const lienTable = (code) => `${window.location.origin}/uno/${code}`;
export const cheminSpectateur = (code) => `/spectateur/${code}`;
export const lienSpectateur = (code) => `${window.location.origin}${cheminSpectateur(code)}`;

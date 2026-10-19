import { lire, poster } from '../../commun/requete';

// API du module UNO (`backend/api/uno/salons.py`). Les actions rendent la
// table à jour, vue par le joueur.

export const lireTables = () => lire('/api/uno/salons');
export const lireTable = ({ code }) => lire('/api/uno/salon', { code });

export const creerTable = (nom, publique) => poster('/api/uno/creer',
  { nom, public: publique });
export const rejoindre = (code) => poster('/api/uno/rejoindre', { code });
export const quitter = (code) => poster('/api/uno/quitter', { code });
export const lancer = (code) => poster('/api/uno/lancer', { code });

export const jouer = (code, carte, couleur, uno) => poster('/api/uno/jouer',
  { code, carte, couleur, uno });
export const piocher = (code) => poster('/api/uno/piocher', { code });
export const passer = (code) => poster('/api/uno/passer', { code });
export const direUno = (code) => poster('/api/uno/uno', { code });
export const contrer = (code, cible) => poster('/api/uno/contrer',
  { code, cible });

// Lien à partager pour s'asseoir à une table.
export const lienTable = (code) => `${window.location.origin}/uno/${code}`;

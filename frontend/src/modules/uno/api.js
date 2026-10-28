import { lire } from '../../commun/requete';
import { apiSalons } from '../../commun/salons/api';

// API du module UNO (`backend/modules/uno/api.py`) : les routes communes des
// tables (`commun/salons/api.js`), ses règles et ses coups.

const tables = apiSalons('uno');

export const {
  lireTables, lireTable, rejoindre, quitter, exclure, lancer, pret, reprendre,
  fermer, lienTable,
} = tables;
// Une table vue d'un spectateur : sans session, sans aucune main.
export const lireSpectateur = ({ code }) => lire('/api/uno/spectateur', { code });

export const creerTable = (nom, publique, regles) => tables.creerTable(
  nom, publique, { regles });
export const regler = (code, regles) => tables.demander('regler',
  { code, regles });
// `cible` : avec la règle du 7, le joueur dont on prend la main.
export const jouer = (code, carte, couleur, uno, cible) => tables.demander(
  'jouer', { code, carte, couleur, uno, cible });
export const piocher = (code) => tables.demander('piocher', { code });
export const passer = (code) => tables.demander('passer', { code });
export const direUno = (code) => tables.demander('uno', { code });
export const contrer = (code, cible) => tables.demander('contrer',
  { code, cible });

// Regarder une table sans compte.
export const cheminSpectateur = (code) => `/spectateur/${code}`;
export const lienSpectateur = (code) => `${window.location.origin}${cheminSpectateur(code)}`;

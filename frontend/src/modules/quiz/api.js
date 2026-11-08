import { apiSalons } from '../../commun/salons/api';
import { lire, poster } from '../../commun/requete';

// API du module Quiz (`backend/modules/quiz/api.py`) : les routes communes
// des tables (`commun/salons/api.js`), les réglages et les coups.

export const api = apiSalons('quiz');

// Réponse à la question `index` : `{ texte }`, ou `{ pays, lat, lon }` pour
// une question de carte. Elle se change tant que le temps court.
export const repondre = (code, index, reponse) => api.demander('repondre',
  { code, index, ...reponse });
// Le compte à rebours de la question (ou de la solution) `index` est fini.
export const avancer = (code, index) => api.demander('avancer', { code, index });
// L'hôte passe la solution sans attendre.
export const passer = (code) => api.demander('passer', { code });
// L'hôte donne `point` (0, 0.5 ou 1) à `cible` pour la question `index`.
export const noter = (code, index, cible, point) => api.demander('noter',
  { code, index, cible, point });
// L'hôte montre la question `index` à la revue.
export const revoir = (code, index) => api.demander('revoir', { code, index });
// L'hôte clôt la revue : les points sont comptés.
export const terminer = (code) => api.demander('terminer', { code });
// L'hôte change les réglages entre deux parties.
export const regler = (code, reglages) => api.demander('regler', { code, ...reglages });

// Signale une question non conforme (`motif` : reponse, ambigue, image,
// difficile, autre) : elle est écartée des tirages jusqu'à ce qu'on la
// rétablisse.
export const signaler = (question, motif, commentaire) => poster('/api/quiz/signaler',
  { question, motif, commentaire });
// Les questions signalées, avec leurs signalements.
export const lireSignalements = () => lire('/api/quiz/signalements');
// La question revient aux tirages (corrigée, ou signalement infondé).
export const retablir = (question) => poster('/api/quiz/retablir', { question });

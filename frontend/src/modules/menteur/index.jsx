import { IcoMenteur } from './decor';
import Menteur from './Menteur';

// Manifeste du module Menteur (contrat : `coque/modules.jsx`). Pendant
// serveur : `backend/modules/menteur/__init__.py`.
export default {
  cle: 'menteur',
  categorie: 'Jeux',
  chemin: '/menteur',
  libelle: 'Menteur',
  Ico: IcoMenteur,
  Composant: Menteur,
};

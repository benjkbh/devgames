import { IcoDashboard } from '@ui';
import Accueil from './Accueil';

// Manifeste de la page principale (contrat : `coque/modules.jsx`).
// Pendant serveur : `backend/modules/accueil/__init__.py`.
export default {
  cle: 'accueil',
  categorie: 'Général',
  chemin: '/accueil',
  libelle: 'Accueil',
  Ico: IcoDashboard,
  Composant: Accueil,
};

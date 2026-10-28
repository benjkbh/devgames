import { IcoDashboard } from '@ui';
import Accueil from './Accueil';

// Manifeste du module d'exemple (contrat : `coque/modules.jsx`). Pendant
// serveur : `backend/modules/accueil/__init__.py`.
export default {
  cle: 'accueil',
  categorie: 'Général',
  chemin: '/accueil',
  libelle: 'Accueil',
  Ico: IcoDashboard,
  Composant: Accueil,
  roles: [
    {
      cle: 'acces',
      libelle: 'Accès',
      resume: 'Ouvre la page d’accueil.',
    },
  ],
};

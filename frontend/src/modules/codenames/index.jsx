import CodeNames from './CodeNames';
import { IcoManoir } from './decor';

// Manifeste du module Code Names (contrat : `coque/modules.jsx`). Pendant
// serveur : `backend/modules/codenames/__init__.py`.
export default {
  cle: 'codenames',
  categorie: 'Jeux',
  chemin: '/codenames',
  libelle: 'Code Names',
  Ico: IcoManoir,
  Composant: CodeNames,
  roles: [
    {
      cle: 'joueur',
      libelle: 'Joueur',
      resume: 'Crée des tables de Code Names au manoir, en rejoint par '
        + 'code ou par lien, et y joue.',
    },
  ],
};

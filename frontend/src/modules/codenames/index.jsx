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
};

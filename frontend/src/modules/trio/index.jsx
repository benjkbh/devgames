import { IcoTrio } from './decor';
import Trio from './Trio';

// Manifeste du module Trio (contrat : `coque/modules.jsx`). Pendant serveur :
// `backend/modules/trio/__init__.py`.
export default {
  cle: 'trio',
  categorie: 'Jeux',
  chemin: '/trio',
  libelle: 'Trio',
  Ico: IcoTrio,
  Composant: Trio,
};

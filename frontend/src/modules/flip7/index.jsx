import { IcoFlip7 } from './decor';
import Flip7 from './Flip7';

// Manifeste du module Flip 7 (contrat : `coque/modules.jsx`). Pendant
// serveur : `backend/modules/flip7/__init__.py`.
export default {
  cle: 'flip7',
  categorie: 'Jeux',
  chemin: '/flip7',
  libelle: 'Flip 7',
  Ico: IcoFlip7,
  Composant: Flip7,
};

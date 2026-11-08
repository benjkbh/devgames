import { IcoGivre } from './decor';
import Givre from './Givre';

// Manifeste du module Givre (contrat : `coque/modules.jsx`). Pendant serveur :
// `backend/modules/givre/__init__.py`.
export default {
  cle: 'givre',
  categorie: 'Jeux',
  chemin: '/givre',
  libelle: 'Givre',
  Ico: IcoGivre,
  Composant: Givre,
};

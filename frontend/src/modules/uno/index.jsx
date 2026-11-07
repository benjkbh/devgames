import { IcoCarteRole } from '@ui';
import { amorcerMusique } from './ambiance';
import Spectateur from './Spectateur';
import Uno from './Uno';

// Manifeste du module UNO (contrat : `coque/modules.jsx`). Pendant serveur :
// `backend/modules/uno/__init__.py`.
export default {
  cle: 'uno',
  categorie: 'Jeux',
  chemin: '/uno',
  libelle: 'UNO',
  Ico: IcoCarteRole,
  Composant: Uno,
  // Le son part au clic sur l'entrée du menu (geste de l'utilisateur).
  auClic: amorcerMusique,
  // Regarder une table sans pseudo (`GET /api/uno/spectateur`).
  publiques: [{ chemin: '/spectateur/:code', Composant: Spectateur }],
};

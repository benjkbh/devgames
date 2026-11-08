import { IcoQuiz } from './decor';
import Quiz from './Quiz';

// Manifeste du module Quiz (contrat : `coque/modules.jsx`). Pendant serveur :
// `backend/modules/quiz/__init__.py`.
export default {
  cle: 'quiz',
  categorie: 'Jeux',
  chemin: '/quiz',
  libelle: 'Culture G',
  Ico: IcoQuiz,
  Composant: Quiz,
};

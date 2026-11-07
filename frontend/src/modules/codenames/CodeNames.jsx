import { Route, Routes } from 'react-router-dom';

import Accueil from './Accueil';
import Table from './Table';
import './codenames.css';

// Module Code Names, au manoir : accueil (créer une table, en rejoindre une
// par code ou dans la liste) et table de jeu, ouverte par son lien
// `/codenames/<code>` à partager. Les tables vivent en mémoire sur le
// serveur ; la table se met à jour au premier changement (attente longue,
// `commun/salons/table.js`), et la réponse d'un coup s'affiche aussitôt.
export default function CodeNames({ session }) {
  const moi = (session && session.pseudo) || '';
  return (
    <Routes>
      <Route index element={<Accueil moi={moi} />} />
      <Route path=":code" element={<Table />} />
    </Routes>
  );
}

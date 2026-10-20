import { Route, Routes } from 'react-router-dom';

import Accueil from './Accueil';
import Lecteur from './Lecteur';
import Table from './Table';
import './uno.css';

// Module UNO : accueil (créer une table, en rejoindre une par code ou dans la
// liste) et table de jeu, ouverte par son lien `/uno/<code>` à partager.
// Les tables vivent en mémoire sur le serveur ; la table est relue chaque
// seconde (sondage), et après chaque coup. Une musique d'ambiance
// (`Lecteur`) accompagne tout le module ; elle descend en fondu quand on le
// quitte. Regarder une table sans compte est une page publique, hors de ce
// module (`Spectateur`, route `PUBLIC` de `App.jsx`).
export default function Uno() {
  return (
    <>
      <Routes>
        <Route index element={<Accueil />} />
        <Route path=":code" element={<Table />} />
      </Routes>
      <Lecteur />
    </>
  );
}

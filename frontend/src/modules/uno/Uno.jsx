import { Route, Routes } from 'react-router-dom';

import Accueil from './Accueil';
import { SonUno } from './Lecteur';
import Table from './Table';
import './uno.css';

// Module UNO : accueil (créer une table, en rejoindre une par code ou dans la
// liste) et table de jeu, ouverte par son lien `/uno/<code>` à partager.
// Les tables vivent en mémoire sur le serveur ; la table est relue chaque
// seconde (sondage), et après chaque coup. Une musique d'ambiance (`SonUno`)
// accompagne tout le module ; son contrôle est dans l'en-tête de chaque page,
// et elle descend en fondu quand on le quitte. Regarder une table sans compte
// est une page publique, hors de ce module (`Spectateur`, `publiques` du
// manifeste).
export default function Uno({ session }) {
  const moi = session && session.compte ? session.compte.nom : '';
  return (
    <SonUno>
      <Routes>
        <Route index element={<Accueil moi={moi} />} />
        <Route path=":code" element={<Table />} />
      </Routes>
    </SonUno>
  );
}

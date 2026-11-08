import { Link, Route, Routes } from 'react-router-dom';

import { AccueilSalons } from '../../commun/salons/AccueilSalons';
import { PageTable } from '../../commun/salons/PageTable';
import { api } from './api';
import { CarteGivre, Chalet, IcoGivre } from './decor';
import Plateau from './Plateau';
import './givre.css';

// Module Givre, au chalet : accueil des tables et page d'une table
// (`commun/salons/`), avec la table du jeu (`Plateau`).

const BANNIERE = {
  className: 'gv-banniere',
  decor: false,
  surtitre: 'Chalet',
  titre: 'Givre',
  description: 'Douze glaçons cachés devant vous : échangez, retournez, et '
    + 'faites fondre les colonnes de trois cartes identiques. Le plus petit '
    + 'total l’emporte quand quelqu’un atteint 100 points. De 2 à 8 joueurs.',
  illustration: (
    <div className="gv-banniere-scene">
      <Chalet />
      <span className="gv-banniere-cartes">
        <CarteGivre valeur={-2} />
        <CarteGivre valeur={0} />
        <CarteGivre valeur={12} />
      </span>
    </div>
  ),
};

const AIDE = (
  <ul>
    <li>Chacun a 12 cartes cachées (3 lignes × 4 colonnes) et en retourne <strong>deux</strong> pour commencer.</li>
    <li>À votre tour : prenez la <strong>défausse</strong> et posez-la à la place d’une carte, ou <strong>piochez</strong> : gardez la carte de même, ou jetez-la et retournez une carte cachée.</li>
    <li>Trois cartes identiques visibles dans une colonne : elle <strong>fond</strong> et ne compte plus.</li>
    <li>Quand quelqu’un a tout retourné, les autres jouent un dernier tour. S’il n’a pas, seul, le plus petit total, ses points sont doublés.</li>
    <li>À 100 points, la partie s’arrête : le plus petit score gagne.</li>
  </ul>
);

function Accueil({ moi }) {
  return (
    <AccueilSalons
      prefixe="gv" chemin="/givre" api={api} Ico={IcoGivre}
      fil={[<Link key="j" to="/givre">Chalet</Link>, 'Givre']}
      banniere={BANNIERE} nomDefaut="Chalet de" moi={moi}
      minJoueurs={2} maxJoueurs={8}
      vide="Ouvrez le premier chalet, il apparaîtra ici pour tout le monde."
    />
  );
}

function Table() {
  return (
    <PageTable chemin="/givre" nomJeu="Givre" Ico={IcoGivre} prefixe="gv-page"
               api={api} Plateau={Plateau} aide={AIDE} lancer="Distribuer les glaçons" />
  );
}

export default function Givre({ session }) {
  const moi = (session && session.pseudo) || '';
  return (
    <Routes>
      <Route index element={<Accueil moi={moi} />} />
      <Route path=":code" element={<Table />} />
    </Routes>
  );
}

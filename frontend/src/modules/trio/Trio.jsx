import { Link, Route, Routes } from 'react-router-dom';

import { AccueilSalons } from '../../commun/salons/AccueilSalons';
import { PageTable } from '../../commun/salons/PageTable';
import { api } from './api';
import { CarteTrio, IcoTrio, Observatoire } from './decor';
import Plateau from './Plateau';
import './trio.css';

// Module Trio, à l'observatoire : accueil des tables et page d'une table
// (`commun/salons/`), avec le ciel du jeu (`Plateau`).

const BANNIERE = {
  className: 'tr-banniere',
  decor: false,
  surtitre: 'Observatoire',
  titre: 'Trio',
  description: 'Les astres se cachent dans les mains et au centre du ciel. '
    + 'Révélez-les un à un pour réunir trois cartes identiques : trois trios, '
    + 'ou celui des 7, et vous gagnez. De 3 à 6 joueurs.',
  illustration: (
    <div className="tr-banniere-scene">
      <Observatoire />
      <span className="tr-banniere-cartes">
        <CarteTrio valeur={7} />
        <CarteTrio valeur={7} />
        <CarteTrio valeur={7} />
      </span>
    </div>
  ),
};

const AIDE = (
  <ul>
    <li>À votre tour, révélez une carte : la <strong>plus petite</strong> ou la <strong>plus grande</strong> d’un joueur (vous compris), ou un astre du centre.</li>
    <li>Tant que les cartes sont identiques, continuez. Deux différentes : tout redevient caché.</li>
    <li>Trois identiques : le trio est à vous.</li>
    <li>Trois trios, ou le trio de 7 : vous gagnez.</li>
  </ul>
);

function Accueil({ moi }) {
  return (
    <AccueilSalons
      prefixe="tr" chemin="/trio" api={api} Ico={IcoTrio}
      fil={[<Link key="j" to="/trio">Observatoire</Link>, 'Trio']}
      banniere={BANNIERE} nomDefaut="Observatoire de" moi={moi}
      minJoueurs={3} maxJoueurs={6}
      vide="Ouvrez la première coupole, elle apparaîtra ici pour tout le monde."
    />
  );
}

function Table() {
  return (
    <PageTable chemin="/trio" nomJeu="Trio" Ico={IcoTrio} prefixe="tr-page"
               api={api} Plateau={Plateau} aide={AIDE} lancer="Ouvrir la coupole" />
  );
}

export default function Trio({ session }) {
  const moi = (session && session.pseudo) || '';
  return (
    <Routes>
      <Route index element={<Accueil moi={moi} />} />
      <Route path=":code" element={<Table />} />
    </Routes>
  );
}

import { Link, Route, Routes } from 'react-router-dom';

import { AccueilSalons } from '../../commun/salons/AccueilSalons';
import { PageTable } from '../../commun/salons/PageTable';
import { api } from './api';
import { IcoMenteur, Taverne } from './decor';
import Plateau from './Plateau';
import './menteur.css';

// Module Menteur, à la taverne des pirates : accueil des tables et page d'une
// table (`commun/salons/`), avec la table de jeu (`Plateau`).

const BANNIERE = {
  className: 'mt-banniere',
  decor: false,
  surtitre: 'Taverne des pirates',
  titre: 'Le Menteur',
  description: 'Posez vos cartes face cachée en jurant qu’elles sont du bon '
    + 'rang… ou pas. Un soupçon ? Criez « Menteur ! ». Le premier à vider sa '
    + 'main gagne. De 3 à 8 joueurs.',
  illustration: <Taverne />,
};

const AIDE = (
  <ul>
    <li>À votre tour, posez face cachée <strong>de 1 à 4 cartes</strong> du rang demandé : As, puis 2, 3… jusqu’au Roi, et on recommence.</li>
    <li>Vous pouvez mentir.</li>
    <li>Avant la pose suivante, n’importe qui peut crier <strong>« Menteur ! »</strong> : le menteur ramasse le tas, sinon c’est celui qui a crié.</li>
    <li>Le premier à vider sa main, sans se faire prendre, gagne.</li>
  </ul>
);

function Accueil({ moi }) {
  return (
    <AccueilSalons
      prefixe="mt" chemin="/menteur" api={api} Ico={IcoMenteur}
      fil={[<Link key="j" to="/menteur">Taverne des pirates</Link>, 'Menteur']}
      banniere={BANNIERE} nomDefaut="Tripot de" moi={moi}
      minJoueurs={3} maxJoueurs={8}
      vide="Ouvrez la première table de la taverne, elle apparaîtra ici pour tout le monde."
    />
  );
}

function Table() {
  return (
    <PageTable chemin="/menteur" nomJeu="Menteur" Ico={IcoMenteur} prefixe="mt-page"
               api={api} Plateau={Plateau} aide={AIDE} lancer="Distribuer les cartes" />
  );
}

export default function Menteur({ session }) {
  const moi = (session && session.pseudo) || '';
  return (
    <Routes>
      <Route index element={<Accueil moi={moi} />} />
      <Route path=":code" element={<Table />} />
    </Routes>
  );
}

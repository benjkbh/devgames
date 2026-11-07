import { Link, Route, Routes } from 'react-router-dom';

import { AccueilSalons } from '../../commun/salons/AccueilSalons';
import { PageTable } from '../../commun/salons/PageTable';
import { api } from './api';
import { CarteF7, Chapiteau, IcoFlip7 } from './decor';
import Plateau from './Plateau';
import './flip7.css';

// Module Flip 7, à la fête foraine : accueil des tables et page d'une table
// (`commun/salons/`), avec la piste du jeu (`Plateau`).

const BANNIERE = {
  className: 'f7-banniere',
  decor: false,
  surtitre: 'Fête foraine',
  titre: 'Flip 7',
  description: 'Piochez tant que vous osez : un nombre en double et la manche '
    + 's’envole. Sept nombres différents, c’est le jackpot. Premier à 200 '
    + 'points. De 2 à 8 joueurs.',
  illustration: (
    <div className="f7-banniere-scene">
      <Chapiteau />
      <span className="f7-banniere-cartes">
        <CarteF7 carte={{ type: 'nombre', valeur: 7, nom: '7' }} />
        <CarteF7 carte={{ type: 'gel', valeur: 0, nom: 'Gel' }} />
        <CarteF7 carte={{ type: 'nombre', valeur: 12, nom: '12' }} />
      </span>
    </div>
  ),
};

const AIDE = (
  <ul>
    <li>À votre tour : <strong>piochez</strong> une carte, ou <strong>arrêtez-vous</strong> et gardez vos points.</li>
    <li>Un nombre déjà devant vous : vous sautez, zéro point pour la manche.</li>
    <li>Sept nombres différents : <strong>Flip 7</strong>, +15, la manche s’arrête.</li>
    <li>Gel, Trois-à-la-suite : vous choisissez qui les subit. Seconde chance : un doublon pardonné.</li>
    <li>Premier à 200 points.</li>
  </ul>
);

function Accueil({ moi }) {
  return (
    <AccueilSalons
      prefixe="f7" chemin="/flip7" api={api} Ico={IcoFlip7}
      fil={[<Link key="j" to="/flip7">Fête foraine</Link>, 'Flip 7']}
      banniere={BANNIERE} nomDefaut="Stand de" moi={moi}
      minJoueurs={2} maxJoueurs={8}
      vide="Ouvrez le premier stand de la fête, il apparaîtra ici pour tout le monde."
    />
  );
}

function Table() {
  return (
    <PageTable chemin="/flip7" nomJeu="Flip 7" Ico={IcoFlip7} prefixe="f7-page"
               api={api} Plateau={Plateau} aide={AIDE} lancer="Ouvrir la piste" />
  );
}

export default function Flip7({ session }) {
  const moi = (session && session.pseudo) || '';
  return (
    <Routes>
      <Route index element={<Accueil moi={moi} />} />
      <Route path=":code" element={<Table />} />
    </Routes>
  );
}

import { Link, Route, Routes } from 'react-router-dom';

import { AccueilSalons } from '../../commun/salons/AccueilSalons';
import { PageTable } from '../../commun/salons/PageTable';
import { api } from './api';
import { IcoQuiz, Studio } from './decor';
import Plateau from './Plateau';
import { REGLAGES_DEFAUT, Reglages, resumeReglages } from './reglages';
import './quiz.css';

// Module Quiz de culture générale, sur un plateau télé : accueil des tables
// (avec les réglages de la partie) et page d'une table (`commun/salons/`),
// avec le plateau du jeu (`Plateau`).

const BANNIERE = {
  className: 'qz-banniere',
  decor: false,
  surtitre: 'Plateau télé',
  titre: 'Culture G',
  description: 'Pas de choix multiples : on écrit sa réponse, ou on place un '
    + 'point sur la carte du monde. Des milliers de questions, précises ou '
    + 'très ouvertes ; à la fin, l’hôte passe toutes les réponses en revue et '
    + 'donne les points. De 2 à 12 joueurs.',
  illustration: <Studio />,
};

const AIDE = (
  <ul>
    <li>Une question à la fois, un temps limité : écrivez votre réponse (vous pouvez la changer tant que le temps court).</li>
    <li>Questions de <strong>carte</strong> : placez un point sur le pays demandé, ou sur le pays d’une capitale.</li>
    <li>Réponse attendue : elle s’affiche à la fin du temps. Question <strong>ouverte</strong> : rien n’est montré.</li>
    <li>À la fin, l’<strong>hôte</strong> revoit toutes les réponses : il confirme la correction proposée et juge les questions ouvertes.</li>
    <li>Les questions déjà vues par un joueur assis sont évitées aux parties suivantes.</li>
  </ul>
);

const detail = (t) => resumeReglages(t);

function Accueil({ moi }) {
  return (
    <AccueilSalons
      prefixe="qz" chemin="/quiz" api={api} Ico={IcoQuiz}
      fil={[<Link key="j" to="/quiz">Plateau télé</Link>, 'Culture G']}
      banniere={BANNIERE} nomDefaut="Plateau de" moi={moi}
      minJoueurs={2} maxJoueurs={12}
      reglages={REGLAGES_DEFAUT} Reglages={Reglages}
      titreReglages="La partie" noteReglages="Modifiable entre deux parties"
      resumeReglages={resumeReglages} detail={detail}
      vide="Ouvrez le premier plateau, il apparaîtra ici pour tout le monde."
    />
  );
}

function Table() {
  return (
    <PageTable chemin="/quiz" nomJeu="Culture G" Ico={IcoQuiz} prefixe="qz-page"
               api={api} Plateau={Plateau} aide={AIDE} lancer="Lancer le quiz" />
  );
}

export default function Quiz({ session }) {
  const moi = (session && session.pseudo) || '';
  return (
    <Routes>
      <Route index element={<Accueil moi={moi} />} />
      <Route path=":code" element={<Table />} />
    </Routes>
  );
}

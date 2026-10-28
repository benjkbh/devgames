import { Link } from 'react-router-dom';

import { AccueilSalons } from '../../commun/salons/AccueilSalons';
import { QuestionChoix } from '@ui';
import { creerTable, lireTables, rejoindre } from './api';
import { IcoManoir, Manoir } from './decor';
import { OPTIONS_LISTES, nomListe, resumeListe } from './listes';

// Accueil du module : l'accueil commun des tables
// (`commun/salons/AccueilSalons.jsx`), au manoir, avec le choix des mots.

const API = {
  creerTable: (nom, publique, { liste }) => creerTable(nom, publique, liste),
  lireTables,
  rejoindre,
};

const BANNIERE = {
  className: 'cn-banniere',
  decor: false,
  surtitre: 'Jeux du manoir',
  titre: 'Code Names au manoir',
  description: 'Vampires contre Chasseurs, dans la galerie des portraits. '
    + 'D’un seul mot, l’oracle de chaque camp guide ses agents vers les '
    + 'siens… sans jamais ouvrir le cercueil du Comte. De 4 à 16 joueurs.',
  illustration: <Manoir className="cn-banniere-manoir" />,
};

// Réglages de la création : `{ liste }`, la liste de mots.
function Reglages({ valeur, onChange }) {
  return (
    <QuestionChoix nom="cn-liste" legende="Mots des portraits"
                   disposition="segments" options={OPTIONS_LISTES}
                   note={resumeListe(valeur.liste)}
                   valeur={valeur.liste} onChange={(liste) => onChange({ liste })} />
  );
}

const detail = (t) => `mots : ${nomListe(t.liste)}`;

export default function Accueil({ moi }) {
  return (
    <AccueilSalons
      prefixe="cn" chemin="/codenames" api={API} Ico={IcoManoir}
      fil={[<Link key="cn" to="/codenames">Jeux du manoir</Link>, 'Code Names']}
      banniere={BANNIERE} nomDefaut="Manoir de" moi={moi}
      minJoueurs={4} maxJoueurs={16}
      reglages={{ liste: 'melange' }} Reglages={Reglages}
      resumeReglages={({ liste }) => `mots : ${nomListe(liste)}`}
      detail={detail}
      vide="Ouvrez la première table du manoir, elle apparaîtra ici pour tout le monde."
    />
  );
}

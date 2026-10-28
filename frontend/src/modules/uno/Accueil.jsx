import { Link } from 'react-router-dom';

import { AccueilSalons } from '../../commun/salons/AccueilSalons';
import { CarteJeu, Eventail, IcoCarteRole } from '@ui';
import { cheminSpectateur, creerTable, lireTables, rejoindre } from './api';
import Lecteur from './Lecteur';
import { REGLES_DEFAUT, nombreVariantes } from './regles';
import { ChoixRegles } from './ReglesUno';

// Accueil du module : l'accueil commun des tables
// (`commun/salons/AccueilSalons.jsx`), avec les variantes de règles du UNO.

const API = {
  creerTable: (nom, publique, { regles }) => creerTable(nom, publique, regles),
  lireTables,
  rejoindre,
};

const BANNIERE = {
  surtitre: 'Jeux de la veillée',
  titre: 'UNO à Thiercelieux',
  description: 'Jusqu’à 10 joueurs, règles classiques ou variantes. Premier à '
    + 'poser toutes ses cartes — sans oublier de crier « UNO ! ».',
  illustration: (
    <Eventail arc chevauchement={0.55} className="uno-banniere-cartes">
      <CarteJeu taille="m" couleur="rouge" valeur="7" />
      <CarteJeu taille="m" couleur="jaune" valeur="inversion" />
      <CarteJeu taille="m" valeur="+4" />
      <CarteJeu taille="m" couleur="bleu" valeur="2" />
    </Eventail>
  ),
};

// Réglages de la création : `{ regles }`, envoyé tel quel au serveur.
function Reglages({ valeur, onChange }) {
  return <ChoixRegles regles={valeur.regles} onChange={(regles) => onChange({ regles })} />;
}

const detail = (t) => nombreVariantes(t.regles) || '';

export default function Accueil({ moi }) {
  return (
    <AccueilSalons
      prefixe="uno" chemin="/uno" api={API} Ico={IcoCarteRole}
      fil={[<Link key="uno" to="/uno">Jeux de la veillée</Link>, 'UNO']}
      outils={<Lecteur variante="barre" />}
      banniere={BANNIERE} nomDefaut="Table de" moi={moi}
      minJoueurs={2} maxJoueurs={10}
      reglages={{ regles: REGLES_DEFAUT }} Reglages={Reglages}
      titreReglages="Variantes de règles" noteReglages="Sans variante : règles classiques"
      resumeReglages={({ regles }) => nombreVariantes(regles)}
      detail={detail} cheminSpectateur={cheminSpectateur}
      vide="Ouvrez la première table du village, elle apparaîtra ici pour tout le monde."
    />
  );
}

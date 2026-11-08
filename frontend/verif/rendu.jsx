/* Vérification de rendu : chaque route est rendue en chaîne dans Node
 * (`renderToString`). Une exception ou un rendu vide fait échouer le contrôle. */
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../src/App';
import ChoixPseudo from '../src/coque/ChoixPseudo';
import MenuLateral from '../src/coque/MenuLateral';
import { MODULES } from '../src/coque/modules';
import {
  Plateau as PlateauCn, Preparation as PreparationCn,
} from '../src/modules/codenames/Table';
import Spectateur from '../src/modules/uno/Spectateur';
import {
  Invitation, JeuSpectateur, Plateau, SalleAttente,
} from '../src/modules/uno/Table';
import { Tapis } from '../src/modules/uno/Tapis';
import PlateauFlip7 from '../src/modules/flip7/Plateau';
import PlateauMenteur from '../src/modules/menteur/Plateau';
import PlateauTrio from '../src/modules/trio/Plateau';
import PlateauGivre from '../src/modules/givre/Plateau';
import PlateauQuiz from '../src/modules/quiz/Plateau';
import Signalements from '../src/modules/quiz/Signalements';


// -- environnement navigateur minimal --
// Fournit `localStorage`, `matchMedia` et `document.documentElement.dataset`,
// lus par le menu.
const magasin = new Map();
globalThis.window = {
  // Origine lue par `LienClient` pour composer l'URL du lien de saisie.
  location: { origin: 'https://exemple.test' },
  localStorage: {
    getItem: (c) => (magasin.has(c) ? magasin.get(c) : null),
    setItem: (c, v) => magasin.set(c, String(v)),
  },
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
  removeEventListener() {},
};
globalThis.navigator = { clipboard: { writeText: async () => {} } };
globalThis.document = {
  documentElement: { dataset: {} },
  addEventListener() {},
  removeEventListener() {},
  hidden: false,
};
// `fetch` n'est pas simulé : `renderToString` n'exécute pas les effets.

// Filtre l'avertissement `useLayoutEffect` émis pour chaque `NavLink` au rendu
// serveur ; les autres erreurs sont transmises.
const erreurReelle = console.error;
console.error = (...a) => {
  if (typeof a[0] === 'string' && a[0].includes('useLayoutEffect does nothing')) return;
  erreurReelle(...a);
};

// Session factice : un joueur qui a choisi son pseudo.
const SESSION = { pseudo: 'benjamin', chargee: true };

// Chaque écran : un nom, la route et l'élément. Les modules viennent du
// registre.
const ECRANS = [
  ['chargement', '/', <App />],
  ['choix du pseudo', '/', <ChoixPseudo onEntre={() => {}} />],
  // Modules montés comme dans `App`, sous `<Route path="…/*">`.
  ...MODULES.map((m) => [
    `module ${m.cle}`, m.chemin, (
      <Routes>
        <Route path={`${m.chemin}/*`}
               element={<m.Composant session={SESSION} />} />
      </Routes>
    ),
  ]),
  ['menu', '/', <MenuLateral session={SESSION} onDeconnecte={() => {}} />],
];

// Table de UNO, telle que le serveur la décrit : attente, manche, fin.
const TABLE_UNO = {
  code: 'K7Q2M', nom: 'Soirée', hote: 'ana', moi: 'ana', public: true,
  membre: true, version: 3, manches: 1, min_joueurs: 2, max_joueurs: 10,
  joueurs: ['ana', 'bob', 'cyd'], scores: { ana: 0, bob: 12, cyd: 0 },
  etat: 'partie', regles: { pioche_jusqua: true, sept_zero: true },
};
const MANCHE_UNO = {
  joueurs: [
    { nom: 'ana', cartes: 3, uno: false, expose: false },
    { nom: 'bob', cartes: 1, uno: false, expose: true },
    { nom: 'cyd', cartes: 12, uno: false, expose: false },
  ],
  main: [
    { id: 1, couleur: 'rouge', valeur: '7' },
    { id: 2, couleur: 'noir', valeur: '+4' },
    { id: 3, couleur: 'bleu', valeur: 'inversion' },
  ],
  jouables: [1, 2], uno_annonce: false, suite: false,
  evenements: [{ n: 1, joueur: 'bob', type: 'pose', cartes: 1 }],
  regles: { pioche_jusqua: true, sept_zero: true },
  dessus: { id: 9, couleur: 'noir', valeur: 'joker' }, couleur: 'rouge',
  sens: -1, tour: 'ana', pioche: 70, pioche_jouable: null,
  journal: ['La partie commence.', 'bob pose Joker et annonce rouge.'],
  gagnant: null, points: 0,
};
// Vue d'un spectateur : le jeu, sans main.
const { main: _main, jouables: _jouables, ...MANCHE_SPECTATEUR } = MANCHE_UNO;
ECRANS.push(
  ['uno : salle d’attente', '/uno/K7Q2M',
    <SalleAttente table={{ ...TABLE_UNO, etat: 'attente', prets: ['bob'] }}
                  onAction={() => {}} onExclure={() => {}} />],
  ['uno : salle d’attente (il manque un joueur)', '/uno/K7Q2M',
    <SalleAttente table={{
      ...TABLE_UNO, etat: 'attente', joueurs: ['ana'], scores: { ana: 0 },
    }} onAction={() => {}} />],
  ['uno : salle d’attente (invité prêt, hôte absent)', '/uno/K7Q2M',
    <SalleAttente table={{
      ...TABLE_UNO, etat: 'attente', moi: 'bob', prets: ['bob'],
      presents: { ana: false, bob: true, cyd: true }, absence_hote: 75,
      delai_reprise: 60,
    }} onAction={() => {}} />],
  ['uno : invitation (pas encore assis)', '/uno/K7Q2M',
    <Invitation table={{ ...TABLE_UNO, etat: 'attente', moi: 'dan', membre: false }}
                onAction={() => {}} />],
  ['uno : spectateur avant la donne', '/uno/K7Q2M',
    <Invitation table={{
      ...TABLE_UNO, etat: 'attente', moi: 'dan', membre: false, spectateur: true,
      spectateurs: ['dan'],
    }} onAction={() => {}} />],
  ['uno : spectateur pendant la manche', '/uno/K7Q2M',
    <JeuSpectateur table={{
      ...TABLE_UNO, moi: 'dan', membre: false, spectateur: true,
      spectateurs: ['dan'], partie: MANCHE_SPECTATEUR,
    }} onAction={() => {}} />],
  ['uno : salle d’attente avec spectateurs', '/uno/K7Q2M',
    <SalleAttente table={{ ...TABLE_UNO, etat: 'attente', spectateurs: ['dan', 'eve'] }}
                  onAction={() => {}} />],
  ['uno : manche en cours', '/uno/K7Q2M',
    <Plateau table={{ ...TABLE_UNO, partie: MANCHE_UNO }} onAction={() => {}} />],
  ['uno : manche finie', '/uno/K7Q2M',
    <Plateau table={{
      ...TABLE_UNO, etat: 'finie',
      partie: { ...MANCHE_UNO, tour: null, gagnant: 'bob', points: 63 },
    }} onAction={() => {}} />],
  ['uno : bouton UNO (une carte à venir)', '/uno/K7Q2M',
    <Plateau table={{
      ...TABLE_UNO,
      partie: { ...MANCHE_UNO, main: MANCHE_UNO.main.slice(0, 2) },
    }} onAction={() => {}} onExclure={() => {}} />],
  ['uno : tapis du spectateur', '/spectateur/K7Q2M',
    <Tapis table={{ ...TABLE_UNO, moi: undefined }} partie={MANCHE_SPECTATEUR}
           moi={null} message="ana joue…" />],
  ['uno : page du spectateur', '/spectateur/K7Q2M',
    <Routes><Route path="/spectateur/:code" element={<Spectateur />} /></Routes>],
  // Page publique d'un module, aiguillée par la coque avant la connexion.
  ['uno : spectateur par la coque', '/spectateur/K7Q2M', <App />],
);

// Table de Code Names, telle que le serveur la décrit : attente, manche (vue
// d'un oracle, d'un agent au trait), fin.
const TABLE_CN = {
  code: 'M4N0R', nom: 'Nuit au manoir', hote: 'ana', moi: 'ana', public: true,
  membre: true, version: 4, manches: 1, min_joueurs: 4, max_joueurs: 16,
  joueurs: ['ana', 'bob', 'cyd', 'dan'], etat: 'partie', liste: 'melange',
  camps: { ana: 'sang', bob: 'sang', cyd: 'argent', dan: 'argent' },
  oracles: { sang: 'ana', argent: 'cyd' }, victoires: { sang: 0, argent: 1 },
  presents: { ana: true, bob: true, cyd: false, dan: true }, manque: null,
};
const ROLES_CN = ['sang', 'argent', 'domestique', 'comte', 'sang'];
const MANCHE_CN = {
  cartes: Array.from({ length: 25 }, (_, i) => ({
    mot: `mot${i}`, revelee: i % 6 === 0, par: i % 6 === 0 ? 'bob' : null,
    role: i % 6 === 0 ? ROLES_CN[i % 5] : null, marques: i === 3 ? ['bob'] : [],
  })),
  equipes: { sang: ['ana', 'bob'], argent: ['cyd', 'dan'] },
  oracles: { sang: 'ana', argent: 'cyd' }, restants: { sang: 7, argent: 8 },
  premiere: 'sang', equipe: 'sang', phase: 'devine',
  indice: { equipe: 'sang', mot: 'Nuit', nombre: 2, trouves: 1 },
  limite: 2, essais: 1, liste: 'melange', gagnant: null, cause: null,
  indices: [{ equipe: 'sang', mot: 'Nuit', nombre: 2, trouves: 1 }],
  journal: ['Les Vampires ouvrent la partie.'],
  moi: { equipe: 'sang', role: 'oracle' },
};
const GRIMOIRE_CN = {
  ...MANCHE_CN,
  cartes: MANCHE_CN.cartes.map((c, i) => ({ ...c, role: ROLES_CN[i % 5] })),
};
ECRANS.push(
  ['codenames : salle d’attente', '/codenames/M4N0R',
    <PreparationCn table={{ ...TABLE_CN, etat: 'attente', manque: 'Les Vampires n’ont pas d’oracle.' }}
                   onAction={() => {}} onExclure={() => {}} />],
  ['codenames : vue de l’oracle', '/codenames/M4N0R',
    <PlateauCn table={{ ...TABLE_CN, partie: GRIMOIRE_CN }} onAction={() => {}} />],
  ['codenames : agent au trait', '/codenames/M4N0R',
    <PlateauCn table={{
      ...TABLE_CN, moi: 'bob',
      partie: { ...MANCHE_CN, moi: { equipe: 'sang', role: 'agent' } },
    }} onAction={() => {}} />],
  ['codenames : manche finie', '/codenames/M4N0R',
    <PlateauCn table={{
      ...TABLE_CN, etat: 'finie',
      partie: {
        ...GRIMOIRE_CN, equipe: null, phase: 'fin', gagnant: 'argent', cause: 'comte',
      },
    }} onAction={() => {}} onExclure={() => {}} />],
);

// Les jeux simples : une table, telle que le serveur la décrit, en partie.
const TABLE_JEU = {
  code: 'S7TAR', nom: 'Veillée', hote: 'ana', moi: 'ana', public: true,
  membre: true, version: 2, manches: 1, min_joueurs: 2, max_joueurs: 8,
  joueurs: ['ana', 'bob', 'cyd'], etat: 'partie', victoires: { ana: 1 },
  presents: { ana: true, bob: true, cyd: true }, prets: [], spectateurs: [],
};
const F7 = (type, valeur, id) => ({
  id, type, valeur, nom: type === 'nombre' ? String(valeur) : type,
});
const PARTIE_F7 = {
  joueurs: [
    { nom: 'ana', etat: 'actif', ligne: [F7('nombre', 7, 1), F7('bonus', 4, 2), F7('chance', 0, 3)], points: 11, score: 40 },
    { nom: 'bob', etat: 'saute', ligne: [F7('nombre', 5, 4), F7('nombre', 5, 5)], points: 0, score: 12 },
    { nom: 'cyd', etat: 'reste', ligne: [F7('nombre', 12, 6), F7('fois2', 0, 7)], points: 24, score: 90 },
  ],
  tour: 'ana', attente: null, manche: 3, donneur: 'cyd', bilan: null, flip7: null,
  pioche: 51, objectif: 200, gagnant: null, journal: ['bob tire un second 5 et saute !'],
  evenements: [],
};
const PARTIE_MT = {
  joueurs: [{ nom: 'ana', cartes: 3 }, { nom: 'bob', cartes: 18 }, { nom: 'cyd', cartes: 17 }],
  tour: 'bob', annonce: '8', tas: 14,
  pose: { joueur: 'ana', nombre: 2, rang: '7' }, verdict: false,
  revelation: {
    appelant: 'cyd', poseur: 'bob', rang: '5', menteur: true, ramasse: 'bob',
    cartes: [{ id: 1, rang: '5', enseigne: 'coeur' }, { id: 2, rang: 'R', enseigne: 'pique' }],
  },
  gagnant: null, journal: ['ana pose deux 7.'],
  main: [{ id: 10, rang: 'A', enseigne: 'pique' }, { id: 11, rang: '8', enseigne: 'coeur' },
    { id: 12, rang: 'R', enseigne: 'trefle' }],
};
const PARTIE_TR = {
  joueurs: [
    { nom: 'ana', cartes: 5, revelees: { 0: 3 }, trios: [9] },
    { nom: 'bob', cartes: 6, revelees: { 0: 3 }, trios: [] },
    { nom: 'cyd', cartes: 6, revelees: {}, trios: [12] },
  ],
  centre: [0, 0, null, 0, 5, 0, 0, null, 0],
  tour: 'ana', revelees: [{ valeur: 3 }, { valeur: 3 }], essai: null, objectif: 3,
  gagnant: null, journal: ['ana révèle un 3 chez bob.'], main: [3, 4, 8, 10, 11],
};
ECRANS.push(
  ['flip7 : la piste', '/flip7/S7TAR',
    <PlateauFlip7 table={{ ...TABLE_JEU, partie: PARTIE_F7 }} onAction={() => {}} />],
  ['flip7 : choisir une cible', '/flip7/S7TAR',
    <PlateauFlip7 table={{ ...TABLE_JEU, partie: { ...PARTIE_F7, tour: null, attente: { joueur: 'ana', carte: 'gel' } } }}
                  onAction={() => {}} />],
  ['flip7 : bilan de manche', '/flip7/S7TAR',
    <PlateauFlip7 table={{ ...TABLE_JEU, partie: { ...PARTIE_F7, tour: null, bilan: { ana: 11, bob: 0, cyd: 24 } } }}
                  onAction={() => {}} />],
  ['menteur : la taverne', '/menteur/S7TAR',
    <PlateauMenteur table={{ ...TABLE_JEU, partie: PARTIE_MT }} onAction={() => {}} />],
  ['menteur : spectateur', '/menteur/S7TAR',
    <PlateauMenteur table={{ ...TABLE_JEU, membre: false, spectateur: true, partie: { ...PARTIE_MT, main: undefined } }}
                    onAction={() => {}} />],
  ['trio : le ciel', '/trio/S7TAR',
    <PlateauTrio table={{ ...TABLE_JEU, partie: PARTIE_TR }} onAction={() => {}} />],
);

// Givre : départ, au trait avec une carte piochée, bilan.
const GRILLE = (v) => [v, 'cachee', 3, 'cachee', -2, 'cachee', null, null, null, 12, 'cachee', 0];
const PARTIE_GV = {
  joueurs: [
    { nom: 'ana', grille: GRILLE(5), visible: 18, score: 12, pret: true },
    { nom: 'bob', grille: GRILLE(-1), visible: 12, score: 40, pret: true },
    { nom: 'cyd', grille: GRILLE(9), visible: 22, score: 7, pret: true },
  ],
  phase: 'jeu', manche: 2, tour: 'ana', pioche: 90, defausse: 4, main: 7,
  doit_retourner: false, finisseur: null, derniers: [],
  dernier_coup: { joueur: 'bob', type: 'pose', place: 2, valeur: 3 },
  bilan: null, objectif: 100, gagnant: null, journal: ['bob pose un 3.'], lignes: 3, colonnes: 4,
};
// Quiz : question de texte, de carte, solution, revue, fin.
const Q_TEXTE = { id: 't1', theme: 'Histoire', type: 'texte', enonce: 'En quelle année a eu lieu la prise de la Bastille ?' };
const Q_CARTE = { id: 'cpFRA', theme: 'Carte du monde', type: 'carte', enonce: 'Placez sur la carte : France' };
const REVUE = {
  index: 1,
  question: { ...Q_CARTE, solution: 'France', cible: 'FRA', lat: 48.87, lon: 2.33 },
  reponses: [
    { joueur: 'ana', reponse: { pays: 'FRA', lat: 47, lon: 2 }, auto: 1, point: 1 },
    { joueur: 'bob', reponse: { pays: 'ESP', lat: 40, lon: -3 }, auto: 0, point: 0.5 },
    { joueur: 'cyd', reponse: null, auto: 0, point: 0 },
  ],
};
const SOMMAIRE = [
  { index: 0, type: 'texte', theme: 'Histoire', a_juger: 0, justes: 2 },
  { index: 1, type: 'carte', theme: 'Carte du monde', a_juger: 0, justes: 1 },
  { index: 2, type: 'ouverte', theme: 'Arts', a_juger: 2, justes: 0 },
];
const PARTIE_QZ = {
  phase: 'question', index: 0, total: 3, duree: 30, joueurs: ['ana', 'bob', 'cyd'],
  gagnant: null, ex_aequo: [], reste: 21, repondu: ['bob'], question: Q_TEXTE,
  ma_reponse: { texte: '1789' },
};
const TABLE_QZ = {
  ...TABLE_JEU, nombre: 15, duree: 30, carte: true, ouvertes: true,
};
const QUIZ = (partie, table = {}) => (
  <PlateauQuiz table={{ ...TABLE_QZ, ...table, partie: { ...PARTIE_QZ, ...partie } }}
               onAction={() => {}} />
);
const FIN_QZ = {
  phase: 'revue', revue: REVUE, sommaire: SOMMAIRE, scores: { ana: 2, bob: 1.5, cyd: 0 },
};
ECRANS.push(
  ['givre : au trait, carte piochée', '/givre/S7TAR',
    <PlateauGivre table={{ ...TABLE_JEU, partie: PARTIE_GV }} onAction={() => {}} />],
  ['givre : départ', '/givre/S7TAR',
    <PlateauGivre table={{
      ...TABLE_JEU, partie: { ...PARTIE_GV, phase: 'depart', tour: null, main: null },
    }} onAction={() => {}} />],
  ['givre : bilan', '/givre/S7TAR',
    <PlateauGivre table={{
      ...TABLE_JEU,
      partie: {
        ...PARTIE_GV, phase: 'bilan', tour: null, main: null, finisseur: 'bob',
        bilan: {
          ana: { points: 18, double: false },
          bob: { points: 24, double: true },
          cyd: { points: 3, double: false },
        },
      },
    }} onAction={() => {}} />],
  ['quiz : question de texte', '/quiz/S7TAR', QUIZ({})],
  ['quiz : question de carte', '/quiz/S7TAR', QUIZ({ index: 1, question: Q_CARTE, ma_reponse: null })],
  ['quiz : spectateur', '/quiz/S7TAR', QUIZ({ ma_reponse: undefined }, { membre: false, spectateur: true })],
  ['quiz : solution sur la carte', '/quiz/S7TAR', QUIZ({
    phase: 'solution', index: 1, reste: 6, question: REVUE.question,
    ma_reponse: { pays: 'FRA', lat: 47, lon: 2 }, mon_point: 1,
    points_carte: [{
      joueur: 'ana', pays: 'FRA', lat: 47, lon: 2, point: 1,
    }],
  })],
  ['quiz : revue par l’hôte', '/quiz/S7TAR', QUIZ(FIN_QZ)],
  ['quiz : revue suivie par un joueur', '/quiz/S7TAR', QUIZ(FIN_QZ, { moi: 'bob' })],
  ['quiz : fin de partie', '/quiz/S7TAR', QUIZ({
    ...FIN_QZ, phase: 'fin', gagnant: 'ana', recap: [REVUE],
  }, { etat: 'finie' })],
);

// Quiz : questions illustrées (image, rébus) et page des signalements.
const Q_IMAGE = {
  id: 'tabc', theme: 'Images : arts', type: 'texte', enonce: 'Qui a peint ce tableau ?',
  image: '/quiz/img/exemple.jpg',
};
const Q_REBUS = {
  id: 'tdef', theme: 'Rébus : films', type: 'texte', enonce: 'Quel film se cache derrière ces emojis ?',
  rebus: '🦁👑',
};
ECRANS.push(
  ['quiz : question en image', '/quiz/S7TAR', QUIZ({ question: Q_IMAGE, ma_reponse: null })],
  ['quiz : rébus', '/quiz/S7TAR', QUIZ({ question: Q_REBUS, ma_reponse: null })],
  ['quiz : solution d’une image, avec crédit', '/quiz/S7TAR', QUIZ({
    phase: 'solution', reste: 5, mon_point: 1, ma_reponse: { texte: 'Vinci' },
    question: {
      ...Q_IMAGE, solution: 'Léonard de Vinci', variantes: ['Vinci'],
      credit: 'Leonardo da Vinci · Public domain', source: 'https://commons.wikimedia.org/',
    },
  })],
  ['quiz : page des signalements', '/quiz/signalements', <Signalements />],
);

let echecs = 0;
for (const [nom, route, element] of ECRANS) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>,
    );
    // Un rendu vide est un échec.
    if (html.trim().length < 40) {
      console.error(`  ECHEC  ${nom} : rendu vide (${html.length} octets)`);
      echecs += 1;
    } else {
      console.log(`  ok     ${nom.padEnd(28)} (${html.length} octets)`);
    }
  } catch (e) {
    console.error(`  ECHEC  ${nom} : ${e.message.split('\n')[0]}`);
    echecs += 1;
  }
}

console.log(
  echecs
    ? `\n${echecs} écran(s) en échec sur ${ECRANS.length}.`
    : `\n${ECRANS.length} écrans rendus sans erreur.`,
);
process.exit(echecs ? 1 : 0);

/* Vérification de rendu : chaque route est rendue en chaîne dans Node
 * (`renderToString`). Une exception ou un rendu vide fait échouer le contrôle. */
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../src/App';
import Comptes from '../src/coque/Comptes';
import MonCompte from '../src/coque/MonCompte';
import FormulaireConnexion from '../src/coque/FormulaireConnexion';
import MenuLateral from '../src/coque/MenuLateral';
import { MODULES } from '../src/coque/modules';
import Storybook from '../src/modules/storybook/Storybook';
import {
  Plateau as PlateauCn, Preparation as PreparationCn,
} from '../src/modules/codenames/Table';
import Spectateur from '../src/modules/uno/Spectateur';
import { Plateau, SalleAttente } from '../src/modules/uno/Table';
import { Tapis } from '../src/modules/uno/Tapis';
import { CATALOGUE } from '../src/modules/storybook/catalogue';
import { CATEGORIES } from '../src/modules/storybook/fiches/arbre';
import * as ui from '../src/ui';


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

// Sessions factices : chaque écran est rendu avec la session qu'il reçoit
// (installation, compte sans accès, superadministrateur, un rôle par niveau).
const SESSION = (compte) => ({
  compte,
  installationRequise: false,
  modules: MODULES.map((m) => m.cle),
  chargee: true,
});

const tousLesRoles = () => Object.fromEntries(
  MODULES.map((m) => [m.cle, m.roles[m.roles.length - 1].cle]),
);

const SUPERADMIN = SESSION({
  nom: 'benjamin',
  superadmin: true,
  fondateur: true,
  modules: MODULES.map((m) => m.cle),
  roles: tousLesRoles(),
});
// Superadministrateur non fondateur : gère les comptes sans nommer ni
// rétrograder.
const SUPERADMIN_NON_FONDATEUR = SESSION({
  nom: 'adjoint',
  superadmin: true,
  fondateur: false,
  modules: MODULES.map((m) => m.cle),
  roles: tousLesRoles(),
});
const RESTREINT = SESSION({
  nom: 'lecteur',
  superadmin: false,
  modules: ['accueil'],
  roles: { accueil: 'acces' },
});
const SANS_ACCES = SESSION({
  nom: 'nouveau', superadmin: false, modules: [], roles: {},
});
// Chaque écran : un nom, la route et l'élément. Les modules viennent du
// registre.
const ECRANS = [
  ['chargement', '/', <App />],
  ['connexion', '/',
    <FormulaireConnexion installation={false} onEntre={() => {}} />],
  ['installation', '/',
    <FormulaireConnexion installation onEntre={() => {}} />],
  ['comptes', '/comptes',
    <Comptes session={SUPERADMIN} onChange={() => {}} />],
  ['mon compte (superadmin)', '/compte',
    <MonCompte session={SUPERADMIN} onChange={() => {}} />],
  ['mon compte (restreint)', '/compte',
    <MonCompte session={RESTREINT} onChange={() => {}} />],
  // Modules montés comme dans `App`, sous `<Route path="…/*">`.
  ...MODULES.map((m) => [
    `module ${m.cle}`, m.chemin, (
      <Routes>
        <Route path={`${m.chemin}/*`}
               element={<m.Composant session={SUPERADMIN} />} />
      </Routes>
    ),
  ]),
  ['comptes vu par un restreint', '/comptes',
    <Comptes session={RESTREINT} onChange={() => {}} />],
  ['comptes vu par un non-fondateur', '/comptes',
    <Comptes session={SUPERADMIN_NON_FONDATEUR} onChange={() => {}} />],
  ['menu superadmin', '/',
    <MenuLateral session={SUPERADMIN} onDeconnecte={() => {}} />],
  ['menu restreint', '/',
    <MenuLateral session={RESTREINT} onDeconnecte={() => {}} />],
  ['menu sans acces', '/',
    <MenuLateral session={SANS_ACCES} onDeconnecte={() => {}} />],
];

ECRANS.push(
  ['catalogue des composants', '/storybook', <Storybook />],
);

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
    <SalleAttente table={{ ...TABLE_UNO, etat: 'attente' }} onAction={() => {}} />],
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

// Chaque export de `ui/` a sa fiche dans le catalogue : son nom figure dans le
// nom de la fiche, dans ses paramètres ou dans sa liste `couvre`.
const FICHES_TEXTE = CATALOGUE.map((f) => [
  f.nom, ...(f.couvre || []), ...f.props.map((p) => p.nom),
].join(' '));
const sansFiche = Object.keys(ui).filter((nom) => !FICHES_TEXTE.some(
  (texte) => new RegExp(`(^|[^\w])${nom}([^\w]|$)`).test(texte),
));
if (sansFiche.length) {
  console.error(`  ECHEC  catalogue : exports de ui/ sans fiche : ${sansFiche.join(', ')}`);
  echecs += 1;
} else {
  console.log(`  ok     catalogue : ${Object.keys(ui).length} exports de ui/ documentés`);
}

// Chaque fiche a une catégorie, et ses dépendances existent.
const CLES = new Set(CATALOGUE.map((f) => f.cle));
const incoherentes = [
  ...CATALOGUE.filter((f) => !CATEGORIES[f.cle]).map((f) => `${f.cle} sans catégorie`),
  ...CATALOGUE.flatMap((f) => f.dependances.filter((d) => !CLES.has(d))
    .map((d) => `${f.cle} -> ${d} inconnu`)),
];
if (incoherentes.length) {
  console.error(`  ECHEC  catalogue : ${incoherentes.join(', ')}`);
  echecs += 1;
} else {
  console.log('  ok     catalogue : catégories et dépendances cohérentes');
}

// Exemples et bacs à sable de chaque fiche, rendus un à un. Un dialogue passe
// par un portail, hors rendu serveur : ces exemples sont écartés.
let exemples = 0;
let ecartes = 0;
const rendre = (nom, Composant, props = {}) => {
  try {
    renderToString(<MemoryRouter><Composant {...props} /></MemoryRouter>);
    exemples += 1;
  } catch (e) {
    if (/Target container/.test(e.message)) {
      ecartes += 1;
      return;
    }
    console.error(`  ECHEC  catalogue ${nom} : ${e.message.split('\n')[0]}`);
    echecs += 1;
  }
};
CATALOGUE.forEach((f) => {
  f.exemples.forEach((e) => rendre(`${f.cle} / ${e.titre}`, e.Rendu));
  if (f.bac) {
    const v = Object.fromEntries(f.bac.controles.map((c) => [c.cle || c.nom, c.defaut]));
    rendre(`${f.cle} / bac`, f.bac.Rendu, { v });
    f.bac.code(v);
  }
});
console.log(`  ok     catalogue : ${exemples} exemples et bacs rendus, ${ecartes} dialogues écartés`);

console.log(
  echecs
    ? `\n${echecs} écran(s) en échec sur ${ECRANS.length}.`
    : `\n${ECRANS.length} écrans rendus sans erreur.`,
);
process.exit(echecs ? 1 : 0);

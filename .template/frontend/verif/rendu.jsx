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

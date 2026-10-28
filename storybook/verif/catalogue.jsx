/* Vérification du catalogue : le storybook et chaque exemple sont rendus en
 * chaîne dans Node (`renderToString`), et chaque export de `ui/` doit avoir
 * sa fiche. Une exception ou un rendu vide fait échouer le contrôle. */
import { renderToString } from 'react-dom/server';
import Storybook from '../src/Storybook';
import { CATALOGUE } from '../src/catalogue';
import { CATEGORIES } from '../src/fiches/arbre';
import * as ui from '@ui';


// -- environnement navigateur minimal --
const magasin = new Map();
globalThis.window = {
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

// Filtre l'avertissement `useLayoutEffect` émis au rendu serveur ; les autres
// erreurs sont transmises.
const erreurReelle = console.error;
console.error = (...a) => {
  if (typeof a[0] === 'string' && a[0].includes('useLayoutEffect does nothing')) return;
  erreurReelle(...a);
};

let echecs = 0;

try {
  const html = renderToString(<Storybook />);
  if (html.trim().length < 40) {
    console.error(`  ECHEC  catalogue des composants : rendu vide (${html.length} octets)`);
    echecs += 1;
  } else {
    console.log(`  ok     catalogue des composants (${html.length} octets)`);
  }
} catch (e) {
  console.error(`  ECHEC  catalogue des composants : ${e.message.split('\n')[0]}`);
  echecs += 1;
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
    renderToString(<Composant {...props} />);
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

console.log(echecs ? `\n${echecs} contrôle(s) en échec.` : '\nCatalogue vérifié.');
process.exit(echecs ? 1 : 0);

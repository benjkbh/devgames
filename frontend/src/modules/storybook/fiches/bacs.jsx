import { useCallback, useRef, useState } from 'react';

import {
  Alerte, Badge, BadgeBooleen, BarreActions, BarreFiltres, Bouton, BoutonAide,
  BoutonCopier, BoutonOuvrir, BoutonPopup, Carte, CarteJeu, Champ, ChampCopiable,
  ChampSaisie, Chargement, ChoixLimite, Chronologie, Confirmation,
  COULEURS_UNO, Definitions, ENSEIGNES, Eventail, RANGS, VALEURS_UNO,
  Dialogue, DialogueFormulaire, EtatVide, Etapes, FenetreDetail, Filtre,
  FILTRE_DATE_VIDE, FiltrePeriode, FiltreSelection, FriseEtats, GrilleTuiles,
  IcoPlus, MarqueAppli, MenuDeroulant, Mosaique, Onglets, Page, PageGarde,
  PERIODES_TRACES, Pastille, Popup, QuestionBool, QuestionChoix, Recherche,
  Saisie, Section, Selecteur, Tableau, Tuile, Valeur, ZoneTexte,
} from '../../../ui';
import { SaisieDate } from '../../../ui/formulaire/SaisieDate';
import * as ui from '../../../ui';

// Bacs à sable : un composant, des contrôles pour en changer les props, et le
// code JSX équivalent. Un bac = `{ controles, Rendu, code }`.
//   controle   { nom, type: choix | booleen | texte | nombre, options, defaut,
//                omis, cle, groupe }
//     nom      la prop réglée ; cle : clé de la valeur si elle diffère (deux
//              sections réglées dans le même bac) ; groupe : intitulé du
//              groupe de contrôles ; omis : valeur de la prop par défaut,
//              absente du code généré.
//   Rendu      composant recevant `v` (valeurs courantes)
// Les bacs « auto » (`bacAuto`) rendent le composant avec les props lues dans
// les contrôles ET écrivent le code depuis ces mêmes contrôles : ce qui est
// affiché est ce qui est écrit.

const choix = (nom, options, defaut, omis = defaut) => (
  { nom, type: 'choix', options, defaut, omis }
);
// Choix d'une icône de `ui` ; '' : aucune. Le code généré écrit
// `nom={<IcoX />}`.
const NOMS_ICONES = Object.keys(ui).filter((n) => /^Ico[A-Z]/.test(n));
const icone = (nom, defaut = '') => ({
  nom, type: 'choix', options: ['', ...NOMS_ICONES], defaut, omis: '',
  icone: true,
});
const ico = (nom) => {
  const Ico = ui[nom];
  return Ico ? <Ico /> : undefined;
};
const booleen = (nom, defaut = false, omis = false) => (
  { nom, type: 'booleen', defaut, omis }
);
const texte = (nom, defaut, omis) => ({ nom, type: 'texte', defaut, omis });
const nombre = (nom, defaut, omis) => ({ nom, type: 'nombre', defaut, omis });
const cleDe = (c) => c.cle || c.nom;

// Écrit `<Nom a="b" c d={1}>enfants</Nom>` d'après les valeurs `v` ; des
// enfants sur plusieurs lignes sont indentés. `fixes` : props écrites à la
// main (état, fonctions : `ouvert={ouvert}`), placées avant celles des
// contrôles (`apres` : placées après) ; une balise ouvrante longue passe une
// prop par ligne.
function jsx(nom, controles, v, enfants, fixes = [], apres = []) {
  const props = controles
    .filter((c) => c.nom !== 'enfants' && !c.hors && v[cleDe(c)] !== c.omis
      && v[cleDe(c)] !== '' && v[cleDe(c)] !== undefined)
    .map((c) => {
      const x = v[cleDe(c)];
      if (c.icone) return `${c.nom}={<${x} />}`;
      if (c.element) return x ? `${c.nom}={${c.element}}` : null;
      if (c.type === 'booleen') {
        if (x) return c.nom;
        return c.omis ? `${c.nom}={false}` : null;
      }
      if (c.type === 'nombre') return `${c.nom}={${x}}`;
      return `${c.nom}="${x}"`;
    })
    .filter(Boolean);
  const toutes = [...fixes.filter(Boolean), ...props, ...apres.filter(Boolean)];
  const une = [nom, ...toutes].join(' ');
  const ouvrante = une.length > 80 || une.includes('\n')
    ? [nom, ...toutes.map((p) => p.split('\n').join('\n  '))].join('\n  ')
    : une;
  if (!enfants) return `<${ouvrante} />`;
  if (!enfants.includes('\n') && !ouvrante.includes('\n')) {
    return `<${ouvrante}>${enfants}</${nom}>`;
  }
  return `<${ouvrante}>\n${indenter(enfants)}\n</${nom}>`;
}
const indenter = (code, n = 2) => code.split('\n')
  .map((l) => ' '.repeat(n) + l).join('\n');

// Écrit une valeur JS en littéral : chaînes entre apostrophes, objets et
// tableaux sur une ligne. `decale` : un objet de plus de trois clés passe une
// clé par ligne. `CODE(texte)` : texte repris tel quel (une fonction).
const CODE = (texte) => ({ __code: texte });
function litteral(x, decale = false) {
  if (Array.isArray(x)) return `[${x.map((y) => litteral(y)).join(', ')}]`;
  if (x && typeof x === 'object') {
    if ('__code' in x) return x.__code;
    const entrees = Object.entries(x).filter(([, y]) => y !== undefined)
      .map(([k, y]) => `${k}: ${litteral(y)}`);
    if (decale && entrees.length > 3) {
      return `{\n${entrees.map((e) => `  ${e},`).join('\n')}\n}`;
    }
    return `{ ${entrees.join(', ')} }`;
  }
  if (typeof x === 'string') {
    return `'${x.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  return String(x);
}
// `nom={[ … ]}` avec une ligne par entrée.
const liste = (nom, lignes) => (lignes.length
  ? `${nom}={[\n${lignes.map((l) => `  ${l},`).join('\n')}\n]}` : `${nom}={[]}`);
const borne = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));

// Props d'après les contrôles : une icône devient un élément, une chaîne vide
// disparaît.
function propsDe(controles, v) {
  const p = {};
  controles.filter((c) => !c.hors).forEach((c) => {
    const x = v[cleDe(c)];
    if (c.icone) {
      if (x) p[c.nom] = ico(x);
    } else if (c.element) {
      if (x) p[c.nom] = c.elementRendu;
    } else if (x !== '' && x !== undefined) {
      p[c.nom] = x;
    }
  });
  return p;
}

// Contenus d'essai d'un conteneur : il reçoit n'importe quel élément. Chaque
// contenu porte son rendu et le code qui l'écrit.
const CONTENUS = {
  texte: {
    rendu: () => 'Contenu du conteneur.',
    code: 'Contenu du conteneur.',
  },
  liste: {
    rendu: () => (
      <ul className="sb-liste-simple">
        <li>Premier élément</li><li>Deuxième élément</li>
      </ul>
    ),
    code: '<ul>\n  <li>Premier élément</li>\n  <li>Deuxième élément</li>\n</ul>',
  },
  boutons: {
    rendu: () => (
      <div className="sb-ligne">
        <Bouton variante="principal" titre="Valider" />
        <Bouton titre="Annuler" />
      </div>
    ),
    code: '<div>\n  <Bouton variante="principal" titre="Valider" />\n'
      + '  <Bouton titre="Annuler" />\n</div>',
  },
  champs: {
    rendu: (k) => (
      <Champ id={`sb-bac-champ-${k}`} libelle="Nom">
        <Saisie id={`sb-bac-champ-${k}`} />
      </Champ>
    ),
    code: '<Champ id="nom" libelle="Nom">\n  <Saisie id="nom" />\n</Champ>',
  },
  tableau: {
    rendu: () => (
      <Tableau legende="Exemple" colonnes={[{ cle: 'a', libelle: 'Terminal' },
        { cle: 'b', libelle: 'Statut' }]}>
        <tbody>
          <tr><td>KM0</td><td>actif</td></tr>
          <tr><td>KM1</td><td>non actif</td></tr>
        </tbody>
      </Tableau>
    ),
    code: '<Tableau legende="Exemple" colonnes={COLONNES}>\n  <tbody>\n'
      + '    <tr><td>KM0</td><td>actif</td></tr>\n'
      + '    <tr><td>KM1</td><td>non actif</td></tr>\n  </tbody>\n</Tableau>',
  },
};
const NOMS_CONTENUS = Object.keys(CONTENUS);
const contenu = (nom = 'contenu', defaut = 'texte') => ({
  ...choix(nom, NOMS_CONTENUS, defaut, 'texte'), hors: true,
});

// Bac « auto » : rendu et code lus dans les mêmes contrôles. `avecContenu` :
// un contrôle `contenu` choisit les enfants. `reglages` : `contenu` (contenu
// initial), `encart` (aperçu dans un cadre : écrans entiers), `fixes` et
// `apres` (props écrites à la main dans le code, sans contrôle : avant, ou
// après celles des contrôles).
function bacAuto(Composant, nom, controles, avecContenu, reglages = {}) {
  const tous = avecContenu
    ? [...controles, contenu('contenu', reglages.contenu)] : controles;
  const cadre = (x) => (reglages.encart ? <div className="sb-encart">{x}</div> : x);
  return {
    controles: tous,
    Rendu: ({ v }) => cadre(
      <Composant {...propsDe(tous, v)}>
        {avecContenu && v.corps !== false
          ? CONTENUS[v.contenu].rendu('1') : undefined}
      </Composant>,
    ),
    code: (v) => jsx(nom, tous, v,
      avecContenu && v.corps !== false ? CONTENUS[v.contenu].code : undefined,
      reglages.fixes, reglages.apres),
  };
}

// Anciens bacs : rendu écrit à la main, enfants en texte.
function bac(nom, controles, rendu, avecEnfants = true) {
  return {
    controles,
    Rendu: ({ v }) => rendu(v),
    code: (v) => jsx(nom, controles, v, avecEnfants ? v.enfants : ''),
  };
}

// Carte à jouer : les contrôles d'un jeu n'apparaissent dans le code que si
// ce jeu est choisi.
const UNO = 'Carte de UNO';
const CLASSIQUE = 'Jeu de 52 cartes';
const ETAT = 'Aspect et état';
const CONTROLES_CARTE = [
  choix('jeu', ['uno', 'classique'], 'uno'),
  choix('face', ['recto', 'verso'], 'recto'),
  { ...choix('couleur', [...COULEURS_UNO, 'noir'], 'rouge'), groupe: UNO },
  { ...choix('valeur', VALEURS_UNO, '7'), groupe: UNO },
  { ...choix('couleurChoisie', ['', ...COULEURS_UNO], '', ''), groupe: UNO },
  { ...choix('enseigne', ENSEIGNES, 'coeur'), groupe: CLASSIQUE },
  { ...choix('rang', [...RANGS, 'joker'], 'A'), groupe: CLASSIQUE },
  { ...choix('taille', ['xs', 's', 'm', 'l', 'xl'], 'l', 'm'), groupe: ETAT },
  { ...nombre('inclinaison', 0, 0), groupe: ETAT },
  { ...booleen('jouable'), groupe: ETAT },
  { ...booleen('selectionnee'), groupe: ETAT },
  { ...booleen('desactivee'), groupe: ETAT },
  { ...booleen('cliquable', true), hors: true, groupe: ETAT },
];
const controlesCarte = (v) => CONTROLES_CARTE.filter((c) => !c.hors
  && (c.groupe !== UNO || v.jeu === 'uno')
  && (c.groupe !== CLASSIQUE || v.jeu === 'classique'));

const CONTROLES_EVENTAIL = [
  { ...nombre('cartes', 7), hors: true },
  nombre('chevauchement', 0.45, 0.45),
  booleen('arc', true),
  texte('libelle', 'Ma main', ''),
  { ...choix('taille', ['xs', 's', 'm', 'l'], 'm'), hors: true },
];

const COULEURS_BADGE = ['gris', 'sang', 'or', 'bleu', 'vert', 'orange', 'rouge'];
const COULEURS_PASTILLE = ['vert', 'bleu', 'rouge', 'orange', 'sang', 'or',
  'ardoise', 'gris', 'vide'];
const COULEURS_FRISE = [...COULEURS_PASTILLE, 'hachures'];

function OngletsBac({ v }) {
  const [actif, setActif] = useState('a');
  const onglets = [
    { cle: 'a', libelle: 'Détail' },
    { cle: 'b', libelle: 'Traces', compte: v.compte || undefined },
    { cle: 'c', libelle: 'Erreurs', puce: v.puce },
  ];
  return (
    <Onglets onglets={onglets} actif={actif} onChange={setActif}
             libelle="Bac" variante={v.variante} />
  );
}

function RadioBac({ v }) {
  const [valeur, setValeur] = useState('a');
  return (
    <QuestionChoix nom="sb-bac-radio" legende={v.legende || undefined}
                   disposition={v.disposition} desactive={v.desactive}
                   valeur={valeur} onChange={setValeur}
                   options={[{ valeur: 'a', libelle: 'Option A', resume: 'Un.' },
                     { valeur: 'b', libelle: 'Option B', resume: 'Deux.' }]} />
  );
}

function SaisieBac({ v }) {
  const [valeur, setValeur] = useState('');
  const date = v.type === 'date' || v.type === 'datetime-local';
  return (
    <div className="sb-colonne sb-etroit">
      <Saisie key={v.type} type={v.type} value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              taille={v.taille || undefined} erreur={v.erreur}
              disabled={v.disabled} aria-label="Bac"
              placeholder={date ? undefined : v.placeholder}
              min={v.min || undefined} max={v.max || undefined} />
      <p>Valeur : <code>{valeur || '(vide)'}</code></p>
    </div>
  );
}

function CaseBac({ v }) {
  const [coche, setCoche] = useState(true);
  return (
    <QuestionBool libelle={v.libelle} description={v.description || undefined}
                  checked={coche} onChange={setCoche} disabled={v.disabled} />
  );
}

// Réglages d'une section, avec leurs clés propres (`titre1`, `titre2`).
const reglagesSection = (n, defauts) => [
  { ...texte('titre', defauts.titre), cle: `titre${n}`, groupe: `Section ${n}` },
  { ...texte('suffixe', defauts.suffixe, ''), cle: `suffixe${n}` },
  { ...choix('niveau', ['', 'attention'], '', ''), cle: `niveau${n}` },
  { ...icone('icone', defauts.icone), cle: `icone${n}` },
  { ...contenu(`contenu${n}`), nom: 'contenu', cle: `contenu${n}` },
];
const CONTROLES_SECTIONS = [
  ...reglagesSection(1, { titre: 'Anomalies', suffixe: '3', icone: 'IcoPlus' }),
  ...reglagesSection(2, { titre: 'Historique', suffixe: '', icone: '' }),
];
const vueSection = (v, n) => Object.fromEntries(
  CONTROLES_SECTIONS.filter((c) => c.cle.endsWith(String(n)))
    .map((c) => [c.nom, v[c.cle]]));
const controlesSection = reglagesSection(1, {}).map((c) => ({ ...c, cle: c.nom }));

// Contrôles de Page ; `actions` est un bouton d'essai.
const BOUTON_ACTION = <Bouton variante="principal" titre="Action" />;
const CONTROLES_PAGE = [
  texte('titre', 'Terminaux'), texte('description', 'Parc de pointeuses.', ''),
  choix('largeur', ['', 'etroite'], '', ''),
  { ...booleen('actions'), element: '<Bouton variante="principal" titre="Action" />',
    elementRendu: BOUTON_ACTION },
  contenu(),
];

// -- Formulaire ---------------------------------------------------------------

// ChampSaisie : la description `champ` est écrite et rendue depuis les mêmes
// contrôles (`champDe`).
const TYPES_CHAMP = ['texte', 'texte_long', 'choix', 'entier', 'decimal', 'date',
  'mot_de_passe', 'email', 'telephone', 'code_postal', 'ip', 'lignes'];
const CONTROLES_CHAMP_SAISIE = [
  { ...choix('type', TYPES_CHAMP, 'texte'), groupe: 'Description (champ)' },
  texte('libelle', 'Libellé du champ'), booleen('obligatoire'),
  texte('aide', ''), texte('aide_detail', ''),
  choix('disposition', ['', 'segments'], '', ''), booleen('verrouille'),
  texte('placeholder', ''), texte('min', ''), texte('max', ''),
  nombre('longueur_max', 0, 0), nombre('rows', 2, 2),
  texte('valeurs', 'Option A, Option B, Option C'),
  { ...texte('erreur', ''), groupe: 'Props' }, booleen('fige'),
];
const nombreSi = (x) => (/^-?\d+$/.test(x) ? Number(x) : x);
function champDe(v) {
  const c = { type: v.type };
  if (v.libelle) c.libelle = v.libelle;
  if (v.obligatoire) c.obligatoire = true;
  if (v.aide) c.aide = v.aide;
  if (v.aide_detail) c.aide_detail = v.aide_detail;
  if (v.type === 'choix' || v.type === 'lignes') {
    c.valeurs = v.valeurs.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (v.type === 'choix' && v.disposition) c.disposition = v.disposition;
  if (v.verrouille) c.verrouille = true;
  if (v.placeholder) c.placeholder = v.placeholder;
  if (v.min !== '') c.min = nombreSi(v.min);
  if (v.max !== '') c.max = nombreSi(v.max);
  if (v.longueur_max) c.longueur_max = v.longueur_max;
  if (v.rows !== 2) c.rows = v.rows;
  return c;
}

function ChampSaisieBac({ v }) {
  const [valeur, setValeur] = useState(v.type === 'lignes' ? [] : '');
  return (
    <div className="sb-colonne sb-etroit">
      <ChampSaisie id="sb-bac-champ-saisie" champ={champDe(v)} valeur={valeur}
                   onChange={setValeur} erreur={v.erreur || undefined}
                   fige={v.fige} />
      <p>Valeur : <code>{JSON.stringify(valeur)}</code></p>
    </div>
  );
}

// BarreActions : de un à trois boutons, chacun avec son code.
const BOUTONS_BARRE = [
  [<Bouton key="a" titre="Annuler" />, '<Bouton titre="Annuler" />'],
  [<Bouton key="b" variante="principal" titre="Enregistrer" />,
    '<Bouton variante="principal" titre="Enregistrer" />'],
  [<Bouton key="c" couleur="rouge" titre="Supprimer" />,
    '<Bouton couleur="rouge" titre="Supprimer" />'],
];
const CONTROLES_BARRE_ACTIONS = [
  choix('alignement', ['debut', 'fin', 'entre'], 'debut'), booleen('collante'),
  { ...nombre('boutons', 3, 3), hors: true },
];

// Filtres : valeurs d'essai partagées.
const CLIENTS = ['AEROSOFT', 'INTACT', 'PDG'];
const CLIENTS_OBJETS = [{ valeur: 'aerosoft', libelle: 'Aérosoft' },
  { valeur: 'intact', libelle: 'Intact' }, { valeur: 'pdg', libelle: 'PDG' }];

const CONTROLES_PERIODE = [
  { ...choix('periodes', ['toutes', 'traces'], 'toutes'), hors: true },
  booleen('heure'), booleen('bloc'), choix('taille', ['s', 'm'], 's'),
];
function FiltrePeriodeBac({ v }) {
  const [valeur, setValeur] = useState({ ...FILTRE_DATE_VIDE, periode: '24h' });
  return (
    <div className="sb-colonne">
      <div className="sb-ligne">
        <FiltrePeriode {...propsDe(CONTROLES_PERIODE, v)} valeur={valeur}
                       onChange={setValeur}
                       periodes={v.periodes === 'traces' ? PERIODES_TRACES : undefined} />
      </div>
      <p>Valeur : <code>{JSON.stringify(valeur)}</code></p>
    </div>
  );
}

const CONTROLES_SELECTION = [
  texte('libelle', 'Client'), texte('toutes', 'Tous les clients', 'Tous'),
  choix('taille', ['', 's'], '', ''),
  { ...choix('options', ['textes', 'valeur / libellé'], 'textes'), hors: true },
];
function FiltreSelectionBac({ v }) {
  const [valeur, setValeur] = useState('');
  return (
    <div className="sb-colonne">
      <div className="sb-ligne">
        <FiltreSelection {...propsDe(CONTROLES_SELECTION, v)} valeur={valeur}
                         onChange={setValeur}
                         options={v.options === 'textes' ? CLIENTS : CLIENTS_OBJETS} />
      </div>
      <p>Valeur : <code>{valeur || '(vide)'}</code></p>
    </div>
  );
}

const CONTROLES_LIMITE = [
  nombre('total', 340, undefined), choix('taille', ['s', 'm'], 's'),
];
function ChoixLimiteBac({ v }) {
  const [limite, setLimite] = useState(20);
  return (
    <div className="sb-colonne">
      <div className="sb-ligne">
        <ChoixLimite {...propsDe(CONTROLES_LIMITE, v)} valeur={limite}
                     onChange={setLimite} />
      </div>
      <p>Valeur : <code>{limite}</code></p>
    </div>
  );
}

// Filtre : le contrôle posé dedans.
const ENFANTS_FILTRE = {
  sélecteur: {
    rendu: () => (
      <Selecteur aria-label="Client">
        <option>Tous les clients</option><option>AEROSOFT</option>
      </Selecteur>
    ),
    code: '<Selecteur aria-label="Client">…</Selecteur>',
  },
  'saisie texte': {
    rendu: () => <Saisie taille="s" placeholder="nom…" aria-label="Nom" />,
    code: '<Saisie taille="s" placeholder="nom…" aria-label="Nom" />',
  },
  'saisie nombre': {
    rendu: () => <Saisie taille="s" type="number" aria-label="Minimum" />,
    code: '<Saisie taille="s" type="number" aria-label="Minimum" />',
  },
};
const CONTROLES_FILTRE = [
  texte('libelle', 'Client'),
  { ...choix('enfant', Object.keys(ENFANTS_FILTRE), 'sélecteur'), hors: true },
];

// BarreFiltres : quels contrôles posés dedans, et leur code.
const ACTION_BARRE = <Bouton variante="principal" icone={<IcoPlus />} titre="Nouveau" />;
const CONTROLES_BARRE_FILTRES = [
  booleen('carte'), texte('titre', 'Filtres', ''), booleen('colonne'),
  { ...booleen('actions', true),
    element: '<Bouton variante="principal" icone={<IcoPlus />} titre="Nouveau" />',
    elementRendu: ACTION_BARRE },
  { ...booleen('recherche', true, true), hors: true },
  { ...booleen('periode', true, true), hors: true },
  { ...booleen('client', true, true), hors: true },
  { ...booleen('limite', true, true), hors: true },
];
// `titre` ne sert que dans une carte.
const reglagesBarre = (v) => CONTROLES_BARRE_FILTRES
  .filter((c) => c.nom !== 'titre' || v.carte);
function BarreFiltresBac({ v }) {
  const [saisie, setSaisie] = useState('');
  const [dates, setDates] = useState({ ...FILTRE_DATE_VIDE, periode: '24h' });
  const [client, setClient] = useState('');
  const [limite, setLimite] = useState(20);
  return (
    <BarreFiltres {...propsDe(reglagesBarre(v), v)}>
      {v.recherche && (
        <Recherche libelle="Rechercher" taille="s" value={saisie}
                   placeholder="nom ou badge…"
                   onChange={(e) => setSaisie(e.target.value)} />
      )}
      {v.periode && (
        <FiltrePeriode valeur={dates} onChange={setDates} bloc={v.colonne} />
      )}
      {v.client && (
        <FiltreSelection libelle="Client" options={CLIENTS} valeur={client}
                         onChange={setClient} toutes="Tous les clients" />
      )}
      {v.limite && (
        <ChoixLimite valeur={limite} onChange={setLimite} total={340} />
      )}
    </BarreFiltres>
  );
}
const enfantsBarre = (v) => [
  v.recherche && '<Recherche libelle="Rechercher" taille="s" value={q} onChange={majQ} />',
  v.periode && `<FiltrePeriode valeur={dates} onChange={setDates}${v.colonne ? ' bloc' : ''} />`,
  v.client && '<FiltreSelection libelle="Client" options={CLIENTS} valeur={c} onChange={setC} />',
  v.limite && '<ChoixLimite valeur={n} onChange={setN} total={340} />',
].filter(Boolean).join('\n');

// -- Tableau et données -------------------------------------------------------

// Valeur : ce qu'une cellule reçoit, et ce qu'on écrit entre les balises.
const CELLULES = {
  texte: ['actif', 'actif'],
  nombre: [42, '{42}'],
  zéro: [0, '{0}'],
  null: [null, '{null}'],
  undefined: [undefined, '{undefined}'],
  'chaîne vide': ['', "{''}"],
  élément: [<Badge couleur="vert" titre="actif" />,
    '<Badge couleur="vert" titre="actif" />'],
};

// Tableau : colonnes et lignes d'essai ; le code reprend les mêmes colonnes.
const CONTROLES_TABLEAU = [
  texte('legende', 'Terminaux', ''), booleen('fixe'), booleen('collant'),
  choix('niveau', ['', 'attention'], '', ''),
  { ...booleen('triable'), hors: true },
  { ...booleen('largeurs'), hors: true },
  { ...nombre('lignes', 3, 3), hors: true },
];
const colonnesTableau = (v) => [
  { cle: 'nom', libelle: 'Nom', triable: v.triable || undefined,
    largeur: v.largeurs ? '40%' : undefined },
  { cle: 'etat', libelle: 'État' },
  { cle: 'n', libelle: 'Nombre', nombre: true, triable: v.triable || undefined },
];
const lignesTableau = (v) => Array.from({ length: borne(v.lignes, 1, 40) },
  (_, i) => ({ nom: `KM${i}`, etat: i % 3 === 1 ? 'arrêté' : 'actif', n: (i * 7 + 3) % 50 }));
function TableauBac({ v }) {
  const [tri, setTri] = useState({ cle: 'nom', sens: 'asc' });
  const trier = (cle) => setTri((t) => ({
    cle, sens: t.cle === cle && t.sens === 'asc' ? 'desc' : 'asc',
  }));
  const lignes = lignesTableau(v);
  if (v.triable) {
    lignes.sort((a, b) => (tri.cle === 'n' ? a.n - b.n
      : a.nom.localeCompare(b.nom, 'fr', { numeric: true }))
      * (tri.sens === 'asc' ? 1 : -1));
  }
  return (
    <Tableau {...propsDe(CONTROLES_TABLEAU, v)} colonnes={colonnesTableau(v)}
             tri={v.triable ? tri : undefined}
             onTri={v.triable ? trier : undefined}>
      <tbody>
        {lignes.map((l) => (
          <tr key={l.nom}>
            <td className="fort">{l.nom}</td>
            <td>{l.etat}</td>
            <td className="col-nombre">{l.n}</td>
          </tr>
        ))}
      </tbody>
    </Tableau>
  );
}
function codeTableau(v) {
  const n = borne(v.lignes, 1, 40);
  const lignes = lignesTableau(v).slice(0, 3).map((l) => `  <tr><td className="fort">${
    l.nom}</td><td>${l.etat}</td><td className="col-nombre">${l.n}</td></tr>`);
  if (n > 3) lignes.push(`  {/* … ${n - 3} autres lignes */}`);
  return jsx('Tableau', CONTROLES_TABLEAU, v,
    `<tbody>\n${lignes.join('\n')}\n</tbody>`,
    [liste('colonnes', colonnesTableau(v).map((c) => litteral(c)))],
    v.triable ? ['tri={tri}', 'onTri={trier}'] : []);
}

// SaisieDate : le même champ que `Saisie type="date"`, mais `onChange` reçoit
// la valeur.
const CONTROLES_SAISIE_DATE = [
  booleen('heure'), choix('taille', ['', 's'], '', ''), booleen('erreur'),
  booleen('disabled'), texte('placeholder', '', ''),
  texte('min', '', ''), texte('max', '', ''),
];
function SaisieDateBac({ v }) {
  const [valeur, setValeur] = useState('');
  return (
    <div className="sb-colonne sb-etroit">
      <SaisieDate {...propsDe(CONTROLES_SAISIE_DATE, v)} valeur={valeur}
                  onChange={setValeur} aria-label="Date" />
      <p>Valeur : <code>{valeur || '(vide)'}</code></p>
    </div>
  );
}

// Mosaique : de un à six terminaux, dans les mêmes données pour le rendu et
// pour le code.
const TERMINAUX = [['KM0', 'actif', 'T6'], ['KM1', 'arrêté', 'T6'],
  ['KM2', 'actif', 'T9'], ['KM3', 'actif', 'T6'], ['KM4', 'arrêté', 'T9'],
  ['KM5', 'actif', 'T6']];
const CONTROLES_MOSAIQUE = [
  { ...nombre('nombre', 3, 3), hors: true },
  { ...booleen('lignes', true, true), hors: true },
  { ...booleen('attention'), hors: true },
  texte('legende', 'Terminaux', ''),
];
const elementsMosaique = (v) => TERMINAUX.slice(0, borne(v.nombre, 1, 6))
  .map(([titre, etat, modele], i) => ({
    cle: String.fromCharCode(97 + i), titre,
    niveau: v.attention && i === 1 ? 'attention' : undefined,
    lignes: v.lignes ? [['État', etat], ['Modèle', modele]] : undefined,
  }));
function MosaiqueBac({ v }) {
  const [ouvert, setOuvert] = useState(null);
  return (
    <Mosaique {...propsDe(CONTROLES_MOSAIQUE, v)} elements={elementsMosaique(v)}
              ouvert={ouvert}
              onOuvrir={(cle) => setOuvert((o) => (o === cle ? null : cle))}
              libelleOuvrir={(e) => `Détail de ${e.titre}`} />
  );
}

// -- Retour : fenêtres --------------------------------------------------------

// Un bouton ouvre la fenêtre, `fermer` la referme : l'état de ces bacs est
// local.
const ONGLETS_BAC = [
  { cle: 'a', libelle: 'Détail' },
  { cle: 'b', libelle: 'Traces', compte: 42 },
  { cle: 'c', libelle: 'Erreurs', puce: true },
];
const BARRE_BAC = (
  <Onglets onglets={ONGLETS_BAC} actif="a" onChange={() => {}} libelle="Exemple" />
);
const ACTION_TETE = <Bouton variante="fantome" icone={<IcoPlus />} libelle="Ajouter" />;
const BARRE_CODE = '<Onglets onglets={ONGLETS} actif="a" onChange={setA} … />';
const ACTION_TETE_CODE = '<Bouton variante="fantome" icone={<IcoPlus />} libelle="Ajouter" />';

const CONTROLES_DIALOGUE = [
  texte('titre', 'Titre du dialogue'),
  texte('description', 'Description du dialogue.', ''),
  choix('taille', ['m', 'l', 'xl'], 'm'),
  texte('entete', '', ''),
  { ...booleen('barre'), element: BARRE_CODE, elementRendu: BARRE_BAC },
  { ...booleen('actionsTete'), element: ACTION_TETE_CODE,
    elementRendu: ACTION_TETE },
  booleen('alerte'),
  { ...booleen('onSubmit'), hors: true },
  { ...booleen('actions', true, true), hors: true },
  contenu('contenu', 'texte'),
];
function DialogueBac({ v }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = () => setOuvert(false);
  return (
    <>
      <Bouton variante="principal" titre="Ouvrir le dialogue"
              onClick={() => setOuvert(true)} />
      <Dialogue
        {...propsDe(CONTROLES_DIALOGUE, v)}
        ouvert={ouvert} onFermer={fermer}
        onSubmit={v.onSubmit ? (e) => { e.preventDefault(); fermer(); } : undefined}
        actions={v.actions ? (
          <>
            {v.onSubmit && (
              <Bouton type="submit" variante="principal" titre="Valider" />
            )}
            <Bouton onClick={fermer} titre="Fermer" />
          </>
        ) : undefined}>
        {CONTENUS[v.contenu].rendu('dialogue')}
      </Dialogue>
    </>
  );
}
function codeDialogue(v) {
  const actions = v.onSubmit
    ? '<><Bouton type="submit" variante="principal" titre="Valider" />'
      + '<Bouton titre="Fermer" onClick={fermer} /></>'
    : '<Bouton titre="Fermer" onClick={fermer} />';
  return jsx('Dialogue', CONTROLES_DIALOGUE, v, CONTENUS[v.contenu].code,
    ['ouvert={ouvert}'], ['onFermer={fermer}',
      v.onSubmit && 'onSubmit={envoyer}', v.actions && `actions={${actions}}`]);
}

const CONTROLES_CONFIRMATION = [
  texte('titre', 'Supprimer ce site ?'),
  texte('message', 'Cette action est définitive.'),
  texte('libelle', 'Supprimer'), booleen('danger'), booleen('occupe'),
];
function ConfirmationBac({ v }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = () => setOuvert(false);
  return (
    <>
      <Bouton couleur={v.danger ? 'rouge' : 'sang'} titre="Ouvrir la confirmation"
              onClick={() => setOuvert(true)} />
      <Confirmation {...propsDe(CONTROLES_CONFIRMATION, v)} ouvert={ouvert}
                    onConfirmer={fermer} onAnnuler={fermer} />
    </>
  );
}

const CONTROLES_DETAIL = [
  texte('titre', 'KM0 @ DIGIDIZ'),
  { ...booleen('entete', true),
    element: '<Badge couleur="vert" titre="actif" />',
    elementRendu: <Badge couleur="vert" titre="actif" /> },
  choix('taille', ['m', 'l', 'xl'], 'xl'),
  texte('libelleOnglets', '', ''),
  { ...booleen('actionsTete'), element: ACTION_TETE_CODE,
    elementRendu: ACTION_TETE },
  { ...nombre('onglets', 3, 3), hors: true },
  contenu('contenu', 'texte'),
];
function FenetreDetailBac({ v }) {
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState('a');
  const barre = borne(v.onglets, 0, 3) > 1;
  return (
    <>
      <Bouton variante="principal" titre="Ouvrir le détail"
              onClick={() => setOuvert(true)} />
      <FenetreDetail {...propsDe(CONTROLES_DETAIL, v)} ouvert={ouvert}
                     onFermer={() => setOuvert(false)}
                     onglets={barre ? ONGLETS_BAC.slice(0, borne(v.onglets, 0, 3)) : undefined}
                     onglet={onglet} onOnglet={setOnglet}>
        {v.contenu === 'texte' ? `Contenu de l’onglet « ${onglet} ».`
          : CONTENUS[v.contenu].rendu('detail')}
      </FenetreDetail>
    </>
  );
}
const codeDetail = (v) => jsx('FenetreDetail', CONTROLES_DETAIL, v,
  v.contenu === 'texte' ? 'Contenu de l’onglet « {onglet} ».' : CONTENUS[v.contenu].code,
  ['ouvert={ouvert}'], ['onFermer={fermer}', ...(borne(v.onglets, 0, 3) > 1
    ? ['onglets={ONGLETS}', 'onglet={onglet}', 'onOnglet={setOnglet}'] : [])]);

const CONTROLES_DIALOGUE_FORM = [
  texte('titre', 'Nouveau site'), texte('description', '', ''),
  choix('taille', ['m', 'l', 'xl'], 'm'),
  texte('libelleEnvoi', 'Enregistrer', 'Enregistrer'),
  booleen('envoiDesactive'), booleen('occupe'),
  texte('erreur', '', ''), booleen('erreurCompacte', true, true),
  { ...booleen('onSupprimer'), hors: true },
  texte('libelleSupprimer', 'Supprimer', 'Supprimer'),
  booleen('lectureSeule'), contenu('contenu', 'champs'),
];
function DialogueFormulaireBac({ v }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = () => setOuvert(false);
  return (
    <>
      <Bouton variante="principal" titre="Ouvrir le formulaire"
              onClick={() => setOuvert(true)} />
      <DialogueFormulaire
        {...propsDe(CONTROLES_DIALOGUE_FORM, v)}
        ouvert={ouvert} onFermer={fermer}
        onSubmit={(e) => { e.preventDefault(); fermer(); }}
        onSupprimer={v.onSupprimer ? fermer : undefined}>
        {CONTENUS[v.contenu].rendu('formulaire')}
      </DialogueFormulaire>
    </>
  );
}

// Popup : une ancre (un bouton) et la popup posée dessus.
const CONTROLES_POPUP = [
  texte('titre', 'Titre de la popup'),
  texte('enfants', 'Contenu de la popup.'),
];
function PopupBac({ v }) {
  const ancre = useRef(null);
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <Bouton ref={ancre} onClick={() => setOuvert((o) => !o)}
              titre="Ancre de la popup" />
      <Popup ouvert={ouvert} ancre={ancre} titre={v.titre} onFermer={fermer}>
        {v.enfants}
      </Popup>
    </>
  );
}

// MenuDeroulant : trois actions, la dernière choisie est affichée.
const CONTROLES_MENU = [
  texte('libelle', 'Actions'), icone('icone'),
  choix('variante', ['principal', 'secondaire', 'fantome'], 'principal'),
  choix('taille', ['s', 'm', 'l'], 'm'), booleen('desactive'),
  choix('alignement', ['fin', 'debut'], 'fin'),
  texte('note', 'Note sous la liste.', ''),
  { ...booleen('descriptions', true, true), hors: true },
];
const itemsMenu = (v) => [
  { cle: 'a', libelle: 'Première', description: v.descriptions ? 'Fait A.' : undefined },
  { cle: 'b', libelle: 'Seconde', description: v.descriptions ? 'Fait B.' : undefined },
  { cle: 'c', libelle: 'Indisponible', desactive: true },
];
function MenuDeroulantBac({ v }) {
  const [derniere, setDerniere] = useState('');
  return (
    <div className="sb-colonne">
      <div className="sb-ligne">
        <MenuDeroulant {...propsDe(CONTROLES_MENU, v)}
                       items={itemsMenu(v).map((i) => (
                         { ...i, onClick: () => setDerniere(i.libelle) }))} />
      </div>
      <p>Dernière action : <code>{derniere || '(aucune)'}</code></p>
    </div>
  );
}

// -- Chronologie --------------------------------------------------------------

const EVENEMENTS = [
  { cle: 1, date: '08/10 10:05', titre: 'Transmise', auteur: 'jdoe',
    note: 'Envoyée au fournisseur.' },
  { cle: 2, date: '07/10 16:40', titre: 'Validée', auteur: 'mdupont' },
  { cle: 3, date: '07/10 09:00', titre: 'Créée', auteur: 'jdoe',
    note: 'Création depuis le formulaire.' },
  { cle: 4, date: '06/10 14:12', titre: 'Brouillon', auteur: 'jdoe' },
  { cle: 5, date: '06/10 11:30', titre: 'Demande reçue',
    note: 'Courriel du client.' },
];
const CONTROLES_CHRONO = [
  nombre('evenements', 3, undefined), booleen('auteurs', true, true),
  booleen('notes', true, true),
].map((c) => ({ ...c, hors: true }));
const evenementsDe = (v) => EVENEMENTS.slice(0, borne(v.evenements, 0, 5))
  .map(({ auteur, note, ...e }) => ({
    ...e, auteur: v.auteurs ? auteur : undefined, note: v.notes ? note : undefined,
  }));
function ChronologieBac({ v }) {
  const evenements = evenementsDe(v);
  return (
    <>
      <Chronologie evenements={evenements} />
      {evenements.length === 0 && (
        <p className="dim">Aucun événement : le composant ne rend rien.</p>
      )}
    </>
  );
}

// Les boutons de la rangée BarreActions.
const boutonsBarre = (v) => BOUTONS_BARRE.slice(0, borne(v.boutons, 1, 3));

export const BACS = {
  bouton: bacAuto(Bouton, 'Bouton', [
    choix('variante', ['principal', 'secondaire', 'fantome'], 'secondaire'),
    choix('couleur', ['sang', 'or', 'bleu', 'rouge', 'vert'], 'sang'),
    choix('taille', ['s', 'm', 'l'], 'm'),
    texte('titre', 'Enregistrer', ''),
    texte('libelle', '', ''),
    icone('icone'), icone('iconeFin'),
    choix('type', ['button', 'submit', 'reset'], 'button'),
    booleen('waiting'), booleen('disabled'), booleen('bloc'),
  ]),
  badge: bacAuto(Badge, 'Badge', [
    choix('couleur', COULEURS_BADGE, 'gris'), booleen('majuscules'),
    texte('suffixe', '', ''), texte('titre', 'accepté', ''),
  ]),
  'badge-booleen': bacAuto(BadgeBooleen, 'BadgeBooleen', [
    booleen('vrai', true),
    choix('couleurVrai', COULEURS_BADGE, 'vert'),
    choix('couleurFaux', COULEURS_BADGE, 'gris'),
    texte('suffixe', '', ''), texte('titre', 'client', ''),
  ]),
  pastille: bacAuto(Pastille, 'Pastille', [
    choix('couleur', COULEURS_PASTILLE, 'vert', ''), booleen('compact'),
  ]),
  carte: bacAuto(Carte, 'Carte', [
    texte('titre', 'Titre', ''), texte('sousTitre', '', ''),
    choix('niveau', ['', 'accent', 'attention'], '', ''),
    booleen('compacte'), booleen('corps', true, true),
  ], true),
  section: {
    controles: CONTROLES_SECTIONS,
    Rendu: ({ v }) => (
      <>
        {[1, 2].map((n) => (
          <Section key={n} {...propsDe(controlesSection, vueSection(v, n))}>
            {CONTENUS[v[`contenu${n}`]].rendu(String(n))}
          </Section>
        ))}
      </>
    ),
    code: (v) => [1, 2].map((n) => jsx('Section', controlesSection,
      vueSection(v, n), CONTENUS[v[`contenu${n}`]].code)).join('\n\n'),
  },
  page: bacAuto(Page, 'Page', CONTROLES_PAGE.slice(0, -1), true),
  tuile: bac('Tuile', [
    texte('libelle', 'Badgeages'), texte('valeur', '1 623'),
    texte('detail', 'sur la période'),
  ], (v) => (
    <Tuile libelle={v.libelle} valeur={v.valeur} detail={v.detail || undefined} />
  ), false),
  'grille-tuiles': {
    controles: [nombre('minimum', 200, 200), nombre('nombre', 4, 4)],
    Rendu: ({ v }) => (
      <GrilleTuiles minimum={v.minimum} tuiles={tuilesDe(v.nombre)} />
    ),
    code: (v) => `<GrilleTuiles${v.minimum === 200 ? '' : ` minimum={${v.minimum}}`}
  tuiles={[
${tuilesDe(v.nombre).map((t) => `    { libelle: '${t.libelle}', valeur: '${t.valeur}' },`).join('\n')}
  ]} />`,
  },
  definitions: bac('Definitions', [
    choix('disposition', ['pile', 'grille', 'ligne'], 'pile'), booleen('mono'),
  ], (v) => (
    <Definitions disposition={v.disposition} mono={v.mono}
                 items={[['Adresse IP', '10.1.12.115'], ['Modèle', 'T6'],
                   ['Passerelle', '10.1.12.1']]} />
  ), false),
  etapes: bac('Etapes', [choix('courante', ['', 'a', 'b', 'c'], 'b', '')], (v) => (
    <Etapes libelle="Bac" courante={v.courante}
            etapes={[{ cle: 'a', libelle: 'Création' },
              { cle: 'b', libelle: 'Transmise' },
              { cle: 'c', libelle: 'Livrée' }]} />
  ), false),
  alerte: bac('Alerte', [
    choix('niveau', ['danger', 'attention', 'info', 'succes', 'neutre'],
      'danger'),
    texte('titre', ''), booleen('compacte'), texte('enfants', 'Message.'),
  ], (v) => (
    <Alerte niveau={v.niveau} titre={v.titre || undefined}
            compacte={v.compacte}>{v.enfants}</Alerte>
  )),
  'etat-vide': bac('EtatVide', [
    texte('titre', 'Rien à afficher'), booleen('compact'),
    icone('icone', 'IcoAccueil'),
    texte('enfants', 'Aucun résultat pour ce filtre.'),
  ], (v) => (
    <EtatVide titre={v.titre || undefined} compact={v.compact}
              icone={ico(v.icone)}>{v.enfants}</EtatVide>
  )),
  chargement: bac('Chargement', [
    texte('texte', 'Chargement…', 'Chargement…'), booleen('compact'),
  ], (v) => <Chargement texte={v.texte} compact={v.compact} />, false),
  onglets: {
    controles: [choix('variante', ['souligne', 'pilule'], 'souligne'),
      nombre('compte', 42, undefined), booleen('puce', true)],
    Rendu: OngletsBac,
    code: (v) => `<Onglets onglets={ONGLETS} actif={a} onChange={setA} libelle="…"${
      v.variante === 'pilule' ? ' variante="pilule"' : ''} />`,
  },
  saisie: {
    controles: [
      choix('type', ['text', 'number', 'password', 'date', 'datetime-local'],
        'text'),
      choix('taille', ['', 's'], '', ''), booleen('erreur'),
      booleen('disabled'), texte('placeholder', 'Tapez ici', ''),
      texte('min', '', ''), texte('max', '', ''),
    ],
    Rendu: SaisieBac,
    code: (v) => jsx('Saisie', [choix('type', [], 'text'),
      choix('taille', [], '', ''), booleen('erreur'), booleen('disabled'),
      texte('placeholder', '', ''), texte('min', '', ''), texte('max', '', '')],
    v, '').replace('<Saisie', '<Saisie value={v} onChange={(e) => setV(e.target.value)}'),
  },
  selecteur: bac('Selecteur', [
    choix('taille', ['', 's'], '', ''), booleen('bloc'), booleen('disabled'),
  ], (v) => (
    <Selecteur taille={v.taille || undefined} bloc={v.bloc}
               disabled={v.disabled} aria-label="Bac">
      <option>Option A</option>
      <option>Option B</option>
    </Selecteur>
  ), false),
  'zone-texte': bac('ZoneTexte', [
    nombre('rows', 3, undefined), booleen('disabled'),
  ], (v) => (
    <ZoneTexte rows={v.rows} disabled={v.disabled} aria-label="Bac" />
  ), false),
  recherche: bac('Recherche', [
    choix('taille', ['', 's'], '', ''), texte('placeholder', 'nom ou badge…', ''),
  ], (v) => (
    <Recherche libelle="Rechercher" taille={v.taille || undefined}
               placeholder={v.placeholder} />
  ), false),
  'frise-etats': {
    controles: [
      choix('segment1', COULEURS_FRISE, 'vert', ''),
      choix('segment2', COULEURS_FRISE, 'hachures', ''),
      choix('segment3', COULEURS_FRISE, 'orange', ''),
      choix('periode', ['24 h', '7 jours'], '24 h', ''),
      booleen('attenue'),
    ],
    Rendu: ({ v }) => {
      const fin = Math.floor(Date.now() / 1000);
      const duree = v.periode === '7 jours' ? 7 * 86400 : 86400;
      const debut = fin - duree;
      const bornes = [debut, debut + duree * 0.45, debut + duree * 0.7, fin];
      return (
        <FriseEtats libelle="Bac" debut={debut} fin={fin}
                    attenue={v.attenue}
                    segments={[1, 2, 3].map((n) => ({
                      cle: n, debut: bornes[n - 1], fin: bornes[n],
                      couleur: v[`segment${n}`], libelle: v[`segment${n}`],
                      infobulle: `Segment ${n} : ${v[`segment${n}`]}`,
                    }))} />
      );
    },
    code: (v) => `<FriseEtats debut={d} fin={f} libelle="…"${v.attenue ? ' attenue' : ''}
  segments={[
    { couleur: '${v.segment1}', … },
    { couleur: '${v.segment2}', … },
    { couleur: '${v.segment3}', … },
  ]} />`,
  },
  champ: bac('Champ', [
    texte('libelle', 'Nom'), booleen('requis'), texte('aide', ''),
    texte('erreur', ''), texte('etiquette', ''), booleen('verrouille'),
  ], (v) => (
    <Champ id="sb-bac-champ" libelle={v.libelle} requis={v.requis}
           aide={v.aide || undefined} erreur={v.erreur || undefined}
           etiquette={v.etiquette || undefined} verrouille={v.verrouille}>
      <Saisie id="sb-bac-champ" />
    </Champ>
  ), false),
  'question-choix': {
    controles: [choix('disposition', ['cartes', 'segments'], 'cartes'),
      texte('legende', 'Légende', ''), booleen('desactive')],
    Rendu: RadioBac,
    code: (v) => jsx('QuestionChoix', [choix('disposition', [], 'cartes'),
      texte('legende', '', ''), booleen('desactive')], v, ''),
  },
  'question-bool': {
    controles: [texte('libelle', 'Recevoir un rappel', ''),
      texte('description', 'Une fois par semaine.', ''), booleen('disabled')],
    Rendu: CaseBac,
    code: (v) => jsx('QuestionBool', [texte('libelle', '', ''),
      texte('description', '', ''), booleen('disabled')], v, ''),
  },
  tableau: {
    controles: CONTROLES_TABLEAU, Rendu: TableauBac, code: codeTableau,
  },
  'saisie-date': {
    controles: CONTROLES_SAISIE_DATE,
    Rendu: SaisieDateBac,
    code: (v) => jsx('SaisieDate', CONTROLES_SAISIE_DATE, v, '',
      ['valeur={d}', 'onChange={setD}']),
  },
  'champ-saisie': {
    controles: CONTROLES_CHAMP_SAISIE,
    Rendu: ChampSaisieBac,
    code: (v) => {
      const props = ['id="nom"', 'valeur={v}', 'onChange={setV}',
        v.erreur && `erreur="${v.erreur}"`, v.fige && 'fige'].filter(Boolean);
      const champ = litteral(champDe(v), true).replace(/\n/g, '\n  ');
      return `<ChampSaisie ${props.join(' ')}\n  champ={${champ}} />`;
    },
  },
  'barre-actions': {
    controles: CONTROLES_BARRE_ACTIONS,
    Rendu: ({ v }) => (
      <BarreActions {...propsDe(CONTROLES_BARRE_ACTIONS, v)}>
        {boutonsBarre(v).map(([b]) => b)}
      </BarreActions>
    ),
    code: (v) => jsx('BarreActions', CONTROLES_BARRE_ACTIONS, v,
      boutonsBarre(v).map(([, c]) => c).join('\n')),
  },
  'bouton-copier': bacAuto(BoutonCopier, 'BoutonCopier', [
    texte('valeur', '10.1.12.115'),
    choix('variante', ['principal', 'secondaire', 'fantome'], 'secondaire'),
    choix('taille', ['s', 'm', 'l'], 's'),
  ]),
  'champ-copiable': bacAuto(ChampCopiable, 'ChampCopiable', [
    texte('valeur', 'https://exemple.fr/commande/abc'),
    texte('libelle', 'Lien', ''),
    texte('etiquette', '', ''),
  ]),
  filtre: {
    controles: CONTROLES_FILTRE,
    Rendu: ({ v }) => (
      <Filtre {...propsDe(CONTROLES_FILTRE, v)}>
        {ENFANTS_FILTRE[v.enfant].rendu()}
      </Filtre>
    ),
    code: (v) => jsx('Filtre', CONTROLES_FILTRE, v, ENFANTS_FILTRE[v.enfant].code),
  },
  'filtre-periode': {
    controles: CONTROLES_PERIODE,
    Rendu: FiltrePeriodeBac,
    code: (v) => jsx('FiltrePeriode', CONTROLES_PERIODE, v, '',
      ['valeur={dates}', 'onChange={setDates}'],
      [v.periodes === 'traces' && 'periodes={PERIODES_TRACES}']),
  },
  'filtre-selection': {
    controles: CONTROLES_SELECTION,
    Rendu: FiltreSelectionBac,
    code: (v) => jsx('FiltreSelection', CONTROLES_SELECTION, v, '', [], [
      v.options === 'textes' ? `options={${litteral(CLIENTS)}}`
        : liste('options', CLIENTS_OBJETS.map((o) => litteral(o))),
      'valeur={client}', 'onChange={setClient}']),
  },
  'choix-limite': {
    controles: CONTROLES_LIMITE,
    Rendu: ChoixLimiteBac,
    code: (v) => jsx('ChoixLimite', CONTROLES_LIMITE, v, '',
      ['valeur={limite}', 'onChange={setLimite}']),
  },
  'barre-filtres': {
    controles: CONTROLES_BARRE_FILTRES,
    Rendu: BarreFiltresBac,
    code: (v) => jsx('BarreFiltres', reglagesBarre(v), v, enfantsBarre(v)),
  },
  valeur: {
    controles: [choix('children', Object.keys(CELLULES), 'texte')],
    Rendu: ({ v }) => (
      <div className="sb-ligne"><Valeur>{CELLULES[v.children][0]}</Valeur></div>
    ),
    code: (v) => `<Valeur>${CELLULES[v.children][1]}</Valeur>`,
  },
  'bouton-ouvrir': bacAuto(BoutonOuvrir, 'BoutonOuvrir', [
    texte('libelle', 'Détail de KM0', ''), booleen('ouvert'),
    texte('titre', 'Voir le détail', 'Voir le détail'),
  ], false, { apres: ['onClick={ouvrir}'] }),
  mosaique: {
    controles: CONTROLES_MOSAIQUE,
    Rendu: MosaiqueBac,
    code: (v) => jsx('Mosaique', CONTROLES_MOSAIQUE, v, '', [], [
      liste('elements', elementsMosaique(v).map((e) => litteral(e))),
      'ouvert={cle}', 'onOuvrir={ouvrir}',
      'libelleOuvrir={(e) => `Détail de ${e.titre}`}']),
  },
  chronologie: {
    controles: CONTROLES_CHRONO,
    Rendu: ChronologieBac,
    code: (v) => jsx('Chronologie', [], v, '', [],
      [liste('evenements', evenementsDe(v).map((e) => litteral(e)))]),
  },
  'marque-appli': bacAuto(MarqueAppli, 'MarqueAppli', [
    texte('nom', 'Pointeuse', 'Pointeuse'), texte('sousNom', 'Supervision', ''),
  ]),
  'page-garde': bacAuto(PageGarde, 'PageGarde', [
    texte('appli', '', ''), texte('sousNom', 'Supervision', ''),
    texte('titre', 'Connexion', ''),
    texte('sousTitre', 'Entrez vos identifiants.', ''),
    choix('variante', ['carte', 'libre'], 'carte'),
  ], true, { encart: true, contenu: 'champs' }),
  dialogue: {
    controles: CONTROLES_DIALOGUE, Rendu: DialogueBac, code: codeDialogue,
  },
  confirmation: {
    controles: CONTROLES_CONFIRMATION,
    Rendu: ConfirmationBac,
    code: (v) => jsx('Confirmation', CONTROLES_CONFIRMATION, v, '',
      ['ouvert={ouvert}'], ['onConfirmer={confirmer}', 'onAnnuler={annuler}']),
  },
  'fenetre-detail': {
    controles: CONTROLES_DETAIL, Rendu: FenetreDetailBac, code: codeDetail,
  },
  'dialogue-formulaire': {
    controles: CONTROLES_DIALOGUE_FORM,
    Rendu: DialogueFormulaireBac,
    code: (v) => jsx('DialogueFormulaire', CONTROLES_DIALOGUE_FORM, v,
      CONTENUS[v.contenu].code, ['ouvert={ouvert}'], ['onFermer={fermer}',
        'onSubmit={envoyer}', v.onSupprimer && 'onSupprimer={supprimer}']),
  },
  popup: {
    controles: CONTROLES_POPUP,
    Rendu: PopupBac,
    code: (v) => jsx('Popup', CONTROLES_POPUP, v, v.enfants,
      ['ouvert={ouvert}', 'ancre={ancre}'], ['onFermer={fermer}']),
  },
  'bouton-popup': bacAuto(BoutonPopup, 'BoutonPopup', [
    texte('titre', 'Détail', ''), texte('libelle', 'Infos', ''),
    icone('icone', 'IcoInfo'),
    choix('className', ['', 'btn btn-fantome btn-sang btn-m btn-carre',
      'btn btn-secondaire btn-sang btn-m btn-carre',
      'btn btn-principal btn-sang btn-m btn-carre'],
    'btn btn-fantome btn-sang btn-m btn-carre', ''),
    texte('title', 'Plus d’informations', ''),
  ], true),
  'carte-jeu': {
    controles: CONTROLES_CARTE,
    Rendu: ({ v }) => (
      <CarteJeu {...propsDe(controlesCarte(v), v)}
                onClick={v.cliquable ? () => {} : undefined} />
    ),
    code: (v) => jsx('CarteJeu', controlesCarte(v), v, '', [],
      [v.cliquable && 'onClick={() => jouer(carte)}']),
  },
  eventail: {
    controles: CONTROLES_EVENTAIL,
    Rendu: ({ v }) => (
      <Eventail {...propsDe(CONTROLES_EVENTAIL, v)}>
        {Array.from({ length: borne(v.cartes, 1, 15) }, (_, i) => (
          <CarteJeu key={i} taille={v.taille} couleur={COULEURS_UNO[i % 4]}
                    valeur={VALEURS_UNO[(i * 7) % VALEURS_UNO.length]}
                    onClick={() => {}} />
        ))}
      </Eventail>
    ),
    code: (v) => jsx('Eventail', CONTROLES_EVENTAIL, v,
      `{main.map((c) => <CarteJeu key={c.id} taille="${v.taille}" {...c} />)}`),
  },
  'bouton-aide': bacAuto(BoutonAide, 'BoutonAide', [
    texte('titre', 'Aide', ''), texte('symbole', '?', '?'),
    texte('libelle', 'En savoir plus', 'En savoir plus'),
  ], true),
  'menu-deroulant': {
    controles: CONTROLES_MENU,
    Rendu: MenuDeroulantBac,
    code: (v) => jsx('MenuDeroulant', CONTROLES_MENU, v, '', [], [
      liste('items', itemsMenu(v).map((i) => litteral(
        { ...i, onClick: CODE(`() => agir('${i.cle}')`) })))]),
  },
};

function tuilesDe(n) {
  return Array.from({ length: Math.max(1, Math.min(8, n || 1)) }, (_, i) => ({
    libelle: `Tuile ${i + 1}`, valeur: String(12 * (i + 1)),
  }));
}

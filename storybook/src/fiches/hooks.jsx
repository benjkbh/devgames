import { useCallback, useRef, useState } from 'react';

import { P } from './aide';
import {
  Bouton, Carte, QuestionBool, Recherche, Saisie, Selecteur, Tableau, cx,
  useAction, useBlocageDefilement, useChargement, useClicExterieur, useCopie,
  useEchap, useEnsemble, useLecture, usePreference, useRecherche, useSondage,
  useTemporise, useTheme, useTri, bornes, dateHeureCourte, dateLocaleComplete,
  duree, identique, pluriel, texte,
} from '@ui';

function TemporiseEtat() {
  const [saisie, setSaisie] = useState('');
  const retardee = useTemporise(saisie, 500);
  return (
    <div className="sb-colonne sb-etroit">
      <Saisie value={saisie} onChange={(e) => setSaisie(e.target.value)}
              placeholder="Tapez vite…" aria-label="Saisie" />
      <p>Valeur retardée (500 ms) : <code>{retardee || '-'}</code></p>
    </div>
  );
}

const FRUITS = [
  { id: 1, nom: 'Pomme', poids: 150 },
  { id: 2, nom: 'Poire', poids: 180 },
  { id: 3, nom: 'Prune', poids: 40 },
  { id: 4, nom: 'Abricot', poids: 60 },
];
const texteFruit = (f) => f.nom;

function EnsembleEtat() {
  const { valeurs, basculer, remplacer, vider } = useEnsemble([2]);
  return (
    <div className="sb-colonne">
      {FRUITS.map((f) => (
        <QuestionBool key={f.id} libelle={f.nom} checked={valeurs.has(f.id)}
              onChange={() => basculer(f.id)} />
      ))}
      <div className="sb-ligne">
        <Bouton taille="s" onClick={() => remplacer(FRUITS.map((f) => f.id))} titre="Tout choisir" />
        <Bouton taille="s" onClick={vider} titre="Vider" />
        <span>{`${valeurs.size} choisi(s)`}</span>
      </div>
    </div>
  );
}

function RechercheEtat() {
  const { champ, trouves } = useRecherche(FRUITS, texteFruit, 200);
  return (
    <div className="sb-colonne sb-etroit">
      <Recherche libelle="Rechercher un fruit" taille="s" {...champ}
                 placeholder="po, pr…" />
      <ul className="sb-liste-simple">
        {trouves.map((f) => <li key={f.id}>{f.nom}</li>)}
        {trouves.length === 0 && <li>Aucun résultat.</li>}
      </ul>
    </div>
  );
}

const COLONNES_FRUITS = [
  { cle: 'nom', libelle: 'Fruit', triable: true },
  { cle: 'poids', libelle: 'Poids (g)', triable: true, nombre: true },
];
const valeurFruit = (f, cle) => f[cle];

function TriEtat() {
  const { tri, basculer, lignes } = useTri(FRUITS, valeurFruit);
  return (
    <Tableau legende="Fruits" colonnes={COLONNES_FRUITS} tri={tri}
             onTri={basculer}>
      <tbody>
        {lignes.map((f) => (
          <tr key={f.id}><td>{f.nom}</td><td className="num">{f.poids}</td></tr>
        ))}
      </tbody>
    </Tableau>
  );
}

// Faux serveur de `useLecture` : répond après 400 ms, avec le paramètre reçu
// et le numéro de la lecture.
let lecturesFaites = 0;
const lireFruit = ({ fruit }) => new Promise((ok) => {
  setTimeout(() => {
    lecturesFaites += 1;
    ok({ fruit, numero: lecturesFaites });
  }, 400);
});

function LectureEtat() {
  const [fruit, setFruit] = useState('Pomme');
  const [actif, setActif] = useState(true);
  const { donnees, erreur, enCours, relire } = useLecture(
    lireFruit, { fruit }, 3000, actif,
  );
  return (
    <div className="sb-colonne sb-etroit">
      <Selecteur value={fruit} onChange={(e) => setFruit(e.target.value)}
                 aria-label="Fruit lu">
        {FRUITS.map((f) => <option key={f.id}>{f.nom}</option>)}
      </Selecteur>
      <QuestionBool libelle="Lecture active" description="Relue toutes les 3 s."
                    checked={actif} onChange={setActif} />
      <div className="sb-ligne">
        <Bouton taille="s" titre="Relire" onClick={relire} />
        <span>enCours : <code>{String(enCours)}</code></span>
      </div>
      <p>
        Dernière réponse :{' '}
        <code>
          {donnees ? `${donnees.fruit}, lecture n° ${donnees.numero}` : '-'}
        </code>
        {erreur ? ` (${erreur})` : ''}
      </p>
    </div>
  );
}

// Faux serveur de `useChargement` : rend la liste après 600 ms, ou échoue.
const lireFruits = (echec) => new Promise((ok, ko) => {
  setTimeout(() => (echec ? ko(new Error('Serveur injoignable (simulé).'))
    : ok(FRUITS.map(texteFruit))), 600);
});

function ChargementEtat() {
  const [echec, setEchec] = useState(false);
  const { donnees, erreur, charge, recharger, remplacer } = useChargement(
    () => lireFruits(echec), [echec],
  );
  return (
    <div className="sb-colonne sb-etroit">
      <QuestionBool libelle="Simuler un échec" checked={echec}
                    onChange={setEchec} />
      <div className="sb-ligne">
        <Bouton taille="s" titre="Recharger" onClick={recharger} />
        <Bouton taille="s" titre="Retirer le premier"
                disabled={!donnees || donnees.length === 0}
                onClick={() => remplacer(donnees.slice(1))} />
      </div>
      <p>
        {charge ? 'Chargé' : 'Chargement…'}
        {erreur ? ` ; erreur : ${erreur}` : ''}
      </p>
      <p>
        Données :{' '}
        <code>{donnees ? (donnees.join(', ') || '(vide)') : 'null'}</code>
      </p>
    </div>
  );
}

function SondageEtat() {
  const [actif, setActif] = useState(true);
  const [lectures, setLectures] = useState(0);
  // Stable : sinon la boucle repartirait à chaque rendu.
  const lire = useCallback(() => new Promise((ok) => {
    setTimeout(() => { setLectures((n) => n + 1); ok(); }, 300);
  }), []);
  useSondage(lire, 1500, actif);
  return (
    <div className="sb-colonne sb-etroit">
      <QuestionBool libelle="Sondage actif"
                    description="Une lecture 1,5 s après la fin de la précédente."
                    checked={actif} onChange={setActif} />
      <p>Lectures effectuées : <code>{lectures}</code></p>
    </div>
  );
}

function EvenementsEtat() {
  const [ouvert, setOuvert] = useState(false);
  const [cause, setCause] = useState('');
  const declencheur = useRef(null);
  const panneau = useRef(null);
  const fermer = (raison) => { setOuvert(false); setCause(raison); };
  useClicExterieur([declencheur, panneau], () => fermer('clic extérieur'),
    ouvert);
  useEchap(() => fermer('Échap'), ouvert);
  useBlocageDefilement(ouvert);
  return (
    <div className="sb-colonne sb-etroit">
      <div className="sb-ligne">
        <Bouton ref={declencheur}
                titre={ouvert ? 'Fermer le panneau' : 'Ouvrir le panneau'}
                onClick={() => { setOuvert((o) => !o); setCause(''); }} />
        <span>
          {ouvert ? 'Ouvert : défilement de la page bloqué.'
            : `Fermé${cause ? ` (${cause})` : ''}.`}
        </span>
      </div>
      {ouvert && (
        <div ref={panneau}>
          <Carte titre="Panneau" compacte>
            Cliquez en dehors du panneau, ou appuyez sur Échap, pour le fermer.
          </Carte>
        </div>
      )}
    </div>
  );
}

function PreferenceEtat() {
  const [valeur, setValeur] = usePreference('storybook-exemple', 'a',
    ['a', 'b']);
  return (
    <Bouton onClick={() => setValeur(valeur === 'a' ? 'b' : 'a')}>
      Valeur mémorisée : {valeur}
    </Bouton>
  );
}

function ThemeEtat() {
  const [theme, basculer] = useTheme();
  return <Bouton onClick={basculer}>Thème actuel : {theme}</Bouton>;
}

function CopieEtat() {
  const [copie, copier] = useCopie();
  return (
    <Bouton onClick={() => copier('texte copié')} titre={copie ? 'Copié' : 'Copier « texte copié »'} />
  );
}

function ActionEtat() {
  const { occupe, erreur, executer } = useAction();
  const [issue, setIssue] = useState('');
  const lancer = (echec) => async () => {
    const r = await executer(() => new Promise((ok, ko) => {
      setTimeout(() => (echec ? ko(new Error('Échec simulé')) : ok('fait')),
        800);
    }));
    setIssue(r.ok ? `ok : ${r.resultat}` : `erreur : ${r.erreur.message}`);
  };
  return (
    <div className="sb-colonne">
      <div className="sb-ligne">
        <Bouton waiting={occupe} onClick={lancer(false)} titre="Réussir" />
        <Bouton waiting={occupe} onClick={lancer(true)} titre="Échouer" />
      </div>
      <p>{issue || 'Aucune action lancée.'}{erreur ? ` (${String(erreur)})` : ''}</p>
    </div>
  );
}

export const FICHES = [
  {
    cle: 'cx', nom: 'cx',
    resume: 'Assemble des classes CSS en ignorant les valeurs fausses.',
    props: [P('...classes', 'string | faux', '`cx("btn", actif && "actif", '
      + 'undefined)` → « btn actif ».')],
    exemples: [{
      titre: 'Résultat',
      Rendu: () => <code>{cx('btn', true && 'actif', false && 'cache')}</code>,
      code: "cx('btn', actif && 'actif')",
    }],
  },
  {
    cle: 'format', nom: 'Formats (ui/outils/format)',
    resume: 'Mise en forme des valeurs affichées : textes, pluriels, dates et '
      + 'heures (depuis un `epoch`, en secondes Unix), durées et taux.',
    props: [
      P('texte(v)', 'string', 'Tiret si la valeur est absente.'),
      P('pluriel(n, singulier, pluralise)', 'string', '« 1 terminal », '
        + '« 3 terminaux » ; `pluralise` vaut `singulier` suivi de « s » par '
        + 'défaut.'),
      P('dateHeureCourte(epoch)', 'string', 'Date et heure sans année, '
        + '« 16/09 09:21:43 », fuseau du poste ; tiret si absent.'),
      P('dateLocaleComplete(epoch)', 'string', 'Date complète ; chaîne vide '
        + 'si absente.'),
      P('estVide(v)', 'booléen', 'Vrai pour `null`, `undefined` et `""`, pas '
        + 'pour `0` ni `false`.'),
      P('heureLocale(epoch)', 'string', 'Heure seule du poste ; tiret si '
        + 'absente.'),
      P('dateCourte(epoch)', 'string', 'Date seule du poste, « 16/09/2026 » '
        + 'en français ; tiret si absente.'),
      P('dateJour(iso)', 'string', 'Date seule depuis une chaîne '
        + '`AAAA-MM-JJ` : « 02/11/2026 ». Aucun fuseau appliqué.'),
      P('depuis(epoch)', 'string', 'Durée écoulée en langage courant : '
        + '« 12 min », « 3 h », « 2 j » ; `null` si absent.'),
      P('duree(secondes)', 'string', 'Durée en secondes : « 42 s », '
        + '« 12 min », « 5 h 12 min », « 3 j 4 h ».'),
      P('taux(n, maxi)', 'string', '« 3 / 10 (30.0 %) » ; `null` si `n` ou '
        + '`maxi` manque.'),
    ],
    exemples: [{
      titre: 'Exemples',
      Rendu: () => {
        const maintenant = Math.floor(Date.now() / 1000);
        return (
          <ul className="sb-liste-simple">
            <li><code>texte(null)</code> → {texte(null)}</li>
            <li><code>pluriel(3, 'terminal', 'terminaux')</code> →
              {' '}{pluriel(3, 'terminal', 'terminaux')}</li>
            <li><code>dateHeureCourte(maintenant)</code> →
              {' '}{dateHeureCourte(maintenant)}</li>
            <li><code>dateLocaleComplete(maintenant)</code> →
              {' '}{dateLocaleComplete(maintenant)}</li>
            <li><code>duree(3725)</code> → {duree(3725)}</li>
          </ul>
        );
      },
      code: "pluriel(n, 'terminal', 'terminaux')",
    }],
  },
  {
    cle: 'use-ensemble', nom: 'useEnsemble',
    couvre: ['basculerDans'],
    resume: 'Ensemble de clés en état : lignes dépliées, cases cochées. '
      + '`basculerDans(ensemble, cle)` rend un nouvel ensemble, pour un '
      + 'ensemble tenu par le parent.',
    props: [
      P('initial', 'itérable', 'Clés de départ.', '[]'),
      P('→ valeurs', 'Set', 'Ensemble courant.'),
      P('→ a(cle)', 'fonction', 'Appartenance.'),
      P('→ basculer(cle)', 'fonction', 'Ajoute la clé, ou la retire.'),
      P('→ remplacer(cles) · vider()', 'fonctions', '`remplacer(cles)` : '
        + 'l’ensemble devient exactement `cles` (itérable) ; `vider()` : '
        + 'l’ensemble devient vide.'),
    ],
    exemples: [{ titre: 'Cases à cocher', Rendu: EnsembleEtat,
      code: 'const { valeurs, basculer, vider } = useEnsemble();' }],
  },
  {
    cle: 'use-recherche', nom: 'useRecherche',
    resume: 'Recherche texte dans une liste : saisie temporisée, puis les '
      + 'éléments dont le texte contient la saisie, sans tenir compte de la '
      + 'casse. `texte` doit garder la même identité d’un rendu à l’autre.',
    props: [
      P('elements', 'tableau', 'Liste complète où chercher.'),
      P('texte(element)', 'fonction', 'Texte où chercher.'),
      P('delai', 'ms', 'Temporisation de la saisie avant le filtrage (voir '
        + '`useTemporise`).', '350'),
      P('→ champ', '{ value, onChange }', 'À étaler sur `Recherche`.'),
      P('→ q · trouves', '', 'Saisie retenue ; liste filtrée (toute la liste '
        + 'si `q` est vide).'),
    ],
    exemples: [{ titre: 'Liste de fruits', Rendu: RechercheEtat,
      code: 'const { champ, trouves } = useRecherche(fruits, texteFruit);' }],
  },
  {
    cle: 'use-tri', nom: 'useTri', couvre: ['comparer'],
    resume: 'Tri d’un tableau au clic sur un en-tête : même colonne, le sens '
      + 's’inverse ; autre colonne, ordre croissant. Nombres entre eux, sinon '
      + 'texte (« 2 » avant « 10 »), valeurs absentes toujours en dernier. '
      + '`comparer(a, b, sens)` est exporté seul.',
    props: [
      P('lignes', 'tableau', 'Lignes à trier ; le tableau d’origine n’est '
        + 'pas modifié.'),
      P('valeur(ligne, cle)', 'fonction', 'Ce que trie la colonne.'),
      P('departage(a, b)', 'fonction', 'Ordre des égalités.'),
      P('→ tri · basculer', '', '`tri` : `{ cle, sens }` ou `null` ; à passer '
        + 'à `Tableau` (`tri`, `onTri`).'),
      P('→ lignes', 'tableau', 'Triées ; dans l’ordre d’origine sans tri '
        + 'choisi.'),
    ],
    exemples: [{ titre: 'Tableau triable', Rendu: TriEtat,
      code: 'const { tri, basculer, lignes } = useTri(l, valeur);' }],
  },
  {
    cle: 'periode', nom: 'Périodes (ui/outils/periode)',
    couvre: ['PERSO', 'PERIODES', 'PERIODES_TRACES', 'FILTRE_DATE_VIDE',
      'LIMITES', 'LIMITE_DEFAUT'],
    resume: 'Fenêtre de dates des filtres de liste : raccourcis de durée ou '
      + 'bornes libres.',
    props: [
      P('PERIODES · PERIODES_TRACES · PERSO', '', '`PERIODES` : tous les '
        + 'choix (`""`, `1h`, `24h`, `7j`, `30j`, `perso`) ; `PERIODES_TRACES` '
        + ': `""`, `1h`, `24h`, `perso` ; `PERSO` : bornes libres `du` / `au`.'),
      P('FILTRE_DATE_VIDE', '{ periode, du, au }', 'Valeur de départ.'),
      P('bornes(filtre)', '{ depuis, jusqua }', 'Bornes en secondes pour '
        + 'l’API ; un champ absent est omis.'),
      P('filtreDateActif(filtre)', 'booléen', 'Vrai si le filtre borne la '
        + 'recherche : période choisie, ou date renseignée en `perso`.'),
      P('LIMITES · LIMITE_DEFAUT', '', 'Choix du nombre de lignes '
        + '(`[10, 20, 50, 100]`) ; choix par défaut (`20`).'),
    ],
    exemples: [{
      titre: 'Bornes de « Dernière heure »',
      Rendu: () => (
        <code>{JSON.stringify(bornes({ periode: '1h', du: '', au: '' }))}</code>
      ),
      code: "bornes({ periode: '1h', du: '', au: '' })",
    }],
  },
  {
    cle: 'identique', nom: 'identique',
    resume: 'Égalité profonde de deux réponses JSON, en ignorant des clés.',
    props: [P('a · b', 'JSON', 'Les deux valeurs à comparer : égales si '
      + '`a === b` ou si leurs sérialisations JSON le sont (l’ordre des clés '
      + 'compte).'),
    P('ignorees', 'string[]', 'Clés ignorées à tous les niveaux.', '[]')],
    exemples: [{
      titre: 'Résultat',
      Rendu: () => (
        <code>{String(identique({ a: 1, t: 1 }, { a: 1, t: 2 }, ['t']))}</code>
      ),
      code: "identique({ a: 1, t: 1 }, { a: 1, t: 2 }, ['t'])",
    }],
  },
  {
    cle: 'use-lecture', nom: 'useLecture',
    resume: 'Lecture paramétrée, relue toutes les `periode` ms tant que '
      + '`actif`. Une réponse identique à la précédente ne provoque aucun '
      + 'rendu ; une réponse à d’anciens paramètres est ignorée.',
    props: [
      P('lecteur(parametres)', 'fonction', 'Asynchrone : rend les données ; '
        + 'rappelée quand le contenu de `parametres` change.'),
      P('parametres', 'objet', 'Paramètres passés à `lecteur`. Comparés par '
        + 'leur contenu (JSON) : un nouvel objet de même contenu ne relance '
        + 'rien.'),
      P('periode', 'ms', 'Une seule lecture sans période.'),
      P('actif', 'booléen', 'Faux : plus aucune lecture, ni périodique ni '
        + 'unique.', 'true'),
      P('→ donnees', '', 'Dernière réponse, conservée pendant un changement '
        + 'de paramètres.'),
      P('→ erreur · enCours · relire', '', '`erreur` : message de la '
        + 'dernière lecture échouée, sinon `null` ; `enCours` : la réponse '
        + 'aux paramètres actuels n’est pas arrivée ; `relire()` : relance la '
        + 'lecture.'),
    ],
    exemples: [{ titre: 'Lecture périodique paramétrée', Rendu: LectureEtat,
      code: 'const { donnees, enCours, relire } = useLecture(lire, { fruit }, 3000);' }],
  },
  {
    cle: 'use-chargement', nom: 'useChargement',
    resume: 'Lecture au montage, relançable ; seule la réponse de la dernière '
      + 'lecture compte.',
    props: [P('lire', 'fonction', 'Asynchrone : rend les données ; appelée au '
      + 'montage, à chaque `recharger()` et quand `deps` change.'),
    P('deps', 'tableau', 'Dépendances de `lire`, comme pour `useCallback` ; '
      + '`[]` si elle ne dépend de rien. À toujours fournir.'),
    P('→ donnees · erreur', '', '`donnees` : dernière réponse (`null` avant '
      + 'la première, conservée en cas d’échec) ; `erreur` : message de la '
      + 'dernière lecture échouée, chaîne vide sinon.'),
    P('→ charge', 'booléen', 'Vrai dès la première réponse (succès ou '
      + 'erreur).'),
    P('→ recharger · remplacer', 'fonctions', '`recharger()` : relance `lire` '
      + 'et rend les données (`null` en cas d’échec) ; `remplacer(donnees)` : '
      + 'substitue les données sans lire (mise à jour locale).')],
    exemples: [{ titre: 'Chargement, échec simulé, rechargement',
      Rendu: ChargementEtat,
      code: 'const { donnees, charge, recharger } = useChargement(() => api(id), [id]);' }],
  },
  {
    cle: 'use-action', nom: 'useAction',
    resume: 'Action qui écrit : `occupe` pendant la requête, `erreur` si elle '
      + 'échoue. `executer(action)` ne lève jamais.',
    props: [
      P('→ occupe · erreur', '', '`occupe` : vrai pendant l’action ; '
        + '`erreur` : message de la dernière erreur, chaîne vide sinon.'),
      P('→ setErreur(message)', 'fonction', 'Pose ou efface le message à la '
        + 'main (par exemple une erreur de validation locale).'),
      P('→ executer(action)', 'async', 'Rend `{ ok: true, resultat }` ou '
        + '`{ ok: false, erreur }` (l’exception d’origine, avec ses '
        + '`champs`).'),
    ],
    exemples: [{ titre: 'Succès et échec simulés', Rendu: ActionEtat,
      code: 'const { occupe, executer } = useAction();' }],
  },
  {
    cle: 'use-sondage', nom: 'useSondage',
    resume: 'Relecture périodique : `lire` tout de suite, puis `periode` ms '
      + 'après la fin de chaque lecture. Suspendue en arrière-plan.',
    props: [P('lire', 'fonction', 'Stable (`useCallback`) : sinon la boucle '
      + 'repart. Peut être asynchrone : le délai court à partir de sa fin.'),
    P('periode', 'ms', 'Délai entre la fin d’une lecture et le début de la '
      + 'suivante.'),
    P('actif', 'booléen', 'Faux : la boucle est arrêtée, `lire` n’est plus '
      + 'appelée.', 'true')],
    exemples: [{ titre: 'Compteur de lectures', Rendu: SondageEtat,
      code: 'useSondage(lire, 1500, actif); // lire : useCallback' }],
  },
  {
    cle: 'use-temporise', nom: 'useTemporise',
    resume: 'Valeur qui suit `valeur` après `delai` ms sans changement.',
    props: [P('valeur', 'any', 'Valeur à suivre (texte saisi, filtre…).'),
      P('delai', 'ms', 'Durée sans changement avant de reprendre la nouvelle '
        + 'valeur.', '350'),
      P('→', 'any', 'La valeur temporisée : d’abord `valeur`, puis chaque '
        + 'nouvelle valeur `delai` ms après son dernier changement.')],
    exemples: [{ titre: 'Recherche différée', Rendu: TemporiseEtat,
      code: 'const recherche = useTemporise(saisie, 500);' }],
  },
  {
    cle: 'use-preference', nom: 'usePreference',
    resume: 'Préférence du poste en chaîne, dans `localStorage` (repli sur '
      + 'le défaut si le stockage lève).',
    props: [P('cle', 'string', 'Clé de la préférence dans `localStorage`.'),
      P('defaut', 'string | fonction', 'Évaluée une seule fois.'),
      P('valides', 'string[]', 'Valeurs acceptées à la relecture.'),
      P('→', '[valeur, setValeur]', 'La valeur courante (relue au montage, à '
        + 'défaut `defaut`) et son modificateur, qui accepte une valeur ou '
        + 'une fonction comme `useState` ; chaque changement est réécrit dans '
        + '`localStorage`.')],
    exemples: [{ titre: 'Valeur mémorisée', Rendu: PreferenceEtat,
      code: "const [v, setV] = usePreference('cle', 'a', ['a', 'b']);" }],
  },
  {
    cle: 'use-theme', nom: 'useTheme',
    resume: 'Thème `sombre` ou `clair`, mémorisé, posé dans l’attribut '
      + '`data-theme` de `<html>` ; défaut : `sombre`.',
    props: [P('→', '[theme, basculer]', '`theme` : `sombre` ou `clair` ; '
      + '`basculer()` passe de l’un à l’autre.')],
    exemples: [{ titre: 'Bascule', Rendu: ThemeEtat,
      code: 'const [theme, basculer] = useTheme();' }],
  },
  {
    cle: 'use-copie', nom: 'useCopie',
    resume: 'Copie dans le presse-papier ; `copie` reste vrai `duree` ms '
      + 'après une copie réussie (faux si le presse-papier est refusé).',
    props: [P('duree', 'ms', 'Durée pendant laquelle `copie` reste vrai après '
      + 'une copie réussie.', '2000'),
    P('→', '[copie, copier(texte)]', '`copie` : vrai pendant `duree` ms après '
      + 'une copie réussie ; `copier(texte)` : écrit `texte` dans le '
      + 'presse-papier (asynchrone, ne lève jamais).')],
    exemples: [{ titre: 'Copie', Rendu: CopieEtat,
      code: 'const [copie, copier] = useCopie();' }],
  },
  {
    cle: 'use-evenements',
    nom: 'useClicExterieur · useEchap · useBlocageDefilement',
    resume: 'Écouteurs de document des surcouches (popup, menu, dialogue).',
    props: [
      P('useClicExterieur(zones, rappel, actif)', '', 'Rappel sur un '
        + '`mousedown` hors de toutes les zones (refs) ; le déclencheur doit '
        + 'en faire partie. `actif` (vrai par défaut) : faux retire '
        + 'l’écouteur.'),
      P('useEchap(rappel, actif)', '', 'Rappel sur la touche Échap ; `actif` '
        + '(vrai par défaut) : faux retire l’écouteur.'),
      P('useBlocageDefilement(actif)', '', 'Bloque le défilement de la page '
        + 'tant que `actif` est vrai ; plusieurs demandes cumulées, largeur '
        + 'de la barre compensée.'),
    ],
    exemples: [{ titre: 'Panneau fermé par clic extérieur ou Échap',
      Rendu: EvenementsEtat,
      code: 'useClicExterieur([declencheur, panneau], fermer, ouvert);\n'
        + 'useEchap(fermer, ouvert);\n'
        + 'useBlocageDefilement(ouvert);' }],
  },
];

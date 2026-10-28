import { useState } from 'react';

import { P } from './aide';
import {
  Badge, BadgeBooleen, Banniere, Bouton, BoutonCopier, BoutonOuvrir,
  BoutonPopup, CarteJeu, Cellule, Eventail, IcoAlerte, IcoCalques,
  IcoCarteRole, IcoComptes, IcoFiltre, IcoPlus, Ligne, MarqueAppli, Mosaique,
  Page,
  PageGarde, Pastille, Section, Tableau, TableauDonnees, Valeur, useEnsemble,
} from '@ui';

const MAINTENANT = Math.floor(Date.now() / 1000);
const POINTEUSES = [
  {
    id: 1, nom: 'KM0', site: 'Entrepôt Nord', n: 12, scan: MAINTENANT - 90,
    statut: 'ok', badge: 'A0F3-1201', motifs: [],
  },
  {
    id: 2, nom: 'KM1', site: 'Entrepôt Sud', n: 3, scan: MAINTENANT - 7200,
    statut: 'alerte', badge: 'A0F3-1202',
    motifs: ['Aucun relevé depuis 2 h', 'Badges refusés'],
  },
  {
    id: 3, nom: 'KM2', site: '', n: 41, scan: null,
    statut: 'arret', badge: 'A0F3-1203', motifs: ['Arrêtée'],
  },
];
const STATUTS_DEMO = {
  ok: { libelle: 'En service', couleur: 'vert' },
  alerte: { libelle: 'Dégradée', couleur: 'orange' },
  arret: { libelle: 'Arrêtée', couleur: 'rouge' },
};
const COLONNES_DONNEES = [
  { cle: 'nom', libelle: 'Nom', type: 'mono', fort: true, valeur: (p) => p.nom },
  { cle: 'site', libelle: 'Site', valeur: (p) => p.site },
  {
    cle: 'n', libelle: 'Badgeages', type: 'nombre', valeur: (p) => p.n,
    aide: {
      titre: 'Badgeages', libelle: 'À propos des badgeages',
      contenu: <p>Badgeages vus dans la trace de la pointeuse.</p>,
    },
  },
  {
    cle: 'scan', libelle: 'Dernier scan', type: 'horodatage',
    valeur: (p) => p.scan,
  },
  { cle: 'vu', libelle: 'Vu', type: 'depuis', dim: true, valeur: (p) => p.scan },
];

// Cellules qui reprennent d'autres composants : la colonne porte un `rendu`
// et un `tri` (ce que le tri compare), ou `triable: false`.
const COLONNES_COMPOSANTS = [
  { cle: 'nom', libelle: 'Nom', type: 'mono', fort: true, valeur: (p) => p.nom },
  {
    cle: 'etat', libelle: 'État', tri: (p) => STATUTS_DEMO[p.statut].libelle,
    rendu: (p) => (
      <span className="sb-ligne">
        <Pastille couleur={STATUTS_DEMO[p.statut].couleur} />
        <Badge couleur={STATUTS_DEMO[p.statut].couleur}
               titre={STATUTS_DEMO[p.statut].libelle} />
      </span>
    ),
  },
  {
    cle: 'valide', libelle: 'Relevé récent',
    tri: (p) => Number(p.statut === 'ok'),
    rendu: (p) => (
      <BadgeBooleen vrai={p.statut === 'ok'}
                    titre={p.statut === 'ok' ? 'oui' : 'non'} />
    ),
  },
  {
    cle: 'badge', libelle: 'Badge', type: 'mono', valeur: (p) => p.badge,
    rendu: (p) => (
      <span className="sb-ligne">
        {p.badge}
        <BoutonCopier valeur={p.badge} variante="fantome" />
      </span>
    ),
  },
  {
    cle: 'motifs', libelle: 'Signalement', triable: false,
    rendu: (p) => (p.motifs.length === 0 ? <Valeur /> : (
      <BoutonPopup icone={<IcoAlerte />} libelle={`Motifs pour ${p.nom}`}
                   titre={`${p.nom} : signalement`}>
        <ul>{p.motifs.map((m) => <li key={m}>{m}</li>)}</ul>
      </BoutonPopup>
    )),
  },
];

// Démonstration de `TableauDonnees` : `avec` choisit la fonction montrée.
function DonneesEtat({ avec = 'colonnes' }) {
  const [ouverte, setOuverte] = useState(null);
  const [deplie, setDeplie] = useState(null);
  const selection = useEnsemble();
  const options = {};
  if (avec === 'ouvrir') {
    options.ouvrir = {
      libelle: (p) => `Ouvrir ${p.nom}`,
      ouvert: (p) => ouverte === p.id,
      onOuvrir: (p) => setOuverte(ouverte === p.id ? null : p.id),
    };
    options.actions = {
      de: (p) => [
        { titre: 'Désactiver', onClick: () => {}, visible: p.id !== 3 },
        {
          titre: 'Supprimer', variante: 'fantome', couleur: 'rouge',
          onClick: () => {},
        },
      ],
    };
  }
  if (avec === 'boutons') {
    options.actions = {
      de: (p) => [
        { titre: 'Modifier', variante: 'secondaire', onClick: () => {} },
        {
          libelle: `Ajouter un badge à ${p.nom}`, icone: <IcoPlus />,
          variante: 'fantome', onClick: () => {},
        },
        {
          titre: 'Redémarrer', couleur: 'vert', disabled: p.statut === 'arret',
          onClick: () => {},
        },
        {
          titre: 'Supprimer', variante: 'fantome', couleur: 'rouge',
          visible: p.statut !== 'ok', onClick: () => {},
        },
      ],
    };
  }
  if (avec === 'selection') {
    options.selection = {
      cles: selection.valeurs, basculer: selection.basculer,
      remplacer: selection.remplacer, tout: true,
      libelle: (p) => `Choisir ${p.nom}`,
    };
  }
  if (avec === 'detail') {
    options.actions = {
      position: 'debut', entete: 'Détail',
      de: (p) => [{
        libelle: deplie === p.id ? 'Masquer' : 'Afficher', icone: '›',
        variante: 'fantome', 'aria-expanded': deplie === p.id,
        onClick: () => setDeplie(deplie === p.id ? null : p.id),
      }],
    };
    options.detail = (p) => (deplie === p.id
      ? <span className="dim">{`Traces de ${p.nom}…`}</span> : null);
  }
  return (
    <TableauDonnees
      legende="Pointeuses" lignes={POINTEUSES}
      colonnes={avec === 'composants' ? COLONNES_COMPOSANTS : COLONNES_DONNEES}
      {...options} />
  );
}

const LIGNES = [['KM0', 'actif', 12], ['KM1', 'arrêté', 3], ['KM2', '', 41]];

function TableauEtat({ triable, niveau, fixe }) {
  const [tri, setTri] = useState({ cle: 'nom', sens: 'asc' });
  const colonnes = [
    { cle: 'nom', libelle: 'Nom', triable, largeur: fixe ? '40%' : undefined },
    { cle: 'etat', libelle: 'État' },
    { cle: 'n', libelle: 'Nombre', nombre: true, triable },
  ];
  const i = tri.cle === 'n' ? 2 : 0;
  const lignes = [...LIGNES].sort((a, b) => {
    const d = a[i] > b[i] ? 1 : -1;
    return tri.sens === 'asc' ? d : -d;
  });
  const basculer = (cle) => setTri((t) => ({
    cle, sens: t.cle === cle && t.sens === 'asc' ? 'desc' : 'asc',
  }));
  return (
    <Tableau legende="Exemple" colonnes={colonnes} niveau={niveau} fixe={fixe}
             tri={triable ? tri : undefined} onTri={triable ? basculer : undefined}>
      <tbody>
        {lignes.map(([nom, etat, n]) => (
          <tr key={nom}>
            <td className="fort">{nom}</td>
            <td><Valeur>{etat}</Valeur></td>
            <td className="col-nombre">{n}</td>
          </tr>
        ))}
      </tbody>
    </Tableau>
  );
}

function MosaiqueEtat() {
  const [ouvert, setOuvert] = useState(null);
  const elements = [
    { cle: 'a', titre: 'KM0', lignes: [['État', 'actif'], ['Modèle', 'T6']] },
    { cle: 'b', titre: 'KM1', niveau: 'attention',
      lignes: [['État', 'arrêté'], ['Modèle', 'T6']] },
    { cle: 'c', titre: 'KM2', lignes: [['État', 'actif']] },
  ];
  return (
    <Mosaique elements={elements} ouvert={ouvert}
              onOuvrir={(cle) => setOuvert(cle === ouvert ? null : cle)}
              libelleOuvrir={(e) => `Détail de ${e.titre}`}
              legende="Exemple" />
  );
}

export const FICHES = [
  {
    cle: 'tableau', nom: 'Tableau',
    resume: 'Cadre, légende et en-tête ; le `<tbody>` est passé en enfant.',
    props: [
      P('colonnes', '[{ cle, libelle, largeur, nombre, sr, triable, '
        + 'className, aide }]', 'aide : `{ titre, libelle, contenu }`, un « ? » '
        + 'à droite du titre qui ouvre une popup ; largeur : pose un '
        + '`<colgroup>` ; nombre : aligné à '
        + 'droite ; sr : en-tête réservé aux lecteurs d’écran ; triable : '
        + 'l’en-tête devient un bouton de tri ; className : classe de la '
        + 'cellule d’en-tête. Sans `colonnes`, pas d’en-tête.'),
      P('legende', 'string', 'Légende accessible.'),
      P('fixe', 'booléen', 'Les largeurs priment sur le contenu.'),
      P('tri · onTri(cle)', '{ cle, sens }', 'Colonne triée ; appelé au clic '
        + 'sur un en-tête triable.'),
      P('collant', 'booléen', 'En-tête fixe au défilement.'),
      P('niveau', 'string', '`attention` : cadre et en-tête teintés.'),
      P('className', 'string', 'Classe ajoutée au `<table>`.'),
      P('children', 'élément', 'Le corps du tableau : un `<tbody>`.'),
    ],
    exemples: [
      { titre: 'Simple', Rendu: () => <TableauEtat />,
        code: '<Tableau legende="…" colonnes={COLONNES}><tbody>…</tbody></Tableau>' },
      { titre: 'Triable', Rendu: () => <TableauEtat triable />,
        code: '<Tableau colonnes={COLONNES} tri={tri} onTri={trier}>…</Tableau>' },
      { titre: 'Largeurs fixes', Rendu: () => <TableauEtat fixe />,
        code: '<Tableau fixe colonnes={[{ cle: "nom", largeur: "40%" }]}>…</Tableau>' },
      { titre: 'niveau="attention"',
        Rendu: () => <TableauEtat niveau="attention" />,
        code: '<Tableau niveau="attention" colonnes={COLONNES}>…</Tableau>' },
    ],
  },
  {
    cle: 'tableau-donnees', nom: 'TableauDonnees',
    resume: 'Tableau piloté par ses données : chaque colonne dit ce qu’elle '
      + 'contient (`type` et `valeur`), le composant en tire le format, '
      + 'l’alignement, la coupe avec infobulle, le tiret des valeurs absentes '
      + 'et le tri. L’en-tête et les cellules viennent de la même '
      + 'déclaration. Les types : `texte` (défaut), `mono`, `nombre`, `date` '
      + '(`AAAA-MM-JJ`), `epoch`, `horodatage`, `heure` et `depuis`. Pour '
      + 'une cellule libre : `rendu`.',
    props: [
      P('lignes', 'tableau', 'Les lignes à afficher (aucune : tableau '
        + 'vide, ou `vide` si fourni).', '[]'),
      P('colonnes', '[{ cle, libelle, type, valeur, rendu, tri, triable, '
        + 'largeur, coupe, fort, dim, sr, aide, titre, className, '
        + 'classeEntete, classeCellule }]', 'valeur(ligne) : valeur brute, mise en forme '
        + 'selon `type` ; rendu(ligne) : contenu libre, à la place ; '
        + 'tri(ligne) : valeur triée (`valeur` par défaut) ; triable : '
        + '`false` retire le tri (toute colonne se trie par défaut, dès '
        + 'qu’elle a un `tri` ou une `valeur`) ; aide : `{ titre, libelle, '
        + 'contenu }`, un « ? » à droite du titre qui ouvre une popup ; '
        + 'titre(ligne) : infobulle ; '
        + 'classeCellule(ligne) : classe de la cellule.'),
      P('cle', 'string · fonction', 'Identifiant d’une ligne : nom de '
        + 'champ, ou fonction de la ligne.', 'id'),
      P('ouvrir', '{ libelle(l), ouvert(l), onOuvrir(l), titre, entete, '
        + 'largeur }', 'Colonne de tête dont le bouton ouvre le détail de la '
        + 'ligne (voir `BoutonOuvrir`) ; la ligne ouverte est surlignée.'),
      P('actions', '{ de(l), position, entete, largeur, className }',
        'Boutons par ligne. `de` rend une liste de props de `Bouton` (`titre` '
        + 'ou `libelle`, `icone`, `variante`, `couleur`, `onClick`, '
        + '`disabled`…) ; `visible: false` retire un bouton. `position` : '
        + '`fin` (défaut) ou `debut`.'),
      P('selection', '{ cles, basculer, remplacer, libelle(l), tout }',
        'Cases à cocher ; `useEnsemble` fournit `cles` (valeurs), `basculer` '
        + 'et `remplacer`. `tout` ajoute la case « tout choisir » de '
        + 'l’en-tête.'),
      P('detail', 'fonction', 'detail(ligne) : contenu d’une ligne enfant '
        + 'sous la ligne (ligne dépliable), ou rien.'),
      P('classeDetail', 'string', 'Classe de la ligne enfant.'),
      P('choisie', 'fonction', 'choisie(ligne) : ligne surlignée (celle de '
        + '`ouvrir` par défaut).'),
      P('classeLigne', 'fonction', 'classeLigne(ligne) : classe de la '
        + 'ligne.'),
      P('ligne', 'fonction', 'ligne(l) : rend la ligne entière, avec `Ligne` '
        + 'et `Cellule`. L’ouverture, les actions, la sélection et le détail '
        + 'sont alors à la charge de l’appelant.'),
      P('vide', 'élément', 'Rendu à la place du tableau quand il n’y a '
        + 'aucune ligne (typiquement un `EtatVide`).'),
      P('departage', 'fonction', 'departage(a, b) : ordre des égalités du '
        + 'tri ; sans tri choisi, `lignes` garde son ordre.'),
      P('legende', 'string', 'Légende accessible.'),
      P('fixe', 'booléen', 'Les largeurs priment sur le contenu.'),
      P('collant', 'booléen', 'En-tête fixe au défilement.'),
      P('niveau', 'string', '`attention` : cadre et en-tête teintés.'),
      P('className', 'string', 'Classe ajoutée au `<table>`.'),
    ],
    exemples: [
      {
        titre: 'Colonnes typées et tri', Rendu: () => <DonneesEtat />,
        code: '<TableauDonnees legende="…" lignes={lignes} colonnes={[\n'
          + "  { cle: 'nom', libelle: 'Nom', type: 'mono', triable: true,\n"
          + '    valeur: (p) => p.nom },\n'
          + "  { cle: 'scan', libelle: 'Dernier scan', type: 'horodatage',\n"
          + '    valeur: (p) => p.scan },\n]} />',
      },
      {
        titre: 'Ouverture et actions',
        Rendu: () => <DonneesEtat avec="ouvrir" />,
        code: '<TableauDonnees lignes={lignes} colonnes={colonnes}\n'
          + '  ouvrir={{ libelle: (p) => `Ouvrir ${p.nom}`,\n'
          + '    ouvert: (p) => p.id === choisie, onOuvrir: (p) => ouvrir(p.id) }}\n'
          + "  actions={{ de: (p) => [{ titre: 'Supprimer', couleur: 'rouge',\n"
          + '    onClick: () => supprimer(p) }] }} />',
      },
      {
        titre: 'Boutons : texte, icône, couleur, état',
        Rendu: () => <DonneesEtat avec="boutons" />,
        code: '<TableauDonnees lignes={lignes} colonnes={colonnes}\n'
          + '  actions={{ de: (p) => [\n'
          + "    { titre: 'Modifier', variante: 'secondaire', onClick: modifier },\n"
          + '    { libelle: `Ajouter un badge à ${p.nom}`, icone: <IcoPlus />,\n'
          + "      variante: 'fantome', onClick: ajouter },\n"
          + "    { titre: 'Redémarrer', couleur: 'vert', disabled: p.arretee,\n"
          + '      onClick: redemarrer },\n'
          + "    { titre: 'Supprimer', couleur: 'rouge', visible: !p.ok,\n"
          + '      onClick: supprimer },\n  ] }} />',
      },
      {
        titre: 'Contenu d’autres composants',
        Rendu: () => <DonneesEtat avec="composants" />,
        code: '// Une colonne `rendu` accepte n’importe quel composant ; son `tri`\n'
          + '// dit ce que l’en-tête compare (`triable: false` : pas de tri).\n'
          + "{ cle: 'etat', libelle: 'État', tri: (p) => p.libelle,\n"
          + '  rendu: (p) => <><Pastille couleur={p.couleur} />\n'
          + '    <Badge titre={p.libelle} /></> },\n'
          + "{ cle: 'badge', libelle: 'Badge', valeur: (p) => p.badge,\n"
          + '  rendu: (p) => <>{p.badge}<BoutonCopier valeur={p.badge} /></> },\n'
          + "{ cle: 'motifs', libelle: 'Signalement', triable: false,\n"
          + '  rendu: (p) => <BoutonPopup icone={<IcoAlerte />}\n'
          + '    libelle="Motifs" titre="Signalement">…</BoutonPopup> }',
      },
      {
        titre: 'Sélection', Rendu: () => <DonneesEtat avec="selection" />,
        code: 'const choix = useEnsemble();\n'
          + '<TableauDonnees lignes={lignes} colonnes={colonnes}\n'
          + '  selection={{ cles: choix.valeurs, basculer: choix.basculer,\n'
          + '    remplacer: choix.remplacer, tout: true }} />',
      },
      {
        titre: 'Ligne dépliable', Rendu: () => <DonneesEtat avec="detail" />,
        code: '<TableauDonnees lignes={lignes} colonnes={colonnes}\n'
          + "  actions={{ position: 'debut', de: (p) => [{ libelle: 'Afficher',\n"
          + '    icone: <IcoChevron />, onClick: () => deplier(p.id) }] }}\n'
          + '  detail={(p) => (deplie === p.id ? <Traces pointeuse={p} /> : null)} />',
      },
      {
        titre: 'Aucune ligne',
        Rendu: () => (
          <TableauDonnees lignes={[]} colonnes={COLONNES_DONNEES}
                          vide={<span className="dim">Aucune pointeuse.</span>} />
        ),
        code: '<TableauDonnees lignes={[]} colonnes={colonnes}\n'
          + '  vide={<EtatVide titre="Aucune pointeuse" />} />',
      },
    ],
  },
  {
    cle: 'cellule', nom: 'Cellule',
    resume: 'Cellule d’un tableau. Avec `type` et `valeur`, le contenu est '
      + 'mis en forme comme dans `TableauDonnees` ; avec des enfants, ils '
      + 'prennent la place du contenu. Sert aussi à rendre soi-même une ligne '
      + '(`ligne` de `TableauDonnees`).',
    props: [
      P('type', 'string', 'Type de la valeur : `texte`, `mono`, `nombre`, '
        + '`date`, `epoch`, `horodatage`, `heure` ou `depuis`.'),
      P('valeur', 'any', 'Valeur brute à mettre en forme ; absente : un '
        + 'tiret.'),
      P('coupe', 'booléen', 'Texte coupé avec ellipse ; vrai par défaut pour '
        + '`texte` et `mono`.'),
      P('fort', 'booléen', 'Texte en gras.'),
      P('dim', 'booléen', 'Texte atténué.'),
      P('titre', 'string', 'Infobulle ; celle du type par défaut (texte '
        + 'complet, date complète).'),
      P('className', 'string', 'Classe ajoutée à la cellule.'),
      P('children', 'élément', 'Contenu libre, à la place de `valeur`.'),
    ],
    exemples: [{
      titre: 'Types',
      Rendu: () => (
        <Tableau legende="Types de cellule" colonnes={[
          { cle: 'a', libelle: 'Type' }, { cle: 'b', libelle: 'Rendu' }]}>
          <tbody>
            <tr>
              <td>texte</td>
              <Cellule valeur="Entrepôt Nord, quai 4" />
            </tr>
            <tr><td>nombre</td><Cellule type="nombre" valeur={1250} /></tr>
            <tr><td>date</td><Cellule type="date" valeur="2026-11-02" /></tr>
            <tr>
              <td>horodatage</td>
              <Cellule type="horodatage" valeur={MAINTENANT} />
            </tr>
            <tr><td>absente</td><Cellule type="nombre" valeur={null} /></tr>
          </tbody>
        </Tableau>
      ),
      code: '<Cellule type="horodatage" valeur={epoch} />',
    }],
  },
  {
    cle: 'ligne', nom: 'Ligne',
    resume: 'Ligne d’un tableau, pour rendre soi-même une ligne (`ligne` de '
      + '`TableauDonnees`) avec des `Cellule`.',
    props: [
      P('choisie', 'booléen', 'Ligne surlignée.'),
      P('className', 'string', 'Classe ajoutée à la ligne.'),
      P('children', 'élément', 'Les cellules de la ligne.'),
    ],
    exemples: [{
      titre: 'Ligne rendue à la main',
      Rendu: () => (
        <TableauDonnees
          legende="Pointeuses" lignes={POINTEUSES} colonnes={COLONNES_DONNEES}
          ligne={(p) => (
            <Ligne choisie={p.id === 1}>
              <Cellule type="mono" valeur={p.nom} fort />
              <Cellule valeur={p.site} />
              <Cellule type="nombre" valeur={p.n} />
              <Cellule type="horodatage" valeur={p.scan} />
              <Cellule type="depuis" valeur={p.scan} dim />
            </Ligne>
          )}
        />
      ),
      code: '<TableauDonnees lignes={lignes} colonnes={colonnes}\n'
        + '  ligne={(p) => <Ligne choisie={p.id === 1}>\n'
        + '    <Cellule type="mono" valeur={p.nom} />…</Ligne>} />',
    }],
  },
  {
    cle: 'valeur', nom: 'Valeur',
    resume: 'Valeur de cellule ; un tiret si elle est absente (`0` et `false` '
      + 'sont des valeurs).',
    props: [P('children', 'élément', 'Valeur à afficher.')],
    exemples: [{
      titre: 'Absente, nulle, texte',
      Rendu: () => (
        <div className="sb-ligne">
          <Valeur>{null}</Valeur>
          <Valeur>{0}</Valeur>
          <Valeur>texte</Valeur>
        </div>
      ),
      code: '<td><Valeur>{ligne.nom}</Valeur></td>',
    }],
  },
  {
    cle: 'bouton-ouvrir', nom: 'BoutonOuvrir',
    resume: 'Bouton d’une ligne qui ouvre son détail.',
    props: [P('libelle', 'string', 'Texte pour lecteur d’écran.'),
      P('ouvert', 'booléen', 'La fenêtre de cette ligne est ouverte.'),
      P('titre', 'string', 'Infobulle.', 'Voir le détail'),
      P('onClick', 'fonction', 'Appelée au clic : ouvre le détail de la '
        + 'ligne (le bouton n’ouvre rien par lui-même).')],
    exemples: [{
      titre: 'Fermé et ouvert',
      Rendu: () => (
        <div className="sb-ligne">
          <BoutonOuvrir libelle="Détail de KM0" onClick={() => {}} />
          <BoutonOuvrir libelle="Détail de KM1" ouvert onClick={() => {}} />
        </div>
      ),
      code: '<BoutonOuvrir libelle="Détail de KM0" ouvert={o} onClick={ouvrir} />',
    }],
  },
  {
    cle: 'mosaique', nom: 'Mosaique',
    resume: 'Une carte par élément, avec le bouton d’ouverture de son '
      + 'détail.',
    props: [
      P('elements', '[{ cle, titre, lignes, niveau }]', 'lignes : `[[libellé, '
        + 'valeur]]` sous le titre ; niveau : `attention` colore le cadre.'),
      P('ouvert', 'string', 'Clé de la carte dont le détail est ouvert.'),
      P('onOuvrir(cle)', 'fonction', 'Appelée au clic sur le bouton d’une '
        + 'carte, avec la clé de son élément.'),
      P('libelleOuvrir(element)', 'fonction', 'Texte lecteur d’écran du '
        + 'bouton.'),
      P('legende · className', 'string', 'legende : nom accessible de la '
        + 'liste ; className : classe ajoutée à la liste (`<ul>`).'),
    ],
    exemples: [{ titre: 'Exemple', Rendu: MosaiqueEtat,
      code: '<Mosaique elements={elements} ouvert={cle} onOuvrir={ouvrir} libelleOuvrir={…} />' }],
  },
  {
    cle: 'page', nom: 'Page',
    resume: 'Squelette d’écran : titre, description, actions à droite du '
      + 'titre, puis contenu. Rend un `<main>` : l’aperçu ci-dessous en '
      + 'montre le principe.',
    props: [
      P('titre · description', 'string', 'titre : le `<h1>` de l’écran ; '
        + 'description : une phrase sous le titre.'),
      P('actions', 'élément', 'À droite du titre.'),
      P('avant', 'élément', 'Placé avant l’en-tête.'),
      P('largeur', 'string', '`etroite` : colonne de lecture bornée.'),
      P('className', 'string', 'Classe ajoutée au `<main>`.'),
      P('children', 'éléments', 'Le contenu de l’écran, sous l’en-tête.'),
    ],
    exemples: [{
      titre: 'En-tête avec action',
      Rendu: () => (
        <div className="sb-encart">
          <Page titre="Titre de la page" description="Description."
                actions={<Bouton variante="principal" titre="Action" />}>
            Contenu.
          </Page>
        </div>
      ),
      code: '<Page titre="…" description="…" actions={<Bouton titre="…" />}>…</Page>',
    }],
  },
  {
    cle: 'section', nom: 'Section',
    resume: 'Conteneur titré à l’intérieur d’une page : il reçoit '
      + 'n’importe quels éléments (texte, tableau, boutons, champs, cartes…). '
      + 'Les props non listées passent au `<section>`.',
    props: [
      P('titre', 'string', 'Titre de la section (`<h2>`) ; sans titre ni '
        + 'actions, pas d’en-tête.'),
      P('suffixe', 'string · nombre', 'À côté du titre, en retrait (un '
        + 'compte, un état). 0 est affiché ; seuls le vide et `false` '
        + 'l’omettent.'),
      P('icone · actions', 'élément', 'Avant le titre ; à droite.'),
      P('niveau', 'string', '`attention` colore le titre.'),
      P('className', 'string', 'Classe ajoutée au `<section>`.'),
      P('children', 'éléments', 'Le contenu de la section, sous l’en-tête.'),
    ],
    exemples: [
      {
        titre: 'Avec suffixe, icône et action',
        Rendu: () => (
          <Section titre="Anomalies" suffixe="3" icone={<IcoFiltre />}
                   actions={<Bouton taille="s" titre="Action" />}>
            Contenu de la section.
          </Section>
        ),
        code: '<Section titre="Anomalies" suffixe="3" icone={…} actions={…}>…</Section>',
      },
      {
        titre: 'niveau="attention"',
        Rendu: () => (
          <Section titre="À traiter" niveau="attention">
            <Badge couleur="orange" titre="3 erreurs" />
          </Section>
        ),
        code: '<Section titre="À traiter" niveau="attention">…</Section>',
      },
    ],
  },
  {
    cle: 'marque-appli', nom: 'MarqueAppli',
    resume: 'Logo, nom et sous-nom de l’application, pour les écrans sans '
      + 'menu.',
    props: [
      P('nom', 'string', 'Nom de l’application, à côté du logo.',
        'Pointeuse'),
      P('sousNom', 'string', 'Ligne secondaire sous le nom, facultative.'),
    ],
    exemples: [{
      titre: 'Exemple',
      Rendu: () => <MarqueAppli sousNom="Supervision" />,
      code: '<MarqueAppli nom="Pointeuse" sousNom="Supervision" />',
    }],
  },
  {
    cle: 'banniere', nom: 'Banniere',
    resume: 'Bandeau de présentation en tête de page, toujours de nuit : '
      + 'scène dessinée du village (lune, forêt, maisons éclairées, yeux dans '
      + 'les sous-bois), surtitre, titre, texte, actions, compteurs et une '
      + 'illustration à droite. Sert d’accroche aux modules (Storybook, UNO).',
    props: [
      P('surtitre', 'string', 'Petite étiquette au-dessus du titre.'),
      P('titre', 'string', 'Titre principal.'),
      P('niveau', '1 · 2', 'Balise du titre : `<h1>` ou `<h2>`.', '1'),
      P('description', 'élément', 'Texte sous le titre.'),
      P('actions', 'éléments', 'Boutons sous le texte.'),
      P('compteurs', '[{ icone, valeur, libelle }]', 'Chiffres clés, à '
        + 'droite.'),
      P('illustration', 'élément', 'À droite, au-dessus des compteurs.'),
      P('decor', 'booléen', 'false : fond de nuit sans la scène dessinée.',
        'true'),
      P('className', 'string', 'Classe ajoutée au bandeau.'),
      P('children', 'éléments', 'Contenu libre, sous la description.'),
    ],
    exemples: [
      {
        titre: 'Accroche de module, avec compteurs et illustration',
        Rendu: () => (
          <Banniere
            surtitre="Jeux" titre="UNO"
            description="Ouvrez une table et partagez son code."
            actions={<Bouton variante="principal" icone={<IcoPlus />} titre="Créer une table" />}
            illustration={(
              <Eventail arc chevauchement={0.5}>
                <CarteJeu taille="s" couleur="rouge" valeur="7" />
                <CarteJeu taille="s" valeur="+4" />
                <CarteJeu taille="s" couleur="bleu" valeur="inversion" />
              </Eventail>
            )}
            compteurs={[
              { icone: <IcoCarteRole />, valeur: 3, libelle: 'tables' },
              { icone: <IcoComptes />, valeur: 12, libelle: 'en ligne' },
            ]} />
        ),
        code: '<Banniere\n  surtitre="Jeux" titre="UNO"\n'
          + '  description="Ouvrez une table et partagez son code."\n'
          + '  actions={<Bouton variante="principal" titre="Créer une table" />}\n'
          + '  compteurs={[{ icone: <IcoComptes />, valeur: 12, libelle: '
          + '\'en ligne\' }]} />',
      },
      {
        titre: 'Sans décor',
        Rendu: () => (
          <Banniere decor={false} niveau={2} surtitre="Storybook"
                    titre="Fond de nuit seul"
                    compteurs={[{ icone: <IcoCalques />, valeur: 16, libelle: 'catégories' }]} />
        ),
        code: '<Banniere decor={false} niveau={2} titre="Fond de nuit seul" />',
      },
    ],
  },
  {
    cle: 'page-garde', nom: 'PageGarde',
    resume: 'Écran pleine fenêtre sans menu (connexion, installation, page '
      + 'client).',
    props: [
      P('appli · sousNom', 'string', 'Nom et sous-nom de la marque (voir '
        + '`MarqueAppli`) ; sans `appli`, « Pointeuse ».'),
      P('titre · sousTitre', 'string', 'titre : le `<h1>` de l’écran ; '
        + 'sousTitre : texte sous le titre.'),
      P('variante', 'carte · libre', 'Carte centrée, ou colonne large.',
        'carte'),
      P('children', 'éléments', 'Le contenu sous l’en-tête : formulaire, '
        + 'message…'),
    ],
    exemples: [{
      titre: 'Variante carte',
      Rendu: () => (
        <div className="sb-encart">
          <PageGarde titre="Connexion" sousTitre="Entrez vos identifiants.">
            <Bouton bloc variante="principal" titre="Se connecter" />
          </PageGarde>
        </div>
      ),
      code: '<PageGarde titre="Connexion" variante="carte">…</PageGarde>',
    }, {
      titre: 'Variante libre, avec nom et sous-nom de la marque',
      Rendu: () => (
        <div className="sb-encart">
          <PageGarde variante="libre" appli="Pointeuse" sousNom="Espace client"
                     sousTitre="Renseignez les informations demandées.">
            <Bouton variante="principal" titre="Envoyer" />
          </PageGarde>
        </div>
      ),
      code: '<PageGarde variante="libre" appli="Pointeuse" sousNom="Espace client" …>…</PageGarde>',
    }],
  },
];

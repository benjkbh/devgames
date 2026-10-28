import { useState } from 'react';

import { P } from './aide';
import {
  BarreActions, Bouton, BoutonCopier, QuestionBool, Champ, ChampCopiable,
  ChoixLimite, Filtre, FiltrePeriode, QuestionChoix, Recherche, Saisie,
  Selecteur, ZoneTexte, aideErreur, FILTRE_DATE_VIDE, PERIODES_TRACES,
} from '@ui';
import { SaisieDate } from '@ui/formulaire/SaisieDate';

function DateEtat({ initiale = '', type = 'date', ...reste }) {
  const [valeur, setValeur] = useState(initiale);
  return (
    <div className="sb-colonne sb-etroit">
      <Saisie value={valeur} onChange={(e) => setValeur(e.target.value)}
              type={type} aria-label="Date" {...reste} />
      <p>Valeur : <code>{valeur || '(vide)'}</code></p>
    </div>
  );
}

// `SaisieDate` seule : `onChange` reçoit la valeur, pas un événement.
function DateDirecte({ initiale = '', ...reste }) {
  const [valeur, setValeur] = useState(initiale);
  return (
    <div className="sb-colonne sb-etroit">
      <SaisieDate valeur={valeur} onChange={setValeur} aria-label="Date"
                  {...reste} />
      <p>Valeur : <code>{valeur || '(vide)'}</code></p>
    </div>
  );
}

const OPTIONS = [
  { valeur: 'a', libelle: 'Option A', resume: 'Premier choix.' },
  { valeur: 'b', libelle: 'Option B', resume: 'Second choix.' },
  { valeur: 'c', libelle: 'Option C', resume: 'Troisième choix.' },
];

// `nom` distingue les groupes radio des exemples entre eux.
function Radios({ nom, ...reste }) {
  const [valeur, setValeur] = useState('a');
  return (
    <QuestionChoix nom={`sb-radio-${nom}`} options={OPTIONS} valeur={valeur}
                   onChange={setValeur} {...reste} />
  );
}

function CaseEtat({ desactive }) {
  const [coche, setCoche] = useState(true);
  return (
    <QuestionBool libelle="Recevoir un rappel" description="Une fois par semaine."
          checked={coche} onChange={setCoche} disabled={desactive} />
  );
}

function Actions(props) {
  return (
    <BarreActions {...props}>
      <Bouton titre="Annuler" />
      <Bouton variante="principal" titre="Enregistrer" />
    </BarreActions>
  );
}

function SaisieControlee() {
  const [texte, setTexte] = useState('');
  return (
    <Saisie value={texte} placeholder="Tapez ici" aria-label="Exemple"
            onChange={(e) => setTexte(e.target.value)} />
  );
}

function PeriodeEtat({ initiale = '24h', du = '', au = '', ...reste }) {
  const [valeur, setValeur] = useState({ ...FILTRE_DATE_VIDE,
    periode: initiale, du, au });
  return <FiltrePeriode valeur={valeur} onChange={setValeur} {...reste} />;
}

function LimiteEtat() {
  const [limite, setLimite] = useState(20);
  return <ChoixLimite valeur={limite} onChange={setLimite} total={340} />;
}

export const FICHES = [
  {
    cle: 'champ', nom: 'Champ', couvre: ['aideErreur'],
    resume: 'Libellé, contrôle (en enfant), aide et erreur. Le contrôle porte '
      + 'le même `id` et, en cas d’erreur, `aideErreur`.',
    props: [
      P('id · libelle', 'string', '`id` : celui du contrôle enfant, que le '
        + 'libellé désigne ; `libelle` : texte du libellé.'),
      P('requis', 'booléen', 'Astérisque au libellé.'),
      P('aide', 'string', 'Sous le contrôle ; masquée si une erreur est '
        + 'affichée.'),
      P('aideDetail', 'string', 'Texte long ouvert par un bouton « i ».'),
      P('erreur', 'string', 'Message d’erreur.'),
      P('etiquette', 'string', 'Annotation à droite du libellé.'),
      P('verrouille', 'booléen', 'Champ atténué : sa valeur est '
        + 'imposée (par le serveur) et ne se change pas. Seul l’aspect change : '
        + 'le contrôle doit aussi être `disabled` (`ChampSaisie` fait les '
        + 'deux).'),
      P('title', 'string', 'Infobulle de tout le champ (attribut natif de '
        + 'l’enveloppe).'),
      P('className', 'string', 'Classe ajoutée à l’enveloppe du champ.'),
      P('children', 'élément', 'Le contrôle (`Saisie`, `Selecteur`, '
        + '`ZoneTexte`…), placé sous le libellé.'),
    ],
    exemples: [
      {
        titre: 'Requis, avec aide',
        Rendu: () => (
          <Champ id="sb-nom" libelle="Nom" requis aide="Tel qu’il apparaît.">
            <Saisie id="sb-nom" />
          </Champ>
        ),
        code: '<Champ id="nom" libelle="Nom" requis aide="…"><Saisie id="nom" /></Champ>',
      },
      {
        titre: 'Erreur',
        Rendu: () => (
          <Champ id="sb-err" libelle="Adresse" erreur="Adresse invalide.">
            <Saisie id="sb-err" defaultValue="pas-une-adresse"
                    {...aideErreur('sb-err', 'Adresse invalide.')} />
          </Champ>
        ),
        code: '<Saisie id="adresse" {...aideErreur("adresse", erreur)} />',
      },
      {
        titre: 'Étiquette, aide détaillée, verrouillé',
        Rendu: () => (
          <div className="sb-colonne sb-etroit">
            <Champ id="sb-et" libelle="Type" etiquette="facultatif"
                   aideDetail="Texte long ouvert depuis le bouton i.">
              <Selecteur id="sb-et"><option>Option A</option></Selecteur>
            </Champ>
            <Champ id="sb-ver" libelle="Référence" verrouille>
              <Saisie id="sb-ver" defaultValue="26/PYR-A1" readOnly />
            </Champ>
          </div>
        ),
        code: '<Champ id="ref" libelle="Référence" verrouille>…</Champ>',
      },
    ],
  },
  {
    cle: 'barre-actions', nom: 'BarreActions',
    resume: 'Rangée de boutons d’un formulaire, alignée au début ou à la fin, '
      + 'ou répartie, et pouvant rester fixée en bas de l’écran.',
    props: [
      P('alignement', 'debut · fin · entre', 'Placement des boutons : groupés '
        + 'au début, groupés à la fin, ou écartés aux deux extrémités.',
      'debut'),
      P('collante', 'booléen', 'Fixée en bas de l’écran au défilement.'),
      P('className', 'string', 'Classe ajoutée à la rangée.'),
      P('children', 'éléments', 'Les boutons, dans l’ordre d’affichage ; ils '
        + 'passent à la ligne si la place manque.'),
    ],
    exemples: [
      {
        titre: 'alignement="debut" (défaut)',
        Rendu: () => <Actions />,
        code: '<BarreActions>…</BarreActions>',
      },
      {
        titre: 'alignement="fin"',
        Rendu: () => <Actions alignement="fin" />,
        code: '<BarreActions alignement="fin">…</BarreActions>',
      },
      {
        titre: 'alignement="entre"',
        Rendu: () => <Actions alignement="entre" />,
        code: '<BarreActions alignement="entre">…</BarreActions>',
      },
      {
        titre: 'collante',
        Rendu: () => <Actions collante alignement="fin" />,
        code: '<BarreActions collante alignement="fin">…</BarreActions>',
      },
    ],
  },
  {
    cle: 'saisie', nom: 'Saisie',
    resume: 'Champ de saisie. Les props non listées passent à l’`<input>`.',
    props: [
      P('taille', 's', 'Hauteur réduite.'),
      P('erreur', 'booléen', 'Pose `aria-invalid` et la bordure rouge.'),
      P('type', 'string', 'Type natif (`text`, `number`, `password`…), ou '
        + '`date` / `datetime-local` : champ `JJ/MM/AAAA` (et heure) avec, à '
        + 'gauche, un bouton qui ouvre un calendrier (voir `SaisieDate`).'),
      P('value · onChange(e)', 'string', 'Pour une date : `AAAA-MM-JJ` ou '
        + '`AAAA-MM-JJTHH:MM`, vide si aucune ; `e.target.value` reçoit la '
        + 'même valeur. On peut taper la date ou la cliquer.'),
      P('min · max', 'string', 'Dates : bornes au même format, jours hors '
        + 'bornes grisés.'),
    ],
    exemples: [
      { titre: 'Contrôlée', Rendu: SaisieControlee,
        code: '<Saisie value={v} onChange={(e) => setV(e.target.value)} />' },
      {
        titre: 'Taille réduite, erreur, désactivée',
        Rendu: () => (
          <div className="sb-colonne sb-etroit">
            <Saisie taille="s" placeholder="taille s" aria-label="s" />
            <Saisie erreur defaultValue="invalide" aria-label="erreur" />
            <Saisie disabled defaultValue="désactivée" aria-label="off" />
          </div>
        ),
        code: '<Saisie taille="s" erreur disabled />',
      },
      { titre: 'Date', Rendu: () => <DateEtat initiale="2026-11-02" />,
        code: '<Saisie type="date" value={d} onChange={(e) => setD(e.target.value)} />' },
      { titre: 'Date et heure', Rendu: () => (
        <DateEtat type="datetime-local" initiale="2026-10-08T14:30" />),
        code: '<Saisie type="datetime-local" value={d} onChange={…} />' },
      { titre: 'Bornes', Rendu: () => (
        <DateEtat min="2026-10-05" max="2026-10-20" initiale="2026-10-10" />),
        code: '<Saisie type="date" min="2026-10-05" max="2026-10-20" … />' },
    ],
  },
  {
    cle: 'saisie-date', nom: 'SaisieDate',
    resume: 'Champ date `JJ/MM/AAAA` (avec l’heure si `heure`), doté d’un '
      + 'bouton qui ouvre un calendrier. Non exporté par `ui` : `Saisie` '
      + 'l’emploie pour `type="date"` et `"datetime-local"`. Ici `onChange` '
      + 'reçoit la valeur, non un événement ; les props non listées (`id`, '
      + '`aria-label`…) passent au champ texte.',
    props: [
      P('valeur', 'string', '`AAAA-MM-JJ`, ou `AAAA-MM-JJTHH:MM` avec '
        + '`heure` ; vide : aucune date.', "''"),
      P('onChange(valeur)', 'fonction', 'Reçoit la valeur (chaîne vide si le '
        + 'champ est vidé), pas un événement. Appelée quand la date tapée '
        + 'est complète et dans les bornes, au choix d’un jour dans le '
        + 'calendrier, à « Aujourd’hui » et à « Effacer ».'),
      P('heure', 'booléen', 'Ajoute l’heure : champ `JJ/MM/AAAA HH:MM`, et '
        + 'heures et minutes dans le calendrier, qui reste ouvert après le '
        + 'choix du jour (bouton « OK » pour le fermer).'),
      P('min · max', 'string', 'Bornes, au même format que `valeur` : jours '
        + 'hors bornes grisés, date tapée hors bornes ignorée.'),
      P('taille', 's', 'Hauteur réduite.'),
      P('erreur', 'booléen', 'Pose `aria-invalid` et la bordure rouge.'),
      P('disabled', 'booléen', 'Désactive le champ et le bouton du '
        + 'calendrier.'),
      P('placeholder', 'string', 'Texte d’invite ; à défaut, `JJ/MM/AAAA` '
        + '(`JJ/MM/AAAA HH:MM` avec `heure`).'),
      P('className', 'string', 'Classe ajoutée à l’enveloppe (champ et '
        + 'bouton).'),
    ],
    exemples: [
      { titre: 'Date', Rendu: () => <DateDirecte initiale="2026-11-02" />,
        code: '<SaisieDate valeur={d} onChange={setD} />' },
      { titre: 'Date et heure', Rendu: () => (
        <DateDirecte heure initiale="2026-10-08T14:30" />),
        code: '<SaisieDate heure valeur={d} onChange={setD} />' },
      { titre: 'Bornes, taille réduite', Rendu: () => (
        <DateDirecte taille="s" min="2026-10-05" max="2026-10-20"
                     initiale="2026-10-10" />),
        code: '<SaisieDate taille="s" min="2026-10-05" max="2026-10-20" … />' },
      { titre: 'Erreur, désactivée', Rendu: () => (
        <div className="sb-colonne sb-etroit">
          <SaisieDate valeur="2026-11-02" onChange={() => {}} erreur
                      aria-label="En erreur" />
          <SaisieDate valeur="2026-11-02" onChange={() => {}} disabled
                      aria-label="Désactivée" />
        </div>),
        code: '<SaisieDate valeur={d} onChange={setD} erreur disabled />' },
    ],
  },
  {
    cle: 'selecteur', nom: 'Selecteur',
    resume: 'Liste déroulante (`<select>`) à chevron. Les props non listées '
      + 'passent au `<select>`.',
    props: [
      P('taille', 's', 'Hauteur réduite.'),
      P('bloc', 'booléen', 'Pleine largeur.'),
      P('erreur', 'booléen', 'Bordure rouge.'),
      P('className', 'string', 'Classe ajoutée à l’enveloppe, pas au '
        + '`<select>`.'),
      P('children', 'éléments', 'Les `<option>`.'),
    ],
    exemples: [{
      titre: 'Tailles',
      Rendu: () => (
        <div className="sb-ligne">
          {[undefined, 's'].map((t) => (
            <Selecteur key={t || 'm'} taille={t} aria-label="Exemple">
              <option>Option A</option>
              <option>Option B</option>
            </Selecteur>
          ))}
        </div>
      ),
      code: '<Selecteur taille="s"><option>…</option></Selecteur>',
    }],
  },
  {
    cle: 'zone-texte', nom: 'ZoneTexte',
    resume: 'Zone de texte multiligne (`<textarea>`).',
    props: [P('erreur', 'booléen', 'Bordure rouge.'),
      P('rows', 'nombre', 'Hauteur en lignes (natif).')],
    exemples: [{
      titre: 'Exemple',
      Rendu: () => <ZoneTexte rows={3} aria-label="Commentaire"
                              placeholder="Commentaire…" />,
      code: '<ZoneTexte rows={3} />',
    }],
  },
  {
    cle: 'recherche', nom: 'Recherche',
    resume: 'Champ de recherche (`<input type="search">`) précédé d’une '
      + 'loupe. Les props non listées passent à l’`<input>`.',
    props: [P('libelle', 'string', 'Texte pour lecteur d’écran.'),
      P('taille', 's', 'Hauteur réduite.'),
      P('className', 'string', 'Classe ajoutée à l’enveloppe (`<label>`), '
        + 'pas à l’`<input>`.')],
    exemples: [{
      titre: 'Deux tailles',
      Rendu: () => (
        <div className="sb-colonne sb-etroit">
          <Recherche libelle="Rechercher" placeholder="nom ou badge…" />
          <Recherche libelle="Rechercher" taille="s" placeholder="taille s" />
        </div>
      ),
      code: '<Recherche libelle="Rechercher" taille="s" />',
    }],
  },
  {
    cle: 'question-choix', nom: 'QuestionChoix',
    resume: 'Question à choix exclusif parmi des options. Avec `legende`, '
      + 'le groupe est un `<fieldset>` ; sans, un `radiogroup`.',
    props: [
      P('options', '[{ valeur, libelle, resume }]', 'Une valeur vide est '
        + 'valide ; `resume` est facultatif.'),
      P('valeur · onChange(valeur)', 'string · fonction', 'Valeur choisie ; '
        + '`onChange` reçoit la valeur de l’option cliquée.'),
      P('nom · legende', 'string', 'Nom du groupe radio ; légende du '
        + '`<fieldset>`.'),
      P('disposition', 'cartes · segments', 'Options cliquables en entier, '
        + 'avec titre et résumé (`cartes`), ou options courtes côte à côte '
        + '(`segments`).', 'cartes'),
      P('desactive', 'booléen', 'Désactive toutes les options.'),
      P('note', 'string', 'Texte sous le groupe.'),
      P('title · id · className', 'string', 'Infobulle de chaque option ; '
        + 'identifiant et classe du groupe.'),
    ],
    exemples: [
      {
        titre: 'cartes (défaut)',
        Rendu: () => <Radios nom="cartes" legende="Cartes" />,
        code: '<QuestionChoix nom="x" legende="…" options={OPTIONS} valeur={v} onChange={setV} />',
      },
      {
        titre: 'disposition="segments"',
        Rendu: () => (
          <Radios nom="segments" legende="Segments" disposition="segments" />
        ),
        code: '<QuestionChoix nom="x" options={OPTIONS} valeur={v} onChange={setV} disposition="segments" />',
      },
      {
        titre: 'Sans légende, avec note, désactivée',
        Rendu: () => (
          <Radios nom="note" disposition="segments" desactive
                  note="Imposé par le serveur." />
        ),
        code: '<QuestionChoix nom="x" options={OPTIONS} valeur={v} onChange={setV} note="…" desactive />',
      },
    ],
  },
  {
    cle: 'question-bool', nom: 'QuestionBool',
    resume: 'Question oui / non : case à cocher avec description.',
    props: [
      P('libelle · description', 'string', 'Texte de la case ; précision '
        + 'facultative en dessous.'),
      P('checked · onChange(coché)', 'booléen · fonction', 'État de la '
        + 'case ; `onChange` reçoit le nouvel état (`true` ou `false`), pas '
        + 'l’événement.'),
      P('disabled', 'booléen', 'Case grisée, non modifiable.'),
      P('className', 'string', 'Classe ajoutée au `<label>` qui enveloppe la '
        + 'case.'),
    ],
    exemples: [
      { titre: 'Active', Rendu: () => <CaseEtat />,
        code: '<QuestionBool libelle="…" checked={c} onChange={setC} />' },
      { titre: 'Désactivée', Rendu: () => <CaseEtat desactive />,
        code: '<QuestionBool libelle="…" disabled />' },
    ],
  },
  {
    cle: 'bouton-copier', nom: 'BoutonCopier',
    resume: 'Copie `valeur` dans le presse-papier et affiche « Copié ».',
    props: [P('valeur', 'string', 'Texte copié.'),
      P('variante', 'string', 'Comme Bouton.', 'secondaire'),
      P('taille', 's · m · l', 'Taille du bouton, comme `Bouton`.', 's')],
    exemples: [{
      titre: 'Variantes',
      Rendu: () => (
        <div className="sb-ligne">
          <BoutonCopier valeur="10.1.12.115" />
          <BoutonCopier valeur="10.1.12.115" variante="fantome" />
        </div>
      ),
      code: '<BoutonCopier valeur={ip} />',
    }],
  },
  {
    cle: 'champ-copiable', nom: 'ChampCopiable',
    resume: 'Valeur en lecture seule, sélectionnée au focus, avec bouton de '
      + 'copie.',
    props: [P('valeur', 'string', 'Texte affiché, sélectionné au focus et '
      + 'copié par le bouton.'),
      P('libelle', 'string', 'Nom accessible du champ.'),
      P('etiquette', 'string', 'Variante encart : libellé visible puis '
        + 'valeur en gras, au lieu du champ.')],
    exemples: [
      {
        titre: 'Champ',
        Rendu: () => (
          <ChampCopiable valeur="https://exemple.fr/commande/abc" libelle="Lien" />
        ),
        code: '<ChampCopiable valeur={lien} libelle="Lien" />',
      },
      {
        titre: 'Encart avec étiquette',
        Rendu: () => (
          <ChampCopiable valeur="CLIENT_BDG1" libelle="Identifiant"
                         etiquette="Identifiant à reporter dans la badgeuse" />
        ),
        code: '<ChampCopiable valeur={id} libelle="…" etiquette="…" />',
      },
    ],
  },
  {
    cle: 'filtre', nom: 'Filtre',
    resume: 'Filtre libellé, en ligne : « Client [ Tous ▾ ] ».',
    props: [
      P('libelle', 'string', 'Texte affiché avant le contrôle.'),
      P('className', 'string', 'Classe ajoutée au `<label>`, qui enveloppe '
        + 'tout le filtre.'),
      P('children', 'élément', 'Le contrôle filtrant (`Selecteur`, `Saisie`…), '
        + 'placé après le libellé.'),
    ],
    exemples: [{
      titre: 'Exemple',
      Rendu: () => (
        <Filtre libelle="Client">
          <Selecteur aria-label="Client"><option>Tous les clients</option>
          </Selecteur>
        </Filtre>
      ),
      code: '<Filtre libelle="Client"><Selecteur>…</Selecteur></Filtre>',
    }],
  },
  {
    cle: 'filtre-periode', nom: 'FiltrePeriode',
    resume: 'Fenêtre de dates. Un choix actif est mis en évidence ; les '
      + 'champs `du` / `au` n’apparaissent que pour la période personnalisée.',
    props: [
      P('valeur', '{ periode, du, au }', '`periode` : clé du choix (`""` toute '
        + 'la période, `1h`, `24h`, `7j`, `30j`, `perso`) ; `du` et `au` : '
        + 'bornes de la période `perso`, seule à les utiliser. Départ : '
        + '`FILTRE_DATE_VIDE`.'),
      P('onChange', 'fonction', 'Reçoit la nouvelle valeur ; les dates sont '
        + 'effacées quand on quitte la période personnalisée.'),
      P('periodes', 'string[]', 'Clés des choix proposés (tous par défaut).'),
      P('heure', 'booléen', 'Les bornes personnalisées portent l’heure.'),
      P('taille', 's', 'Hauteur réduite du sélecteur et des champs de date ; '
        + 'toute autre valeur (`m`) donne la hauteur normale.', 's'),
      P('bloc', 'booléen', 'Sélecteur de période en pleine largeur.'),
    ],
    exemples: [
      { titre: 'Tous les choix', Rendu: () => <PeriodeEtat />,
        code: '<FiltrePeriode valeur={dates} onChange={setDates} />' },
      { titre: 'Choix restreints, avec heure',
        Rendu: () => <PeriodeEtat periodes={PERIODES_TRACES} heure />,
        code: '<FiltrePeriode periodes={PERIODES_TRACES} heure … />' },
      { titre: 'Taille normale, période personnalisée',
        Rendu: () => (
          <PeriodeEtat initiale="perso" du="2026-10-05" au="2026-10-09"
                       taille="m" />),
        code: '<FiltrePeriode taille="m" valeur={dates} onChange={setDates} />' },
    ],
  },
  {
    cle: 'choix-limite', nom: 'ChoixLimite',
    resume: 'Sélecteur du nombre de lignes affichées (10 à 100), avec « sur N » '
      + 'quand le filtre en retient davantage.',
    props: [P('valeur · onChange', 'nombre · fonction', 'Nombre de lignes '
      + 'choisi (l’un des `LIMITES`) ; `onChange` reçoit le nouveau nombre.'),
      P('total', 'nombre', 'Lignes retenues par le filtre, indiqué s’il '
        + 'dépasse `valeur`.'),
      P('taille', 's', 'Hauteur réduite ; toute autre valeur (`m`) donne la '
        + 'hauteur normale.', 's')],
    exemples: [{ titre: 'Exemple', Rendu: LimiteEtat,
      code: '<ChoixLimite valeur={n} onChange={setN} total={340} />' }],
  },
];

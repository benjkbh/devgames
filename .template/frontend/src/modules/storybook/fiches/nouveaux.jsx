import { useState } from 'react';

import { P } from './aide';
import {
  Badge, BadgeBooleen, BarreFiltres, Bouton, ChampSaisie, ChoixLimite,
  DialogueFormulaire, FiltrePeriode, FiltreSelection, GrilleTuiles, IcoPlus,
  Recherche, Sr, Tuile, Champ, Saisie, FILTRE_DATE_VIDE,
} from '../../../ui';

const TUILES = [
  { libelle: 'Trackers', valeur: '128', detail: '112 actifs' },
  { libelle: 'Sans scan récent', valeur: '9' },
  { libelle: 'Jamais utilisés', valeur: '3' },
  { libelle: 'Désactivés', valeur: '4' },
];

function SelectionEtat({ options, ...reste }) {
  const [valeur, setValeur] = useState('');
  return (
    <FiltreSelection libelle="Client"
                     options={options || ['AEROSOFT', 'INTACT', 'PDG']}
                     valeur={valeur} onChange={setValeur}
                     toutes="Tous les clients" {...reste} />
  );
}

function BarreEtat({ carte, colonne }) {
  const [saisie, setSaisie] = useState('');
  const [dates, setDates] = useState({ ...FILTRE_DATE_VIDE, periode: '24h' });
  const [limite, setLimite] = useState(20);
  return (
    <BarreFiltres carte={carte} colonne={colonne}
                  titre={carte ? 'Filtres' : undefined}
                  actions={carte ? undefined : (
                    <Bouton variante="principal" icone={<IcoPlus />} titre="Nouveau" />
                  )}>
      <Recherche libelle="Rechercher" taille="s" value={saisie}
                 placeholder="nom ou badge…"
                 onChange={(e) => setSaisie(e.target.value)} />
      <FiltrePeriode valeur={dates} onChange={setDates} bloc={colonne} />
      <ChoixLimite valeur={limite} onChange={setLimite} total={340} />
    </BarreFiltres>
  );
}

function FormulaireEtat({ lectureSeule, suppression, erreur }) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState('');
  return (
    <>
      <Bouton onClick={() => setOuvert(true)} titre="Ouvrir le formulaire" />
      <DialogueFormulaire
        ouvert={ouvert} titre="Nouveau site" taille="m"
        onFermer={() => setOuvert(false)}
        onSubmit={(e) => { e.preventDefault(); setOuvert(false); }}
        lectureSeule={lectureSeule} envoiDesactive={!nom.trim() && !lectureSeule}
        onSupprimer={suppression ? () => setOuvert(false) : undefined}
        erreur={erreur}>
        <Champ id="sb-df-nom" libelle="Libellé" requis>
          <Saisie id="sb-df-nom" value={nom} disabled={lectureSeule}
                  onChange={(e) => setNom(e.target.value)} />
        </Champ>
      </DialogueFormulaire>
    </>
  );
}

function DecritEtat({ champ, valeurInitiale, ...reste }) {
  const [valeur, setValeur] = useState(valeurInitiale);
  return (
    <div className="sb-etroit">
      <ChampSaisie id={`sb-cd-${champ.type}-${champ.libelle}`} champ={champ} valeur={valeur}
                   onChange={setValeur} {...reste} />
    </div>
  );
}

export const FICHES = [
  {
    cle: 'sr', nom: 'Sr',
    resume: 'Texte « screen reader only » : présent dans la page, lu par les '
      + 'lecteurs d’écran, mais invisible à l’écran (clip à 1 px, hors flux). '
      + 'Il sert quand le sens passe par une icône ou une couleur : sans lui, '
      + 'une personne qui n’y voit pas n’entend rien. La classe CSS `.sr` '
      + 'fait la même chose pour un texte qui n’est pas un composant.',
    props: [P('children', 'texte', 'Texte lu mais non affiché.')],
    exemples: [{
      titre: 'Bouton réduit à une icône',
      Rendu: () => (
        <Bouton variante="fantome" icone={<IcoPlus />}>
          <Sr>Ajouter un site</Sr>
        </Bouton>
      ),
      code: '<Bouton icone={<IcoPlus />}><Sr>Ajouter un site</Sr></Bouton>',
    }, {
      titre: 'Lien externe',
      Rendu: () => (
        <p>Documentation<Sr> (s’ouvre dans un nouvel onglet)</Sr> ↗</p>
      ),
      code: '<a href="…" target="_blank">Documentation<Sr> (nouvel onglet)</Sr></a>',
    }],
  },
  {
    cle: 'badge-booleen', nom: 'BadgeBooleen',
    resume: 'Badge d’un état vrai / faux : le texte reste le même, seule la '
      + 'couleur change (vert ou gris par défaut). À employer pour un '
      + 'indicateur oui / non (« client », « interne », « accepté »), avec '
      + 'une valeur brute (une date de validation, par exemple) : inutile de '
      + 'la convertir soi-même.',
    props: [
      P('vrai', 'any', 'La valeur testée, convertie en booléen : une date, '
        + 'un nombre non nul ou un texte non vide comptent pour vrai ; '
        + '`0`, `null`, `undefined` ou un texte vide pour faux.'),
      P('couleurVrai', 'string', 'Couleur si vrai.', 'vert'),
      P('couleurFaux', 'string', 'Couleur si faux.', 'gris'),
      P('...Badge', '', 'Les autres props (`titre`, `suffixe`, `majuscules`…) '
        + 'passent à `Badge`.'),
    ],
    exemples: [{
      titre: 'Vrai, faux, couleur personnalisée',
      Rendu: () => (
        <div className="sb-ligne">
          <BadgeBooleen vrai titre="client" />
          <BadgeBooleen vrai={false} titre="interne" />
          <BadgeBooleen vrai={false} couleurFaux="orange" titre="accepté" />
          <Badge titre="pour comparaison" />
        </div>
      ),
      code: '<BadgeBooleen vrai={commande.client_valide_le} titre="client" />',
    }, {
      titre: 'couleurVrai : une autre teinte quand c’est vrai',
      Rendu: () => (
        <div className="sb-ligne">
          <BadgeBooleen vrai couleurVrai="bleu" titre="transmise" />
          <BadgeBooleen vrai={false} couleurVrai="bleu" titre="transmise" />
          <BadgeBooleen vrai couleurVrai="rouge" couleurFaux="vert"
                        titre="en alerte" />
        </div>
      ),
      code: '<BadgeBooleen vrai={c.transmise} couleurVrai="bleu" titre="transmise" />',
    }],
  },
  {
    cle: 'grille-tuiles', nom: 'GrilleTuiles',
    resume: 'Rangée de `Tuile` qui se répartit sur la largeur : chaque '
      + 'entrée de `tuiles` est rendue avec le composant `Tuile`, et les '
      + 'enfants sont ajoutés après (tuiles écrites à la main, ou autre '
      + 'élément).',
    props: [
      P('tuiles', '[{ libelle, valeur, detail }]', 'Mêmes champs que `Tuile` ; '
        + '`libelle` sert de clé : unique.', '[]'),
      P('minimum', 'pixels', 'Largeur minimale d’une tuile.', '200'),
      P('children', 'éléments', 'Ajoutés après les tuiles.'),
      P('className', 'string', 'Classe ajoutée au conteneur.'),
    ],
    exemples: [
      {
        titre: 'minimum={170}',
        Rendu: () => <GrilleTuiles minimum={170} tuiles={TUILES} />,
        code: "<GrilleTuiles minimum={170} tuiles={[{ libelle: 'Trackers', valeur: '128' }, …]} />",
      },
      {
        titre: 'minimum={260}',
        Rendu: () => <GrilleTuiles minimum={260} tuiles={TUILES} />,
        code: "<GrilleTuiles minimum={260} tuiles={[{ libelle: 'Trackers', valeur: '128' }, …]} />",
      },
      {
        titre: 'Tuiles et enfants',
        Rendu: () => (
          <GrilleTuiles tuiles={TUILES.slice(0, 2)}>
            <Tuile libelle="À traiter" detail="depuis 3 jours"
                   valeur={<Badge couleur="orange" titre="54" />} />
          </GrilleTuiles>
        ),
        code: '<GrilleTuiles tuiles={tuiles}><Tuile libelle="À traiter" valeur={n} /></GrilleTuiles>',
      },
    ],
  },
  {
    cle: 'filtre-selection', nom: 'FiltreSelection',
    resume: 'Filtre par choix dans une liste, avec une option « tous » (valeur '
      + 'vide).',
    props: [
      P('libelle', 'string', 'Texte du filtre, à gauche de la liste.'),
      P('options', 'string[] | [{ valeur, libelle }]', 'Les choix : des '
        + 'textes, ou des paires quand le texte affiché diffère de la '
        + 'valeur.'),
      P('valeur · onChange(valeur)', 'string · fonction', 'Choix courant '
        + '(chaîne vide : l’option « tous ») ; rappel appelé avec la nouvelle '
        + 'valeur, jamais un évènement.'),
      P('toutes', 'string', 'Libellé de l’option vide.', 'Tous'),
      P('taille', 's', 'Hauteur réduite, pour une barre de filtres ; sans '
        + 'valeur, hauteur normale.'),
    ],
    exemples: [
      { titre: 'Exemple', Rendu: SelectionEtat,
        code: '<FiltreSelection libelle="Client" options={clients} valeur={c} onChange={setC} />' },
      { titre: 'Options avec libellé, taille réduite',
        Rendu: () => (
          <SelectionEtat taille="s" options={[
            { valeur: 'a', libelle: 'AEROSOFT (actif)' },
            { valeur: 'i', libelle: 'INTACT' },
          ]} />),
        code: "<FiltreSelection taille=\"s\" options={[{ valeur: 'a', libelle: 'AEROSOFT' }]} … />" },
    ],
  },
  {
    cle: 'barre-filtres', nom: 'BarreFiltres',
    resume: 'Barre de filtres d’une liste : recherche, sélecteurs, période, '
      + 'limite. Les contrôles sont les enfants.',
    props: [
      P('children', 'éléments', 'Les contrôles : recherche, sélecteurs, '
        + 'période, limite.'),
      P('actions', 'élément', 'À droite (bouton de création).'),
      P('carte', 'booléen', 'Encadrée dans une carte.'),
      P('titre', 'string', 'Titre de la carte ; sans effet hors `carte`.'),
      P('colonne', 'booléen', 'Un contrôle par ligne.'),
      P('className', 'string', 'Classe ajoutée à la barre (à la carte avec '
        + '`carte`).'),
    ],
    exemples: [
      { titre: 'En ligne, avec action', Rendu: () => <BarreEtat />,
        code: '<BarreFiltres actions={<Bouton titre="Nouveau" />}>…</BarreFiltres>' },
      { titre: 'Carte', Rendu: () => <BarreEtat carte />,
        code: '<BarreFiltres carte titre="Filtres">…</BarreFiltres>' },
      { titre: 'Carte en colonne',
        Rendu: () => <div className="sb-etroit"><BarreEtat carte colonne /></div>,
        code: '<BarreFiltres carte colonne titre="Filtres">…</BarreFiltres>' },
    ],
  },
  {
    cle: 'dialogue-formulaire', nom: 'DialogueFormulaire',
    resume: 'Dialogue de saisie : `Dialogue` en formulaire, erreur en tête du '
      + 'corps, rangée Envoyer / Supprimer / Annuler.',
    props: [
      P('onSubmit(e)', 'fonction', 'Reçoit l’évènement : appeler '
        + '`e.preventDefault()`.'),
      P('onFermer', 'fonction', 'Appelée par « Annuler » (« Fermer » en '
        + 'lecture seule), la croix, Échap et un clic sur le voile.'),
      P('children', 'éléments', 'Les champs du formulaire, sous le message '
        + 'd’erreur.'),
      P('libelleEnvoi', 'string', 'Texte du bouton d’envoi.', 'Enregistrer'),
      P('envoiDesactive', 'booléen', 'Désactive l’envoi (saisie incomplète).'),
      P('occupe', 'booléen', 'Roue d’attente sur l’envoi ; la suppression '
        + 'est aussi désactivée.'),
      P('erreur', 'string', 'Message affiché en tête du corps.'),
      P('erreurCompacte', 'booléen', 'Marges réduites pour le message '
        + 'd’erreur.', 'true'),
      P('onSupprimer', 'fonction', 'Ajoute un bouton de suppression.'),
      P('libelleSupprimer', 'string', 'Texte du bouton de suppression.',
        'Supprimer'),
      P('lectureSeule', 'booléen', 'Ni envoi ni suppression : « Fermer ».'),
      P('ouvert', 'booléen', 'Dialogue affiché ; `false` : rien n’est '
        + 'rendu.', 'true'),
      P('...Dialogue', '', 'Les autres props passent à `Dialogue` : titre, '
        + 'description, taille, entete, barre, actionsTete, alerte.'),
    ],
    exemples: [
      { titre: 'Création', Rendu: () => <FormulaireEtat />,
        code: '<DialogueFormulaire titre="…" onSubmit={envoyer} envoiDesactive={!nom} />' },
      { titre: 'Avec suppression et erreur',
        Rendu: () => <FormulaireEtat suppression erreur="Libellé déjà utilisé." />,
        code: '<DialogueFormulaire onSupprimer={supprimer} erreur={erreur} … />' },
      { titre: 'Lecture seule', Rendu: () => <FormulaireEtat lectureSeule />,
        code: '<DialogueFormulaire lectureSeule … />' },
    ],
  },
  {
    cle: 'champ-saisie', nom: 'ChampSaisie',
    couvre: ['OUI', 'NON'],
    resume: 'Champ de formulaire complet - libellé, contrôle, aide, erreur - '
      + 'dessiné d’après une description. La description vient du serveur '
      + '(formulaires de commande) ou s’écrit à côté du formulaire : c’est la '
      + 'façon de saisir un champ, partout, à la place de `Champ` + `Saisie` '
      + 'écrits à la main. `onChange` reçoit la valeur, jamais un événement.',
    props: [
      P('champ', 'objet', 'La description du champ, dont les clés suivent.'),
      P('champ.type', 'string', 'choix : liste, ou segments avec '
        + '`disposition` · texte_long : zone de texte · lignes : référence + '
        + 'quantité · date : `Saisie type="date"` (AAAA-MM-JJ) · entier : nombre · '
        + 'decimal : clavier numérique avec virgule · mot_de_passe : masqué · '
        + 'texte (défaut), email, telephone, code_postal, ip : champ texte '
        + 'avec le clavier adapté ; le format est contrôlé par le serveur, '
        + 'pas par le navigateur.'),
      P('champ.libelle', 'string', 'Libellé du champ.'),
      P('champ.obligatoire', 'booléen', 'Astérisque après le libellé.'),
      P('champ.aide', 'string', 'Ligne sous le contrôle, masquée en cas '
        + 'd’erreur.'),
      P('champ.aide_detail', 'string', 'Texte long, ouvert par un bouton '
        + '« i » à côté du libellé.'),
      P('champ.valeurs', 'string[] | [{ valeur, libelle }]', 'choix : valeurs '
        + 'permises, avec un libellé affiché différent si besoin ; lignes : '
        + 'références proposées.'),
      P('champ.disposition', 'segments', 'choix : boutons côte à côte au lieu '
        + 'd’une liste (utile pour OUI / NON).'),
      P('champ.verrouille', 'booléen', 'Valeur imposée : le contrôle est '
        + 'désactivé et le champ atténué.'),
      P('champ.placeholder', 'string', 'Texte indicatif du champ vide.'),
      P('champ.min · champ.max', 'nombre', 'entier : bornes du contrôle.'),
      P('champ.longueur_max', 'nombre', 'Longueur maximale (texte, texte_long).'),
      P('champ.rows', 'nombre', 'texte_long : nombre de lignes.', '2'),
      P('valeur · onChange(valeur)', '', 'Valeur courante (liste de '
        + '`{ reference, quantite }` pour `lignes`) et rappel.'),
      P('erreur', 'string', 'Message d’erreur, relié au contrôle.'),
      P('fige', 'booléen', 'Lecture seule (formulaire non modifiable).'),
      P('id', 'string', 'Identifiant du contrôle.'),
      P('autoComplete · autoFocus · required…', '', 'Les autres props vont '
        + 'au contrôle.'),
    ],
    exemples: [
      { titre: 'choix (liste)', Rendu: () => (
        <DecritEtat valeurInitiale="b" champ={{ type: 'choix', libelle: 'Type',
          obligatoire: true, valeurs: ['a', 'b', 'c'] }} />),
        code: "<ChampSaisie champ={{ type: 'choix', valeurs: ['a', 'b'] }} … />" },
      { titre: 'choix en segments : OUI / NON', Rendu: () => (
        <DecritEtat valeurInitiale="OUI" champ={{ type: 'choix',
          libelle: 'Reprise ?', valeurs: ['OUI', 'NON'],
          disposition: 'segments',
          aide: 'Oui si la commande existe déjà.' }} />),
        code: "<ChampSaisie champ={{ type: 'choix', valeurs: ['OUI', 'NON'], disposition: 'segments' }} … />" },
      { titre: 'entier', Rendu: () => (
        <DecritEtat valeurInitiale="3" champ={{ type: 'entier',
          libelle: 'Nombre', min: 1, max: 20 }} />),
        code: "<ChampSaisie champ={{ type: 'entier', min: 1, max: 20 }} … />" },
      { titre: 'date', Rendu: () => (
        <DecritEtat valeurInitiale="2026-11-02" champ={{ type: 'date',
          libelle: 'Livraison souhaitée' }} />),
        code: "<ChampSaisie champ={{ type: 'date' }} … />" },
      { titre: 'texte avec indication et aide détaillée', Rendu: () => (
        <DecritEtat valeurInitiale="" champ={{ type: 'ip', libelle: 'Adresse IP',
          placeholder: '192.168.1.50', longueur_max: 15,
          aide: 'Format IPv4.', aide_detail: 'Quatre nombres de 0 à 255 '
            + 'séparés par des points.' }} />),
        code: "<ChampSaisie champ={{ type: 'ip', placeholder: '192.168.1.50' }} … />" },
      { titre: 'texte_long', Rendu: () => (
        <DecritEtat valeurInitiale="" champ={{ type: 'texte_long',
          libelle: 'Commentaire', longueur_max: 200 }} />),
        code: "<ChampSaisie champ={{ type: 'texte_long' }} … />" },
      { titre: 'lignes', Rendu: () => (
        <DecritEtat valeurInitiale={[{ reference: 'Câble', quantite: 2 }]}
                    champ={{ type: 'lignes', libelle: 'Matériel',
                      valeurs: ['Câble', 'Alimentation', 'Support'] }} />),
        code: "<ChampSaisie champ={{ type: 'lignes', valeurs: [...] }} … />" },
      { titre: 'mot de passe, avec props du contrôle', Rendu: () => (
        <DecritEtat valeurInitiale="" champ={{ type: 'mot_de_passe',
          libelle: 'Mot de passe' }} autoComplete="new-password" required />),
        code: "<ChampSaisie champ={{ type: 'mot_de_passe', libelle: 'Mot de passe' }} autoComplete=\"new-password\" required … />" },
      { titre: 'choix avec libellés', Rendu: () => (
        <DecritEtat valeurInitiale="pin" champ={{ type: 'choix', libelle: 'Genre',
          valeurs: [{ valeur: 'pin', libelle: 'Codes PIN' },
            { valeur: 'badges', libelle: 'Badges' }] }} />),
        code: "<ChampSaisie champ={{ type: 'choix', valeurs: [{ valeur: 'pin', libelle: 'Codes PIN' }] }} … />" },
      { titre: 'verrouillé', Rendu: () => (
        <DecritEtat valeurInitiale="UNIQUE" champ={{ type: 'choix',
          libelle: 'Valeur imposée', valeurs: ['UNIQUE'], verrouille: true }} />),
        code: "<ChampSaisie champ={{ type: 'choix', verrouille: true, … }} … />" },
      { titre: 'en erreur, lecture seule', Rendu: () => (
        <div className="sb-colonne">
          <DecritEtat valeurInitiale="" erreur="Champ obligatoire."
                      champ={{ type: 'texte', libelle: 'Société',
                        obligatoire: true }} />
          <DecritEtat valeurInitiale="ACME" fige
                      champ={{ type: 'texte', libelle: 'Client' }} />
        </div>),
        code: "<ChampSaisie champ={champ} erreur=\"Champ obligatoire.\" … />  ·  <ChampSaisie champ={champ} fige … />" },
    ],
  },
];

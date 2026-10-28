import { useState } from 'react';

import { P } from './aide';
import {
  Avatar, FilAriane, IcoEclair, IcoPioche, Jauge, Journal, Places,
  SaisieCode, TuileChoix,
} from '@ui';

// Fiches des composants des tables de jeu (accueil, salle d'attente, colonne
// du plateau) : ils servent à tout jeu à tables, pas seulement au UNO.

function CodeVivant() {
  const [code, setCode] = useState('');
  return (
    <div className="sb-colonne">
      <SaisieCode valeur={code} onChange={setCode} libelle="Code de la table" />
      <span className="dim">{code ? `Valeur : ${code}` : 'Collez « https://…/uno/K7Q2M » ici.'}</span>
    </div>
  );
}

function TuilesVivantes() {
  const [regles, setRegles] = useState({ pioche: false, rapidite: true });
  return (
    <div className="tuiles-choix">
      <TuileChoix icone={<IcoPioche />} titre="Pioche jusqu’à jouer"
                  description="On pioche jusqu’à tirer une carte jouable."
                  checked={regles.pioche}
                  onChange={(v) => setRegles({ ...regles, pioche: v })} />
      <TuileChoix icone="7·0" titre="Règle du 7 et du 0"
                  description="7 : échanger sa main. 0 : les mains tournent." disabled />
      <TuileChoix icone={<IcoEclair />} titre="Rapidité"
                  description="Poser une carte identique hors de son tour."
                  checked={regles.rapidite}
                  onChange={(v) => setRegles({ ...regles, rapidite: v })} />
    </div>
  );
}

const JOUEURS = [
  {
    nom: 'admin', detail: 'Hôte · vous', ton: 'or', presence: true, couronne: true,
  },
  {
    nom: 'Ada Lovelace', detail: 'Prêt', ton: 'vert', presence: true,
  },
  { nom: 'bob', detail: 'Absent', presence: false },
];

export const FICHES = [
  {
    cle: 'avatar', nom: 'Avatar',
    couvre: ['initiales'],
    resume: 'Rond aux initiales d’une personne, avec sa présence en pastille. '
      + 'Décoratif : le nom est écrit à côté. `initiales(nom)` rend les deux '
      + 'lettres (« Ada Lovelace » → AL, « admin » → AD).',
    props: [
      P('nom', 'string', 'Nom dont on tire les initiales.'),
      P('presence', 'booléen', 'Pastille verte (vrai) ou grise (faux) ; '
        + 'absente, pas de pastille.'),
      P('couleur', 'neutre · or · vert', 'Teinte du rond.', 'neutre'),
      P('taille', 's · m', '30 ou 40 px.', 'm'),
      P('className', 'string', 'Classe ajoutée au rond.'),
    ],
    exemples: [{
      titre: 'Teintes, présence, tailles',
      Rendu: () => (
        <div className="sb-ligne">
          <Avatar nom="admin" presence couleur="or" />
          <Avatar nom="Ada Lovelace" presence couleur="vert" />
          <Avatar nom="bob" presence={false} />
          <Avatar nom="cyd" taille="s" />
        </div>
      ),
      code: '<Avatar nom="admin" presence couleur="or" />',
    }],
  },
  {
    cle: 'jauge', nom: 'Jauge',
    resume: 'Remplissage d’une capacité : « 3 / 10 places » et une barre de '
      + 'progression nommée.',
    props: [
      P('valeur', 'nombre', 'Quantité atteinte.'),
      P('max', 'nombre', 'Capacité.'),
      P('unite', 'string', 'Texte après le maximum (« places »).'),
      P('libelle', 'string', 'Nom accessible de la barre ; à défaut, l’unité.'),
      P('className', 'string', 'Classe ajoutée à la jauge.'),
    ],
    exemples: [{
      titre: 'Places occupées',
      Rendu: () => (
        <div className="sb-colonne">
          <Jauge valeur={1} max={10} unite="places" />
          <Jauge valeur={7} max={10} unite="places" />
        </div>
      ),
      code: '<Jauge valeur={1} max={10} unite="places" />',
    }],
  },
  {
    cle: 'saisie-code', nom: 'SaisieCode',
    resume: 'Code saisi case par case : un caractère par case, passage '
      + 'automatique à la suivante, retour arrière vers la précédente. Coller '
      + 'un code complet, ou un lien qui finit par le code, le répartit dans '
      + 'les cases. En lecture seule, le code affiché dans les mêmes cases.',
    props: [
      P('valeur', 'string', 'Le code.'),
      P('onChange', 'fonction', '`onChange(code)`, en capitales.'),
      P('longueur', 'nombre', 'Nombre de cases.', '5'),
      P('permis', 'RegExp', 'Caractère accepté.', '/[A-Z0-9]/'),
      P('libelle', 'string', 'Nom accessible du groupe.', 'Code'),
      P('id', 'string', 'Posé sur la première case (`<label htmlFor>`).'),
      P('lectureSeule', 'booléen', 'Affiche le code, sans saisie.'),
      P('className', 'string', 'Classe ajoutée au groupe.'),
    ],
    exemples: [
      { titre: 'Saisie, collage d’un lien', Rendu: CodeVivant, code: '<SaisieCode valeur={code} onChange={setCode} />' },
      {
        titre: 'Lecture seule (code à partager)',
        Rendu: () => <SaisieCode lectureSeule valeur="L97RT" libelle="Code de la table" />,
        code: '<SaisieCode lectureSeule valeur="L97RT" />',
      },
    ],
  },
  {
    cle: 'tuile-choix', nom: 'TuileChoix',
    resume: 'Option à cocher présentée en tuile : pictogramme, titre, '
      + 'description et case ; la tuile entière est cliquable et s’allume, '
      + 'cochée. À ranger dans `.tuiles-choix` (grille qui passe à une colonne '
      + 'sur écran étroit).',
    props: [
      P('icone', 'élément', 'Icône, ou court texte (« 7·0 »).'),
      P('titre', 'string', 'Nom de l’option.'),
      P('description', 'string', 'L’option en une ligne.'),
      P('checked', 'booléen', 'Cochée.'),
      P('onChange', 'fonction', '`onChange(coché)`.'),
      P('disabled', 'booléen', 'Grisée, non modifiable.'),
      P('className', 'string', 'Classe ajoutée à la tuile.'),
    ],
    exemples: [{
      titre: 'Variantes de règles',
      Rendu: TuilesVivantes,
      code: '<div className="tuiles-choix">\n'
        + '  <TuileChoix icone={<IcoEclair />} titre="Rapidité"\n'
        + '              description="…" checked={v} onChange={setV} />\n</div>',
    }],
  },
  {
    cle: 'places', nom: 'Places',
    resume: 'Places autour d’une table de jeu : les joueurs assis (avatar, '
      + 'nom, ligne d’état, couronne de l’hôte), puis les places libres '
      + 'jusqu’au maximum. Une place libre peut inviter (« + ») ; l’hôte peut '
      + 'retirer un joueur.',
    props: [
      P('joueurs', '[{ nom, detail, ton, presence, couronne }]', '`ton` : or '
        + '(hôte, soi) ou vert (prêt) ; `presence` : pastille de l’avatar.'),
      P('max', 'nombre', 'Nombre total de places.'),
      P('colonnes', 'nombre', 'Places par rangée ; sinon autant qu’il en tient.'),
      P('onInviter', 'fonction', 'Rend les places libres cliquables.'),
      P('libelleInviter', 'string', 'Nom du bouton d’une place libre.', 'Inviter un joueur'),
      P('onRetirer', 'fonction', '`onRetirer(nom)` : bouton de retrait.'),
      P('retirable', 'fonction', '`retirable(joueur)` : places qui l’ont.'),
      P('libelle', 'string', 'Nom accessible de la liste.', 'Places'),
      P('className', 'string', 'Classe ajoutée à la liste.'),
    ],
    exemples: [
      {
        titre: 'Vue de l’hôte : inviter, retirer',
        Rendu: () => (
          <Places joueurs={JOUEURS} max={6} colonnes={3} onInviter={() => {}}
                  onRetirer={() => {}} retirable={(j) => j.nom !== 'admin'} />
        ),
        code: '<Places joueurs={joueurs} max={10} colonnes={5}\n'
          + '        onInviter={copierLien} onRetirer={exclure} />',
      },
      {
        titre: 'Vue d’un joueur : lecture seule',
        Rendu: () => <Places joueurs={JOUEURS} max={5} />,
        code: '<Places joueurs={joueurs} max={10} />',
      },
    ],
  },
  {
    cle: 'fil-ariane', nom: 'FilAriane',
    resume: 'Fil d’Ariane : où l’on est, du plus général au plus précis ; le '
      + 'dernier élément est la page courante. Les éléments sont des textes ou '
      + 'des liens (`<Link>` du routeur).',
    props: [
      P('elements', 'éléments', 'Textes ou liens, dans l’ordre.'),
      P('libelle', 'string', 'Nom accessible de la navigation.', 'Fil d’Ariane'),
      P('className', 'string', 'Classe ajoutée à la navigation.'),
    ],
    exemples: [{
      titre: 'Module de jeu',
      Rendu: () => (
        <FilAriane elements={[<a key="j" href="#jeux">Jeux de la veillée</a>, 'UNO']} />
      ),
      code: "<FilAriane elements={[<Link to=\"/uno\">Jeux de la veillée</Link>, 'UNO']} />",
    }],
  },
  {
    cle: 'journal', nom: 'Journal',
    resume: 'Fil des derniers événements d’une partie, du plus récent au plus '
      + 'ancien : un point doré pour ce qui se passe maintenant, un carré de '
      + 'couleur pour une carte jouée. Rend `null` si la liste est vide.',
    props: [
      P('evenements', '[{ cle, contenu, ton, couleur }]', '`ton` : actif ou '
        + 'neutre ; `couleur` : couleur CSS du carré.'),
      P('libelle', 'string', 'Nom accessible de la liste.', 'Journal'),
      P('className', 'string', 'Classe ajoutée à la liste.'),
    ],
    exemples: [{
      titre: 'Journal de la manche',
      Rendu: () => (
        <Journal evenements={[
          {
            cle: 't', ton: 'actif', contenu: <><strong>Au tour de inv</strong> · absent</>,
          },
          { cle: 'c', contenu: 'Carte retournée : 2 bleu', couleur: 'var(--uno-bleu)' },
          { cle: 'd', contenu: 'admin distribue 7 cartes à chacun' },
        ]} />
      ),
      code: '<Journal evenements={[\n'
        + "  { cle: 'tour', ton: 'actif', contenu: <strong>Au tour de inv</strong> },\n"
        + "  { cle: 'c', contenu: '…', couleur: 'var(--uno-bleu)' },\n]} />",
    }],
  },
];

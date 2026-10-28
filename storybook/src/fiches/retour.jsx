import { useCallback, useRef, useState } from 'react';

import { P } from './aide';
import {
  Alerte, Bouton, BoutonAide, BoutonPopup, Chargement, Confirmation, Dialogue,
  EtatVide, FenetreDetail, IcoAccueil, IcoInfo, MenuDeroulant, Onglets, Popup,
} from '@ui';

const ONGLETS = [
  { cle: 'a', libelle: 'Détail' },
  { cle: 'b', libelle: 'Traces', compte: 42 },
  { cle: 'c', libelle: 'Erreurs', puce: true, aide: 'Erreurs à traiter' },
];

function OngletsEtat({ variante }) {
  const [actif, setActif] = useState('a');
  return (
    <Onglets onglets={ONGLETS} actif={actif} onChange={setActif}
             libelle="Exemple" variante={variante} />
  );
}

function DialogueEtat({ taille, formulaire, tete }) {
  const [ouvert, setOuvert] = useState(false);
  let ouverture = `Ouvrir (taille ${taille})`;
  if (formulaire) ouverture = 'Ouvrir un formulaire';
  if (tete) ouverture = 'Ouvrir (actions dans l’en-tête)';
  return (
    <>
      <Bouton onClick={() => setOuvert(true)} titre={ouverture} />
      <Dialogue
        ouvert={ouvert} titre="Titre" description="Description." taille={taille}
        onFermer={() => setOuvert(false)}
        actionsTete={tete && <Bouton taille="s" titre="Exporter" />}
        onSubmit={formulaire ? (e) => { e.preventDefault(); setOuvert(false); }
          : undefined}
        actions={(
          <>
            {formulaire && (
              <Bouton type="submit" variante="principal" titre="Valider" />
            )}
            <Bouton onClick={() => setOuvert(false)} titre="Fermer" />
          </>
        )}>
        Contenu de la fenêtre.
      </Dialogue>
    </>
  );
}

function ConfirmationEtat({ danger }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Bouton variante="secondaire" couleur={danger ? 'rouge' : 'sang'}
              onClick={() => setOuvert(true)} titre={danger ? 'Supprimer…' : 'Confirmer…'} />
      <Confirmation
        ouvert={ouvert} titre={danger ? 'Supprimer ?' : 'Continuer ?'}
        message="Cette action est définitive." libelle="Confirmer"
        danger={danger} onConfirmer={() => setOuvert(false)}
        onAnnuler={() => setOuvert(false)} />
    </>
  );
}

function DetailEtat() {
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState('a');
  return (
    <>
      <Bouton onClick={() => setOuvert(true)} titre="Ouvrir le détail" />
      <FenetreDetail ouvert={ouvert} titre="KM0 @ DIGIDIZ"
                     entete={<span>En-tête libre</span>}
                     actionsTete={<Bouton taille="s" titre="Exporter" />}
                     onglets={ONGLETS} onglet={onglet} onOnglet={setOnglet}
                     taille="l" onFermer={() => setOuvert(false)}>
        Contenu de l’onglet « {onglet} ».
      </FenetreDetail>
    </>
  );
}

function PopupEtat() {
  const ancre = useRef(null);
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <Bouton ref={ancre} onClick={() => setOuvert((o) => !o)}
              titre="Ancre de la popup" />
      <Popup ouvert={ouvert} ancre={ancre} titre="Titre" onFermer={fermer}>
        Contenu de la popup.
      </Popup>
    </>
  );
}

export const FICHES = [
  {
    cle: 'alerte', nom: 'Alerte',
    resume: 'Encadré de message. `role="alert"` n’est posé par défaut que '
      + 'pour le niveau danger.',
    props: [
      P('niveau', 'string', 'danger · attention · info · succes · neutre',
        'danger'),
      P('titre', 'string', 'Ligne de titre.'),
      P('compacte', 'booléen', 'Marges réduites.'),
      P('role', 'string', 'Rôle ARIA. À défaut, `alert` pour le niveau '
        + 'danger, aucun pour les autres.'),
      P('className', 'string', 'Classe ajoutée à l’encadré.'),
      P('children', 'élément', 'Texte du message.'),
    ],
    exemples: [
      {
        titre: 'Niveaux',
        Rendu: () => (
          <div className="sb-colonne">
            {['danger', 'attention', 'info', 'succes', 'neutre'].map((t) => (
              <Alerte key={t} niveau={t} titre={t}>Message d’exemple.</Alerte>
            ))}
          </div>
        ),
        code: '<Alerte niveau="attention" titre="Attention">…</Alerte>',
      },
      {
        titre: 'Compacte, sans titre',
        Rendu: () => <Alerte compacte niveau="info">Message court.</Alerte>,
        code: '<Alerte compacte niveau="info">…</Alerte>',
      },
    ],
  },
  {
    cle: 'etat-vide', nom: 'EtatVide',
    resume: 'État vide : icône, titre et texte explicatif facultatifs.',
    props: [
      P('titre', 'string', 'Titre de l’état vide, sous l’icône.'),
      P('icone', 'élément', 'Icône affichée au-dessus du titre.'),
      P('compact', 'booléen', 'Marges réduites.'),
      P('children', 'élément', 'Texte explicatif.'),
    ],
    exemples: [
      {
        titre: 'Complet',
        Rendu: () => (
          <EtatVide icone={<IcoAccueil />} titre="Rien à afficher">
            Aucun résultat pour ce filtre.
          </EtatVide>
        ),
        code: '<EtatVide icone={<IcoAccueil />} titre="…">…</EtatVide>',
      },
      {
        titre: 'Compact',
        Rendu: () => <EtatVide compact titre="Aucune anomalie" />,
        code: '<EtatVide compact titre="Aucune anomalie" />',
      },
    ],
  },
  {
    cle: 'chargement', nom: 'Chargement',
    resume: 'Indicateur de chargement avec libellé (`role="status"`).',
    props: [
      P('texte', 'string', 'Libellé affiché à côté de la roue.',
        'Chargement…'),
      P('compact', 'booléen', 'Marges réduites.'),
    ],
    exemples: [
      {
        titre: 'Libellé par défaut',
        Rendu: () => <Chargement />,
        code: '<Chargement />',
      },
      {
        titre: 'Texte personnalisé, compact',
        Rendu: () => <Chargement compact texte="Lecture des traces…" />,
        code: '<Chargement texte="Lecture des traces…" compact />',
      },
    ],
  },
  {
    cle: 'onglets', nom: 'Onglets',
    resume: 'Barre d’onglets, soulignée ou en pilules.',
    props: [
      P('onglets', '[{ cle, libelle, compte, puce, aide, aideDetail }]',
        'compte : nombre ; puce : pastille d’attention ; aide : infobulle ; '
        + 'aideDetail : « ? » ouvrant une popup.'),
      P('actif', 'string', 'Clé de l’onglet sélectionné.'),
      P('onChange(cle)', 'fonction', 'Appelée avec la clé de l’onglet cliqué.'),
      P('libelle', 'string', 'Nom accessible.'),
      P('variante', 'souligne · pilule',
        'Onglets soulignés, ou en pilules.', 'souligne'),
      P('className', 'string', 'Classe ajoutée à la barre d’onglets.'),
    ],
    exemples: ['souligne', 'pilule'].map((v) => ({
      titre: `variante="${v}"`,
      Rendu: () => <OngletsEtat variante={v} />,
      code: `<Onglets onglets={ONGLETS} actif={a} onChange={setA} libelle="…" variante="${v}" />`,
    })),
  },
  {
    cle: 'dialogue', nom: 'Dialogue',
    resume: 'Fenêtre modale dans `document.body`. Échap et un clic sur le '
      + 'voile appellent `onFermer`.',
    props: [
      P('ouvert', 'booléen', 'Affiche la fenêtre ; fermée, elle ne rend rien.'),
      P('titre', 'string', 'Titre (`<h2>`), qui nomme aussi la boîte pour les '
        + 'lecteurs d’écran.'),
      P('description', 'string', 'Phrase d’explication sous le titre.'),
      P('actions', 'élément', 'Boutons ; `type="submit"` avec `onSubmit`.'),
      P('actionsTete', 'élément', 'Boutons à droite du titre, dans l’en-tête, '
        + 'avant la croix de fermeture.'),
      P('onFermer', 'fonction', 'Appelée par la croix, Échap (sauf si une '
        + 'popup est ouverte) ou un clic sur le voile.'),
      P('onSubmit', 'fonction', 'Transforme la boîte en `<form>`.'),
      P('taille', 'm · l · xl', 'xl : hauteur fixe, corps défilant.', 'm'),
      P('entete', 'élément', 'Sous le titre.'),
      P('barre', 'élément', 'Bandeau entre l’en-tête et le corps.'),
      P('alerte', 'booléen', 'Rôle `alertdialog`.'),
      P('children', 'élément', 'Corps de la fenêtre.'),
    ],
    exemples: [
      ...['m', 'l'].map((t) => ({
        titre: `taille="${t}"`,
        Rendu: () => <DialogueEtat taille={t} />,
        code: `<Dialogue ouvert={o} titre="…" taille="${t}" onFermer={fermer}>…</Dialogue>`,
      })),
      {
        titre: 'Formulaire',
        Rendu: () => <DialogueEtat taille="m" formulaire />,
        code: '<Dialogue onSubmit={envoyer} actions={<Bouton type="submit" titre="…" />}>…</Dialogue>',
      },
      {
        titre: 'Actions dans l’en-tête',
        Rendu: () => <DialogueEtat taille="m" tete />,
        code: '<Dialogue ouvert={o} titre="…" actionsTete={<Bouton taille="s" titre="Exporter" />} onFermer={fermer}>…</Dialogue>',
      },
    ],
  },
  {
    cle: 'confirmation', nom: 'Confirmation',
    resume: 'Dialogue de confirmation (`alertdialog`) : un message, un bouton '
      + 'de confirmation et « Revenir ».',
    props: [
      P('ouvert', 'booléen', 'Affiche la boîte de confirmation.'),
      P('titre', 'string', 'Question posée.'),
      P('message', 'élément', 'Texte explicatif, dans le corps.'),
      P('libelle', 'string', 'Texte du bouton de confirmation.'),
      P('danger', 'booléen', 'Variante danger.'),
      P('occupe', 'booléen', 'Bouton en cours d’action.'),
      P('onConfirmer', 'fonction', 'Appelée par le bouton de confirmation.'),
      P('onAnnuler', 'fonction', 'Appelée par « Revenir », la croix, Échap '
        + 'ou un clic sur le voile.'),
    ],
    exemples: [
      { titre: 'Simple', Rendu: () => <ConfirmationEtat />,
        code: '<Confirmation ouvert={o} titre="…" message="…" onConfirmer={…} onAnnuler={…} />' },
      { titre: 'Danger', Rendu: () => <ConfirmationEtat danger />,
        code: '<Confirmation danger libelle="Supprimer" … />' },
    ],
  },
  {
    cle: 'fenetre-detail', nom: 'FenetreDetail',
    resume: 'Fenêtre de détail d’une ligne de tableau (un `Dialogue` avec '
      + 'barre d’onglets).',
    props: [
      P('ouvert', 'booléen', 'Affiche la fenêtre.'),
      P('titre', 'string', 'Titre de l’en-tête.'),
      P('entete', 'élément', 'Sous le titre : badges, statut.'),
      P('actionsTete', 'élément', 'Boutons à droite du titre, dans l’en-tête, '
        + 'avant la croix de fermeture.'),
      P('onglets · onglet · onOnglet', '', 'Barre affichée si plus d’un '
        + 'onglet.'),
      P('libelleOnglets', 'string', 'Nom accessible des onglets ; à défaut, '
        + 'le titre.'),
      P('taille', 'm · l · xl', 'Largeur de la fenêtre ; xl : hauteur fixe, '
        + 'corps défilant.', 'xl'),
      P('onFermer', 'fonction', 'Appelée par la croix, Échap ou un clic sur '
        + 'le voile.'),
      P('children', 'élément', 'Contenu, souvent celui de l’onglet actif.'),
    ],
    exemples: [{ titre: 'Avec onglets', Rendu: DetailEtat,
      code: '<FenetreDetail ouvert={o} titre="…" onglets={ONGLETS} onglet={a} onOnglet={setA}>…</FenetreDetail>' }],
  },
  {
    cle: 'bouton-popup', nom: 'BoutonPopup',
    resume: 'Bouton qui ouvre une popup ancrée sur lui.',
    props: [
      P('titre', 'string', 'Titre de la popup.'),
      P('libelle', 'string', 'Texte pour lecteur d’écran.'),
      P('icone', 'élément', 'Contenu visible du bouton.'),
      P('className', 'string', 'Apparence du bouton (aucune par défaut).'),
      P('title', 'string', 'Infobulle du bouton (attribut HTML `title`), à '
        + 'ne pas confondre avec `titre`, celui de la popup.'),
      P('children', 'élément', 'Contenu de la popup.'),
    ],
    exemples: [{
      titre: 'Exemple',
      Rendu: () => (
        <BoutonPopup titre="Détail" libelle="Infos" icone={<IcoInfo />}
                     title="Plus d’informations"
                     className="btn btn-fantome btn-m">
          Contenu de la popup.
        </BoutonPopup>
      ),
      code: '<BoutonPopup titre="Détail" title="Plus d’informations" libelle="Infos" icone={<IcoInfo />}>…</BoutonPopup>',
    }],
  },
  {
    cle: 'bouton-aide', nom: 'BoutonAide',
    resume: 'Petit bouton rond d’aide ouvrant une popup.',
    props: [
      P('titre', 'string', 'Titre de la popup d’aide.'),
      P('symbole', 'string', 'Caractère affiché dans le bouton rond.', '?'),
      P('libelle', 'string', 'Texte pour lecteur d’écran.', 'En savoir plus'),
      P('className', 'string', 'Classe ajoutée à celle du bouton rond.'),
      P('children', 'élément', 'Contenu de la popup d’aide.'),
    ],
    exemples: [{
      titre: 'Exemple',
      Rendu: () => <BoutonAide titre="Aide">Texte d’aide.</BoutonAide>,
      code: '<BoutonAide titre="Aide">…</BoutonAide>',
    }],
  },
  {
    cle: 'popup', nom: 'Popup',
    resume: 'Petite fenêtre ancrée sur une référence `ancre`, dans un portail. '
      + 'Placée sous l’ancre, ou au-dessus si elle déborde ; fermée par '
      + 'Échap, un clic extérieur, un défilement ou un redimensionnement.',
    props: [
      P('ouvert', 'booléen', 'Affiche la popup.'),
      P('onFermer', 'fonction', 'Appelée à chaque cause de fermeture. À '
        + 'mémoriser avec `useCallback` : les écouteurs en dépendent.'),
      P('ancre', 'ref', 'Référence de l’élément qui sert d’ancre.'),
      P('titre', 'string', 'Titre de l’en-tête, et nom accessible de la '
        + 'popup.'),
      P('children', 'élément', 'Contenu de la popup.'),
    ],
    exemples: [{ titre: 'Ancrée sur un bouton', Rendu: PopupEtat,
      code: '<Popup ouvert={o} ancre={ref} titre="…" onFermer={fermer}>…</Popup>' }],
  },
  {
    cle: 'menu-deroulant', nom: 'MenuDeroulant',
    resume: 'Bouton qui déroule une liste d’actions. Un clic extérieur ou '
      + 'Échap referme.',
    props: [
      P('items', '[{ cle, libelle, description, desactive, onClick }]',
        'Actions de la liste ; `description` s’affiche sous le libellé, '
        + '`onClick` est appelé après la fermeture.'),
      P('libelle · icone', '', 'Bouton déclencheur.'),
      P('variante', '', 'Comme Bouton.', 'principal'),
      P('taille', 's · m · l', 'Comme Bouton.', 'm'),
      P('desactive', 'booléen', 'Désactive le bouton déclencheur.'),
      P('note', 'string', 'Texte non cliquable sous la liste.'),
      P('alignement', 'debut · fin', 'Bord du bouton sur lequel la liste '
        + 's’aligne : son bord gauche (`debut`) ou droit (`fin`).', 'fin'),
    ],
    exemples: [{
      titre: 'Exemple',
      Rendu: () => (
        <MenuDeroulant libelle="Actions" variante="secondaire"
                       note="Note sous la liste."
                       items={[
                         { cle: 'a', libelle: 'Première',
                           description: 'Fait A.', onClick: () => {} },
                         { cle: 'b', libelle: 'Seconde', onClick: () => {} },
                         { cle: 'c', libelle: 'Indisponible', desactive: true,
                           onClick: () => {} },
                       ]} />
      ),
      code: '<MenuDeroulant libelle="Actions" items={ITEMS} />',
    }],
  },
];

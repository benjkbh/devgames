import { P, COULEURS } from './aide';
import {
  Badge, Bouton, Carte, Chronologie, Definitions, Etapes, FriseEtats,
  IcoPlus, Pastille, Tuile,
} from '../../../ui';
import * as ui from '../../../ui';

const MAINTENANT = Math.floor(Date.now() / 1000);
const VARIANTES = ['principal', 'secondaire', 'fantome'];
const COULEURS_BOUTON = ['bleu', 'rouge', 'vert'];
const PARCOURS = [{ cle: 'a', libelle: 'Création' },
  { cle: 'b', libelle: 'Transmise' },
  { cle: 'c', libelle: 'Livrée' }];

function Galerie() {
  const icones = Object.entries(ui).filter(([nom]) => /^Ico[A-Z]/.test(nom));
  return (
    <ul className="sb-icones">
      {icones.map(([nom, Ico]) => (
        <li key={nom}><Ico /><code>{nom}</code></li>
      ))}
    </ul>
  );
}

export const FICHES = [
  {
    cle: 'bouton', nom: 'Bouton',
    resume: 'Bouton de l’interface. Trois variantes (le poids visuel) et une '
      + 'couleur (la teinte) : on combine, au lieu de multiplier les '
      + 'variantes. Sans texte et avec une icône, il est carré : c’est le '
      + 'bouton-icône. Les props non listées passent au `<button>`.',
    props: [
      P('titre', 'string', 'Le texte du bouton. À défaut, les enfants, pour '
        + 'un contenu qui n’est pas du texte simple.'),
      P('variante', 'principal · secondaire · fantome', 'principal : '
        + 'l’action de la zone (aplat) ; secondaire : action ordinaire '
        + '(contour) ; fantome : action discrète (barre d’outils).',
      'secondaire'),
      P('couleur', 'bleu · rouge · vert', 'Teinte. rouge : geste '
        + 'destructif ; vert : passage à l’étape suivante.', 'bleu'),
      P('taille', 's · m · l', 'Hauteur du bouton.', 'm'),
      P('icone', 'élément', 'Affiché avant le texte.'),
      P('iconeFin', 'élément', 'Affiché après le texte.'),
      P('libelle', 'string', 'Sans texte : infobulle et nom accessible du '
        + 'bouton-icône (obligatoire dans ce cas).'),
      P('bloc', 'booléen', 'Pleine largeur.'),
      P('waiting', 'booléen', 'Roue d’attente, bouton désactivé.'),
      P('disabled', 'booléen', 'Désactivé.'),
      P('type', 'button · submit · reset', 'Type HTML : button n’envoie '
        + 'rien ; submit valide le formulaire parent ; reset le remet à '
        + 'zéro.', 'button'),
      P('href', 'string', 'Rend un lien (`<a>`) à l’apparence d’un bouton, '
        + 'ouvert dans un nouvel onglet.'),
      P('className', 'string', 'Classe ajoutée au bouton.'),
      P('children', 'éléments', 'Contenu riche, rendu après `titre`.'),
    ],
    exemples: [
      {
        titre: 'Variantes et couleurs',
        Rendu: () => (
          <div className="sb-colonne">
            {COULEURS_BOUTON.map((couleur) => (
              <div key={couleur} className="sb-ligne">
                {VARIANTES.map((v) => (
                  <Bouton key={v} variante={v} couleur={couleur}
                          titre={`${v} ${couleur}`} />
                ))}
              </div>
            ))}
          </div>
        ),
        code: '<Bouton variante="principal" couleur="rouge" titre="Supprimer" />',
      },
      {
        titre: 'Tailles',
        Rendu: () => (
          <div className="sb-ligne">
            {['s', 'm', 'l'].map((t) => (
              <Bouton key={t} taille={t} titre={`taille ${t}`} />
            ))}
          </div>
        ),
        code: '<Bouton taille="s" titre="Petit" />',
      },
      {
        titre: 'Icônes',
        Rendu: () => (
          <div className="sb-ligne">
            <Bouton icone={<IcoPlus />} titre="Avant" />
            <Bouton iconeFin={<IcoPlus />} titre="Après" />
          </div>
        ),
        code: '<Bouton icone={<IcoPlus />} titre="Ajouter" />',
      },
      {
        titre: 'Sans texte : bouton-icône',
        Rendu: () => (
          <div className="sb-ligne">
            <Bouton variante="fantome" icone={<IcoPlus />} libelle="Ajouter" />
            <Bouton variante="secondaire" icone={<IcoPlus />}
                    libelle="Ajouter" taille="s" />
            <Bouton variante="fantome" couleur="rouge" icone={<IcoPlus />}
                    libelle="Retirer" />
          </div>
        ),
        code: '<Bouton variante="fantome" icone={<IcoPlus />} libelle="Ajouter" />',
      },
      {
        titre: 'États',
        Rendu: () => (
          <div className="sb-ligne">
            <Bouton waiting titre="Envoi" />
            <Bouton disabled titre="Désactivé" />
            <Bouton variante="principal" waiting titre="Envoi" />
          </div>
        ),
        code: '<Bouton waiting titre="Envoi" />',
      },
      {
        titre: 'Types',
        Rendu: () => (
          <form className="sb-ligne" onSubmit={(e) => e.preventDefault()}>
            <Bouton type="submit" variante="principal" titre="submit" />
            <Bouton type="reset" titre="reset" />
            <Bouton type="button" titre="button" />
          </form>
        ),
        code: '<Bouton type="submit" variante="principal" titre="Valider" />',
      },
      {
        titre: 'Lien (href)',
        Rendu: () => (
          <Bouton href="https://www.openstreetmap.org" variante="principal"
                  icone={<IcoPlus />} titre="Ouvrir dans un nouvel onglet" />
        ),
        code: '<Bouton href={url} variante="principal" titre="Ouvrir" />',
      },
      {
        titre: 'Pleine largeur',
        Rendu: () => <Bouton bloc variante="principal" titre="Se connecter" />,
        code: '<Bouton bloc variante="principal" titre="Se connecter" />',
      },
    ],
  },
  {
    cle: 'badge', nom: 'Badge',
    resume: 'Étiquette courte (statut, rôle, compte). La couleur est '
      + 'choisie par son nom : c’est à l’appelant de dire ce qu’elle signifie '
      + '(par exemple vert = actif). Les props non listées passent au '
      + '`<span>`.',
    props: [
      P('titre', 'string', 'Le texte (à défaut, les enfants, pour un '
        + 'contenu riche).'),
      P('couleur', 'string', COULEURS, 'gris'),
      P('majuscules', 'booléen', 'Variante en capitales pour annoter une '
        + 'valeur voisine.'),
      P('suffixe', 'texte | nombre', 'Valeur chiffrée après le texte '
        + '(« figé 3 j »), en chiffres tabulaires.'),
      P('className', 'string', 'Classe ajoutée.'),
      P('children', 'éléments', 'Contenu riche, rendu après `titre` et '
        + 'avant `suffixe`.'),
    ],
    exemples: [
      {
        titre: 'Couleurs',
        Rendu: () => (
          <div className="sb-ligne">
            {['gris', 'bleu', 'vert', 'orange', 'rouge'].map((t) => (
              <Badge key={t} couleur={t} titre={t} />
            ))}
          </div>
        ),
        code: '<Badge couleur="vert" titre="accepté" />',
      },
      {
        titre: 'Majuscules',
        Rendu: () => (
          <div className="sb-ligne">
            <Badge majuscules titre="archivée" />
            <Badge majuscules couleur="orange" titre="à traiter" />
          </div>
        ),
        code: '<Badge majuscules titre="archivée" />',
      },
      {
        titre: 'Avec suffixe',
        Rendu: () => (
          <div className="sb-ligne">
            <Badge couleur="rouge" majuscules suffixe="3 j" titre="figé" />
            <Badge couleur="orange" majuscules suffixe="72 %" titre="badges" />
          </div>
        ),
        code: '<Badge couleur="rouge" majuscules suffixe="3 j" titre="figé" />',
      },
      {
        titre: 'Contenu riche (children)',
        Rendu: () => (
          <Badge couleur="bleu"><IcoPlus /> 3 nouveaux</Badge>
        ),
        code: '<Badge couleur="bleu"><IcoPlus /> 3 nouveaux</Badge>',
      },
    ],
  },
  {
    cle: 'pastille', nom: 'Pastille',
    resume: 'Rond coloré, sans texte et masqué aux lecteurs d’écran. La '
      + 'couleur est choisie par son nom ; `compact` réduit le rond en un '
      + 'point à côté d’un texte (pastille d’un onglet). Le sens d’une '
      + 'couleur vient de l’appelant : pour une pointeuse, la couleur de '
      + 'chaque statut est dans `backend/partage/constantes.json`.',
    props: [
      P('couleur', 'string', 'vert · bleu · rouge · orange · ardoise · gris '
        + '· vide (anneau sans remplissage).'),
      P('compact', 'booléen', 'Point de 7 px, sans halo.'),
      P('className', 'string', 'Classe ajoutée.'),
    ],
    exemples: [{
      titre: 'Couleurs',
      Rendu: () => (
        <div className="sb-ligne">
          {['vert', 'bleu', 'rouge', 'orange', 'ardoise', 'gris', 'vide']
            .map((s) => (
              <span key={s} className="sb-ligne">
                <Pastille couleur={s} /> <code>{s}</code>
              </span>
            ))}
        </div>
      ),
      code: '<Pastille couleur="vert" />',
    }, {
      titre: 'En compact',
      Rendu: () => (
        <div className="sb-ligne">
          {['orange', 'rouge', 'bleu', 'vert', 'gris'].map((s) => (
            <span key={s} className="sb-ligne">
              <Pastille couleur={s} compact /> <code>{s}</code>
            </span>
          ))}
        </div>
      ),
      code: '<Pastille couleur="orange" compact />',
    }],
  },
  {
    cle: 'carte', nom: 'Carte',
    resume: 'Conteneur : une surface encadrée, avec ou sans en-tête, qui '
      + 'champs…). Les props non listées passent à la balise racine.',
    props: [
      P('titre · sousTitre · actions', 'élément', 'Forment l’en-tête : titre '
        + '(`<h3>`), sous-titre sous le titre, actions à droite. Sans aucun '
        + 'des trois, pas d’en-tête.'),
      P('corps', 'booléen', 'true : les enfants sont rendus dans le corps de '
        + 'la carte. false : le corps n’est pas rendu - les enfants ne '
        + 'sont pas affichés, même s’ils sont définis (carte réduite à son '
        + 'en-tête).', 'true'),
      P('niveau', 'attention · accent', 'attention : cadre et en-tête '
        + 'teintés (orange) ; accent : liseré de la couleur d’accent sur le '
        + 'bord gauche.'),
      P('compacte', 'booléen', 'Marges réduites.'),
      P('as', 'string', 'Balise racine : `article` pour une carte autonome '
        + '(un élément d’une liste), `aside` pour un encart…', 'section'),
      P('className', 'string', 'Classe ajoutée à la balise racine.'),
      P('children', 'éléments', 'Le corps de la carte (voir `corps`).'),
    ],
    exemples: [
      {
        titre: 'Avec en-tête',
        Rendu: () => (
          <Carte titre="Titre" sousTitre="Sous-titre"
                 actions={<Bouton taille="s" titre="Action" />}>
            Contenu de la carte.
          </Carte>
        ),
        code: '<Carte titre="Titre" sousTitre="…" actions={…}>…</Carte>',
      },
      {
        titre: 'Niveaux et compacte',
        Rendu: () => (
          <div className="sb-grille">
            <Carte niveau="accent" compacte>Liseré accent.</Carte>
            <Carte niveau="attention" compacte>Liseré attention.</Carte>
          </div>
        ),
        code: '<Carte niveau="accent" compacte>…</Carte>',
      },
      {
        titre: 'as : balise racine, pour une carte autonome',
        Rendu: () => (
          <div className="sb-grille">
            <Carte as="article" titre="Commande 1042" sousTitre="Transmise"
                   niveau="accent" compacte>
              Rendue dans un <code>&lt;article&gt;</code>.
            </Carte>
            <Carte as="article" titre="Commande 1043" sousTitre="À traiter"
                   niveau="attention" compacte>
              Chaque carte se lit seule.
            </Carte>
          </div>
        ),
        code: '<Carte as="article" titre="…" sousTitre="…" niveau="accent">…</Carte>',
      },
      {
        titre: 'Autre chose que du texte',
        Rendu: () => (
          <Carte titre="Actions">
            <ul className="sb-liste-simple">
              <li>Une liste dans le corps.</li>
              <li><Bouton taille="s" titre="Un bouton" /></li>
            </ul>
          </Carte>
        ),
        code: '<Carte titre="Actions"><ul>…</ul></Carte>',
      },
      {
        titre: 'corps={false} : en-tête seul',
        Rendu: () => (
          <Carte titre="En-tête seul" corps={false}>
            Ce contenu n’est pas affiché.
          </Carte>
        ),
        code: '<Carte titre="En-tête seul" corps={false}>…</Carte>',
      },
    ],
  },
  {
    cle: 'tuile', nom: 'Tuile',
    resume: 'Chiffre-clé : libellé, grande valeur, détail.',
    props: [P('libelle', 'string', 'Au-dessus de la valeur.'),
      P('valeur', 'élément', 'En grand.'),
      P('detail', 'string', 'Dessous, facultatif.'),
      P('className', 'string', 'Classe ajoutée à la tuile.')],
    exemples: [{
      titre: 'Trois tuiles',
      Rendu: () => (
        <div className="sb-ligne">
          <Tuile libelle="Badgeages" valeur="1 623" detail="sur la période" />
          <Tuile libelle="Anomalies" valeur="54" />
          <Tuile libelle="Personnes" valeur="–" />
        </div>
      ),
      code: '<Tuile libelle="Badgeages" valeur={n} detail="sur la période" />',
    }],
  },
  {
    cle: 'definitions', nom: 'Definitions',
    resume: 'Liste libellé / valeur en lecture seule.',
    props: [
      P('items', '[[libellé, valeur]]', 'Le libellé sert de clé : unique.'),
      P('disposition', 'pile · grille · ligne', 'pile : libellé au-dessus de '
        + 'la valeur, séparés d’un trait ; grille : cases réparties sur la '
        + 'largeur ; ligne : paires à la suite, avec retour à la ligne.',
      'pile'),
      P('mono', 'booléen', 'Valeurs en chasse fixe.'),
      P('className', 'string', 'Classe ajoutée à la liste (`<dl>`).'),
    ],
    exemples: [...['pile', 'grille', 'ligne'].map((d) => ({
      titre: `disposition="${d}"`,
      Rendu: () => (
        <Definitions disposition={d}
                     items={[['Adresse IP', '10.1.12.115'], ['Modèle', 'T6'],
                       ['Passerelle', '10.1.12.1']]} />
      ),
      code: `<Definitions disposition="${d}" items={[['Modèle', 'T6']]} />`,
    })), {
      titre: 'mono',
      Rendu: () => (
        <Definitions mono disposition="ligne"
                     items={[['MAC', '00:90:EC:18:00:00'],
                       ['Série', 'T9999999']]} />
      ),
      code: '<Definitions mono items={ITEMS} />',
    }],
  },
  {
    cle: 'etapes', nom: 'Etapes',
    resume: 'Frise d’étapes d’un parcours (par exemple les statuts d’une '
      + 'commande) : une puce par étape, reliées par un trait. Les étapes '
      + 'avant `courante` sont passées, `courante` est mise en avant, les '
      + 'suivantes sont à venir. Elle montre l’avancement : les étapes ne '
      + 'sont pas cliquables.',
    props: [
      P('etapes', '[{ cle, libelle }]', 'Dans l’ordre du parcours ; `cle` '
        + 'est unique, `libelle` est le texte affiché.'),
      P('courante', 'string', 'Clé de l’étape atteinte ; une clé absente '
        + 'laisse tout à venir.'),
      P('libelle', 'string', 'Nom accessible de la liste.'),
    ],
    exemples: [
      {
        titre: 'courante="a" : première étape',
        Rendu: () => (
          <Etapes libelle="Parcours" courante="a" etapes={PARCOURS} />
        ),
        code: '<Etapes etapes={ETAPES} courante="a" libelle="Parcours" />',
      },
      {
        titre: 'courante="b" : les étapes précédentes sont passées',
        Rendu: () => (
          <Etapes libelle="Parcours" courante="b" etapes={PARCOURS} />
        ),
        code: '<Etapes etapes={ETAPES} courante="b" libelle="Parcours" />',
      },
      {
        titre: 'courante="c" : dernière étape',
        Rendu: () => (
          <Etapes libelle="Parcours" courante="c" etapes={PARCOURS} />
        ),
        code: '<Etapes etapes={ETAPES} courante="c" libelle="Parcours" />',
      },
      {
        titre: 'Aucune étape atteinte : clé absente',
        Rendu: () => (
          <Etapes libelle="Parcours" courante="" etapes={PARCOURS} />
        ),
        code: '<Etapes etapes={ETAPES} courante="" libelle="Parcours" />',
      },
    ],
  },
  {
    cle: 'chronologie', nom: 'Chronologie',
    resume: 'Liste d’événements datés. Rend `null` si elle est vide.',
    props: [P('evenements', '[{ cle, date, titre, auteur, note }]',
      'Valeurs déjà formatées ; `cle` est unique, `note` facultative ; un '
      + 'tiret remplace l’auteur absent.')],
    exemples: [{
      titre: 'Historique',
      Rendu: () => (
        <Chronologie evenements={[
          { cle: 1, date: '08/10 10:05', titre: 'Transmise', auteur: 'jdoe',
            note: 'Envoyée au fournisseur.' },
          { cle: 2, date: '07/10 09:00', titre: 'Créée' },
        ]} />
      ),
      code: '<Chronologie evenements={evenements} />',
    }],
  },
  {
    cle: 'frise-etats', nom: 'FriseEtats',
    resume: 'Bande de segments colorés sur une période, avec axe du temps '
      + 'et infobulle au survol ou au focus. La couleur d’un segment vient '
      + 'de sa `couleur`, choisie par son nom parmi celles de `Pastille` '
      + '(vert, bleu, rouge, orange, ardoise, gris) ; `hachures` donne des '
      + 'hachures neutres, pour un état inconnu.',
    props: [
      P('debut · fin', 'epoch (s)', 'Bornes de la période.'),
      P('segments', '[{ cle, debut, fin, couleur, libelle, infobulle }]',
        'Contigus. `couleur` : voir ci-dessus ; `libelle` : nom accessible ; '
        + '`infobulle` : contenu au survol.'),
      P('libelle', 'string', 'Nom accessible.'),
      P('attenue', 'booléen', 'Rendu atténué.'),
    ],
    exemples: [{
      titre: 'Trois segments sur 24 h',
      Rendu: () => (
        <FriseEtats
          libelle="Exemple" debut={MAINTENANT - 86400} fin={MAINTENANT}
          segments={[
            { cle: 1, debut: MAINTENANT - 86400, fin: MAINTENANT - 50000,
              couleur: 'vert', libelle: 'actif', infobulle: 'Actif' },
            { cle: 2, debut: MAINTENANT - 50000, fin: MAINTENANT - 30000,
              couleur: 'hachures', libelle: 'inconnu',
              infobulle: 'Inconnu' },
            { cle: 3, debut: MAINTENANT - 30000, fin: MAINTENANT,
              couleur: 'orange', libelle: 'erreur',
              infobulle: 'Erreur de communication' },
          ]} />
      ),
      code: '<FriseEtats debut={d} fin={f} segments={segments} libelle="…" />',
    }],
  },
  {
    cle: 'icones', nom: 'Icônes',
    couvre: Object.keys(ui).filter((n) => /^Ico[A-Z]/.test(n)),
    resume: 'Icônes SVG en ligne, grille 20 × 20, décoratives (`aria-hidden`) : '
      + 'le sens passe par le texte voisin. Elles héritent de `currentColor`.',
    props: [P('className', 'string', 'Classe ajoutée à `.ico`.')],
    exemples: [{
      titre: 'Toutes les icônes exportées par `ui`',
      Rendu: Galerie,
      code: "import { IcoPlus } from '../../ui';",
    }],
  },
];

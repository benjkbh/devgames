import { useMemo, useState } from 'react';

import Bac from './Bac';
import { CATALOGUE, categories, dependants } from './catalogue';
import { ORDRE } from './fiches/arbre';
import {
  Banniere, Bouton, BoutonCopier, IcoAccessibilite, IcoBoussole, IcoBulle, IcoCarteRole,
  IcoCalques, IcoChevron, IcoChevronBas, IcoConteneur, IcoCrayon, IcoCrochet,
  IcoDashboard, IcoDe, IcoDrapeau, IcoEtincelle, IcoEtoile, IcoFiltre,
  IcoLecture, IcoManette, IcoOutils, IcoOuvrir, IcoPalette, IcoRecherche,
  IcoReglages, IcoTrophee, Page, Recherche, Section,
  cx,
} from '../../ui';
import './storybook.css';

// Racine du module : catalogue des composants réutilisables de `ui/`, rangés
// par catégorie, avec aperçus vivants, bac à sable, paramètres et extrait d'usage.
// Habillage « Thiercelieux » (village des Loups-Garous, la nuit) : bannière en
// scène nocturne, fiches présentées comme des cartes de rôle, tirées une à une.
// Aucune donnée serveur : le module n'appelle pas l'API.

const PAR_CLE = new Map(CATALOGUE.map((f) => [f.cle, f]));
const NB_BACS = CATALOGUE.filter((f) => f.bac).length;

// Icône de chaque catégorie (`fiches/arbre.js`, ORDRE).
const PICTOS = {
  'Mise en page': IcoDashboard,
  Conteneurs: IcoConteneur,
  Indicateurs: IcoTrophee,
  Parcours: IcoDrapeau,
  Actions: IcoManette,
  Formulaire: IcoCrayon,
  Filtres: IcoFiltre,
  Messages: IcoBulle,
  Fenêtres: IcoOuvrir,
  Navigation: IcoBoussole,
  Données: IcoDe,
  Jeux: IcoCarteRole,
  Accessibilité: IcoAccessibilite,
  Icônes: IcoEtoile,
  Hooks: IcoCrochet,
  Utilitaires: IcoOutils,
};
const picto = (categorie) => PICTOS[categorie] || IcoManette;

// Icône décorative (les icônes de `ui/` sont masquées aux lecteurs d'écran).
function Picto({ Icone, className }) {
  return <span className={cx('sb-picto', className)}><Icone /></span>;
}

function Parametres({ props }) {
  if (!props.length) {
    return <p className="dim sb-vide">Aucun paramètre : il se joue tel quel.</p>;
  }
  return (
    <div className="tableau-cadre">
      <table className="tableau sb-params">
        <caption className="sr">Paramètres</caption>
        <thead>
          <tr>
            <th scope="col">Paramètre</th>
            <th scope="col">Type</th>
            <th scope="col">Défaut</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.nom}>
              <td className="mono fort sb-param-nom">{p.nom}</td>
              <td className="mono dim">{p.type}</td>
              <td className="mono dim">{p.defaut || '-'}</td>
              <td>{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Exemple({ exemple }) {
  const { Rendu, titre, code } = exemple;
  return (
    <figure className="sb-exemple">
      <figcaption><Picto Icone={IcoEtincelle} />{titre}</figcaption>
      <div className="sb-apercu"><Rendu /></div>
      {code && (
        <div className="sb-code">
          <code>{code}</code>
          <BoutonCopier valeur={code} variante="fantome" />
        </div>
      )}
    </figure>
  );
}

// Composants utilisés par la fiche, et ceux qui l'utilisent.
function Liens({ entree, onChoisir }) {
  const utilisateurs = CATALOGUE.filter((f) => f.dependances.includes(entree.cle));
  const lien = (cle) => {
    const f = PAR_CLE.get(cle);
    if (!f) return null;
    return (
      <button key={cle} type="button" className="sb-lien-inline"
              onClick={() => onChoisir(cle)}>
        <Picto Icone={picto(f.groupe)} />
        {f.nom}
      </button>
    );
  };
  if (!entree.dependances.length && !utilisateurs.length) return null;
  return (
    <dl className="sb-liens">
      {entree.dependances.length > 0 && (
        <div>
          <dt>S’appuie sur</dt>
          <dd>{entree.dependances.map(lien)}</dd>
        </div>
      )}
      {utilisateurs.length > 0 && (
        <div>
          <dt>Utilisé par</dt>
          <dd>{utilisateurs.map((f) => lien(f.cle))}</dd>
        </div>
      )}
    </dl>
  );
}

function SousTitre({ Icone, children }) {
  return (
    <h3 className="sb-sous-titre"><Picto Icone={Icone} />{children}</h3>
  );
}

// Passage à la fiche voisine, dans l'ordre du catalogue, avec une jauge de
// progression.
function Progression({ entree, onChoisir }) {
  const rang = CATALOGUE.indexOf(entree);
  const prec = CATALOGUE[rang - 1];
  const suiv = CATALOGUE[rang + 1];
  const pourcent = Math.round(((rang + 1) / CATALOGUE.length) * 100);
  return (
    <nav className="sb-progression" aria-label="Fiche précédente ou suivante">
      <Bouton taille="s" variante="fantome" disabled={!prec}
              icone={<IcoChevron className="sb-retourne" />}
              titre={prec ? prec.nom : 'Début'}
              onClick={() => prec && onChoisir(prec.cle)} />
      <div className="sb-jauge" role="img"
           aria-label={`Fiche ${rang + 1} sur ${CATALOGUE.length}`}>
        <span className="sb-jauge-texte">
          {`Carte ${rang + 1} / ${CATALOGUE.length}`}
        </span>
        <span className="sb-jauge-piste">
          <span className="sb-jauge-remplie" style={{ width: `${pourcent}%` }} />
        </span>
      </div>
      <Bouton taille="s" variante="fantome" disabled={!suiv}
              iconeFin={<IcoChevron />}
              titre={suiv ? suiv.nom : 'Fin'}
              onClick={() => suiv && onChoisir(suiv.cle)} />
    </nav>
  );
}

function Fiche({ entree, onChoisir }) {
  return (
    <Section className="sb-fiche" aria-labelledby={`sb-fiche-${entree.cle}`}>
      <header className="sb-fiche-tete">
        <Picto className="sb-fiche-picto" Icone={picto(entree.groupe)} />
        <div className="sb-fiche-titres">
          <span className="sb-fiche-monde">{entree.groupe}</span>
          <h2 id={`sb-fiche-${entree.cle}`} className="sb-fiche-nom">{entree.nom}</h2>
        </div>
        {entree.bac && (
          <span className="sb-jouable"><IcoLecture />Jouable</span>
        )}
      </header>
      <div className="sb-fiche-corps">
        <p className="sb-resume">{entree.resume}</p>
        <Liens entree={entree} onChoisir={onChoisir} />
        {entree.bac && (
          <>
            <SousTitre Icone={IcoManette}>Bac à sable</SousTitre>
            <Bac key={entree.cle} bac={entree.bac} />
          </>
        )}
        {entree.exemples.length > 0 && (
          <SousTitre Icone={IcoPalette}>Exemples</SousTitre>
        )}
        {entree.exemples.map((e) => <Exemple key={e.titre} exemple={e} />)}
        <SousTitre Icone={IcoReglages}>Paramètres</SousTitre>
        <Parametres props={entree.props} />
      </div>
      <Progression entree={entree} onChoisir={onChoisir} />
    </Section>
  );
}

// Une entrée du menu. Le chevron déplie les composants qui en dépendent.
function Entree({ fiche, choix, onChoisir }) {
  const [ouvert, setOuvert] = useState(false);
  const utilisateurs = dependants(fiche.cle);
  return (
    <li>
      <div className="sb-entree">
        <button type="button"
                className={cx('sb-lien', fiche.cle === choix && 'actif')}
                aria-current={fiche.cle === choix ? 'page' : undefined}
                onClick={() => onChoisir(fiche.cle)}>
          <span className="sb-lien-nom">{fiche.nom}</span>
          {fiche.bac && (
            <span className="sb-bac-marque" title="Bac à sable">
              <IcoLecture />
              <span className="sr">bac à sable</span>
            </span>
          )}
        </button>
        {utilisateurs.length > 0 && (
          <Bouton variante="fantome" taille="s" className="sb-chevron"
                  libelle={`Composants qui dépendent de ${fiche.nom}`}
                  aria-expanded={ouvert}
                  icone={ouvert ? <IcoChevronBas /> : <IcoChevron />}
                  onClick={() => setOuvert(!ouvert)} />
        )}
      </div>
      {ouvert && (
        <ul className="sb-liste sb-liste-dependants">
          {utilisateurs.map((u) => (
            <li key={u.cle}>
              <button type="button"
                      className={cx('sb-lien', u.cle === choix && 'actif')}
                      onClick={() => onChoisir(u.cle)}>
                <span className="sb-lien-nom">{u.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Fiches qui correspondent à la recherche.
function filtrer(saisie) {
  const aiguille = saisie.trim().toLowerCase();
  if (!aiguille) return CATALOGUE;
  return CATALOGUE.filter((f) => `${f.nom} ${f.groupe} ${f.resume} `
    .concat(f.props.map((p) => p.nom).join(' '))
    .toLowerCase().includes(aiguille));
}

// Hooks et utilitaires sont des modules `.js` ; tout le reste, des composants
// `.jsx`. Le menu les range en deux sections, puis par catégorie.
const GROUPES_JS = ['Hooks', 'Utilitaires'];
const SECTIONS = [
  {
    cle: 'jsx', titre: 'Composants', extension: '.jsx',
    garde: (c) => !GROUPES_JS.includes(c.nom),
  },
  {
    cle: 'js', titre: 'Hooks et utilitaires', extension: '.js',
    garde: (c) => GROUPES_JS.includes(c.nom),
  },
];

// Bandeau d'accueil : titre, compteurs et tirage d'une fiche au hasard.
function Accroche({ onChoisir, choix }) {
  const auHasard = () => {
    const autres = CATALOGUE.filter((f) => f.cle !== choix);
    onChoisir(autres[Math.floor(Math.random() * autres.length)].cle);
  };
  return (
    <Banniere
      surtitre="Storybook"
      titre="Le grimoire des composants"
      description={'La nuit tombe sur le village. Choisis un composant, règle '
        + 'ses paramètres dans le bac à sable et copie le code. Le chevron '
        + 'd’un composant déplie ceux qui en dépendent.'}
      actions={(
        <Bouton variante="principal" taille="l" onClick={auHasard}
                icone={<IcoCarteRole />} titre="Tirer une carte au hasard" />
      )}
      compteurs={[
        { icone: <IcoCarteRole />, valeur: CATALOGUE.length, libelle: 'composants' },
        { icone: <IcoCalques />, valeur: ORDRE.length, libelle: 'catégories' },
        { icone: <IcoManette />, valeur: NB_BACS, libelle: 'bacs à sable' },
      ]} />
  );
}

export default function Storybook() {
  const [choix, setChoix] = useState(CATALOGUE[0].cle);
  const [saisie, setSaisie] = useState('');

  const visibles = useMemo(() => filtrer(saisie), [saisie]);
  const sections = useMemo(() => {
    const parCategorie = categories(visibles);
    return SECTIONS.map((s) => ({
      ...s, categories: parCategorie.filter(s.garde),
    })).filter((s) => s.categories.length);
  }, [visibles]);
  const entree = PAR_CLE.get(choix) || CATALOGUE[0];

  return (
    <Page className="sb-page">
      <Accroche choix={choix} onChoisir={setChoix} />
      <div className="sb-mise-en-page">
        <nav className="sb-menu" aria-label="Composants">
          <Recherche libelle="Rechercher un composant" taille="s"
                     value={saisie} placeholder="composant ou paramètre…"
                     onChange={(e) => setSaisie(e.target.value)} />
          {sections.map((s) => (
            <section key={s.cle}>
              <h2 className="sb-section-titre">
                {s.titre}
                <span className="sb-extension">{s.extension}</span>
              </h2>
              {s.categories.map((c) => (
                <div key={c.nom} className="sb-monde">
                  <h3 className="sb-categorie">
                    <Picto Icone={picto(c.nom)} />
                    {c.nom}
                    <span className="sb-categorie-compte">{c.fiches.length}</span>
                  </h3>
                  <ul className="sb-liste">
                    {c.fiches.map((f) => (
                      <Entree key={f.cle} fiche={f} choix={choix}
                              onChoisir={setChoix} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
          {visibles.length === 0 && (
            <p className="dim sb-vide">
              <Picto Icone={IcoRecherche} />
              Aucun résultat.
            </p>
          )}
          <p className="dim sb-total">
            {`${visibles.length} sur ${CATALOGUE.length} composants`}
          </p>
        </nav>
        <div className="sb-contenu">
          <Fiche key={entree.cle} entree={entree} onChoisir={setChoix} />
        </div>
      </div>
    </Page>
  );
}

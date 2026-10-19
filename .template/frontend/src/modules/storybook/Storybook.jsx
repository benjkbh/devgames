import { useMemo, useState } from 'react';

import Bac from './Bac';
import { CATALOGUE, categories, dependants } from './catalogue';
import {
  Badge, Bouton, BoutonCopier, IcoChevron, IcoChevronBas, Page, Recherche,
  Section, cx,
} from '../../ui';
import './storybook.css';

// Racine du module : catalogue des composants réutilisables de `ui/`, rangés
// par catégorie, avec aperçus vivants, bac à sable, paramètres et extrait d'usage.
// Aucune donnée serveur : le module n'appelle pas l'API.

const PAR_CLE = new Map(CATALOGUE.map((f) => [f.cle, f]));

function Parametres({ props }) {
  if (!props.length) return null;
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
              <td className="mono fort">{p.nom}</td>
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
      <figcaption>{titre}</figcaption>
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

function Fiche({ entree, onChoisir }) {
  return (
    <Section titre={entree.nom} suffixe={entree.groupe} className="sb-fiche">
      <p className="sb-resume">{entree.resume}</p>
      <Liens entree={entree} onChoisir={onChoisir} />
      {entree.bac && (
        <>
          <h3 className="sb-sous-titre">Bac à sable</h3>
          <Bac key={entree.cle} bac={entree.bac} />
        </>
      )}
      {entree.exemples.length > 0 && (
        <h3 className="sb-sous-titre">Exemples</h3>
      )}
      {entree.exemples.map((e) => <Exemple key={e.titre} exemple={e} />)}
      <h3 className="sb-sous-titre">Paramètres</h3>
      <Parametres props={entree.props} />
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
          {fiche.nom}
          {fiche.bac && <Badge className="sb-bac-marque" titre="bac" />}
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
                {u.nom}
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
    cle: 'jsx', titre: 'Composants (.jsx)',
    garde: (c) => !GROUPES_JS.includes(c.nom),
  },
  {
    cle: 'js', titre: 'Hooks et utilitaires (.js)',
    garde: (c) => GROUPES_JS.includes(c.nom),
  },
];

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
    <Page titre="Composants"
          description={'Composants réutilisables de l’interface, rangés par '
            + 'catégorie. Le chevron d’un composant déplie ceux qui en '
            + 'dépendent.'}>
      <div className="sb-mise-en-page">
        <nav className="sb-menu" aria-label="Composants">
          <Recherche libelle="Rechercher un composant" taille="s"
                     value={saisie} placeholder="composant ou paramètre…"
                     onChange={(e) => setSaisie(e.target.value)} />
          {sections.map((s) => (
            <section key={s.cle}>
              <h2 className="sb-section-titre">{s.titre}</h2>
              {s.categories.map((c) => (
                <div key={c.nom}>
                  <h3 className="sb-categorie">{c.nom}</h3>
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
          {visibles.length === 0 && <p className="dim">Aucun résultat.</p>}
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

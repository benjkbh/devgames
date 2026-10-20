import { Fragment, useCallback } from 'react';

import { cx } from '../classes';
import { Bouton } from '../primitives/Bouton';
import { BarreActions } from '../formulaire/Champ';
import { useTri } from '../hooks/tri';
import {
  dateCourte, dateHeureCourte, dateJour, dateLocaleComplete, depuis, estVide,
  heureLocale,
} from '../outils/format';
import { BoutonOuvrir, Tableau, Valeur } from './Tableau';
import './Tableau.css';

// Tableau piloté par ses données : chaque colonne dit ce qu'elle contient
// (`type` et `valeur`), le composant en tire le format, l'alignement, la coupe
// avec infobulle, le tiret des valeurs absentes et le tri. L'en-tête et les
// cellules viennent de la même déclaration : ils ne se désaccordent pas.
//
// Un type fixe la mise en forme d'une valeur brute :
//   texte        coupé si long, texte complet en infobulle (défaut) ;
//   mono         comme `texte`, en police à chasse fixe ;
//   nombre       aligné à droite, chiffres tabulaires ;
//   date         chaîne `AAAA-MM-JJ` -> « 02/11/2026 » ;
//   epoch        epoch Unix -> date seule ;
//   horodatage   epoch Unix -> « 16/09 09:21:43 », date complète en infobulle ;
//   heure        epoch Unix -> heure locale, date complète en infobulle ;
//   depuis       epoch Unix -> durée écoulée (« 12 min »).
const TYPES = {
  texte: { coupe: true },
  mono: { coupe: true, classe: 'mono' },
  nombre: { classe: 'col-nombre' },
  date: { classe: 'nombre', formate: dateJour },
  epoch: { classe: 'nombre', formate: dateCourte },
  horodatage: {
    classe: 'nombre', formate: dateHeureCourte, infobulle: dateLocaleComplete,
  },
  heure: {
    classe: 'nombre', formate: heureLocale, infobulle: dateLocaleComplete,
  },
  depuis: { classe: 'nombre', formate: depuis },
};

// Cellule d'un tableau. Avec `type` et `valeur`, le contenu est mis en forme ;
// avec des enfants, ils prennent la place du contenu (le type ne donne alors
// que sa classe). `coupe`, `fort`, `dim` : texte coupé, gras, atténué ;
// `titre` : infobulle (celle du type par défaut).
export function Cellule({
  type, valeur, coupe, fort, dim, titre, className, children,
}) {
  const t = (type && TYPES[type]) || {};
  const coupee = coupe === undefined ? Boolean(t.coupe) : coupe;
  const vide = estVide(valeur);
  let contenu = children;
  let infobulle = titre;
  if (contenu === undefined) {
    contenu = vide ? <Valeur /> : (t.formate ? t.formate(valeur) : valeur);
    if (infobulle === undefined && !vide) {
      if (t.infobulle) infobulle = t.infobulle(valeur);
      else if (t.coupe && coupee && typeof valeur === 'string') {
        infobulle = valeur;
      }
    }
  }
  return (
    <td className={cx(t.classe, coupee && 'coupe', fort && 'fort', dim && 'dim',
      className)} title={infobulle || undefined}>
      {contenu}
    </td>
  );
}

// Ligne d'un tableau, pour rendre soi-même une ligne (`ligne` de
// `TableauDonnees`). `choisie` : ligne surlignée.
export function Ligne({
  choisie, className, children, ...reste
}) {
  return (
    <tr className={cx(choisie && 'choisie', className)} {...reste}>
      {children}
    </tr>
  );
}

// Boutons d'une ligne, un par action (`visible: false` la retire). Une
// action reprend les props de `Bouton` : `titre` (texte) ou `libelle`
// (bouton-icône), `icone`, `variante`, `couleur`, `onClick`, `disabled`…
function BoutonsLigne({ actions, ligne, className, aligne }) {
  const liste = actions.de(ligne).filter((a) => a && a.visible !== false);
  if (liste.length === 0) return null;
  const boutons = liste.map(({ visible, cle, ...a }) => (
    <Bouton key={cle || a.titre || a.libelle} taille="s" {...a} />
  ));
  if (aligne === 'fin') {
    return (
      <BarreActions alignement="fin" className={className}>
        {boutons}
      </BarreActions>
    );
  }
  return <span className={cx('actions-ligne', className)}>{boutons}</span>;
}

// Cases à cocher d'une sélection (`useEnsemble`).
function Selection({ selection, id, ligne }) {
  const libelle = selection.libelle ? selection.libelle(ligne) : 'Choisir';
  return (
    <input type="checkbox" aria-label={libelle}
           checked={selection.cles.has(id)}
           onChange={() => selection.basculer(id)} />
  );
}

// Une colonne se trie par défaut, dès qu'elle a de quoi trier (`tri` ou
// `valeur`) ; `triable: false` retire le tri. Une colonne `rendu` sans `tri`
// ni `valeur` ne se trie pas : donner un `tri`, ou `triable: false`.
const triable = (c) => c.triable !== false && !c.sr
  && Boolean(c.tri || c.valeur);

// Tableau de données.
//
// `lignes`, `colonnes`, `cle` : les lignes, leurs colonnes, et l'identifiant
//   d'une ligne (nom de champ ou fonction ; `id` par défaut).
// `colonnes` : `[{ cle, libelle, type, valeur, rendu, tri, triable, largeur,
//   coupe, fort, dim, sr, aide, titre, className, classeEntete,
//   classeCellule }]`.
//   valeur(ligne)  la valeur brute, mise en forme selon `type` ;
//   rendu(ligne)   contenu libre de la cellule (prend la place de `valeur`) ;
//   tri(ligne)     valeur triée, `valeur` par défaut ; toute colonne se
//                  trie au clic sur son en-tête, `triable: false` l'interdit ;
//   aide           `{ titre, libelle, contenu }` : bouton « ? » à droite du
//                  titre de colonne, qui ouvre une popup ;
//   titre(ligne)   infobulle ; classeCellule(ligne) : classe de la cellule.
// `ouvrir` : colonne de tête qui ouvre le détail d'une ligne, `{ libelle(l),
//   ouvert(l), onOuvrir(l), titre, entete, largeur }`.
// `actions` : boutons par ligne, `{ de(l), position, entete, largeur,
//   className }`. `de` rend une liste de props de `Bouton`. `position` :
//   `fin` (défaut) ou `debut`, après la colonne d'ouverture.
// `selection` : cases à cocher, `{ cles, basculer, remplacer, libelle(l),
//   tout }` (`useEnsemble` fournit les trois premiers). `tout` ajoute la case
//   « tout choisir » de l'en-tête.
// `detail(l)` : contenu d'une ligne enfant sous la ligne (ou rien) ;
//   `classeDetail` : sa classe.
// `choisie(l)` : ligne surlignée (celle de `ouvrir` par défaut) ;
//   `classeLigne(l)` : classe de la ligne.
// `ligne(l)` : rend la ligne entière (`Ligne` et `Cellule`) ; l'ouverture,
//   les actions, la sélection et le détail sont alors à la charge de l'appelant.
// `vide` : contenu rendu à la place du tableau quand il n'y a aucune ligne.
// `departage(a, b)` : ordre des égalités du tri ; sans tri choisi, `lignes`
//   garde son ordre.
// `legende`, `fixe`, `collant`, `niveau`, `className` : comme `Tableau`.
export function TableauDonnees({
  lignes = [], colonnes, cle = 'id', legende, fixe, collant, niveau,
  className, ouvrir, actions, selection, detail, classeDetail, choisie,
  classeLigne, ligne, vide, departage,
}) {
  const identifiant = typeof cle === 'function' ? cle : (l) => l[cle];
  const valeurTri = useCallback((l, k) => {
    const c = colonnes.find((x) => x.cle === k);
    const f = c && (c.tri || c.valeur);
    return f ? f(l) : undefined;
  }, [colonnes]);
  const { tri, basculer, lignes: affichees } = useTri(lignes, valeurTri,
    departage);

  if (vide !== undefined && lignes.length === 0) return vide;

  const debut = actions && actions.position === 'debut';
  const entetes = [];
  if (selection) {
    entetes.push({
      cle: '_selection', largeur: '44px',
      sr: !selection.tout,
      libelle: selection.tout ? (
        <input type="checkbox" aria-label="Tout choisir"
               checked={lignes.length > 0
                 && lignes.every((l) => selection.cles.has(identifiant(l)))}
               onChange={() => selection.remplacer(
                 lignes.every((l) => selection.cles.has(identifiant(l)))
                   ? [] : lignes.map(identifiant),
               )} />
      ) : 'Choisir',
    });
  }
  if (ouvrir) {
    entetes.push({
      cle: '_ouvrir', libelle: ouvrir.entete || 'Ouvrir', sr: true,
      largeur: ouvrir.largeur || '52px',
    });
  }
  const colonneActions = actions && {
    cle: '_actions', libelle: actions.entete || 'Actions', sr: true,
    largeur: actions.largeur,
  };
  if (debut) entetes.push(colonneActions);
  colonnes.forEach((c) => entetes.push({
    cle: c.cle, libelle: c.libelle, largeur: c.largeur, sr: c.sr,
    nombre: c.type === 'nombre', triable: triable(c),
    className: c.classeEntete, aide: c.aide,
  }));
  if (actions && !debut) entetes.push(colonneActions);

  const surlignee = (l) => (choisie ? choisie(l)
    : Boolean(ouvrir && ouvrir.ouvert && ouvrir.ouvert(l)));

  const rendre = (l) => {
    const id = identifiant(l);
    return (
      <tr className={cx(surlignee(l) && 'choisie',
        classeLigne && classeLigne(l))}
          aria-current={choisie && choisie(l) ? 'true' : undefined}>
        {selection && (
          <td className="col-selection">
            <Selection selection={selection} id={id} ligne={l} />
          </td>
        )}
        {ouvrir && (
          <td>
            <BoutonOuvrir libelle={ouvrir.libelle(l)}
                          titre={ouvrir.titre}
                          ouvert={ouvrir.ouvert ? ouvrir.ouvert(l) : undefined}
                          onClick={() => ouvrir.onOuvrir(l)} />
          </td>
        )}
        {debut && (
          <td className="col-actions">
            <BoutonsLigne actions={actions} ligne={l}
                          className={actions.className} />
          </td>
        )}
        {colonnes.map((c) => (
          <Cellule
            key={c.cle}
            type={c.type || (c.rendu ? undefined : 'texte')}
            valeur={c.valeur ? c.valeur(l) : undefined}
            coupe={c.coupe}
            fort={c.fort}
            dim={c.dim}
            titre={c.titre ? c.titre(l) : undefined}
            className={cx(c.className, c.classeCellule && c.classeCellule(l))}
          >
            {c.rendu ? c.rendu(l) : undefined}
          </Cellule>
        ))}
        {actions && !debut && (
          <td className="col-actions">
            <BoutonsLigne actions={actions} ligne={l} aligne="fin"
                          className={actions.className} />
          </td>
        )}
      </tr>
    );
  };

  return (
    <Tableau legende={legende} colonnes={entetes} fixe={fixe} collant={collant}
             niveau={niveau} className={className} tri={tri} onTri={basculer}>
      <tbody>
        {affichees.map((l) => {
          const sous = !ligne && detail ? detail(l) : null;
          return (
            <Fragment key={identifiant(l)}>
              {ligne ? ligne(l) : rendre(l)}
              {sous ? (
                <tr className={cx('ligne-detail', classeDetail)}>
                  <td colSpan={entetes.length}>{sous}</td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </Tableau>
  );
}

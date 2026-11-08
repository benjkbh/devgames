import { useEffect, useState } from 'react';

import {
  Badge, Bouton, Carte, Journal, cx,
} from '@ui';
import {
  garder, jeter, piocher, prendre, retourner, suivante,
} from './api';
import { CarteGivre } from './decor';

// Le chalet de Givre : au centre la pioche et la défausse, autour la grille
// de chaque joueur (3 lignes, 4 colonnes). Au départ, chacun retourne deux
// cartes. Au joueur au trait de piocher ou de prendre la défausse, puis de
// choisir une case de sa grille. Entre deux manches, le bilan. À droite, les
// scores vers 100 (le plus petit gagne) et le journal.

// Ce que la case `i` de ma grille fait quand on la touche, ou null.
function actionCase(p, moi, choixDefausse, valeur) {
  if (p.phase === 'depart') {
    const visibles = moi.grille.filter((v) => v !== null && v !== 'cachee').length;
    return valeur === 'cachee' && visibles < 2 ? 'retourner' : null;
  }
  if (p.phase !== 'jeu' || p.tour !== moi.nom || valeur === null) return null;
  if (p.doit_retourner) return valeur === 'cachee' ? 'retourner' : null;
  if (p.main !== null) return 'garder';
  if (choixDefausse) return 'prendre';
  return null;
}

function Grille({
  joueur, partie: p, moi, choixDefausse, onCase, dernier,
}) {
  const colonnes = Array.from({ length: p.colonnes }, (_, c) => (
    joueur.grille.slice(c * p.lignes, (c + 1) * p.lignes)));
  return (
    <div className="gv-grille" role="group" aria-label={`Grille de ${joueur.nom}`}>
      {colonnes.map((col, c) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={c} className="gv-colonne">
          {col.map((v, r) => {
            const i = c * p.lignes + r;
            const carte = (
              <CarteGivre valeur={v} cachee={v === 'cachee'} fondue={v === null}
                          className={cx(dernier === i && 'recente')} />
            );
            const action = moi && actionCase(p, joueur, choixDefausse, v);
            if (!action) return <span key={i} className="gv-case">{carte}</span>;
            const libelles = {
              retourner: 'Retourner cette carte',
              garder: 'Poser la carte piochée ici',
              prendre: 'Poser la carte de la défausse ici',
            };
            return (
              <button key={i} type="button" className={cx('gv-case', 'jouable', action)}
                      aria-label={`${libelles[action]} (colonne ${c + 1}, ligne ${r + 1})`}
                      onClick={() => onCase(action, i)}>
                {carte}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Joueur({
  joueur, partie: p, table, choixDefausse, onCase,
}) {
  const moi = joueur.nom === table.moi && table.membre;
  const bilan = p.bilan && p.bilan[joueur.nom];
  const dernier = p.dernier_coup && p.dernier_coup.joueur === joueur.nom
    ? p.dernier_coup.place : null;
  let etat = null;
  if (p.phase === 'depart') {
    etat = joueur.pret ? <Badge couleur="vert" titre="Prêt" /> : <Badge titre="Retourne…" />;
  } else if (p.finisseur === joueur.nom) {
    etat = <Badge couleur="or" titre="A tout retourné" />;
  } else if (p.phase === 'jeu' && p.finisseur && p.derniers.includes(joueur.nom)) {
    etat = <Badge couleur="orange" titre="Dernier tour" />;
  }
  return (
    <li className={cx('gv-joueur', p.tour === joueur.nom && 'au-trait', moi && 'moi')}>
      <div className="gv-joueur-tete">
        <span className="gv-joueur-nom">
          {joueur.nom}
          {moi && <span className="dim"> (vous)</span>}
        </span>
        {etat}
        <span className="gv-joueur-points" title="Total des cartes visibles">
          {bilan ? `${bilan.points > 0 ? '+' : ''}${bilan.points}${bilan.double ? ' (×2)' : ''}`
            : `${joueur.visible} visible${Math.abs(joueur.visible) > 1 ? 's' : ''}`}
        </span>
      </div>
      <Grille joueur={joueur} partie={p} moi={moi} choixDefausse={choixDefausse}
              onCase={onCase} dernier={dernier} />
    </li>
  );
}

function Consigne({
  partie: p, table, moi, choixDefausse,
}) {
  if (p.gagnant) return `${p.gagnant} gagne la partie !`;
  if (p.phase === 'bilan') return `Fin de la manche ${p.manche}`;
  if (p.phase === 'depart') {
    if (moi && !moi.pret) return 'Retournez deux cartes de votre grille.';
    return 'Chacun retourne deux cartes…';
  }
  if (p.tour !== table.moi) {
    return p.finisseur ? `Dernier tour : ${p.tour} joue…` : `${p.tour} joue…`;
  }
  if (p.doit_retourner) return 'Retournez une carte cachée de votre grille.';
  if (p.main !== null) return 'Posez la carte piochée dans votre grille, ou jetez-la.';
  if (choixDefausse) return 'Choisissez la case où poser la carte de la défausse.';
  return 'À vous : piochez, ou prenez la carte de la défausse.';
}

export default function Plateau({ table, onAction }) {
  const p = table.partie;
  const code = table.code;
  const moi = table.membre ? p.joueurs.find((j) => j.nom === table.moi) : null;
  const monTour = Boolean(moi) && p.phase === 'jeu' && p.tour === table.moi && !p.gagnant;
  const [choixDefausse, setChoixDefausse] = useState(false);
  // Le choix de la défausse ne survit pas à un changement de tour.
  useEffect(() => {
    if (!monTour || p.main !== null || p.doit_retourner) setChoixDefausse(false);
  }, [monTour, p.main, p.doit_retourner]);

  const peutPrendre = monTour && p.main === null && !p.doit_retourner;
  const onCase = (action, i) => {
    if (action === 'retourner') onAction(() => retourner(code, i));
    else if (action === 'garder') onAction(() => garder(code, i));
    else if (action === 'prendre') {
      setChoixDefausse(false);
      onAction(() => prendre(code, i));
    }
  };
  const evenements = p.journal.slice().reverse().map((ligne, i) => ({
    cle: `${p.journal.length - i}-${ligne}`, contenu: ligne, ton: i === 0 ? 'actif' : undefined,
  }));
  const classement = [...p.joueurs].sort((a, b) => a.score - b.score);
  // Ma grille d'abord, puis les autres dans l'ordre de jeu.
  const joueurs = moi ? [moi, ...p.joueurs.filter((j) => j !== moi)] : p.joueurs;

  return (
    <div className="tbl-jeu">
      <section className="gv-chalet-table" aria-label="La table du chalet">
        <p className={cx('gv-message', monTour && 'vous')} role="status">
          <Consigne partie={p} table={table} moi={moi} choixDefausse={choixDefausse} />
        </p>
        <div className="gv-centre">
          <div className="gv-tas">
            <span className="gv-tas-titre">{`Pioche · ${p.pioche}`}</span>
            {peutPrendre ? (
              <button type="button" className="gv-tas-bouton" aria-label="Piocher une carte"
                      onClick={() => onAction(() => piocher(code))}>
                <CarteGivre cachee />
              </button>
            ) : <CarteGivre cachee />}
          </div>
          {p.main !== null && (
            <div className="gv-tas gv-main">
              <span className="gv-tas-titre">{monTour ? 'Votre carte' : `Carte de ${p.tour}`}</span>
              <CarteGivre valeur={p.main} className="tiree" />
              {monTour && (
                <Bouton taille="s" titre="Jeter et retourner"
                        onClick={() => onAction(() => jeter(code))} />
              )}
            </div>
          )}
          <div className="gv-tas">
            <span className="gv-tas-titre">Défausse</span>
            {p.defausse === null && <CarteGivre fondue />}
            {p.defausse !== null && peutPrendre && (
              <button type="button" className={cx('gv-tas-bouton', choixDefausse && 'choisie')}
                      aria-pressed={choixDefausse}
                      aria-label={`Prendre le ${p.defausse} de la défausse`}
                      onClick={() => setChoixDefausse((c) => !c)}>
                <CarteGivre valeur={p.defausse} />
              </button>
            )}
            {p.defausse !== null && !peutPrendre && <CarteGivre valeur={p.defausse} />}
          </div>
        </div>
        {p.phase === 'bilan' && !p.gagnant && table.membre && (
          <div className="gv-bilan">
            <p>
              {p.finisseur ? `${p.finisseur} a fini la manche. ` : ''}
              Les colonnes identiques ont fondu, les points sont comptés.
            </p>
            <Bouton variante="principal" titre="Manche suivante"
                    onClick={() => onAction(() => suivante(code))} />
          </div>
        )}
        <ul className="gv-joueurs">
          {joueurs.map((j) => (
            <Joueur key={j.nom} joueur={j} partie={p} table={table}
                    choixDefausse={choixDefausse} onCase={onCase} />
          ))}
        </ul>
      </section>
      <aside className="tbl-jeu-cote" aria-label="Scores et journal">
        <Carte titre={`Scores (manche ${p.manche})`}>
          <p className="dim gv-objectif">{`La partie s’arrête à ${p.objectif} points : le plus petit total gagne.`}</p>
          <ol className="tbl-scores">
            {classement.map((j) => (
              <li key={j.nom} className={cx(p.tour === j.nom && 'courant')}>
                <span className="nom">{j.nom}</span>
                <span className="valeur">{`${j.score} pts`}</span>
              </li>
            ))}
          </ol>
        </Carte>
        <Carte titre="Journal">
          <Journal evenements={evenements} libelle="Journal de la manche" />
        </Carte>
      </aside>
    </div>
  );
}

import {
  Bouton, Carte, Journal, cx,
} from '@ui';
import { demander, retourner } from './api';
import { CarteTrio } from './decor';

// Le ciel de l'observatoire : au centre, les astres cachés ; autour, la main
// de chaque joueur (cachée, sauf les cartes révélées ce tour-ci) et ses
// trios. Au joueur au trait de révéler, une à une, la plus petite ou la plus
// grande carte d'un joueur, ou un astre du centre. À droite, les trios et le
// journal.

function Main({
  joueur, partie: p, table, peutJouer, onAction,
}) {
  const moi = joueur.nom === table.moi;
  const valeurs = moi && p.main ? p.main : null;
  const code = table.code;
  const cachees = joueur.cartes - Object.keys(joueur.revelees).length;
  return (
    <li className={cx('tr-joueur', p.tour === joueur.nom && 'au-trait', moi && 'moi')}>
      <div className="tr-joueur-tete">
        <span className="tr-joueur-nom">
          {joueur.nom}
          {moi && <span className="dim"> (vous)</span>}
        </span>
        <span className="tr-trios" aria-label={`Trios : ${joueur.trios.join(', ') || 'aucun'}`}>
          {joueur.trios.map((v, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className="tr-trio">{`★ ${v}`}</span>
          ))}
        </span>
      </div>
      <div className="tr-main">
        {Array.from({ length: joueur.cartes }, (_, i) => {
          const revelee = joueur.revelees[String(i)];
          if (revelee !== undefined) {
            return <CarteTrio key={i} valeur={revelee} className="revelee" />;
          }
          return valeurs
            ? <CarteTrio key={i} valeur={valeurs[i]} className="a-moi" />
            : <CarteTrio key={i} cachee />;
        })}
      </div>
      {peutJouer && cachees > 0 && (
        <div className="tr-demandes">
          <Bouton taille="s" titre="Plus petite"
                  onClick={() => onAction(() => demander(code, joueur.nom, 'min'))} />
          <Bouton taille="s" titre="Plus grande"
                  onClick={() => onAction(() => demander(code, joueur.nom, 'max'))} />
        </div>
      )}
    </li>
  );
}

export default function Plateau({ table, onAction }) {
  const p = table.partie;
  const monTour = table.membre && p.tour === table.moi && !p.gagnant;
  const code = table.code;
  let message;
  if (p.gagnant) message = `${p.gagnant} gagne la partie !`;
  else if (monTour) message = 'À vous : trouvez un trio.';
  else message = `${p.tour} cherche un trio…`;
  const evenements = p.journal.slice().reverse().map((ligne, i) => ({
    cle: `${p.journal.length - i}-${ligne}`, contenu: ligne, ton: i === 0 ? 'actif' : undefined,
  }));
  const classement = [...p.joueurs].sort((a, b) => b.trios.length - a.trios.length);

  return (
    <div className="tbl-jeu">
      <section className="tr-ciel" aria-label="Le ciel">
        <p className={cx('tr-message', monTour && 'vous')}>{message}</p>
        {p.revelees.length > 0 && (
          <p className="tr-essai">
            {'Révélées : '}
            {p.revelees.map((r, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <CarteTrio key={i} valeur={r.valeur} petite />
            ))}
          </p>
        )}
        {p.essai && (
          <p className="tr-essai rate">
            {'Raté : '}
            {p.essai.map((r, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <CarteTrio key={i} valeur={r.valeur} petite />
            ))}
          </p>
        )}
        <div className="tr-centre" aria-label="Les astres du centre">
          {p.centre.map((v, i) => {
            if (v === null) return <span key={i} className="tr-vide" aria-hidden="true" />;
            if (v > 0) return <CarteTrio key={i} valeur={v} className="revelee" />;
            return monTour ? (
              <button key={i} type="button" className="tr-retourner"
                      aria-label={`Retourner l’astre ${i + 1}`}
                      onClick={() => onAction(() => retourner(code, i))}>
                <CarteTrio cachee />
              </button>
            ) : <CarteTrio key={i} cachee />;
          })}
        </div>
        <ul className="tr-joueurs">
          {p.joueurs.map((j) => (
            <Main key={j.nom} joueur={j} partie={p} table={table}
                  peutJouer={monTour} onAction={onAction} />
          ))}
        </ul>
      </section>
      <aside className="tbl-jeu-cote" aria-label="Trios et journal">
        <Carte titre={`Trios (${p.objectif} pour gagner, ou le 7)`}>
          <ol className="tbl-scores">
            {classement.map((j) => (
              <li key={j.nom} className={cx(p.tour === j.nom && 'courant')}>
                <span className="nom">{j.nom}</span>
                <span className="valeur">{j.trios.length ? j.trios.join(' · ') : '—'}</span>
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

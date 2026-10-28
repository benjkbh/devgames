import { cx } from '@ui';
import { CAMPS, ChauveSouris, SceauRole } from './decor';

// La galerie des portraits : les 25 cartes, en 5 × 5, chacune un cadre doré
// et une plaque portant son mot. Une carte révélée montre son portrait
// (Vampire, Chasseur, domestique ou le Comte). L'oracle voit le grimoire : la
// teinte de chaque carte cachée ; à la fin de la manche, tout le monde la voit.
//
// Les agents du camp au trait (`peutAgir`) marquent une carte d'un clic
// (suggestion vue de tous) ; une carte qu'ils ont marquée porte le bouton
// « Révéler ».

const NOMS_ROLES = {
  sang: 'portrait des Vampires',
  argent: 'portrait des Chasseurs',
  domestique: 'domestique',
  comte: 'le Comte',
};

// Vols de chauves-souris au-dessus de la galerie.
const VOLS = [
  { top: '6%', animationDelay: '0s', animationDuration: '22s' },
  { top: '18%', animationDelay: '-9s', animationDuration: '27s' },
  { top: '2%', animationDelay: '-16s', animationDuration: '31s' },
];

export function Vols() {
  return (
    <div className="cn-vols" aria-hidden="true">
      {VOLS.map((style) => <ChauveSouris key={style.top} style={style} />)}
    </div>
  );
}

function Portrait({
  carte: c, index, moi, peutAgir, onMarquer, onReveler,
}) {
  const role = c.role;
  const parMoi = c.marques.includes(moi);
  const autres = c.marques.filter((n) => n !== moi);
  const etiquette = [
    c.mot,
    role && `: ${NOMS_ROLES[role]}`,
    c.revelee ? ', révélée' : '',
    c.revelee && c.par ? ` par ${c.par}` : '',
    c.marques.length ? `, marquée par ${c.marques.join(', ')}` : '',
  ].filter(Boolean).join('');
  const actif = peutAgir && !c.revelee;
  return (
    <li className={cx('cn-portrait', role && `cn-role-${role}`,
      c.revelee ? 'revele' : role && 'grimoire', parMoi && 'marque',
      actif && 'actif')}>
      <button type="button" className="cn-portrait-cadre"
              disabled={!actif} aria-label={etiquette}
              aria-pressed={actif ? parMoi : undefined}
              title={c.revelee && c.par ? `Révélée par ${c.par}` : undefined}
              onClick={() => onMarquer(index)}>
        <span className="cn-portrait-toile">
          {role && <SceauRole role={role} className="cn-portrait-sceau" />}
        </span>
        <span className="cn-portrait-plaque">
          <span className="cn-portrait-mot">{c.mot}</span>
        </span>
      </button>
      {c.marques.length > 0 && !c.revelee && (
        <span className="cn-portrait-marques" aria-hidden="true">
          {parMoi && <span className="moi">vous</span>}
          {autres.map((n) => <span key={n}>{n}</span>)}
        </span>
      )}
      {actif && parMoi && (
        <button type="button" className="cn-reveler"
                onClick={() => onReveler(index)}>
          Révéler
        </button>
      )}
    </li>
  );
}

export function Galerie({
  partie: p, moi, peutAgir, onMarquer, onReveler,
}) {
  return (
    <ol className={cx('cn-galerie', peutAgir && 'a-vous')} aria-label="Galerie des portraits">
      {p.cartes.map((c, i) => (
        // Les mots sont uniques dans une manche.
        <Portrait key={c.mot} carte={c} index={i} moi={moi}
                  peutAgir={peutAgir} onMarquer={onMarquer} onReveler={onReveler} />
      ))}
    </ol>
  );
}

// Plaque d'un camp : sceau, portraits restants et joueurs (l'oracle en tête).
export function Plaque({
  camp, partie: p, moi, presents,
}) {
  const { nom, Sceau } = CAMPS[camp];
  const oracle = p.oracles[camp];
  const joueurs = [oracle, ...p.equipes[camp].filter((j) => j !== oracle)];
  const actif = p.equipe === camp;
  const gagnant = p.gagnant === camp;
  return (
    <section className={cx('cn-plaque', `cn-plaque-${camp}`, actif && 'actif',
      gagnant && 'gagnant')} aria-label={`Camp des ${nom}`}>
      <div className="cn-plaque-tete">
        <Sceau className="cn-plaque-sceau" />
        <div className="cn-plaque-titre">
          <span className="cn-plaque-nom">{nom}</span>
          <span className="cn-plaque-reste">
            <strong>{p.restants[camp]}</strong>
            {` portrait${p.restants[camp] > 1 ? 's' : ''} à trouver`}
          </span>
        </div>
      </div>
      <ul className="cn-plaque-joueurs">
        {joueurs.map((j) => (
          <li key={j} className={cx(presents && presents[j] === false && 'absent')}>
            {j === oracle && <span className="cn-oracle">oracle</span>}
            <span>{j}</span>
            {j === moi && <span className="cn-vous">(vous)</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

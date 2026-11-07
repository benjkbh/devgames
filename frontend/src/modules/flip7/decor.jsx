import { cx } from '@ui';

// Décor de Flip 7, à la fête foraine : icône du menu, chapiteau de la
// bannière, et les cartes du jeu.

export const IcoFlip7 = ({ className }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
       strokeLinejoin="round" className={cx('ico', className)}>
    <rect x="3" y="4.5" width="9" height="12.5" rx="1.6" transform="rotate(-10 7.5 10.75)" />
    <rect x="8" y="3" width="9" height="12.5" rx="1.6" />
    <path d="M10.6 6.6h3.8l-2.4 6" />
  </svg>
);

// Chapiteau la nuit : toile rayée, fanions, guirlande d'ampoules.
const AMPOULES = Array.from({ length: 13 }, (_, i) => i);

export function Chapiteau({ className }) {
  return (
    <svg viewBox="0 0 320 210" className={cx('f7-chapiteau', className)} aria-hidden="true">
      <path className="f7-chap-sol" d="M0 196h320v14H0Z" />
      <path className="f7-chap-toile" d="M40 196 160 40 280 196Z" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} className="f7-chap-raie"
              d={`M160 40 ${70 + i * 40 - 10} 196h20Z`} />
      ))}
      <path className="f7-chap-porte" d="M138 196c0-30 10-48 22-48s22 18 22 48Z" />
      <path className="f7-chap-mat" d="M160 40V14" />
      <path className="f7-chap-fanion" d="M160 14l18 6-18 6Z" />
      <path className="f7-chap-fil" d="M40 120Q160 160 280 120" />
      {AMPOULES.map((i) => {
        const t = i / 12;
        const x = 40 + 240 * t;
        const y = (1 - t) * (1 - t) * 120 + 2 * (1 - t) * t * 160 + t * t * 120;
        return <circle key={i} className="f7-ampoule" cx={x} cy={y + 4} r="3.4"
                       style={{ animationDelay: `${(i % 4) * -0.35}s` }} />;
      })}
    </svg>
  );
}

// Une carte de Flip 7 : un nombre (couleur selon sa valeur), un
// modificateur, ou une action.
const ACTIONS = {
  gel: ['❄', 'Gel'],
  trois: ['3×', 'Trois à la suite'],
  chance: ['♥', 'Seconde chance'],
};

export function CarteF7({ carte, petite, doublon }) {
  const { type, valeur, nom } = carte;
  let centre = nom;
  let legende = null;
  if (ACTIONS[type]) [centre, legende] = ACTIONS[type];
  return (
    <span className={cx('f7-carte', `f7-carte-${type}`, petite && 'petite',
      doublon && 'doublon', type === 'nombre' && `f7-v${valeur}`)}
          role="img" aria-label={legende || nom}>
      <span className="f7-carte-coin" aria-hidden="true">{type === 'nombre' ? valeur : ''}</span>
      <span className="f7-carte-centre" aria-hidden="true">{centre}</span>
      {legende && !petite && <span className="f7-carte-legende" aria-hidden="true">{legende}</span>}
    </span>
  );
}

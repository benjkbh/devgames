import { cx } from '@ui';

// Décor de Trio, à l'observatoire : icône du menu (trois étoiles reliées),
// coupole et constellation de la bannière, et les cartes-astres.

export const IcoTrio = ({ className }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
       strokeLinejoin="round" className={cx('ico', className)}>
    <path d="M4 14 10 4.5 16 13" strokeDasharray="1.6 2" />
    <circle cx="4" cy="14" r="2" />
    <circle cx="10" cy="4.5" r="2" />
    <circle cx="16" cy="13" r="2" />
  </svg>
);

const ETOILES = Array.from({ length: 30 }, (_, i) => [
  (i * 73) % 300, 8 + ((i * 41) % 110), i % 5 === 0 ? 1.8 : 1,
]);

// La coupole de l'observatoire sous une constellation de trois étoiles.
export function Observatoire({ className }) {
  return (
    <svg viewBox="0 0 300 200" className={cx('tr-observatoire', className)} aria-hidden="true">
      {ETOILES.map(([x, y, r]) => <circle key={`${x}-${y}`} className="tr-etoile" cx={x} cy={y} r={r} />)}
      <path className="tr-lien" d="M70 60 150 26 226 70" />
      {[[70, 60], [150, 26], [226, 70]].map(([x, y]) => (
        <circle key={x} className="tr-astre" cx={x} cy={y} r="5" />
      ))}
      <path className="tr-colline" d="M0 200V170c60-14 120-18 180-10s90 8 120 0V200Z" />
      <path className="tr-coupole" d="M110 166c0-40 18-62 40-62s40 22 40 62Z" />
      <path className="tr-fente" d="M146 106h8v58h-8Z" />
      <path className="tr-lunette" d="M150 120 196 82" />
    </svg>
  );
}

// Une carte de Trio : un nombre de 1 à 12 dans un astre, ou son dos
// (`cachee`).
export function CarteTrio({
  valeur, cachee, petite, className, ...reste
}) {
  return (
    <span className={cx('tr-carte', cachee ? 'cachee' : `tr-v${valeur}`, petite && 'petite', className)}
          role="img" aria-label={cachee ? 'Carte cachée' : `Carte ${valeur}`} {...reste}>
      {!cachee && <span className="tr-carte-valeur" aria-hidden="true">{valeur}</span>}
    </span>
  );
}

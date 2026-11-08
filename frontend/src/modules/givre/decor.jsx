import { cx } from '@ui';

// Décor de Givre, au chalet : icône du menu (un flocon), sommets enneigés et
// chalet de la bannière, et les cartes-glaçons.

export const IcoGivre = ({ className }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
       strokeLinejoin="round" className={cx('ico', className)}>
    <path d="M10 2v16M3.1 6l13.8 8M3.1 14l13.8-8" />
    <path d="m7.6 3.4 2.4 2 2.4-2M7.6 16.6l2.4-2 2.4 2M2.7 9l3.1-.6 1 3M17.3 11l-3.1.6-1-3M2.7 11l3.1.6 1-3M17.3 9l-3.1-.6-1 3" />
  </svg>
);

const FLOCONS = Array.from({ length: 26 }, (_, i) => [
  (i * 67) % 300, 6 + ((i * 37) % 120), i % 4 === 0 ? 2.2 : 1.3,
]);

// Deux sommets enneigés et un chalet éclairé, sous la neige.
export function Chalet({ className }) {
  return (
    <svg viewBox="0 0 300 200" className={cx('gv-chalet', className)} aria-hidden="true">
      <path className="gv-mont-loin" d="M0 150 70 70l40 40 50-70 70 80 70-40v120H0Z" />
      <path className="gv-neige-loin" d="m160 40 22 25-12-4-10 9-9-8-12 5Zm-90 30 16 18-9-2-7 7-6-6-9 2Z" />
      <path className="gv-mont" d="M0 200V160l90-50 60 40 60-30 90 50v30Z" />
      <path className="gv-chalet-mur" d="M118 172v-30h56v30Z" />
      <path className="gv-chalet-toit" d="m110 146 36-26 36 26Z" />
      <path className="gv-chalet-neige" d="M108 147c10-3 22-4 38-26 14 20 26 23 38 26-12 2-24 1-38-1-14 2-26 3-38 1Z" />
      <rect className="gv-fenetre" x="128" y="152" width="12" height="10" rx="1" />
      <rect className="gv-fenetre" x="152" y="152" width="12" height="10" rx="1" />
      <path className="gv-sapin" d="m60 180 12-34 12 34Zm168 4 10-28 10 28Zm24-8 8-22 8 22Z" />
      {FLOCONS.map(([x, y, r]) => <circle key={`${x}-${y}`} className="gv-flocon" cx={x} cy={y} r={r} />)}
    </svg>
  );
}

// Teinte d'une carte selon sa valeur : du bleu glacé (négatif) au rouge
// (les plus lourdes).
export function teinte(valeur) {
  if (valeur < 0) return 'gv-glace';
  if (valeur === 0) return 'gv-givre';
  if (valeur <= 4) return 'gv-vert';
  if (valeur <= 8) return 'gv-jaune';
  return 'gv-rouge';
}

// Une carte-glaçon : sa valeur, son dos (`cachee`), ou une flaque (`fondue`).
export function CarteGivre({
  valeur, cachee, fondue, petite, className, ...reste
}) {
  if (fondue) {
    return <span className={cx('gv-carte', 'fondue', petite && 'petite', className)} aria-label="Colonne fondue" role="img" {...reste} />;
  }
  return (
    <span className={cx('gv-carte', cachee ? 'cachee' : teinte(valeur), petite && 'petite', className)}
          role="img" aria-label={cachee ? 'Carte cachée' : `Carte ${valeur}`} {...reste}>
      {cachee ? (
        <svg viewBox="0 0 20 20" className="gv-dos" aria-hidden="true">
          <path d="M10 3v14M4 6.5l12 7M4 13.5l12-7" />
        </svg>
      ) : (
        <>
          <span className="gv-coin" aria-hidden="true">{valeur}</span>
          <span className="gv-valeur" aria-hidden="true">{valeur}</span>
        </>
      )}
    </span>
  );
}

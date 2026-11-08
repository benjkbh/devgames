import { cx } from '@ui';

// Décor du quiz, sur un plateau de jeu télévisé : icône du menu (une bulle
// avec un point d'interrogation), pupitres et projecteurs de la bannière.

export const IcoQuiz = ({ className }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
       strokeLinejoin="round" className={cx('ico', className)}>
    <path d="M4 3.5h12a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4A1.5 1.5 0 0 1 2.5 13V5A1.5 1.5 0 0 1 4 3.5Z" />
    <path d="M8.2 7.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" />
    <circle cx="10" cy="12.4" r=".4" fill="currentColor" />
  </svg>
);

// Le plateau : deux projecteurs, un écran géant et trois pupitres.
export function Studio({ className }) {
  return (
    <svg viewBox="0 0 300 200" className={cx('qz-studio', className)} aria-hidden="true">
      <path className="qz-faisceau" d="M30 0h24l46 190H0Z" />
      <path className="qz-faisceau" d="M246 0h24l30 190H200Z" />
      <rect className="qz-ecran" x="95" y="22" width="110" height="68" rx="6" />
      <text className="qz-ecran-txt" x="150" y="70" textAnchor="middle">?</text>
      <path className="qz-sol" d="M0 200v-30c80-12 220-12 300 0v30Z" />
      {[60, 150, 240].map((x, i) => (
        <g key={x}>
          <path className="qz-pupitre" d={`M${x - 26} 176l6-44h40l6 44Z`} />
          <rect className={cx('qz-lampe', i === 1 && 'allumee')} x={x - 14} y="138" width="28" height="10" rx="3" />
        </g>
      ))}
    </svg>
  );
}

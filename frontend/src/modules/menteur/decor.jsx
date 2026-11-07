import { CarteJeu, Eventail, cx } from '@ui';

// Décor du Menteur, à la taverne des pirates : icône du menu (tricorne),
// scène de la bannière, et les noms des rangs.

export const IcoMenteur = ({ className }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none"
       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
       strokeLinejoin="round" className={cx('ico', className)}>
    <path d="M2 11.5c2.6.8 4.4-3.6 8-3.6s5.4 4.4 8 3.6c-1.4 3.4-4.6 4.6-8 4.6s-6.6-1.2-8-4.6Z" />
    <path d="M8.6 11.6 11.4 14M11.4 11.6 8.6 14" />
  </svg>
);

const NOMS = { A: 'As', V: 'Valet', D: 'Dame', R: 'Roi' };

// « des 7 », « des As », « des Rois ».
export function desRangs(rang) {
  if (!NOMS[rang]) return `des ${rang}`;
  return `des ${NOMS[rang]}${rang === 'A' ? '' : 's'}`;
}

// La taverne : une lanterne, une chope, et un éventail d'as sur la table.
export function Taverne({ className }) {
  return (
    <div className={cx('mt-taverne', className)} aria-hidden="true">
      <svg viewBox="0 0 220 160" className="mt-taverne-dessin">
        <path className="mt-poutre" d="M0 18h220v12H0Z" />
        <path className="mt-chaine" d="M60 30v22" />
        <path className="mt-lanterne" d="M48 52h24l-3 34H51Z" />
        <circle className="mt-flamme" cx="60" cy="70" r="7" />
        <path className="mt-chope" d="M150 92h30v52h-30Z" />
        <path className="mt-anse" d="M180 102c14 0 14 30 0 30" />
        <path className="mt-mousse" d="M146 92c4-10 10-6 14-8 4-6 12-6 16 0 6 0 10 4 8 8Z" />
        <path className="mt-planche" d="M0 144h220v16H0Z" />
      </svg>
      <Eventail arc chevauchement={0.55} className="mt-taverne-cartes">
        {['pique', 'coeur', 'carreau', 'trefle'].map((e) => (
          <CarteJeu key={e} jeu="classique" rang="A" enseigne={e} taille="s" />
        ))}
      </Eventail>
    </div>
  );
}

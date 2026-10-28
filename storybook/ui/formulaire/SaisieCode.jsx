import { useRef } from 'react';

import { cx } from '../classes';
import './SaisieCode.css';

// Garde les caractères permis, en capitales. Un lien est réduit à son dernier
// segment (« …/uno/K7Q2M » → K7Q2M).
function nettoyer(texte, permis) {
  const brut = String(texte || '').trim();
  const segment = brut.includes('/') ? brut.split('/').filter(Boolean).pop() || '' : brut;
  return Array.from(segment.toUpperCase()).filter((c) => permis.test(c)).join('');
}

// Code saisi case par case (code d'une table de jeu, code reçu par message) :
// un caractère par case, passage automatique à la suivante, retour arrière
// vers la précédente. Coller (ou taper d'un coup) un code complet, ou un lien
// qui se termine par le code, le répartit dans les cases.
// `valeur`, `onChange(code)` ; `longueur` : nombre de cases ; `permis` :
// expression d'un caractère accepté (capitales et chiffres par défaut) ;
// `libelle` : nom accessible du groupe ; `id` : posé sur la première case,
// pour un `<label htmlFor>` ; `lectureSeule` : le code affiché dans les
// mêmes cases, sans saisie.
export function SaisieCode({
  valeur = '', onChange, longueur = 5, permis = /[A-Z0-9]/, libelle = 'Code',
  id, lectureSeule, className,
}) {
  const cases = useRef([]);
  const code = nettoyer(valeur, permis).slice(0, longueur);
  const caracteres = Array.from({ length: longueur }, (_, i) => code[i] || '');

  if (lectureSeule) {
    return (
      <span className={cx('saisie-code', 'lecture', className)} role="img"
            aria-label={`${libelle} : ${code.split('').join(' ')}`}>
        {caracteres.map((c, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className="saisie-code-case" aria-hidden="true">{c}</span>
        ))}
      </span>
    );
  }

  const aller = (i) => {
    const el = cases.current[Math.max(0, Math.min(longueur - 1, i))];
    if (el) { el.focus(); el.select(); }
  };
  // Remplace à partir de la case `i` par `texte` (un ou plusieurs caractères).
  const ecrire = (i, texte) => {
    const ajout = nettoyer(texte, permis);
    if (!ajout) return;
    // Un code entier, ou un lien, remplit tout depuis la première case.
    const depart = ajout.length >= longueur || String(texte).includes('/') ? 0 : i;
    const suite = caracteres.slice();
    Array.from(ajout).slice(0, longueur - depart).forEach((c, k) => { suite[depart + k] = c; });
    onChange(suite.join(''));
    aller(Math.min(longueur - 1, depart + ajout.length));
  };
  const effacer = (i) => {
    const suite = caracteres.slice();
    suite.splice(i, 1);
    onChange(suite.join(''));
  };
  const touche = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (caracteres[i]) effacer(i);
      else if (i > 0) { effacer(i - 1); aller(i - 1); }
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); aller(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); aller(i + 1); }
  };

  return (
    <span className={cx('saisie-code', className)} role="group" aria-label={libelle}>
      {caracteres.map((c, i) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          ref={(el) => { cases.current[i] = el; }}
          id={i === 0 ? id : undefined}
          className={cx('saisie-code-case', c && 'remplie')}
          value={c}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label={`${libelle}, caractère ${i + 1} sur ${longueur}`}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => touche(i, e)}
          onPaste={(e) => { e.preventDefault(); ecrire(i, e.clipboardData.getData('text')); }}
          onChange={(e) => {
            const v = e.target.value;
            // La case contenait déjà un caractère : seul le nouveau compte.
            ecrire(i, v.length > 1 && c && v.startsWith(c) ? v.slice(1) : v);
          }}
        />
      ))}
    </span>
  );
}

import { useCallback, useMemo, useState } from 'react';

import { estVide } from '../outils/format';

const COLLATION = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })
  .compare;

// Compare deux valeurs : nombres entre eux, sinon texte (insensible à la casse
// et aux accents, « 2 » avant « 10 »). Une valeur absente passe toujours en
// dernier, quel que soit le sens (`asc` ou `desc`).
export function comparer(a, b, sens = 'asc') {
  const videA = estVide(a);
  const videB = estVide(b);
  if (videA || videB) return Number(videA) - Number(videB);
  const r = typeof a === 'number' && typeof b === 'number'
    ? a - b : COLLATION(String(a), String(b));
  return sens === 'asc' ? r : -r;
}

// Tri d'un tableau au clic sur l'en-tête d'une colonne : même colonne, le sens
// s'inverse ; autre colonne, ordre croissant. `valeur(ligne, cle)` : ce que la
// colonne trie ; `departage(a, b)` : ordre des égalités. Sans tri choisi,
// `lignes` reste dans son ordre. Rend `{ tri, basculer, lignes }` : `tri` =
// `{ cle, sens }` ou null, à passer à `Tableau` avec `onTri={basculer}`.
export function useTri(lignes, valeur, departage) {
  const [tri, setTri] = useState(null);
  const basculer = useCallback((cle) => setTri((t) => (t && t.cle === cle
    ? { cle, sens: t.sens === 'asc' ? 'desc' : 'asc' }
    : { cle, sens: 'asc' })), []);
  const triees = useMemo(() => {
    if (!tri) return lignes;
    return [...lignes].sort((a, b) => comparer(
      valeur(a, tri.cle), valeur(b, tri.cle), tri.sens,
    ) || (departage ? departage(a, b) : 0));
  }, [lignes, tri, valeur, departage]);
  return { tri, basculer, lignes: triees };
}

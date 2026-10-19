import { useCallback, useState } from 'react';

// Ensemble avec la clé en plus ou en moins : même `Set` si `cle` y est déjà,
// sans elle, et inversement. Rend un nouvel ensemble (l'ancien reste intact).
export function basculerDans(ensemble, cle) {
  const suivant = new Set(ensemble);
  if (suivant.has(cle)) suivant.delete(cle);
  else suivant.add(cle);
  return suivant;
}

// Ensemble de clés en état : lignes dépliées, cases cochées. `initial` : clés
// de départ. Rend `{ valeurs, a, basculer, remplacer, vider }` ; `valeurs`
// est le `Set` courant, `a(cle)` teste l'appartenance.
export function useEnsemble(initial = []) {
  const [valeurs, setValeurs] = useState(() => new Set(initial));
  const basculer = useCallback(
    (cle) => setValeurs((prec) => basculerDans(prec, cle)), [],
  );
  const remplacer = useCallback((cles) => setValeurs(new Set(cles)), []);
  const vider = useCallback(() => setValeurs(new Set()), []);
  const a = useCallback((cle) => valeurs.has(cle), [valeurs]);
  return { valeurs, a, basculer, remplacer, vider };
}

import { useEffect, useRef, useState } from 'react';

// Copie dans le presse-papier. Rend `[copie, copier]` : `copie` reste vrai
// `duree` ms après une copie réussie. Le presse-papier peut être refusé
// (contexte non sécurisé) : `copie` reste alors faux.
export function useCopie(duree = 2000) {
  const [copie, setCopie] = useState(false);
  const minuteur = useRef(null);
  useEffect(() => () => clearTimeout(minuteur.current), []);

  async function copier(texte) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => setCopie(false), duree);
    } catch (e) {
      setCopie(false);
    }
  }

  return [copie, copier];
}

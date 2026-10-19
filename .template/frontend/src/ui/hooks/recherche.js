import { useMemo, useState } from 'react';

import { useTemporise } from './sondage';

// Recherche texte dans une liste : la saisie est temporisée (`useTemporise`),
// puis les éléments dont `texte(element)` contient la saisie sont gardés,
// sans tenir compte de la casse. `texte` doit garder la même identité d'un
// rendu à l'autre (fonction de module), sinon le filtre est refait à chaque
// rendu. Rend `{ champ, q, trouves }` : `champ` = `{ value, onChange }` à
// poser sur `Recherche`, `q` la saisie retenue, `trouves` la liste filtrée
// (toute la liste si `q` est vide).
export function useRecherche(elements, texte, delai) {
  const [saisie, setSaisie] = useState('');
  const q = useTemporise(saisie.trim().toLowerCase(), delai);
  const trouves = useMemo(
    () => (q ? elements.filter((e) => texte(e).toLowerCase().includes(q))
      : elements),
    [elements, texte, q],
  );
  const champ = {
    value: saisie,
    onChange: (e) => setSaisie(e.target.value),
  };
  return { champ, q, trouves };
}

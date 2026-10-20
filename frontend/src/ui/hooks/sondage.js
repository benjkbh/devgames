import { useEffect, useState } from 'react';

// Relecture périodique : appelle `lire` immédiatement, puis `periode` ms après
// la fin de chaque lecture. La boucle est suspendue quand l'onglet est en
// arrière-plan et relit au retour. `actif` false l'arrête.
// `lire` doit être stable (`useCallback`) : s'il change, la boucle repart.
export function useSondage(lire, periode, actif = true) {
  useEffect(() => {
    if (!actif) return undefined;
    // Drapeau propre à ce passage de l'effet ; faux après nettoyage.
    let courant = true;
    let minuteur = null;

    const planifier = () => {
      clearTimeout(minuteur);
      if (!courant || document.hidden) return;
      minuteur = setTimeout(async () => {
        await lire();
        if (courant) planifier();
      }, periode);
    };

    const visibilite = () => {
      if (document.hidden) clearTimeout(minuteur);
      else if (courant) { lire(); planifier(); }
    };

    lire();
    planifier();
    document.addEventListener('visibilitychange', visibilite);
    return () => {
      courant = false;
      clearTimeout(minuteur);
      document.removeEventListener('visibilitychange', visibilite);
    };
  }, [lire, periode, actif]);
}

// Valeur temporisée : suit `valeur` après `delai` ms (350 par défaut) sans
// changement.
export function useTemporise(valeur, delai = 350) {
  const [temporisee, setTemporisee] = useState(valeur);
  useEffect(() => {
    const m = setTimeout(() => setTemporisee(valeur), delai);
    return () => clearTimeout(m);
  }, [valeur, delai]);
  return temporisee;
}

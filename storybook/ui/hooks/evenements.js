import { useEffect, useRef } from 'react';

// Écouteurs de document des surcouches (popup, menu déroulant, dialogue).

// Référence vers la dernière valeur, sans réabonner l'écouteur à chaque rendu.
function useDernier(valeur) {
  const ref = useRef(valeur);
  ref.current = valeur;
  return ref;
}

// Appelle `rappel` sur un `mousedown` hors de toutes les zones (refs) données.
// Le bouton déclencheur doit figurer parmi les zones.
export function useClicExterieur(zones, rappel, actif = true) {
  const dernier = useDernier(rappel);
  const refZones = useDernier(zones);
  useEffect(() => {
    if (!actif) return undefined;
    const surClic = (e) => {
      const dedans = refZones.current.some(
        (z) => z && z.current && z.current.contains(e.target),
      );
      if (!dedans) dernier.current(e);
    };
    document.addEventListener('mousedown', surClic);
    return () => document.removeEventListener('mousedown', surClic);
  }, [actif, dernier, refZones]);
}

// Appelle `rappel` sur la touche Échap.
export function useEchap(rappel, actif = true) {
  const dernier = useDernier(rappel);
  useEffect(() => {
    if (!actif) return undefined;
    const surTouche = (e) => { if (e.key === 'Escape') dernier.current(e); };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [actif, dernier]);
}

// Bloque le défilement de la page tant que `actif` est vrai (fenêtre modale
// ouverte). Plusieurs fenêtres peuvent le demander à la fois ; la page est
// libérée à la fermeture de la dernière. La largeur de la barre de défilement
// est compensée pour que la page ne bouge pas.
let blocages = 0;
export function useBlocageDefilement(actif) {
  useEffect(() => {
    if (!actif) return undefined;
    const racine = document.documentElement;
    if (blocages === 0) {
      const barre = window.innerWidth - racine.clientWidth;
      racine.style.overflow = 'hidden';
      if (barre > 0) racine.style.paddingRight = `${barre}px`;
    }
    blocages += 1;
    return () => {
      blocages -= 1;
      if (blocages === 0) {
        racine.style.overflow = '';
        racine.style.paddingRight = '';
      }
    };
  }, [actif]);
}

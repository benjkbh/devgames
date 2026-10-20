import { useEffect, useState } from 'react';

// Écran étroit (téléphone), pour ce que le CSS seul ne règle pas : le
// chevauchement des cartes d'une main, par exemple. Se met à jour à la
// rotation ou au redimensionnement.
export const LARGEUR_ETROITE = 720;

const requete = () => (typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia(`(max-width: ${LARGEUR_ETROITE}px)`) : null);

export function useEcranEtroit() {
  const [etroit, setEtroit] = useState(() => Boolean(requete() && requete().matches));
  useEffect(() => {
    const m = requete();
    if (!m || !m.addEventListener) return undefined;
    const suivre = () => setEtroit(m.matches);
    suivre();
    m.addEventListener('change', suivre);
    return () => m.removeEventListener('change', suivre);
  }, []);
  return etroit;
}

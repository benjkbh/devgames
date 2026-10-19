import { useEffect, useState } from 'react';

// Préférences du poste (épingle du menu, thème), stockées dans `localStorage`
// et partagées entre les composants qui lisent la même clé.
// `localStorage` peut lever : repli sur la valeur par défaut.

function lire(cle) {
  try {
    return window.localStorage.getItem(cle);
  } catch (e) {
    return null;
  }
}

// Événement qui prévient les autres composants d'une préférence modifiée :
// le menu et la page du compte lisent la même (thème, épingle).
const EVENEMENT = 'preference-modifiee';

function ecrire(cle, valeur) {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch (e) { /* préférence non persistée, sans conséquence */ }
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: { cle, valeur } }));
}

// Préférence en chaîne, rend `[valeur, setValeur]`. `valides` : valeurs
// acceptées à la relecture (valeur absente ou refusée : `defaut`) ; `defaut`
// peut être une fonction, évaluée une seule fois.
export function usePreference(cle, defaut, valides) {
  const [valeur, setValeur] = useState(() => {
    const lue = lire(cle);
    if (lue !== null && (!valides || valides.includes(lue))) return lue;
    return typeof defaut === 'function' ? defaut() : defaut;
  });
  useEffect(() => { ecrire(cle, valeur); }, [cle, valeur]);
  // Une autre instance change la préférence : celle-ci la suit.
  useEffect(() => {
    const suivre = (e) => {
      if (e.detail.cle === cle && (!valides || valides.includes(e.detail.valeur))) {
        setValeur(e.detail.valeur);
      }
    };
    window.addEventListener(EVENEMENT, suivre);
    return () => window.removeEventListener(EVENEMENT, suivre);
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return [valeur, setValeur];
}

// Thème par défaut : celui du système (`sombre` ou `clair`).
function themeSysteme() {
  return window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'sombre' : 'clair';
}

// Thème `sombre` / `clair`, mémorisé ; rend `[theme, basculer]`. Il est posé
// dans l'attribut `data-theme` de `<html>`.
export function useTheme() {
  const [theme, setTheme] = usePreference('theme', themeSysteme,
    ['sombre', 'clair']);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const basculer = () => setTheme((t) => (t === 'sombre' ? 'clair' : 'sombre'));
  return [theme, basculer];
}

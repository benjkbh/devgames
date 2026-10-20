import {
  useCallback, useEffect, useRef, useState,
} from 'react';

// Action qui écrit : `occupe` pendant la requête, `erreur` (message) si elle
// échoue. `executer(action)` ne lève jamais : rend `{ ok: true, resultat }` ou
// `{ ok: false, erreur }`, `erreur` étant l'exception d'origine (avec ses
// `champs` si le serveur les détaille).
export function useAction() {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => { monte.current = false; };
  }, []);

  const executer = useCallback(async (action) => {
    setOccupe(true);
    setErreur('');
    try {
      const resultat = await action();
      return { ok: true, resultat };
    } catch (e) {
      if (monte.current) setErreur(e.message);
      return { ok: false, erreur: e };
    } finally {
      if (monte.current) setOccupe(false);
    }
  }, []);

  return { occupe, erreur, setErreur, executer };
}

// Lecture au montage, relançable. Rend `{ donnees, erreur, charge, recharger,
// remplacer }` ; `charge` est vrai dès la première réponse (succès ou erreur).
// Seule la réponse de la dernière lecture lancée est prise en compte.
// `deps` : dépendances de `lire`.
export function useChargement(lire, deps) {
  const [etat, setEtat] = useState({ donnees: null, erreur: '', charge: false });
  const generation = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lecteur = useCallback(lire, deps);

  const recharger = useCallback(async () => {
    generation.current += 1;
    const mienne = generation.current;
    try {
      const donnees = await lecteur();
      if (mienne === generation.current) {
        setEtat({ donnees, erreur: '', charge: true });
      }
      return donnees;
    } catch (e) {
      if (mienne === generation.current) {
        setEtat((s) => ({ ...s, erreur: e.message, charge: true }));
      }
      return null;
    }
  }, [lecteur]);

  useEffect(() => {
    recharger();
    // Le démontage invalide la lecture en cours.
    return () => { generation.current += 1; };
  }, [recharger]);

  const remplacer = useCallback((donnees) => {
    setEtat((s) => ({ ...s, donnees }));
  }, []);

  return { ...etat, recharger, remplacer };
}

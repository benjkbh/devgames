import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import { identique } from '../outils/identique';
import { useSondage } from './sondage';

// Lecture paramétrée, relue toutes les `periode` ms (une seule fois sans
// `periode`) tant que `actif` est vrai. `lecteur(parametres)` rend les
// données ; il est rappelé quand le contenu de `parametres` change.
// Rend `{ donnees, erreur, enCours, relire }` :
//   donnees  dernière réponse reçue, conservée pendant un changement de
//            paramètres (comptes d'onglets, en-têtes) ;
//   enCours  la réponse aux paramètres actuels n'est pas encore arrivée ;
//   relire   relance la lecture.
// Une réponse identique à la précédente ne provoque aucun rendu ; une réponse
// à d'anciens paramètres est ignorée.
export function useLecture(lecteur, parametres, periode, actif = true) {
  const cle = JSON.stringify(parametres);
  const [etat, setEtat] = useState({ cle: null, donnees: null, erreur: null });
  const courante = useRef(cle);
  courante.current = cle;
  const dernierLecteur = useRef(lecteur);
  dernierLecteur.current = lecteur;

  const lire = useCallback(async () => {
    const demandee = cle;
    try {
      const d = await dernierLecteur.current(JSON.parse(demandee));
      if (courante.current !== demandee) return;
      setEtat((prec) => (prec.cle === demandee && !prec.erreur
        && identique(prec.donnees, d)
        ? prec : { cle: demandee, donnees: d, erreur: null }));
    } catch (e) {
      if (courante.current !== demandee) return;
      setEtat((prec) => ({ ...prec, cle: demandee, erreur: e.message }));
    }
  }, [cle]);

  useSondage(lire, periode || 0, actif && Boolean(periode));
  useEffect(() => {
    if (actif && !periode) lire();
  }, [lire, periode, actif]);

  return {
    donnees: etat.donnees,
    erreur: etat.erreur,
    enCours: etat.cle !== cle,
    relire: lire,
  };
}

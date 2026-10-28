import { forwardRef } from 'react';

import { SaisieNative } from './Controles';
import { SaisieDate } from './SaisieDate';

export { Recherche, Selecteur, ZoneTexte } from './Controles';

// Champ de saisie. Les props non listées passent à l'`<input>`.
// `taille="s"` : hauteur réduite ; `erreur` pose `aria-invalid` et la bordure
// rouge. `type` : type natif, sauf `date` et `datetime-local` : le champ
// affiche alors `JJ/MM/AAAA` (et l'heure), avec à gauche un bouton qui ouvre
// un calendrier. `value` vaut `AAAA-MM-JJ` ou `AAAA-MM-JJTHH:MM`, vide : aucune
// date ; `onChange` reçoit, comme pour tout champ, un événement dont
// `target.value` est cette valeur ; `min` et `max` bornent les jours.
export const Saisie = forwardRef(function Saisie({
  type, value, onChange, ...reste
}, ref) {
  if (type === 'date' || type === 'datetime-local') {
    return (
      <SaisieDate
        valeur={value || ''}
        heure={type === 'datetime-local'}
        onChange={(v) => onChange && onChange({ target: { value: v } })}
        {...reste}
      />
    );
  }
  return (
    <SaisieNative ref={ref} type={type} value={value} onChange={onChange}
                  {...reste} />
  );
});

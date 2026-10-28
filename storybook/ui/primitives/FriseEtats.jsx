import { useState } from 'react';

import { cx } from '../classes';
import './FriseEtats.css';

// Graduations de l'axe : pas le plus fin donnant au plus 8 repères, calés sur
// l'heure ou le jour local.
const PAS = [3600, 3 * 3600, 6 * 3600, 12 * 3600, 86400, 2 * 86400,
  7 * 86400, 14 * 86400, 30 * 86400];

function graduations(debut, fin) {
  const duree = fin - debut;
  const pas = PAS.find((p) => duree / p <= 8) || PAS[PAS.length - 1];
  const d = new Date(debut * 1000);
  if (pas >= 86400) d.setHours(0, 0, 0, 0);
  else d.setMinutes(0, 0, 0);
  let t = Math.floor(d.getTime() / 1000);
  while (t < debut) t += pas;
  const deux = (n) => String(n).padStart(2, '0');
  const out = [];
  for (; t <= fin; t += pas) {
    const x = new Date(t * 1000);
    const jour = `${deux(x.getDate())}/${deux(x.getMonth() + 1)}`;
    const heure = `${deux(x.getHours())}:${deux(x.getMinutes())}`;
    let libelle = jour;
    if (pas < 86400) libelle = x.getHours() === 0 ? jour : heure;
    out.push({ t, libelle });
  }
  return out;
}

// Frise d'états sur une période : une bande de segments colorés, un axe du
// temps et une infobulle au survol ou au focus de chaque segment.
// `debut` / `fin` : bornes en epoch (s).
// `segments` : `[{ cle, debut, fin, couleur, libelle, infobulle }]`, contigus ;
//   couleur    vert, bleu, rouge, orange, sang, or, ardoise, gris (celles de
//              `Pastille`) ou hachures (état inconnu) ;
//   libelle    nom accessible du segment ;
//   infobulle  contenu affiché au survol.
export function FriseEtats({ debut, fin, segments, libelle, attenue }) {
  const [survol, setSurvol] = useState(null);
  const duree = Math.max(1, fin - debut);
  const pos = (t) => ((Math.min(fin, Math.max(debut, t)) - debut) / duree) * 100;
  const actif = segments.find((s) => s.cle === survol);
  const centre = actif ? (pos(actif.debut) + pos(actif.fin)) / 2 : 0;

  return (
    <div className={cx('frise-etats', attenue && 'frise-etats-attenue')}
         role="group" aria-label={libelle}>
      <div className="frise-etats-piste" onPointerLeave={() => setSurvol(null)}>
        {segments.map((s, i) => (
          <span
            key={s.cle}
            role="img"
            tabIndex={0}
            aria-label={s.libelle}
            className={cx('frise-etats-segment',
              s.couleur === 'hachures' ? 'frise-inconnu' : `pastille-${s.couleur}`,
              i === 0 && 'premier',
              survol === s.cle && 'survole')}
            style={{ left: `${pos(s.debut)}%`,
              width: `${pos(s.fin) - pos(s.debut)}%` }}
            onPointerEnter={() => setSurvol(s.cle)}
            onFocus={() => setSurvol(s.cle)}
            onBlur={() => setSurvol(null)}
          />
        ))}
      </div>
      <div className="frise-etats-axe" aria-hidden="true">
        {graduations(debut, fin).map((g) => (
          <span key={g.t} className="frise-etats-repere"
                style={{ left: `${pos(g.t)}%` }}>
            {g.libelle}
          </span>
        ))}
      </div>
      {actif && (
        <div className="frise-etats-bulle" role="status"
             style={{ left: `${Math.min(88, Math.max(12, centre))}%` }}>
          {actif.infobulle}
        </div>
      )}
    </div>
  );
}

import { cx } from '../classes';
import { Badge } from './Badge';
import './Etapes.css';

// Frise d'étapes d'un parcours.
// `etapes` : `[{ cle, libelle }]` dans l'ordre ; `courante` : clé de l'étape
// atteinte (les précédentes sont passées, les suivantes à venir ; une clé
// absente laisse tout à venir) ; `libelle` : nom accessible de la liste.
export function Etapes({ etapes, courante, libelle }) {
  const atteint = etapes.findIndex((e) => e.cle === courante);
  return (
    <ol className="etapes" aria-label={libelle}>
      {etapes.map((e, i) => {
        let etat = 'a-venir';
        if (i < atteint) etat = 'passe';
        else if (i === atteint) etat = 'courant';
        return (
          <li key={e.cle} className={cx('etape', etat)}
              aria-current={etat === 'courant' ? 'step' : undefined}>
            <span className="etape-puce" aria-hidden="true" />
            <span className="etape-libelle">{e.libelle}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Chronologie d'événements.
// `evenements` : `[{ cle, date, titre, auteur, note }]`, valeurs déjà
// formatées ; l'auteur est affiché, un tiret s'il manque. Rend `null` si vide.
export function Chronologie({ evenements }) {
  if (!evenements || evenements.length === 0) return null;
  return (
    <ol className="chrono">
      {evenements.map((e) => (
        <li key={e.cle} className="chrono-item">
          <span className="chrono-puce" aria-hidden="true" />
          <div className="chrono-corps">
            <div className="chrono-ligne">
              <span className="chrono-titre">{e.titre}</span>
              <Badge couleur="gris" titre={e.auteur || '-'} />
              <span className="chrono-date">{e.date}</span>
            </div>
            {e.note && <p className="chrono-note">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

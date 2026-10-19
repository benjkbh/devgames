import { cx } from '../classes';
import { LIMITES, PERIODES, PERSO } from '../outils/periode';
import { Saisie, Selecteur } from './Saisie';
import './formulaire.css';

// Contrôles de filtrage des listes.

// Filtre libellé, en ligne : « Client [ Tous les clients ▾ ] ».
export function Filtre({ libelle, className, children }) {
  return (
    <label className={cx('filtre', className)}>
      <span className="filtre-libelle">{libelle}</span>
      {children}
    </label>
  );
}

// Filtre par choix dans une liste, avec une option « tous » (valeur vide).
// `options` : textes ou `{ valeur, libelle }` ; `toutes` : libellé de l'option
// vide ; `onChange(valeur)`.
export function FiltreSelection({
  libelle, options, valeur, onChange, toutes = 'Tous', taille,
}) {
  return (
    <Filtre libelle={libelle}>
      <Selecteur taille={taille} value={valeur}
                 onChange={(e) => onChange(e.target.value)}>
        <option value="">{toutes}</option>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.valeur : o;
          const l = typeof o === 'object' ? o.libelle : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </Selecteur>
    </Filtre>
  );
}

// Filtre de fenêtre de dates. `valeur` : `{ periode, du, au }` ; `onChange`
// reçoit la nouvelle valeur. Les champs `du` / `au` n'apparaissent que pour la
// période personnalisée ; en la quittant, les dates sont effacées.
// `periodes` : clés des choix proposés (tous par défaut) ; `heure` : les
// bornes personnalisées portent aussi l'heure.
export function FiltrePeriode({
  valeur, onChange, taille = 's', bloc, periodes, heure,
}) {
  const { periode, du, au } = valeur;
  const perso = periode === PERSO;

  const choisir = (cle) => onChange(
    cle === PERSO ? { ...valeur, periode: cle }
      : { ...valeur, periode: cle, du: '', au: '' },
  );

  return (
    <>
      <Selecteur
        taille={taille}
        bloc={bloc}
        className={periode ? 'filtre-actif' : undefined}
        value={periode}
        onChange={(e) => choisir(e.target.value)}
        aria-label="Filtrer par période"
      >
        {PERIODES.filter((p) => !periodes || periodes.includes(p.cle)).map((p) => (
          <option key={p.cle} value={p.cle}>{p.libelle}</option>
        ))}
      </Selecteur>
      {perso && (
        <span className="filtre-dates">
          <Filtre libelle="du">
            <Saisie
              taille={taille}
              type={heure ? 'datetime-local' : 'date'}
              aria-label="Du"
              value={du}
              max={au || undefined}
              onChange={(e) => onChange({ ...valeur, du: e.target.value })}
            />
          </Filtre>
          <Filtre libelle="au">
            <Saisie
              taille={taille}
              type={heure ? 'datetime-local' : 'date'}
              aria-label="Au"
              value={au}
              min={du || undefined}
              onChange={(e) => onChange({ ...valeur, au: e.target.value })}
            />
          </Filtre>
        </span>
      )}
    </>
  );
}

// Choix du nombre de lignes affichées ; `total` : nombre de lignes retenues
// par le filtre, indiqué s'il dépasse `valeur`.
export function ChoixLimite({ valeur, onChange, total, taille = 's' }) {
  return (
    <span className="filtre filtre-limite">
      <Selecteur
        taille={taille}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Nombre de lignes affichées"
      >
        {LIMITES.map((n) => (
          <option key={n} value={n}>{`${n} dernières`}</option>
        ))}
      </Selecteur>
      {total > valeur && (
        <span className="filtre-reste">{`sur ${total}`}</span>
      )}
    </span>
  );
}

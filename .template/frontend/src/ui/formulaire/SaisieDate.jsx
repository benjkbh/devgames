import { useEffect, useRef, useState } from 'react';

import { cx } from '../classes';
import { Bouton } from '../primitives/Bouton';
import { IcoCalendrier, IcoChevron } from '../primitives/Icones';
import { Popup } from '../retour/Popup';
import {
  JOURS, MOIS, afficher, analyser, aujourdhui, ecrireValeur, lireValeur,
  semaines,
} from '../outils/date';
import { SaisieNative as Saisie, Selecteur } from './Controles';
import './SaisieDate.css';

// Calendrier de `Saisie type="date"` / `"datetime-local"` (non exporté seul).
// Date (ou date et heure) : un champ texte `JJ/MM/AAAA`, avec à sa gauche un
// bouton qui ouvre un calendrier (mois et année au choix, flèches, jour
// d'aujourd'hui, effacer).
// `valeur` : `AAAA-MM-JJ`, ou `AAAA-MM-JJTHH:MM` avec `heure` ; vide : aucune
// date. `onChange(valeur)` reçoit la valeur, pas un événement. `min` / `max` :
// bornes, au même format. `taille="s"` : hauteur réduite ; `erreur` : bordure
// rouge. Les autres props (`id`, `aria-*`, `placeholder`) vont au champ texte.
export function SaisieDate({
  valeur = '', onChange, heure, min, max, taille, erreur, disabled,
  placeholder, className, ...reste
}) {
  const [texte, setTexte] = useState(() => afficher(valeur, heure));
  const [ouvert, setOuvert] = useState(false);
  const [vue, setVue] = useState(null);       // { a, m } du mois affiché
  const ancre = useRef(null);

  // Valeur modifiée de l'extérieur (calendrier, remise à zéro) : le texte suit.
  useEffect(() => { setTexte(afficher(valeur, heure)); }, [valeur, heure]);

  const hors = (v) => Boolean((min && v < min.slice(0, v.length))
    || (max && v > max.slice(0, v.length)));

  function saisir(e) {
    const t = e.target.value;
    setTexte(t);
    if (t.trim() === '') {
      onChange('');
      return;
    }
    const v = analyser(t, heure);
    if (v && !hors(v)) onChange(v);
  }

  function ouvrir() {
    const d = lireValeur(valeur) || lireValeur(aujourdhui());
    setVue({ a: d.a, m: d.m });
    setOuvert(true);
  }

  const courante = lireValeur(valeur);
  const choisir = (j) => {
    const base = courante || { h: 0, mi: 0 };
    onChange(ecrireValeur({ ...base, a: vue.a, m: vue.m, j }, heure));
    if (!heure) setOuvert(false);
  };
  const changerHeure = (champ, borne) => (e) => {
    const n = Math.min(borne, Math.max(0, Number(e.target.value) || 0));
    const base = courante || lireValeur(aujourdhui());
    onChange(ecrireValeur({ ...base, [champ]: n }, true));
  };
  const aller = (delta) => {
    const total = vue.a * 12 + (vue.m - 1) + delta;
    setVue({ a: Math.floor(total / 12), m: (total % 12) + 1 });
  };
  const jourValeur = (j) => ecrireValeur({ a: vue.a, m: vue.m, j });
  const today = aujourdhui();
  const annees = vue
    ? Array.from({ length: 21 }, (_, i) => vue.a - 10 + i) : [];

  return (
    <span className={cx('saisie-date', taille && `saisie-date-${taille}`,
      className)}>
      <Bouton ref={ancre} variante="fantome" taille="s" libelle="Choisir une date"
              className="saisie-date-bouton" icone={<IcoCalendrier />}
              disabled={disabled} aria-haspopup="dialog" aria-expanded={ouvert}
              onClick={() => (ouvert ? setOuvert(false) : ouvrir())} />
      <Saisie
        taille={taille}
        erreur={erreur}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder || (heure ? 'JJ/MM/AAAA HH:MM' : 'JJ/MM/AAAA')}
        value={texte}
        onChange={saisir}
        onBlur={() => setTexte(afficher(valeur, heure))}
        {...reste}
      />
      {vue && (
        <Popup ouvert={ouvert} onFermer={() => setOuvert(false)}
               titre="Choisir une date" ancre={ancre}>
          <div className="calendrier">
            <div className="calendrier-tete">
              <Bouton variante="fantome" taille="s" libelle="Mois précédent"
                      className="calendrier-prec" icone={<IcoChevron />}
                      onClick={() => aller(-1)} />
              <Selecteur taille="s" aria-label="Mois" value={vue.m}
                         onChange={(e) => setVue({ ...vue, m: Number(e.target.value) })}>
                {MOIS.map((nom, i) => <option key={nom} value={i + 1}>{nom}</option>)}
              </Selecteur>
              <Selecteur taille="s" aria-label="Année" value={vue.a}
                         onChange={(e) => setVue({ ...vue, a: Number(e.target.value) })}>
                {annees.map((a) => <option key={a} value={a}>{a}</option>)}
              </Selecteur>
              <Bouton variante="fantome" taille="s" libelle="Mois suivant"
                      icone={<IcoChevron />} onClick={() => aller(1)} />
            </div>
            <table className="calendrier-grille">
              <thead>
                <tr>
                  {JOURS.map((j, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <th key={i} scope="col">{j}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Clés : rang de la semaine et du jour dans la semaine,
                    jamais le numéro du jour (une case vide d'index 1 et le
                    jour 1 auraient la même clé, et les cellules
                    s'empileraient au changement de mois). */}
                {semaines(vue.a, vue.m).map((sem, s) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={s}>
                    {sem.map((j, i) => {
                      // eslint-disable-next-line react/no-array-index-key
                      if (!j) return <td key={i} />;
                      const v = jourValeur(j);
                      const choisi = courante
                        && v === valeur.slice(0, 10);
                      return (
                        // eslint-disable-next-line react/no-array-index-key
                        <td key={i}>
                          <button type="button"
                                  className={cx('calendrier-jour',
                                    choisi && 'choisi',
                                    v === today && 'aujourdhui')}
                                  disabled={hors(v)}
                                  aria-pressed={Boolean(choisi)}
                                  onClick={() => choisir(j)}>
                            {j}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {heure && (
              <div className="calendrier-heure">
                <span>Heure</span>
                <Saisie taille="s" type="number" min="0" max="23"
                        aria-label="Heures"
                        value={courante ? courante.h : 0}
                        onChange={changerHeure('h', 23)} />
                :
                <Saisie taille="s" type="number" min="0" max="59"
                        aria-label="Minutes"
                        value={courante ? courante.mi : 0}
                        onChange={changerHeure('mi', 59)} />
              </div>
            )}
            <div className="calendrier-pied">
              <Bouton variante="fantome" taille="s" titre="Aujourd’hui"
                      disabled={hors(today)}
                      onClick={() => {
                        const d = lireValeur(today);
                        onChange(ecrireValeur({ ...d, ...(courante ? { h: courante.h, mi: courante.mi } : {}) }, heure));
                        setVue({ a: d.a, m: d.m });
                        if (!heure) setOuvert(false);
                      }} />
              <Bouton variante="fantome" couleur="rouge" taille="s"
                      titre="Effacer" disabled={!valeur}
                      onClick={() => { onChange(''); setOuvert(false); }} />
              {heure && (
                <Bouton variante="principal" taille="s" titre="OK"
                        onClick={() => setOuvert(false)} />
              )}
            </div>
          </div>
        </Popup>
      )}
    </span>
  );
}

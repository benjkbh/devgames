import {
  auHasard, basse, choisir, coup, nappe, pincee, souffle,
} from './synthese';

// Les deux morceaux du module UNO, synthétisés en direct ; le moteur
// (`ambiance.js`) passe de l'un à l'autre en fondu.
//
//   veillee  à la table, avant la manche : lent, doux, façon lo-fi de
//            veillée, en la mineur / do majeur (66 pulsations par minute) ;
//   partie   pendant la manche : plus vif, en ré mineur (96), une basse qui
//            bat, une caisse feutrée, de petites notes qui courent ; tendu
//            mais jamais agressif.
//
// Un morceau reçoit le moteur `m` (voir `synthese.js`) et rend un objet :
//   reprendre(t)       (re)commence au temps `t` ;
//   planifier(horizon) programme tout ce qui tombe avant `horizon`.

// -- la veillée -----------------------------------------------------------------

// Accords : fondamentale (basse), voix de la nappe, notes de l'accord (MIDI,
// 60 = do central).
const VEILLEE_ACCORDS = [
  { basse: 45, nappe: [52, 55, 60, 64], notes: [57, 60, 64, 67] }, // la m7
  { basse: 41, nappe: [53, 57, 60, 64], notes: [53, 57, 60, 64] }, // fa maj7
  { basse: 48, nappe: [52, 55, 59, 64], notes: [60, 64, 67, 71] }, // do maj7
  { basse: 43, nappe: [50, 55, 59, 64], notes: [55, 59, 62, 64] }, // sol 6
];
// Pentatonique do majeur (la mineure), du la 4 au mi 6.
const VEILLEE_GAMME = [69, 72, 74, 76, 79, 81, 84, 86, 88];

// Un pas voisin dans la gamme, avec un penchant pour les notes de l'accord.
function noteSuivante(gamme, degre, notes) {
  const pas = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
  let suivant = Math.max(0, Math.min(gamme.length - 1, degre + pas));
  const propre = (i) => notes.some((n) => (gamme[i] - n) % 12 === 0);
  if (!propre(suivant) && Math.random() < 0.5) {
    const voisin = [suivant - 1, suivant + 1].find(
      (i) => i >= 0 && i < gamme.length && propre(i),
    );
    if (voisin !== undefined) suivant = voisin;
  }
  return suivant;
}

export function veillee(m) {
  const TEMPO = 66;
  const CROCHE = 60 / TEMPO / 2;
  const PAR_ACCORD = 16; // croches : deux mesures
  const DUREE = CROCHE * PAR_ACCORD;
  let croche = 0;
  let prochaine = 0;
  let degre = 4;
  let accord = VEILLEE_ACCORDS[0];
  if (m.echo) m.echo.delayTime.value = CROCHE * 3;

  return {
    reprendre(t) {
      croche = 0;
      prochaine = t;
    },
    planifier(horizon) {
      while (prochaine < horizon) {
        const t = prochaine;
        const place = croche % PAR_ACCORD;
        if (place === 0) {
          accord = VEILLEE_ACCORDS[
            Math.floor(croche / PAR_ACCORD) % VEILLEE_ACCORDS.length];
          nappe(m, accord.nappe, t, DUREE);
          basse(m, accord.basse, t);
        } else if (place === 8) {
          basse(m, accord.basse + 7, t, 0.55);
        }
        // Temps forts plus souvent garnis que les contretemps ; des silences.
        const chance = place % 4 === 0 ? 0.7 : 0.33;
        if (place > 0 && Math.random() < chance) {
          degre = noteSuivante(VEILLEE_GAMME, degre, accord.notes);
          pincee(m, VEILLEE_GAMME[degre], t + auHasard(0, 0.025),
            place % 4 === 0 ? 1 : 0.75);
        }
        croche += 1;
        prochaine += CROCHE;
      }
    },
  };
}

// -- la manche ------------------------------------------------------------------

// ré mineur, si bémol, sol mineur, la : une mesure chacun.
const PARTIE_ACCORDS = [
  { basse: 38, nappe: [50, 53, 57, 62], notes: [62, 65, 69] },
  { basse: 46, nappe: [53, 58, 62, 65], notes: [58, 62, 65] },
  { basse: 43, nappe: [55, 58, 62, 67], notes: [55, 58, 62] },
  { basse: 45, nappe: [52, 57, 61, 64], notes: [57, 61, 64] },
];
// Pentatonique ré mineur, du ré 4 au la 5.
const PARTIE_GAMME = [62, 65, 67, 69, 72, 74, 77, 79, 81];
// Basse : (pas de la mesure, force). Caisse : temps 1 et 3. Contretemps :
// petits bruits ; claquement feutré sur les temps 2 et 4.
const BASSE = [[0, 1], [3, 0.5], [6, 0.8], [8, 1], [11, 0.5], [14, 0.7]];
const CAISSE = [0, 8];
const TIC = [2, 6, 10, 14];
const CLAC = [4, 12];

export function partie(m) {
  const TEMPO = 96;
  const SEIZIEME = 60 / TEMPO / 4;
  const PAR_MESURE = 16;
  let pas = 0;
  let prochaine = 0;
  let degre = 3;
  let accord = PARTIE_ACCORDS[0];
  if (m.echo) m.echo.delayTime.value = SEIZIEME * 3;

  return {
    reprendre(t) {
      pas = 0;
      prochaine = t;
      if (m.echo) m.echo.delayTime.value = SEIZIEME * 3;
    },
    planifier(horizon) {
      while (prochaine < horizon) {
        const t = prochaine;
        const place = pas % PAR_MESURE;
        if (place === 0) {
          accord = PARTIE_ACCORDS[
            Math.floor(pas / PAR_MESURE) % PARTIE_ACCORDS.length];
          nappe(m, accord.nappe, t, SEIZIEME * PAR_MESURE, 0.038, 1300);
        }
        BASSE.filter(([p]) => p === place).forEach(([, force]) => {
          basse(m, accord.basse, t, force * 1.05, 0.42);
        });
        if (CAISSE.includes(place)) {
          coup(m, t, { freq: 115, fin: 42, force: 0.42, duree: 0.2 });
        }
        if (CLAC.includes(place)) {
          souffle(m, t, {
            type: 'bandpass', freq: 1500, q: 0.8, force: 0.07, duree: 0.13,
          });
        }
        if (TIC.includes(place)) {
          souffle(m, t, {
            type: 'highpass', freq: 7000, q: 0.7, force: 0.025, duree: 0.04,
          });
        }
        // Petites notes qui courent, avec des trous.
        const chance = place % 2 === 0 ? 0.42 : 0.22;
        if (place % 4 !== 0 || Math.random() < 0.8) {
          if (Math.random() < chance) {
            degre = noteSuivante(PARTIE_GAMME, degre, accord.notes);
            pincee(m, PARTIE_GAMME[degre], t + auHasard(0, 0.01),
              choisir([0.6, 0.75, 0.9]), 1.0);
          }
        }
        pas += 1;
        prochaine += SEIZIEME;
      }
    },
  };
}

export const PISTES = { veillee, partie };

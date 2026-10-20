// Dates des champs de saisie : valeur `AAAA-MM-JJ` ou `AAAA-MM-JJTHH:MM` (heure
// locale, sans fuseau), affichage `JJ/MM/AAAA` ou `JJ/MM/AAAA HH:MM`.

const deux = (n) => String(n).padStart(2, '0');

// `{ a, m, j, h, mi }` d'une valeur (m : 1 à 12), ou null si illisible.
export function lireValeur(valeur) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(valeur || '');
  if (!m) return null;
  return {
    a: Number(m[1]), m: Number(m[2]), j: Number(m[3]),
    h: m[4] === undefined ? 0 : Number(m[4]),
    mi: m[5] === undefined ? 0 : Number(m[5]),
  };
}

// Valeur d'une date ; `heure` : avec l'heure.
export function ecrireValeur({ a, m, j, h = 0, mi = 0 }, heure) {
  const jour = `${String(a).padStart(4, '0')}-${deux(m)}-${deux(j)}`;
  return heure ? `${jour}T${deux(h)}:${deux(mi)}` : jour;
}

export function afficher(valeur, heure) {
  const d = lireValeur(valeur);
  if (!d) return '';
  const jour = `${deux(d.j)}/${deux(d.m)}/${d.a}`;
  return heure ? `${jour} ${deux(d.h)}:${deux(d.mi)}` : jour;
}

// Valeur d'un texte saisi (`JJ/MM/AAAA`, séparateurs `/`, `.` ou `-`, heure
// facultative), ou null si ce n'est pas une date existante.
export function analyser(texte, heure) {
  const m = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s+(\d{1,2})[:h](\d{2}))?\s*$/
    .exec(texte);
  if (!m) return null;
  const d = {
    a: Number(m[3]), m: Number(m[2]), j: Number(m[1]),
    h: m[4] === undefined ? 0 : Number(m[4]),
    mi: m[5] === undefined ? 0 : Number(m[5]),
  };
  const reel = new Date(d.a, d.m - 1, d.j);
  if (reel.getFullYear() !== d.a || reel.getMonth() !== d.m - 1
      || reel.getDate() !== d.j || d.h > 23 || d.mi > 59) return null;
  return ecrireValeur(d, heure);
}

// Semaines (lundi en premier) d'un mois : tableaux de 7 cases, `null` hors
// du mois. `m` : 1 à 12.
export function semaines(a, m) {
  const decalage = (new Date(a, m - 1, 1).getDay() + 6) % 7;
  const jours = new Date(a, m, 0).getDate();
  const cases = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: jours }, (_, i) => i + 1),
  ];
  while (cases.length % 7) cases.push(null);
  return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
}

// Jour d'aujourd'hui, en valeur (sans heure).
export function aujourdhui() {
  const d = new Date();
  return ecrireValeur({ a: d.getFullYear(), m: d.getMonth() + 1, j: d.getDate() });
}

export const MOIS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1)
  .toLocaleDateString('fr', { month: 'long' }));
export const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

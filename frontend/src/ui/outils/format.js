// Mise en forme des valeurs affichées.

// Une valeur absente : ni `0`, ni `false`, qui sont des réponses.
export function estVide(v) {
  return v === null || v === undefined || v === '';
}

export function texte(v) {
  return estVide(v) ? '-' : String(v);
}

// « 1 terminal », « 3 terminaux ». `pluralise` donne le pluriel entier.
export function pluriel(n, singulier, pluralise = `${singulier}s`) {
  return `${n} ${n > 1 ? pluralise : singulier}`;
}


// Date et heure locales depuis un epoch Unix (UTC), dans le fuseau du poste.
export function heureLocale(epoch) {
  return epoch ? new Date(epoch * 1000).toLocaleTimeString() : '-';
}

export function dateLocaleComplete(epoch) {
  return epoch ? new Date(epoch * 1000).toLocaleString() : '';
}

// Date et heure courtes sans année, « 16/09 09:21:43 ». La date complète est
// portée par l'infobulle.
export function dateHeureCourte(epoch) {
  if (!epoch) return '-';
  const d = new Date(epoch * 1000);
  const deux = (n) => String(n).padStart(2, '0');
  return `${deux(d.getDate())}/${deux(d.getMonth() + 1)} `
    + `${deux(d.getHours())}:${deux(d.getMinutes())}:${deux(d.getSeconds())}`;
}

// Date seule depuis un epoch : « 16/09/2026 ».
export function dateCourte(epoch) {
  return epoch ? new Date(epoch * 1000).toLocaleDateString() : '-';
}

// Date seule depuis une chaîne `AAAA-MM-JJ` : « 02/11/2026 ». Aucune
// conversion en `Date`, aucun fuseau appliqué.
export function dateJour(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '-');
}

export function taux(n, maxi) {
  if (n === null || n === undefined || !maxi) return null;
  return `${n} / ${maxi} (${((100 * n) / maxi).toFixed(1)} %)`;
}

// Durée écoulée depuis un epoch, en langage courant.
export function depuis(epoch) {
  if (!epoch) return null;
  const s = Math.max(0, Math.floor(Date.now() / 1000 - epoch));
  if (s < 90) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 90) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

// Durée en secondes, en langage courant : « 42 s », « 12 min », « 5 h 12 min »,
// « 3 j 4 h ».
export function duree(secondes) {
  const s = Math.max(0, Math.round(secondes || 0));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  const j = Math.floor(h / 24);
  return h % 24 ? `${j} j ${h % 24} h` : `${j} j`;
}

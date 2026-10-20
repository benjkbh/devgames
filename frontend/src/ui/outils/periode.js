// Filtre de date partagé par le journal et les historiques.
//
// Deux modes : un raccourci de durée (« dernière heure », « 7 jours »),
// recalculé à chaque lecture, ou une période personnalisée (`PERSO`) avec deux
// bornes libres, dont une seule peut être renseignée. Une borne est une date
// `AAAA-MM-JJ` ou une date et heure `AAAA-MM-JJTHH:MM`. Les bornes portent sur
// la date d'archivage (`journal.epoch`, `evenement.epoch`).

// `PERSO` : période personnalisée, sans `secondes` ; les bornes viennent des
// dates `du` et `au`.
export const PERSO = 'perso';

export const PERIODES = [
  { cle: '', libelle: 'Toute la période' },
  { cle: '1h', libelle: 'Dernière heure', secondes: 3600 },
  { cle: '24h', libelle: 'Dernières 24 h', secondes: 24 * 3600 },
  { cle: '7j', libelle: '7 derniers jours', secondes: 7 * 24 * 3600 },
  { cle: '30j', libelle: '30 derniers jours', secondes: 30 * 24 * 3600 },
  { cle: PERSO, libelle: 'Période personnalisée…' },
];

// Raccourcis proposés pour un historique court.
export const PERIODES_TRACES = ['', '1h', '24h', PERSO];

export const FILTRE_DATE_VIDE = { periode: '', du: '', au: '' };

// `AAAA-MM-JJ` ou `AAAA-MM-JJTHH:MM` -> `{ epoch, heure }`, dans le fuseau du
// poste ; sans heure, début de la journée. `null` si illisible.
function lireBorne(texte) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(texte);
  if (!m) return null;
  const [, a, mo, j, h, mi] = m;
  const heure = h !== undefined;
  const d = new Date(Number(a), Number(mo) - 1, Number(j),
    heure ? Number(h) : 0, heure ? Number(mi) : 0, 0, 0);
  return { epoch: Math.floor(d.getTime() / 1000), heure };
}

// Bornes à envoyer à l'API, en secondes (`depuis`, `jusqua`) ; les champs
// absents sont omis. Les dates libres ne comptent que sous `PERSO`.
export function bornes({ periode, du, au } = {}) {
  const out = {};
  if (periode === PERSO) {
    const d = du && lireBorne(du);
    if (d) out.depuis = d.epoch;
    const a = au && lireBorne(au);
    // Borne incluse : fin de la minute, ou de la journée sans heure.
    if (a) out.jusqua = a.epoch + (a.heure ? 60 : 86400) - 1;
    return out;
  }
  const p = PERIODES.find((x) => x.cle === periode);
  if (p && p.secondes) {
    out.depuis = Math.floor(Date.now() / 1000) - p.secondes;
  }
  return out;
}

export function filtreDateActif(f) {
  const b = bornes(f);
  return b.depuis !== undefined || b.jusqua !== undefined;
}

// Choix du nombre de lignes affichées.
export const LIMITES = [10, 20, 50, 100];
export const LIMITE_DEFAUT = 20;

// Listes de mots, connues du serveur (`backend/modules/codenames/mots.py`).
export const LISTES = [
  { valeur: 'melange', libelle: 'Mélange', resume: 'Mots de tous les jours et mots du manoir.' },
  { valeur: 'classique', libelle: 'Classique', resume: 'Mots de tous les jours, à double sens.' },
  { valeur: 'manoir', libelle: 'Manoir', resume: 'Cryptes, chandelles et morsures.' },
];
// Options d'un choix en segments : le libellé seul (le résumé s'affiche à
// part, sous le choix).
export const OPTIONS_LISTES = LISTES.map(({ valeur, libelle }) => ({ valeur, libelle }));
export const resumeListe = (v) => (LISTES.find((l) => l.valeur === v) || LISTES[0]).resume;
export const nomListe = (v) => (LISTES.find((l) => l.valeur === v) || LISTES[0]).libelle;

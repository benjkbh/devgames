import { lire, poster } from '../requete';

// API des tables d'un jeu, servie sous `/api/<module>/` par
// `backend/commun/routes_salons.py`. Les demandes rendent la table à jour,
// vue par le joueur.
//
// `creerTable(nom, publique, reglages)` : `reglages` porte les réglages du
// jeu, envoyés tels quels (`{ regles }` au UNO, `{ liste }` à Code Names).
// `demander(nom, corps)` : une demande propre au jeu (`regler`, `choisir`…)
// ou un coup de la manche (`jouer`, `reveler`…), `POST /api/<module>/<nom>`.
export function apiSalons(module) {
  const chemin = (nom) => `/api/${module}/${nom}`;
  const demander = (nom, corps) => poster(chemin(nom), corps);
  return {
    lireTables: () => lire(chemin('salons')),
    // `version` : celle que l'interface a déjà ; la réponse attend alors le
    // premier changement (attente longue, `useTable`).
    lireTable: ({ code, version }, options) => lire(chemin('salon'),
      { code, version }, options),
    creerTable: (nom, publique, reglages = {}) => demander('creer',
      { nom, public: publique, ...reglages }),
    rejoindre: (code) => demander('rejoindre', { code }),
    quitter: (code) => demander('quitter', { code }),
    exclure: (code, joueur) => demander('exclure', { code, joueur }),
    lancer: (code) => demander('lancer', { code }),
    // Regarder sans jouer : se lever entre deux manches, ou entrer en
    // spectateur ; `rejoindre` fait s'asseoir.
    lever: (code) => demander('lever', { code }),
    // Prêt pour la prochaine manche (`pret` faux : ne l'est plus).
    pret: (code, pret = true) => demander('pret', { code, pret }),
    // Devenir l'hôte d'une table dont l'hôte est absent depuis
    // `delai_reprise` secondes.
    reprendre: (code) => demander('reprendre', { code }),
    // L'hôte ferme la table : elle disparaît pour tous.
    fermer: (code) => demander('fermer', { code }),
    demander,
    // Lien à partager pour s'asseoir à une table (pseudo requis).
    lienTable: (code) => `${window.location.origin}/${module}/${code}`,
  };
}

// Règles facultatives d'une table de UNO, choisies par l'hôte (le serveur les
// connaît dans `backend/metier/uno/regles.py`, `REGLES`).
export const REGLES = [
  {
    cle: 'pioche_jusqua',
    titre: 'Piocher jusqu’à pouvoir jouer',
    aide: 'Qui ne peut pas jouer pioche jusqu’à tirer une carte jouable, au '
      + 'lieu d’une seule.',
  },
  {
    cle: 'sept_zero',
    titre: 'Règle du 7 et du 0',
    aide: 'Un 7 échange sa main avec le joueur de son choix ; un 0 fait passer '
      + 'toutes les mains au joueur suivant, dans le sens du jeu.',
  },
  {
    cle: 'rapidite',
    titre: 'Rapidité',
    aide: 'Qui tient une carte identique à celle du dessus (même couleur, même '
      + 'valeur) peut la poser hors de son tour ; le jeu reprend après lui.',
  },
  {
    cle: 'suites',
    titre: 'Suites',
    aide: 'Après un chiffre, on peut enchaîner dans le même tour les chiffres '
      + 'suivants de la même couleur (5, 6, 7… ou 5, 4, 3…).',
  },
];

export const REGLES_DEFAUT = {
  pioche_jusqua: false, sept_zero: false, rapidite: false, suites: false,
};

// Titres des règles actives d'une table, pour les afficher en clair.
export const reglesActives = (regles) => REGLES
  .filter(({ cle }) => regles && regles[cle]).map(({ titre }) => titre);

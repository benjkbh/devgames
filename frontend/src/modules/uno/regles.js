// Règles facultatives d'une table de UNO, choisies par l'hôte (le serveur les
// connaît dans `backend/modules/uno/regles.py`, `REGLES`). `court` : la règle
// en une ligne (tuiles, récapitulatif) ; `aide` : en détail.
export const REGLES = [
  {
    cle: 'pioche_jusqua',
    titre: 'Pioche jusqu’à jouer',
    court: 'On pioche jusqu’à tirer une carte jouable.',
    aide: 'Qui ne peut pas jouer pioche jusqu’à tirer une carte jouable, au '
      + 'lieu d’une seule.',
  },
  {
    cle: 'sept_zero',
    titre: 'Règle du 7 et du 0',
    court: '7 : échanger sa main. 0 : les mains tournent.',
    aide: 'Un 7 échange sa main avec le joueur de son choix ; un 0 fait passer '
      + 'toutes les mains au joueur suivant, dans le sens du jeu.',
  },
  {
    cle: 'rapidite',
    titre: 'Rapidité',
    court: 'Poser une carte identique hors de son tour.',
    aide: 'Qui tient une carte identique à celle du dessus (même couleur, même '
      + 'valeur) peut la poser hors de son tour ; le jeu reprend après lui.',
  },
  {
    cle: 'suites',
    titre: 'Suites',
    court: 'Enchaîner les chiffres suivants de la même couleur.',
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

// « 1 variante », « 2 variantes », ou null sans variante.
export function nombreVariantes(regles) {
  const n = reglesActives(regles).length;
  if (!n) return null;
  return `${n} variante${n > 1 ? 's' : ''}`;
}

// Place de chaque fiche dans le catalogue.
//
// `CATEGORIES` : la catégorie d'une fiche (les hooks et utilitaires, en `.js`,
// forment les deux dernières ; le reste, en `.jsx`). Toute fiche doit y
// figurer : le catalogue lève une erreur sinon. `ORDRE` : l'ordre des
// catégories dans le menu. `DEPENDANCES` : ce que le composant lui-même
// importe réellement (pas les autres composants de son fichier) ; un
// composant qui n'en importe aucun est une racine, sans entrée. `cx` n'y
// figure pas : il est importé presque partout.
// Dans le menu, les fiches sont rangées par catégorie ; le chevron d'un
// composant déplie ceux qui en dépendent, toutes catégories confondues.

export const ORDRE = [
  'Mise en page', 'Conteneurs', 'Indicateurs', 'Parcours', 'Actions',
  'Formulaire', 'Filtres', 'Messages', 'Fenêtres', 'Navigation', 'Données',
  'Jeux',
  'Accessibilité', 'Icônes', 'Hooks', 'Utilitaires',
];

// Fiches placées avant les autres de leur catégorie.
export const PREMIERES = ['page'];

const PAR_CATEGORIE = {
  'Mise en page': ['page', 'banniere', 'marque-appli', 'page-garde'],
  Conteneurs: ['carte', 'section'],
  Indicateurs: ['badge', 'badge-booleen', 'pastille', 'tuile', 'grille-tuiles'],
  Parcours: ['etapes', 'chronologie', 'frise-etats'],
  Actions: ['bouton', 'bouton-copier', 'menu-deroulant'],
  Formulaire: ['champ', 'barre-actions', 'champ-saisie', 'saisie',
    'saisie-date', 'selecteur', 'zone-texte', 'recherche', 'question-choix',
    'question-bool', 'champ-copiable'],
  Filtres: ['filtre', 'filtre-selection', 'filtre-periode', 'choix-limite',
    'barre-filtres'],
  Messages: ['alerte', 'etat-vide', 'chargement'],
  Fenêtres: ['popup', 'bouton-popup', 'bouton-aide', 'dialogue',
    'confirmation', 'dialogue-formulaire', 'fenetre-detail'],
  Navigation: ['onglets'],
  Données: ['tableau', 'tableau-donnees', 'cellule', 'ligne', 'valeur',
    'bouton-ouvrir', 'mosaique', 'definitions'],
  Jeux: ['carte-jeu', 'eventail'],
  Accessibilité: ['sr'],
  Icônes: ['icones'],
  Hooks: ['use-ensemble', 'use-recherche', 'use-tri', 'use-lecture',
    'use-chargement', 'use-action', 'use-sondage', 'use-temporise',
    'use-preference', 'use-theme', 'use-copie', 'use-evenements'],
  Utilitaires: ['cx', 'format', 'periode', 'identique'],
};

export const CATEGORIES = Object.fromEntries(Object.entries(PAR_CATEGORIE)
  .flatMap(([categorie, cles]) => cles.map((c) => [c, categorie])));

export const DEPENDANCES = {
  'badge-booleen': ['badge'],
  'grille-tuiles': ['tuile'],
  chronologie: ['badge'],

  bouton: ['sr'],
  'bouton-copier': ['bouton', 'icones', 'use-copie'],
  'menu-deroulant': ['bouton', 'icones', 'use-evenements'],

  champ: ['bouton-aide'],
  'champ-saisie': ['champ', 'bouton', 'question-choix', 'saisie', 'selecteur',
    'zone-texte'],
  saisie: ['saisie-date'],
  'saisie-date': ['bouton', 'icones', 'popup', 'selecteur'],
  selecteur: ['icones'],
  recherche: ['icones', 'sr'],
  'champ-copiable': ['bouton-copier', 'saisie'],

  'filtre-selection': ['filtre', 'selecteur'],
  'filtre-periode': ['filtre', 'selecteur', 'periode', 'saisie'],
  'choix-limite': ['selecteur', 'periode'],
  'barre-filtres': ['carte'],

  alerte: ['icones'],

  popup: ['bouton', 'icones', 'use-evenements'],
  'bouton-popup': ['popup', 'sr'],
  'bouton-aide': ['bouton-popup'],
  dialogue: ['bouton', 'icones', 'barre-actions', 'use-evenements'],
  confirmation: ['dialogue', 'bouton'],
  'dialogue-formulaire': ['dialogue', 'alerte', 'bouton'],
  'fenetre-detail': ['dialogue', 'onglets'],
  onglets: ['bouton-aide', 'pastille'],

  tableau: ['sr'],
  'tableau-donnees': ['tableau', 'cellule', 'bouton', 'bouton-ouvrir',
    'barre-actions', 'use-tri', 'format'],
  cellule: ['valeur', 'format'],
  valeur: ['format'],
  'bouton-ouvrir': ['bouton', 'icones'],
  mosaique: ['bouton-ouvrir'],

  'marque-appli': ['icones'],
  'page-garde': ['marque-appli'],

  'use-recherche': ['use-temporise'],
  'use-tri': ['format'],
  'use-lecture': ['identique', 'use-sondage'],
  'use-theme': ['use-preference'],
};

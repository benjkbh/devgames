import { cx } from '../classes';

// Icônes SVG en ligne de l'interface, sur une grille 20 × 20.
// Toutes sont décoratives (`aria-hidden`) : le sens passe par le texte voisin
// ou par un libellé `.sr`.

function Svg({ children, className, vue = 20, trait = 1.6, ...reste }) {
  return (
    <svg
      viewBox={`0 0 ${vue} ${vue}`}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={trait}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('ico', className)}
      {...reste}
    >
      {children}
    </svg>
  );
}

export const IcoChevron = (p) => (
  <Svg trait={1.8} {...p}><path d="M7.5 4.5 12.5 10l-5 5.5" /></Svg>
);

export const IcoFleche = (p) => (
  <Svg trait={1.8} {...p}><path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" /></Svg>
);

export const IcoChevronBas = (p) => (
  <Svg trait={1.8} {...p}><path d="M5.5 8 10 12.5 14.5 8" /></Svg>
);

// Ouverture d'une fenêtre : cadre de fenêtre et flèche sortante.
export const IcoOuvrir = (p) => (
  <Svg {...p}>
    <rect x="2.8" y="3.6" width="14.4" height="12.8" rx="2" />
    <path d="M2.8 7.2h14.4M8 13.6l4.4-4.4M9.4 9.2h3v3" />
  </Svg>
);

// Panneau latéral droit (rabattre / déployer un panneau).
export const IcoPanneau = (p) => (
  <Svg {...p}>
    <rect x="2.8" y="3.6" width="14.4" height="12.8" rx="2" />
    <path d="M12.4 3.6v12.8" />
  </Svg>
);

export const IcoFermer = (p) => (
  <Svg trait={1.8} {...p}><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" /></Svg>
);

export const IcoPlus = (p) => (
  <Svg trait={1.8} {...p}><path d="M10 4.5v11M4.5 10h11" /></Svg>
);

export const IcoValide = (p) => (
  <Svg trait={1.8} {...p}><path d="M4.5 10.5 8.2 14l7.3-8" /></Svg>
);

export const IcoCopier = (p) => (
  <Svg {...p}>
    <rect x="7" y="7" width="9.5" height="9.5" rx="1.8" />
    <path d="M13 7V5.3A1.8 1.8 0 0 0 11.2 3.5H5.3A1.8 1.8 0 0 0 3.5 5.3v5.9A1.8 1.8 0 0 0 5.3 13H7" />
  </Svg>
);

export const IcoCalendrier = (p) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
    <path d="M3 8.5h14M7 3v3M13 3v3" />
  </Svg>
);

export const IcoRecherche = (p) => (
  <Svg {...p}><circle cx="8.8" cy="8.8" r="5" /><path d="m12.6 12.6 3.9 3.9" /></Svg>
);

export const IcoTelecharger = (p) => (
  <Svg {...p}><path d="M10 3.5v9M6.2 9 10 12.8 13.8 9M4 16.5h12" /></Svg>
);

export const IcoLien = (p) => (
  <Svg {...p}>
    <path d="M8.6 11.4a3.2 3.2 0 0 0 4.5 0l2.6-2.6a3.2 3.2 0 0 0-4.5-4.5l-1 1" />
    <path d="M11.4 8.6a3.2 3.2 0 0 0-4.5 0l-2.6 2.6a3.2 3.2 0 0 0 4.5 4.5l1-1" />
  </Svg>
);

export const IcoPause = (p) => (
  <Svg {...p}><path d="M7.5 5v10M12.5 5v10" /></Svg>
);

export const IcoLecture = (p) => (
  <Svg {...p}><path d="M6.5 4.8v10.4L15 10z" /></Svg>
);

export const IcoInfo = (p) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 9v4.6" />
    <circle cx="10" cy="6.4" r=".4" fill="currentColor" />
  </Svg>
);

export const IcoErreur = (p) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6.2v4.6" />
    <circle cx="10" cy="13.6" r=".4" fill="currentColor" />
  </Svg>
);

export const IcoSucces = (p) => (
  <Svg {...p}><circle cx="10" cy="10" r="7" /><path d="m7 10.3 2.1 2.1 4-4.4" /></Svg>
);

// Triangle d'attention plein (signalement).
export const IcoAlerte = ({ className }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"
       className={cx('ico', className)}>
    <path d="M10 2.6 18.4 17H1.6Z" fill="currentColor"
          stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M10 7.6v4.2" stroke="#fff" strokeWidth="1.8"
          strokeLinecap="round" />
    <circle cx="10" cy="14.3" r="1.05" fill="#fff" />
  </svg>
);

// Triangle au trait, pour les encadrés d'avertissement.
export const IcoAttention = (p) => (
  <Svg {...p}>
    <path d="M10 3.2 17.4 16H2.6Z" />
    <path d="M10 8.2v3.6" />
    <circle cx="10" cy="13.7" r=".4" fill="currentColor" />
  </Svg>
);

export const IcoSoleil = (p) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="3.4" />
    <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7 6 6M14 14l1.3 1.3M15.3 4.7 14 6M6 14l-1.3 1.3" />
  </Svg>
);

export const IcoLune = (p) => (
  <Svg {...p}><path d="M15.6 12.4A6.2 6.2 0 0 1 7.6 4.4a6.2 6.2 0 1 0 8 8Z" /></Svg>
);

export const IcoComptes = (p) => (
  <Svg {...p}>
    <circle cx="7.6" cy="7" r="2.8" />
    <path d="M2.6 16.4c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6" />
    <path d="M13.4 4.6a2.6 2.6 0 0 1 0 4.9M15 11.9c1.7.5 2.9 2 2.9 4" />
  </Svg>
);

export const IcoSortie = (p) => (
  <Svg {...p}>
    <path d="M12.2 3.4H5.4a1 1 0 0 0-1 1v11.2a1 1 0 0 0 1 1h6.8" />
    <path d="M9.4 10h7.4M14 7.2 16.8 10 14 12.8" />
  </Svg>
);

export const IcoEpingle = ({ active, ...p }) => (
  <Svg trait={1.4} {...p}>
    <path
      d="M12.4 3.1 16.9 7.6 14.8 8.2 11.2 11.8 11.6 14.4 9.9 16.1 3.9 10.1 5.6 8.4 8.2 8.8 11.8 5.2Z"
      fill={active ? 'currentColor' : 'none'}
    />
    <path d="M3.1 16.9 7.4 12.6" />
  </Svg>
);

// Tableau de bord : quatre tuiles de tailles différentes.
export const IcoDashboard = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="6.4" height="8.2" rx="1.6" />
    <rect x="12.6" y="3" width="4.4" height="4.8" rx="1.6" />
    <rect x="12.6" y="11" width="4.4" height="6" rx="1.6" />
    <rect x="3" y="14.2" width="6.4" height="2.8" rx="1.2" />
  </Svg>
);

export const IcoAccueil = (p) => (
  <Svg {...p}><path d="M3.5 9.5 10 4l6.5 5.5M5.5 8.6V16h9V8.6" /></Svg>
);

export const IcoPointeuse = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="4.2" width="13.6" height="9.6" rx="1.6" />
    <path d="M7.5 16.5h5M10 13.8v2.7M6.2 8.2h3.2M6.2 10.8h5.6" />
  </Svg>
);

export const IcoQr = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="3.2" width="5" height="5" rx="1" />
    <rect x="11.8" y="3.2" width="5" height="5" rx="1" />
    <rect x="3.2" y="11.8" width="5" height="5" rx="1" />
    <path d="M11.8 11.8h2.2v2.2h-2.2zM16.8 11.8v.01M14 16.8h2.8v-2.8" />
  </Svg>
);

export const IcoDocument = (p) => (
  <Svg {...p}>
    <path d="M5.2 2.6h6.4l3.2 3.2v11.6H5.2zM11.6 2.6v3.2h3.2" />
    <path d="M7.6 10.2h4.8M7.6 13h3.2" />
  </Svg>
);

export const IcoFiltre = (p) => (
  <Svg {...p}><path d="M3.5 5h13M6 10h8M8.5 15h3" /></Svg>
);

// -- jeu et divertissement --

export const IcoManette = (p) => (
  <Svg {...p}>
    <path d="M6.5 5.5h7a3.5 3.5 0 0 1 3.4 2.7l1 4.4a2 2 0 0 1-3.4 1.8l-1.9-1.9H7.4l-1.9 1.9a2 2 0 0 1-3.4-1.8l1-4.4a3.5 3.5 0 0 1 3.4-2.7Z" />
    <path d="M6.6 8.2v2.6M5.3 9.5h2.6" />
    <circle cx="13" cy="8.6" r=".5" fill="currentColor" />
    <circle cx="14.6" cy="10.4" r=".5" fill="currentColor" />
  </Svg>
);

export const IcoTrophee = (p) => (
  <Svg {...p}>
    <path d="M6.5 3.5h7v4a3.5 3.5 0 0 1-7 0Z" />
    <path d="M6.5 5H4.2a2.3 2.3 0 0 0 2.6 3.4M13.5 5h2.3a2.3 2.3 0 0 1-2.6 3.4" />
    <path d="M10 11v3.4M7 16.5h6" />
  </Svg>
);

// Dé à jouer, face cinq : le hasard.
export const IcoDe = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="3" />
    <circle cx="7" cy="7" r=".9" fill="currentColor" stroke="none" />
    <circle cx="13" cy="7" r=".9" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r=".9" fill="currentColor" stroke="none" />
    <circle cx="7" cy="13" r=".9" fill="currentColor" stroke="none" />
    <circle cx="13" cy="13" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IcoEtoile = (p) => (
  <Svg {...p}>
    <path d="M10 3.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 14l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7Z" />
  </Svg>
);

// Étincelle : nouveauté, exemple mis en avant.
export const IcoEtincelle = (p) => (
  <Svg {...p}>
    <path d="M9 3l1.4 4.2 4.2 1.4-4.2 1.4L9 14.2 7.6 10 3.4 8.6l4.2-1.4Z" />
    <path d="M15.4 12.6v3.8M13.5 14.5h3.8" />
  </Svg>
);

export const IcoDrapeau = (p) => (
  <Svg {...p}><path d="M5 17V3.5M5 4h9.5l-2.2 3.5 2.2 3.5H5" /></Svg>
);

export const IcoBoussole = (p) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M13 7l-1.8 4.2L7 13l1.8-4.2Z" />
  </Svg>
);

// Boîte : un composant, une pièce de construction.
export const IcoBoite = (p) => (
  <Svg {...p}>
    <path d="M3.5 6.5 10 3.2l6.5 3.3v7L10 16.8l-6.5-3.3Z" />
    <path d="M3.5 6.5 10 9.8l6.5-3.3M10 9.8v7" />
  </Svg>
);

// Conteneur : cadre à en-tête.
export const IcoConteneur = (p) => (
  <Svg {...p}>
    <rect x="3" y="3.6" width="14" height="12.8" rx="2.4" />
    <path d="M3 7.8h14M6 5.7h.01" />
  </Svg>
);

export const IcoCalques = (p) => (
  <Svg {...p}>
    <path d="M10 3 17 6.5 10 10 3 6.5Z" />
    <path d="M3 10l7 3.5 7-3.5M3 13.5 10 17l7-3.5" />
  </Svg>
);

export const IcoCrayon = (p) => (
  <Svg {...p}>
    <path d="M13.2 3.8a1.8 1.8 0 0 1 2.6 2.6L7.2 15l-3.4.8.8-3.4Z" />
    <path d="M11.8 5.2l3 3" />
  </Svg>
);

export const IcoBulle = (p) => (
  <Svg {...p}>
    <path d="M4.5 4h11A1.5 1.5 0 0 1 17 5.5v7a1.5 1.5 0 0 1-1.5 1.5H9.2l-3.7 3v-3h-1A1.5 1.5 0 0 1 3 12.5v-7A1.5 1.5 0 0 1 4.5 4Z" />
  </Svg>
);

export const IcoAccessibilite = (p) => (
  <Svg {...p}>
    <circle cx="10" cy="4" r="1.4" />
    <path d="M4.5 7.4 10 8.6l5.5-1.2M10 8.6v3.6l-2.6 4.6M10 12.2l2.6 4.6" />
  </Svg>
);

// Crochet : un hook React.
export const IcoCrochet = (p) => (
  <Svg {...p}>
    <circle cx="12.5" cy="3.6" r="1.2" />
    <path d="M12.5 4.8v6.6a3.7 3.7 0 0 1-7.4 0V9l2 2" />
  </Svg>
);

export const IcoOutils = (p) => (
  <Svg {...p}>
    <path d="M12.8 3.4a3.6 3.6 0 0 0-3.3 4.9L3.8 14a1.5 1.5 0 0 0 2.2 2.2l5.7-5.7a3.6 3.6 0 0 0 4.9-3.3l-2.2 2.2-2-.4-.4-2Z" />
  </Svg>
);

export const IcoPalette = (p) => (
  <Svg {...p}>
    <path d="M10 3a7 7 0 0 0 0 14c1 0 1.6-.7 1.6-1.5 0-.9-.7-1.3-.7-2.1 0-.9.7-1.5 1.6-1.5h1.8A2.8 2.8 0 0 0 17 9.1C17 5.7 13.9 3 10 3Z" />
    <circle cx="6.6" cy="9.4" r=".9" fill="currentColor" stroke="none" />
    <circle cx="8.6" cy="6.3" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12.2" cy="6.3" r=".9" fill="currentColor" stroke="none" />
  </Svg>
);

// Réglages : deux curseurs.
export const IcoReglages = (p) => (
  <Svg {...p}>
    <path d="M3.5 6.5h7.5M15 6.5h1.5M3.5 13.5h1.5M9 13.5h7.5" />
    <circle cx="13" cy="6.5" r="2" />
    <circle cx="7" cy="13.5" r="2" />
  </Svg>
);

export const IcoRecharger = (p) => (
  <Svg {...p}><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.4v3.2h-3.2" /></Svg>
);

// Son : haut-parleur et deux ondes.
export const IcoSon = (p) => (
  <Svg {...p}>
    <path d="M3.5 7.8h2.8L10 4.6v10.8l-3.7-3.2H3.5Z" />
    <path d="M13 7.4a3.6 3.6 0 0 1 0 5.2M15.2 5.2a6.6 6.6 0 0 1 0 9.6" />
  </Svg>
);

// Muet : haut-parleur barré d'une croix.
export const IcoMuet = (p) => (
  <Svg {...p}>
    <path d="M3.5 7.8h2.8L10 4.6v10.8l-3.7-3.2H3.5Z" />
    <path d="M13 7.8l4 4.4M17 7.8l-4 4.4" />
  </Svg>
);

// Carte de rôle (jeu de cartes) : un croissant de lune au centre.
export const IcoCarteRole = (p) => (
  <Svg {...p}>
    <rect x="4.6" y="2.6" width="10.8" height="14.8" rx="1.6" />
    <path d="M11.6 7.2a3 3 0 1 0 0 5.6 3.4 3.4 0 0 1 0-5.6Z" />
  </Svg>
);

// Marque de l'application, pour les écrans sans menu.
export const Marque = ({ className }) => (
  <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"
       className={cx('ico', className)}>
    <rect x="5" y="8" width="30" height="21" rx="4" fill="none"
          stroke="currentColor" strokeWidth="2.6" />
    <path d="M15 33h10M20 29v4M11 15h7M11 21h12" fill="none"
          stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

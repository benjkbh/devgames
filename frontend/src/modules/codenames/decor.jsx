import { cx } from '@ui';

// Dessins du module Code Names, au manoir : icône du menu, sceaux des deux
// camps, des domestiques et du Comte, silhouette du manoir pour l'accueil,
// chauves-souris. Tout est décoratif (`aria-hidden`) : le sens passe par le
// texte voisin.

// Icône du menu : le manoir, sur la grille 20 × 20 des icônes de l'interface.
export function IcoManoir({ className, ...reste }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none"
         stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"
         strokeLinejoin="round" className={cx('ico', className)} {...reste}>
      <path d="M2 17.5h16" />
      <path d="M3.5 17.5v-7L6 8.5l2.5 2v7" />
      <path d="M8.5 17.5V6L11 2.5 13.5 6v11.5" />
      <path d="M13.5 17.5v-6l2.5-2 2 2v6" />
      <path d="M10 17.5V15a1 1 0 0 1 2 0v2.5" />
      <path d="M11 8.5v2" />
    </svg>
  );
}

const CHAUVE_SOURIS = 'M20 15.5c.9-1.6 1.6-2.7 1.6-2.7l.9 2.5c2.8-1.9 6.6-2.7 10.5-1.8-1.9 1.3-2.9 3.3-2.9 5.7-2.2-.9-4.3-.5-5.8 1-1-1.5-2.5-2.3-4.3-2.3s-3.3.8-4.3 2.3c-1.5-1.5-3.6-1.9-5.8-1-0-2.4-1-4.4-2.9-5.7 3.9-.9 7.7-.1 10.5 1.8l.9-2.5s.7 1.1 1.6 2.7Z';

// Sceau d'un camp ou d'un rôle, dans un cercle de 40 × 40.
function Sceau({ children, className }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"
         className={cx('cn-sceau', className)}>
      {children}
    </svg>
  );
}

// Vampires : chauve-souris sous une lune de sang.
export function SceauVampire({ className }) {
  return (
    <Sceau className={className}>
      <circle cx="20" cy="17" r="10" className="cn-sceau-lune" />
      <path d={CHAUVE_SOURIS} transform="translate(0 4)" />
      <path d="M17.6 25.6l1 2.6 1-2.2M22.4 25.6l-1 2.6-1-2.2" className="cn-sceau-crocs" />
    </Sceau>
  );
}

// Chasseurs : deux pieux croisés et l'étoile d'argent.
export function SceauChasseur({ className }) {
  return (
    <Sceau className={className}>
      <g transform="rotate(35 20 20)">
        <path d="M18.5 5h3v22l-1.5 5-1.5-5Z" />
      </g>
      <g transform="rotate(-35 20 20)">
        <path d="M18.5 5h3v22l-1.5 5-1.5-5Z" />
      </g>
      <path d="M20 11.5l1.4 3 3.3.4-2.4 2.3.6 3.3-2.9-1.6-2.9 1.6.6-3.3-2.4-2.3 3.3-.4Z" className="cn-sceau-etoile" />
    </Sceau>
  );
}

// Domestique : une bougie sur son bougeoir.
export function SceauDomestique({ className }) {
  return (
    <Sceau className={className}>
      <path d="M20 7.5c2 2.6 2.6 4.4 1.8 6-.4.9-1.1 1.4-1.8 1.4s-1.4-.5-1.8-1.4c-.8-1.6-.2-3.4 1.8-6Z" className="cn-sceau-flamme" />
      <rect x="17" y="16" width="6" height="13" rx="1" />
      <path d="M11 29.5h18c0 2.2-2 3.5-4 3.5H15c-2 0-4-1.3-4-3.5Z" />
      <path d="M28 31c3 0 4-1.5 4-3" className="cn-sceau-anse" />
    </Sceau>
  );
}

// Le Comte : un cercueil, et deux yeux rouges dans l'entrebâillement.
export function SceauComte({ className }) {
  return (
    <Sceau className={className}>
      <path d="M14.5 4h11l5 8.5-4 23.5h-13l-4-23.5Z" />
      <path d="M14.5 4h11l5 8.5-4 23.5h-13l-4-23.5Z" className="cn-sceau-bord" />
      <circle cx="17" cy="14" r="1.6" className="cn-sceau-yeux" />
      <circle cx="23" cy="14" r="1.6" className="cn-sceau-yeux" />
    </Sceau>
  );
}

// Les camps : nom, singulier et sceau.
export const CAMPS = {
  sang: { nom: 'Vampires', un: 'Vampire', Sceau: SceauVampire },
  argent: { nom: 'Chasseurs', un: 'Chasseur', Sceau: SceauChasseur },
};
export const ORDRE_CAMPS = ['sang', 'argent'];
export const autreCamp = (e) => (e === 'sang' ? 'argent' : 'sang');

// Sceau d'un rôle de carte : camp, domestique ou Comte.
export function SceauRole({ role, className }) {
  if (role === 'sang') return <SceauVampire className={className} />;
  if (role === 'argent') return <SceauChasseur className={className} />;
  if (role === 'comte') return <SceauComte className={className} />;
  return <SceauDomestique className={className} />;
}

// Une chauve-souris, pour les vols du décor.
export function ChauveSouris({ className, style }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"
         className={cx('cn-chauve-souris', className)} style={style}>
      <path d={CHAUVE_SOURIS} />
    </svg>
  );
}

// Le manoir sur sa colline, sous la lune : illustration de l'accueil.
// Positions fixes : le rendu serveur et le client concordent.
const FENETRES = [
  [96, 118], [112, 118], [128, 118], [176, 118], [192, 118], [208, 118],
  [96, 140], [128, 140], [192, 140], [208, 140], [146, 92], [158, 92],
];
export function Manoir({ className }) {
  return (
    <svg viewBox="0 0 300 190" aria-hidden="true" focusable="false"
         className={cx('cn-manoir', className)}>
      <circle cx="232" cy="46" r="26" className="cn-manoir-lune" />
      <path d="M190 52c10-6 26-6 38 0-8 2-14 6-18 6s-12-3-20-6Z" className="cn-manoir-nuage" />
      <path d="M0 182c40-18 90-26 150-26s110 8 150 26v8H0Z" className="cn-manoir-colline" />
      <g className="cn-manoir-batisse">
        {/* Ailes, corps central, tours et toits pointus. */}
        <path d="M80 160V110l32-18 32 18v50Z" />
        <path d="M160 160V110l32-18 32 18v50Z" />
        <path d="M134 160V84l18-14 18 14v76Z" />
        <path d="M134 86l18-44 18 44Z" />
        <path d="M68 160V100h14v60Z" />
        <path d="M65 102l10-26 10 26Z" />
        <path d="M218 160V96h14v64Z" />
        <path d="M215 98l10-28 10 28Z" />
        <path d="M151 42v-12M147 34h8" className="cn-manoir-girouette" />
        <path d="M144 160v-16a8 8 0 0 1 16 0v16Z" className="cn-manoir-porte" />
      </g>
      <g className="cn-manoir-fenetres">
        {FENETRES.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y + 12}v-8a4 4 0 0 1 8 0v8Z`} />
        ))}
      </g>
      <g className="cn-manoir-vol">
        <path d={CHAUVE_SOURIS} transform="translate(40 30) scale(.55)" />
        <path d={CHAUVE_SOURIS} transform="translate(70 18) scale(.4)" />
        <path d={CHAUVE_SOURIS} transform="translate(252 92) scale(.45)" />
      </g>
    </svg>
  );
}

import { cx } from '../classes';
import './Banniere.css';

// Bandeau de présentation en tête de page : scène de nuit sur le village
// (ciel étoilé, pleine lune, forêt, maisons éclairées, yeux dans les
// sous-bois), titre, texte, actions et compteurs. Toujours de nuit, quel que
// soit le thème.
//   surtitre     petite étiquette au-dessus du titre (nom du module) ;
//   titre        titre principal (`<h1>`, ou `<h2>` avec `niveau={2}`) ;
//   description  texte sous le titre ;
//   actions      boutons sous le texte ;
//   compteurs    [{ icone, valeur, libelle }] : chiffres clés, à droite ;
//   illustration élément à droite, avant les compteurs (cartes, image) ;
//   decor        false : sans la scène dessinée (fond de nuit seul).

// Décor en SVG. Positions fixes (pas de hasard) : le rendu serveur et le
// client concordent.
const ETOILES = Array.from({ length: 34 }, (_, i) => [
  (i * 137) % 1200, 12 + ((i * 59) % 150), i % 5 === 0 ? 1.6 : 0.9,
]);
const SAPINS_LOIN = Array.from({ length: 34 }, (_, i) => [
  i * 37 + ((i * 13) % 17), 48 + ((i * 29) % 40),
]);
const SAPINS_PRES = Array.from({ length: 16 }, (_, i) => [
  i * 78 + ((i * 31) % 30), 70 + ((i * 47) % 80),
]).filter(([x]) => x < 520 || x > 900);

const sapin = ([x, h], sol) => {
  const l = h * 0.3;
  return `${x - l},${sol} ${x},${sol - h} ${x + l},${sol}`;
};

function Scene() {
  return (
    <svg className="banniere-scene" viewBox="0 0 1200 260"
         preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <g className="banniere-etoiles">
        {ETOILES.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />)}
      </g>
      <g className="banniere-lune">
        <circle cx="1010" cy="78" r="50" />
        <circle cx="992" cy="64" r="9" className="banniere-cratere" />
        <circle cx="1030" cy="96" r="6" className="banniere-cratere" />
        <circle cx="1022" cy="58" r="4" className="banniere-cratere" />
      </g>
      <g className="banniere-loin">
        {SAPINS_LOIN.map((s) => <polygon key={s[0]} points={sapin(s, 236)} />)}
      </g>
      <g className="banniere-village">
        <path d="M560 236v-44l26-22 26 22v44Z" />
        <path d="M618 236v-60h34v60Z" />
        <path d="M612 176l23-62 23 62Z" />
        <path d="M664 236v-36l22-18 22 18v36Z" />
        <path d="M716 236v-50l30-24 30 24v50Z" />
        <path d="M784 236v-30l20-16 20 16v30Z" />
        <g className="banniere-fenetres">
          <rect x="580" y="204" width="8" height="10" />
          <rect x="631" y="190" width="8" height="14" rx="4" />
          <rect x="680" y="210" width="8" height="9" />
          <rect x="730" y="198" width="9" height="11" />
          <rect x="753" y="198" width="9" height="11" />
          <rect x="800" y="214" width="7" height="8" />
        </g>
      </g>
      <g className="banniere-pres">
        <rect x="0" y="234" width="1200" height="26" />
        {SAPINS_PRES.map((s) => <polygon key={s[0]} points={sapin(s, 250)} />)}
      </g>
      <g className="banniere-yeux">
        <circle cx="236" cy="226" r="2.6" />
        <circle cx="250" cy="226" r="2.6" />
        <circle cx="1104" cy="214" r="2.2" />
        <circle cx="1116" cy="214" r="2.2" />
      </g>
    </svg>
  );
}

export function Banniere({
  surtitre, titre, niveau = 1, description, actions, compteurs, illustration,
  decor = true, className, children,
}) {
  const Titre = niveau === 2 ? 'h2' : 'h1';
  const cote = illustration || (compteurs && compteurs.length > 0);
  return (
    <header className={cx('banniere', !decor && 'banniere-sans-decor', className)}>
      {decor && <Scene />}
      <div className="banniere-texte">
        {surtitre && <p className="banniere-surtitre">{surtitre}</p>}
        {titre && <Titre className="banniere-titre">{titre}</Titre>}
        {description && <div className="banniere-description">{description}</div>}
        {children}
        {actions && <div className="banniere-actions">{actions}</div>}
      </div>
      {cote && (
        <div className="banniere-cote">
          {illustration && <div className="banniere-illustration">{illustration}</div>}
          {compteurs && compteurs.length > 0 && (
            <ul className="banniere-compteurs">
              {compteurs.map(({ icone, valeur, libelle }) => (
                <li key={libelle} className="banniere-compteur">
                  {icone && <span className="banniere-compteur-ico">{icone}</span>}
                  <span className="banniere-compteur-valeur">{valeur}</span>
                  <span className="banniere-compteur-libelle">{libelle}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </header>
  );
}

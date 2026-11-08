import {
  useEffect, useMemo, useRef, useState,
} from 'react';

import { Bouton, cx } from '@ui';
import MONDE from './monde.json';

// Carte du monde du quiz : projection de Miller (fond Natural Earth, domaine
// public), en SVG. On zoome à la molette ou aux boutons, on se déplace en
// faisant glisser ; un clic (sans glisser) place le point.
//
//   onPlacer   ({ pays, lat, lon }) : un clic place le point ; sans elle, la
//              carte n'est qu'à lire. `pays` : code du territoire touché, ou
//              null (la mer)
//   point      le point placé par le joueur ({ lat, lon })
//   points     les points des joueurs ([{ joueur, lat, lon, point }]) : la
//              solution, la revue
//   cible      code du pays à trouver, surligné
//
// La projection est celle du script qui a produit `monde.json` : largeur
// `l`, latitude du bord haut `phiMax`.

const L = MONDE.l;
const H = MONDE.h;
const S = L / (2 * Math.PI);
const RAD = Math.PI / 180;
const millerY = (phi) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * phi * RAD));
const YMAX = millerY(MONDE.phiMax);

export function projeter(lon, lat) {
  return [S * (lon * RAD + Math.PI), S * (YMAX - millerY(lat))];
}

export function deprojeter(x, y) {
  const m = YMAX - y / S;
  const phi = (2.5 * Math.atan(Math.exp(0.8 * m)) - 0.625 * Math.PI) / RAD;
  const lon = (x / S - Math.PI) / RAD;
  return { lat: phi, lon: ((lon + 540) % 360) - 180 };
}

const ZOOM_MAX = 24;
const borner = (v, min, max) => Math.min(max, Math.max(min, v));

function cadrer(vue) {
  const k = borner(vue.k, 1, ZOOM_MAX);
  const l = L / k;
  const h = H / k;
  return { k, x: borner(vue.x, 0, L - l), y: borner(vue.y, 0, H - h) };
}

// Couleur stable d'un joueur, d'après son nom.
const TEINTES = ['#e5484d', '#3e9bff', '#30a46c', '#f5a524', '#8e4ec6', '#12a594', '#e93d82', '#ad7f58', '#5b5bd6', '#ff8b3e', '#46a758', '#0090ff'];
export function couleurJoueur(nom, joueurs) {
  const i = joueurs ? joueurs.indexOf(nom) : -1;
  if (i >= 0) return TEINTES[i % TEINTES.length];
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return TEINTES[h % TEINTES.length];
}

export default function CarteMonde({
  onPlacer, point, points = [], cible, joueurs, className,
}) {
  const svg = useRef(null);
  const glisse = useRef(null);
  const [vue, setVue] = useState({ k: 1, x: 0, y: 0 });
  const [survol, setSurvol] = useState(null);
  const l = L / vue.k;
  const h = H / vue.k;
  const r = 4 / vue.k;

  const versCarte = (e) => {
    const s = svg.current;
    if (!s || !s.getScreenCTM) return null;
    const m = s.getScreenCTM();
    if (!m) return null;
    const p = s.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    return [q.x, q.y];
  };

  const zoomer = (facteur, centre) => {
    setVue((v) => {
      const [cx0, cy0] = centre || [v.x + L / v.k / 2, v.y + H / v.k / 2];
      const k = borner(v.k * facteur, 1, ZOOM_MAX);
      const ratio = v.k / k;
      return cadrer({ k, x: cx0 - (cx0 - v.x) * ratio, y: cy0 - (cy0 - v.y) * ratio });
    });
  };

  // La molette zoome autour du pointeur, sans faire défiler la page.
  useEffect(() => {
    const noeud = svg.current;
    if (!noeud) return undefined;
    const molette = (e) => {
      e.preventDefault();
      zoomer(e.deltaY < 0 ? 1.35 : 1 / 1.35, versCarte(e));
    };
    noeud.addEventListener('wheel', molette, { passive: false });
    return () => noeud.removeEventListener('wheel', molette);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const appui = (e) => {
    glisse.current = {
      x: e.clientX, y: e.clientY, vue, bouge: false, id: e.pointerId,
    };
  };
  const deplacement = (e) => {
    const g = glisse.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.bouge && Math.hypot(dx, dy) < 6) return;
    if (!g.bouge && svg.current && svg.current.setPointerCapture) {
      svg.current.setPointerCapture(e.pointerId);
    }
    g.bouge = true;
    const rect = svg.current.getBoundingClientRect();
    const echelle = (L / g.vue.k) / rect.width;
    setVue(cadrer({ ...g.vue, x: g.vue.x - dx * echelle, y: g.vue.y - dy * echelle }));
  };
  const relache = (e) => {
    const g = glisse.current;
    glisse.current = null;
    if (!g || g.bouge || !onPlacer) return;
    const c = versCarte(e);
    if (!c) return;
    const code = e.target && e.target.dataset ? e.target.dataset.c || null : null;
    onPlacer({ pays: code, ...deprojeter(c[0], c[1]) });
  };

  const chemins = useMemo(() => MONDE.pays.map((p) => (
    <path key={p.c} d={p.d} data-c={p.c}
          className={cx('qz-pays', p.c === cible && 'cible')}>
      <title>{onPlacer ? '' : p.n}</title>
    </path>
  )), [cible, onPlacer]);
  const petits = MONDE.pays.filter((p) => p.m);
  const nomSurvol = survol && (MONDE.pays.find((p) => p.c === survol) || {}).n;
  const marque = point && projeter(point.lon, point.lat);

  return (
    <div className={cx('qz-carte', onPlacer && 'saisie', className)}>
      <svg ref={svg} viewBox={`${vue.x} ${vue.y} ${l} ${h}`}
           role="img" aria-label={onPlacer ? 'Carte du monde : cliquez pour placer votre point' : 'Carte du monde'}
           onPointerDown={appui} onPointerMove={deplacement} onPointerUp={relache}
           onPointerCancel={() => { glisse.current = null; }}
           onMouseOver={(e) => setSurvol((e.target.dataset && e.target.dataset.c) || null)}
           onMouseLeave={() => setSurvol(null)}>
        <rect className="qz-mer" x="0" y="0" width={L} height={H} />
        <g style={{ strokeWidth: 0.6 / vue.k }}>{chemins}</g>
        <g>
          {petits.map((p) => (
            <circle key={p.c} cx={p.m[0]} cy={p.m[1]} r={Math.max(1.2, 2.6 / Math.sqrt(vue.k))}
                    data-c={p.c} className={cx('qz-petit', p.c === cible && 'cible')}
                    style={{ strokeWidth: 0.5 / vue.k }} />
          ))}
        </g>
        {points.map((q) => {
          const [x, y] = projeter(q.lon, q.lat);
          const couleur = couleurJoueur(q.joueur, joueurs);
          return (
            <g key={q.joueur} className={cx('qz-point', q.point > 0 && 'juste')}>
              <circle cx={x} cy={y} r={r * 1.4} fill={couleur} style={{ strokeWidth: r / 2.5 }} />
              <text x={x + r * 1.9} y={y + r * 0.6} style={{ fontSize: r * 3.2, strokeWidth: r / 1.6 }}>{q.joueur}</text>
            </g>
          );
        })}
        {marque && (
          <g className="qz-marque">
            <circle cx={marque[0]} cy={marque[1]} r={r * 3} style={{ strokeWidth: r / 2 }} />
            <circle cx={marque[0]} cy={marque[1]} r={r * 1.1} />
          </g>
        )}
      </svg>
      <div className="qz-carte-outils">
        <Bouton taille="s" libelle="Zoomer" titre="+" onClick={() => zoomer(1.6)} />
        <Bouton taille="s" libelle="Dézoomer" titre="−" onClick={() => zoomer(1 / 1.6)} />
        <Bouton taille="s" libelle="Vue entière" titre="Monde" onClick={() => setVue({ k: 1, x: 0, y: 0 })} />
        {nomSurvol && !onPlacer && <span className="qz-carte-survol">{nomSurvol}</span>}
      </div>
    </div>
  );
}

// Le nom d'un territoire du fond de carte, d'après son code.
export function nomPays(code) {
  const p = code && MONDE.pays.find((q) => q.c === code);
  return p ? p.n : null;
}

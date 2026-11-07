import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { NOM_APPLI } from '../commun/appli';
import { MODULES } from './modules';
import { depuisQuand, usePresence } from './presence';
import { deconnexion } from './session';
import {
  Bouton, IcoComptes, IcoEpingle, IcoLune, IcoSoleil, IcoSortie, Marque,
  Pastille, Popup, cx, initiales, usePreference, useTheme,
} from '@ui';
import './coque.css';

// Menu latéral : liste les modules du registre `coque/modules.jsx`, tous
// ouverts à qui a un pseudo. Réduit à une bande d'icônes, il se déploie au survol ;
// l'épingle le garde déployé (préférence persistée, `ui/hooks/preferences.js`).
// Sa hauteur est celle de l'écran, sans défilement.

function Lien({
  chemin, libelle, Ico, auClic,
}) {
  return (
    <li>
      <NavLink
        to={chemin}
        className={({ isActive }) => cx('menu-lien', isActive && 'actif')}
        title={libelle}
        onClick={auClic}
      >
        <span className="menu-lien-ico"><Ico /></span>
        {/* Libellé masqué visuellement quand le menu est replié. */}
        <span className="menu-texte">{libelle}</span>
      </NavLink>
    </li>
  );
}

// État du serveur, en clair et en couleur de pastille.
const SANTE = {
  inconnu: ['gris', 'Vérification du serveur…'],
  ok: ['vert', 'Serveur en ligne'],
  degrade: ['orange', 'Service dégradé'],
  injoignable: ['rouge', 'Serveur injoignable'],
  session: ['orange', 'Pseudo perdu'],
};

// Santé du serveur et joueurs en ligne ; la liste complète (en ligne, puis
// partis depuis moins d'une heure, pseudo encore réservé) s'ouvre dans une
// popup.
function Presences() {
  const { statut, joueurs, moi } = usePresence();
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef(null);
  const [couleur, sante] = SANTE[statut] || SANTE.inconnu;
  const enLigne = joueurs.filter((c) => c.en_ligne);
  const horsLigne = joueurs.filter((c) => !c.en_ligne);
  const resume = statut === 'ok' || statut === 'degrade'
    ? `${enLigne.length} en ligne` : sante;
  const ligne = (c) => (
    <li key={c.nom} className="presence-ligne">
      <Pastille couleur={c.en_ligne ? 'vert' : 'gris'} compact />
      <span className="presence-nom">
        {c.nom}
        {c.nom === moi && <span className="dim"> (vous)</span>}
      </span>
      {!c.en_ligne && <span className="presence-depuis">{depuisQuand(c.depuis)}</span>}
    </li>
  );
  return (
    <>
      <button ref={ancre} type="button" className="menu-lien menu-presence"
              aria-haspopup="dialog" aria-expanded={ouvert}
              title={`${sante} · ${enLigne.length} joueur(s) en ligne`}
              onClick={() => setOuvert(!ouvert)}>
        <span className="menu-lien-ico menu-presence-ico">
          <IcoComptes />
          <Pastille couleur={couleur} className="menu-presence-pastille" />
        </span>
        <span className="menu-texte">{resume}</span>
      </button>
      <Popup ouvert={ouvert} onFermer={() => setOuvert(false)} ancre={ancre}
             titre="Qui est là ?">
        <p className="presence-sante">
          <Pastille couleur={couleur} />
          {sante}
        </p>
        <p className="presence-titre">{`En ligne (${enLigne.length})`}</p>
        <ul className="presence-liste">{enLigne.map(ligne)}</ul>
        {horsLigne.length > 0 && (
          <>
            <p className="presence-titre">{`Partis récemment (${horsLigne.length})`}</p>
            <ul className="presence-liste">{horsLigne.map(ligne)}</ul>
          </>
        )}
      </Popup>
    </>
  );
}

// Modules visibles regroupés par catégorie, dans l'ordre du registre.
function parCategorie(modules) {
  const groupes = new Map();
  modules.forEach((m) => {
    if (!groupes.has(m.categorie)) groupes.set(m.categorie, []);
    groupes.get(m.categorie).push(m);
  });
  return [...groupes];
}

export default function MenuLateral({ session, onDeconnecte }) {
  const [epingle, setEpingle] = usePreference('menu-epingle', '0', ['0', '1']);
  const [theme, basculerTheme] = useTheme();
  const estEpingle = epingle === '1';

  const sombre = theme === 'sombre';

  async function sortir() {
    try {
      await deconnexion();
    } catch (e) { /* oubli local même en cas d'erreur */ }
    await onDeconnecte();
  }

  return (
    // Déploiement au survol en CSS (`#menu:hover`). Deux éléments :
    //   `#menu`         empreinte dans la mise en page (largeur réservée) ;
    //   `.menu-panneau` panneau visible hors flux, qui s'élargit par-dessus
    //                   le contenu.
    <nav id="menu" className={estEpingle ? 'epingle' : undefined}
         aria-label="Modules">
      <div className="menu-panneau">
        {/* Épingle dans l'en-tête. */}
        <div className="menu-tete">
          <span className="menu-logo"><Marque /></span>
          <span className="menu-texte menu-appli">{NOM_APPLI}</span>
          <Bouton
            taille="s"
            className="menu-epingle"
            aria-pressed={estEpingle}
            libelle={estEpingle ? 'Laisser le menu se replier'
              : 'Garder le menu déployé'}
            icone={<IcoEpingle active={estEpingle} />}
            onClick={() => setEpingle(estEpingle ? '0' : '1')}
            variante="fantome" />
        </div>

        <div className="menu-corps">
          {parCategorie(MODULES).map(([categorie, modules]) => (
            <div key={categorie}>
              <p className="menu-rubrique">
                <span className="menu-texte">{categorie}</span>
              </p>
              <ul className="menu-liste-liens">
                {modules.map((m) => <Lien key={m.chemin} {...m} />)}
              </ul>
            </div>
          ))}
        </div>

        {/* Santé et présence, thème, puis pseudo, en pied de menu. */}
        <div className="menu-pied">
          <Presences />
          <button
            type="button"
            className="menu-lien menu-theme"
            aria-pressed={sombre}
            title={sombre ? 'Passer au thème clair' : 'Passer au thème sombre'}
            onClick={basculerTheme}
          >
            <span className="menu-lien-ico">
              {sombre ? <IcoSoleil /> : <IcoLune />}
            </span>
            <span className="menu-texte">
              {sombre ? 'Thème clair' : 'Thème sombre'}
            </span>
          </button>

          {/* Pseudo et déconnexion ; replié, seul l'avatar reste. */}
          <div className="menu-compte">
            <span className="menu-profil" title={`Vous jouez sous le pseudo ${session.pseudo}`}>
              <span className="menu-avatar" aria-hidden="true">
                {initiales(session.pseudo)}
              </span>
              <span className="menu-ident">
                <span className="menu-nom">{session.pseudo}</span>
                <span className="menu-qualite">Joueur</span>
              </span>
            </span>
            <Bouton taille="s" className="menu-sortie" variante="fantome"
                    libelle="Changer de pseudo (le vôtre reste réservé une heure)"
                    icone={<IcoSortie />} onClick={sortir} />
          </div>
        </div>
      </div>
    </nav>
  );
}

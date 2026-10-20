import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { NOM_APPLI } from '../commun/appli';
import { MODULES, modulesVisibles } from './modules';
import { depuisQuand, usePresence } from './presence';
import { deconnexion, estSuperadmin } from './session';
import {
  Bouton, IcoComptes, IcoEpingle, IcoLune, IcoSoleil, IcoSortie, Marque,
  Pastille, Popup, cx, usePreference, useTheme,
} from '../ui';
import './coque.css';

// Menu latéral : liste les modules du registre `coque/modules.jsx` que la
// session peut ouvrir. Réduit à une bande d'icônes, il se déploie au survol ;
// l'épingle le garde déployé (préférence persistée, `ui/hooks/preferences.js`).
// Sa hauteur est celle de l'écran, sans défilement.

// Rôle le plus étendu tenu par la session, tous modules confondus.
function qualite(session) {
  if (estSuperadmin(session)) return 'Superadministrateur';
  const tenus = (session.compte && session.compte.roles) || {};
  for (const m of MODULES) {
    const role = tenus[m.cle];
    if (!role) continue;
    const trouve = m.roles.find((r) => r.cle === role);
    // Le dernier rôle d'un module est le plus étendu.
    if (trouve && m.roles.indexOf(trouve) === m.roles.length - 1) {
      return trouve.libelle;
    }
  }
  for (const m of MODULES) {
    const role = tenus[m.cle];
    const trouve = role && m.roles.find((r) => r.cle === role);
    if (trouve) return trouve.libelle;
  }
  return 'Aucun accès';
}

// Initiales de l'avatar : deux caractères au plus.
function initiales(nom) {
  const bouts = String(nom || '').split(/[.\-_ ]+/).filter(Boolean);
  if (bouts.length >= 2) return (bouts[0][0] + bouts[1][0]).toUpperCase();
  return String(nom || '?').slice(0, 2).toUpperCase();
}

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
  session: ['orange', 'Session expirée'],
};

// Santé du serveur et comptes en ligne ; la liste complète (en ligne, puis
// hors ligne avec la dernière activité) s'ouvre dans une popup.
function Presences() {
  const { statut, comptes, moi } = usePresence();
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef(null);
  const [couleur, sante] = SANTE[statut] || SANTE.inconnu;
  const enLigne = comptes.filter((c) => c.en_ligne);
  const horsLigne = comptes.filter((c) => !c.en_ligne);
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
              title={`${sante} · ${enLigne.length} compte(s) en ligne`}
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
            <p className="presence-titre">{`Hors ligne (${horsLigne.length})`}</p>
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

  // Seuls les modules que la session peut ouvrir (liste de `/api/session`).
  const visibles = modulesVisibles(session);
  const superadmin = estSuperadmin(session);
  const sombre = theme === 'sombre';

  async function sortir() {
    try {
      await deconnexion();
    } catch (e) { /* déconnexion locale même en cas d'erreur */ }
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
          {parCategorie(visibles).map(([categorie, modules]) => (
            <div key={categorie}>
              <p className="menu-rubrique">
                <span className="menu-texte">{categorie}</span>
              </p>
              <ul className="menu-liste-liens">
                {modules.map((m) => <Lien key={m.chemin} {...m} />)}
              </ul>
            </div>
          ))}

          {/* Gestion des comptes, hors registre des modules. */}
          {superadmin && (
            <>
              <p className="menu-rubrique">
                <span className="menu-texte">Administration</span>
              </p>
              <ul className="menu-liste-liens">
                <Lien chemin="/comptes" libelle="Comptes et accès"
                      Ico={IcoComptes} />
              </ul>
            </>
          )}
        </div>

        {/* Santé et présence, thème, puis compte, en pied de menu. */}
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

          {/* Compte connecté et déconnexion ; replié, seul l'avatar reste. */}
          <div className="menu-compte">
            <NavLink
              to="/compte"
              className={({ isActive }) => cx('menu-profil', isActive && 'actif')}
              title="Paramètres du compte"
              aria-label={`Paramètres du compte ${session.compte.nom}`}
            >
              <span className="menu-avatar" aria-hidden="true">
                {initiales(session.compte.nom)}
              </span>
              <span className="menu-ident">
                <span className="menu-nom" title={session.compte.nom}>
                  {session.compte.nom}
                </span>
                <span className={cx('menu-qualite', superadmin && 'super')}>
                  {qualite(session)}
                </span>
              </span>
            </NavLink>
            <Bouton taille="s" className="menu-sortie"
                         libelle="Se déconnecter" icone={<IcoSortie />}
                         onClick={sortir}
              variante="fantome" />
          </div>
        </div>
      </div>
    </nav>
  );
}

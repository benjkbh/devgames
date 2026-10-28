import { useState } from 'react';

import {
  changerMotDePasse, deconnexion, estSuperadmin, fermerAutresSessions,
  lireMonCompte,
} from './session';
import { MODULES, roleTenu } from './modules';
import {
  Alerte, Badge, BarreActions, Bouton, Carte, ChampSaisie, Chargement,
  Definitions, IcoComptes, IcoLune, IcoSoleil, IcoSortie, Page, QuestionBool,
  dateLocaleComplete, duree, pluriel, useAction, useChargement, usePreference,
  useTheme,
} from '@ui';
import './moncompte.css';

// Paramètres du compte connecté : identité, accès tenus, préférences
// d'affichage et sécurité (mot de passe, sessions). Ouverte à tout compte : on
// n'agit jamais que sur le sien, le serveur prend le nom dans la session.

// Initiales de l'avatar : deux caractères au plus.
function initiales(nom) {
  const bouts = String(nom || '').split(/[.\-_ ]+/).filter(Boolean);
  if (bouts.length >= 2) return (bouts[0][0] + bouts[1][0]).toUpperCase();
  return String(nom || '?').slice(0, 2).toUpperCase();
}

// -- profil et sessions -------------------------------------------------------
function Profil({ session, lecture, onChange }) {
  const compte = session.compte;
  const d = lecture.donnees;
  const { occupe, erreur, executer } = useAction();
  const [fermees, setFermees] = useState(null);

  async function fermerAutres() {
    setFermees(null);
    const r = await executer(fermerAutresSessions);
    if (r.ok) {
      setFermees(r.resultat.sessions_fermees);
      lecture.recharger();
    }
  }
  async function sortir() {
    try {
      await deconnexion();
    } catch (e) { /* déconnexion locale même en cas d'erreur */ }
    await onChange();
  }

  const sessions = d ? d.sessions : null;
  return (
    <Carte className="compte-profil" corps>
      <div className="profil-tete">
        <span className="profil-avatar" aria-hidden="true">
          {initiales(compte.nom)}
        </span>
        <div className="profil-identite">
          <h2 className="profil-nom">{compte.nom}</h2>
          <div className="profil-badges">
            {compte.fondateur && <Badge couleur="vert" titre="fondateur" />}
            {compte.superadmin && <Badge couleur="vert" titre="superadministrateur" />}
            {!compte.superadmin && <Badge titre="compte standard" />}
          </div>
        </div>
      </div>

      {lecture.charge && !d ? (
        <Alerte compacte>{lecture.erreur}</Alerte>
      ) : !d ? <Chargement compact /> : (
        <Definitions
          items={[
            ['Compte créé le', d.cree_le ? dateLocaleComplete(d.cree_le) : '-'],
            ['Dernière modification', d.maj ? dateLocaleComplete(d.maj) : '-'],
            ['Modules ouverts', pluriel(
              session.compte.modules.length - (session.compte.modules.includes('accueil') ? 1 : 0),
              'module')],
            ['Sessions ouvertes', `${sessions} (durée d’une session : ${duree(d.session_ttl)})`],
          ]}
        />
      )}

      {erreur && <Alerte compacte>{erreur}</Alerte>}
      {fermees !== null && (
        <Alerte niveau="succes" compacte role="status">
          {fermees > 0
            ? `${pluriel(fermees, 'autre session fermée', 'autres sessions fermées')}.`
            : 'Aucune autre session n’était ouverte.'}
        </Alerte>
      )}
      <BarreActions>
        <Bouton variante="secondaire" waiting={occupe}
                disabled={!d || sessions <= 1} onClick={fermerAutres}
          titre="Fermer les autres sessions" />
        <Bouton variante="fantome" couleur="rouge" icone={<IcoSortie />}
                onClick={sortir} titre="Se déconnecter" />
      </BarreActions>
    </Carte>
  );
}

// -- accès ---------------------------------------------------------------------
function Acces({ session }) {
  const superadmin = estSuperadmin(session);
  const tenus = MODULES.filter((m) => roleTenu(session, m.cle));
  const sans = MODULES.filter((m) => !roleTenu(session, m.cle));
  return (
    <Carte titre="Mes accès"
           sousTitre="Ce que votre compte peut ouvrir, et avec quel rôle.">
      {superadmin && (
        <Alerte niveau="info" compacte role="note">
          Superadministrateur : tous les modules, au rôle le plus étendu, et
          la gestion des comptes.
        </Alerte>
      )}
      <ul className="acces-liste">
        {tenus.map((m) => {
          const role = m.roles.find((r) => r.cle === roleTenu(session, m.cle));
          return (
            <li key={m.cle} className="acces-ligne">
              <span className="acces-ico"><m.Ico /></span>
              <span className="acces-texte">
                <span className="acces-nom">{m.libelle}</span>
                {role && <span className="acces-resume">{role.resume}</span>}
              </span>
              {role && m.roles.length > 1 && <Badge titre={role.libelle} />}
            </li>
          );
        })}
        {superadmin && (
          <li className="acces-ligne">
            <span className="acces-ico"><IcoComptes /></span>
            <span className="acces-texte">
              <span className="acces-nom">Comptes et accès</span>
              <span className="acces-resume">
                Crée les comptes et règle le rôle de chacun sur chaque module.
              </span>
            </span>
            <Badge couleur="vert" titre="super" />
          </li>
        )}
      </ul>
      {sans.length > 0 && (
        <p className="dim acces-sans">
          {`Sans accès : ${sans.map((m) => m.libelle).join(', ')}. `}
          Un superadministrateur peut vous en accorder.
        </p>
      )}
    </Carte>
  );
}

// -- apparence -----------------------------------------------------------------
function Apparence() {
  const [theme, basculer] = useTheme();
  const [epingle, setEpingle] = usePreference('menu-epingle', '0', ['0', '1']);
  const choisir = (voulu) => { if (theme !== voulu) basculer(); };
  return (
    <Carte titre="Apparence"
           sousTitre="Mémorisée sur ce navigateur, pas sur le compte.">
      <div className="apparence">
        <div role="group" aria-label="Thème">
          <p className="apparence-titre">Thème</p>
          <div className="apparence-choix">
            <Bouton variante={theme === 'clair' ? 'principal' : 'secondaire'}
                    aria-pressed={theme === 'clair'} icone={<IcoSoleil />}
                    onClick={() => choisir('clair')} titre="Clair" />
            <Bouton variante={theme === 'sombre' ? 'principal' : 'secondaire'}
                    aria-pressed={theme === 'sombre'} icone={<IcoLune />}
                    onClick={() => choisir('sombre')} titre="Sombre" />
          </div>
        </div>
        <QuestionBool
          libelle="Garder le menu déployé"
          description="Sinon le menu se replie en bande d’icônes et se déploie au survol."
          checked={epingle === '1'}
          onChange={(v) => setEpingle(v ? '1' : '0')}
        />
      </div>
    </Carte>
  );
}

// -- mot de passe --------------------------------------------------------------
const CHAMP_ACTUEL = {
  type: 'mot_de_passe', libelle: 'Mot de passe actuel', obligatoire: true,
};
const CHAMP_NOUVEAU = {
  type: 'mot_de_passe', libelle: 'Nouveau mot de passe', obligatoire: true,
};
const CHAMP_CONFIRMATION = {
  type: 'mot_de_passe', libelle: 'Confirmer le nouveau mot de passe',
  obligatoire: true,
};

function MotDePasse({ onChange }) {
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [fermees, setFermees] = useState(null);
  const { occupe, erreur, setErreur, executer } = useAction();

  const pret = actuel && nouveau && confirmation;

  async function soumettre(e) {
    e.preventDefault();
    setErreurs({});
    setErreur('');
    setFermees(null);
    if (nouveau !== confirmation) {
      setErreurs({ confirmation: 'Les deux mots de passe diffèrent.' });
      return;
    }
    const r = await executer(() => changerMotDePasse(actuel, nouveau));
    if (r.ok) {
      setActuel('');
      setNouveau('');
      setConfirmation('');
      setFermees(r.resultat.sessions_fermees);
      onChange();
    } else if (r.erreur.champs) {
      setErreurs(r.erreur.champs);
    }
  }

  return (
    <Carte titre="Mot de passe"
           sousTitre="Changer le mot de passe ferme vos sessions ouvertes ailleurs.">
      <form className="compte-formulaire" onSubmit={soumettre} autoComplete="off">
        {erreur && !Object.keys(erreurs).length && <Alerte compacte>{erreur}</Alerte>}
        {fermees !== null && (
          <Alerte niveau="succes" compacte role="status">
            {fermees > 0
              ? `Mot de passe modifié. ${pluriel(fermees, 'autre session fermée', 'autres sessions fermées')}.`
              : 'Mot de passe modifié.'}
          </Alerte>
        )}
        <ChampSaisie id="mdp-actuel" valeur={actuel} onChange={setActuel}
                     erreur={erreurs.actuel} champ={CHAMP_ACTUEL}
                     autoComplete="current-password" />
        <ChampSaisie id="mdp-nouveau" valeur={nouveau} onChange={setNouveau}
                     erreur={erreurs.nouveau} champ={CHAMP_NOUVEAU}
                     autoComplete="new-password" />
        <ChampSaisie id="mdp-confirmation" valeur={confirmation}
                     onChange={setConfirmation} erreur={erreurs.confirmation}
                     champ={CHAMP_CONFIRMATION} autoComplete="new-password" />
        <BarreActions>
          <Bouton type="submit" variante="principal" waiting={occupe}
                  disabled={!pret} titre="Changer le mot de passe" />
        </BarreActions>
      </form>
    </Carte>
  );
}

export default function MonCompte({ session, onChange }) {
  const lecture = useChargement(lireMonCompte, []);
  return (
    <Page titre="Mon compte"
          description="Vos informations, vos accès et vos préférences."
          className="mon-compte">
      <div className="mon-compte-grille">
        <div className="mon-compte-colonne">
          <Profil session={session} lecture={lecture} onChange={onChange} />
          <MotDePasse onChange={lecture.recharger} />
        </div>
        <div className="mon-compte-colonne">
          <Acces session={session} />
          <Apparence />
        </div>
      </div>
    </Page>
  );
}

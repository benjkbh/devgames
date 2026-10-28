import { useState } from 'react';

import { NOM_APPLI, SOUS_NOM_APPLI } from '../commun/appli';
import { connexion, installer } from './session';
import {
  Alerte, Bouton, ChampSaisie, PageGarde, useAction,
} from '@ui';

const CHAMP_NOM = { type: 'texte', libelle: 'Nom d’utilisateur' };
const CHAMP_MDP = { type: 'mot_de_passe', libelle: 'Mot de passe' };
const CHAMP_MDP2 = {
  type: 'mot_de_passe', libelle: 'Confirmer le mot de passe',
};

// Formulaire de connexion ; en mode `installation` (aucun compte en base), il
// crée le premier superadministrateur. `onEntre` est appelé après succès.
export default function FormulaireConnexion({ installation, onEntre }) {
  const [nom, setNom] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const {
    occupe, erreur, setErreur, executer,
  } = useAction();

  async function soumettre(e) {
    e.preventDefault();
    if (installation && motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }
    const r = await executer(() => (installation
      ? installer(nom, motDePasse) : connexion(nom, motDePasse)));
    if (!r.ok) return;
    setMotDePasse('');
    setConfirmation('');
    await onEntre();
  }

  return (
    <PageGarde
      appli={NOM_APPLI}
      sousNom={SOUS_NOM_APPLI}
      titre={installation ? 'Premier démarrage' : 'Connexion'}
      sousTitre={installation
        ? 'Aucun compte n’existe encore. Créez le superadministrateur : il '
          + 'aura accès à tous les modules et pourra créer les autres comptes.'
        : 'Identifiez-vous pour accéder à l’application.'}
    >
      {/* Erreur affichée au-dessus du formulaire. */}
      {erreur && <Alerte>{erreur}</Alerte>}

      <form className="form-acces" onSubmit={soumettre} autoComplete="off">
        <ChampSaisie id="nom" champ={CHAMP_NOM} valeur={nom} onChange={setNom}
                     autoComplete="username" required autoFocus />
        {/* `new-password` en installation. */}
        <ChampSaisie id="mdp" champ={CHAMP_MDP} valeur={motDePasse}
                     onChange={setMotDePasse} required
                     autoComplete={installation ? 'new-password'
                       : 'current-password'} />
        {installation && (
          <ChampSaisie id="mdp2" champ={CHAMP_MDP2} valeur={confirmation}
                       onChange={setConfirmation} required
                       autoComplete="new-password" />
        )}
        <Bouton type="submit" variante="principal" taille="l" bloc
                waiting={occupe} titre={installation ? 'Créer le compte' : 'Se connecter'} />
      </form>
    </PageGarde>
  );
}

import { useState } from 'react';

import { NOM_APPLI, SOUS_NOM_APPLI } from '../commun/appli';
import { choisirPseudo } from './session';
import {
  Alerte, Bouton, Champ, PageGarde, Saisie, useAction,
} from '@ui';

// Entrée dans l'application : on choisit un pseudo, sans compte ni mot de
// passe. Le navigateur le garde (cookie) ; un pseudo pris reste réservé une
// heure après le départ de son joueur. `onEntre` est appelé après succès.
export default function ChoixPseudo({ onEntre }) {
  const [pseudo, setPseudo] = useState('');
  const { occupe, erreur, executer } = useAction();

  async function soumettre(e) {
    e.preventDefault();
    const r = await executer(() => choisirPseudo(pseudo));
    if (r.ok) await onEntre();
  }

  return (
    <PageGarde
      appli={NOM_APPLI}
      sousNom={SOUS_NOM_APPLI}
      titre="Qui êtes-vous ?"
      sousTitre="Choisissez un pseudo pour rejoindre les tables. Il vous suit sur ce navigateur."
    >
      {erreur && <Alerte>{erreur}</Alerte>}

      <form className="form-acces" onSubmit={soumettre} autoComplete="off">
        <Champ id="pseudo" libelle="Pseudo"
               aide="2 à 20 caractères : lettres, chiffres, espaces, tirets.">
          <Saisie id="pseudo" value={pseudo} maxLength={20} required autoFocus
                  autoComplete="nickname" spellCheck={false}
                  onChange={(e) => setPseudo(e.target.value)} />
        </Champ>
        <Bouton type="submit" variante="principal" taille="l" bloc
                disabled={pseudo.trim().length < 2} waiting={occupe} titre="Entrer" />
      </form>
    </PageGarde>
  );
}

import { useCallback, useEffect, useState } from 'react';

import { lire, poster } from '../commun/requete';

// Session de l'application : compte connecté, modules accessibles et rôle tenu
// sur chacun, tels que rendus par `/api/session`.

export const lireSession = () => lire('/api/session');
export const connexion = (nom, motDePasse) =>
  poster('/api/login', { nom, mot_de_passe: motDePasse });
export const deconnexion = () => poster('/api/logout', {});
export const installer = (nom, motDePasse) =>
  poster('/api/installation', { nom, mot_de_passe: motDePasse });

// Le compte connecté, sur lui-même : dates, sessions ouvertes, mot de passe.
export const lireMonCompte = () => lire('/api/compte');
export const changerMotDePasse = (actuel, nouveau) =>
  poster('/api/compte/mot-de-passe', { actuel, nouveau });
export const fermerAutresSessions = () =>
  poster('/api/compte/sessions/fermer', {});

// Gestion des comptes, réservée au superadministrateur.
export const lireComptes = () => lire('/api/comptes');
export const creerCompte = (compte) => poster('/api/comptes/creer', compte);
export const modifierCompte = (compte) =>
  poster('/api/comptes/modifier', compte);
export const supprimerCompte = (nom) =>
  poster('/api/comptes/supprimer', { nom });

// État initial : `chargee` vaut false tant que `/api/session` n'a pas répondu.
const VIDE = {
  compte: null,
  installationRequise: false,
  modules: [],
  chargee: false,
};

export function useSession() {
  const [session, setSession] = useState(VIDE);

  const rafraichir = useCallback(async () => {
    try {
      const s = await lireSession();
      setSession({
        compte: s.compte,
        installationRequise: Boolean(s.installation_requise),
        modules: s.modules || [],
        chargee: true,
      });
      return s;
    } catch (e) {
      // Erreur réseau : session lue et déconnectée.
      setSession((s) => ({ ...s, compte: null, chargee: true }));
      return null;
    }
  }, []);

  useEffect(() => { rafraichir(); }, [rafraichir]);

  return [session, rafraichir];
}

// Les modules et rôles accessibles sont calculés par le serveur. Les lecteurs
// `modulesVisibles`, `roleTenu` et `peut` sont dans `coque/modules.jsx`.

export const estSuperadmin = (session) =>
  Boolean(session.compte && session.compte.superadmin);

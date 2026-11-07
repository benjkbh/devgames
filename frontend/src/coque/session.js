import { useCallback, useEffect, useState } from 'react';

import { lire, poster } from '../commun/requete';

// Le joueur de ce navigateur : son pseudo (lié par un cookie), tel que rendu
// par `/api/session`. Pas de compte : n'importe qui entre en choisissant un
// pseudo, réservé une heure après son départ.

export const lireSession = () => lire('/api/session');
export const choisirPseudo = (pseudo) => poster('/api/pseudo', { pseudo });
export const deconnexion = () => poster('/api/logout', {});

// État initial : `chargee` vaut false tant que `/api/session` n'a pas répondu.
const VIDE = { pseudo: null, chargee: false };

export function useSession() {
  const [session, setSession] = useState(VIDE);

  const rafraichir = useCallback(async () => {
    try {
      const s = await lireSession();
      setSession({ pseudo: s.pseudo || null, chargee: true });
      return s;
    } catch (e) {
      // Erreur réseau : session lue, sans pseudo.
      setSession({ pseudo: null, chargee: true });
      return null;
    }
  }, []);

  useEffect(() => { rafraichir(); }, [rafraichir]);

  return [session, rafraichir];
}

import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from 'react';

import { lire } from '../commun/requete';
import { Alerte, Bouton, useSondage } from '../ui';

// Contrôle de santé côté client et présence des comptes.
// `GET /api/presence` est relu toutes les `PERIODE` ms (et au retour sur
// l'onglet) : il dit si le serveur répond, si sa base est lisible, et qui est
// en ligne. L'appel vaut lui-même signe de vie du compte.
//   statut   inconnu (première lecture) · ok · degrade (base illisible) ·
//            injoignable (réseau, serveur arrêté, erreur 5xx) · session
//            (session expirée : 401)
//   comptes  [{ nom, en_ligne, depuis }] (secondes depuis le dernier signe
//            de vie ; null : jamais vu depuis le démarrage du serveur)

export const PERIODE = 10000;

const VIDE = {
  statut: 'inconnu', comptes: [], moi: null, verifie: null, relire: () => {},
};

const Contexte = createContext(VIDE);

export function FournisseurPresence({ children }) {
  const [etat, setEtat] = useState(VIDE);
  const enCours = useRef(false);

  const relire = useCallback(async () => {
    if (enCours.current) return;
    enCours.current = true;
    try {
      const d = await lire('/api/presence');
      setEtat({
        statut: d.base === 'ok' ? 'ok' : 'degrade',
        comptes: d.comptes || [],
        moi: d.moi,
        verifie: Date.now(),
      });
    } catch (e) {
      setEtat((prec) => ({
        ...prec,
        statut: e.statut === 401 ? 'session' : 'injoignable',
        verifie: Date.now(),
      }));
    } finally {
      enCours.current = false;
    }
  }, []);

  useSondage(relire, PERIODE);
  const valeur = useMemo(() => ({ ...etat, relire }), [etat, relire]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export const usePresence = () => useContext(Contexte);

// « à l'instant », « il y a 5 min », « il y a 2 h », « il y a 3 j ».
export function depuisQuand(secondes) {
  if (secondes === null || secondes === undefined) return 'pas vu depuis le démarrage du serveur';
  if (secondes < 60) return 'à l’instant';
  if (secondes < 3600) return `il y a ${Math.floor(secondes / 60)} min`;
  if (secondes < 86400) return `il y a ${Math.floor(secondes / 3600)} h`;
  return `il y a ${Math.floor(secondes / 86400)} j`;
}

// Bandeau en tête de zone quand le serveur ne répond plus, que sa base est
// illisible ou que la session a expiré. Rien quand tout va bien.
export function BandeauSante() {
  const { statut, relire } = usePresence();
  if (statut === 'injoignable') {
    return (
      <div className="bandeau-sante" role="status">
        <Alerte titre="Serveur injoignable" compacte>
          La connexion est perdue : nouvelle tentative toutes les
          {` ${PERIODE / 1000} `}
          secondes. Vos actions risquent d’échouer en attendant.
          {' '}
          <Bouton taille="s" titre="Réessayer maintenant" onClick={relire} />
        </Alerte>
      </div>
    );
  }
  if (statut === 'degrade') {
    return (
      <div className="bandeau-sante" role="status">
        <Alerte niveau="attention" titre="Service dégradé" compacte>
          Le serveur répond, mais sa base de données est inaccessible.
        </Alerte>
      </div>
    );
  }
  if (statut === 'session') {
    return (
      <div className="bandeau-sante" role="status">
        <Alerte niveau="attention" titre="Session expirée" compacte>
          Reconnectez-vous pour continuer.
          {' '}
          <Bouton taille="s" titre="Se reconnecter"
                  onClick={() => window.location.reload()} />
        </Alerte>
      </div>
    );
  }
  return null;
}

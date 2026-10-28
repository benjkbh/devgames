import {
  createContext, useContext, useEffect, useRef, useState,
} from 'react';

import { IcoMuet, IcoSon, cx, usePreference } from '@ui';
import {
  CLE_EFFETS, CLE_MUET, CLE_VOLUME, musique,
} from './ambiance';

// Musique d'ambiance du module UNO, en deux morceaux :
//   `SonUno`  le moteur, monté une fois à la racine du module : le son part
//             dès l'ouverture du module (le clic sur UNO dans le menu a déjà
//             amorcé le moteur, `amorcerMusique`) ; si le navigateur le
//             refuse encore, il part au premier clic ou à la première touche
//             dans le module (sauf si tout est coupé). Quitter le module
//             descend le son en fondu, y revenir le remonte, sans coupure ;
//             `Table` y choisit le morceau (veillée ou partie) ;
//   `Lecteur` le contrôle, posé dans l'en-tête de chaque page : bouton son /
//             muet, curseur de volume et, en barre, interrupteur des
//             bruitages. Volume, silence et bruitages sont des préférences du
//             poste. Hors de `SonUno` (page du spectateur), il ne rend rien.

const VOLUMES = Array.from({ length: 101 }, (_, i) => String(i));
const ContexteSon = createContext(null);

export function SonUno({ children }) {
  const [volume, setVolume] = usePreference(CLE_VOLUME, '40', VOLUMES);
  const [muet, setMuet] = usePreference(CLE_MUET, '0', ['0', '1']);
  const [effets, setEffets] = usePreference(CLE_EFFETS, '1', ['0', '1']);
  const [joue, setJoue] = useState(false);
  const [erreur, setErreur] = useState('');
  // Le contrôle visible : un geste sur lui est laissé à ses boutons.
  const controle = useRef(null);
  const estMuet = muet === '1';
  const avecEffets = effets === '1';
  // Le moteur sert aussi aux bruitages : il est lancé si l'un des deux vit.
  const veutDuSon = !estMuet || avecEffets;

  const lancer = async () => {
    try {
      musique.regler({
        volume: Number(volume) / 100, muet: estMuet, effets: avecEffets,
      });
      await musique.demarrer();
      setJoue(musique.ctx.state === 'running');
      // Suit le contexte : suspendu par le navigateur, puis repris.
      musique.ctx.onstatechange = () => setJoue(
        Boolean(musique.ctx) && musique.ctx.state === 'running',
      );
    } catch (e) {
      setErreur(e.message);
    }
  };

  // Ouverture du module : le son monte (sauf si tout est coupé).
  useEffect(() => {
    if (veutDuSon) lancer();
    return () => musique.arreter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigateur qui refuse le son sans geste : le premier geste dans la page
  // lance la musique.
  useEffect(() => {
    if (!veutDuSon || joue) return undefined;
    const geste = (e) => {
      if (controle.current && controle.current.contains(e.target)) return;
      lancer();
    };
    document.addEventListener('pointerdown', geste);
    document.addEventListener('keydown', geste);
    return () => {
      document.removeEventListener('pointerdown', geste);
      document.removeEventListener('keydown', geste);
    };
  }, [veutDuSon, joue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    musique.regler({
      volume: Number(volume) / 100, muet: estMuet, effets: avecEffets,
    });
  }, [volume, estMuet, avecEffets]);

  const basculer = () => {
    if (estMuet) {
      setMuet('0');
      musique.regler({ muet: false });
      lancer();
    } else if (!joue) {
      lancer();
    } else {
      setMuet('1');
    }
  };
  const basculerEffets = () => {
    setEffets(avecEffets ? '0' : '1');
    if (!avecEffets && !joue) lancer();
  };

  const son = {
    volume, setVolume, estMuet, avecEffets, joue, erreur, controle,
    basculer, basculerEffets,
  };
  return <ContexteSon.Provider value={son}>{children}</ContexteSon.Provider>;
}

// `variante` : barre (accueil : libellé, volume, bruitages) ou compact (à la
// table : bouton et volume).
export default function Lecteur({ variante = 'barre' }) {
  const son = useContext(ContexteSon);
  if (!son) return null;
  const {
    volume, setVolume, estMuet, avecEffets, joue, erreur, controle, basculer,
    basculerEffets,
  } = son;
  const coupe = estMuet || !joue;
  const enLecture = joue && !estMuet && Number(volume) > 0;
  let titre = coupe ? 'Lancer la musique' : 'Couper la musique';
  if (erreur) titre = `${titre} (${erreur})`;

  return (
    <div ref={controle} role="group" aria-label="Musique d’ambiance"
         className={cx('uno-lecteur', `uno-lecteur-${variante}`, enLecture && 'joue')}>
      <button type="button" className="uno-lecteur-bouton" onClick={basculer}
              aria-pressed={!coupe} aria-label={titre} title={titre}>
        {coupe ? <IcoMuet /> : <IcoSon />}
      </button>
      {variante === 'barre' && <span className="uno-lecteur-titre" aria-hidden="true">Musique</span>}
      <label className="uno-lecteur-volume">
        <span className="sr">Volume de la musique</span>
        <input type="range" min="0" max="100" step="1" value={volume}
               disabled={estMuet} title={`${volume} %`}
               onChange={(e) => setVolume(e.target.value)} />
      </label>
      {variante === 'barre' && (
        <label className="uno-lecteur-effets">
          <input type="checkbox" checked={avecEffets} onChange={basculerEffets} />
          Bruitages
        </label>
      )}
    </div>
  );
}

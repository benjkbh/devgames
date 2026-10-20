import { useEffect, useRef, useState } from 'react';

import { IcoMuet, IcoSon, cx, usePreference } from '../../ui';
import {
  CLE_EFFETS, CLE_MUET, CLE_VOLUME, musique,
} from './ambiance';

// Lecteur de la musique d'ambiance du module UNO, fixé en bas à droite :
// grand bouton son / muet, curseur de volume, égaliseur animé pendant la
// lecture, interrupteur des bruitages de cartes. Volume, silence et bruitages
// sont des préférences du poste. Le son part dès l'ouverture du module (le
// clic sur UNO dans le menu a déjà amorcé le moteur, `amorcerMusique`) ; si le
// navigateur le refuse encore, il part au premier clic ou à la première touche
// dans le module (sauf si tout est coupé). Le moteur (`musique`) est unique :
// quitter le module descend le son en fondu, y revenir le remonte, sans
// coupure ; `Table` y choisit le morceau (veillée ou partie).

const VOLUMES = Array.from({ length: 101 }, (_, i) => String(i));

export default function Lecteur() {
  const [volume, setVolume] = usePreference(CLE_VOLUME, '40', VOLUMES);
  const [muet, setMuet] = usePreference(CLE_MUET, '0', ['0', '1']);
  const [effets, setEffets] = usePreference(CLE_EFFETS, '1', ['0', '1']);
  const [joue, setJoue] = useState(false);
  const [erreur, setErreur] = useState('');
  const cadre = useRef(null);
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
  // lance la musique. Un geste sur le lecteur lui-même est laissé à son
  // bouton.
  useEffect(() => {
    if (!veutDuSon || joue) return undefined;
    const geste = (e) => {
      if (cadre.current && cadre.current.contains(e.target)) return;
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

  const enLecture = joue && !estMuet && Number(volume) > 0;
  let etat = 'Cliquez pour lancer';
  if (erreur) etat = erreur;
  else if (estMuet) etat = 'Coupée';
  else if (joue) etat = Number(volume) > 0 ? 'Veillée à Thiercelieux' : 'Volume à zéro';

  return (
    <aside ref={cadre} className={cx('uno-lecteur', enLecture && 'joue')}
           aria-label="Musique d’ambiance">
      <button type="button" className="uno-lecteur-bouton" onClick={basculer}
              aria-pressed={!estMuet && joue}
              aria-label={estMuet || !joue ? 'Lancer la musique' : 'Couper la musique'}
              title={estMuet || !joue ? 'Lancer la musique' : 'Couper la musique'}>
        {estMuet || !joue ? <IcoMuet /> : <IcoSon />}
      </button>
      <div className="uno-lecteur-corps">
        <div className="uno-lecteur-tete">
          <span className="uno-lecteur-titre">Musique</span>
          <span className="uno-lecteur-egaliseur" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
        </div>
        <span className="uno-lecteur-etat" aria-live="polite">{etat}</span>
        <button type="button" className="uno-lecteur-effets"
                aria-pressed={avecEffets}
                onClick={() => {
                  setEffets(avecEffets ? '0' : '1');
                  if (!avecEffets && !joue) lancer();
                }}>
          <span className="uno-lecteur-effets-coche" aria-hidden="true" />
          Bruitages des cartes
        </button>
        <label className="uno-lecteur-volume">
          <span className="sr">Volume de la musique</span>
          <input type="range" min="0" max="100" step="1" value={volume}
                 disabled={estMuet}
                 onChange={(e) => setVolume(e.target.value)} />
          <span className="uno-lecteur-pourcent" aria-hidden="true">{`${volume} %`}</span>
        </label>
      </div>
    </aside>
  );
}

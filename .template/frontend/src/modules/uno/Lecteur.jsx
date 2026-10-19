import { useEffect, useRef, useState } from 'react';

import { IcoMuet, IcoSon, cx, usePreference } from '../../ui';
import { Ambiance } from './ambiance';

// Lecteur de la musique d'ambiance du module UNO, fixé en bas à droite :
// grand bouton son / muet, curseur de volume, égaliseur animé pendant la
// lecture. Volume et silence sont des préférences du poste. Le navigateur
// n'autorise le son qu'après un geste : la musique part au premier clic ou à
// la première touche dans le module (sauf en muet). Elle s'arrête quand on
// quitte le module (démontage).

const VOLUMES = Array.from({ length: 101 }, (_, i) => String(i));

export default function Lecteur() {
  const [volume, setVolume] = usePreference('uno-musique-volume', '40', VOLUMES);
  const [muet, setMuet] = usePreference('uno-musique-muet', '0', ['0', '1']);
  const [joue, setJoue] = useState(false);
  const [erreur, setErreur] = useState('');
  const moteur = useRef(null);
  const cadre = useRef(null);
  const estMuet = muet === '1';

  const lancer = async () => {
    try {
      if (!moteur.current) moteur.current = new Ambiance();
      moteur.current.regler({ volume: Number(volume) / 100, muet: estMuet });
      await moteur.current.demarrer();
      setJoue(true);
    } catch (e) {
      setErreur(e.message);
    }
  };

  // Premier geste dans la page : la musique démarre (sauf en muet). Un geste
  // sur le lecteur lui-même est laissé à son bouton.
  useEffect(() => {
    if (estMuet || joue) return undefined;
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
  }, [estMuet, joue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (moteur.current) {
      moteur.current.regler({ volume: Number(volume) / 100, muet: estMuet });
    }
  }, [volume, estMuet]);

  useEffect(() => () => {
    if (moteur.current) moteur.current.arreter();
  }, []);

  const basculer = () => {
    if (estMuet) {
      setMuet('0');
      if (!joue) lancer();
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
  else if (joue) etat = Number(volume) > 0 ? 'Nuit sur Thiercelieux' : 'Volume à zéro';

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

import { useState } from 'react';

import {
  Badge, Dialogue, IcoEclair, IcoPioche, TuileChoix, cx,
} from '@ui';
import { REGLES, nombreVariantes } from './regles';

// Les règles d'une table de UNO, sous trois formes : les tuiles à cocher de
// l'hôte (création de la table, salle d'attente, fin de manche), le
// récapitulatif des autres joueurs, et le rappel des règles de base.

// Pictogramme de chaque règle : une icône, ou les chiffres en jeu.
const PICTOS = {
  pioche_jusqua: <IcoPioche />,
  sept_zero: '7·0',
  rapidite: <IcoEclair />,
  suites: '5·6·7',
};

// Tuiles à cocher. `colonne` : une tuile par ligne (panneau latéral).
export function ChoixRegles({
  regles, onChange, colonne, disabled,
}) {
  return (
    <div className={cx('tuiles-choix', colonne && 'uno-regles-colonne')}>
      {REGLES.map(({ cle, titre, court }) => (
        <TuileChoix key={cle} icone={PICTOS[cle]} titre={titre} description={court}
                    checked={Boolean(regles && regles[cle])} disabled={disabled}
                    onChange={(v) => onChange({ ...regles, [cle]: v })} />
      ))}
    </div>
  );
}

// Récapitulatif, pour qui ne choisit pas : classiques ou variantes, puis
// chaque règle, oui ou non.
export function RecapRegles({ regles }) {
  const variantes = nombreVariantes(regles);
  return (
    <div className="uno-recap">
      <p className="uno-recap-tete">
        <Badge couleur="or" titre={variantes ? 'Variantes' : 'Classiques'} />
        <span className="dim">{variantes || 'Aucune variante'}</span>
      </p>
      <dl className="uno-recap-liste">
        {REGLES.map(({ cle, titre, court }) => {
          const oui = Boolean(regles && regles[cle]);
          return (
            <div key={cle} className={cx('uno-recap-ligne', oui && 'active')}>
              <dt title={court}>{titre}</dt>
              <dd><Badge couleur={oui ? 'vert' : 'bleu'} titre={oui ? 'Oui' : 'Non'} /></dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

// Lien qui ouvre le rappel des règles de base, et des variantes.
export function RappelRegles() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" className="uno-lien" onClick={() => setOuvert(true)}>
        Rappel des règles du UNO
      </button>
      <Dialogue ouvert={ouvert} titre="Les règles du UNO" onFermer={() => setOuvert(false)}>
        <div className="uno-rappel">
          <p>
            Chacun reçoit 7 cartes. À son tour, on pose une carte de la même
            couleur ou de la même valeur que celle du dessus de la défausse ;
            sinon, on pioche. Le premier à poser toutes ses cartes gagne la
            manche et marque les points des cartes restées dans les mains.
          </p>
          <ul>
            <li><strong>Passe</strong> : le joueur suivant passe son tour.</li>
            <li><strong>Inversion</strong> : le sens du jeu change.</li>
            <li><strong>+2</strong> : le suivant pioche 2 cartes et passe son tour.</li>
            <li><strong>Joker</strong> : on annonce la couleur suivante.</li>
            <li><strong>+4</strong> : on annonce la couleur ; le suivant pioche 4 cartes.</li>
            <li>
              <strong>UNO !</strong>
              {' '}
              : à une carte, il faut l’annoncer ; qui l’oublie et se fait
              contrer pioche 2 cartes.
            </li>
          </ul>
          <h3>Variantes</h3>
          <ul>
            {REGLES.map(({ cle, titre, aide }) => (
              <li key={cle}><strong>{titre}</strong>{` : ${aide}`}</li>
            ))}
          </ul>
        </div>
      </Dialogue>
    </>
  );
}

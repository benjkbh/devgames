import { Link, useParams } from 'react-router-dom';

import {
  Alerte, Badge, Carte, Chargement, EtatVide, IcoCarteRole, Page, Sr,
  useLecture, useTheme,
} from '../../ui';
import { lireSpectateur } from './api';
import { Scores } from './Table';
import { Tapis } from './Tapis';
import './uno.css';

// Regarder une table sans compte : page publique (`/spectateur/<code>`, hors
// authentification), ouverte avec le code ou le lien de la table. On voit le
// tapis, les joueurs et le nombre de leurs cartes, jamais une main. La table
// est relue chaque seconde ; aucune musique.

const SONDAGE = 1000;

export default function Spectateur() {
  const { code } = useParams();
  useTheme();
  const { donnees: table, erreur } = useLecture(lireSpectateur, { code }, SONDAGE);

  if (!table && erreur) {
    return (
      <div id="zone">
        <Page>
          <EtatVide titre="Table introuvable" icone={<IcoCarteRole />}>
            {erreur}
            {' '}
            <Link to="/uno">Aller au UNO</Link>
          </EtatVide>
        </Page>
      </div>
    );
  }
  if (!table) {
    return <div id="zone"><Page><Chargement texte="Arrivée à la table…" /></Page></div>;
  }

  const p = table.partie;
  let message = '';
  if (p) message = p.gagnant ? `${p.gagnant} remporte la manche !` : `${p.tour} joue…`;

  return (
    <div id="zone">
      <Page className="uno-page uno-spectateur">
        <header className="uno-barre">
          <Badge couleur="bleu" majuscules titre="Spectateur" />
          <h1 className="uno-barre-titre">
            {table.nom}
            <Sr>{`, table ${table.code}`}</Sr>
          </h1>
          <span className="uno-barre-code" aria-hidden="true">{table.code}</span>
          {table.manches > 0 && <Badge titre={`Manche ${table.manches}`} />}
          <Link to={`/uno/${table.code}`} className="uno-retour uno-jouer">
            Jouer à cette table
          </Link>
        </header>
        {erreur && <Alerte niveau="attention" compacte>{`Connexion perturbée : ${erreur}`}</Alerte>}

        {p ? (
          <div className="uno-plateau">
            <Tapis table={table} partie={p} moi={null} message={message}>
              {p.gagnant && (
                <Carte titre="Fin de la manche" className="uno-fin">
                  <p className="uno-fin-titre">
                    {`${p.gagnant} remporte la manche et marque ${p.points} points.`}
                  </p>
                  <Scores table={table} />
                </Carte>
              )}
            </Tapis>
            <details className="uno-journal">
              <summary>Journal de la manche</summary>
              <ol>
                {p.journal.slice().reverse().map((ligne, i) => (
                  <li key={`${p.journal.length - i}-${ligne}`}>{ligne}</li>
                ))}
              </ol>
            </details>
          </div>
        ) : (
          <Carte titre={`Joueurs (${table.joueurs.length})`} className="uno-invitation">
            <Scores table={table} />
            <p className="dim">En attente de la distribution des cartes par l’hôte.</p>
          </Carte>
        )}
      </Page>
    </div>
  );
}

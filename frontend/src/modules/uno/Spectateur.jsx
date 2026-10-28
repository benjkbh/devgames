import { Link, useParams } from 'react-router-dom';

import {
  Alerte, Carte, Chargement, EtatVide, IcoCarteRole, Page, useLecture,
  useTheme,
} from '@ui';
import { lireSpectateur } from './api';
import { JournalManche, OrdreJeu } from './Cote';
import { RappelRegles, RecapRegles } from './ReglesUno';
import { AutourTable, EnTete } from './Salle';
import { Scores } from './Table';
import { Tapis } from './Tapis';
import './uno.css';

// Regarder une table sans compte : page publique (`/spectateur/<code>`, hors
// authentification), ouverte avec le code ou le lien de la table. Même
// disposition que pour les joueurs : le tapis, et à sa droite l'ordre de jeu
// et le journal ; avant la donne, les places et les règles. On voit le nombre
// de cartes de chacun, jamais une main. La table est relue chaque seconde ;
// aucune musique.

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
        <EnTete table={table} spectateur
                actions={(
                  <Link to={`/uno/${table.code}`} className="btn btn-secondaire btn-sang btn-m">
                    Jouer à cette table
                  </Link>
                )} />
        {erreur && <Alerte niveau="attention" compacte>{`Connexion perturbée : ${erreur}`}</Alerte>}

        {p ? (
          <div className="uno-jeu">
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
            </div>
            <aside className="uno-jeu-cote" aria-label="Déroulement de la manche">
              <OrdreJeu table={table} partie={p} />
              <JournalManche table={table} partie={p} />
            </aside>
          </div>
        ) : (
          <div className="uno-salle">
            <div className="uno-salle-principal">
              <AutourTable table={table} />
              <p className="dim uno-attente-texte">
                {`En attente de la distribution des cartes par ${table.hote}.`}
              </p>
            </div>
            <aside className="uno-salle-cote" aria-label="Table">
              <Carte titre="Règles de la table"
                     actions={<span className="dim uno-note">Choisies par l’hôte</span>}>
                <RecapRegles regles={table.regles} />
                <RappelRegles />
              </Carte>
            </aside>
          </div>
        )}
      </Page>
    </div>
  );
}

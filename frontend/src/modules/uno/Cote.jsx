import {
  Avatar, Badge, Carte, Journal, cx,
} from '@ui';

// Colonne à droite du tapis, commune au joueur et au spectateur : l'ordre de
// jeu (qui joue, qui suit, combien de cartes) et le journal de la manche.

const present = (table, nom) => !table.presents || table.presents[nom] !== false;
const cartes = (n) => `${n} carte${n > 1 ? 's' : ''}`;

// Joueurs dans l'ordre où ils vont jouer, en commençant par celui qui a la
// main ; manche finie, dans l'ordre de la table.
function ordreDeJeu(p) {
  const n = p.joueurs.length;
  const i = p.tour ? p.joueurs.findIndex((j) => j.nom === p.tour) : -1;
  if (i < 0) return p.joueurs;
  const pas = p.sens < 0 ? -1 : 1;
  return Array.from({ length: n }, (_, k) => p.joueurs[(((i + k * pas) % n) + n) % n]);
}

export function OrdreJeu({ table, partie: p }) {
  const ordre = ordreDeJeu(p);
  const scores = Object.entries(table.scores || {});
  return (
    <Carte titre="Ordre de jeu" className="uno-ordre">
      <ol className="uno-ordre-liste">
        {ordre.map((j, k) => {
          const courant = j.nom === p.tour;
          const ici = present(table, j.nom);
          let etat = '';
          if (p.gagnant === j.nom) etat = 'Gagne la manche';
          else if (courant) etat = 'Joue';
          else if (p.tour && k === 1) etat = 'Joue ensuite';
          if (!ici) etat = etat ? `${etat} · absent` : 'Absent';
          return (
            <li key={j.nom} className={cx('uno-ordre-ligne', courant && 'courant')}
                aria-current={courant ? 'true' : undefined}>
              <Avatar nom={j.nom} taille="s" presence={ici} couleur={courant ? 'or' : 'neutre'} />
              <span className="uno-ordre-nom">
                <span>
                  {j.nom}
                  {j.nom === table.moi && <span className="dim"> (vous)</span>}
                </span>
                {etat && <span className="uno-ordre-etat">{etat}</span>}
              </span>
              <span className="uno-ordre-cartes">
                {j.uno && <Badge couleur="rouge" majuscules titre="UNO" />}
                {cartes(j.cartes)}
              </span>
            </li>
          );
        })}
      </ol>
      {scores.length > 0 && (
        <p className="uno-ordre-score">
          {'Score de la partie : '}
          {scores.map(([nom, points]) => `${nom} ${points}`).join(' · ')}
        </p>
      )}
    </Carte>
  );
}

// Couleur de carte citée par une ligne du journal (« ana pose 7 rouge. »).
const COULEUR = /\b(rouge|jaune|vert|bleu)\b/i;

export function JournalManche({ table, partie: p }) {
  const evenements = [];
  if (p.gagnant) {
    evenements.push({
      cle: 'fin', ton: 'actif', contenu: <strong>{`${p.gagnant} remporte la manche`}</strong>,
    });
  } else if (p.tour) {
    evenements.push({
      cle: 'tour',
      ton: 'actif',
      contenu: (
        <>
          <strong>{`Au tour de ${p.tour}`}</strong>
          {!present(table, p.tour) && ' · absent'}
        </>
      ),
    });
  }
  const lignes = p.journal.slice().reverse();
  lignes.forEach((ligne, i) => {
    const m = ligne.match(COULEUR);
    evenements.push({
      cle: `${lignes.length - i}-${ligne}`,
      contenu: ligne,
      couleur: m ? `var(--uno-${m[1].toLowerCase()})` : undefined,
    });
  });
  return (
    <Carte titre="Journal de la manche" className="uno-journal">
      <Journal evenements={evenements} libelle="Journal de la manche" />
    </Carte>
  );
}

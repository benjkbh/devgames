import {
  Badge, Bouton, Carte, Journal, cx,
} from '@ui';
import { cibler, piocher, rester, suivante } from './api';
import { CarteF7 } from './decor';

// La piste de Flip 7 : chaque joueur aligne ses cartes ; au joueur au trait
// de piocher ou de s'arrêter, à celui qui a tiré un Gel ou un
// Trois-à-la-suite de choisir sa cible. Entre deux manches, le bilan. À
// droite, les scores vers 200 et le journal.

const ETATS = {
  actif: ['En lice', 'bleu'],
  reste: ['Arrêté', 'vert'],
  saute: ['Sauté !', 'rouge'],
};

function Ligne({ joueur, partie: p, moi }) {
  const nombres = joueur.ligne.filter((c) => c.type === 'nombre');
  const vus = new Set();
  const [etat, couleur] = ETATS[joueur.etat] || ETATS.actif;
  return (
    <li className={cx('f7-stand', p.tour === joueur.nom && 'au-trait',
      joueur.etat !== 'actif' && joueur.etat)}>
      <div className="f7-stand-tete">
        <span className="f7-stand-nom">
          {joueur.nom}
          {joueur.nom === moi && <span className="dim"> (vous)</span>}
        </span>
        {p.flip7 === joueur.nom
          ? <Badge couleur="or" majuscules titre="Flip 7 !" />
          : <Badge couleur={couleur} titre={etat} />}
        <span className="f7-stand-points" title="Points de la manche">
          {`${joueur.points} pts`}
        </span>
      </div>
      <div className="f7-stand-cartes">
        {joueur.ligne.length === 0 && <span className="dim">Aucune carte</span>}
        {joueur.ligne.map((c) => {
          const doublon = c.type === 'nombre' && vus.has(c.valeur);
          if (c.type === 'nombre') vus.add(c.valeur);
          return <CarteF7 key={c.id} carte={c} doublon={doublon} />;
        })}
      </div>
      <span className="f7-stand-compte dim">{`${new Set(nombres.map((c) => c.valeur)).size} / 7 nombres`}</span>
    </li>
  );
}

// Ce que le joueur peut faire maintenant.
function Commandes({ table, partie: p, onAction }) {
  const moi = p.joueurs.find((j) => j.nom === table.moi);
  const code = table.code;
  if (p.bilan) {
    return (
      <div className="f7-bilan">
        <p className="f7-bilan-titre">{`Fin de la manche ${p.manche}`}</p>
        <ul>
          {p.joueurs.map((j) => (
            <li key={j.nom}>
              <strong>{j.nom}</strong>
              {` +${p.bilan[j.nom] || 0} → ${j.score}`}
            </li>
          ))}
        </ul>
        {table.membre && !p.gagnant && (
          <Bouton variante="principal" taille="l" titre="Manche suivante"
                  onClick={() => onAction(() => suivante(code))} />
        )}
      </div>
    );
  }
  if (p.attente) {
    const a = p.attente;
    const quoi = a.carte === 'gel' ? 'geler' : 'faire tirer trois cartes à';
    if (a.joueur !== table.moi) {
      return <p className="f7-message">{`${a.joueur} choisit qui ${a.carte === 'gel' ? 'geler' : 'tire trois cartes'}…`}</p>;
    }
    return (
      <div className="f7-cibles">
        <p className="f7-message">{`Qui voulez-vous ${quoi} ?`}</p>
        <div className="f7-boutons">
          {p.joueurs.filter((j) => j.etat === 'actif').map((j) => (
            <Bouton key={j.nom} taille="l" variante={j.nom === table.moi ? 'secondaire' : 'principal'}
                    titre={j.nom === table.moi ? `${j.nom} (vous)` : j.nom}
                    onClick={() => onAction(() => cibler(code, j.nom))} />
          ))}
        </div>
      </div>
    );
  }
  if (p.tour === table.moi && moi) {
    return (
      <div className="f7-cibles">
        <p className="f7-message vous">À vous : une carte de plus, ou vous vous arrêtez ?</p>
        <div className="f7-boutons">
          <Bouton variante="principal" taille="l" titre="Piocher"
                  onClick={() => onAction(() => piocher(code))} />
          <Bouton taille="l" titre={`M’arrêter (${moi.points} pts)`}
                  onClick={() => onAction(() => rester(code))} />
        </div>
      </div>
    );
  }
  return <p className="f7-message">{p.tour ? `${p.tour} joue…` : ''}</p>;
}

export default function Plateau({ table, onAction }) {
  const p = table.partie;
  const classement = [...p.joueurs].sort((a, b) => b.score - a.score);
  const evenements = p.journal.slice().reverse().map((ligne, i) => ({
    cle: `${p.journal.length - i}-${ligne}`,
    contenu: ligne,
    ton: i === 0 ? 'actif' : undefined,
  }));
  return (
    <div className="tbl-jeu">
      <section className="f7-piste" aria-label="La piste">
        <div className="f7-guirlande" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => <i key={i} />)}
        </div>
        <header className="f7-piste-tete">
          <span>{`Manche ${p.manche}`}</span>
          <span>{`Donneur : ${p.donneur}`}</span>
          <span>{`Pioche : ${p.pioche}`}</span>
          <span>{`Objectif : ${p.objectif} pts`}</span>
        </header>
        <Commandes table={table} partie={p} onAction={onAction} />
        <ul className="f7-stands">
          {p.joueurs.map((j) => <Ligne key={j.nom} joueur={j} partie={p} moi={table.moi} />)}
        </ul>
      </section>
      <aside className="tbl-jeu-cote" aria-label="Scores et journal">
        <Carte titre="Scores">
          <ol className="tbl-scores">
            {classement.map((j) => (
              <li key={j.nom} className={cx(p.tour === j.nom && 'courant')}>
                <span className="nom">{j.nom}</span>
                <span className="f7-jauge" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, (j.score / p.objectif) * 100)}%` }} />
                </span>
                <span className="valeur">{j.score}</span>
              </li>
            ))}
          </ol>
        </Carte>
        <Carte titre="Journal">
          <Journal evenements={evenements} libelle="Journal de la partie" />
        </Carte>
      </aside>
    </div>
  );
}

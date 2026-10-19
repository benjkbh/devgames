import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Alerte, Badge, Bouton, Carte, CarteJeu, ChampCopiable, Chargement,
  Confirmation, COULEURS_UNO, Dialogue, EtatVide, Eventail, IcoCarteRole,
  IcoRecharger, IcoSortie, Page, Pastille, Sr, VALEURS_UNO, cx, useAction,
  useLecture,
} from '../../ui';
import {
  contrer, direUno, jouer, lancer, lienTable, lireTable, passer, piocher,
  quitter, rejoindre,
} from './api';

// Une table : salle d'attente (lien à partager, joueurs, lancement par
// l'hôte), puis plateau de jeu, puis résultat de la manche.

const SONDAGE = 1000;
const ORDRE_COULEURS = [...COULEURS_UNO, 'noir'];
// Pastille de la couleur demandée, dans la teinte des cartes.
const PASTILLES = { rouge: 'sang', jaune: 'or', vert: 'vert', bleu: 'bleu' };

// Main triée par couleur puis par valeur, pour s'y retrouver.
const trier = (main) => main.slice().sort((a, b) => (
  ORDRE_COULEURS.indexOf(a.couleur) - ORDRE_COULEURS.indexOf(b.couleur)
  || VALEURS_UNO.indexOf(a.valeur) - VALEURS_UNO.indexOf(b.valeur)));

// Joueurs dans l'ordre de la table, en commençant après `moi`.
function apresMoi(joueurs, moi) {
  const i = joueurs.findIndex((j) => j.nom === moi);
  return i < 0 ? joueurs : [...joueurs.slice(i + 1), ...joueurs.slice(0, i)];
}

function Partage({ code }) {
  return (
    <div className="uno-partage">
      <div className="uno-code">
        <span className="uno-code-libelle">Code de la table</span>
        <span className="uno-code-valeur">{code}</span>
      </div>
      <div className="uno-partage-lien">
        <span className="uno-code-libelle">Lien à partager</span>
        <ChampCopiable valeur={lienTable(code)} libelle="Lien de la table" />
      </div>
    </div>
  );
}

// Joueur à la table (son interface relit la table) ou absent (onglet fermé,
// réseau coupé) : pastille et texte pour les lecteurs d'écran.
function Presence({ table, nom }) {
  const present = !table.presents || table.presents[nom] !== false;
  return (
    <span className={cx('uno-presence', !present && 'absent')}
          title={present ? 'À la table' : 'Absent : déconnecté de la table'}>
      <Pastille couleur={present ? 'vert' : 'gris'} compact />
      <Sr>{present ? ' (à la table)' : ' (absent)'}</Sr>
      {!present && <span className="uno-presence-texte" aria-hidden="true">absent</span>}
    </span>
  );
}

function Scores({ table }) {
  const lignes = Object.entries(table.scores).sort((a, b) => b[1] - a[1]);
  return (
    <ol className="uno-scores">
      {lignes.map(([nom, points]) => (
        <li key={nom}>
          <span className="uno-scores-nom">
            <Presence table={table} nom={nom} />
            {nom}
            {nom === table.hote && <Badge couleur="orange" majuscules titre="hôte" />}
            {nom === table.moi && <span className="dim"> (vous)</span>}
          </span>
          <span className="uno-scores-points">{`${points} pts`}</span>
        </li>
      ))}
    </ol>
  );
}

// -- avant la première manche, ou pour qui n'est pas assis -------------------

function Invitation({ table, onAssis }) {
  const action = useAction();
  const pleine = table.joueurs.length >= table.max_joueurs;
  const s = async () => {
    const r = await action.executer(() => rejoindre(table.code));
    if (r.ok) onAssis();
  };
  return (
    <Carte titre="Invitation" className="uno-invitation">
      <p className="uno-invitation-nom">{table.nom}</p>
      <p className="dim">
        {`Hôte : ${table.hote} · ${table.joueurs.length} joueur(s) : `
          + `${table.joueurs.join(', ')}`}
      </p>
      {table.etat === 'partie' && (
        <Alerte niveau="info" compacte>
          Une manche est en cours : vous pourrez vous asseoir à la fin.
        </Alerte>
      )}
      {action.erreur && <Alerte compacte>{action.erreur}</Alerte>}
      <Bouton variante="principal" taille="l" waiting={action.occupe}
              disabled={pleine || table.etat === 'partie'}
              titre={pleine ? 'Table complète' : 'S’asseoir à la table'}
              onClick={s} />
    </Carte>
  );
}

export function SalleAttente({ table, onAction }) {
  const hote = table.hote === table.moi;
  const assez = table.joueurs.length >= table.min_joueurs;
  return (
    <div className="uno-attente">
      <Partage code={table.code} />
      <Carte titre={`Joueurs (${table.joueurs.length} / ${table.max_joueurs})`}>
        <Scores table={table} />
      </Carte>
      <div className="uno-attente-actions">
        {hote ? (
          <Bouton variante="principal" taille="l" icone={<IcoCarteRole />}
                  disabled={!assez} onClick={() => onAction(() => lancer(table.code))}
                  titre={assez ? 'Distribuer les cartes'
                    : `Encore ${table.min_joueurs - table.joueurs.length} joueur(s)…`} />
        ) : (
          <p className="dim">{`En attente de ${table.hote}, qui distribuera les cartes.`}</p>
        )}
      </div>
    </div>
  );
}

// -- plateau -------------------------------------------------------------------

function Adversaire({ joueur, table, actif, onContrer }) {
  const visibles = Math.min(joueur.cartes, 10);
  return (
    <li className={cx('uno-adversaire', actif && 'actif',
      table.presents && table.presents[joueur.nom] === false && 'absent')}
        aria-current={actif ? 'true' : undefined}>
      <div className="uno-adversaire-tete">
        <Presence table={table} nom={joueur.nom} />
        <span className="uno-adversaire-nom">{joueur.nom}</span>
        {joueur.uno && <Badge couleur="rouge" majuscules titre="UNO" />}
      </div>
      <Eventail chevauchement={0.7} className="uno-adversaire-main">
        {Array.from({ length: visibles }, (_, i) => (
          <CarteJeu key={i} face="verso" taille="xs" />
        ))}
      </Eventail>
      <span className="uno-adversaire-compte">
        {`${joueur.cartes} carte${joueur.cartes > 1 ? 's' : ''}`}
      </span>
      {joueur.expose && (
        <Bouton taille="s" couleur="rouge" variante="principal"
                titre="Contre-UNO !" onClick={() => onContrer(joueur.nom)} />
      )}
    </li>
  );
}

function ChoixCouleur({ ouvert, onChoisir, onFermer }) {
  return (
    <Dialogue ouvert={ouvert} titre="Quelle couleur annoncez-vous ?"
              onFermer={onFermer}>
      <div className="uno-couleurs">
        {COULEURS_UNO.map((c) => (
          <button key={c} type="button" className={`uno-couleur uno-couleur-${c}`}
                  onClick={() => onChoisir(c)}>
            {c}
          </button>
        ))}
      </div>
    </Dialogue>
  );
}

export function Plateau({ table, onAction }) {
  const p = table.partie;
  const [joker, setJoker] = useState(null);
  const moi = p.joueurs.find((j) => j.nom === table.moi);
  const monTour = p.tour === table.moi;
  const finie = Boolean(p.gagnant);
  const main = trier(p.main);
  const code = table.code;
  const peutPiocher = monTour && p.pioche_jouable === null;
  const peutUno = !p.uno_annonce && !finie
    && (main.length === 1 || (main.length === 2 && monTour));

  const poser = (carte, couleur) => onAction(
    () => jouer(code, carte.id, couleur, false),
  );
  const cliquer = (carte) => {
    if (carte.couleur === 'noir') setJoker(carte);
    else poser(carte);
  };

  let message;
  if (finie) message = `${p.gagnant} remporte la manche !`;
  else if (monTour && p.pioche_jouable !== null) message = 'Posez la carte piochée, ou passez.';
  else if (monTour) message = 'À vous de jouer.';
  else message = `${p.tour} joue…`;

  return (
    <div className="uno-plateau">
      <ul className="uno-adversaires" aria-label="Adversaires">
        {apresMoi(p.joueurs, table.moi).map((j) => (
          <Adversaire key={j.nom} joueur={j} table={table} actif={p.tour === j.nom}
                      onContrer={(cible) => onAction(() => contrer(code, cible))} />
        ))}
      </ul>

      <div className={cx('uno-centre', `uno-centre-${p.couleur}`)}>
        <div className="uno-pile">
          <CarteJeu face="verso" taille="l" desactivee={!peutPiocher}
                    jouable={peutPiocher && p.jouables.length === 0}
                    libelle={`Piocher une carte (${p.pioche} restantes)`}
                    onClick={() => onAction(() => piocher(code))} />
          <span className="uno-pile-libelle">{`Pioche · ${p.pioche}`}</span>
        </div>
        <div className="uno-pile">
          <CarteJeu taille="l" couleur={p.dessus.couleur} valeur={p.dessus.valeur}
                    couleurChoisie={p.dessus.couleur === 'noir' ? p.couleur : undefined} />
          <span className="uno-pile-libelle">Défausse</span>
        </div>
        <div className="uno-etat">
          <p className={cx('uno-message', monTour && !finie && 'uno-message-tour')}
             aria-live="polite">
            {message}
          </p>
          <p className="uno-indic">
            <Pastille couleur={PASTILLES[p.couleur]} />
            {`Couleur : ${p.couleur}`}
          </p>
          <p className="uno-indic">
            <IcoRecharger className={cx('uno-sens', p.sens < 0 && 'uno-sens-inverse')} />
            {p.sens > 0 ? 'Sens horaire' : 'Sens antihoraire'}
          </p>
        </div>
      </div>

      {finie ? (
        <Carte titre="Fin de la manche" className="uno-fin">
          <p className="uno-fin-titre">
            {`${p.gagnant} remporte la manche et marque ${p.points} points.`}
          </p>
          <Scores table={table} />
          {table.hote === table.moi ? (
            <Bouton variante="principal" taille="l" icone={<IcoCarteRole />}
                    disabled={table.joueurs.length < table.min_joueurs}
                    titre="Nouvelle manche"
                    onClick={() => onAction(() => lancer(code))} />
          ) : (
            <p className="dim">{`${table.hote} peut relancer une manche.`}</p>
          )}
        </Carte>
      ) : (
        <section className={cx('uno-joueur', monTour && 'actif')}
                 aria-label="Votre main">
          <div className="uno-joueur-tete">
            <span className="uno-adversaire-nom">
              {`${table.moi} · ${main.length} carte${main.length > 1 ? 's' : ''}`}
            </span>
            {moi && moi.expose && (
              <Alerte niveau="attention" compacte>
                Vous n’avez pas dit UNO : vite, avant d’être contré !
              </Alerte>
            )}
            <div className="uno-joueur-actions">
              <Bouton variante="principal" couleur="rouge" titre="UNO !"
                      disabled={!peutUno}
                      onClick={() => onAction(() => direUno(code))} />
              {p.uno_annonce && <Badge couleur="rouge" majuscules titre="UNO annoncé" />}
              {monTour && p.pioche_jouable !== null && (
                <Bouton titre="Passer" onClick={() => onAction(() => passer(code))} />
              )}
            </div>
          </div>
          <Eventail arc chevauchement={main.length > 12 ? 0.6 : 0.4}
                    libelle="Vos cartes" className="uno-main">
            {main.map((c) => {
              const ok = p.jouables.includes(c.id);
              return (
                <CarteJeu key={c.id} taille="l" couleur={c.couleur} valeur={c.valeur}
                          jouable={ok} desactivee={!ok}
                          onClick={() => cliquer(c)} />
              );
            })}
          </Eventail>
        </section>
      )}

      <details className="uno-journal">
        <summary>Journal de la manche</summary>
        <ol>
          {p.journal.slice().reverse().map((ligne, i) => (
            <li key={`${p.journal.length - i}-${ligne}`}>{ligne}</li>
          ))}
        </ol>
      </details>

      <ChoixCouleur ouvert={Boolean(joker)} onFermer={() => setJoker(null)}
                    onChoisir={(c) => { const carte = joker; setJoker(null); poser(carte, c); }} />
    </div>
  );
}

// -- page -------------------------------------------------------------------

export default function Table() {
  const { code } = useParams();
  const naviguer = useNavigate();
  const [sortie, setSortie] = useState(false);
  const { donnees: table, erreur, relire } = useLecture(lireTable, { code }, SONDAGE);
  const action = useAction();

  const agir = async (appel) => {
    const r = await action.executer(appel);
    relire();
    return r;
  };
  const partir = async () => {
    const r = await action.executer(() => quitter(code));
    if (r.ok) naviguer('/uno');
  };

  if (!table && erreur) {
    return (
      <Page>
        <EtatVide titre="Table introuvable" icone={<IcoCarteRole />}>
          {erreur}
          {' '}
          <Link to="/uno">Revenir à l’accueil du UNO</Link>
        </EtatVide>
      </Page>
    );
  }
  if (!table) return <Page><Chargement texte="Arrivée à la table…" /></Page>;

  let contenu;
  if (!table.membre) contenu = <Invitation table={table} onAssis={relire} />;
  else if (!table.partie) contenu = <SalleAttente table={table} onAction={agir} />;
  else contenu = <Plateau table={table} onAction={agir} />;

  return (
    <Page className="uno-page">
      <header className="uno-barre">
        <Link to="/uno" className="uno-retour">UNO</Link>
        <h1 className="uno-barre-titre">
          {table.nom}
          <Sr>{`, table ${table.code}`}</Sr>
        </h1>
        <span className="uno-barre-code" aria-hidden="true">{table.code}</span>
        {table.manches > 0 && <Badge titre={`Manche ${table.manches}`} />}
        {table.membre && (
          <Bouton variante="fantome" taille="s" icone={<IcoSortie />}
                  titre="Quitter la table" onClick={() => setSortie(true)} />
        )}
      </header>
      {action.erreur && (
        <Alerte compacte className="uno-erreur">{action.erreur}</Alerte>
      )}
      {erreur && <Alerte niveau="attention" compacte>{`Connexion perturbée : ${erreur}`}</Alerte>}
      {contenu}
      <Confirmation ouvert={sortie} titre="Quitter la table ?"
                    libelle="Quitter" danger occupe={action.occupe}
                    onConfirmer={partir} onAnnuler={() => setSortie(false)}
                    message={table.etat === 'partie'
                      ? 'Vos cartes repartent sous la pioche et la manche '
                        + 'continue sans vous.'
                      : 'Vous pourrez revenir avec le code tant que la table '
                        + 'existe.'} />
    </Page>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link, useBlocker, useNavigate, useParams,
} from 'react-router-dom';

import {
  Alerte, Badge, Bouton, Carte, ChampCopiable, Chargement, Confirmation,
  EtatVide, IcoFermer, IcoRecharger, IcoSortie, Page, Pastille,
  QuestionChoix, Saisie, Sr, cx, useAction, useLecture,
} from '@ui';
import {
  choisir, donnerIndice, exclure, finir, lancer, lienTable, lireTable,
  marquer, melanger, quitter, regler, rejoindre, reveler,
} from './api';
import {
  CAMPS, IcoManoir, ORDRE_CAMPS, autreCamp,
} from './decor';
import { Galerie, Plaque, Vols } from './Galerie';
import { OPTIONS_LISTES, nomListe, resumeListe } from './listes';

// Une table : salle d'attente (lien à partager, choix des camps et des
// oracles, lancement par l'hôte), puis la galerie de jeu, puis le résultat de
// la manche, où l'on peut changer de camp avant la suivante.

const SONDAGE = 1000;
const NOMBRES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

// Joueur à la table (son interface relit la table) ou absent.
function Presence({ table, nom }) {
  const present = !table.presents || table.presents[nom] !== false;
  return (
    <span className="cn-presence"
          title={present ? 'À la table' : 'Absent : déconnecté de la table'}>
      <Pastille couleur={present ? 'vert' : 'gris'} compact />
      <Sr>{present ? ' (à la table)' : ' (absent)'}</Sr>
    </span>
  );
}

// Le résultat des manches : victoires de chaque camp.
function Victoires({ table }) {
  return (
    <span className="cn-victoires" title="Manches gagnées">
      <span className="cn-victoires-sang">{`${CAMPS.sang.nom} ${table.victoires.sang}`}</span>
      <span aria-hidden="true">–</span>
      <span className="cn-victoires-argent">{`${table.victoires.argent} ${CAMPS.argent.nom}`}</span>
    </span>
  );
}

// -- préparation : camps, oracles, mots -----------------------------------------

function Partage({ code }) {
  return (
    <div className="cn-partage">
      <div className="cn-code">
        <span className="cn-code-libelle">Code de la table</span>
        <span className="cn-code-valeur">{code}</span>
      </div>
      <div className="cn-partage-lien">
        <span className="cn-code-libelle">Lien pour jouer</span>
        <ChampCopiable valeur={lienTable(code)} libelle="Lien pour jouer à la table" />
      </div>
    </div>
  );
}

// Un camp, entre deux manches : ses joueurs, et de quoi le rejoindre ou s'en
// proposer l'oracle.
function Camp({
  camp, table, onAction, onExclure,
}) {
  const { nom, Sceau } = CAMPS[camp];
  const membres = table.joueurs.filter((j) => table.camps[j] === camp);
  const oracle = table.oracles[camp];
  const monCamp = table.camps[table.moi];
  const code = table.code;
  const hote = table.hote === table.moi;
  return (
    <section className={cx('cn-camp', `cn-camp-${camp}`, monCamp === camp && 'mien')}
             aria-label={`Camp des ${nom}`}>
      <header className="cn-camp-tete">
        <Sceau className="cn-camp-sceau" />
        <h3 className="cn-camp-nom">{nom}</h3>
        <span className="cn-camp-compte">{`${membres.length} joueur${membres.length > 1 ? 's' : ''}`}</span>
      </header>
      <ul className="cn-camp-joueurs">
        {membres.length === 0 && <li className="dim">Personne pour l’instant.</li>}
        {membres.map((j) => (
          <li key={j}>
            <Presence table={table} nom={j} />
            <span className="cn-camp-joueur">{j}</span>
            {j === oracle && <span className="cn-oracle">oracle</span>}
            {j === table.hote && <Badge couleur="orange" majuscules titre="hôte" />}
            {j === table.moi && <span className="dim">(vous)</span>}
            {hote && onExclure && j !== table.moi && (
              <Bouton taille="s" variante="fantome" couleur="rouge"
                      icone={<IcoFermer />} libelle={`Exclure ${j}`}
                      className="cn-camp-exclure" onClick={() => onExclure(j)} />
            )}
          </li>
        ))}
      </ul>
      <div className="cn-camp-actions">
        {monCamp !== camp && (
          <Bouton taille="s" titre={`Rejoindre les ${nom}`}
                  onClick={() => onAction(() => choisir(code, camp, false))} />
        )}
        {monCamp === camp && oracle === table.moi && (
          <Bouton taille="s" variante="fantome" titre="Redevenir agent"
                  onClick={() => onAction(() => choisir(code, camp, false))} />
        )}
        {oracle === null && (
          <Bouton taille="s" variante={monCamp === camp ? 'principal' : 'secondaire'}
                  titre="Devenir l’oracle"
                  onClick={() => onAction(() => choisir(code, camp, true))} />
        )}
      </div>
    </section>
  );
}

export function Preparation({ table, onAction, onExclure }) {
  const hote = table.hote === table.moi;
  const code = table.code;
  return (
    <div className="cn-preparation">
      <div className="cn-camps">
        {ORDRE_CAMPS.map((c) => (
          <Camp key={c} camp={c} table={table} onAction={onAction} onExclure={onExclure} />
        ))}
      </div>
      <p className="cn-aide dim">
        Chaque camp a besoin d’un oracle, qui verra le grimoire des portraits, et
        d’au moins un agent.
      </p>
      {hote ? (
        <div className="cn-hote">
          <QuestionChoix nom="cn-liste-table" legende="Mots des portraits"
                         disposition="segments" options={OPTIONS_LISTES}
                         note={resumeListe(table.liste)}
                         valeur={table.liste}
                         onChange={(v) => onAction(() => regler(code, v))} />
          <div className="cn-hote-actions">
            <Bouton icone={<IcoRecharger />} titre="Répartir au hasard"
                    onClick={() => onAction(() => melanger(code))} />
            <Bouton variante="principal" taille="l" icone={<IcoManoir />}
                    disabled={Boolean(table.manque)}
                    titre={table.etat === 'finie' ? 'Nouvelle manche' : 'Ouvrir la galerie'}
                    onClick={() => onAction(() => lancer(code))} />
          </div>
          {table.manque && <p className="dim">{table.manque}</p>}
        </div>
      ) : (
        <p className="dim">
          {`Mots : ${nomListe(table.liste)}. En attente de ${table.hote}, qui ouvrira la galerie.`}
        </p>
      )}
    </div>
  );
}

function Invitation({ table, onAssis }) {
  const action = useAction();
  const pleine = table.joueurs.length >= table.max_joueurs;
  const s = async () => {
    const r = await action.executer(() => rejoindre(table.code));
    if (r.ok) onAssis();
  };
  return (
    <Carte titre="Invitation au manoir" className="cn-invitation">
      <p className="cn-invitation-nom">{table.nom}</p>
      <p className="dim">
        {`Hôte : ${table.hote} · ${table.joueurs.length} joueur(s) : ${table.joueurs.join(', ')}`}
      </p>
      {table.exclu && <Alerte compacte>L’hôte vous a exclu de cette table.</Alerte>}
      {table.etat === 'partie' && !table.exclu && (
        <Alerte niveau="info" compacte>
          Une manche est en cours : vous pourrez vous asseoir à la fin.
        </Alerte>
      )}
      {action.erreur && <Alerte compacte>{action.erreur}</Alerte>}
      <Bouton variante="principal" taille="l" waiting={action.occupe}
              disabled={pleine || table.etat === 'partie' || table.exclu}
              titre={pleine ? 'Table complète' : 'Entrer au manoir'}
              onClick={s} />
    </Carte>
  );
}

// -- manche ------------------------------------------------------------------

// L'oracle au trait donne son indice : un mot et un nombre.
function FormulaireIndice({ code, onAction }) {
  const [mot, setMot] = useState('');
  const [nombre, setNombre] = useState(1);
  // Un seul mot : une espace au milieu bloque l'envoi, avec la raison.
  const espace = /\s/.test(mot.trim());
  const envoyer = async (e) => {
    e.preventDefault();
    const r = await onAction(() => donnerIndice(code, mot.trim(), nombre));
    if (r && r.ok) setMot('');
  };
  return (
    <form className="cn-indice-form" onSubmit={envoyer}>
      <label className="cn-indice-champ" htmlFor="cn-indice-mot">
        <span className="cn-commande-libelle">Votre indice</span>
        <Saisie id="cn-indice-mot" value={mot} maxLength={30} autoComplete="off"
                placeholder="Un seul mot" className="cn-indice-saisie"
                aria-describedby={espace ? 'cn-indice-espace' : undefined}
                onChange={(e) => setMot(e.target.value)} />
        {espace && <span id="cn-indice-espace" className="cn-indice-erreur">Un seul mot, sans espace.</span>}
      </label>
      <fieldset className="cn-nombres">
        <legend className="cn-commande-libelle">Nombre de portraits</legend>
        {NOMBRES.map((n) => (
          <label key={n} className={cx('cn-nombre', nombre === n && 'choisi')}
                 title={n === 0 ? 'Sans limite' : undefined}>
            <input type="radio" name="cn-nombre" value={n} checked={nombre === n}
                   onChange={() => setNombre(n)} />
            {n === 0 ? '∞' : n}
          </label>
        ))}
      </fieldset>
      <Bouton type="submit" variante="principal" disabled={!mot.trim() || espace}
              titre="Donner l’indice" />
    </form>
  );
}

// Au centre, au-dessus de la galerie : qui joue, et l'indice en cours.
function Etat({ partie: p, moi }) {
  if (p.gagnant) {
    const { nom } = CAMPS[p.gagnant];
    const perdant = CAMPS[autreCamp(p.gagnant)].nom;
    let raison = `Tous les portraits des ${nom} sont retrouvés.`;
    if (p.cause === 'comte') raison = `Les ${perdant} ont réveillé le Comte !`;
    if (p.cause === 'forfait') raison = `Les ${perdant}, trop peu nombreux, abandonnent.`;
    return (
      <div className={cx('cn-etat', 'fin', `cn-etat-${p.gagnant}`)} aria-live="polite">
        <p className="cn-etat-titre">{`Les ${nom} l’emportent`}</p>
        <p className="cn-etat-texte">{raison}</p>
      </div>
    );
  }
  const { nom } = CAMPS[p.equipe];
  const oracle = p.oracles[p.equipe];
  const monTour = p.moi && p.moi.equipe === p.equipe;
  if (p.phase === 'indice') {
    const texte = oracle === moi ? 'À vous de donner un indice.'
      : `${oracle}, l’oracle des ${nom}, consulte le grimoire…`;
    return (
      <div className={cx('cn-etat', `cn-etat-${p.equipe}`, monTour && 'mien')} aria-live="polite">
        <p className="cn-etat-camp">{`Au tour des ${nom}`}</p>
        <p className="cn-etat-texte">{texte}</p>
      </div>
    );
  }
  const reste = p.limite === null ? 'sans limite' : `${p.limite} essai${p.limite > 1 ? 's' : ''}`;
  return (
    <div className={cx('cn-etat', `cn-etat-${p.equipe}`, monTour && 'mien')} aria-live="polite">
      <p className="cn-etat-camp">{`Au tour des ${nom}`}</p>
      <p className="cn-etat-indice">
        <span className="cn-etat-mot">{p.indice.mot}</span>
        <span className="cn-etat-nombre">{p.indice.nombre === 0 ? '∞' : p.indice.nombre}</span>
      </p>
      <p className="cn-etat-texte">{`Encore ${reste}.`}</p>
    </div>
  );
}

// Indices donnés pendant la manche, par camp.
function Indices({ partie: p }) {
  if (!p.indices.length) return null;
  return (
    <div className="cn-indices">
      {ORDRE_CAMPS.map((c) => (
        <section key={c} className={cx('cn-indices-camp', `cn-indices-${c}`)}>
          <h3>{`Indices des ${CAMPS[c].nom}`}</h3>
          <ol>
            {p.indices.filter((i) => i.equipe === c).map((i, n) => (
              <li key={`${n}-${i.mot}`}>
                <span className="cn-indices-mot">{i.mot}</span>
                <span className="cn-indices-nombre">{i.nombre === 0 ? '∞' : i.nombre}</span>
                <span className="dim">{`${i.trouves} trouvé${i.trouves > 1 ? 's' : ''}`}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function Plateau({ table, onAction, onExclure }) {
  const p = table.partie;
  const code = table.code;
  const finie = Boolean(p.gagnant);
  const moi = p.moi || {};
  const auTrait = !finie && moi.equipe === p.equipe;
  const oracle = moi.role === 'oracle';
  const agentActif = auTrait && !oracle && p.phase === 'devine';

  let commandes = null;
  if (!finie) {
    if (auTrait && oracle && p.phase === 'indice') {
      commandes = <FormulaireIndice code={code} onAction={onAction} />;
    } else if (agentActif) {
      commandes = (
        <div className="cn-commandes-agent">
          <p>
            Cliquez un portrait pour le marquer, puis
            {' '}
            <strong>Révéler</strong>
            . Vos marques sont vues de tous.
          </p>
          <Bouton titre="Arrêter là" disabled={p.essais === 0}
                  onClick={() => onAction(() => finir(code))} />
        </div>
      );
    } else if (oracle) {
      commandes = (
        <p className="cn-attente">
          {auTrait ? 'Vos agents cherchent : silence, l’oracle ne souffle rien.'
            : 'Vous voyez le grimoire : ne laissez rien paraître.'}
        </p>
      );
    } else {
      commandes = (
        <p className="cn-attente">
          {auTrait ? 'Attendez l’indice de votre oracle.'
            : `Les ${CAMPS[p.equipe].nom} jouent…`}
        </p>
      );
    }
  }

  return (
    <div className="cn-plateau">
      <div className={cx('cn-salle', !finie && `cn-salle-${p.equipe}`)}>
        <Vols />
        <div className="cn-tete">
          <Plaque camp="sang" partie={p} moi={table.moi} presents={table.presents} />
          <Etat partie={p} moi={table.moi} />
          <Plaque camp="argent" partie={p} moi={table.moi} presents={table.presents} />
        </div>
        {oracle && !finie && (
          <p className="cn-grimoire-note">
            Grimoire ouvert : vous seul voyez à qui appartient chaque portrait.
          </p>
        )}
        <Galerie partie={p} moi={table.moi} peutAgir={agentActif}
                 onMarquer={(i) => onAction(() => marquer(code, i))}
                 onReveler={(i) => onAction(() => reveler(code, i))} />
        {commandes && <div className="cn-commandes">{commandes}</div>}
      </div>

      {finie && (
        <Carte titre="Fin de la manche" className="cn-fin">
          <Preparation table={table} onAction={onAction} onExclure={onExclure} />
        </Carte>
      )}

      <Indices partie={p} />

      <details className="cn-journal">
        <summary>Journal de la manche</summary>
        <ol>
          {p.journal.slice().reverse().map((ligne, i) => (
            <li key={`${p.journal.length - i}-${ligne}`}>{ligne}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}

// -- garde ---------------------------------------------------------------------

// Pendant une manche, quitter la page demande confirmation ; `libre` (ref)
// lève la garde pour une sortie voulue (« Quitter la table »).
function GardeManche({ actif, libre }) {
  const doitBloquer = useCallback(({ currentLocation, nextLocation }) => (
    actif && !libre.current
    && currentLocation.pathname !== nextLocation.pathname
  ), [actif, libre]);
  const blocage = useBlocker(doitBloquer);

  useEffect(() => {
    if (!actif) return undefined;
    const avertir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [actif]);

  return (
    <Confirmation ouvert={blocage.state === 'blocked'} titre="Quitter la manche ?"
                  libelle="Quitter la page" danger
                  onConfirmer={() => blocage.proceed()}
                  onAnnuler={() => blocage.reset()}
                  message={'Une manche est en cours. Vous restez assis à la table : '
                    + 'vous pourrez y revenir avec le code, mais votre camp '
                    + 'devra vous attendre.'} />
  );
}

// -- page ----------------------------------------------------------------------

export default function Table() {
  const { code } = useParams();
  const naviguer = useNavigate();
  const [sortie, setSortie] = useState(false);
  const [exclusion, setExclusion] = useState(null);
  const libre = useRef(false);
  const { donnees: table, erreur, relire } = useLecture(lireTable, { code }, SONDAGE);
  const action = useAction();

  const agir = async (appel) => {
    const r = await action.executer(appel);
    relire();
    return r;
  };
  const partir = async () => {
    const r = await action.executer(() => quitter(code));
    if (r.ok) {
      libre.current = true;
      naviguer('/codenames');
    }
  };
  const exclureJoueur = async () => {
    const nom = exclusion;
    setExclusion(null);
    await agir(() => exclure(code, nom));
  };

  if (!table && erreur) {
    return (
      <Page>
        <EtatVide titre="Table introuvable" icone={<IcoManoir />}>
          {erreur}
          {' '}
          <Link to="/codenames">Revenir à l’accueil de Code Names</Link>
        </EtatVide>
      </Page>
    );
  }
  if (!table) return <Page><Chargement texte="Arrivée au manoir…" /></Page>;

  let contenu;
  if (!table.membre) contenu = <Invitation table={table} onAssis={relire} />;
  else if (!table.partie) {
    contenu = (
      <div className="cn-attente-page">
        <Partage code={table.code} />
        <Preparation table={table} onAction={agir} onExclure={setExclusion} />
      </div>
    );
  } else contenu = <Plateau table={table} onAction={agir} onExclure={setExclusion} />;

  const enManche = table.membre && table.etat === 'partie';
  return (
    <Page className="cn-page">
      <header className="cn-barre">
        <Link to="/codenames" className="cn-retour">Code Names</Link>
        <h1 className="cn-barre-titre">
          {table.nom}
          <Sr>{`, table ${table.code}`}</Sr>
        </h1>
        <span className="cn-barre-code" aria-hidden="true">{table.code}</span>
        {table.manches > 0 && <Badge titre={`Manche ${table.manches}`} />}
        {table.manches > 0 && <Victoires table={table} />}
        {table.membre && (
          <Bouton variante="fantome" taille="s" icone={<IcoSortie />}
                  titre="Quitter la table" onClick={() => setSortie(true)} />
        )}
      </header>
      {action.erreur && <Alerte compacte className="cn-erreur">{action.erreur}</Alerte>}
      {erreur && <Alerte niveau="attention" compacte>{`Connexion perturbée : ${erreur}`}</Alerte>}
      {contenu}
      <GardeManche actif={enManche} libre={libre} />
      <Confirmation ouvert={sortie} titre="Quitter la table ?"
                    libelle="Quitter" danger occupe={action.occupe}
                    onConfirmer={partir} onAnnuler={() => setSortie(false)}
                    message={enManche
                      ? 'La manche continue sans vous ; si votre camp tombe à '
                        + 'un seul joueur, il perd par forfait.'
                      : 'Vous pourrez revenir avec le code tant que la table '
                        + 'existe.'} />
      <Confirmation ouvert={exclusion !== null} titre={`Exclure ${exclusion} ?`}
                    libelle="Exclure" danger onConfirmer={exclureJoueur}
                    onAnnuler={() => setExclusion(null)}
                    message="Ce joueur quitte la table et ne pourra plus s’y asseoir." />
    </Page>
  );
}

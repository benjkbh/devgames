import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link, useBlocker, useNavigate, useParams,
} from 'react-router-dom';

import {
  Alerte, Badge, Bouton, Carte, CarteJeu, ChampCopiable, Chargement,
  Confirmation, COULEURS_UNO, Dialogue, EtatVide, Eventail, IcoCarteRole,
  IcoFermer, IcoSortie, Page, QuestionBool, Sr, VALEURS_UNO, cx, useAction,
  useLecture,
} from '../../ui';
import {
  cheminSpectateur, contrer, direUno, exclure, jouer, lancer, lienSpectateur,
  lienTable, lireTable, passer, piocher, quitter, regler, rejoindre,
} from './api';
import { musique } from './ambiance';
import { useEcranEtroit } from './ecran';
import { REGLES, reglesActives } from './regles';
import { Presence, Tapis } from './Tapis';

// Une table : salle d'attente (lien à partager, joueurs, lancement par
// l'hôte), puis plateau de jeu, puis résultat de la manche.

const SONDAGE = 1000;
const ORDRE_COULEURS = [...COULEURS_UNO, 'noir'];

// Main triée par couleur puis par valeur, pour s'y retrouver.
const trier = (main) => main.slice().sort((a, b) => (
  ORDRE_COULEURS.indexOf(a.couleur) - ORDRE_COULEURS.indexOf(b.couleur)
  || VALEURS_UNO.indexOf(a.valeur) - VALEURS_UNO.indexOf(b.valeur)));

// Code, lien pour s'asseoir et lien pour regarder (sans compte).
export function Partage({ code }) {
  return (
    <div className="uno-partage">
      <div className="uno-code">
        <span className="uno-code-libelle">Code de la table</span>
        <span className="uno-code-valeur">{code}</span>
      </div>
      <div className="uno-partage-lien">
        <span className="uno-code-libelle">Lien pour jouer</span>
        <ChampCopiable valeur={lienTable(code)} libelle="Lien pour jouer à la table" />
      </div>
      <div className="uno-partage-lien">
        <span className="uno-code-libelle">Lien pour regarder, sans compte</span>
        <ChampCopiable valeur={lienSpectateur(code)} libelle="Lien pour regarder la table" />
      </div>
    </div>
  );
}

// Règles de la table : l'hôte les change entre deux manches, les autres les
// lisent.
export function Regles({ table, onAction }) {
  const hote = table.hote === table.moi && table.etat !== 'partie';
  const actives = reglesActives(table.regles);
  if (!hote) {
    return (
      <p className="uno-regles-texte">
        <strong>Règles : </strong>
        {actives.length ? actives.join(' · ') : 'classiques.'}
      </p>
    );
  }
  return (
    <div className="uno-regles">
      {REGLES.map(({ cle, titre, aide }) => (
        <QuestionBool key={cle} libelle={titre} description={aide}
                      checked={Boolean(table.regles && table.regles[cle])}
                      onChange={(v) => onAction(() => regler(
                        table.code, { ...table.regles, [cle]: v }))} />
      ))}
    </div>
  );
}

// Les joueurs et leurs points. `onExclure` : l'hôte peut exclure un joueur.
export function Scores({ table, onExclure }) {
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
          <span className="uno-scores-droite">
            <span className="uno-scores-points">{`${points} pts`}</span>
            {onExclure && nom !== table.moi && (
              <Bouton taille="s" variante="fantome" couleur="rouge"
                      icone={<IcoFermer />} libelle={`Exclure ${nom}`}
                      onClick={() => onExclure(nom)} />
            )}
          </span>
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
      {table.exclu && (
        <Alerte compacte>L’hôte vous a exclu de cette table.</Alerte>
      )}
      {table.etat === 'partie' && !table.exclu && (
        <Alerte niveau="info" compacte>
          Une manche est en cours : vous pourrez vous asseoir à la fin.
        </Alerte>
      )}
      {action.erreur && <Alerte compacte>{action.erreur}</Alerte>}
      <div className="uno-invitation-actions">
        <Bouton variante="principal" taille="l" waiting={action.occupe}
                disabled={pleine || table.etat === 'partie' || table.exclu}
                titre={pleine ? 'Table complète' : 'S’asseoir à la table'}
                onClick={s} />
        <Bouton taille="l" href={cheminSpectateur(table.code)}
                titre="Regarder sans jouer" />
      </div>
    </Carte>
  );
}

export function SalleAttente({ table, onAction, onExclure }) {
  const hote = table.hote === table.moi;
  const assez = table.joueurs.length >= table.min_joueurs;
  return (
    <div className="uno-attente">
      <Partage code={table.code} />
      <Carte titre={`Joueurs (${table.joueurs.length} / ${table.max_joueurs})`}>
        <Scores table={table} onExclure={hote ? onExclure : undefined} />
      </Carte>
      <Carte titre="Règles" className="uno-carte-regles">
        <Regles table={table} onAction={onAction} />
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

// Règle du 7 : le joueur dont on prend la main.
function ChoixJoueur({ carte, joueurs, onChoisir, onFermer }) {
  return (
    <Dialogue ouvert={Boolean(carte)} titre="Échanger votre main avec…"
              description="Le 7 échange votre main avec celle du joueur de votre choix."
              onFermer={onFermer}>
      <ul className="uno-echange">
        {joueurs.map((j) => (
          <li key={j.nom}>
            <button type="button" className="uno-echange-choix"
                    onClick={() => onChoisir(j.nom)}>
              <span className="uno-siege-nom">{j.nom}</span>
              <span className="dim">{`${j.cartes} carte${j.cartes > 1 ? 's' : ''}`}</span>
            </button>
          </li>
        ))}
      </ul>
    </Dialogue>
  );
}

export function Plateau({ table, onAction, onExclure }) {
  const p = table.partie;
  const [joker, setJoker] = useState(null);
  const [sept, setSept] = useState(null);
  // Rectangle de la carte jouée : elle a quitté la main au rendu suivant, la
  // défausse glisse depuis là.
  const origine = useRef(null);
  const etroit = useEcranEtroit();
  const moi = p.joueurs.find((j) => j.nom === table.moi);
  const monTour = p.tour === table.moi;
  const finie = Boolean(p.gagnant);
  const hote = table.hote === table.moi;
  const main = trier(p.main);
  const code = table.code;
  const peutPiocher = monTour && p.pioche_jouable === null && !p.suite;
  // Règle de rapidité : une carte identique au dessus, posable hors tour.
  const rapide = !monTour && !finie && p.jouables.length > 0;
  // Le bouton UNO n'existe que lorsqu'il sert : une carte à venir.
  const peutUno = !p.uno_annonce && !finie
    && (main.length === 1 || (main.length === 2 && (monTour || rapide)));

  const poser = (carte, couleur, cible) => onAction(
    () => jouer(code, carte.id, couleur, false, cible),
  );
  const cliquer = (carte, e) => {
    origine.current = e.currentTarget.getBoundingClientRect();
    if (carte.couleur === 'noir') setJoker(carte);
    else if (p.regles && p.regles.sept_zero && carte.valeur === '7'
      && main.length > 1) setSept(carte);
    else poser(carte);
  };

  let message;
  if (finie) message = `${p.gagnant} remporte la manche !`;
  else if (monTour && p.suite) message = 'Prolongez votre suite, ou arrêtez-la.';
  else if (rapide) message = 'Carte identique : posez-la vite !';
  else if (monTour && p.pioche_jouable !== null) message = 'Posez la carte piochée, ou passez.';
  else if (monTour) message = 'À vous de jouer !';
  else message = `${p.tour} joue…`;

  const boutonUno = peutUno && (
    <button type="button" className="uno-bouton-uno"
            aria-label="Annoncer UNO" title="Annoncer UNO"
            onClick={() => onAction(() => direUno(code))}>
      <span className="uno-bouton-uno-texte" aria-hidden="true">UNO&nbsp;!</span>
    </button>
  );

  return (
    <div className="uno-plateau">
      <Tapis table={table} partie={p} moi={table.moi} message={message}
             origine={origine} peutPiocher={peutPiocher}
             onPiocher={() => onAction(() => piocher(code))}
             boutonUno={boutonUno}
             onContrer={(cible) => onAction(() => contrer(code, cible))}
             onExclure={hote ? onExclure : undefined}>
        {finie ? (
          <Carte titre="Fin de la manche" className="uno-fin">
            <p className="uno-fin-titre">
              {`${p.gagnant} remporte la manche et marque ${p.points} points.`}
            </p>
            <Scores table={table} onExclure={hote ? onExclure : undefined} />
            <Regles table={table} onAction={onAction} />
            {hote ? (
              <Bouton variante="principal" taille="l" icone={<IcoCarteRole />}
                      disabled={table.joueurs.length < table.min_joueurs}
                      titre="Nouvelle manche"
                      onClick={() => onAction(() => lancer(code))} />
            ) : (
              <p className="dim">{`${table.hote} peut relancer une manche.`}</p>
            )}
          </Carte>
        ) : (
          <section className={cx('uno-joueur', (monTour || rapide) && 'actif')}
                   aria-label="Votre main" data-uno-main>
            <div className="uno-joueur-tete">
              <span className="uno-siege-nom">
                {`${table.moi} · ${main.length} carte${main.length > 1 ? 's' : ''}`}
              </span>
              {monTour && <span className="uno-joueur-tour">À vous !</span>}
              {moi && moi.expose && (
                <Alerte niveau="attention" compacte>
                  Vous n’avez pas dit UNO : vite, avant d’être contré !
                </Alerte>
              )}
              <div className="uno-joueur-actions">
                {p.uno_annonce && <Badge couleur="rouge" majuscules titre="UNO annoncé" />}
                {monTour && (p.pioche_jouable !== null || p.suite) && (
                  <Bouton titre={p.suite ? 'Arrêter la suite' : 'Passer'}
                          onClick={() => onAction(() => passer(code))} />
                )}
              </div>
            </div>
            <Eventail arc chevauchement={(etroit ? 0.55 : 0.4) + (main.length > 12 ? 0.15 : 0)}
                      libelle="Vos cartes" className="uno-main">
              {main.map((c) => {
                const ok = p.jouables.includes(c.id);
                return (
                  <CarteJeu key={c.id} taille="l" couleur={c.couleur} valeur={c.valeur}
                            data-carte={c.id}
                            jouable={ok} desactivee={!ok}
                            onClick={(e) => cliquer(c, e)} />
                );
              })}
            </Eventail>
          </section>
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

      <ChoixCouleur ouvert={Boolean(joker)} onFermer={() => setJoker(null)}
                    onChoisir={(c) => { const carte = joker; setJoker(null); poser(carte, c); }} />
      <ChoixJoueur carte={sept} joueurs={p.joueurs.filter((j) => j.nom !== table.moi)}
                   onFermer={() => setSept(null)}
                   onChoisir={(nom) => { const carte = sept; setSept(null); poser(carte, undefined, nom); }} />
    </div>
  );
}

// -- garde ----------------------------------------------------------------------

// Pendant une manche, toute navigation hors de la table (un autre module du
// menu, le retour au UNO, le bouton « précédent ») et la fermeture de l'onglet
// demandent confirmation : on ne quitte pas une partie par mégarde. `libre`
// (ref) lève la garde pour une sortie voulue, comme « Quitter la table ».
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
                    + 'vous pourrez y revenir avec le code, mais les autres joueurs '
                    + 'devront vous attendre.'} />
  );
}

// -- page -------------------------------------------------------------------

export default function Table() {
  const { code } = useParams();
  const naviguer = useNavigate();
  const [sortie, setSortie] = useState(false);
  const [exclusion, setExclusion] = useState(null);
  const libre = useRef(false);
  const { donnees: table, erreur, relire } = useLecture(lireTable, { code }, SONDAGE);
  const action = useAction();

  // Pendant la manche, le second morceau ; à la table, la veillée.
  const enManche = Boolean(table && table.membre && table.etat === 'partie');
  useEffect(() => {
    musique.piste(enManche ? 'partie' : 'veillee');
  }, [enManche]);
  useEffect(() => () => musique.piste('veillee'), []);

  const agir = async (appel) => {
    const r = await action.executer(appel);
    relire();
    return r;
  };
  const partir = async () => {
    const r = await action.executer(() => quitter(code));
    if (r.ok) {
      libre.current = true;
      naviguer('/uno');
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
  else if (!table.partie) {
    contenu = <SalleAttente table={table} onAction={agir} onExclure={setExclusion} />;
  } else contenu = <Plateau table={table} onAction={agir} onExclure={setExclusion} />;

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
        {reglesActives(table.regles).map((r) => (
          <Badge key={r} couleur="or" titre={r} />
        ))}
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
      <GardeManche actif={table.membre && table.etat === 'partie'} libre={libre} />
      <Confirmation ouvert={sortie} titre="Quitter la table ?"
                    libelle="Quitter" danger occupe={action.occupe}
                    onConfirmer={partir} onAnnuler={() => setSortie(false)}
                    message={table.etat === 'partie'
                      ? 'Vos cartes repartent sous la pioche et la manche '
                        + 'continue sans vous.'
                      : 'Vous pourrez revenir avec le code tant que la table '
                        + 'existe.'} />
      <Confirmation ouvert={exclusion !== null} titre={`Exclure ${exclusion} ?`}
                    libelle="Exclure" danger onConfirmer={exclureJoueur}
                    onAnnuler={() => setExclusion(null)}
                    message={table.etat === 'partie'
                      ? 'Ses cartes repartent sous la pioche et la manche continue '
                        + 'sans lui. Il ne pourra plus s’asseoir à cette table.'
                      : 'Il quitte la table et ne pourra plus s’y asseoir.'} />
    </Page>
  );
}

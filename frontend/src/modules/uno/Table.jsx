import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link, useBlocker, useNavigate, useParams,
} from 'react-router-dom';

import {
  Alerte, Badge, Bouton, Carte, CarteJeu, Chargement, Confirmation,
  COULEURS_UNO, Dialogue, EtatVide, Eventail, IcoCarteRole, IcoFermer,
  IcoSortie, Page, VALEURS_UNO, cx, useAction, useLecture,
} from '@ui';
import {
  contrer, direUno, exclure, fermer, jouer, lancer, lireTable, passer, piocher,
  quitter, regler,
} from './api';
import { musique } from './ambiance';
import { JournalManche, OrdreJeu } from './Cote';
import { useEcranEtroit } from './ecran';
import Lecteur from './Lecteur';
import { ChoixRegles, RecapRegles } from './ReglesUno';
import {
  EnTete, InviterTable, Invitation, SalleAttente,
} from './Salle';
import { Presence, Tapis } from './Tapis';

export { Invitation, SalleAttente };

// Une table : salle d'attente (`Salle.jsx`), puis plateau de jeu, puis
// résultat de la manche. À droite du tapis, l'ordre de jeu et le journal
// (`Cote.jsx`).

const SONDAGE = 1000;
const ORDRE_COULEURS = [...COULEURS_UNO, 'noir'];

// Main triée par couleur puis par valeur, pour s'y retrouver.
const trier = (main) => main.slice().sort((a, b) => (
  ORDRE_COULEURS.indexOf(a.couleur) - ORDRE_COULEURS.indexOf(b.couleur)
  || VALEURS_UNO.indexOf(a.valeur) - VALEURS_UNO.indexOf(b.valeur)));

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
  // Le bouton UNO n'existe que lorsqu'il sert : une carte à venir. Avec deux
  // cartes, seulement si l'on peut en poser une (à son tour, ou hors tour).
  const peutUno = !p.uno_annonce && !finie
    && (main.length === 1 || (main.length === 2 && p.jouables.length > 0));

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
    <div className="uno-jeu">
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
              {hote ? (
                <ChoixRegles regles={table.regles}
                             onChange={(regles) => onAction(() => regler(code, regles))} />
              ) : <RecapRegles regles={table.regles} />}
              <details className="uno-fin-inviter">
                <summary>Inviter d’autres joueurs</summary>
                <p className="dim">
                  Ils peuvent s’asseoir maintenant : ils seront servis à la
                  prochaine manche.
                </p>
                <InviterTable code={code} />
              </details>
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
      </div>
      <aside className="uno-jeu-cote" aria-label="Déroulement de la manche">
        <OrdreJeu table={table} partie={p} />
        <JournalManche table={table} partie={p} />
      </aside>

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
  // L'hôte, hors manche, ferme la table pour tous ; sinon on la quitte.
  const ferme = Boolean(table && table.membre && table.hote === table.moi
    && table.etat !== 'partie');
  const partir = async () => {
    const r = await action.executer(() => (ferme ? fermer(code) : quitter(code)));
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

  let titreSortie = 'Quitter la table';
  if (ferme) titreSortie = 'Fermer la table';
  else if (table.etat === 'partie') titreSortie = 'Quitter';
  let messageSortie = 'Vous pourrez revenir avec le code tant que la table existe.';
  if (ferme) {
    messageSortie = table.joueurs.length > 1
      ? 'La table disparaît, pour vous et pour les joueurs assis.'
      : 'La table disparaît : son code ne mènera plus nulle part.';
  } else if (table.etat === 'partie') {
    messageSortie = 'Vos cartes repartent sous la pioche et la manche continue sans vous.';
  }

  return (
    <Page className="uno-page">
      <EnTete
        table={table}
        outils={table.membre && <Lecteur variante="compact" />}
        actions={table.membre && (
          <Bouton icone={<IcoSortie />} titre={titreSortie} onClick={() => setSortie(true)} />
        )} />
      {action.erreur && (
        <Alerte compacte className="uno-erreur">{action.erreur}</Alerte>
      )}
      {erreur && <Alerte niveau="attention" compacte>{`Connexion perturbée : ${erreur}`}</Alerte>}
      {contenu}
      <GardeManche actif={table.membre && table.etat === 'partie'} libre={libre} />
      <Confirmation ouvert={sortie} titre={`${titreSortie} ?`}
                    libelle={ferme ? 'Fermer' : 'Quitter'} danger occupe={action.occupe}
                    onConfirmer={partir} onAnnuler={() => setSortie(false)}
                    message={messageSortie} />
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

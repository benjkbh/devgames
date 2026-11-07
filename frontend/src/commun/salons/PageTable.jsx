import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link, useBlocker, useNavigate, useParams,
} from 'react-router-dom';

import {
  Alerte, Badge, Bouton, Carte, Chargement, Confirmation, EtatVide,
  IcoCadenas, IcoCopier, IcoInviter, IcoLien, IcoLune, IcoOeil, IcoRetour,
  IcoSortie, IcoValide, Jauge, Page, Pastille, Places, SaisieCode, Sr, cx,
  useAction, useCopie,
} from '@ui';
import { useTable } from './table';
import './table.css';

// Page d'une table de jeu, commune aux jeux « simples » (Flip 7, Menteur,
// Trio) : en-tête, salle d'attente (places, invitation, prêt, regarder sans
// jouer, distribution par l'hôte), arrivée par un lien, spectateur, fin de
// partie et garde pendant une manche. Le jeu ne fournit que son plateau.
//
//   chemin    chemin du module (`/flip7`) ; `nomJeu` : son nom affiché
//   Ico       icône du jeu (états vides)
//   prefixe   classe de la page, qui porte l'habillage du jeu (`f7-page`)
//   api       l'API des tables du jeu (`apiSalons`)
//   Plateau   la manche : `({ table, onAction })`, pour un joueur assis
//             (`table.partie.main`…) comme pour un spectateur
//   aide      les règles en quelques lignes (carte de la salle d'attente)
//   lancer    libellé du lancement par l'hôte (« Distribuer les cartes »)

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const duree = (s) => (s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

// -- en-tête -------------------------------------------------------------------

function Statut({ table }) {
  if (table.etat === 'partie') {
    return <Badge couleur="orange" titre={`Partie ${table.manches} en cours`} />;
  }
  if (table.etat === 'finie') return <Badge couleur="vert" titre="Partie terminée" />;
  return (
    <Badge couleur="or">
      <Pastille couleur="or" compact />
      En attente de joueurs
    </Badge>
  );
}

function EnTete({
  table, nomJeu, chemin, actions,
}) {
  let sur = `${nomJeu} · table de ${table.hote} · `;
  if (table.membre && table.hote === table.moi) {
    sur = `${nomJeu} · table ${table.public ? 'publique' : 'sur invitation'} · `;
  }
  return (
    <header className="tbl-entete">
      <Link to={chemin} className="tbl-retour" aria-label="Retour aux tables"
            title="Retour aux tables">
        <IcoRetour />
      </Link>
      <div className="tbl-titres">
        <p className="tbl-sur">
          {sur}
          <span className="tbl-code">{table.code}</span>
        </p>
        <h1 className="tbl-titre">
          {table.nom}
          <Sr>{`, table ${table.code}`}</Sr>
        </h1>
      </div>
      <Statut table={table} />
      <div className="tbl-outils">{actions}</div>
    </header>
  );
}

// -- places --------------------------------------------------------------------

function placesDe(table) {
  const prets = table.prets || [];
  const victoires = table.victoires || {};
  return table.joueurs.map((nom) => {
    const ici = !table.presents || table.presents[nom] !== false;
    const hote = nom === table.hote;
    const moi = nom === table.moi;
    const pret = !hote && prets.includes(nom);
    const mots = [];
    if (hote) mots.push('hôte');
    if (moi) mots.push('vous');
    if (!ici) mots.push('absent');
    else if (pret) mots.push('prêt');
    if (victoires[nom]) mots.push(pluriel(victoires[nom], 'victoire'));
    let ton;
    if (ici && (hote || (moi && !pret))) ton = 'or';
    else if (ici && pret) ton = 'vert';
    return {
      nom, detail: majuscule(mots.join(' · ') || 'assis'), ton, presence: ici, couronne: hote,
    };
  });
}

function AutourTable({ table, onInviter, onExclure }) {
  return (
    <Carte titre="Autour de la table" className="tbl-autour"
           actions={<Jauge valeur={table.joueurs.length} max={table.max_joueurs} unite="places" />}>
      <Places joueurs={placesDe(table)} max={table.max_joueurs} colonnes={4}
              libelle="Places autour de la table"
              onInviter={onInviter} libelleInviter="Copier le lien d’invitation"
              onRetirer={onExclure} retirable={(j) => j.nom !== table.moi} />
      {(table.spectateurs || []).length > 0 && (
        <p className="tbl-spectateurs">
          <IcoOeil />
          {`${table.spectateurs.length > 1 ? 'Spectateurs' : 'Spectateur'} : `}
          {table.spectateurs.map((s) => (s === table.moi ? `${s} (vous)` : s)).join(', ')}
        </p>
      )}
    </Carte>
  );
}

// -- invitation ----------------------------------------------------------------

function Inviter({ code, lien }) {
  const [codeCopie, copierCode] = useCopie();
  const [lienCopie, copierLien] = useCopie();
  return (
    <Carte className="tbl-inviter">
      <p className="tbl-surtitre">Inviter à la table</p>
      <div className="tbl-inviter-code">
        <SaisieCode lectureSeule valeur={code} libelle="Code de la table" />
        <Bouton icone={codeCopie ? <IcoValide /> : <IcoCopier />}
                libelle={codeCopie ? 'Code copié' : 'Copier le code'}
                onClick={() => copierCode(code)} />
      </div>
      <Bouton variante="principal" bloc icone={<IcoLien />}
              titre={lienCopie ? 'Lien copié !' : 'Copier le lien pour jouer'}
              onClick={() => copierLien(lien)} />
    </Carte>
  );
}

function Pied({
  ico, titre, texte, children,
}) {
  return (
    <section className="tbl-pied" aria-label={titre}>
      <span className="tbl-pied-ico" aria-hidden="true">{ico}</span>
      <div className="tbl-pied-textes">
        <p className="tbl-pied-titre">{titre}</p>
        <p className="dim">{texte}</p>
      </div>
      <div className="tbl-pied-actions">{children}</div>
    </section>
  );
}

function AbsenceHote({ table, api, onAction }) {
  const peut = table.absence_hote >= table.delai_reprise;
  return (
    <div className="tbl-absence" role="status">
      <span className="tbl-absence-ico" aria-hidden="true"><IcoLune /></span>
      <div className="tbl-absence-textes">
        <p className="tbl-absence-titre">{`L’hôte, ${table.hote}, s’est absenté`}</p>
        <p>
          {peut ? 'Vous pouvez reprendre la table.'
            : `Vous pourrez reprendre la table s’il reste absent ${duree(table.delai_reprise)}.`}
        </p>
      </div>
      <Bouton titre="Reprendre la table" disabled={!peut}
              onClick={() => onAction(() => api.reprendre(table.code))} />
    </div>
  );
}

function BoutonLever({ table, api, onAction }) {
  if (table.joueurs.length < 2) return null;
  return (
    <Bouton taille="l" icone={<IcoOeil />} titre="Regarder sans jouer"
            onClick={() => onAction(() => api.lever(table.code))} />
  );
}

// -- salle d'attente -----------------------------------------------------------

function Salle({
  table, api, onAction, onExclure, aide, lancer,
}) {
  const hote = table.hote === table.moi;
  const [, copier] = useCopie();
  const manque = table.min_joueurs - table.joueurs.length;
  const pret = (table.prets || []).includes(table.moi);
  let pied;
  if (hote && manque > 0) {
    pied = (
      <Pied ico={<IcoInviter />} titre={`Il manque encore ${pluriel(manque, 'joueur')}`}
            texte={`Partagez le code ou le lien : la partie se lance à ${table.min_joueurs} joueurs.`}>
        <BoutonLever table={table} api={api} onAction={onAction} />
        <Bouton taille="l" icone={<IcoCadenas />} disabled titre={lancer} />
      </Pied>
    );
  } else if (hote) {
    const autres = table.joueurs.filter((j) => j !== table.moi);
    const prets = (table.prets || []).filter((j) => autres.includes(j)).length;
    pied = (
      <Pied ico={<IcoValide />}
            titre={prets === autres.length ? 'Tout le monde est prêt'
              : `${prets} sur ${pluriel(autres.length, 'joueur')} prêt${prets > 1 ? 's' : ''}`}
            texte="Lancez quand vous voulez : chaque joueur assis entre dans la partie.">
        <BoutonLever table={table} api={api} onAction={onAction} />
        <Bouton variante="principal" taille="l" titre={lancer}
                onClick={() => onAction(() => api.lancer(table.code))} />
      </Pied>
    );
  } else {
    pied = (
      <Pied ico={<IcoValide />} titre={pret ? 'Vous êtes prêt' : 'Êtes-vous prêt ?'}
            texte={`${table.hote} lancera la partie quand tout le monde sera assis.`}>
        <BoutonLever table={table} api={api} onAction={onAction} />
        <Bouton variante={pret ? 'secondaire' : 'principal'} couleur="vert" taille="l"
                icone={pret ? <IcoValide /> : undefined} aria-pressed={pret}
                titre={pret ? 'Prêt' : 'Je suis prêt'}
                onClick={() => onAction(() => api.pret(table.code, !pret))} />
      </Pied>
    );
  }
  return (
    <div className="tbl-salle">
      {!hote && table.absence_hote != null && (
        <AbsenceHote table={table} api={api} onAction={onAction} />
      )}
      <div className="tbl-salle-principal">
        <AutourTable table={table}
                     onInviter={hote ? () => copier(api.lienTable(table.code)) : undefined}
                     onExclure={hote ? onExclure : undefined} />
        {pied}
      </div>
      <aside className="tbl-salle-cote" aria-label="Table">
        <Inviter code={table.code} lien={api.lienTable(table.code)} />
        <Carte titre="La règle" className="tbl-aide">{aide}</Carte>
      </aside>
    </div>
  );
}

// Pas assis : arrivé par un lien, ou spectateur entre deux parties.
function Arrivee({
  table, api, onAction, aide,
}) {
  const pleine = table.joueurs.length >= table.max_joueurs;
  const enPartie = table.etat === 'partie';
  let texte = 'Asseyez-vous : vous jouerez la prochaine partie.';
  if (table.exclu) texte = 'L’hôte vous a exclu de cette table.';
  else if (pleine) texte = 'La table est complète : vous pouvez la regarder.';
  else if (enPartie) texte = 'Une partie est en cours : vous pourrez vous asseoir à la fin.';
  else if (table.spectateur) texte = 'Asseyez-vous quand vous voulez, avant le lancement.';
  return (
    <div className="tbl-salle">
      <div className="tbl-salle-principal">
        <AutourTable table={table} />
        <Pied ico={table.spectateur ? <IcoOeil /> : <IcoInviter />}
              titre={table.spectateur ? 'Vous regardez la table'
                : `Vous êtes invité à la table de ${table.hote}`}
              texte={texte}>
          {!table.spectateur && (
            <Bouton taille="l" icone={<IcoOeil />} titre="Regarder sans jouer"
                    onClick={() => onAction(() => api.lever(table.code))} />
          )}
          <Bouton variante="principal" taille="l" titre="S’asseoir à la table"
                  disabled={pleine || enPartie || table.exclu}
                  onClick={() => onAction(() => api.rejoindre(table.code))} />
        </Pied>
      </div>
      <aside className="tbl-salle-cote" aria-label="Table">
        <Carte titre="La règle" className="tbl-aide">{aide}</Carte>
      </aside>
    </div>
  );
}

// Partie finie : rejouer (l'hôte), attendre, ou s'asseoir (spectateur).
function FinPartie({ table, api, onAction }) {
  const hote = table.hote === table.moi;
  let action;
  if (table.membre && hote) {
    action = (
      <>
        <BoutonLever table={table} api={api} onAction={onAction} />
        <Bouton variante="principal" taille="l" titre="Nouvelle partie"
                disabled={table.joueurs.length < table.min_joueurs}
                onClick={() => onAction(() => api.lancer(table.code))} />
      </>
    );
  } else if (table.membre) {
    action = <BoutonLever table={table} api={api} onAction={onAction} />;
  } else {
    action = (
      <Bouton variante="principal" taille="l" titre="S’asseoir pour la prochaine"
              disabled={table.joueurs.length >= table.max_joueurs || table.exclu}
              onClick={() => onAction(() => api.rejoindre(table.code))} />
    );
  }
  const victoires = Object.entries(table.victoires || {})
    .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return (
    <Pied ico={<IcoValide />} titre={`${table.partie.gagnant} gagne la partie !`}
          texte={victoires.length
            ? `Victoires : ${victoires.map(([j, n]) => `${j} ${n}`).join(' · ')}`
            : `${table.hote} peut relancer une partie.`}>
      {action}
    </Pied>
  );
}

// -- garde -----------------------------------------------------------------------

function GardePartie({ actif, libre }) {
  const doitBloquer = useCallback(({ currentLocation, nextLocation }) => (
    actif && !libre.current && currentLocation.pathname !== nextLocation.pathname
  ), [actif, libre]);
  const blocage = useBlocker(doitBloquer);
  useEffect(() => {
    if (!actif) return undefined;
    const avertir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [actif]);
  return (
    <Confirmation ouvert={blocage.state === 'blocked'} titre="Quitter la partie ?"
                  libelle="Quitter la page" danger
                  onConfirmer={() => blocage.proceed()}
                  onAnnuler={() => blocage.reset()}
                  message={'Une partie est en cours. Vous restez assis : vous pourrez '
                    + 'revenir avec le code, mais les autres devront vous attendre.'} />
  );
}

// -- page ------------------------------------------------------------------------

export function PageTable({
  chemin, nomJeu, Ico, prefixe, api, Plateau, aide,
  lancer = 'Lancer la partie',
}) {
  const { code } = useParams();
  const naviguer = useNavigate();
  const [sortie, setSortie] = useState(false);
  const [exclusion, setExclusion] = useState(null);
  const libre = useRef(false);
  const {
    donnees: table, erreur, relire, remplacer,
  } = useTable(api.lireTable, code);
  const action = useAction();

  // La table renvoyée par une action s'affiche aussitôt.
  const agir = async (appel) => {
    const r = await action.executer(appel);
    if (r.ok && r.resultat && r.resultat.version !== undefined) remplacer(r.resultat);
    else relire();
    return r;
  };
  const ferme = Boolean(table && table.membre && table.hote === table.moi
    && table.etat !== 'partie');
  const partir = async () => {
    const r = await action.executer(() => (ferme ? api.fermer(code) : api.quitter(code)));
    if (r.ok) {
      libre.current = true;
      naviguer(chemin);
    }
  };

  if (!table && erreur) {
    return (
      <Page className={cx('tbl-page', prefixe)}>
        <EtatVide titre="Table introuvable" icone={<Ico />}>
          {erreur}
          {' '}
          <Link to={chemin}>{`Revenir à l’accueil de ${nomJeu}`}</Link>
        </EtatVide>
      </Page>
    );
  }
  if (!table) return <Page className={cx('tbl-page', prefixe)}><Chargement texte="Arrivée à la table…" /></Page>;

  const aTable = table.membre || table.spectateur;
  const enPartie = table.membre && table.etat === 'partie';
  const props = {
    table, api, onAction: agir, aide,
  };
  let contenu;
  if (table.partie && (table.membre || table.spectateur)) {
    contenu = (
      <>
        <Plateau table={table} onAction={agir} />
        {table.etat === 'finie' && <FinPartie {...props} />}
        {!table.membre && table.etat === 'partie' && (
          <p className="dim tbl-note">Vous regardez la partie : vous pourrez vous asseoir à la fin.</p>
        )}
      </>
    );
  } else if (table.membre) {
    contenu = (
      <Salle {...props} onExclure={setExclusion} lancer={lancer} />
    );
  } else {
    contenu = <Arrivee {...props} />;
  }

  let titreSortie = 'Quitter la table';
  if (ferme) titreSortie = 'Fermer la table';
  let messageSortie = 'Vous pourrez revenir avec le code tant que la table existe.';
  if (ferme) messageSortie = 'La table disparaît, pour vous et pour les joueurs assis.';
  else if (enPartie) messageSortie = 'La partie continue sans vous.';

  return (
    <Page className={cx('tbl-page', prefixe)}>
      <EnTete table={table} nomJeu={nomJeu} chemin={chemin}
              actions={aTable && (
                <Bouton icone={<IcoSortie />} titre={titreSortie}
                        onClick={() => setSortie(true)} />
              )} />
      {action.erreur && <Alerte compacte className="tbl-erreur">{action.erreur}</Alerte>}
      {erreur && <Alerte niveau="attention" compacte>{`Connexion perturbée : ${erreur}`}</Alerte>}
      {contenu}
      <GardePartie actif={enPartie} libre={libre} />
      <Confirmation ouvert={sortie} titre={`${titreSortie} ?`}
                    libelle={ferme ? 'Fermer' : 'Quitter'} danger occupe={action.occupe}
                    onConfirmer={partir} onAnnuler={() => setSortie(false)}
                    message={messageSortie} />
      <Confirmation ouvert={exclusion !== null} titre={`Exclure ${exclusion} ?`}
                    libelle="Exclure" danger
                    onConfirmer={async () => {
                      const nom = exclusion;
                      setExclusion(null);
                      await agir(() => api.exclure(code, nom));
                    }}
                    onAnnuler={() => setExclusion(null)}
                    message="Il quitte la table et ne pourra plus s’y asseoir." />
    </Page>
  );
}


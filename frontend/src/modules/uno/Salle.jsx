import { Link } from 'react-router-dom';

import {
  Alerte, Badge, Bouton, Carte, CarteJeu, IcoCadenas, IcoCarteRole, IcoCopier,
  IcoInviter, IcoLien, IcoLune, IcoOeil, IcoRetour, IcoValide, Jauge, Pastille,
  Places, SaisieCode, Sr, useAction, useCopie,
} from '@ui';
import {
  cheminSpectateur, lancer, lienSpectateur, lienTable, pret as declarerPret,
  regler, rejoindre, reprendre,
} from './api';
import { ChoixRegles, RappelRegles, RecapRegles } from './ReglesUno';

// Ce qui entoure le jeu : l'en-tête d'une table, et la salle d'attente telle
// que la voient l'hôte, un joueur assis, ou qui arrive par un lien sans être
// encore assis.

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const duree = (s) => (s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// -- en-tête -----------------------------------------------------------------

function Statut({ table }) {
  if (table.etat === 'partie') {
    return <Badge couleur="orange" titre={`Manche ${table.manches} en cours`} />;
  }
  if (table.etat === 'finie') return <Badge couleur="vert" titre="Manche terminée" />;
  return (
    <Badge couleur="or">
      <Pastille couleur="or" compact />
      En attente de joueurs
    </Badge>
  );
}

// `spectateur` : vue sans compte ; `outils` (le lecteur) et `actions` (quitter,
// fermer) à droite.
export function EnTete({
  table, spectateur, outils, actions,
}) {
  const hote = table.hote === table.moi;
  let sur;
  if (spectateur) sur = 'UNO · spectateur';
  else if (table.membre && hote) sur = `UNO · table ${table.public ? 'publique' : 'sur invitation'}`;
  else {
    sur = (
      <>
        {`UNO · table de ${table.hote} · `}
        <span className="uno-entete-code">{table.code}</span>
      </>
    );
  }
  return (
    <header className="uno-entete">
      <Link to="/uno" className="uno-entete-retour" aria-label="Retour aux tables"
            title="Retour aux tables">
        <IcoRetour />
      </Link>
      <div className="uno-entete-titres">
        <p className="uno-entete-sur">{sur}</p>
        <h1 className="uno-entete-titre">
          {table.nom}
          <Sr>{`, table ${table.code}`}</Sr>
        </h1>
      </div>
      <Statut table={table} />
      <div className="uno-entete-outils">
        {outils}
        {actions}
      </div>
    </header>
  );
}

// -- places ------------------------------------------------------------------

// Les joueurs assis, pour `Places` : la ligne sous le nom et la teinte de la
// place (or : l'hôte, ou soi ; vert : prêt).
function placesDe(table) {
  const prets = table.prets || [];
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
    let ton;
    if (ici && (hote || (moi && !pret))) ton = 'or';
    else if (ici && pret) ton = 'vert';
    return {
      nom,
      detail: majuscule(mots.join(' · ') || 'assis'),
      ton,
      presence: ici,
      couronne: hote,
    };
  });
}

export function AutourTable({ table, onInviter, onExclure }) {
  return (
    <Carte titre="Autour de la table" className="uno-autour"
           actions={<Jauge valeur={table.joueurs.length} max={table.max_joueurs} unite="places" />}>
      <Places joueurs={placesDe(table)} max={table.max_joueurs} colonnes={5}
              libelle="Places autour de la table"
              onInviter={onInviter} libelleInviter="Copier le lien d’invitation"
              onRetirer={onExclure} retirable={(j) => j.nom !== table.moi} />
    </Carte>
  );
}

// -- invitations -------------------------------------------------------------

// Pour l'hôte : le code, le lien pour jouer et le lien pour regarder.
export function InviterTable({ code }) {
  const [codeCopie, copierCode] = useCopie();
  const [lienCopie, copierLien] = useCopie();
  const [vueCopie, copierVue] = useCopie();
  return (
    <Carte className="uno-inviter">
      <p className="uno-surtitre">Inviter à la table</p>
      <div className="uno-inviter-code">
        <SaisieCode lectureSeule valeur={code} libelle="Code de la table" />
        <Bouton icone={codeCopie ? <IcoValide /> : <IcoCopier />}
                libelle={codeCopie ? 'Code copié' : 'Copier le code'}
                onClick={() => copierCode(code)} />
      </div>
      <Bouton variante="principal" bloc icone={<IcoLien />}
              titre={lienCopie ? 'Lien copié !' : 'Copier le lien pour jouer'}
              onClick={() => copierLien(lienTable(code))} />
      <div className="uno-inviter-vue">
        <div>
          <strong>Lien spectateur</strong>
          <span className="dim">{`…${cheminSpectateur(code)} · sans compte`}</span>
        </div>
        <Bouton taille="s" titre={vueCopie ? 'Copié' : 'Copier'}
                onClick={() => copierVue(lienSpectateur(code))} />
      </div>
    </Carte>
  );
}

// Pour un joueur assis : les deux liens, à transmettre.
function FaireVenir({ code }) {
  const [lienCopie, copierLien] = useCopie();
  const [vueCopie, copierVue] = useCopie();
  return (
    <Carte className="uno-inviter">
      <p className="uno-surtitre">Faire venir un ami</p>
      <div className="uno-inviter-boutons">
        <Bouton titre={lienCopie ? 'Lien copié' : 'Copier le lien'}
                onClick={() => copierLien(lienTable(code))} />
        <Bouton titre={vueCopie ? 'Lien copié' : 'Lien spectateur'}
                onClick={() => copierVue(lienSpectateur(code))} />
      </div>
    </Carte>
  );
}

// -- bandeaux ----------------------------------------------------------------

// Pied de la salle : pictogramme, ce qui se passe, et l'action.
function Pied({
  ico, titre, texte, action,
}) {
  return (
    <section className="uno-pied" aria-label={titre}>
      <span className="uno-pied-ico" aria-hidden="true">{ico}</span>
      <div className="uno-pied-textes">
        <p className="uno-pied-titre">{titre}</p>
        <p className="dim">{texte}</p>
      </div>
      {action}
    </section>
  );
}

// Hôte absent : la table attend ; passé le délai, un joueur peut la
// reprendre.
function AbsenceHote({ table, onAction }) {
  const delai = table.delai_reprise;
  const peut = table.absence_hote >= delai;
  return (
    <div className="uno-absence" role="status">
      <span className="uno-absence-ico" aria-hidden="true"><IcoLune /></span>
      <div className="uno-absence-textes">
        <p className="uno-absence-titre">{`L’hôte, ${table.hote}, s’est absenté`}</p>
        <p>
          {'La partie démarrera dès son retour. '}
          {peut ? 'Vous pouvez reprendre la table.'
            : `Vous pourrez reprendre la table s’il reste absent ${duree(delai)}.`}
        </p>
      </div>
      <Bouton titre="Reprendre la table" disabled={!peut}
              onClick={() => onAction(() => reprendre(table.code))} />
    </div>
  );
}

// -- salle d'attente ---------------------------------------------------------

function PiedHote({ table, onAction }) {
  const manque = table.min_joueurs - table.joueurs.length;
  if (manque > 0) {
    return (
      <Pied ico={<IcoInviter />} titre={`Il manque encore ${pluriel(manque, 'joueur')}`}
            texte={'Partagez le code ou le lien : la distribution se débloque à '
              + `${table.min_joueurs} joueurs.`}
            action={<Bouton taille="l" icone={<IcoCadenas />} disabled titre="Distribuer les cartes" />} />
    );
  }
  const autres = table.joueurs.filter((j) => j !== table.moi);
  const prets = (table.prets || []).filter((j) => autres.includes(j)).length;
  return (
    <Pied ico={<IcoCarteRole />}
          titre={prets === autres.length ? 'Tout le monde est prêt'
            : `${prets} sur ${pluriel(autres.length, 'joueur')} ${prets > 1 ? 'sont prêts' : 'est prêt'}`}
          texte="Distribuez quand vous voulez : chaque joueur assis reçoit sa main."
          action={(
            <Bouton variante="principal" taille="l" icone={<IcoCarteRole />}
                    titre="Distribuer les cartes"
                    onClick={() => onAction(() => lancer(table.code))} />
          )} />
  );
}

function PiedJoueur({ table, onAction }) {
  const pret = (table.prets || []).includes(table.moi);
  return (
    <Pied ico={(
      <span className="uno-pied-cartes">
        <CarteJeu taille="xs" face="verso" />
        <CarteJeu taille="xs" couleur="rouge" valeur="7" />
      </span>
    )}
          titre={pret ? 'Vous êtes prêt' : 'Êtes-vous prêt ?'}
          texte={`${table.hote} distribuera les cartes quand tout le monde sera assis.`}
          action={pret ? (
            <Bouton couleur="vert" taille="l" icone={<IcoValide />} titre="Prêt"
                    aria-pressed="true" title="Ne plus être prêt"
                    onClick={() => onAction(() => declarerPret(table.code, false))} />
          ) : (
            <Bouton variante="principal" couleur="vert" taille="l" titre="Je suis prêt"
                    aria-pressed="false"
                    onClick={() => onAction(() => declarerPret(table.code, true))} />
          )} />
  );
}

export function SalleAttente({
  table, onAction, onExclure,
}) {
  const hote = table.hote === table.moi;
  const [, copier] = useCopie();
  return (
    <div className="uno-salle">
      {!hote && table.absence_hote != null && <AbsenceHote table={table} onAction={onAction} />}
      <div className="uno-salle-principal">
        <AutourTable table={table}
                     onInviter={hote ? () => copier(lienTable(table.code)) : undefined}
                     onExclure={hote ? onExclure : undefined} />
        {hote ? <PiedHote table={table} onAction={onAction} />
          : <PiedJoueur table={table} onAction={onAction} />}
      </div>
      <aside className="uno-salle-cote" aria-label="Table">
        {hote ? (
          <>
            <InviterTable code={table.code} />
            <Carte titre="Règles"
                   actions={<span className="dim uno-note">Modifiables jusqu’à la donne</span>}>
              <ChoixRegles colonne regles={table.regles}
                           onChange={(regles) => onAction(() => regler(table.code, regles))} />
            </Carte>
          </>
        ) : (
          <>
            <Carte titre="Règles de la table"
                   actions={<span className="dim uno-note">Choisies par l’hôte</span>}>
              <RecapRegles regles={table.regles} />
              <RappelRegles />
            </Carte>
            <FaireVenir code={table.code} />
          </>
        )}
      </aside>
    </div>
  );
}

// Arrivé par un lien, pas encore assis : la table, ses règles, et de quoi
// s'asseoir ou regarder.
export function Invitation({ table, onAssis }) {
  const action = useAction();
  const pleine = table.joueurs.length >= table.max_joueurs;
  const enManche = table.etat === 'partie';
  const asseoir = async () => {
    const r = await action.executer(() => rejoindre(table.code));
    if (r.ok) onAssis();
  };
  let texte = 'Asseyez-vous : vous jouerez la prochaine manche.';
  if (table.exclu) texte = 'L’hôte vous a exclu de cette table.';
  else if (pleine) texte = 'La table est complète : vous pouvez la regarder.';
  else if (enManche) texte = 'Une manche est en cours : vous pourrez vous asseoir à la fin.';
  return (
    <div className="uno-salle">
      <div className="uno-salle-principal">
        <AutourTable table={table} />
        {action.erreur && <Alerte compacte>{action.erreur}</Alerte>}
        <Pied ico={<IcoInviter />} titre={`Vous êtes invité à la table de ${table.hote}`}
              texte={texte}
              action={(
                <Bouton variante="principal" taille="l" waiting={action.occupe}
                        disabled={pleine || enManche || table.exclu}
                        titre="S’asseoir à la table" onClick={asseoir} />
              )} />
      </div>
      <aside className="uno-salle-cote" aria-label="Table">
        <Carte titre="Règles de la table"
               actions={<span className="dim uno-note">Choisies par l’hôte</span>}>
          <RecapRegles regles={table.regles} />
          <RappelRegles />
        </Carte>
        <Carte className="uno-inviter">
          <p className="uno-surtitre">Sans jouer</p>
          <Link to={cheminSpectateur(table.code)} className="uno-lien uno-lien-ico">
            <IcoOeil />
            Regarder en spectateur
          </Link>
        </Carte>
      </aside>
    </div>
  );
}

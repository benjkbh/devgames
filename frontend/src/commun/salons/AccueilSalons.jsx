import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { usePresence } from '../../coque/presence';
import {
  Alerte, Badge, Banniere, Bouton, Carte, Champ, Chargement, FilAriane,
  IcoComptes, IcoOeil, IcoPlus, IcoRecharger, Pastille, Page, QuestionChoix,
  Saisie, SaisieCode, cx, useAction, useLecture,
} from '@ui';
import './salons.css';

// Accueil des tables d'un jeu : ouvrir une table, en rejoindre une par son
// code, ou dans la liste des tables ouvertes. Commun à tous les jeux à tables
// (`commun/salons/api.js`) ; le jeu fournit son habillage et ses réglages.
//
//   prefixe       préfixe des classes CSS et des identifiants du jeu
//   chemin        chemin du module : une table s'ouvre à `<chemin>/<code>`
//   api           `{ lireTables, creerTable, rejoindre }` du jeu
//   Ico           icône d'une table
//   fil           fil d'Ariane (« Jeux de la veillée », « UNO ») ;
//                 `outils` : à sa droite (le lecteur de musique)
//   banniere      props de la `Banniere` (titre, description, illustration…)
//                 ; les compteurs sont ajoutés ici
//   nomDefaut     début du nom d'une table créée sans nom (« Table de ») ;
//                 `moi` : le compte connecté, qui le complète
//   minJoueurs, maxJoueurs  pour le résumé de la table
//   reglages      réglages du jeu à la création, envoyés à `creerTable`
//   Reglages      leurs champs : `({ valeur, onChange })` ; `titreReglages` et
//                 `noteReglages` les surmontent ; `resumeReglages(valeur)` :
//                 leur part du résumé (« 1 variante »), ou rien
//   detail        précision d'une table de la liste (`(table) => texte`)
//   cheminSpectateur  `(code) => chemin` : regarder une table sans jouer
//   vide          texte de la liste sans table ouverte

const ETATS = {
  attente: ['En attente', 'bleu'],
  partie: ['Manche en cours', 'orange'],
  finie: ['Manche terminée', 'vert'],
};

const VISIBILITES = [
  { valeur: 'publique', libelle: 'Publique' },
  { valeur: 'invitation', libelle: 'Sur invitation' },
];

const pluriel = (n, mot) => `${mot}${n > 1 ? 's' : ''}`;

function ListeTables({
  prefixe, Ico, detail, tables, action, titreAction, max,
}) {
  return (
    <ul className={`${prefixe}-tables salons-tables`}>
      {tables.map((t) => {
        const [etat, couleur] = ETATS[t.etat] || ETATS.attente;
        const precision = detail && detail(t);
        return (
          <li key={t.code} className={`${prefixe}-tables-ligne salons-table`}>
            <Ico className={`${prefixe}-tables-ico salons-table-ico`} />
            <div className={`${prefixe}-tables-nom salons-table-nom`}>
              <strong>{t.nom}</strong>
              <span className="dim">
                {`${t.code} · ${t.hote}`}
                {precision && ` · ${precision}`}
              </span>
            </div>
            <span className="salons-table-joueurs" title="Joueurs assis">
              <IcoComptes />
              {max ? `${t.joueurs.length}/${max}` : t.joueurs.length}
            </span>
            <Badge couleur={couleur} titre={etat} />
            <Bouton taille="s" titre={titreAction} onClick={() => action(t.code)} />
          </li>
        );
      })}
    </ul>
  );
}

export function AccueilSalons({
  prefixe, chemin, api, Ico, fil, outils, banniere, nomDefaut, moi,
  minJoueurs, maxJoueurs, reglages: reglagesInitiaux = {}, Reglages,
  titreReglages, noteReglages, resumeReglages, detail, cheminSpectateur,
  vide = 'Ouvrez la première table, elle apparaîtra ici pour tout le monde.',
}) {
  const naviguer = useNavigate();
  const [nom, setNom] = useState('');
  const [visibilite, setVisibilite] = useState('publique');
  const [reglages, setReglages] = useState(reglagesInitiaux);
  const [code, setCode] = useState('');
  const creation = useAction();
  const entree = useAction();
  const { donnees, erreur, relire } = useLecture(api.lireTables, {}, 4000);
  const { comptes } = usePresence();
  const champNom = useRef(null);
  const enLigne = comptes.filter((c) => c.en_ligne).length;
  const ouvertes = donnees ? donnees.ouvertes.length : 0;
  const miennes = donnees ? donnees.miennes.length : 0;
  const publique = visibilite === 'publique';
  const complet = code.length === 5;
  const idNom = `${prefixe}-nom`;
  const idCode = `${prefixe}-code`;
  const liste = {
    prefixe, Ico, detail, max: maxJoueurs,
  };
  const resume = resumeReglages && resumeReglages(reglages);

  const ouvrir = (c) => naviguer(`${chemin}/${c}`);
  const creer = async (e) => {
    e.preventDefault();
    const r = await creation.executer(() => api.creerTable(nom, publique, reglages));
    if (r.ok) ouvrir(r.resultat.code);
  };
  const entrer = async (c) => {
    const r = await entree.executer(() => api.rejoindre(c));
    if (r.ok) ouvrir(r.resultat.code);
  };
  const versCreation = () => champNom.current && champNom.current.focus();

  return (
    <Page className={`${prefixe}-accueil salons-accueil`}>
      <div className="salons-barre">
        {fil && <FilAriane elements={fil} />}
        {outils}
      </div>
      <Banniere
        {...banniere}
        compteurs={[
          {
            icone: <Pastille couleur="vert" compact />,
            valeur: enLigne,
            libelle: `${pluriel(enLigne, 'joueur')} en ligne`,
          },
          {
            valeur: donnees ? ouvertes : '–',
            libelle: `${pluriel(ouvertes, 'table')} ${pluriel(ouvertes, 'ouverte')}`,
          },
          { valeur: donnees ? miennes : '–', libelle: 'de vos tables' },
        ]} />

      <div className="salons-grille">
        <Carte titre="Ouvrir une table" className="salons-creation"
               actions={<span className="dim salons-note">Vous serez l’hôte et distribuerez les cartes</span>}>
          <form onSubmit={creer}>
            <div className="salons-creation-corps">
              <div className="salons-creation-ligne">
                <Champ id={idNom}
                       libelle={<>Nom de la table<span className="dim"> — facultatif</span></>}>
                  <Saisie id={idNom} ref={champNom} value={nom} maxLength={40}
                          placeholder={moi ? `${nomDefaut} ${moi}` : `${nomDefaut} …`}
                          onChange={(e) => setNom(e.target.value)} />
                </Champ>
                <QuestionChoix nom={`${prefixe}-visibilite`} legende="Visibilité"
                               disposition="segments" options={VISIBILITES}
                               valeur={visibilite} onChange={setVisibilite}
                               note={publique ? 'Affichée dans « Tables ouvertes ».'
                                 : 'Seuls ceux qui ont le code ou le lien la trouvent.'} />
              </div>
              {Reglages && (
                <div className="salons-reglages">
                  {titreReglages && (
                    <div className="salons-reglages-tete">
                      <span className="salons-reglages-titre">{titreReglages}</span>
                      {noteReglages && <span className="dim salons-note">{noteReglages}</span>}
                    </div>
                  )}
                  <Reglages valeur={reglages} onChange={setReglages} />
                </div>
              )}
              {creation.erreur && <Alerte compacte>{creation.erreur}</Alerte>}
            </div>
            <div className="salons-creation-pied">
              <span className="dim">
                {`${publique ? 'Publique' : 'Sur invitation'}`}
                {minJoueurs && maxJoueurs && ` · ${minJoueurs} à ${maxJoueurs} joueurs`}
                {resume && (
                  <>
                    {' · '}
                    <strong className="salons-accent">{resume}</strong>
                  </>
                )}
              </span>
              <Bouton type="submit" variante="principal" icone={<IcoPlus />}
                      waiting={creation.occupe} titre="Ouvrir la table" />
            </div>
          </form>
        </Carte>

        <div className="salons-cote">
          <Carte titre="Rejoindre une table" className="salons-rejoindre">
            <form className="salons-rejoindre-corps"
                  onSubmit={(e) => { e.preventDefault(); if (complet) entrer(code); }}>
              <Champ id={idCode} libelle="Code à 5 caractères"
                     aide="Collez un lien ou un code complet, il se répartit tout seul.">
                <SaisieCode id={idCode} valeur={code} onChange={setCode}
                            libelle="Code de la table" />
              </Champ>
              {entree.erreur && <Alerte compacte>{entree.erreur}</Alerte>}
              <Bouton type="submit" variante={complet ? 'principal' : 'secondaire'} bloc
                      disabled={!complet} waiting={entree.occupe}
                      titre="S’asseoir à la table" />
              {cheminSpectateur && (
                <Link className={cx('salons-spectateur', !complet && 'inactif')}
                      to={complet ? cheminSpectateur(code) : '#'}
                      aria-disabled={!complet || undefined}
                      onClick={(e) => { if (!complet) e.preventDefault(); }}>
                  <IcoOeil />
                  Regarder en spectateur
                </Link>
              )}
            </form>
          </Carte>

          {donnees && miennes > 0 && (
            <Carte titre={<>Vos tables <Badge titre={String(miennes)} /></>}>
              <ListeTables {...liste} tables={donnees.miennes} action={ouvrir}
                           titreAction="Reprendre" />
            </Carte>
          )}

          <Carte titre={<>Tables ouvertes <Badge titre={donnees ? String(ouvertes) : '–'} /></>}
                 className="salons-ouvertes"
                 actions={(
                   <Bouton taille="s" icone={<IcoRecharger />} libelle="Actualiser la liste"
                           onClick={relire} />
                 )}>
            {erreur && <Alerte compacte>{erreur}</Alerte>}
            {!donnees && !erreur && <Chargement texte="Lecture des tables…" />}
            {donnees && ouvertes === 0 && (
              <div className="salons-vide">
                <span className="salons-vide-cartes" aria-hidden="true"><i /><i /></span>
                <p className="salons-vide-titre">Personne ne joue pour l’instant</p>
                <p className="dim">{vide}</p>
                <Bouton titre="Ouvrir une table" onClick={versCreation} />
              </div>
            )}
            {donnees && ouvertes > 0 && (
              <ListeTables {...liste} tables={donnees.ouvertes} action={entrer}
                           titreAction="S’asseoir" />
            )}
          </Carte>
        </div>
      </div>
    </Page>
  );
}

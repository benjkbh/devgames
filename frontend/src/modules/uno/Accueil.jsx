import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePresence } from '../../coque/presence';
import {
  Alerte, Badge, Banniere, Bouton, Carte, CarteJeu, Champ, Chargement,
  EtatVide, Eventail, IcoCarteRole, IcoComptes, IcoPlus, Page, QuestionBool,
  Saisie, Section, useAction, useLecture,
} from '../../ui';
import { creerTable, lireTables, rejoindre } from './api';
import { REGLES, REGLES_DEFAUT, reglesActives } from './regles';

// Accueil du module : créer une table, en rejoindre une par son code, ou
// dans la liste des tables publiques ouvertes.

const ETATS = {
  attente: ['En attente', 'bleu'],
  partie: ['Manche en cours', 'orange'],
  finie: ['Manche terminée', 'vert'],
};

function ListeTables({ tables, action, titreAction, vide }) {
  if (!tables.length) return <p className="dim">{vide}</p>;
  return (
    <ul className="uno-tables">
      {tables.map((t) => {
        const [etat, couleur] = ETATS[t.etat] || ETATS.attente;
        return (
          <li key={t.code} className="uno-tables-ligne">
            <IcoCarteRole className="uno-tables-ico" />
            <div className="uno-tables-nom">
              <strong>{t.nom}</strong>
              <span className="dim">
                {`Code ${t.code} · hôte : ${t.hote}`}
                {reglesActives(t.regles).length > 0
                  && ` · ${reglesActives(t.regles).join(', ')}`}
              </span>
            </div>
            <span className="uno-tables-joueurs" title="Joueurs assis">
              <IcoComptes />
              {t.joueurs.length}
            </span>
            <Badge couleur={couleur} titre={etat} />
            <Bouton taille="s" titre={titreAction} onClick={() => action(t.code)} />
          </li>
        );
      })}
    </ul>
  );
}

export default function Accueil() {
  const naviguer = useNavigate();
  const [nom, setNom] = useState('');
  const [publique, setPublique] = useState(true);
  const [regles, setRegles] = useState(REGLES_DEFAUT);
  const [code, setCode] = useState('');
  const creation = useAction();
  const entree = useAction();
  const { donnees, erreur } = useLecture(lireTables, {}, 4000);
  const { comptes } = usePresence();
  const enLigne = comptes.filter((c) => c.en_ligne).length;
  const compte = (n) => (donnees ? n : '–');

  const ouvrir = (c) => naviguer(`/uno/${c}`);
  const creer = async (e) => {
    e.preventDefault();
    const r = await creation.executer(() => creerTable(nom, publique, regles));
    if (r.ok) ouvrir(r.resultat.code);
  };
  const entrer = async (c) => {
    const r = await entree.executer(() => rejoindre(c));
    if (r.ok) ouvrir(r.resultat.code);
  };

  return (
    <Page className="uno-accueil">
      <Banniere
        surtitre="Jeux de la veillée"
        titre="UNO à Thiercelieux"
        description={'Ouvrez une table et partagez son code ou son lien : '
          + 'jusqu’à 10 joueurs, règles classiques. Premier à poser toutes '
          + 'ses cartes, sans oublier de crier « UNO ! ».'}
        actions={(
          <>
            <Bouton variante="principal" taille="l" icone={<IcoPlus />}
                    titre="Créer une table"
                    onClick={() => document.getElementById('uno-nom').focus()} />
            <Bouton taille="l" titre="Entrer un code"
                    onClick={() => document.getElementById('uno-code').focus()} />
          </>
        )}
        illustration={(
          <Eventail arc chevauchement={0.55} className="uno-banniere-cartes">
            <CarteJeu taille="m" couleur="rouge" valeur="7" />
            <CarteJeu taille="m" couleur="jaune" valeur="inversion" />
            <CarteJeu taille="m" valeur="+4" />
            <CarteJeu taille="m" couleur="vert" valeur="passe" />
            <CarteJeu taille="m" couleur="bleu" valeur="2" />
          </Eventail>
        )}
        compteurs={[
          { icone: <IcoCarteRole />, valeur: compte(donnees && donnees.ouvertes.length), libelle: 'tables ouvertes' },
          { icone: <IcoComptes />, valeur: enLigne, libelle: 'en ligne' },
          { icone: <IcoCarteRole />, valeur: compte(donnees && donnees.miennes.length), libelle: 'mes tables' },
        ]} />

      <div className="uno-accueil-grille">
        <Carte titre="Créer une table">
          <form className="uno-formulaire" onSubmit={creer}>
            <Champ id="uno-nom" libelle="Nom de la table"
                   aide="Facultatif : « Table de … » par défaut.">
              <Saisie id="uno-nom" value={nom} maxLength={40}
                      placeholder="Soirée du vendredi"
                      onChange={(e) => setNom(e.target.value)} />
            </Champ>
            <QuestionBool libelle="Table publique" checked={publique}
                          description="Visible dans la liste des tables ouvertes. Sinon, seuls ceux qui ont le code ou le lien peuvent s’asseoir."
                          onChange={setPublique} />
            {REGLES.map(({ cle, titre, aide }) => (
              <QuestionBool key={cle} libelle={titre} description={aide}
                            checked={regles[cle]}
                            onChange={(v) => setRegles({ ...regles, [cle]: v })} />
            ))}
            {creation.erreur && <Alerte compacte>{creation.erreur}</Alerte>}
            <Bouton type="submit" variante="principal" icone={<IcoPlus />}
                    waiting={creation.occupe} titre="Créer la table" />
          </form>
        </Carte>

        <Carte titre="Rejoindre avec un code">
          <form className="uno-formulaire"
                onSubmit={(e) => { e.preventDefault(); entrer(code); }}>
            <Champ id="uno-code" libelle="Code de la table"
                   aide="5 caractères, donnés par l’hôte. Un lien partagé ouvre directement la table.">
              <Saisie id="uno-code" value={code} maxLength={5}
                      className="uno-saisie-code" autoComplete="off"
                      placeholder="K7Q2M"
                      onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </Champ>
            {entree.erreur && <Alerte compacte>{entree.erreur}</Alerte>}
            <Bouton type="submit" variante="principal"
                    disabled={code.trim().length < 5}
                    waiting={entree.occupe} titre="S’asseoir" />
          </form>
        </Carte>
      </div>

      {erreur && <Alerte>{erreur}</Alerte>}
      {!donnees && !erreur && <Chargement texte="Lecture des tables…" />}
      {donnees && (
        <>
          {donnees.miennes.length > 0 && (
            <Section titre="Mes tables" suffixe={donnees.miennes.length}>
              <ListeTables tables={donnees.miennes} action={ouvrir}
                           titreAction="Reprendre" vide="" />
            </Section>
          )}
          <Section titre="Tables ouvertes" suffixe={donnees.ouvertes.length}>
            {donnees.ouvertes.length === 0 ? (
              <EtatVide compact titre="Aucune table publique"
                        icone={<IcoCarteRole />}>
                Créez la vôtre et invitez vos amis avec son lien.
              </EtatVide>
            ) : (
              <ListeTables tables={donnees.ouvertes} action={entrer}
                           titreAction="S’asseoir" vide="" />
            )}
          </Section>
        </>
      )}
    </Page>
  );
}

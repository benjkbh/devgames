import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePresence } from '../../coque/presence';
import {
  Alerte, Badge, Banniere, Bouton, Carte, Champ, Chargement, EtatVide,
  IcoComptes, IcoPlus, Page, QuestionBool, QuestionChoix, Saisie, Section,
  useAction, useLecture,
} from '../../ui';
import { creerTable, lireTables, rejoindre } from './api';
import { IcoManoir, Manoir } from './decor';
import { OPTIONS_LISTES, nomListe, resumeListe } from './listes';

// Accueil du module : créer une table, en rejoindre une par son code, ou
// dans la liste des tables publiques ouvertes.

const ETATS = {
  attente: ['En attente', 'bleu'],
  partie: ['Manche en cours', 'orange'],
  finie: ['Manche terminée', 'vert'],
};

function ListeTables({ tables, action, titreAction }) {
  return (
    <ul className="cn-tables">
      {tables.map((t) => {
        const [etat, couleur] = ETATS[t.etat] || ETATS.attente;
        return (
          <li key={t.code} className="cn-tables-ligne">
            <IcoManoir className="cn-tables-ico" />
            <div className="cn-tables-nom">
              <strong>{t.nom}</strong>
              <span className="dim">
                {`Code ${t.code} · hôte : ${t.hote} · mots : ${nomListe(t.liste)}`}
              </span>
            </div>
            <span className="cn-tables-joueurs" title="Joueurs assis">
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
  const [liste, setListe] = useState('melange');
  const [code, setCode] = useState('');
  const creation = useAction();
  const entree = useAction();
  const { donnees, erreur } = useLecture(lireTables, {}, 4000);
  const { comptes } = usePresence();
  const enLigne = comptes.filter((c) => c.en_ligne).length;
  const compte = (n) => (donnees ? n : '–');

  const ouvrir = (c) => naviguer(`/codenames/${c}`);
  const creer = async (e) => {
    e.preventDefault();
    const r = await creation.executer(() => creerTable(nom, publique, liste));
    if (r.ok) ouvrir(r.resultat.code);
  };
  const entrer = async (c) => {
    const r = await entree.executer(() => rejoindre(c));
    if (r.ok) ouvrir(r.resultat.code);
  };

  return (
    <Page className="cn-accueil">
      <Banniere
        className="cn-banniere"
        decor={false}
        surtitre="Jeux du manoir"
        titre="Code Names au manoir"
        description={'Vampires contre Chasseurs, dans la galerie des portraits. '
          + 'D’un seul mot, l’oracle de chaque camp guide ses agents vers les '
          + 'siens… sans jamais ouvrir le cercueil du Comte. De 4 à 16 joueurs.'}
        actions={(
          <>
            <Bouton variante="principal" taille="l" icone={<IcoPlus />}
                    titre="Créer une table"
                    onClick={() => document.getElementById('cn-nom').focus()} />
            <Bouton taille="l" titre="Entrer un code"
                    onClick={() => document.getElementById('cn-code').focus()} />
          </>
        )}
        illustration={<Manoir className="cn-banniere-manoir" />}
        compteurs={[
          { icone: <IcoManoir />, valeur: compte(donnees && donnees.ouvertes.length), libelle: 'tables ouvertes' },
          { icone: <IcoComptes />, valeur: enLigne, libelle: 'en ligne' },
          { icone: <IcoManoir />, valeur: compte(donnees && donnees.miennes.length), libelle: 'mes tables' },
        ]} />

      <div className="cn-accueil-grille">
        <Carte titre="Créer une table">
          <form className="cn-formulaire" onSubmit={creer}>
            <Champ id="cn-nom" libelle="Nom de la table"
                   aide="Facultatif : « Manoir de … » par défaut.">
              <Saisie id="cn-nom" value={nom} maxLength={40}
                      placeholder="Nuit au manoir"
                      onChange={(e) => setNom(e.target.value)} />
            </Champ>
            <QuestionBool libelle="Table publique" checked={publique}
                          description="Visible dans la liste des tables ouvertes. Sinon, seuls ceux qui ont le code ou le lien peuvent s’asseoir."
                          onChange={setPublique} />
            <QuestionChoix nom="cn-liste" legende="Mots des portraits"
                           disposition="segments" options={OPTIONS_LISTES}
                           note={resumeListe(liste)}
                           valeur={liste} onChange={setListe} />
            {creation.erreur && <Alerte compacte>{creation.erreur}</Alerte>}
            <Bouton type="submit" variante="principal" icone={<IcoPlus />}
                    waiting={creation.occupe} titre="Créer la table" />
          </form>
        </Carte>

        <Carte titre="Rejoindre avec un code">
          <form className="cn-formulaire"
                onSubmit={(e) => { e.preventDefault(); entrer(code); }}>
            <Champ id="cn-code" libelle="Code de la table"
                   aide="5 caractères, donnés par l’hôte. Un lien partagé ouvre directement la table.">
              <Saisie id="cn-code" value={code} maxLength={5}
                      className="cn-saisie-code" autoComplete="off"
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
                           titreAction="Reprendre" />
            </Section>
          )}
          <Section titre="Tables ouvertes" suffixe={donnees.ouvertes.length}>
            {donnees.ouvertes.length === 0 ? (
              <EtatVide compact titre="Aucune table publique"
                        icone={<IcoManoir />}>
                Créez la vôtre et invitez vos amis avec son lien.
              </EtatVide>
            ) : (
              <ListeTables tables={donnees.ouvertes} action={entrer}
                           titreAction="S’asseoir" />
            )}
          </Section>
        </>
      )}
    </Page>
  );
}

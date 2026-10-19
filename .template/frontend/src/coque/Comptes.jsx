import { useState } from 'react';

import {
  creerCompte, lireComptes, modifierCompte, supprimerCompte,
} from './session';
import { MODULES, cleDroit } from './modules';
import {
  Alerte, Badge, Bouton, QuestionBool,
  Chargement, Confirmation, DialogueFormulaire, FenetreDetail, QuestionChoix,
  IcoPlus, Page, TableauDonnees, useAction, useChargement, dateLocaleComplete,
  ChampSaisie,
} from '../ui';
import './comptes.css';

const CHAMP_NOM = { type: 'texte', libelle: 'Nom d’utilisateur' };
const CHAMP_MDP = { type: 'mot_de_passe', libelle: 'Mot de passe' };

// Gestion des comptes, réservée au superadministrateur (le serveur vérifie).
// Une ligne par compte ; le bouton de tête ouvre la fenêtre du choix du rôle
// sur chaque module.
// Modules et rôles viennent du registre `coque/modules.jsx`.

// Rôle le plus étendu d'un module (celui d'un superadministrateur).
const plusEtendu = (module) => module.roles[module.roles.length - 1].cle;

// Rôle tenu sur un module, ou null ; les rôles sont parcourus du plus fort au
// plus faible.
function roleDe(compte, module) {
  if (compte.superadmin) return plusEtendu(module);
  for (let i = module.roles.length - 1; i >= 0; i -= 1) {
    if (compte.droits.includes(cleDroit(module.cle, module.roles[i].cle))) {
      return module.roles[i].cle;
    }
  }
  return null;
}

// Résumé d'une ligne repliée : « Clients · Opérateur ».
function resumeAcces(compte) {
  if (compte.superadmin) return 'Tous les modules, tous les rôles';
  const bouts = MODULES.map((m) => {
    const role = roleDe(compte, m);
    if (!role) return null;
    const r = m.roles.find((x) => x.cle === role);
    // Un module à rôle unique n'a pas de rôle à nommer : le module suffit.
    return m.roles.length > 1 ? `${m.libelle} · ${r.libelle}` : m.libelle;
  }).filter(Boolean);
  return bouts.length ? bouts.join(', ') : 'Aucun accès';
}

// Choix du rôle sur un module, par boutons radio : choix exclusif, avec une
// option `Aucun`. Sert à la création et à la modification.
function ChoixRole({ nom, module, valeur, onChoisir, verrouille, note }) {
  const options = [
    { valeur: '', libelle: 'Aucun', resume: 'N’ouvre pas ce module.' },
    ...module.roles.map((r) => ({
      valeur: r.cle, libelle: r.libelle, resume: r.resume,
    })),
  ];
  return (
    <QuestionChoix
      className="choix-role"
      nom={nom}
      legende={module.libelle}
      options={options}
      valeur={valeur}
      desactive={verrouille}
      onChange={(role) => onChoisir(module.cle, role)}
      note={note}
    />
  );
}

function Creation({ ouvert, onFermer, onCree }) {
  const [nom, setNom] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  // { module -> role }, chaîne vide pour « aucun ».
  const [roles, setRoles] = useState({});
  const [superadmin, setSuperadmin] = useState(false);
  const { occupe, erreur, setErreur, executer } = useAction();

  function fermer() {
    setErreur('');
    onFermer();
  }

  async function soumettre(e) {
    e.preventDefault();
    const droits = Object.entries(roles)
      .filter(([, r]) => r)
      .map(([m, r]) => cleDroit(m, r));
    const r = await executer(() => onCree({
      nom, mot_de_passe: motDePasse, droits, superadmin,
    }));
    if (!r.ok) return;
    setNom(''); setMotDePasse(''); setRoles({}); setSuperadmin(false);
    onFermer();
  }

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      taille="l"
      titre="Nouveau compte"
      description={'Le compte ouvre les modules qui lui sont accordés, avec '
        + 'le rôle choisi sur chacun.'}
      onFermer={fermer}
      onSubmit={soumettre}
      libelleEnvoi="Créer le compte"
      occupe={occupe}
      erreur={erreur}
      erreurCompacte={false}
    >
      <div className="creation-champs">
        <ChampSaisie id="c-nom" champ={CHAMP_NOM} valeur={nom}
                     onChange={setNom} required autoFocus />
        <ChampSaisie id="c-mdp" champ={CHAMP_MDP} valeur={motDePasse}
                     onChange={setMotDePasse} required
                     autoComplete="new-password" />
      </div>
      <div className="grille-roles">
        {MODULES.map((m) => (
          <ChoixRole
            key={m.cle}
            nom={`creation-${m.cle}`}
            module={m}
            valeur={superadmin ? plusEtendu(m) : (roles[m.cle] || '')}
            verrouille={superadmin}
            onChoisir={(module, role) => setRoles((r) => ({
              ...r, [module]: role,
            }))}
          />
        ))}
      </div>
      {/* Case superadministrateur. */}
      <QuestionBool
        className="creation-super"
        libelle="Superadministrateur"
        description="Tous les modules, présents et à venir, et cette page."
        checked={superadmin}
        onChange={setSuperadmin}
      />
    </DialogueFormulaire>
  );
}

// Boîte de saisie du nouveau mot de passe d'un compte.
function MotDePasse({ nom, onFermer, onChanger }) {
  const [nouveau, setNouveau] = useState('');
  const { occupe, erreur, executer } = useAction();
  return (
    <DialogueFormulaire
      ouvert={Boolean(nom)}
      titre="Nouveau mot de passe"
      description={nom ? `Pour le compte ${nom}.` : undefined}
      onFermer={onFermer}
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await executer(() => onChanger(nom, nouveau));
        if (r.ok) { setNouveau(''); onFermer(); }
      }}
      libelleEnvoi="Changer"
      occupe={occupe}
      erreur={erreur}
      erreurCompacte={false}
    >
      <ChampSaisie id="r-mdp" champ={CHAMP_MDP} valeur={nouveau}
                   onChange={setNouveau} required autoFocus
                   autoComplete="new-password" />
    </DialogueFormulaire>
  );
}

// Fenêtre des accès d'un compte : un choix de rôle par module, enregistré dès
// le clic (`onChoisir(compte, module, role)`). `compte` absent : fermée.
function FenetreAcces({ compte, occupe, onChoisir, onFermer }) {
  if (!compte) return null;
  const c = compte;
  return (
    <FenetreDetail
      ouvert
      taille="l"
      titre={`Accès de ${c.nom}`}
      entete={(
        <>
          {c.fondateur && <Badge couleur="vert" titre="fondateur" />}
          {c.superadmin && !c.fondateur && <Badge couleur="vert" titre="super" />}
          {c.actif ? <Badge couleur="vert" titre="actif" /> : <Badge titre="désactivé" />}
        </>
      )}
      onFermer={onFermer}
    >
      <div className="grille-roles">
        {MODULES.map((m) => (
          <ChoixRole
            key={m.cle}
            nom={`role-${c.nom}-${m.cle}`}
            module={m}
            valeur={roleDe(c, m) || ''}
            verrouille={c.superadmin || occupe}
            onChoisir={(module, role) => onChoisir(c, module, role)}
            note={c.superadmin
              ? 'Un superadministrateur tient le rôle le plus étendu de chaque '
                + 'module, y compris ceux ajoutés plus tard. Rétrogradez-le '
                + 'pour lui donner des rôles ordinaires.'
              : undefined}
          />
        ))}
      </div>
    </FenetreDetail>
  );
}

export default function Comptes({ session, onChange }) {
  const lecture = useChargement(() => lireComptes().then((d) => d.comptes), []);
  const { occupe, erreur, executer } = useAction();
  // Nom du compte dont la fenêtre des accès est ouverte.
  const [acces, setAcces] = useState(null);
  const [creation, setCreation] = useState(false);
  const [reinit, setReinit] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);

  // Après chaque écriture : recharge la liste et rafraîchit la session de la
  // coque.
  const apresEcriture = async () => {
    await lecture.recharger();
    if (onChange) await onChange();
  };
  const agir = (action) => executer(async () => {
    await action();
    await apresEcriture();
  });

  // Un rôle choisi est envoyé aussitôt au serveur ; la ligne est mise à jour
  // depuis la réponse.
  const choisirRole = (compte, module, role) => agir(() => {
    const autres = compte.droits.filter((d) => !d.startsWith(`${module}:`));
    return modifierCompte({
      nom: compte.nom,
      droits: role ? [...autres, cleDroit(module, role)] : autres,
    });
  });

  // Création et mot de passe laissent remonter l'erreur : elle s'affiche dans
  // leur boîte.
  const creer = async (compte) => {
    await creerCompte(compte);
    await apresEcriture();
  };
  const changerMotDePasse = (nom, motDePasse) => modifierCompte({
    nom, mot_de_passe: motDePasse,
  });

  const moi = session.compte ? session.compte.nom : null;
  const jeSuisFondateur = Boolean(session.compte && session.compte.fondateur);

  // Boutons d'une ligne. Mot de passe du fondateur : modifiable par lui seul.
  // Nommer et rétrograder : fondateur seul, sur les autres comptes. Ni
  // désactivation ni suppression de son propre compte.
  const actionsCompte = (c) => [
    {
      titre: 'Mot de passe', disabled: occupe,
      visible: !c.fondateur || c.nom === moi,
      onClick: () => setReinit(c.nom),
    },
    {
      titre: c.superadmin ? 'Rétrograder' : 'Nommer superadministrateur',
      disabled: occupe, visible: jeSuisFondateur && !c.fondateur,
      onClick: () => agir(() => modifierCompte({
        nom: c.nom, superadmin: !c.superadmin,
      })),
    },
    {
      titre: c.actif ? 'Désactiver' : 'Réactiver', disabled: occupe,
      visible: c.nom !== moi && !c.fondateur,
      onClick: () => agir(() => modifierCompte({
        nom: c.nom, actif: !c.actif,
      })),
    },
    {
      titre: 'Supprimer', variante: 'fantome', couleur: 'rouge',
      disabled: occupe, visible: c.nom !== moi && !c.fondateur,
      onClick: () => setASupprimer(c.nom),
    },
  ];
  const colonnes = [
    {
      cle: 'compte', libelle: 'Compte', tri: (c) => c.nom,
      rendu: (c) => (
        <span className="compte-nom">
          {c.nom}
          {/* Badge fondateur, distinct du badge super. */}
          {c.fondateur && <Badge couleur="vert" titre="fondateur" />}
          {c.superadmin && !c.fondateur && (
            <Badge couleur="vert" titre="super" />
          )}
          {c.nom === moi && <Badge couleur="or" titre="vous" />}
        </span>
      ),
    },
    {
      cle: 'acces', libelle: 'Accès', dim: true, rendu: resumeAcces,
      tri: resumeAcces,
    },
    {
      cle: 'etat', libelle: 'État', tri: (c) => Number(c.actif),
      rendu: (c) => (c.actif ? <Badge couleur="vert" titre="actif" />
        : <Badge titre="désactivé" />),
    },
    {
      cle: 'cree', libelle: 'Créé le', dim: true, className: 'nombre',
      tri: (c) => c.cree_le,
      rendu: (c) => dateLocaleComplete(c.cree_le),
    },
  ];
  const comptes = lecture.donnees;

  return (
    <Page
      titre="Comptes et accès"
      description={
        'Chaque compte ouvre les modules qui lui sont accordés, avec le rôle '
        + 'qui lui est donné dessus. Un superadministrateur les ouvre tous et '
        + 'gère cette page.'
        + (jeSuisFondateur
          ? ' Vous êtes le superadministrateur fondateur : vous seul pouvez '
            + 'en nommer d’autres, ou les rétrograder.'
          : ' Seul le superadministrateur fondateur peut nommer ou '
            + 'rétrograder un superadministrateur.')
      }
      actions={(
        <Bouton variante="principal" icone={<IcoPlus />}
                onClick={() => setCreation(true)}
          titre="Créer un compte" />
      )}
    >
      {(erreur || lecture.erreur) && <Alerte>{erreur || lecture.erreur}</Alerte>}

      {comptes === null ? (lecture.charge ? null : <Chargement />) : (
        <TableauDonnees
          legende="Comptes et accès" className="table-comptes"
          lignes={comptes} cle="nom" colonnes={colonnes}
          classeLigne={(c) => (c.actif ? undefined : 'inactif')}
          ouvrir={{
            entete: 'Accès', largeur: '56px',
            libelle: (c) => `Accès de ${c.nom}`,
            titre: 'Voir et changer les accès',
            ouvert: (c) => acces === c.nom,
            onOuvrir: (c) => setAcces(c.nom),
          }}
          actions={{ className: 'actions-compte', de: actionsCompte }}
        />
      )}

      <FenetreAcces
        compte={comptes && comptes.find((c) => c.nom === acces)}
        occupe={occupe}
        onChoisir={choisirRole}
        onFermer={() => setAcces(null)}
      />
      <Creation ouvert={creation} onFermer={() => setCreation(false)}
                onCree={creer} />
      <MotDePasse nom={reinit} onFermer={() => setReinit(null)}
                  onChanger={changerMotDePasse} />
      {/* Confirmation de suppression. */}
      <Confirmation
        ouvert={Boolean(aSupprimer)}
        titre={`Supprimer le compte ${aSupprimer || ''} ?`}
        message={'Le compte disparaît avec ses accès. Pour suspendre un '
          + 'accès sans le perdre, préférez la désactivation.'}
        libelle="Supprimer le compte"
        danger
        occupe={occupe}
        onConfirmer={async () => {
          const nom = aSupprimer;
          await agir(() => supprimerCompte(nom));
          setASupprimer(null);
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </Page>
  );
}

import { Bouton } from '../primitives/Bouton';
import { Champ, aideErreur } from './Champ';
import { QuestionChoix } from './Questions';
import { Saisie, Selecteur, ZoneTexte } from './Saisie';
import './formulaire.css';

// Réponses d'une question OUI / NON (un `choix` à deux valeurs).
export const OUI = 'OUI';
export const NON = 'NON';

// Champ de formulaire complet : libellé, contrôle, aide et erreur, dessiné
// d'après une description. La description vient du serveur (formulaires décrits
// côté serveur) ou s'écrit à côté du
// formulaire : c'est la façon de saisir un champ, partout.
// Le contrôle dépend de `champ.type` :
//   choix           liste, ou segments si `disposition` vaut `segments`
//   texte_long      zone de texte (`rows` lignes)
//   lignes          références avec quantité
//   date            `Saisie type="date"` (calendrier), AAAA-MM-JJ
//   entier          nombre
//   decimal         texte, clavier numérique avec virgule
//   mot_de_passe    mot de passe masqué
//   texte           champ texte (défaut) ; `email`, `telephone`,
//                   `code_postal` et `ip` aussi, avec le clavier adapté
//                   (le format est contrôlé par le serveur, pas par le
//                   navigateur).
// `champ` : `{ type, libelle, obligatoire, aide, aide_detail, valeurs,
// disposition, verrouille, placeholder, min, max, longueur_max, rows }`.
// `valeurs` d'un `choix` : textes, ou `{ valeur, libelle }`.
// `valeur`, `onChange(valeur)` : la valeur, jamais un événement ; `erreur` ;
// `fige` : lecture seule ; `id` : identifiant du contrôle. Les autres props
// (`autoComplete`, `autoFocus`, `required`…) vont au contrôle.

// Attributs HTML par type. `email` et `telephone` ne posent pas `type="email"`
// ni `type="tel"` : le navigateur bloquerait l'envoi sur un format qu'il juge
// faux, alors que le serveur répond par un message à côté du champ.
const NATIF = {
  entier: { type: 'number', inputMode: 'numeric' },
  decimal: { inputMode: 'decimal' },
  date: { type: 'date' },
  mot_de_passe: { type: 'password' },
  email: { inputMode: 'email', autoComplete: 'email' },
  telephone: { inputMode: 'tel', autoComplete: 'tel' },
  code_postal: { inputMode: 'numeric' },
  ip: { inputMode: 'decimal' },
};

const valeurDe = (v) => (typeof v === 'object' ? v.valeur : v);
const libelleDe = (v) => (typeof v === 'object' ? (v.libelle || v.valeur) : v);

// Liste de matériels complémentaires : couples référence / quantité, ajout par
// sélecteur, retrait par bouton. Lecture seule si `fige`.
function Lignes({ champ, valeur, onChange, fige }) {
  const lignes = valeur || [];
  const restantes = (champ.valeurs || []).filter(
    (v) => !lignes.some((l) => l.reference === v),
  );
  const changer = (i, modif) => onChange(
    lignes.map((l, j) => (j === i ? { ...l, ...modif } : l)),
  );
  return (
    <div className="champ-lignes">
      {lignes.length === 0 && (
        <p className="dim">Aucun matériel complémentaire.</p>
      )}
      {lignes.map((l, i) => (
        <div className="champ-ligne" key={l.reference}>
          <span className="champ-ligne-ref">{l.reference}</span>
          <Saisie
            type="number"
            min="1"
            aria-label={`Quantité de ${l.reference}`}
            value={l.quantite}
            disabled={fige}
            onChange={(e) => changer(i, {
              quantite: parseInt(e.target.value, 10) || '',
            })}
          />
          {!fige && (
            <Bouton taille="s" variante="fantome"
                    onClick={() => onChange(lignes.filter((_, j) => j !== i))}
              titre="Retirer" />
          )}
        </div>
      ))}
      {!fige && restantes.length > 0 && (
        <Selecteur
          value=""
          aria-label="Ajouter un matériel"
          onChange={(e) => {
            if (!e.target.value) return;
            onChange([...lignes, { reference: e.target.value, quantite: 1 }]);
          }}
        >
          <option value="">Ajouter un matériel…</option>
          {restantes.map((v) => <option key={v}>{v}</option>)}
        </Selecteur>
      )}
    </div>
  );
}

export function ChampSaisie({
  champ, valeur, onChange, erreur, fige, id, ...controle
}) {
  // Champ désactivé si le formulaire est figé (`fige`) ou si le champ porte
  // une valeur imposée (`verrouille`).
  const bloque = fige || Boolean(champ.verrouille);
  const commun = {
    id,
    disabled: bloque,
    placeholder: champ.placeholder,
    ...aideErreur(id, erreur),
    ...controle,
  };
  const surSaisie = (e) => onChange(e.target.value);
  const options = (champ.valeurs || []).map((v) => ({
    valeur: valeurDe(v), libelle: libelleDe(v),
  }));
  let saisie;

  if (champ.type === 'choix' && champ.disposition === 'segments') {
    saisie = (
      <QuestionChoix
        id={id}
        nom={id}
        disposition="segments"
        options={options}
        valeur={valeur}
        desactive={bloque}
        onChange={onChange}
      />
    );
  } else if (champ.type === 'choix') {
    saisie = (
      <Selecteur {...commun} bloc value={valeur || ''} onChange={surSaisie}>
        {/* Option vide proposée tant que rien n'est choisi. */}
        {!valeur && <option value="">-</option>}
        {/* `value` explicite sur chaque option : le navigateur réduit les
            espaces multiples du texte d'une option. */}
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>{o.libelle}</option>
        ))}
      </Selecteur>
    );
  } else if (champ.type === 'texte_long') {
    saisie = (
      <ZoneTexte {...commun} rows={champ.rows || 2} value={valeur || ''}
                 maxLength={champ.longueur_max} onChange={surSaisie} />
    );
  } else if (champ.type === 'lignes') {
    saisie = (
      <Lignes champ={champ} valeur={valeur} onChange={onChange}
              fige={bloque} />
    );
  } else {
    saisie = (
      <Saisie
        {...commun}
        {...NATIF[champ.type]}
        min={champ.min}
        max={champ.max}
        maxLength={champ.longueur_max}
        value={valeur === undefined || valeur === null ? '' : valeur}
        onChange={surSaisie}
      />
    );
  }

  return (
    <Champ
      id={id}
      libelle={champ.libelle}
      requis={champ.obligatoire}
      aide={champ.aide}
      aideDetail={champ.aide_detail}
      erreur={erreur}
      verrouille={Boolean(champ.verrouille)}
      className={champ.type === 'lignes' ? 'champ-large' : undefined}
    >
      {saisie}
    </Champ>
  );
}

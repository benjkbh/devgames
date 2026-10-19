import { Bouton } from '../primitives/Bouton';
import { IcoCopier, IcoValide } from '../primitives/Icones';
import { useCopie } from '../hooks/copie';
import { Saisie } from './Saisie';
import './formulaire.css';

// Bouton qui copie `valeur` dans le presse-papier ; affiche « Copié » après
// une copie réussie.
export function BoutonCopier({ valeur, variante = 'secondaire', taille = 's' }) {
  const [copie, copier] = useCopie();
  return (
    <Bouton variante={variante} taille={taille}
            icone={copie ? <IcoValide /> : <IcoCopier />}
            onClick={() => copier(valeur)} titre={copie ? 'Copié' : 'Copier'} />
  );
}

// Valeur dans un champ en lecture seule (sélectionnée au focus), avec le
// bouton de copie. `libelle` : nom accessible du champ ; `etiquette` : au
// lieu du champ, un encart qui affiche ce libellé puis la valeur en gras.
export function ChampCopiable({ valeur, libelle, etiquette }) {
  if (etiquette) {
    return (
      <div className="copiable-encart">
        <span className="copiable-etiquette">{etiquette}</span>
        <code>{valeur}</code>
        <BoutonCopier valeur={valeur} />
      </div>
    );
  }
  return (
    <div className="copiable">
      <Saisie
        type="text"
        readOnly
        value={valeur}
        aria-label={libelle}
        className="mono"
        onFocus={(e) => e.target.select()}
      />
      <BoutonCopier valeur={valeur} variante="principal" taille="m" />
    </div>
  );
}

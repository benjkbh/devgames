import { Dialogue } from './Dialogue';
import { Onglets } from './Onglets';

// Fenêtre de détail d'une ligne de tableau, ouverte par `BoutonOuvrir`.
// `titre` et `entete` (badges, statut) forment l'en-tête ; `onglets`
// (`[{ cle, libelle, puce }]`), `onglet` et `onOnglet` ajoutent une barre
// d'onglets ; `taille` : xl par défaut.
export function FenetreDetail({
  ouvert, titre, entete, onglets, onglet, onOnglet, libelleOnglets,
  taille = 'xl', actionsTete, onFermer, children,
}) {
  return (
    <Dialogue
      ouvert={ouvert}
      titre={titre}
      entete={entete}
      taille={taille}
      actionsTete={actionsTete}
      onFermer={onFermer}
      barre={onglets && onglets.length > 1 && (
        <Onglets
          libelle={libelleOnglets || titre}
          onglets={onglets}
          actif={onglet}
          onChange={onOnglet}
        />
      )}
    >
      {children}
    </Dialogue>
  );
}

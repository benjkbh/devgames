import { EtatVide, IcoDashboard, Page } from '../../ui';

// Module d'exemple : sert de modèle à copier pour un nouveau module (voir le
// contrat dans `coque/modules.jsx`). À remplacer ou supprimer.
export default function Accueil({ session }) {
  return (
    <Page titre="Accueil" sousTitre={`Connecté : ${session.compte.nom}`}>
      <EtatVide titre="Module d’exemple" icone={<IcoDashboard />}>
        Ajoutez vos modules dans <code>src/modules/</code> et déclarez-les
        dans <code>src/coque/modules.jsx</code>.
      </EtatVide>
    </Page>
  );
}

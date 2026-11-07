import {
  Navigate, Route, Routes, matchPath, useLocation,
} from 'react-router-dom';

import ChoixPseudo from './coque/ChoixPseudo';
import MenuLateral from './coque/MenuLateral';
import { MODULES, PAGES_PUBLIQUES } from './coque/modules';
import { BandeauSante, FournisseurPresence } from './coque/presence';
import { useSession } from './coque/session';
import {
  Chargement, EtatVide, IcoFiltre, Page,
} from '@ui';
import './coque/coque.css';

// Coque de l'application : choix du pseudo, menu latéral et routage des
// modules. Aucun module n'y est connu ; le contrat d'un module est décrit dans
// coque/modules.jsx.
//
// Pas de compte : sans pseudo, on ne voit que son choix. Avec, tous les
// modules sont ouverts.
//
// Pages publiques (sans pseudo) : déclarées par les modules (`publiques` de
// leur manifeste), traitées en premier. Ici, regarder une table de UNO
// (`/spectateur/<code>`).

export default function App() {
  const [session, rafraichir] = useSession();
  const emplacement = useLocation();

  if (PAGES_PUBLIQUES.some((p) => matchPath(p.chemin, emplacement.pathname))) {
    return (
      <Routes>
        {PAGES_PUBLIQUES.map(({ chemin, Composant }) => (
          <Route key={chemin} path={chemin} element={<Composant />} />
        ))}
      </Routes>
    );
  }

  // Session non encore lue : ni formulaire ni contenu.
  if (!session.chargee) {
    return <main id="contenu" className="page"><Chargement /></main>;
  }

  // Sans pseudo, on le choisit ; l'adresse demandée (un lien de table) est
  // gardée et s'ouvre ensuite.
  if (!session.pseudo) return <ChoixPseudo onEntre={rafraichir} />;

  // Contrôle de santé et présence (`coque/presence.jsx`), partagés par le
  // menu et les modules.
  return (
    <FournisseurPresence>
      <MenuLateral session={session} onDeconnecte={rafraichir} />
      <div id="zone">
        <BandeauSante />
        <Routes>
          <Route path="/" element={<Navigate to={MODULES[0].chemin} replace />} />
          {MODULES.map(({ chemin, Composant }) => (
            <Route
              key={chemin}
              path={`${chemin}/*`}
              element={<Composant session={session} />}
            />
          ))}
          <Route
            path="*"
            element={(
              <Page>
                <EtatVide titre="Page inconnue" icone={<IcoFiltre />}>
                  Choisissez un jeu dans le menu.
                </EtatVide>
              </Page>
            )}
          />
        </Routes>
      </div>
    </FournisseurPresence>
  );
}

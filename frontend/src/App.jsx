import {
  Navigate, Route, Routes, matchPath, useLocation,
} from 'react-router-dom';

import Comptes from './coque/Comptes';
import FormulaireConnexion from './coque/FormulaireConnexion';
import MenuLateral from './coque/MenuLateral';
import MonCompte from './coque/MonCompte';
import {
  PAGES_PUBLIQUES, moduleDefaut, modulesVisibles,
} from './coque/modules';
import { BandeauSante, FournisseurPresence } from './coque/presence';
import { estSuperadmin, useSession } from './coque/session';
import {
  Chargement, EtatVide, IcoComptes, IcoFiltre, Page,
} from '@ui';
import './coque/coque.css';

// Coque de l'application : contrôle d'accès, menu latéral et routage des
// modules. Aucun module n'y est connu ; le contrat d'un module est décrit dans
// coque/modules.jsx.
//
// Toute l'application est derrière l'authentification : une session non
// authentifiée n'affiche que le formulaire de connexion.
//
// Pages publiques (hors authentification) : déclarées par les modules
// (`publiques` de leur manifeste), traitées avant le contrôle d'accès. Ici,
// regarder une table de UNO sans compte (`/spectateur/<code>`).

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

  if (!session.compte) {
    return (
      <FormulaireConnexion
        installation={session.installationRequise}
        onEntre={rafraichir}
      />
    );
  }

  const visibles = modulesVisibles(session);
  const defaut = moduleDefaut(session);
  const superadmin = estSuperadmin(session);

  // Contrôle de santé et présence (`coque/presence.jsx`), partagés par le
  // menu et les modules.
  return (
    <FournisseurPresence>
      <MenuLateral session={session} onDeconnecte={rafraichir} />
      <div id="zone">
        <BandeauSante />
        <Routes>
          <Route
            path="/"
            element={defaut ? <Navigate to={defaut} replace />
              : <Navigate to="/sans-acces" replace />}
          />
          {visibles.map(({ chemin, Composant }) => (
            <Route
              key={chemin}
              path={`${chemin}/*`}
              element={<Composant session={session} />}
            />
          ))}
          {/* Paramètres du compte connecté : ouverts à tout compte. */}
          <Route
            path="/compte"
            element={<MonCompte session={session} onChange={rafraichir} />}
          />
          {/* Gestion des comptes : route réservée aux superadministrateurs. */}
          {superadmin && (
            <Route
              path="/comptes"
              element={<Comptes session={session} onChange={rafraichir} />}
            />
          )}
          {/* Compte sans module accordé. */}
          <Route
            path="/sans-acces"
            element={(
              <Page>
                <EtatVide titre="Aucun accès" icone={<IcoComptes />}>
                  Votre compte n’a accès à aucun module. Demandez à un
                  administrateur de vous en accorder.
                </EtatVide>
              </Page>
            )}
          />
          <Route
            path="*"
            element={(
              <Page>
                <EtatVide titre="Page inconnue" icone={<IcoFiltre />}>
                  Choisissez un module dans le menu.
                </EtatVide>
              </Page>
            )}
          />
        </Routes>
      </div>
    </FournisseurPresence>
  );
}

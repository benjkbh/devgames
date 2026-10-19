import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Jetons et socle CSS, chargés avant les feuilles des composants.
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import App from './App';

// Routage par chemin. Un routeur « de données » (et non `BrowserRouter`) :
// il permet à une page de bloquer une navigation (`useBlocker`, confirmation
// avant de quitter une manche) ; `App` porte toutes les routes.
const routeur = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(document.getElementById('racine')).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Jetons et socle CSS, chargés avant les feuilles des composants.
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import App from './App';

// Routage par chemin (BrowserRouter).
createRoot(document.getElementById('racine')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

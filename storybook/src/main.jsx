import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Jetons et socle CSS de l'application, chargés avant les composants.
import '@ui/styles/tokens.css';
import '@ui/styles/base.css';
import { Bouton, IcoLune, IcoSoleil, useTheme } from '@ui';
import Storybook from './Storybook';
import './coque.css';

// Le storybook seul, sans compte ni serveur : le catalogue et le choix du
// thème, que le menu de l'application porte d'ordinaire.
function Coque() {
  const [theme, basculer] = useTheme();
  const sombre = theme === 'sombre';
  return (
    <div id="zone">
      <Bouton
        variante="fantome" className="sb-theme"
        icone={sombre ? <IcoSoleil /> : <IcoLune />}
        libelle={sombre ? 'Passer au thème clair' : 'Passer au thème sombre'}
        aria-pressed={sombre} onClick={basculer}
      />
      <Storybook />
    </div>
  );
}

createRoot(document.getElementById('racine')).render(
  <StrictMode>
    <Coque />
  </StrictMode>,
);

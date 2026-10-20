import { cx } from '../classes';
import { Marque } from '../primitives/Icones';
import './mise-en-page.css';

// Squelette d'écran : titre, description, actions à droite du titre, puis
// contenu. `avant` : contenu placé avant l'en-tête. `largeur="etroite"` :
// colonne de lecture bornée.
export function Page({
  titre, description, actions, avant, largeur, className, children,
}) {
  const tete = titre || description || actions;
  return (
    <main id="contenu" className={cx('page', largeur && `page-${largeur}`,
      className)}>
      {avant}
      {tete && (
        <header className="page-tete">
          <div className="page-titres">
            {titre && <h1>{titre}</h1>}
            {description && <p className="page-description">{description}</p>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </header>
      )}
      {children}
    </main>
  );
}

// Conteneur titré à l'intérieur d'une page : il reçoit n'importe quels
// éléments. `suffixe` (un compteur, 0 compris) s'affiche à côté du titre, en
// retrait ; `icone` le précède ; `niveau="attention"` colore le titre.
export function Section({
  titre, suffixe, icone, actions, niveau, className, children, ...reste
}) {
  return (
    <section className={cx('section', niveau && `section-${niveau}`, className)}
             {...reste}>
      {(titre || actions) && (
        <div className="section-tete">
          {titre && (
            <h2 className="section-titre">
              {icone}
              {titre}
              {/* 0 est un suffixe valide (un compteur) : seul le vide est omis. */}
              {suffixe != null && suffixe !== false && suffixe !== ''
                && <span className="section-compte">{suffixe}</span>}
            </h2>
          )}
          {actions && <div className="section-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// Marque de l'application (logo, nom, sous-nom) des écrans sans menu.
export function MarqueAppli({ nom = 'Application', sousNom }) {
  return (
    <div className="marque-appli">
      <span className="marque-logo"><Marque /></span>
      <span className="marque-noms">
        <span className="marque-nom">{nom}</span>
        {sousNom && <span className="marque-sous-nom">{sousNom}</span>}
      </span>
    </div>
  );
}

// Écran pleine fenêtre sans menu (connexion, installation, page client).
// `variante` : `carte` (carte centrée) ou `libre` (colonne large).
export function PageGarde({
  appli, sousNom, titre, sousTitre, variante = 'carte', children,
}) {
  if (variante === 'libre') {
    return (
      <div className="garde garde-libre">
        <div className="garde-colonne">
          <header className="garde-entete">
            <MarqueAppli nom={appli} sousNom={sousNom} />
            {titre && <h1 className="garde-titre">{titre}</h1>}
            {sousTitre && <div className="garde-sous-titre">{sousTitre}</div>}
          </header>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="garde">
      <div className="garde-carte">
        <MarqueAppli nom={appli} sousNom={sousNom} />
        {titre && <h1 className="garde-titre">{titre}</h1>}
        {sousTitre && <div className="garde-sous-titre">{sousTitre}</div>}
        {children}
      </div>
    </div>
  );
}

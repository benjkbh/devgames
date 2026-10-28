import { Dialogue } from './Dialogue';
import { Alerte } from './Alerte';
import { Bouton } from '../primitives/Bouton';

// Dialogue de saisie : `Dialogue` en formulaire, erreur en tête du corps, et
// la rangée Envoyer / Supprimer / Annuler.
// `onSubmit(e)` reçoit l'évènement (appeler `e.preventDefault()`).
//   libelleEnvoi        texte du bouton d'envoi ;
//   envoiDesactive      désactive l'envoi (saisie incomplète) ;
//   occupe              roue d'attente sur l'envoi ;
//   erreur              message affiché en tête ; `erreurCompacte` (vrai par
//                       défaut) réduit ses marges ;
//   onSupprimer         ajoute un bouton de suppression (`libelleSupprimer`) ;
//   lectureSeule        ni envoi ni suppression, un seul bouton « Fermer ».
// Les autres props passent à `Dialogue` (`titre`, `description`, `taille`…).
export function DialogueFormulaire({
  ouvert = true, onSubmit, libelleEnvoi = 'Enregistrer', envoiDesactive,
  occupe, erreur, erreurCompacte = true, onSupprimer,
  libelleSupprimer = 'Supprimer', lectureSeule, onFermer, children, ...reste
}) {
  return (
    <Dialogue
      ouvert={ouvert}
      onFermer={onFermer}
      onSubmit={lectureSeule ? undefined : onSubmit}
      actions={(
        <>
          {!lectureSeule && (
            <Bouton type="submit" variante="principal" waiting={occupe}
                    disabled={envoiDesactive} titre={libelleEnvoi} />
          )}
          {!lectureSeule && onSupprimer && (
            <Bouton variante="secondaire" disabled={occupe}
                    onClick={onSupprimer}
              couleur="rouge" titre={libelleSupprimer} />
          )}
          <Bouton variante="secondaire" onClick={onFermer} titre={lectureSeule ? 'Fermer' : 'Annuler'} />
        </>
      )}
      {...reste}
    >
      {erreur && <Alerte compacte={erreurCompacte}>{erreur}</Alerte>}
      {children}
    </Dialogue>
  );
}

import { QuestionBool, QuestionChoix } from '@ui';

// Réglages d'une partie de quiz, à la création de la table et entre deux
// parties (l'hôte) : `{ nombre, duree, carte, ouvertes }`, comme les lit
// `backend/modules/quiz/salons.py`.

export const REGLAGES_DEFAUT = {
  nombre: 15, duree: 30, carte: true, ouvertes: true, images: true,
};

const NOMBRES = [10, 15, 20, 25, 30].map((n) => ({ valeur: String(n), libelle: String(n) }));
const DUREES = [15, 20, 30, 45, 60].map((n) => ({ valeur: String(n), libelle: `${n} s` }));

export function resumeReglages(r) {
  const extras = [r.carte && 'carte', r.ouvertes && 'ouvertes', r.images !== false && 'images']
    .filter(Boolean);
  return `${r.nombre} questions · ${r.duree} s${extras.length ? ` · ${extras.join(', ')}` : ''}`;
}

export function Reglages({ valeur, onChange, prefixe = 'qz' }) {
  const changer = (modif) => onChange({ ...valeur, ...modif });
  return (
    <div className="qz-reglages">
      <QuestionChoix nom={`${prefixe}-nombre`} legende="Questions" disposition="segments"
                     options={NOMBRES} valeur={String(valeur.nombre)}
                     onChange={(v) => changer({ nombre: Number(v) })} />
      <QuestionChoix nom={`${prefixe}-duree`} legende="Temps par question" disposition="segments"
                     options={DUREES} valeur={String(valeur.duree)}
                     onChange={(v) => changer({ duree: Number(v) })} />
      <QuestionBool libelle="Questions de carte"
                    description="Placer un pays, ou le pays d’une capitale, sur la carte du monde."
                    checked={valeur.carte} onChange={(carte) => changer({ carte })} />
      <QuestionBool libelle="Questions ouvertes"
                    description="Sans réponse unique (« Citez… », « Expliquez… ») : l’hôte les juge à la fin."
                    checked={valeur.ouvertes} onChange={(ouvertes) => changer({ ouvertes })} />
      <QuestionBool libelle="Questions illustrées"
                    description="Tableaux, monuments, drapeaux, silhouettes de pays, schémas, rébus d’emojis…"
                    checked={valeur.images !== false} onChange={(images) => changer({ images })} />
    </div>
  );
}

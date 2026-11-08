import { Link } from 'react-router-dom';

import {
  Alerte, Badge, Bouton, Carte, Chargement, EtatVide, FilAriane, Page, useAction,
  useLecture,
} from '@ui';
import { lireSignalements, retablir } from './api';
import { IcoQuiz } from './decor';
import { Illustration } from './Illustration';

// Les questions signalées non conformes pendant les parties : écartées des
// tirages, en attendant qu'on les revoie. Pour corriger une question, on
// modifie sa ligne dans `backend/modules/quiz/questions/<fichier>` ; une
// question modifiée change d'identifiant, son signalement devient caduc.
// « Rétablir » la remet en jeu telle quelle (signalement infondé).

const date = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}) : '');

function Fiche({ q, motifs, onRetablir, occupe }) {
  return (
    <Carte className="qz-sig-fiche">
      <div className="qz-sig-tete">
        <Badge couleur="bleu" titre={q.theme} />
        {q.fichier && <code className="qz-sig-fichier">{`questions/${q.fichier}`}</code>}
        <Badge couleur="rouge" titre={`${q.signalements.length} signalement${q.signalements.length > 1 ? 's' : ''}`} />
      </div>
      <p className="qz-sig-enonce">{q.enonce}</p>
      <Illustration question={q} credit />
      <p className="qz-sig-solution">
        <span className="dim">{q.type === 'ouverte' ? 'À attendre : ' : 'Réponse : '}</span>
        <strong>{q.solution}</strong>
        {q.variantes && q.variantes.length > 0 && <span className="dim">{` (aussi : ${q.variantes.join(', ')})`}</span>}
      </p>
      <ul className="qz-sig-liste">
        {q.signalements.map((s) => (
          <li key={`${s.joueur}-${s.date}`}>
            <strong>{s.joueur}</strong>
            {` · ${motifs[s.motif] || s.motif}`}
            {s.commentaire && <span>{` — « ${s.commentaire} »`}</span>}
            <span className="dim">{` · ${date(s.date)}`}</span>
          </li>
        ))}
      </ul>
      <div className="qz-sig-actions">
        <Bouton taille="s" disabled={occupe} titre="Rétablir (signalement infondé)"
                onClick={() => onRetablir(q.id)} />
        <span className="dim">Sinon, corrigez la ligne dans son fichier : la question corrigée revient seule en jeu.</span>
      </div>
    </Carte>
  );
}

export default function Signalements() {
  const { donnees, erreur, relire } = useLecture(lireSignalements, {});
  const action = useAction();
  const remettre = async (id) => {
    const r = await action.executer(() => retablir(id));
    if (r.ok) relire();
  };
  let contenu;
  if (erreur) contenu = <Alerte>{erreur}</Alerte>;
  else if (!donnees) contenu = <Chargement texte="Lecture des signalements…" />;
  else if (donnees.questions.length === 0) {
    contenu = (
      <EtatVide titre="Aucune question signalée" icone={<IcoQuiz />}>
        Pendant une partie, le bouton « ⚑ Signaler » met de côté une question fausse, ambiguë ou une image cassée.
      </EtatVide>
    );
  } else {
    contenu = donnees.questions.map((q) => (
      <Fiche key={q.id} q={q} motifs={donnees.motifs} onRetablir={remettre} occupe={action.occupe} />
    ));
  }
  return (
    <Page className="qz-accueil qz-signalements">
      <FilAriane elements={[<Link key="q" to="/quiz">Culture G</Link>, 'Questions signalées']} />
      <h1 className="qz-sig-titre">Questions signalées</h1>
      <p className="dim">
        Chaque question signalée est écartée des parties jusqu’à ce qu’on la rétablisse ou qu’on la corrige.
        {donnees && donnees.orphelins.length > 0
          && ` ${donnees.orphelins.length} signalement(s) portent sur des questions déjà modifiées.`}
      </p>
      {action.erreur && <Alerte compacte>{action.erreur}</Alerte>}
      <div className="qz-sig-fiches">{contenu}</div>
    </Page>
  );
}

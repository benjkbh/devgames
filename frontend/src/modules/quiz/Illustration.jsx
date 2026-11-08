import { useState } from 'react';

import {
  Bouton, Saisie, Selecteur, cx, useAction,
} from '@ui';
import { signaler } from './api';

// L'illustration d'une question : une image (servie depuis `/quiz/img/`),
// ou un rébus d'emojis et de symboles. `credit` et `source` (auteur, licence
// et page d'origine de l'image) ne s'affichent qu'avec la solution : le
// crédit d'un tableau nomme souvent son peintre.
export function Illustration({ question: q, credit = false }) {
  const [agrandie, setAgrandie] = useState(false);
  if (q.rebus) {
    return <p className="qz-rebus" aria-label={`Rébus : ${q.rebus}`}>{q.rebus}</p>;
  }
  if (!q.image) return null;
  return (
    <figure className={cx('qz-illustration', agrandie && 'agrandie')}>
      <button type="button" className="qz-illustration-bouton"
              aria-label={agrandie ? 'Réduire l’image' : 'Agrandir l’image'}
              onClick={() => setAgrandie((a) => !a)}>
        <img src={q.image} alt="Illustration de la question" draggable="false" />
      </button>
      {credit && q.credit && (
        <figcaption className="qz-credit">
          {q.source ? (
            <a href={q.source} target="_blank" rel="noopener noreferrer">{q.credit}</a>
          ) : q.credit}
        </figcaption>
      )}
    </figure>
  );
}

// Les motifs d'un signalement, comme les lit `backend/modules/quiz/historique.py`.
export const MOTIFS = [
  ['reponse', 'Réponse fausse ou incomplète'],
  ['ambigue', 'Question ambiguë'],
  ['image', 'Image cassée ou trompeuse'],
  ['difficile', 'Trop obscure'],
  ['autre', 'Autre'],
];

// Signaler une question non conforme : un petit formulaire (motif, mot
// facultatif) ; la question est écartée des tirages jusqu'à sa revue, sur la
// page « Questions signalées ».
export function BoutonSignaler({ question: q }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState(q.image ? 'image' : 'reponse');
  const [commentaire, setCommentaire] = useState('');
  const [fait, setFait] = useState(false);
  const action = useAction();
  if (fait) return <span className="qz-signale" role="status">Question signalée, merci.</span>;
  if (!ouvert) {
    return (
      <button type="button" className="qz-signaler-lien" onClick={() => setOuvert(true)}
              title="Signaler une question fausse, ambiguë ou une image cassée">
        ⚑ Signaler
      </button>
    );
  }
  const envoyer = async (e) => {
    e.preventDefault();
    const r = await action.executer(() => signaler(q.id, motif, commentaire));
    if (r.ok) setFait(true);
  };
  return (
    <form className="qz-signaler" onSubmit={envoyer}>
      <Selecteur taille="s" value={motif} aria-label="Motif du signalement"
                 onChange={(e) => setMotif(e.target.value)}>
        {MOTIFS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Selecteur>
      <Saisie taille="s" value={commentaire} maxLength={300} placeholder="Précision (facultatif)"
              aria-label="Précision" onChange={(e) => setCommentaire(e.target.value)} />
      <Bouton type="submit" taille="s" variante="principal" waiting={action.occupe} titre="Signaler" />
      <Bouton taille="s" variante="fantome" titre="Annuler" onClick={() => setOuvert(false)} />
      {action.erreur && <span className="qz-signaler-erreur">{action.erreur}</span>}
    </form>
  );
}

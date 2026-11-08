import { useEffect, useRef, useState } from 'react';

import {
  Badge, Bouton, Carte, Saisie, cx,
} from '@ui';
import {
  avancer, noter, passer, regler, repondre, revoir, terminer,
} from './api';
import CarteMonde, { couleurJoueur, nomPays } from './CarteMonde';
import { Reglages } from './reglages';

// Le plateau du quiz, selon la phase de la partie (`backend/modules/quiz/
// regles.py`) :
//   question  l'énoncé, le compte à rebours, et la saisie (texte ou point
//             sur la carte) ; à droite, qui a répondu ;
//   solution  la réponse attendue quelques secondes (et les points de chacun
//             sur la carte) ;
//   revue     l'hôte passe les questions en revue, toutes les réponses sous
//             les yeux, et donne les points ; tout le monde suit ;
//   fin       le classement et le récapitulatif.
// Chaque interface d'un joueur assis signale la fin de son compte à rebours
// (`avancer`) : le serveur passe à la suite quand le temps est écoulé.

const formatPoint = (p) => {
  if (p === null || p === undefined) return 'à juger';
  if (p === 0.5) return '½ point';
  return p > 0 ? '1 point' : '0';
};
const formatScore = (s) => String(s).replace('.5', ',5');

// Secondes restantes, à partir de `reste` reçu du serveur pour l'étape
// `cle` ; recalé quand l'étape change ou que l'écart dépasse une seconde.
function useCompteur(reste, cle) {
  const fin = useRef({ cle: null, t: 0 });
  const [, setTic] = useState(0);
  const attendu = Date.now() + (reste || 0) * 1000;
  if (fin.current.cle !== cle || Math.abs(fin.current.t - attendu) > 1000) {
    fin.current = { cle, t: attendu };
  }
  useEffect(() => {
    if (reste === undefined) return undefined;
    const id = setInterval(() => setTic((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [cle, reste === undefined]); // eslint-disable-line react-hooks/exhaustive-deps
  return Math.max(0, (fin.current.t - Date.now()) / 1000);
}

// Compte à rebours fini : le joueur assis le signale, puis recommence tant
// que l'étape n'a pas changé (horloges un peu décalées).
function useFinDuTemps(actif, restant, cle, signaler) {
  const envoye = useRef(null);
  useEffect(() => {
    if (!actif || restant > 0) return undefined;
    if (envoye.current !== cle) {
      envoye.current = cle;
      signaler();
    }
    const id = setInterval(signaler, 2000);
    return () => clearInterval(id);
  }, [actif, restant <= 0, cle]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Chrono({ restant, total }) {
  const part = total ? Math.min(1, restant / total) : 0;
  const s = Math.ceil(restant);
  return (
    <div className={cx('qz-chrono', s <= 5 && 'urgent')} role="timer" aria-live="off"
         aria-label={`${s} secondes restantes`}>
      <span className="qz-chrono-barre" style={{ transform: `scaleX(${part})` }} />
      <span className="qz-chrono-txt">{`${s} s`}</span>
    </div>
  );
}

function EnTeteQuestion({ partie: p, question: q, index, total }) {
  return (
    <div className="qz-entete">
      <span className="qz-numero">{`Question ${index + 1} / ${total}`}</span>
      <Badge couleur="bleu" titre={q.theme} />
      {q.type === 'ouverte' && <Badge couleur="or" titre="Question ouverte" />}
      {q.type === 'carte' && <Badge couleur="vert" titre="Carte" />}
      {p && p.phase === 'question' && q.type === 'ouverte' && (
        <span className="dim qz-note">Pas de réponse unique : l’hôte jugera à la fin.</span>
      )}
    </div>
  );
}

// -- question ---------------------------------------------------------------

function SaisieTexte({
  table, partie: p, onAction, actif,
}) {
  const [texte, setTexte] = useState('');
  const mienne = p.ma_reponse && p.ma_reponse.texte;
  useEffect(() => { setTexte(''); }, [p.index]);
  const envoyer = (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    onAction(() => repondre(table.code, p.index, { texte }));
  };
  return (
    <form className="qz-saisie" onSubmit={envoyer}>
      <Saisie value={texte} maxLength={200} disabled={!actif} autoFocus
              placeholder={mienne ? 'Modifier ma réponse…' : 'Votre réponse…'}
              aria-label="Votre réponse" onChange={(e) => setTexte(e.target.value)} />
      <Bouton type="submit" variante="principal" disabled={!actif || !texte.trim()}
              titre={mienne ? 'Remplacer' : 'Envoyer'} />
      {mienne && (
        <p className="qz-enregistree" role="status">
          {'Réponse enregistrée : '}
          <strong>{`« ${mienne} »`}</strong>
          <span className="dim"> — modifiable tant que le temps court</span>
        </p>
      )}
    </form>
  );
}

function SaisieCarte({
  table, partie: p, onAction, actif,
}) {
  const [point, setPoint] = useState(null);
  const mienne = p.ma_reponse && p.ma_reponse.lat !== undefined ? p.ma_reponse : null;
  useEffect(() => { setPoint(null); }, [p.index]);
  const affiche = point || mienne;
  return (
    <div className="qz-saisie-carte">
      <CarteMonde onPlacer={actif ? setPoint : undefined} point={affiche} />
      <div className="qz-saisie-pied">
        <Bouton variante="principal" disabled={!actif || !point}
                titre={mienne ? 'Déplacer mon point ici' : 'Valider ce point'}
                onClick={() => onAction(() => repondre(table.code, p.index, point))} />
        <span className="dim">
          {mienne && !point ? 'Point enregistré : vous pouvez encore le déplacer.'
            : 'Cliquez sur la carte pour placer votre point (molette ou boutons pour zoomer, glisser pour se déplacer).'}
        </span>
      </div>
    </div>
  );
}

function PhaseQuestion({
  table, partie: p, onAction, restant,
}) {
  const q = p.question;
  const actif = table.membre && restant > 0;
  return (
    <section className="qz-scene" aria-label="Question">
      <EnTeteQuestion partie={p} question={q} index={p.index} total={p.total} />
      <Chrono restant={restant} total={p.duree} />
      <h2 className="qz-enonce">{q.enonce}</h2>
      {table.membre && q.type === 'carte' && (
        <SaisieCarte table={table} partie={p} onAction={onAction} actif={actif} />
      )}
      {table.membre && q.type !== 'carte' && (
        <SaisieTexte table={table} partie={p} onAction={onAction} actif={actif} />
      )}
      {!table.membre && <p className="dim">Les joueurs répondent…</p>}
    </section>
  );
}

// -- solution ---------------------------------------------------------------

function PhaseSolution({
  table, partie: p, onAction, restant,
}) {
  const q = p.question;
  const hote = table.membre && table.hote === table.moi;
  const mienne = p.ma_reponse;
  let verdict = null;
  if (table.membre) {
    if (!mienne) verdict = <Badge couleur="rouge" titre="Pas de réponse" />;
    else if (p.mon_point > 0) verdict = <Badge couleur="vert" titre="Juste (à confirmer)" />;
    else verdict = <Badge couleur="orange" titre="À revoir par l’hôte" />;
  }
  return (
    <section className="qz-scene" aria-label="Solution">
      <EnTeteQuestion partie={p} question={q} index={p.index} total={p.total} />
      <Chrono restant={restant} total={q.type === 'carte' ? 9 : 6} />
      <h2 className="qz-enonce">{q.enonce}</h2>
      <div className="qz-solution" role="status">
        <span className="qz-solution-titre">Réponse</span>
        <strong className="qz-solution-txt">{q.solution}</strong>
        {q.variantes && q.variantes.length > 0 && (
          <span className="dim">{`Aussi admis : ${q.variantes.join(', ')}`}</span>
        )}
      </div>
      {q.type === 'carte' && (
        <CarteMonde cible={q.cible} points={p.points_carte || []} joueurs={p.joueurs} />
      )}
      {table.membre && (
        <p className="qz-mien">
          {mienne && mienne.texte !== undefined && (
            <>
              {'Vous : '}
              <strong>{`« ${mienne.texte} »`}</strong>
              {' '}
            </>
          )}
          {mienne && mienne.lat !== undefined && (
            <>
              {'Vous : '}
              <strong>{nomPays(mienne.pays) || 'en pleine mer'}</strong>
              {' '}
            </>
          )}
          {verdict}
        </p>
      )}
      {hote && (
        <div className="qz-actions">
          <Bouton variante="principal" titre="Question suivante"
                  onClick={() => onAction(() => passer(table.code))} />
        </div>
      )}
    </section>
  );
}

// -- revue ------------------------------------------------------------------

function Sommaire({
  partie: p, courant, hote, onChoisir,
}) {
  return (
    <ol className="qz-sommaire" aria-label="Questions de la partie">
      {p.sommaire.map((s) => {
        const contenu = (
          <>
            {s.index + 1}
            {s.a_juger > 0 && <span className="qz-pastille" aria-label={`${s.a_juger} à juger`} />}
          </>
        );
        return (
          <li key={s.index}>
            {hote ? (
              <button type="button" onClick={() => onChoisir(s.index)}
                      className={cx('qz-puce', s.index === courant && 'courante', s.type)}
                      aria-current={s.index === courant || undefined}
                      title={`${s.theme} · ${s.justes} juste${s.justes > 1 ? 's' : ''}`}>
                {contenu}
              </button>
            ) : (
              <span className={cx('qz-puce', s.index === courant && 'courante', s.type)}
                    title={s.theme}>
                {contenu}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ReponseJoueur({
  r, question: q, hote, onNoter, joueurs,
}) {
  const rep = r.reponse;
  let texte;
  if (!rep) texte = <span className="dim">Pas de réponse</span>;
  else if (q.type === 'carte') {
    texte = (
      <>
        <span className="qz-rond" style={{ background: couleurJoueur(r.joueur, joueurs) }} aria-hidden="true" />
        {nomPays(rep.pays) || 'En pleine mer'}
      </>
    );
  } else texte = `« ${rep.texte} »`;
  const auto = q.type === 'ouverte' ? null : r.auto;
  const modifie = auto !== null && auto !== undefined && r.point !== auto;
  return (
    <li className={cx('qz-reponse', r.point > 0 && 'juste', r.point === 0 && 'fausse', r.point === null && 'a-juger')}>
      <span className="qz-reponse-nom">{r.joueur}</span>
      <span className="qz-reponse-txt">{texte}</span>
      {auto !== null && auto !== undefined && (
        <span className="dim qz-reponse-auto">
          {modifie ? `correction proposée : ${formatPoint(auto)}` : 'correction automatique'}
        </span>
      )}
      {hote ? (
        <span className="qz-notes" role="group" aria-label={`Point de ${r.joueur}`}>
          {[[0, '0'], [0.5, '½'], [1, '1']].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={r.point === v}
                    className={cx('qz-note-btn', r.point === v && 'choisie', `v${String(v).replace('.', '')}`)}
                    onClick={() => onNoter(r.joueur, v)}>
              {l}
            </button>
          ))}
        </span>
      ) : <Badge couleur={r.point > 0 ? 'vert' : (r.point === null ? 'or' : 'rouge')} titre={formatPoint(r.point)} />}
    </li>
  );
}

function FicheRevue({
  revue, hote, onNoter, joueurs,
}) {
  const q = revue.question;
  const points = revue.reponses.filter((r) => r.reponse && r.reponse.lat !== undefined)
    .map((r) => ({ joueur: r.joueur, ...r.reponse, point: r.point }));
  return (
    <>
      <h2 className="qz-enonce">{q.enonce}</h2>
      <div className="qz-solution">
        <span className="qz-solution-titre">{q.type === 'ouverte' ? 'À attendre' : 'Réponse'}</span>
        <strong className="qz-solution-txt">{q.solution}</strong>
        {q.variantes && q.variantes.length > 0 && (
          <span className="dim">{`Aussi admis : ${q.variantes.join(', ')}`}</span>
        )}
      </div>
      {q.type === 'carte' && <CarteMonde cible={q.cible} points={points} joueurs={joueurs} />}
      <ul className="qz-reponses">
        {revue.reponses.map((r) => (
          <ReponseJoueur key={r.joueur} r={r} question={q} hote={hote} joueurs={joueurs}
                         onNoter={(cible, v) => onNoter(revue.index, cible, v)} />
        ))}
      </ul>
    </>
  );
}

function PhaseRevue({ table, partie: p, onAction }) {
  const hote = table.membre && table.hote === table.moi;
  const r = p.revue;
  const code = table.code;
  const aJuger = p.sommaire.reduce((n, s) => n + s.a_juger, 0);
  const aller = (i) => onAction(() => revoir(code, i));
  return (
    <section className="qz-scene" aria-label="Revue des réponses">
      <p className="qz-revue-titre">
        {hote ? 'À vous de juger : donnez ou retirez les points.'
          : `${table.hote} passe les réponses en revue…`}
      </p>
      <Sommaire partie={p} courant={r.index} hote={hote} onChoisir={aller} />
      <EnTeteQuestion question={r.question} index={r.index} total={p.total} />
      <FicheRevue revue={r} hote={hote} joueurs={p.joueurs}
                  onNoter={(i, cible, v) => onAction(() => noter(code, i, cible, v))} />
      {hote && (
        <div className="qz-actions">
          <Bouton titre="Précédente" disabled={r.index === 0} onClick={() => aller(r.index - 1)} />
          {r.index + 1 < p.total ? (
            <Bouton variante="principal" titre="Question suivante" onClick={() => aller(r.index + 1)} />
          ) : null}
          <Bouton variante={r.index + 1 < p.total ? 'secondaire' : 'principal'} couleur="vert"
                  titre="Terminer la revue" onClick={() => onAction(() => terminer(code))} />
          {aJuger > 0 && (
            <span className="dim">{`${aJuger} réponse${aJuger > 1 ? 's' : ''} encore à juger : sans décision, elles comptent zéro.`}</span>
          )}
        </div>
      )}
    </section>
  );
}

// -- fin --------------------------------------------------------------------

function ReglagesSuivants({ table, onAction }) {
  const [valeur, setValeur] = useState({
    nombre: table.nombre, duree: table.duree, carte: table.carte, ouvertes: table.ouvertes,
  });
  const change = ['nombre', 'duree', 'carte', 'ouvertes'].some((k) => valeur[k] !== table[k]);
  return (
    <Carte titre="Prochaine partie">
      <Reglages valeur={valeur} onChange={setValeur} prefixe="qz-suivante" />
      <div className="qz-actions">
        <Bouton disabled={!change} titre="Enregistrer les réglages"
                onClick={() => onAction(() => regler(table.code, valeur))} />
      </div>
    </Carte>
  );
}

function PhaseFin({ table, partie: p, onAction }) {
  const hote = table.membre && table.hote === table.moi;
  const [ouverte, setOuverte] = useState(null);
  const classement = Object.entries(p.scores).sort((a, b) => b[1] - a[1]);
  return (
    <section className="qz-scene" aria-label="Résultats">
      <p className="qz-revue-titre">
        {p.ex_aequo.length ? `Ex æquo : ${[p.gagnant, ...p.ex_aequo].join(', ')} !`
          : `${p.gagnant} remporte la partie !`}
      </p>
      <ol className="qz-podium">
        {classement.map(([nom, score], i) => (
          <li key={nom} className={cx(i === 0 && 'premier')}>
            <span className="qz-rang">{i + 1}</span>
            <span className="qz-podium-nom">{nom}</span>
            <span className="qz-podium-score">{`${formatScore(score)} pt${score > 1 ? 's' : ''}`}</span>
          </li>
        ))}
      </ol>
      <h3 className="qz-sous-titre">Récapitulatif</h3>
      <ol className="qz-recap">
        {p.recap.map((r) => {
          const justes = r.reponses.filter((x) => x.point > 0).map((x) => x.joueur);
          return (
            <li key={r.index}>
              <button type="button" className="qz-recap-ligne" aria-expanded={ouverte === r.index}
                      onClick={() => setOuverte(ouverte === r.index ? null : r.index)}>
                <span className="qz-recap-num">{r.index + 1}</span>
                <span className="qz-recap-enonce">{r.question.enonce}</span>
                <span className="qz-recap-sol">{r.question.solution}</span>
                <span className="dim qz-recap-justes">{justes.length ? justes.join(', ') : 'personne'}</span>
              </button>
              {ouverte === r.index && (
                <ul className="qz-reponses">
                  {r.reponses.map((x) => (
                    <ReponseJoueur key={x.joueur} r={x} question={r.question} hote={false}
                                   joueurs={p.joueurs} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {hote && <ReglagesSuivants table={table} onAction={onAction} />}
    </section>
  );
}

// -- plateau ----------------------------------------------------------------

function Cote({ table, partie: p }) {
  const enJeu = p.phase === 'question' || p.phase === 'solution';
  const scores = p.scores || {};
  return (
    <aside className="tbl-jeu-cote" aria-label="Joueurs">
      <Carte titre={enJeu ? 'Réponses' : 'Scores'}>
        <ol className="tbl-scores">
          {p.joueurs.map((j) => (
            <li key={j} className={cx(j === table.moi && 'courant')}>
              <span className="qz-rond" style={{ background: couleurJoueur(j, p.joueurs) }} aria-hidden="true" />
              <span className="nom">{j}</span>
              <span className="valeur">
                {enJeu && (p.repondu.includes(j) ? '✓ a répondu' : '…')}
                {!enJeu && `${formatScore(scores[j] || 0)} pt${(scores[j] || 0) > 1 ? 's' : ''}`}
              </span>
            </li>
          ))}
        </ol>
      </Carte>
      <Carte titre="Comment ça marche">
        <ul className="qz-aide">
          <li>Réponses libres : pas de choix multiples.</li>
          <li>Questions à réponse attendue : la réponse s’affiche à la fin du temps.</li>
          <li>Questions ouvertes : rien n’est montré, l’hôte juge à la fin.</li>
          <li>À la fin, l’hôte revoit toutes les réponses et donne les points.</li>
        </ul>
      </Carte>
    </aside>
  );
}

export default function Plateau({ table, onAction }) {
  const p = table.partie;
  const cle = `${p.phase}-${p.index}`;
  const restant = useCompteur(p.reste, cle);
  const enCours = p.phase === 'question' || p.phase === 'solution';
  useFinDuTemps(table.membre && enCours, restant, cle,
    () => onAction(() => avancer(table.code, p.index)));
  let scene;
  if (p.phase === 'question') {
    scene = <PhaseQuestion table={table} partie={p} onAction={onAction} restant={restant} />;
  } else if (p.phase === 'solution') {
    scene = <PhaseSolution table={table} partie={p} onAction={onAction} restant={restant} />;
  } else if (p.phase === 'revue') {
    scene = <PhaseRevue table={table} partie={p} onAction={onAction} />;
  } else {
    scene = <PhaseFin table={table} partie={p} onAction={onAction} />;
  }
  return (
    <div className="tbl-jeu qz-jeu">
      <div className="qz-plateau">{scene}</div>
      <Cote table={table} partie={p} />
    </div>
  );
}

import { useState } from 'react';

import {
  Badge, Bouton, Carte, CarteJeu, Eventail, Journal, cx,
} from '@ui';
import { accepter, crier, poser } from './api';
import { desRangs } from './decor';

// La table de la taverne : les joueurs autour, le tas au centre avec le rang
// à annoncer, la dernière pose (qu'on peut dénoncer), et la main du joueur,
// dont il choisit de 1 à 4 cartes à poser. À droite, le journal.

const MAX = 4;
const cartes = (n) => `${n} carte${n > 1 ? 's' : ''}`;

function Revelation({ r }) {
  return (
    <div className={cx('mt-revelation', r.menteur ? 'menteur' : 'honnete')}>
      <Eventail chevauchement={0.4} className="mt-revelation-cartes">
        {r.cartes.map((c) => (
          <CarteJeu key={c.id} jeu="classique" rang={c.rang} enseigne={c.enseigne} taille="s" />
        ))}
      </Eventail>
      <p>
        {r.menteur
          ? `${r.poseur} annonçait ${desRangs(r.rang)}… et mentait ! Il ramasse le tas.`
          : `${r.poseur} disait vrai : ${r.appelant} ramasse le tas.`}
      </p>
    </div>
  );
}

export default function Plateau({ table, onAction }) {
  const p = table.partie;
  const [choix, setChoix] = useState([]);
  const main = p.main || [];
  const dansMain = new Set(main.map((c) => c.id));
  const choisies = choix.filter((id) => dansMain.has(id));
  const monTour = table.membre && p.tour === table.moi && !p.gagnant;
  const peutCrier = table.membre && p.pose && p.pose.joueur !== table.moi && !p.gagnant;
  const code = table.code;

  const basculer = (id) => {
    if (choisies.includes(id)) setChoix(choisies.filter((x) => x !== id));
    else if (choisies.length < MAX) setChoix([...choisies, id]);
  };
  const poserChoix = async () => {
    const r = await onAction(() => poser(code, choisies));
    if (r && r.ok) setChoix([]);
  };

  let message;
  if (p.gagnant) message = `${p.gagnant} n’a plus de cartes et gagne !`;
  else if (p.verdict) message = `${p.pose.joueur} a posé ses dernières cartes…`;
  else if (monTour) message = `À vous : posez ${desRangs(p.annonce)}`;
  else message = `${p.tour} doit poser ${desRangs(p.annonce)}`;

  const evenements = p.journal.slice().reverse().map((ligne, i) => ({
    cle: `${p.journal.length - i}-${ligne}`, contenu: ligne, ton: i === 0 ? 'actif' : undefined,
  }));

  return (
    <div className="tbl-jeu">
      <section className="mt-table" aria-label="La table">
        <ul className="mt-sieges">
          {p.joueurs.map((j) => (
            <li key={j.nom} className={cx('mt-siege', p.tour === j.nom && 'au-trait')}>
              <span className="mt-siege-nom">
                {j.nom}
                {j.nom === table.moi && <span className="dim"> (vous)</span>}
              </span>
              <Eventail chevauchement={0.75} className="mt-siege-main">
                {Array.from({ length: Math.min(j.cartes, 8) }, (_, i) => (
                  <CarteJeu key={i} jeu="classique" face="verso" taille="xs" />
                ))}
              </Eventail>
              <span className="mt-siege-compte">{cartes(j.cartes)}</span>
              {p.pose && p.pose.joueur === j.nom && (
                <Badge couleur="or" titre={`a posé ${p.pose.nombre}`} />
              )}
            </li>
          ))}
        </ul>

        <div className="mt-centre">
          <div className="mt-tas" aria-label={`Tas : ${cartes(p.tas)}`}>
            {p.tas > 0 ? [0, 1, 2].slice(0, Math.min(3, p.tas)).map((i) => (
              <CarteJeu key={i} jeu="classique" face="verso" taille="m"
                        className={`mt-tas-carte mt-tas-${i}`} />
            )) : <span className="mt-tas-vide">Tas vide</span>}
            <span className="mt-tas-compte">{cartes(p.tas)}</span>
          </div>
          <div className="mt-annonce">
            <p className={cx('mt-message', monTour && 'vous')}>{message}</p>
            {p.pose && !p.gagnant && (
              <p className="mt-pose">
                {`${p.pose.joueur} annonce ${cartes(p.pose.nombre)} : ${desRangs(p.pose.rang)}.`}
              </p>
            )}
            {peutCrier && (
              <Bouton couleur="rouge" variante="principal" taille="l" titre="Menteur !"
                      className="mt-crier" onClick={() => onAction(() => crier(code))} />
            )}
          </div>
          {p.revelation && <Revelation r={p.revelation} />}
        </div>

        {table.membre && main.length > 0 && (
          <div className={cx('mt-main', monTour && 'actif')}>
            <div className="mt-main-tete">
              <span>{`Votre main · ${cartes(main.length)}`}</span>
              {monTour && p.verdict && (
                <Bouton titre="Laisser passer" onClick={() => onAction(() => accepter(code))} />
              )}
              {monTour && !p.verdict && (
                <Bouton variante="principal" disabled={choisies.length === 0}
                        titre={choisies.length
                          ? `Poser ${cartes(choisies.length)} : « ${desRangs(p.annonce)} »`
                          : `Choisissez de 1 à ${MAX} cartes`}
                        onClick={poserChoix} />
              )}
            </div>
            <Eventail arc chevauchement={main.length > 14 ? 0.62 : 0.45} libelle="Votre main"
                      className="mt-main-cartes">
              {main.map((c) => (
                <CarteJeu key={c.id} jeu="classique" rang={c.rang} enseigne={c.enseigne}
                          taille="m" selectionnee={choisies.includes(c.id)}
                          desactivee={!monTour || p.verdict}
                          onClick={() => basculer(c.id)} />
              ))}
            </Eventail>
          </div>
        )}
      </section>
      <aside className="tbl-jeu-cote" aria-label="Journal">
        <Carte titre="Journal">
          <Journal evenements={evenements} libelle="Journal de la manche" />
        </Carte>
      </aside>
    </div>
  );
}

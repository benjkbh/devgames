import { effet as jouerEffet } from './effets';
import { PISTES } from './pistes';

// Moteur sonore du module UNO, synthétisé en direct (Web Audio) : aucun
// fichier, aucun droit. Il tient :
//   - deux morceaux (`pistes.js`) : la veillée, à la table, et la partie,
//     pendant la manche ; `piste(nom)` passe de l'un à l'autre en fondu ;
//   - les bruitages des cartes (`effets.js`), jouables même musique coupée ;
//   - la chaîne de sortie : volume de la musique, réverbération, écho,
//     compresseur doux.
// Aucun son brusque : attaques lentes, aigus filtrés, fondus partout. Le
// navigateur n'autorise le son qu'après un geste de l'utilisateur :
// `demarrer()` s'appelle depuis un clic ou une touche.
//
// Un seul moteur (`musique`) sert tout le module : `demarrer()` monte le son
// en fondu, `arreter()` le descend en fondu avant de libérer la sortie, de
// sorte qu'entrer dans le module ou le quitter n'ait aucune coupure.

const AVANCE = 1.5; // horizon de planification, secondes
const FONDU_ENTREE = 0.9; // constante de temps de la montée du son, secondes
const FONDU_SORTIE = 0.55; // et de sa descente
const FONDU_PISTE = 0.9; // et du passage d'un morceau à l'autre
const DUREE_SORTIE = 2.8; // le son est coupé ce délai après `arreter()`
const QUEUE_PISTE = 5; // un morceau délaissé n'est plus programmé après ce délai

export class Ambiance {
  constructor() {
    this.ctx = null;
    this.volume = 0.4; // 0 à 1
    this.muet = false; // musique coupée
    this.effets = true; // bruitages actifs
    this.voulue = 'veillee'; // morceau demandé, même avant le démarrage
    this.minuteur = null;
    this.fermeture = null;
    this.pistes = {};
  }

  get demarree() {
    return Boolean(this.ctx);
  }

  // Le son monte (ou est en train de s'éteindre sans être encore coupé).
  get enCours() {
    return Boolean(this.ctx) && this.fermeture === null;
  }

  async demarrer() {
    // Un arrêt en cours est annulé : le son remonte depuis où il en était.
    if (this.fermeture !== null) {
      clearTimeout(this.fermeture);
      this.fermeture = null;
    }
    if (this.ctx) {
      this.appliquer(FONDU_ENTREE);
      await this.ctx.resume();
      return;
    }
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte) throw new Error('Le navigateur ne sait pas jouer de son.');
    const ctx = new Contexte();
    this.ctx = ctx;
    this.construire();
    this.appliquer(FONDU_ENTREE);
    await ctx.resume();
  }

  // Descend le son en fondu, puis libère la sortie audio.
  arreter() {
    if (!this.ctx || this.fermeture !== null) return;
    this.appliquer(FONDU_SORTIE, true);
    this.fermeture = setTimeout(() => this.couper(), DUREE_SORTIE * 1000);
  }

  couper() {
    clearTimeout(this.fermeture);
    clearInterval(this.minuteur);
    this.fermeture = null;
    this.minuteur = null;
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.pistes = {};
  }

  regler({ volume, muet, effets }) {
    if (volume !== undefined) this.volume = Math.max(0, Math.min(1, volume));
    if (muet !== undefined) this.muet = Boolean(muet);
    if (effets !== undefined) this.effets = Boolean(effets);
    if (this.fermeture === null) this.appliquer();
  }

  // Volume perçu : courbe quadratique ; fondu, sans clic. `sortie` : le son
  // descend à zéro quel que soit le volume.
  appliquer(fondu = 0.2, sortie = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const niveau = this.volume ** 2 * 2.2;
    this.musique.gain.setTargetAtTime(this.muet || sortie ? 0 : niveau, t, fondu);
    this.sonEffets.gain.setTargetAtTime(
      this.effets && !sortie ? Math.max(0.12, niveau * 0.8) : 0, t, 0.05);
  }

  // Le morceau qui joue : `veillee` (à la table) ou `partie` (en manche). Le
  // changement se fait en fondu enchaîné ; demandé avant le démarrage, il est
  // retenu.
  piste(nom) {
    this.voulue = nom;
    if (this.ctx) this.aiguiller();
  }

  // -- chaîne de sortie --------------------------------------------------------

  // Réverbération : une réponse impulsionnelle de bruit qui s'éteint, filtrée
  // vers les graves (une grande salle de pierre, sans éclat).
  reverberation(ctx) {
    const duree = 3.2;
    const taille = Math.floor(ctx.sampleRate * duree);
    const reponse = ctx.createBuffer(2, taille, ctx.sampleRate);
    for (let c = 0; c < 2; c += 1) {
      const donnees = reponse.getChannelData(c);
      let precedent = 0;
      for (let i = 0; i < taille; i += 1) {
        // Bruit passe-bas (moyenne mobile) qui décroît en exponentielle.
        precedent = 0.55 * precedent + 0.45 * (Math.random() * 2 - 1);
        donnees[i] = precedent * (1 - i / taille) ** 3.2;
      }
    }
    const salle = ctx.createConvolver();
    salle.buffer = reponse;
    return salle;
  }

  // Un bruit blanc d'une seconde, pour les percussions et les bruitages.
  bruitBlanc(ctx) {
    const tampon = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < donnees.length; i += 1) donnees[i] = Math.random() * 2 - 1;
    return tampon;
  }

  construire() {
    const { ctx } = this;
    const compresseur = ctx.createDynamicsCompressor();
    compresseur.threshold.value = -20;
    compresseur.knee.value = 24;
    compresseur.ratio.value = 3;
    compresseur.attack.value = 0.02;
    compresseur.release.value = 0.4;
    compresseur.connect(ctx.destination);

    // Musique : un bus commun, sec vers la sortie et envoyé à la salle.
    this.musique = ctx.createGain();
    this.musique.gain.value = 0;
    this.musique.connect(compresseur);
    this.bus = ctx.createGain();
    this.bus.connect(this.musique);
    const salle = this.reverberation(ctx);
    const retourSalle = ctx.createGain();
    retourSalle.gain.value = 0.55;
    this.bus.connect(salle).connect(retourSalle).connect(this.musique);

    // Bruitages : leur propre niveau, sans réverbération.
    this.sonEffets = ctx.createGain();
    this.sonEffets.gain.value = 0;
    this.sonEffets.connect(compresseur);
    this.bruit = this.bruitBlanc(ctx);
    this.moteurEffets = { ctx, sortie: this.sonEffets, bruit: this.bruit };

    this.minuteur = setInterval(() => this.planifier(), 150);
    this.aiguiller();
  }

  // Un morceau : son gain, son écho (croche pointée, qui s'assombrit) et son
  // générateur, créés à la première demande.
  creerPiste(nom) {
    const { ctx } = this;
    const sortie = ctx.createGain();
    sortie.gain.value = 0;
    sortie.connect(this.bus);
    const echo = ctx.createDelay(2);
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 1900;
    const retour = ctx.createGain();
    retour.gain.value = 0.38;
    echo.connect(filtre).connect(retour).connect(echo);
    const sortieEcho = ctx.createGain();
    sortieEcho.gain.value = 0.5;
    filtre.connect(sortieEcho).connect(sortie);
    const piste = {
      sortie, actif: false, jusqua: 0,
      voix: PISTES[nom]({ ctx, sortie, echo, bruit: this.bruit }),
    };
    this.pistes[nom] = piste;
    return piste;
  }

  // Monte le morceau voulu et descend les autres.
  aiguiller() {
    const { ctx } = this;
    const t = ctx.currentTime;
    if (!this.pistes[this.voulue]) this.creerPiste(this.voulue);
    Object.entries(this.pistes).forEach(([nom, piste]) => {
      const veut = nom === this.voulue;
      if (veut && !piste.actif) piste.voix.reprendre(t + 0.1);
      if (!veut && piste.actif) piste.jusqua = t + QUEUE_PISTE;
      piste.actif = veut;
      piste.sortie.gain.setTargetAtTime(veut ? 1 : 0, t, FONDU_PISTE);
    });
    this.planifier();
  }

  // Programme les événements des prochaines `AVANCE` secondes (ou jusqu'à
  // `jusqua`, pour un rendu hors ligne).
  planifier(jusqua) {
    if (!this.ctx || this.ctx.state === 'closed') return;
    const t = this.ctx.currentTime;
    const horizon = jusqua ?? t + AVANCE;
    Object.values(this.pistes).forEach((piste) => {
      if (piste.actif || t < piste.jusqua) piste.voix.planifier(horizon);
    });
  }

  // Un bruitage de carte : `pose` ou `pioche`, dans `delai` secondes.
  effet(nom, delai = 0) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.effets) return;
    jouerEffet(this.moteurEffets, nom, this.ctx.currentTime + 0.02 + delai);
  }
}

// Le moteur unique du module.
export const musique = new Ambiance();

// Préférences du poste (volume 0 à 100, silences « 0 » ou « 1 »), lues aussi
// par `Lecteur` (`usePreference`).
export const CLE_VOLUME = 'uno-musique-volume';
export const CLE_MUET = 'uno-musique-muet';
export const CLE_EFFETS = 'uno-effets';

function preference(cle, defaut) {
  try {
    return window.localStorage.getItem(cle) ?? defaut;
  } catch (e) {
    return defaut;
  }
}

// Lance le son depuis un geste de l'utilisateur (clic sur UNO dans le menu) :
// c'est le moment où le navigateur l'autorise le plus largement. Rien si la
// musique et les bruitages sont tous deux coupés. `Lecteur` prend le relais à
// l'ouverture du module.
export function amorcerMusique() {
  const muet = preference(CLE_MUET, '0') === '1';
  const effets = preference(CLE_EFFETS, '1') === '1';
  if (muet && !effets) return;
  const volume = Number(preference(CLE_VOLUME, '40'));
  musique.regler({
    volume: (Number.isFinite(volume) ? volume : 40) / 100, muet, effets,
  });
  musique.demarrer().catch(() => {});
}

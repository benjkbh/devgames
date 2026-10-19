// Musique d'ambiance du module UNO, synthétisée en direct (Web Audio) :
// aucun fichier, aucun droit. Un morceau doux et lent, façon « lo-fi de
// veillée », en la mineur / do majeur :
//   nappe    accords tenus (la m7, fa maj7, do maj7, sol 6), voix douces qui
//            se fondent d'un accord à l'autre ;
//   basse    la fondamentale de l'accord, ronde, à chaque mesure ;
//   boîte    petites notes de boîte à musique sur la gamme pentatonique, au
//            hasard mais toujours consonantes, en marchant par degrés ;
//   salle    réverbération et écho : tout baigne dans un grand espace.
// Aucun son brusque : attaques lentes, aigus filtrés, compresseur doux.
// Le navigateur n'autorise le son qu'après un geste de l'utilisateur :
// `demarrer()` s'appelle depuis un clic ou une touche.
//
// Un seul moteur (`musique`) sert tout le module : `demarrer()` monte le son
// en fondu, `arreter()` le descend en fondu avant de libérer la sortie, de
// sorte qu'entrer dans le module ou le quitter n'ait aucune coupure.

// Accords : fondamentale (basse), voix de la nappe, notes de l'accord (MIDI,
// 60 = do central).
const ACCORDS = [
  { basse: 45, nappe: [52, 55, 60, 64], notes: [57, 60, 64, 67] }, // la m7
  { basse: 41, nappe: [53, 57, 60, 64], notes: [53, 57, 60, 64] }, // fa maj7
  { basse: 48, nappe: [52, 55, 59, 64], notes: [60, 64, 67, 71] }, // do maj7
  { basse: 43, nappe: [50, 55, 59, 64], notes: [55, 59, 62, 64] }, // sol 6
];
// Gamme des notes de la boîte à musique : pentatonique do majeur (la
// mineure), du la 4 au mi 6.
const GAMME = [69, 72, 74, 76, 79, 81, 84, 86, 88];

const TEMPO = 66; // pulsations par minute
const CROCHE = 60 / TEMPO / 2; // durée d'une croche, en secondes
const CROCHES_PAR_ACCORD = 16; // deux mesures
const DUREE_ACCORD = CROCHE * CROCHES_PAR_ACCORD;
const AVANCE = 1.5; // horizon de planification, secondes
const FONDU_ENTREE = 0.9; // constante de temps de la montée du son, secondes
const FONDU_SORTIE = 0.55; // et de sa descente
const DUREE_SORTIE = 2.8; // le son est coupé ce délai après `arreter()`

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const auHasard = (min, max) => min + Math.random() * (max - min);

export class Ambiance {
  constructor() {
    this.ctx = null;
    this.volume = 0.4; // 0 à 1
    this.muet = false;
    this.minuteur = null;
    this.fermeture = null;
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
  }

  regler({ volume, muet }) {
    if (volume !== undefined) this.volume = Math.max(0, Math.min(1, volume));
    if (muet !== undefined) this.muet = Boolean(muet);
    if (this.fermeture === null) this.appliquer();
  }

  // Volume perçu : courbe quadratique ; fondu, sans clic. `sortie` : le son
  // descend à zéro quel que soit le volume.
  appliquer(fondu = 0.2, sortie = false) {
    if (!this.ctx) return;
    const cible = this.muet || sortie ? 0 : this.volume ** 2 * 2.2;
    this.maitre.gain.setTargetAtTime(cible, this.ctx.currentTime, fondu);
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

  construire() {
    const { ctx } = this;
    this.maitre = ctx.createGain();
    this.maitre.gain.value = 0;
    const compresseur = ctx.createDynamicsCompressor();
    compresseur.threshold.value = -20;
    compresseur.knee.value = 24;
    compresseur.ratio.value = 3;
    compresseur.attack.value = 0.02;
    compresseur.release.value = 0.4;
    this.maitre.connect(compresseur).connect(ctx.destination);

    // Bus commun : sec vers la sortie, envoyé en partie à la salle.
    this.bus = ctx.createGain();
    this.bus.connect(this.maitre);
    const salle = this.reverberation(ctx);
    const retourSalle = ctx.createGain();
    retourSalle.gain.value = 0.55;
    this.bus.connect(salle).connect(retourSalle).connect(this.maitre);

    // Écho des notes de boîte à musique : croche pointée, qui s'assombrit.
    this.echo = ctx.createDelay(2);
    this.echo.delayTime.value = CROCHE * 3;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 1900;
    const retour = ctx.createGain();
    retour.gain.value = 0.38;
    this.echo.connect(filtre).connect(retour).connect(this.echo);
    const sortieEcho = ctx.createGain();
    sortieEcho.gain.value = 0.5;
    filtre.connect(sortieEcho).connect(this.bus);

    const t = ctx.currentTime + 0.1;
    this.croche = 0;
    this.prochaine = t;
    this.degre = 4; // dernière note de la boîte à musique, dans GAMME
    this.accord = ACCORDS[0];
    this.minuteur = setInterval(() => this.planifier(), 150);
    this.planifier();
  }

  // -- voix --------------------------------------------------------------------

  // Nappe : chaque voix, deux triangles légèrement désaccordés, filtrés,
  // montent lentement et s'éteignent sous l'accord suivant.
  nappe(accord, t) {
    const { ctx } = this;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.setValueAtTime(500, t);
    filtre.frequency.linearRampToValueAtTime(950, t + DUREE_ACCORD * 0.5);
    filtre.frequency.linearRampToValueAtTime(600, t + DUREE_ACCORD + 2);
    filtre.Q.value = 0.5;
    const enveloppe = ctx.createGain();
    enveloppe.gain.setValueAtTime(0, t);
    enveloppe.gain.linearRampToValueAtTime(0.05, t + 2.2);
    enveloppe.gain.setValueAtTime(0.05, t + DUREE_ACCORD - 0.2);
    enveloppe.gain.linearRampToValueAtTime(0, t + DUREE_ACCORD + 2.8);
    filtre.connect(enveloppe).connect(this.bus);
    accord.nappe.forEach((note) => [-5, 5].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz(note);
      o.detune.value = cents;
      o.connect(filtre);
      o.start(t);
      o.stop(t + DUREE_ACCORD + 3);
    }));
  }

  // Basse : une sinusoïde ronde, qui s'éteint doucement.
  basse(note, t, force = 1) {
    const { ctx } = this;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(note);
    const enveloppe = ctx.createGain();
    enveloppe.gain.setValueAtTime(0, t);
    enveloppe.gain.linearRampToValueAtTime(0.13 * force, t + 0.06);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    o.connect(enveloppe).connect(this.bus);
    o.start(t);
    o.stop(t + 3.5);
  }

  // Boîte à musique : une note pincée, claire mais sans dureté, envoyée dans
  // l'écho et dans la salle, placée au hasard dans l'espace stéréo.
  note(midi, t, force = 1) {
    const { ctx } = this;
    const enveloppe = ctx.createGain();
    enveloppe.gain.setValueAtTime(0, t);
    enveloppe.gain.linearRampToValueAtTime(0.075 * force, t + 0.01);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 3200;
    let sortie = enveloppe;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = auHasard(-0.45, 0.45);
      enveloppe.connect(pan);
      sortie = pan;
    }
    sortie.connect(this.bus);
    sortie.connect(this.echo);
    // Fondamentale, octave douce et petit partiel de cloche.
    [[1, 'sine', 1], [2, 'sine', 0.22], [4.02, 'sine', 0.05]].forEach(
      ([rapport, type, part]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz(midi) * rapport;
        const g = ctx.createGain();
        g.gain.value = part;
        o.connect(g).connect(filtre).connect(enveloppe);
        o.start(t);
        o.stop(t + 2.3);
      },
    );
  }

  // Prochaine note de la boîte à musique : un pas voisin dans la gamme, avec
  // un penchant pour les notes de l'accord.
  prochaineNote() {
    const pas = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
    let degre = Math.max(0, Math.min(GAMME.length - 1, this.degre + pas));
    const propre = (i) => this.accord.notes.some(
      (n) => (GAMME[i] - n) % 12 === 0,
    );
    // Si la note n'est pas de l'accord, on cherche une voisine qui l'est,
    // une fois sur deux.
    if (!propre(degre) && Math.random() < 0.5) {
      const voisin = [degre - 1, degre + 1].find(
        (i) => i >= 0 && i < GAMME.length && propre(i),
      );
      if (voisin !== undefined) degre = voisin;
    }
    this.degre = degre;
    return GAMME[degre];
  }

  // Planifie les événements des prochaines `AVANCE` secondes (ou jusqu'à
  // `jusqua`, pour un rendu hors ligne).
  planifier(jusqua) {
    if (!this.ctx || this.ctx.state === 'closed') return;
    const horizon = jusqua ?? this.ctx.currentTime + AVANCE;
    while (this.prochaine < horizon) {
      const t = this.prochaine;
      const place = this.croche % CROCHES_PAR_ACCORD;
      if (place === 0) {
        this.accord = ACCORDS[
          Math.floor(this.croche / CROCHES_PAR_ACCORD) % ACCORDS.length];
        this.nappe(this.accord, t);
        this.basse(this.accord.basse, t);
      } else if (place === 8) {
        this.basse(this.accord.basse + 7, t, 0.55);
      }
      // Temps forts plus souvent garnis que les contretemps ; silences entre.
      const chance = place % 4 === 0 ? 0.7 : 0.33;
      if (place > 0 && Math.random() < chance) {
        this.note(this.prochaineNote(), t + auHasard(0, 0.025),
          place % 4 === 0 ? 1 : 0.75);
      }
      this.croche += 1;
      this.prochaine += CROCHE;
    }
  }
}

// Le moteur unique du module.
export const musique = new Ambiance();

// Préférences du poste (volume 0 à 100, silence « 0 » ou « 1 »), lues aussi
// par `Lecteur` (`usePreference`).
export const CLE_VOLUME = 'uno-musique-volume';
export const CLE_MUET = 'uno-musique-muet';

function preference(cle, defaut) {
  try {
    return window.localStorage.getItem(cle) ?? defaut;
  } catch (e) {
    return defaut;
  }
}

// Lance la musique depuis un geste de l'utilisateur (clic sur UNO dans le
// menu) : c'est le moment où le navigateur l'autorise le plus largement. Rien
// si le silence est mémorisé. `Lecteur` prend le relais à l'ouverture du
// module.
export function amorcerMusique() {
  if (preference(CLE_MUET, '0') === '1') return;
  const volume = Number(preference(CLE_VOLUME, '40'));
  musique.regler({ volume: (Number.isFinite(volume) ? volume : 40) / 100, muet: false });
  musique.demarrer().catch(() => {});
}

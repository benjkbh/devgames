// Musique d'ambiance du module UNO, synthétisée en direct (Web Audio) :
// aucun fichier, aucun droit. La nuit sur Thiercelieux :
//   nappe    accords graves en ré mineur (Rém, Si♭, Solm, La), cordes
//            frottées filtrées qui respirent lentement ;
//   cloche   notes de l'accord, deux octaves plus haut, au hasard, avec un
//            écho lointain ;
//   vent     bruit filtré dont la hauteur ondule ;
//   loup     un hurlement de temps en temps, loin dans l'écho.
// Le navigateur n'autorise le son qu'après un geste de l'utilisateur :
// `demarrer()` s'appelle depuis un clic ou une touche.

// Accords en notes MIDI (60 = do central).
const ACCORDS = [
  [38, 45, 50, 53], // ré mineur
  [34, 41, 46, 50], // si bémol
  [31, 38, 43, 46], // sol mineur
  [33, 40, 45, 49], // la majeur (dominante)
];
const DUREE_ACCORD = 9; // secondes
const AVANCE = 0.6; // horizon de planification, secondes
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const auHasard = (min, max) => min + Math.random() * (max - min);

export class Ambiance {
  constructor() {
    this.ctx = null;
    this.volume = 0.4; // 0 à 1
    this.muet = false;
  }

  get demarree() {
    return Boolean(this.ctx);
  }

  async demarrer() {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte) throw new Error('Le navigateur ne sait pas jouer de son.');
    const ctx = new Contexte();
    this.ctx = ctx;

    // Chaîne de sortie : volume général, puis compresseur doux.
    this.maitre = ctx.createGain();
    this.maitre.gain.value = 0;
    const compresseur = ctx.createDynamicsCompressor();
    this.maitre.connect(compresseur).connect(ctx.destination);

    // Écho lointain (retour filtré) : l'espace de la forêt.
    this.echo = ctx.createDelay(2);
    this.echo.delayTime.value = 0.43;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 1800;
    const retour = ctx.createGain();
    retour.gain.value = 0.42;
    this.echo.connect(filtre).connect(retour).connect(this.echo);
    const sortieEcho = ctx.createGain();
    sortieEcho.gain.value = 0.55;
    filtre.connect(sortieEcho).connect(this.maitre);

    this.nappe();
    this.vent();
    const t = ctx.currentTime;
    this.indice = 0;
    this.prochainAccord = t;
    this.prochaineNote = t + 1.5;
    this.prochainLoup = t + auHasard(10, 18);
    this.minuteur = setInterval(() => this.planifier(), 200);
    this.appliquer();
    await ctx.resume();
  }

  arreter() {
    clearInterval(this.minuteur);
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
  }

  regler({ volume, muet }) {
    if (volume !== undefined) this.volume = Math.max(0, Math.min(1, volume));
    if (muet !== undefined) this.muet = Boolean(muet);
    this.appliquer();
  }

  // Volume perçu : courbe quadratique ; fondu court, sans clic.
  appliquer() {
    if (!this.ctx) return;
    const cible = this.muet ? 0 : this.volume ** 2 * 0.9;
    this.maitre.gain.setTargetAtTime(cible, this.ctx.currentTime, 0.2);
  }

  // -- voix ------------------------------------------------------------------

  nappe() {
    const { ctx } = this;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 520;
    filtre.Q.value = 0.7;
    // Respiration lente du filtre.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const profondeur = ctx.createGain();
    profondeur.gain.value = 260;
    lfo.connect(profondeur).connect(filtre.frequency);
    lfo.start();
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    filtre.connect(gain).connect(this.maitre);
    // Quatre voix, chacune de deux scies légèrement désaccordées.
    this.voix = ACCORDS[0].map((note) => [-6, 6].map((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(note);
      o.detune.value = cents;
      o.connect(filtre);
      o.start();
      return o;
    }));
  }

  vent() {
    const { ctx } = this;
    const taille = ctx.sampleRate * 2;
    const tampon = ctx.createBuffer(1, taille, ctx.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < taille; i += 1) donnees[i] = Math.random() * 2 - 1;
    const bruit = ctx.createBufferSource();
    bruit.buffer = tampon;
    bruit.loop = true;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.frequency.value = 480;
    filtre.Q.value = 0.9;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const profondeur = ctx.createGain();
    profondeur.gain.value = 300;
    lfo.connect(profondeur).connect(filtre.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0.03;
    bruit.connect(filtre).connect(gain).connect(this.maitre);
    bruit.start();
    lfo.start();
  }

  // Glissement de la nappe vers l'accord suivant.
  accord(t) {
    const notes = ACCORDS[this.indice % ACCORDS.length];
    this.voix.forEach((paire, i) => paire.forEach((o) => {
      o.frequency.setTargetAtTime(hz(notes[i]), t, 1.4);
    }));
    this.notes = notes;
    this.indice += 1;
  }

  cloche(t) {
    const { ctx } = this;
    const notes = this.notes || ACCORDS[0];
    const note = notes[Math.floor(Math.random() * notes.length)] + 24
      + (Math.random() < 0.3 ? 12 : 0);
    const enveloppe = ctx.createGain();
    enveloppe.gain.setValueAtTime(0, t);
    enveloppe.gain.linearRampToValueAtTime(0.05, t + 0.01);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    enveloppe.connect(this.maitre);
    enveloppe.connect(this.echo);
    // Fondamentale et partiel inharmonique : le timbre d'une cloche.
    [[1, 'triangle', 1], [2.76, 'sine', 0.35]].forEach(([rapport, type, part]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz(note) * rapport;
      const g = ctx.createGain();
      g.gain.value = part;
      o.connect(g).connect(enveloppe);
      o.start(t);
      o.stop(t + 3.3);
    });
  }

  loup(t) {
    const { ctx } = this;
    const base = auHasard(300, 360);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.65, t + 1.1);
    o.frequency.setValueAtTime(base * 1.65, t + 2.4);
    o.frequency.exponentialRampToValueAtTime(base * 1.15, t + 4.2);
    // Trémolo de la voix.
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const ampleur = ctx.createGain();
    ampleur.gain.value = 7;
    vibrato.connect(ampleur).connect(o.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.035, t + 0.9);
    env.gain.setValueAtTime(0.035, t + 2.6);
    env.gain.linearRampToValueAtTime(0, t + 4.4);
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 1400;
    o.connect(filtre).connect(env);
    // Surtout dans l'écho : le loup est loin.
    const proche = ctx.createGain();
    proche.gain.value = 0.35;
    env.connect(proche).connect(this.maitre);
    env.connect(this.echo);
    [o, vibrato].forEach((x) => { x.start(t); x.stop(t + 4.6); });
  }

  // Planifie les événements des prochaines `AVANCE` secondes.
  planifier() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const horizon = this.ctx.currentTime + AVANCE;
    while (this.prochainAccord < horizon) {
      this.accord(this.prochainAccord);
      this.prochainAccord += DUREE_ACCORD;
    }
    while (this.prochaineNote < horizon) {
      if (Math.random() < 0.5) this.cloche(this.prochaineNote);
      this.prochaineNote += 0.75;
    }
    if (this.prochainLoup < horizon) {
      this.loup(this.prochainLoup);
      this.prochainLoup += auHasard(28, 55);
    }
  }
}

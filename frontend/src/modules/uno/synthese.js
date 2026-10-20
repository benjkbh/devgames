// Voix de synthèse (Web Audio) partagées par les morceaux (`pistes.js`) et les
// bruitages (`effets.js`). Chaque fonction reçoit `m`, le moteur :
//   m.ctx      le contexte audio ;
//   m.sortie   où envoyer le son sec (le gain du morceau, ou des effets) ;
//   m.echo     entrée de l'écho commun (facultatif) ;
//   m.bruit    tampon de bruit blanc, d'une seconde.
// `t` est un instant du contexte, en secondes.

export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
export const auHasard = (min, max) => min + Math.random() * (max - min);
export const choisir = (liste) => liste[Math.floor(Math.random() * liste.length)];

// Nappe : chaque voix de l'accord, deux triangles légèrement désaccordés,
// filtrés ; le son monte lentement et s'éteint sous l'accord suivant.
export function nappe(m, notes, t, duree, force = 0.05, brillance = 950) {
  const { ctx } = m;
  const filtre = ctx.createBiquadFilter();
  filtre.type = 'lowpass';
  filtre.frequency.setValueAtTime(500, t);
  filtre.frequency.linearRampToValueAtTime(brillance, t + duree * 0.5);
  filtre.frequency.linearRampToValueAtTime(600, t + duree + 2);
  filtre.Q.value = 0.5;
  const enveloppe = ctx.createGain();
  enveloppe.gain.setValueAtTime(0, t);
  enveloppe.gain.linearRampToValueAtTime(force, t + Math.min(2.2, duree * 0.6));
  enveloppe.gain.setValueAtTime(force, t + duree - 0.2);
  enveloppe.gain.linearRampToValueAtTime(0, t + duree + 2.8);
  filtre.connect(enveloppe).connect(m.sortie);
  notes.forEach((note) => [-5, 5].forEach((cents) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz(note);
    o.detune.value = cents;
    o.connect(filtre);
    o.start(t);
    o.stop(t + duree + 3);
  }));
}

// Basse : une sinusoïde ronde (avec un peu d'octave, pour s'entendre sur de
// petits haut-parleurs), qui s'éteint en `queue` secondes.
export function basse(m, note, t, force = 1, queue = 3.4) {
  const { ctx } = m;
  const enveloppe = ctx.createGain();
  enveloppe.gain.setValueAtTime(0, t);
  enveloppe.gain.linearRampToValueAtTime(0.13 * force, t + 0.04);
  enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + queue);
  enveloppe.connect(m.sortie);
  [[1, 'sine', 1], [2, 'triangle', 0.18]].forEach(([rapport, type, part]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz(note) * rapport;
    const g = ctx.createGain();
    g.gain.value = part;
    o.connect(g).connect(enveloppe);
    o.start(t);
    o.stop(t + queue + 0.1);
  });
}

// Note pincée (boîte à musique) : claire mais sans dureté, envoyée dans
// l'écho, placée au hasard dans l'espace stéréo.
export function pincee(m, midi, t, force = 1, queue = 2.2) {
  const { ctx } = m;
  const enveloppe = ctx.createGain();
  enveloppe.gain.setValueAtTime(0, t);
  enveloppe.gain.linearRampToValueAtTime(0.075 * force, t + 0.01);
  enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + queue);
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
  sortie.connect(m.sortie);
  if (m.echo) sortie.connect(m.echo);
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
      o.stop(t + queue + 0.1);
    },
  );
}

// Rafale de bruit filtré : de quoi faire un claquement, un frottement, un
// souffle. `filtre` : { type, freq, q, fin } (`fin` : fréquence d'arrivée, le
// filtre glisse de `freq` à `fin`) ; `attaque`, `duree` en secondes.
export function souffle(m, t, {
  type = 'bandpass', freq = 2000, fin, q = 1, force = 0.3, attaque = 0.002,
  duree = 0.08, sortie,
}) {
  const { ctx } = m;
  const source = ctx.createBufferSource();
  source.buffer = m.bruit;
  source.loop = true;
  const filtre = ctx.createBiquadFilter();
  filtre.type = type;
  filtre.Q.value = q;
  filtre.frequency.setValueAtTime(freq, t);
  if (fin) filtre.frequency.exponentialRampToValueAtTime(fin, t + duree);
  const enveloppe = ctx.createGain();
  enveloppe.gain.setValueAtTime(0, t);
  enveloppe.gain.linearRampToValueAtTime(force, t + attaque);
  enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  source.connect(filtre).connect(enveloppe).connect(sortie || m.sortie);
  source.start(t, Math.random() * 0.5);
  source.stop(t + duree + 0.05);
}

// Coup sourd : une sinusoïde qui plonge (grosse caisse douce, choc d'une carte
// sur le feutre).
export function coup(m, t, {
  freq = 120, fin = 50, force = 0.4, duree = 0.18, sortie,
} = {}) {
  const { ctx } = m;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(fin, t + duree);
  const enveloppe = ctx.createGain();
  enveloppe.gain.setValueAtTime(0, t);
  enveloppe.gain.linearRampToValueAtTime(force, t + 0.004);
  enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(enveloppe).connect(sortie || m.sortie);
  o.start(t);
  o.stop(t + duree + 0.05);
}

// Accès HTTP de l'interface : les fichiers d'API des modules passent tous par
// ici (envoi du cookie de session, gestion des erreurs).
//

const COMMUN = { credentials: 'same-origin' };

// Décode la réponse JSON. Si le statut n'est pas 2xx, lève une `Error` portant
// le message `erreur` du serveur, le `statut` HTTP et, quand il est rendu, le
// détail `champs` (refus de formulaire, champ par champ).
async function json(reponse) {
  const corps = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const e = new Error(corps.erreur || `Erreur ${reponse.status}`);
    e.statut = reponse.status;
    if (corps.champs) e.champs = corps.champs;
    throw e;
  }
  return corps;
}

// GET. Les paramètres vides (`undefined`, `null`, chaîne vide) ne sont pas
// envoyés.
export function lire(chemin, params = {}) {
  const utiles = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );
  const q = new URLSearchParams(utiles).toString();
  return fetch(q ? `${chemin}?${q}` : chemin, COMMUN).then(json);
}

export function poster(chemin, corps) {
  return fetch(chemin, {
    ...COMMUN,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  }).then(json);
}

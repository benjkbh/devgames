// Vrai si `a` et `b` ont le même contenu JSON, en ignorant les clés `ignorees`.
// Sert à garder l'objet précédent quand une relecture rend les mêmes données :
// React ne refait alors aucun rendu.
export function identique(a, b, ignorees = []) {
  if (a === b) return true;
  if (!a || !b) return false;
  const filtre = ignorees.length
    ? (cle, valeur) => (ignorees.includes(cle) ? undefined : valeur)
    : undefined;
  return JSON.stringify(a, filtre) === JSON.stringify(b, filtre);
}

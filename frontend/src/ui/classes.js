// Assemble une liste de classes en ignorant les valeurs fausses.
// `cx('btn', actif && 'actif', undefined)` -> « btn actif ».
export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

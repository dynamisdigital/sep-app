/** Escala visual do quadro da aplicação; o overlay do tour permanece fora dele. */
export function escalaDoLayout(elemento: HTMLElement): number {
  const quadro = elemento.closest('.sep-viewport');
  if (!quadro) return 1;
  return Number.parseFloat(getComputedStyle(quadro).zoom) || 1;
}

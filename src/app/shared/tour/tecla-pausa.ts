import type { EstadoTour } from '../../core/tour/tour.service';

// Atalho de teclado do widget do tour: a barra de espaco pausa e retoma, como o botao Pausar/Continuar.
// A decisao fica aqui, sem Angular, para ser testada sem montar o widget.

export type AcaoDaTecla = 'pausar' | 'continuar';

/** Campos em que a barra de espaco e texto: nunca viram atalho. */
function ehCampoDeEdicao(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  return (
    alvo instanceof HTMLInputElement ||
    alvo instanceof HTMLTextAreaElement ||
    alvo instanceof HTMLSelectElement ||
    alvo.isContentEditable
  );
}

/**
 * Diz o que a barra de espaco deve fazer agora, ou `null` quando a tecla nao e do tour.
 *
 * - Rodando pausa, pausado retoma; concluido, interrompido ou parado nao reagem.
 * - So teclado de verdade (`isTrusted`): o proprio roteiro digita espacos em campos com eventos
 *   sinteticos, e eles nao podem pausar o tour.
 * - Com Ctrl, Alt ou Meta, ou em campo de texto, a tecla segue o comportamento normal.
 */
export function acaoDaTecla(evento: KeyboardEvent, estado: EstadoTour): AcaoDaTecla | null {
  if (evento.code !== 'Space' && evento.key !== ' ') return null;
  if (!evento.isTrusted || evento.repeat) return null;
  if (evento.ctrlKey || evento.altKey || evento.metaKey) return null;
  if (ehCampoDeEdicao(evento.target)) return null;
  if (estado === 'rodando') return 'pausar';
  if (estado === 'pausado') return 'continuar';
  return null;
}

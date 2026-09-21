import { describe, expect, it } from 'vitest';

import { formatarData } from './formalizacao-format';

/**
 * Fiacao com `formatarDataIso` (FMF-4.1). O contrato completo — e a explicacao de por que
 * `new Date(null)` vira epoch em vez de `NaN` — esta em `core/format/data.spec.ts`; aqui so se
 * prova que **esta funcao** passa por ele, porque antes ela chamava o `Intl` direto.
 *
 * Nenhum horario e afirmado: o CI roda em UTC e a maquina de dev em -03.
 */
describe('formatarData', () => {
  /** Era `31/12/1969` na tela (em -03), sem erro nenhum. */
  it('null nao vira data de 1969', () => {
    expect(formatarData(null as unknown as string)).toBe('');
  });

  /** Era `RangeError: Invalid time value`, que quebrava a renderizacao do componente. */
  it.each([undefined, '', 'lixo'])('%s nao lanca', (entrada) => {
    expect(() => formatarData(entrada as unknown as string)).not.toThrow();
  });

  it('data valida continua formatando', () => {
    expect(formatarData('2026-09-14T12:00:00Z')).toContain('14/09/2026');
  });
});

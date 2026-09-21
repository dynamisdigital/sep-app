import { describe, expect, it } from 'vitest';

import { formatarData, formatarDataLocal } from './cobranca-format';

/**
 * A cobranca tem os **dois** formatadores de data do web, e eles falham de formas diferentes — por
 * isso o arquivo cobre os dois. O contrato comum esta em `core/format/data.spec.ts`.
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

/**
 * `formatarDataLocal` nao passa pelo `formatarDataIso`: ele evita `Date` de proposito, porque
 * `new Date('2026-09-14')` e interpretado como **UTC** e num fuso a oeste volta um dia. A guarda
 * tinha de ser outra — casar o formato `yyyy-MM-dd` — e os modos de falha tambem eram outros.
 */
describe('formatarDataLocal', () => {
  it('LocalDate valido nao desloca o dia', () => {
    expect(formatarDataLocal('2026-09-14')).toBe('14/09/2026');
  });

  /** Era `TypeError: Cannot read properties of undefined (reading 'split')`. */
  it.each([null, undefined])('%s nao lanca e vira vazio', (entrada) => {
    expect(formatarDataLocal(entrada as unknown as string)).toBe('');
  });

  /**
   * Antes, `'lixo'.split('-')` devolvia um array de um elemento e a template string montava
   * **`undefined/undefined/lixo`** — saida sem sentido, sem erro e sem pista da causa.
   */
  /**
   * `'2026/09/14'` e `'2026.09.14'` estao aqui para travar o **separador**: a entrada legitima e
   * `LocalDate` ISO com hifen, e so ela. Uma regex frouxa no separador sobreviveu a mutacao ate
   * estes dois casos entrarem.
   */
  it.each(['lixo', '2026-09', '14/09/2026', '2026-9-4', '2026/09/14', '2026.09.14'])(
    '%s fora do formato volta verbatim',
    (entrada) => {
      expect(formatarDataLocal(entrada)).toBe(entrada);
    },
  );

  /**
   * Trava a ancora `$` da regex. Um `OffsetDateTime` passado por engano aqui casa o **prefixo**
   * `yyyy-MM-dd`; sem a ancora a funcao devolveria `14/09/2026` e o horario sumiria sem aviso —
   * o mesmo tipo de perda silenciosa que a FMF-4.1 esta fechando. Volta verbatim de proposito.
   *
   * Escrito porque a mutacao que remove o `$` **sobreviveu** a primeira versao desta suite.
   */
  it.each(['2026-09-14T10:00:00Z', '2026-09-14 10:00', '2026-09-141'])(
    'instante completo (%s) nao vira LocalDate truncado',
    (entrada) => {
      expect(formatarDataLocal(entrada)).toBe(entrada);
    },
  );
});

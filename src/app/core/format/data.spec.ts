import { describe, expect, it } from 'vitest';

import { formatarDataIso } from './data';

const SO_DATA: Intl.DateTimeFormatOptions = { dateStyle: 'short' };
const DATA_E_HORA: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' };

/**
 * Meio-dia UTC de proposito: em qualquer fuso entre -11 e +11 o **dia** do calendario e o mesmo, o
 * que torna a afirmacao de data independente da maquina. O horario NAO e afirmado em lugar nenhum
 * deste arquivo — o CI roda em UTC e a maquina de dev em -03 (mesma razao registrada em
 * `notificacoes-page.component.spec.ts:133`).
 */
const INSTANTE_VALIDO = '2026-09-14T12:00:00Z';

describe('formatarDataIso', () => {
  describe('data que nao e exibivel', () => {
    /**
     * **`null` e o caso que motivou a FMF-4.1, e o unico que nao falha alto.** `new Date(null)`
     * coage `null` para `0` e devolve a epoch — instante valido, `getTime()` = 0, `Number.isNaN`
     * falso. Uma guarda que so testa `NaN` deixa passar e a tela mostra `31/12/1969` (em -03) ou
     * `01/01/1970` (em UTC): data plausivel, errada, e sem aviso nenhum.
     *
     * O teste afirma `''` e nao a data de 1969 justamente porque `''` e a unica resposta estavel
     * entre fusos — e porque renderizar qualquer data aqui ja seria o defeito.
     */
    it('null vira string vazia, e nao a epoch', () => {
      expect(formatarDataIso(null as unknown as string, SO_DATA)).toBe('');
    });

    /** Campo ausente do corpo JSON chega como `undefined`; antes lancava `RangeError`. */
    it('undefined vira string vazia', () => {
      expect(formatarDataIso(undefined as unknown as string, SO_DATA)).toBe('');
    });

    /**
     * `''` nao tem guarda propria: cai no ramo do nao-parseavel (`new Date('')` e `Invalid Date`) e
     * volta verbatim, que para string vazia **e** string vazia. O teste trava o desfecho, nao o
     * caminho — uma guarda dedicada para `''` foi escrita, sobreviveu a mutacao que a removia, e
     * por isso saiu (licao da F-27: guarda que nao morre por mutacao sai).
     */
    it('string vazia vira string vazia', () => {
      expect(formatarDataIso('', SO_DATA)).toBe('');
    });

    /**
     * Texto presente mas nao parseavel volta **verbatim**, em vez de virar `''`: aqui o servidor
     * mandou alguma coisa, e mostrar o que veio e o que permite descobrir o defeito olhando a tela.
     * `'2026-13-45'` e o caso realista (mes 13, dia 45); `'lixo'` cobre o texto arbitrario.
     */
    it.each(['lixo', '2026-13-45', 'PT2H'])('%s nao parseavel volta verbatim', (entrada) => {
      expect(formatarDataIso(entrada, SO_DATA)).toBe(entrada);
    });

    /** Nenhuma das entradas acima pode lancar — era `RangeError: Invalid time value`. */
    it.each([null, undefined, '', 'lixo', '2026-13-45'])('%s nao lanca', (entrada) => {
      expect(() => formatarDataIso(entrada as unknown as string, DATA_E_HORA)).not.toThrow();
    });
  });

  describe('data exibivel', () => {
    it('formata o dia em pt-BR', () => {
      expect(formatarDataIso(INSTANTE_VALIDO, SO_DATA)).toBe('14/09/2026');
    });

    /**
     * Prova que as `opcoes` chegam ao `Intl` em vez de ficarem ignoradas: com `timeStyle` a saida
     * tem de conter o dia **e** crescer. O horario em si nao e afirmado (fuso).
     */
    it('aplica as opcoes recebidas', () => {
      const comHora = formatarDataIso(INSTANTE_VALIDO, DATA_E_HORA);
      expect(comHora).toContain('14/09/2026');
      expect(comHora.length).toBeGreaterThan(formatarDataIso(INSTANTE_VALIDO, SO_DATA).length);
    });

    /**
     * A epoch **explicita** continua formatando. Este teste existe para que a guarda de `null` nao
     * possa ser implementada como "descarta o instante 0": quem mandar `1970-01-01T00:00:00Z` de
     * verdade tem direito a ver a data.
     */
    it('a epoch explicita e formatada, nao descartada', () => {
      expect(formatarDataIso('1970-01-01T12:00:00Z', SO_DATA)).toBe('01/01/1970');
    });
  });
});

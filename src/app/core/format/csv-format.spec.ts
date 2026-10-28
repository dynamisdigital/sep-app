import { describe, expect, it } from 'vitest';

import { formatarCelulaCsv, gerarLinhaCsv } from './csv-format';

describe('CSV Sanitization & Hardening (CWE-1236)', () => {
  it('escapa aspas duplas internas e envolve em aspas', () => {
    expect(formatarCelulaCsv('Texto com "aspas"')).toBe('"Texto com ""aspas"""');
  });

  it('retorna celula vazia para valores nulos ou indefinidos', () => {
    expect(formatarCelulaCsv(null)).toBe('""');
    expect(formatarCelulaCsv(undefined)).toBe('""');
  });

  it('formata numeros e booleanos normalmente', () => {
    expect(formatarCelulaCsv(123.45)).toBe('"123.45"');
    expect(formatarCelulaCsv(true)).toBe('"true"');
  });

  it('neutraliza injeção de fórmula iniciando com "=" adicionando apostrofo', () => {
    const payload = "=cmd|' /C calc'!A0";
    expect(formatarCelulaCsv(payload)).toBe("\"'=cmd|' /C calc'!A0\"");
  });

  it('neutraliza injeção de fórmula com HYPERLINK malicioso', () => {
    const payload = '=HYPERLINK("https://phishing.site", "Clique Aqui")';
    expect(formatarCelulaCsv(payload)).toBe(
      '"\'=HYPERLINK(""https://phishing.site"", ""Clique Aqui"")"',
    );
  });

  it('neutraliza formulas iniciando com "+", "-", "@", "\\t", "\\r"', () => {
    expect(formatarCelulaCsv('+12345')).toBe('"\' +12345"'.replace(' ', ''));
    expect(formatarCelulaCsv('-SUM(1,2)')).toBe('"\' -SUM(1,2)"'.replace(' ', ''));
    expect(formatarCelulaCsv('@SUM(A1:A10)')).toBe('"\' @SUM(A1:A10)"'.replace(' ', ''));
    expect(formatarCelulaCsv('\tTAB_INJECT')).toBe('"\' \tTAB_INJECT"'.replace(' ', ''));
    expect(formatarCelulaCsv('\rCARRIAGE_INJECT')).toBe('"\' \rCARRIAGE_INJECT"'.replace(' ', ''));
  });

  it('gera linha CSV com delimitador padrao ponto-e-virgula', () => {
    const colunas = ['Ana Martins', 1500.5, '=2+2', 'Status OK'];
    const linha = gerarLinhaCsv(colunas);
    expect(linha).toBe('"Ana Martins";"1500.5";"\'=2+2";"Status OK"');
  });
});

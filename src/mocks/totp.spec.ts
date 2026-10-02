import { describe, expect, it } from 'vitest';

import { codigoTotpValido, gerarCodigoTotp } from './totp';

// Vetores de teste do RFC 6238, apendice B, para HMAC-SHA1. O segredo do RFC e a string
// ASCII "12345678901234567890"; em Base32 (RFC 4648) ela e GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ.
const SEGREDO_RFC = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP do dev-offline', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('reproduz o vetor do RFC 6238 em t=%i', async (segundos, esperado) => {
    expect(await gerarCodigoTotp(SEGREDO_RFC, segundos * 1000)).toBe(esperado);
  });

  it('aceita o código da janela atual', async () => {
    const agora = Date.now();
    const codigo = await gerarCodigoTotp(SEGREDO_RFC, agora);
    expect(await codigoTotpValido(SEGREDO_RFC, codigo, agora)).toBe(true);
  });

  // Tolerância de uma janela para cada lado, para relógios levemente fora de sincronia.
  it.each([-30_000, 30_000])('aceita o código deslocado em %i ms', async (deslocamento) => {
    const agora = Date.now();
    const codigo = await gerarCodigoTotp(SEGREDO_RFC, agora + deslocamento);
    expect(await codigoTotpValido(SEGREDO_RFC, codigo, agora)).toBe(true);
  });

  it('recusa código de duas janelas atrás e formatos inválidos', async () => {
    const agora = Date.now();
    const antigo = await gerarCodigoTotp(SEGREDO_RFC, agora - 90_000);
    expect(await codigoTotpValido(SEGREDO_RFC, antigo, agora)).toBe(false);
    expect(await codigoTotpValido(SEGREDO_RFC, '12345', agora)).toBe(false);
    expect(await codigoTotpValido(SEGREDO_RFC, 'abcdef', agora)).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ChavePixIntencaoStore } from './chave-pix-intencao.store';

describe('ChavePixIntencaoStore', () => {
  let store: ChavePixIntencaoStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ChavePixIntencaoStore);
  });

  it('devolve a MESMA key para o mesmo tipo e valor (retry legitimo)', () => {
    const primeira = store.chave('EMAIL', 'financeiro@dynamis.com.br');
    const segunda = store.chave('EMAIL', 'financeiro@dynamis.com.br');

    expect(segunda).toBe(primeira);
  });

  it('gera key NOVA quando o valor muda', () => {
    const primeira = store.chave('EMAIL', 'financeiro@dynamis.com.br');
    const segunda = store.chave('EMAIL', 'outro@dynamis.com.br');

    expect(segunda).not.toBe(primeira);
  });

  it('gera key NOVA quando o tipo muda, mesmo com o valor identico', () => {
    const primeira = store.chave('CPF', '11122233396');
    const segunda = store.chave('TELEFONE', '11122233396');

    expect(segunda).not.toBe(primeira);
  });

  it('limpar() encerra a intencao: a proxima confirmacao nasce com key nova', () => {
    const primeira = store.chave('EMAIL', 'financeiro@dynamis.com.br');
    store.limpar();
    const segunda = store.chave('EMAIL', 'financeiro@dynamis.com.br');

    expect(segunda).not.toBe(primeira);
  });

  it('rascunho() reconstitui tipo e valor da intencao viva, sem expor a key', () => {
    const key = store.chave('CNPJ', '11222333000181');

    const rascunho = store.rascunho();
    expect(rascunho).toEqual({ tipo: 'CNPJ', valor: '11222333000181' });
    expect(JSON.stringify(rascunho)).not.toContain(key);
  });

  it('rascunho() e nulo sem intencao viva e volta a ser nulo apos limpar()', () => {
    expect(store.rascunho()).toBeNull();

    store.chave('EVP', 'chave-aleatoria');
    expect(store.rascunho()).not.toBeNull();

    store.limpar();
    expect(store.rascunho()).toBeNull();
  });

  it('nao persiste a intencao em localStorage nem sessionStorage', () => {
    store.chave('EMAIL', 'financeiro@dynamis.com.br');

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

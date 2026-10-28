import { describe, expect, it } from 'vitest';

import { AporteIntencaoStore } from './aporte-intencao.store';

const OPERACAO_A = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';
const OPERACAO_B = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c002';

// O store e um singleton de root que sobrevive a navegacao SPA (ida/volta do step-up destroi o
// componente da pagina de aporte): a mesma intencao {operacao, valor} SEMPRE devolve a mesma key
// ate ser encerrada — e o que impede a duplicacao de aporte no retry pos-rede/5xx.
describe('AporteIntencaoStore', () => {
  it('reusa a mesma key para a mesma operacao e o mesmo valor (retry legitimo)', () => {
    const store = new AporteIntencaoStore();

    const key1 = store.chave(OPERACAO_A, 25000);
    const key2 = store.chave(OPERACAO_A, 25000);

    expect(key2).toBe(key1);
  });

  it('valor diferente cria intencao nova com key nova', () => {
    const store = new AporteIntencaoStore();

    const key1 = store.chave(OPERACAO_A, 25000);
    const key2 = store.chave(OPERACAO_A, 20000);

    expect(key2).not.toBe(key1);
  });

  it('operacao diferente cria intencao nova com key nova, mesmo com o mesmo valor', () => {
    const store = new AporteIntencaoStore();

    const key1 = store.chave(OPERACAO_A, 25000);
    const key2 = store.chave(OPERACAO_B, 25000);

    expect(key2).not.toBe(key1);
  });

  it('limpar encerra a intencao: a proxima confirmacao nasce com key nova', () => {
    const store = new AporteIntencaoStore();

    const key1 = store.chave(OPERACAO_A, 25000);
    store.limpar();
    const key2 = store.chave(OPERACAO_A, 25000);

    expect(key2).not.toBe(key1);
  });
});

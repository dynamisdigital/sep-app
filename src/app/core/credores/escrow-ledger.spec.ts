import { describe, expect, it } from 'vitest';

import type { LancamentoEscrow, TipoLancamentoEscrow } from './credores-escrow.models';
import {
  LIMITE_POR_DEVEDOR,
  MOVIMENTO,
  adicionarDiasUteis,
  aplicarLancamento,
  calcularLimiteDevedor,
  calcularSaldo,
  ratear,
  ratearParcela,
  saldoVazio,
  validarAlocacao,
  validarLancamento,
} from './escrow-ledger';

let seq = 0;
function lanc(
  tipo: TipoLancamentoEscrow,
  valor: number,
  dataLancamento = '2026-10-01T10:00:00-03:00',
): LancamentoEscrow {
  seq += 1;
  return {
    id: `l-${seq}`,
    credorId: 'c1',
    tipo,
    valor,
    ...MOVIMENTO[tipo],
    operacaoId: null,
    parcela: null,
    descricao: tipo,
    dataLancamento,
  };
}

describe('escrow-ledger: saldo', () => {
  it('aporte entra como disponível e soma ao patrimônio', () => {
    const saldo = calcularSaldo([lanc('APORTE', 10000)]);
    expect(saldo).toEqual({
      disponivel: 10000,
      reservado: 0,
      emOperacao: 0,
      totalCustodiado: 10000,
      patrimonio: 10000,
    });
  });

  it('reserva, desembolso e retorno percorrem os estados na ordem', () => {
    const saldo = calcularSaldo([
      lanc('APORTE', 10000, '2026-10-01T10:00:00-03:00'),
      lanc('RESERVA', 6000, '2026-10-02T10:00:00-03:00'),
      lanc('DESEMBOLSO', 6000, '2026-10-03T10:00:00-03:00'),
      lanc('RETORNO_PRINCIPAL', 500, '2026-11-03T10:00:00-03:00'),
      lanc('RETORNO_JUROS', 144, '2026-11-03T10:00:01-03:00'),
    ]);
    expect(saldo.disponivel).toBe(4644);
    expect(saldo.reservado).toBe(0);
    expect(saldo.emOperacao).toBe(5500);
    expect(saldo.totalCustodiado).toBe(4644);
    expect(saldo.patrimonio).toBe(10144);
  });

  it('liberar a reserva devolve o valor ao disponível', () => {
    const saldo = calcularSaldo([
      lanc('APORTE', 3000, '2026-10-01T10:00:00-03:00'),
      lanc('RESERVA', 3000, '2026-10-02T10:00:00-03:00'),
      lanc('LIBERACAO_RESERVA', 3000, '2026-10-03T10:00:00-03:00'),
    ]);
    expect(saldo.disponivel).toBe(3000);
    expect(saldo.reservado).toBe(0);
  });

  it('saque e tarifa saem do disponível e do patrimônio', () => {
    const saldo = calcularSaldo([
      lanc('APORTE', 1000, '2026-10-01T10:00:00-03:00'),
      lanc('SAQUE', 400, '2026-10-02T10:00:00-03:00'),
      lanc('TARIFA', 10, '2026-10-03T10:00:00-03:00'),
    ]);
    expect(saldo.disponivel).toBe(590);
    expect(saldo.patrimonio).toBe(590);
  });

  it('ordena por data antes de aplicar, então a lista pode vir fora de ordem', () => {
    const saldo = calcularSaldo([
      lanc('RESERVA', 100, '2026-10-02T10:00:00-03:00'),
      lanc('APORTE', 100, '2026-10-01T10:00:00-03:00'),
    ]);
    expect(saldo.reservado).toBe(100);
  });

  it('não deixa nenhum estado ficar negativo', () => {
    expect(() => calcularSaldo([lanc('SAQUE', 1)])).toThrow('Saldo disponível insuficiente');
    expect(validarLancamento(saldoVazio(), lanc('DESEMBOLSO', 1))).toBe(
      'Saldo reservado insuficiente.',
    );
    expect(validarLancamento(saldoVazio(), lanc('RETORNO_PRINCIPAL', 1))).toBe(
      'Saldo em operação insuficiente.',
    );
  });

  it('recusa valor zero, negativo ou movimento diferente do previsto', () => {
    expect(validarLancamento(saldoVazio(), lanc('APORTE', 0))).toMatch(/maior que zero/);
    expect(validarLancamento(saldoVazio(), lanc('APORTE', -5))).toMatch(/maior que zero/);
    expect(validarLancamento(saldoVazio(), { ...lanc('APORTE', 5), para: 'RESERVADO' })).toMatch(
      /Movimento inválido/,
    );
  });

  it('não acumula erro de ponto flutuante em centavos', () => {
    let saldo = aplicarLancamento(saldoVazio(), lanc('APORTE', 0.3));
    saldo = aplicarLancamento(saldo, lanc('RETORNO_JUROS', 0.1));
    expect(saldo.disponivel).toBe(0.4);
    expect(saldo.patrimonio).toBe(0.4);
  });
});

describe('escrow-ledger: limite por devedor (art. 24)', () => {
  it('credor não qualificado tem R$ 15.000 por devedor', () => {
    const limite = calcularLimiteDevedor({
      devedorId: 'd1',
      categoria: 'NAO_QUALIFICADO',
      alocadoAoDevedor: 6000,
    });
    expect(limite).toMatchObject({ limite: LIMITE_POR_DEVEDOR, isento: false, disponivel: 9000 });
  });

  it('qualificado é isento e não tem teto', () => {
    const limite = calcularLimiteDevedor({
      devedorId: 'd1',
      categoria: 'QUALIFICADO',
      alocadoAoDevedor: 50000,
    });
    expect(limite.isento).toBe(true);
    expect(limite.disponivel).toBeNull();
  });

  it('o disponível nunca fica negativo', () => {
    const limite = calcularLimiteDevedor({
      devedorId: 'd1',
      categoria: 'NAO_QUALIFICADO',
      alocadoAoDevedor: 20000,
    });
    expect(limite.disponivel).toBe(0);
  });

  const base = {
    categoria: 'NAO_QUALIFICADO' as const,
    alocadoAoDevedor: 10000,
    valor: 5000,
    saldoDisponivel: 20000,
    cienciaRisco: true,
  };

  it('aceita alocação que fecha exatamente no limite', () => {
    expect(validarAlocacao(base)).toBeNull();
  });

  it('recusa quando passa do limite, mesmo por um centavo', () => {
    expect(validarAlocacao({ ...base, valor: 5000.01 })).toMatch(/limite por devedor/);
  });

  it('qualificado pode passar do limite', () => {
    expect(validarAlocacao({ ...base, categoria: 'QUALIFICADO', valor: 15000 })).toBeNull();
  });

  it('exige ciência de risco, saldo e valor positivo', () => {
    expect(validarAlocacao({ ...base, cienciaRisco: false })).toMatch(/ciência/);
    expect(validarAlocacao({ ...base, saldoDisponivel: 100 })).toMatch(/insuficiente/);
    expect(validarAlocacao({ ...base, valor: 0 })).toMatch(/maior que zero/);
  });
});

describe('escrow-ledger: rateio da parcela', () => {
  it('divide na proporção do que cada credor alocou', () => {
    expect(
      ratear(1000, [
        { credorId: 'a', valorAlocado: 3000 },
        { credorId: 'b', valorAlocado: 1000 },
      ]),
    ).toEqual([750, 250]);
  });

  it('a soma dos quinhões é sempre igual ao valor, mesmo com dízima', () => {
    const partes = [
      { credorId: 'a', valorAlocado: 1000 },
      { credorId: 'b', valorAlocado: 1000 },
      { credorId: 'c', valorAlocado: 1000 },
    ];
    const resultado = ratear(100, partes);
    expect(resultado.reduce((s, v) => s + Math.round(v * 100), 0)).toBe(10000);
    expect(resultado).toEqual([33.34, 33.33, 33.33]);
  });

  it('principal e juros fecham separadamente', () => {
    const quinhoes = ratearParcela({ principal: 100, juros: 10 }, [
      { credorId: 'a', valorAlocado: 1 },
      { credorId: 'b', valorAlocado: 1 },
      { credorId: 'c', valorAlocado: 1 },
    ]);
    const soma = (campo: 'principal' | 'juros' | 'total') =>
      Math.round(quinhoes.reduce((s, q) => s + q[campo], 0) * 100);
    expect(soma('principal')).toBe(10000);
    expect(soma('juros')).toBe(1000);
    expect(soma('total')).toBe(11000);
  });

  it('um credor único recebe tudo e lista vazia não quebra', () => {
    expect(ratear(250.55, [{ credorId: 'a', valorAlocado: 6000 }])).toEqual([250.55]);
    expect(ratear(100, [])).toEqual([]);
  });
});

describe('escrow-ledger: prazos em dias úteis', () => {
  it('pula o fim de semana', () => {
    // 2026-10-09 é sexta-feira.
    expect(adicionarDiasUteis('2026-10-09', 1)).toBe('2026-10-12');
    expect(adicionarDiasUteis('2026-10-09', 5)).toBe('2026-10-16');
  });

  it('a partir de um sábado conta a segunda como o primeiro dia útil', () => {
    expect(adicionarDiasUteis('2026-10-10', 1)).toBe('2026-10-12');
  });

  it('zero dia devolve a própria data', () => {
    expect(adicionarDiasUteis('2026-10-07', 0)).toBe('2026-10-07');
  });
});

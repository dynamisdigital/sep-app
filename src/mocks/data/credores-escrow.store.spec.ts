import { beforeEach, describe, expect, it } from 'vitest';

import { gerarCronograma } from '../../app/core/financeiro/calculo-financeiro';
import { TAXA_MENSAL_PADRAO } from '../../app/core/financeiro/politica-credito';
import {
  ID_CREDOR_AURORA,
  ID_CREDOR_BOREAL,
  ID_CREDOR_CARLOS,
  ID_CREDOR_HELENA,
  ID_CREDOR_MARINA,
  OPERACAO_BETA,
  OPORTUNIDADE_BETA,
  OPORTUNIDADE_ESTRELA,
  USUARIO_AURORA,
  USUARIO_HELENA,
  alocar,
  alterarCategoria,
  alterarStatusCredor,
  aprovarSaque,
  auditoriaDe,
  cancelarAlocacao,
  confirmarAporte,
  contaEscrowDe,
  credorDoUsuario,
  criarAporte,
  criarDestinatario,
  desembolsarOperacao,
  detalheCredor,
  disponivelLivre,
  encerrarSemFormar,
  extratoDe,
  limiteDe,
  listarAlocacoes,
  listarCredores,
  listarDestinatarios,
  listarOperacoesEscrow,
  listarOportunidadesTesouraria,
  listarSaquesPendentes,
  rejeitarSaque,
  repassarParcela,
  resetCredoresEscrowState,
  resumoTesouraria,
  saldoDe,
  solicitarSaque,
} from './credores-escrow.store';

const admin = { username: 'admin@empresa.com', role: 'ADMIN' };

// Resultado esperado de ok/falha sem depender do formato interno.
function valorDe<T>(r: { ok: boolean } & Record<string, unknown>): T {
  if (!r['ok']) throw new Error(`esperava sucesso: ${String(r['erro'])}`);
  return r['valor'] as T;
}

describe('credores-escrow.store: seed', () => {
  beforeEach(() => resetCredoresEscrowState());

  it('o saldo da Aurora fecha com o cronograma da operação Beta (8 parcelas pagas)', () => {
    const plano = gerarCronograma({
      principal: 6000,
      taxaMensal: TAXA_MENSAL_PADRAO,
      prazoMeses: 10,
      primeiroVencimento: '2025-10-25',
    });
    const pagas = plano.slice(0, 8);
    const principalPago = Math.round(pagas.reduce((s, p) => s + p.principal, 0) * 100) / 100;
    const jurosPagos = Math.round(pagas.reduce((s, p) => s + p.juros, 0) * 100) / 100;

    const saldo = saldoDe(ID_CREDOR_AURORA);
    expect(saldo.emOperacao).toBe(Math.round((6000 - principalPago) * 100) / 100);
    expect(saldo.reservado).toBe(0);
    expect(saldo.patrimonio).toBe(Math.round((30000 + jurosPagos) * 100) / 100);
  });

  it('Helena tem valor reservado para a Padaria Estrela e o resto disponível', () => {
    expect(saldoDe(ID_CREDOR_HELENA)).toMatchObject({ disponivel: 7375, reservado: 4625 });
  });

  it('credor sem lançamento tem saldo zerado', () => {
    expect(saldoDe(ID_CREDOR_BOREAL).patrimonio).toBe(0);
    expect(saldoDe(ID_CREDOR_MARINA).patrimonio).toBe(0);
  });

  it('o usuário de login resolve o credor; quem não tem credor não resolve', () => {
    expect(credorDoUsuario(USUARIO_AURORA)?.id).toBe(ID_CREDOR_AURORA);
    expect(credorDoUsuario(USUARIO_HELENA)?.tipoPessoa).toBe('PF');
    expect(credorDoUsuario('inexistente')).toBeUndefined();
  });

  it('nenhum estado de nenhum credor é negativo', () => {
    for (const c of listarCredores()) {
      expect(c.saldo.disponivel).toBeGreaterThanOrEqual(0);
      expect(c.saldo.reservado).toBeGreaterThanOrEqual(0);
      expect(c.saldo.emOperacao).toBeGreaterThanOrEqual(0);
    }
  });

  it('o extrato vem do mais recente para o mais antigo', () => {
    const datas = extratoDe(ID_CREDOR_AURORA).map((l) => l.dataLancamento);
    expect([...datas].sort().reverse()).toEqual(datas);
  });
});

describe('credores-escrow.store: aporte', () => {
  beforeEach(() => resetCredoresEscrowState());

  it('o aporte só entra no saldo depois do Pix confirmado', () => {
    const antes = saldoDe(ID_CREDOR_CARLOS).disponivel;
    const aporte = valorDe<{ id: string; status: string }>(criarAporte(ID_CREDOR_CARLOS, 5000));
    expect(aporte.status).toBe('AGUARDANDO_PIX');
    expect(saldoDe(ID_CREDOR_CARLOS).disponivel).toBe(antes);

    confirmarAporte(ID_CREDOR_CARLOS, aporte.id);
    expect(saldoDe(ID_CREDOR_CARLOS).disponivel).toBe(antes + 5000);
  });

  it('confirmar duas vezes não credita duas vezes', () => {
    const aporte = valorDe<{ id: string }>(criarAporte(ID_CREDOR_CARLOS, 1000));
    expect(confirmarAporte(ID_CREDOR_CARLOS, aporte.id).ok).toBe(true);
    const segunda = confirmarAporte(ID_CREDOR_CARLOS, aporte.id);
    expect(segunda).toMatchObject({ ok: false, status: 409 });
    expect(saldoDe(ID_CREDOR_CARLOS).disponivel).toBe(81000);
  });

  it('recusa credor inativo, valor inválido e credor inexistente', () => {
    expect(criarAporte(ID_CREDOR_MARINA, 100)).toMatchObject({ ok: false, status: 422 });
    expect(criarAporte(ID_CREDOR_CARLOS, 0)).toMatchObject({ ok: false, status: 422 });
    expect(criarAporte('nao-existe', 100)).toMatchObject({ ok: false, status: 404 });
  });

  it('um aporte de outro credor não pode ser confirmado por este', () => {
    const aporte = valorDe<{ id: string }>(criarAporte(ID_CREDOR_CARLOS, 100));
    expect(confirmarAporte(ID_CREDOR_HELENA, aporte.id)).toMatchObject({ ok: false, status: 404 });
  });
});

describe('credores-escrow.store: alocação', () => {
  beforeEach(() => resetCredoresEscrowState());

  const pedido = (valor: number, cienciaRisco = true) => ({
    oportunidadeId: OPORTUNIDADE_ESTRELA,
    valor,
    cienciaRisco,
  });

  it('a oportunidade da Padaria já está toda reservada pela Helena', () => {
    expect(alocar(ID_CREDOR_CARLOS, pedido(100))).toMatchObject({ ok: false, status: 422 });
  });

  it('cancelar a reserva devolve o valor ao disponível e libera a oportunidade', () => {
    const [reserva] = listarAlocacoes(ID_CREDOR_HELENA);
    expect(cancelarAlocacao(ID_CREDOR_HELENA, reserva.id).ok).toBe(true);
    expect(saldoDe(ID_CREDOR_HELENA)).toMatchObject({ disponivel: 12000, reservado: 0 });
    expect(alocar(ID_CREDOR_CARLOS, pedido(1000)).ok).toBe(true);
  });

  it('exige ciência de risco e saldo suficiente', () => {
    const [reserva] = listarAlocacoes(ID_CREDOR_HELENA);
    cancelarAlocacao(ID_CREDOR_HELENA, reserva.id);
    expect(alocar(ID_CREDOR_HELENA, pedido(1000, false))).toMatchObject({ ok: false, status: 422 });
    const cinco = alocar(ID_CREDOR_AURORA, pedido(2000));
    expect(cinco.ok).toBe(true);
  });

  it('credor em análise não aloca', () => {
    expect(alocar(ID_CREDOR_MARINA, pedido(100))).toMatchObject({ ok: false, status: 422 });
  });

  it('não permite reservar valor que já está em saque pendente', () => {
    const [reserva] = listarAlocacoes(ID_CREDOR_HELENA);
    cancelarAlocacao(ID_CREDOR_HELENA, reserva.id);
    const destino = listarDestinatarios(ID_CREDOR_HELENA)[0];
    expect(solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 11000 }).ok).toBe(
      true,
    );
    expect(alocar(ID_CREDOR_HELENA, pedido(2000))).toMatchObject({ ok: false, status: 422 });
  });

  it('só cancela enquanto a operação não foi formada', () => {
    const aurora = listarAlocacoes(ID_CREDOR_AURORA)[0];
    expect(cancelarAlocacao(ID_CREDOR_AURORA, aurora.id)).toMatchObject({ ok: false, status: 422 });
  });

  it('o limite por devedor: não qualificada vê o teto, qualificado é isento', () => {
    expect(valorDe(limiteDe(ID_CREDOR_HELENA, OPORTUNIDADE_ESTRELA))).toMatchObject({
      limite: 15000,
      isento: false,
      alocado: 4625,
      disponivel: 10375,
    });
    expect(valorDe(limiteDe(ID_CREDOR_CARLOS, OPORTUNIDADE_ESTRELA))).toMatchObject({
      isento: true,
      disponivel: null,
    });
    expect(limiteDe(ID_CREDOR_HELENA, 'nao-existe')).toMatchObject({ ok: false, status: 404 });
  });
});

describe('credores-escrow.store: formação, devolução e repasse', () => {
  beforeEach(() => resetCredoresEscrowState());

  /** Helena (R$ 2.000) + Carlos (R$ 2.625) cobrem os R$ 4.625 da Padaria Estrela. */
  function cobrirPadaria(): void {
    const [reserva] = listarAlocacoes(ID_CREDOR_HELENA);
    cancelarAlocacao(ID_CREDOR_HELENA, reserva.id);
    const base = { oportunidadeId: OPORTUNIDADE_ESTRELA, cienciaRisco: true };
    expect(alocar(ID_CREDOR_HELENA, { ...base, valor: 2000 }).ok).toBe(true);
    expect(alocar(ID_CREDOR_CARLOS, { ...base, valor: 2625 }).ok).toBe(true);
  }

  it('desembolso transforma reserva em principal em operação para todos', () => {
    cobrirPadaria();
    const r = desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'op-estrela');
    expect(valorDe<{ credores: number; total: number }>(r)).toMatchObject({
      credores: 2,
      total: 4625,
    });
    expect(saldoDe(ID_CREDOR_HELENA)).toMatchObject({ reservado: 0, emOperacao: 2000 });
    expect(saldoDe(ID_CREDOR_CARLOS)).toMatchObject({ reservado: 0, emOperacao: 2625 });
  });

  it('não desembolsa quando as reservas não cobrem a oportunidade inteira', () => {
    // Só a Helena com R$ 4.625 cobre; cancelando, não sobra nada reservado.
    const [reserva] = listarAlocacoes(ID_CREDOR_HELENA);
    cancelarAlocacao(ID_CREDOR_HELENA, reserva.id);
    expect(desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'x')).toMatchObject({
      ok: false,
      status: 422,
    });
    alocar(ID_CREDOR_HELENA, {
      oportunidadeId: OPORTUNIDADE_ESTRELA,
      valor: 1000,
      cienciaRisco: true,
    });
    expect(desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'x')).toMatchObject({
      ok: false,
      status: 422,
    });
  });

  it('operação que não se forma devolve a reserva e informa o prazo de 1 dia útil', () => {
    const r = valorDe<{ devolvidas: number; devolverAte: string }>(
      encerrarSemFormar(OPORTUNIDADE_ESTRELA, 'Tomador desistiu'),
    );
    expect(r.devolvidas).toBe(1);
    expect(r.devolverAte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(saldoDe(ID_CREDOR_HELENA)).toMatchObject({ disponivel: 12000, reservado: 0 });
    expect(listarAlocacoes(ID_CREDOR_HELENA)[0].status).toBe('LIBERADA');
  });

  it('a parcela é rateada e a soma dos repasses fecha com a parcela, ao centavo', () => {
    cobrirPadaria();
    desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'op-estrela');
    const antesH = saldoDe(ID_CREDOR_HELENA).disponivel;
    const antesC = saldoDe(ID_CREDOR_CARLOS).disponivel;

    const r = valorDe<{ quinhoes: { credorId: string; principal: number; juros: number }[] }>(
      repassarParcela('op-estrela', 1, { principal: 462.5, juros: 87.88 }),
    );
    const soma = (campo: 'principal' | 'juros') =>
      Math.round(r.quinhoes.reduce((s, q) => s + q[campo], 0) * 100);
    expect(soma('principal')).toBe(46250);
    expect(soma('juros')).toBe(8788);

    const ganhoH = Math.round((saldoDe(ID_CREDOR_HELENA).disponivel - antesH) * 100);
    const ganhoC = Math.round((saldoDe(ID_CREDOR_CARLOS).disponivel - antesC) * 100);
    expect(ganhoH + ganhoC).toBe(46250 + 8788);
    // O principal devolvido sai do "em operação".
    expect(saldoDe(ID_CREDOR_HELENA).emOperacao + saldoDe(ID_CREDOR_CARLOS).emOperacao).toBe(
      4625 - 462.5,
    );
  });

  it('credor com duas alocações na mesma operação recebe um único quinhão', () => {
    const [reserva] = listarAlocacoes(ID_CREDOR_HELENA);
    cancelarAlocacao(ID_CREDOR_HELENA, reserva.id);
    const base = { oportunidadeId: OPORTUNIDADE_ESTRELA, cienciaRisco: true };
    alocar(ID_CREDOR_HELENA, { ...base, valor: 1000 });
    alocar(ID_CREDOR_HELENA, { ...base, valor: 3625 });
    desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'op-estrela');
    const r = valorDe<{ quinhoes: { credorId: string; principal: number }[] }>(
      repassarParcela('op-estrela', 1, { principal: 462.5, juros: 87.88 }),
    );
    expect(r.quinhoes).toHaveLength(1);
    expect(r.quinhoes[0]).toMatchObject({ credorId: ID_CREDOR_HELENA, principal: 462.5 });
    const retornos = extratoDe(ID_CREDOR_HELENA).filter((l) => l.parcela === 1);
    expect(retornos).toHaveLength(2); // principal + juros
  });

  it('a mesma parcela não é repassada duas vezes', () => {
    cobrirPadaria();
    desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'op-estrela');
    expect(repassarParcela('op-estrela', 1, { principal: 100, juros: 10 }).ok).toBe(true);
    expect(repassarParcela('op-estrela', 1, { principal: 100, juros: 10 })).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it('repasse da operação Beta já paga (parcelas 1 a 8) é recusado; a 9ª passa', () => {
    expect(repassarParcela(OPERACAO_BETA, 8, { principal: 500, juros: 10 })).toMatchObject({
      ok: false,
      status: 409,
    });
    const nona = repassarParcela(OPERACAO_BETA, 9, { principal: 500, juros: 10 });
    expect(nona.ok).toBe(true);
  });

  it('operação desconhecida e principal acima do que está em operação', () => {
    expect(repassarParcela('nao-existe', 1, { principal: 1, juros: 0 })).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(repassarParcela(OPERACAO_BETA, 10, { principal: 99999, juros: 0 })).toMatchObject({
      ok: false,
      status: 422,
    });
  });

  it('a oportunidade Beta já financiada não aceita nova alocação', () => {
    expect(
      alocar(ID_CREDOR_CARLOS, {
        oportunidadeId: OPORTUNIDADE_BETA,
        valor: 100,
        cienciaRisco: true,
      }),
    ).toMatchObject({ ok: false, status: 422 });
  });
});

describe('credores-escrow.store: destinatário e saque', () => {
  beforeEach(() => resetCredoresEscrowState());

  it('o saque fica pendente, compromete o disponível e só sai da escrow quando aprovado', () => {
    const destino = listarDestinatarios(ID_CREDOR_HELENA)[0];
    const antes = saldoDe(ID_CREDOR_HELENA).disponivel;
    const saque = valorDe<{ id: string }>(
      solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 1000 }),
    );
    expect(saldoDe(ID_CREDOR_HELENA).disponivel).toBe(antes);
    expect(disponivelLivre(ID_CREDOR_HELENA)).toBe(antes - 1000);
    expect(listarSaquesPendentes()).toHaveLength(1);

    expect(aprovarSaque(saque.id).ok).toBe(true);
    expect(saldoDe(ID_CREDOR_HELENA).disponivel).toBe(antes - 1000);
    expect(listarSaquesPendentes()).toHaveLength(0);
    expect(aprovarSaque(saque.id)).toMatchObject({ ok: false, status: 409 });
  });

  it('rejeitar libera o valor sem sair da escrow', () => {
    const destino = listarDestinatarios(ID_CREDOR_HELENA)[0];
    const antes = saldoDe(ID_CREDOR_HELENA).disponivel;
    const saque = valorDe<{ id: string }>(
      solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 1000 }),
    );
    expect(rejeitarSaque(saque.id).ok).toBe(true);
    expect(saldoDe(ID_CREDOR_HELENA).disponivel).toBe(antes);
    expect(disponivelLivre(ID_CREDOR_HELENA)).toBe(antes);
  });

  it('recusa saque acima do livre, para conta não cadastrada ou de outro credor', () => {
    const destino = listarDestinatarios(ID_CREDOR_HELENA)[0];
    expect(
      solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 8000 }),
    ).toMatchObject({ ok: false, status: 422 });
    expect(
      solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: 'nao-existe', valor: 10 }),
    ).toMatchObject({ ok: false, status: 404 });
    const deAurora = listarDestinatarios(ID_CREDOR_AURORA)[0];
    expect(
      solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: deAurora.id, valor: 10 }),
    ).toMatchObject({ ok: false, status: 404 });
  });

  it('dois saques pendentes não passam do disponível somados', () => {
    const destino = listarDestinatarios(ID_CREDOR_HELENA)[0];
    expect(solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 5000 }).ok).toBe(
      true,
    );
    expect(
      solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 3000 }),
    ).toMatchObject({ ok: false, status: 422 });
  });

  it('cadastra destinatário com conta mascarada e recusa repetido ou incompleto', () => {
    const pedido = {
      banco: 'Banco do Brasil (001)',
      agencia: '3210',
      conta: '123456-7',
      tipoConta: 'CORRENTE' as const,
    };
    const criado = valorDe<{ contaMascarada: string; mesmaTitularidade: boolean }>(
      criarDestinatario(ID_CREDOR_CARLOS, pedido),
    );
    expect(criado.contaMascarada).toBe('****567');
    expect(criado.mesmaTitularidade).toBe(true);
    expect(criarDestinatario(ID_CREDOR_CARLOS, pedido)).toMatchObject({ ok: false, status: 409 });
    expect(criarDestinatario(ID_CREDOR_CARLOS, { ...pedido, agencia: ' ' })).toMatchObject({
      ok: false,
      status: 422,
    });
  });
});

describe('credores-escrow.store: gestão do credor', () => {
  beforeEach(() => resetCredoresEscrowState());

  it('aprovar um cadastro em análise abre a conta vinculada e grava auditoria', () => {
    expect(contaEscrowDe(ID_CREDOR_MARINA)?.agencia).toBe('');
    const r = alterarStatusCredor(ID_CREDOR_MARINA, 'ATIVO', 'Documentos conferidos', admin);
    expect(valorDe<{ status: string; perfilRisco: string }>(r)).toMatchObject({
      status: 'ATIVO',
      perfilRisco: 'CONSERVADOR',
    });
    expect(contaEscrowDe(ID_CREDOR_MARINA)?.agencia).toBe('0001');
    expect(auditoriaDe(ID_CREDOR_MARINA)[0]).toMatchObject({
      tipo: 'APROVACAO',
      autor: 'admin@empresa.com',
    });
    expect(criarAporte(ID_CREDOR_MARINA, 500).ok).toBe(true);
  });

  it('reprovar só vale para cadastro em análise; reprovado não volta a ativo', () => {
    expect(alterarStatusCredor(ID_CREDOR_HELENA, 'REPROVADO', 'x', admin)).toMatchObject({
      ok: false,
      status: 422,
    });
    expect(alterarStatusCredor(ID_CREDOR_BOREAL, 'ATIVO', 'x', admin)).toMatchObject({
      ok: false,
      status: 422,
    });
    expect(alterarStatusCredor(ID_CREDOR_MARINA, 'REPROVADO', 'PLD', admin).ok).toBe(true);
  });

  it('suspender bloqueia aporte, alocação e saque; exige motivo; repetir é conflito', () => {
    expect(alterarStatusCredor(ID_CREDOR_HELENA, 'SUSPENSO', '  ', admin)).toMatchObject({
      ok: false,
      status: 422,
    });
    expect(alterarStatusCredor(ID_CREDOR_HELENA, 'SUSPENSO', 'Suspeita de fraude', admin).ok).toBe(
      true,
    );
    expect(alterarStatusCredor(ID_CREDOR_HELENA, 'SUSPENSO', 'de novo', admin)).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(criarAporte(ID_CREDOR_HELENA, 100)).toMatchObject({ ok: false, status: 422 });
    const destino = listarDestinatarios(ID_CREDOR_HELENA)[0];
    expect(
      solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 10 }),
    ).toMatchObject({ ok: false, status: 422 });
    expect(detalheCredor(ID_CREDOR_HELENA)?.motivoStatus).toBe('Suspeita de fraude');
  });

  it('investidor qualificado exige o termo assinado', () => {
    expect(alterarCategoria(ID_CREDOR_HELENA, 'QUALIFICADO', admin)).toMatchObject({
      ok: false,
      status: 422,
    });
    expect(alterarCategoria(ID_CREDOR_CARLOS, 'NAO_QUALIFICADO', admin).ok).toBe(true);
    // Voltar a qualificado é possível porque o termo já existe.
    expect(alterarCategoria(ID_CREDOR_CARLOS, 'QUALIFICADO', admin).ok).toBe(true);
  });

  it('a listagem filtra por status', () => {
    expect(listarCredores('EM_ANALISE').map((c) => c.id)).toEqual([ID_CREDOR_MARINA]);
    expect(listarCredores()).toHaveLength(5);
  });
});

describe('credores-escrow.store: tesouraria', () => {
  beforeEach(() => resetCredoresEscrowState());

  it('os totais são a soma dos saldos de cada credor', () => {
    const credores = listarCredores();
    const soma = (campo: 'disponivel' | 'reservado' | 'emOperacao') =>
      Math.round(credores.reduce((s, c) => s + c.saldo[campo], 0) * 100) / 100;
    const resumo = resumoTesouraria();
    expect(resumo.totalDisponivel).toBe(soma('disponivel'));
    expect(resumo.totalReservado).toBe(soma('reservado'));
    expect(resumo.totalEmOperacao).toBe(soma('emOperacao'));
    expect(resumo.totalCustodiado).toBe(
      Math.round((resumo.totalDisponivel + resumo.totalReservado) * 100) / 100,
    );
    expect(resumo.credoresAtivos).toBe(3);
    expect(resumo.aportesPendentes).toBe(1);
  });

  it('os contadores acompanham aporte confirmado e saque pendente', () => {
    const aporte = valorDe<{ id: string }>(criarAporte(ID_CREDOR_CARLOS, 2500));
    expect(resumoTesouraria().aportesPendentes).toBe(2);
    confirmarAporte(ID_CREDOR_CARLOS, aporte.id);
    const resumo = resumoTesouraria();
    expect(resumo.aportesPendentes).toBe(1);
    expect(resumo.aportesHoje).toBe(2500);

    const destino = listarDestinatarios(ID_CREDOR_HELENA)[0];
    solicitarSaque(ID_CREDOR_HELENA, { destinatarioId: destino.id, valor: 100 });
    expect(resumoTesouraria().saquesPendentes).toBe(1);
  });
});

describe('credores-escrow.store: limite pelo saldo devedor', () => {
  beforeEach(() => resetCredoresEscrowState());

  it('cada parcela paga reabre espaço no limite do credor com o mesmo devedor', () => {
    // Helena ja tem a Padaria integralmente reservada; o desembolso a transforma em operacao.
    expect(
      valorDe<{ alocado: number }>(limiteDe(ID_CREDOR_HELENA, OPORTUNIDADE_ESTRELA)),
    ).toMatchObject({
      alocado: 4625,
    });
    expect(desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'op-limite').ok).toBe(true);
    // Desembolsado e sem retorno: o saldo devedor e o principal inteiro.
    expect(valorDe(limiteDe(ID_CREDOR_HELENA, OPORTUNIDADE_ESTRELA))).toMatchObject({
      alocado: 4625,
      disponivel: 10375,
    });
    expect(repassarParcela('op-limite', 1, { principal: 1000, juros: 50 }).ok).toBe(true);
    // Voltaram R$ 1.000 de principal: o saldo devedor cai para R$ 3.625.
    expect(valorDe(limiteDe(ID_CREDOR_HELENA, OPORTUNIDADE_ESTRELA))).toMatchObject({
      alocado: 3625,
      disponivel: 11375,
    });
  });

  it('o limite vale por par credor x devedor: outro devedor abre um novo limite', () => {
    expect(valorDe(limiteDe(ID_CREDOR_HELENA, OPORTUNIDADE_BETA))).toMatchObject({
      limite: 15000,
      alocado: 0,
      disponivel: 15000,
    });
  });
});

describe('credores-escrow.store: formação e repasse (tesouraria)', () => {
  beforeEach(() => resetCredoresEscrowState());

  it('a operação Beta já formada aparece com 8 de 10 parcelas repassadas e a 9ª como próxima', () => {
    const beta = listarOperacoesEscrow().find((o) => o.operacaoId === OPERACAO_BETA);

    expect(beta).toBeDefined();
    expect(beta?.parcelasTotal).toBe(10);
    expect(beta?.parcelasRepassadas).toBe(8);
    expect(beta?.credores).toBe(1);
    expect(beta?.proximaParcela?.numero).toBe(9);
    // O saldo em operação é o principal que ainda falta devolver ao credor.
    expect(beta?.saldoEmOperacao).toBe(saldoDe(ID_CREDOR_AURORA).emOperacao);
  });

  it('repassar a próxima parcela avança o andamento e credita o disponível do credor', () => {
    const antes = saldoDe(ID_CREDOR_AURORA);
    const beta = listarOperacoesEscrow().find((o) => o.operacaoId === OPERACAO_BETA);
    const proxima = beta?.proximaParcela;
    if (!proxima) throw new Error('esperava uma próxima parcela');

    valorDe(repassarParcela(OPERACAO_BETA, proxima.numero, proxima));

    const depois = listarOperacoesEscrow().find((o) => o.operacaoId === OPERACAO_BETA);
    expect(depois?.parcelasRepassadas).toBe(9);
    expect(depois?.proximaParcela?.numero).toBe(10);
    expect(saldoDe(ID_CREDOR_AURORA).disponivel).toBeCloseTo(antes.disponivel + proxima.total, 2);
    expect(saldoDe(ID_CREDOR_AURORA).emOperacao).toBeCloseTo(
      antes.emOperacao - proxima.principal,
      2,
    );
  });

  it('ao repassar a última parcela a operação é liquidada e não há mais próxima', () => {
    for (let i = 0; i < 2; i += 1) {
      const proxima = listarOperacoesEscrow().find(
        (o) => o.operacaoId === OPERACAO_BETA,
      )?.proximaParcela;
      if (!proxima) throw new Error('esperava uma próxima parcela');
      valorDe(repassarParcela(OPERACAO_BETA, proxima.numero, proxima));
    }

    const beta = listarOperacoesEscrow().find((o) => o.operacaoId === OPERACAO_BETA);
    expect(beta?.proximaParcela).toBeNull();
    expect(beta?.parcelasRepassadas).toBe(10);
    expect(saldoDe(ID_CREDOR_AURORA).emOperacao).toBe(0);
  });

  it('a oportunidade da Estrela está pronta quando as reservas cobrem o valor integral', () => {
    const estrela = () =>
      listarOportunidadesTesouraria().find((o) => o.id === OPORTUNIDADE_ESTRELA);

    expect(estrela()).toMatchObject({ disponivel: true, reservas: 1, pronta: true, faltante: 0 });

    valorDe(cancelarAlocacao(ID_CREDOR_HELENA, listarAlocacoes(ID_CREDOR_HELENA)[0]?.id ?? ''));

    expect(estrela()).toMatchObject({ reservas: 0, pronta: false, faltante: 4625 });
  });

  it('desembolsar a Estrela cria a operação e tira a oportunidade da lista de abertas', () => {
    valorDe(desembolsarOperacao(OPORTUNIDADE_ESTRELA, 'op-estrela'));

    const operacao = listarOperacoesEscrow().find((o) => o.operacaoId === 'op-estrela');
    expect(operacao).toMatchObject({
      devedorNome: 'Padaria Estrela ME',
      principal: 4625,
      parcelasRepassadas: 0,
      credores: 1,
      saldoEmOperacao: 4625,
    });
    expect(operacao?.proximaParcela?.numero).toBe(1);
    expect(
      listarOportunidadesTesouraria().find((o) => o.id === OPORTUNIDADE_ESTRELA),
    ).toMatchObject({ disponivel: false, pronta: false });
  });
});

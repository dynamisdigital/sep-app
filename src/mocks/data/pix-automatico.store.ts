import type { AgendaPagamentoResponse } from '../../app/core/api/api.models';
import { centavos } from '../../app/core/financeiro/calculo-financeiro';
import type {
  AutorizacaoPixResponse,
  CriarAutorizacaoPixRequest,
  DebitoPixResponse,
  ParametrosPixAutomatico,
  PagadorPix,
  ResumoPixAutomatico,
} from '../../app/core/pix-automatico/pix-automatico.models';

// Dados ficticios do Pix Automatico. As regras abaixo sao as que o backend precisa impor; o mock as
// espelha para o front mostrar a recusa certa. O banco do tomador e quem aceita a recorrencia de verdade.

export interface ErroPix {
  erro: string;
  status: 400 | 403 | 404 | 409 | 422;
}

/** Mesma data de referencia da carteira do mock: dela saem "notificado", "agendado" e "atrasado". */
export const HOJE_DO_MOCK = '2026-05-30';

const PARAMETROS_INICIAIS: ParametrosPixAutomatico = {
  habilitado: true,
  antecedenciaNotificacaoDias: 5,
  maxTentativas: 3,
  valorMaximoPorDebito: 15_000,
};

let parametros: ParametrosPixAutomatico = { ...PARAMETROS_INICIAIS };

const PAGADOR_ATIVO: PagadorPix = {
  nome: 'Padaria Estrela do Sul Ltda',
  documento: '12345678000190',
  ispb: '60746948',
  banco: 'Banco Bradesco S.A.',
  agencia: '1234',
  conta: '567890',
  tipoConta: 'CORRENTE',
};

let sequencia = 3;
let autorizacoes: AutorizacaoPixResponse[] = [];

function mascararDocumento(documento: string): string {
  const d = documento.replace(/\D/g, '');
  return d.length === 11
    ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
    : `**.${d.slice(2, 5)}.***/****-**`;
}

function mascararConta(conta: string): string {
  const d = conta.replace(/\D/g, '');
  return `${'*'.repeat(Math.max(0, d.length - 2))}${d.slice(-2)}`;
}

function montar(
  id: string,
  agenda: Pick<AgendaPagamentoResponse, 'contratoId' | 'contratoCurto' | 'produto' | 'parcelas'>,
  pagador: PagadorPix,
  campos: Partial<AutorizacaoPixResponse>,
): AutorizacaoPixResponse {
  const abertas = agenda.parcelas.filter((p) => p.status !== 'PAGA');
  const maior = Math.max(0, ...abertas.map((p) => p.total));
  const base = abertas[0]?.dataVencimento ?? agenda.parcelas[0]?.dataVencimento ?? HOJE_DO_MOCK;
  return {
    id,
    contratoId: agenda.contratoId,
    contratoCurto: agenda.contratoCurto ?? agenda.contratoId.slice(-8),
    produto: agenda.produto ?? '—',
    status: 'PENDENTE_PAGADOR',
    pagador: {
      nome: pagador.nome,
      documentoMascarado: mascararDocumento(pagador.documento),
      ispb: pagador.ispb,
      banco: pagador.banco,
      agencia: pagador.agencia,
      contaMascarada: mascararConta(pagador.conta),
      tipoConta: pagador.tipoConta,
    },
    idRecorrencia: null,
    diaDebito: Number(base.slice(8, 10)),
    // Margem de 10% sobre a maior parcela, em reais inteiros: o limite que o tomador autoriza por cobranca.
    valorMaximo: Math.min(Math.ceil(maior * 1.1), parametros.valorMaximoPorDebito),
    criadaEm: HOJE_DO_MOCK,
    ativadaEm: null,
    revogadaEm: null,
    motivo: null,
    ...campos,
  };
}

/** Semeia as autorizacoes de demonstracao a partir das agendas da carteira. */
export function semearPix(
  agendaDe: (contratoId: string) => AgendaPagamentoResponse | undefined,
  ids: { ativa: string; pendente: string },
): void {
  autorizacoes = [];
  parametros = { ...PARAMETROS_INICIAIS };
  const ativa = agendaDe(ids.ativa);
  if (ativa) {
    autorizacoes.push(
      montar('b1000000-0000-4000-8000-000000000001', ativa, PAGADOR_ATIVO, {
        status: 'ATIVA',
        idRecorrencia: 'RR2026051200000001',
        criadaEm: '2026-03-02',
        ativadaEm: '2026-03-03',
      }),
    );
  }
  const pendente = agendaDe(ids.pendente);
  if (pendente) {
    autorizacoes.push(
      montar(
        'b1000000-0000-4000-8000-000000000002',
        pendente,
        {
          ...PAGADOR_ATIVO,
          nome: 'Oficina Rocha & Filhos',
          documento: '98765432000110',
          conta: '112233',
        },
        { criadaEm: '2026-05-28' },
      ),
    );
  }
  sequencia = 3;
}

export function consultarParametros(): ParametrosPixAutomatico {
  return { ...parametros };
}

export function atualizarParametros(
  mudanca: Partial<ParametrosPixAutomatico>,
): ParametrosPixAutomatico | ErroPix {
  const proximo = { ...parametros, ...mudanca };
  if (proximo.antecedenciaNotificacaoDias < 2 || proximo.antecedenciaNotificacaoDias > 10) {
    return {
      erro: 'A notificacao ao pagador deve ser feita de 2 a 10 dias antes do vencimento',
      status: 422,
    };
  }
  if (proximo.maxTentativas < 1 || proximo.maxTentativas > 3) {
    return { erro: 'O numero de tentativas deve ficar entre 1 e 3', status: 422 };
  }
  if (proximo.valorMaximoPorDebito <= 0 || proximo.valorMaximoPorDebito > 15_000) {
    return {
      erro: 'O valor maximo por debito nao pode passar do teto do regimento (R$ 15.000)',
      status: 422,
    };
  }
  parametros = proximo;
  return { ...parametros };
}

export function listarAutorizacoes(): AutorizacaoPixResponse[] {
  return autorizacoes.map((a) => ({ ...a }));
}

export function consultarAutorizacao(id: string): AutorizacaoPixResponse | undefined {
  return autorizacoes.find((a) => a.id === id);
}

export function criarAutorizacao(
  agenda: AgendaPagamentoResponse | undefined,
  body: CriarAutorizacaoPixRequest,
): { autorizacao: AutorizacaoPixResponse } | ErroPix {
  if (!parametros.habilitado) {
    return { erro: 'O Pix Automatico esta desabilitado pela administracao', status: 409 };
  }
  if (!agenda) return { erro: 'Contrato nao encontrado', status: 404 };
  if (!body.consentimento) {
    return { erro: 'E preciso registrar que o tomador foi informado e consentiu', status: 400 };
  }
  const p = body.pagador;
  const documento = (p?.documento ?? '').replace(/\D/g, '');
  if (!p?.nome?.trim() || ![11, 14].includes(documento.length)) {
    return { erro: 'Informe o nome e um CPF ou CNPJ valido do pagador', status: 400 };
  }
  if (!/^\d{8}$/.test(p.ispb ?? '') || !p.agencia?.trim() || !(p.conta ?? '').replace(/\D/g, '')) {
    return { erro: 'Informe o ISPB (8 digitos), a agencia e a conta do pagador', status: 400 };
  }
  const aberta = autorizacoes.find(
    (a) =>
      a.contratoId === agenda.contratoId &&
      (a.status === 'ATIVA' || a.status === 'PENDENTE_PAGADOR'),
  );
  if (aberta) return { erro: 'Este contrato ja tem uma autorizacao em andamento', status: 409 };
  const abertas = agenda.parcelas.filter((x) => x.status !== 'PAGA');
  if (!abertas.length) return { erro: 'O contrato nao tem parcelas em aberto', status: 422 };
  const maior = Math.max(...abertas.map((x) => x.total));
  if (maior > parametros.valorMaximoPorDebito) {
    return { erro: 'Ha parcela acima do valor maximo por debito', status: 422 };
  }
  sequencia += 1;
  const autorizacao = montar(
    `b1000000-0000-4000-8000-${String(sequencia).padStart(12, '0')}`,
    agenda,
    p,
    {},
  );
  autorizacoes.push(autorizacao);
  return { autorizacao: { ...autorizacao } };
}

export function simularAceite(id: string, aceitou: boolean): AutorizacaoPixResponse | ErroPix {
  const a = consultarAutorizacao(id);
  if (!a) return { erro: 'Autorizacao nao encontrada', status: 404 };
  if (a.status !== 'PENDENTE_PAGADOR') {
    return { erro: 'So uma autorizacao pendente pode receber o aceite', status: 409 };
  }
  if (aceitou) {
    a.status = 'ATIVA';
    a.ativadaEm = HOJE_DO_MOCK;
    a.idRecorrencia = `RR${HOJE_DO_MOCK.replace(/-/g, '')}${String(sequencia).padStart(8, '0')}`;
  } else {
    a.status = 'REJEITADA';
    a.motivo = 'O pagador recusou a recorrencia no aplicativo do banco';
  }
  return { ...a };
}

export function revogar(id: string, motivo: string): AutorizacaoPixResponse | ErroPix {
  const a = consultarAutorizacao(id);
  if (!a) return { erro: 'Autorizacao nao encontrada', status: 404 };
  if (!motivo?.trim()) return { erro: 'Informe o motivo da revogacao', status: 400 };
  if (a.status !== 'ATIVA' && a.status !== 'PENDENTE_PAGADOR') {
    return { erro: 'A autorizacao ja foi encerrada', status: 409 };
  }
  a.status = 'REVOGADA';
  a.revogadaEm = HOJE_DO_MOCK;
  a.motivo = motivo.trim();
  return { ...a };
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Cobrancas de uma autorizacao, derivadas das parcelas do contrato: paga depois do aceite = liquidada;
 * em atraso = falhou; dentro da janela de aviso = notificada; alem dela = agendada. Revogada ou pendente
 * nao gera cobranca nova (as ja liquidadas ficam no historico).
 */
export function debitosDe(
  a: AutorizacaoPixResponse,
  agenda: AgendaPagamentoResponse,
): DebitoPixResponse[] {
  const antecedencia = parametros.antecedenciaNotificacaoDias;
  const ativadaEm = a.ativadaEm;
  if (!ativadaEm) return [];
  const saida: DebitoPixResponse[] = [];
  for (const p of agenda.parcelas) {
    const parcela = `${p.numero}/${agenda.numeroParcelas}`;
    const base = { parcela, vencimento: p.dataVencimento, valor: p.total };
    if (p.status === 'PAGA') {
      if (p.dataPagamento && p.dataPagamento >= ativadaEm) {
        saida.push({
          ...base,
          status: 'LIQUIDADO',
          notificadoEm: somarDias(p.dataVencimento, -antecedencia),
          tentativas: 1,
          motivo: null,
        });
      }
      continue;
    }
    if (a.status === 'REVOGADA') {
      if (a.revogadaEm && p.dataVencimento > a.revogadaEm) {
        saida.push({
          ...base,
          status: 'CANCELADO',
          notificadoEm: null,
          tentativas: 0,
          motivo: a.motivo,
        });
      }
      continue;
    }
    if (a.status !== 'ATIVA') continue;
    const aviso = somarDias(p.dataVencimento, -antecedencia);
    if ((p.diasAtraso ?? 0) > 0) {
      saida.push({
        ...base,
        status: 'FALHOU',
        notificadoEm: aviso,
        tentativas: Math.min(parametros.maxTentativas, 1 + Math.floor((p.diasAtraso ?? 0) / 2)),
        motivo: 'Saldo insuficiente na conta do pagador',
      });
    } else if (aviso <= HOJE_DO_MOCK) {
      saida.push({
        ...base,
        status: 'NOTIFICADO',
        notificadoEm: aviso,
        tentativas: 0,
        motivo: null,
      });
    } else {
      saida.push({ ...base, status: 'AGENDADO', notificadoEm: null, tentativas: 0, motivo: null });
    }
  }
  return saida;
}

export function resumo(
  agendaDe: (contratoId: string) => AgendaPagamentoResponse | undefined,
): ResumoPixAutomatico {
  const todos = autorizacoes.flatMap((a) => {
    const agenda = agendaDe(a.contratoId);
    return agenda ? debitosDe(a, agenda) : [];
  });
  const mes = HOJE_DO_MOCK.slice(0, 7);
  const futuros = todos.filter((d) => d.status === 'AGENDADO' || d.status === 'NOTIFICADO');
  const liquidados = todos.filter((d) => d.status === 'LIQUIDADO').length;
  const falhas = todos.filter((d) => d.status === 'FALHOU').length;
  return {
    autorizacoesAtivas: autorizacoes.filter((a) => a.status === 'ATIVA').length,
    pendentes: autorizacoes.filter((a) => a.status === 'PENDENTE_PAGADOR').length,
    debitosNoMes: futuros.filter((d) => d.vencimento.startsWith(mes) || d.vencimento > HOJE_DO_MOCK)
      .length,
    valorAgendado: centavos(futuros.reduce((s, d) => s + d.valor, 0)),
    taxaSucessoPct:
      liquidados + falhas > 0 ? Math.round((liquidados / (liquidados + falhas)) * 1000) / 10 : null,
  };
}

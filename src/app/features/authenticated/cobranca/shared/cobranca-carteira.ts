import { AgendaPagamentoResponse, ParcelaResponse } from '../../../../core/api/api.models';
import { centavos } from '../../../../core/financeiro/calculo-financeiro';

// Traducao da agenda de um contrato (GET /cobranca/contratos/{id}/agenda) para o que a tela inicial da
// Cobranca mostra. A tela nao guarda numero nenhum: o contratado, o em aberto, as parcelas e os atrasos
// saem da propria agenda, a mesma que a "Agenda do contrato" e a inadimplencia consultam. Assim o valor
// que o tomador paga, com juros, e o mesmo em qualquer tela.

export type SituacaoContrato = 'EM_DIA' | 'ATRASADO';
export type SituacaoParcela = 'PAGA' | 'PENDENTE' | 'ATRASADA' | 'AGENDADA';

export interface ContratoDaCarteira {
  /** Identificador curto, o que a tela exibe. */
  id: string;
  /** UUID usado na rota da agenda. */
  agendaId: string;
  operation: string;
  contracted: number;
  /** Soma do que ainda falta pagar, com juros. */
  open: number;
  status: SituacaoContrato;
}

export interface LinhaDeParcela {
  contractId: string;
  number: string;
  dueDate: string;
  dueIso: string;
  value: number;
  status: SituacaoParcela;
  overdueDays: number | null;
  /** Dia em que a parcela foi paga, AAAA-MM-DD; null enquanto aberta. */
  paidIso: string | null;
}

/** Parcela ainda nao vencida dentro desta janela e "pendente"; alem dela, "agendada". */
const JANELA_PENDENTE_DIAS = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function situacaoDaParcela(parcela: ParcelaResponse, referenciaIso: string): SituacaoParcela {
  if (parcela.status === 'PAGA') return 'PAGA';
  if ((parcela.diasAtraso ?? 0) > 0) return 'ATRASADA';
  const dias = Math.round(
    (new Date(`${parcela.dataVencimento}T00:00:00Z`).getTime() -
      new Date(`${referenciaIso}T00:00:00Z`).getTime()) /
      DIA_MS,
  );
  return dias <= JANELA_PENDENTE_DIAS ? 'PENDENTE' : 'AGENDADA';
}

export function linhasDaAgenda(
  agenda: AgendaPagamentoResponse,
  idCurto: string,
  referenciaIso: string,
): LinhaDeParcela[] {
  return agenda.parcelas.map((p) => ({
    contractId: idCurto,
    number: `${p.numero}/${agenda.numeroParcelas}`,
    dueDate: dataBr(p.dataVencimento),
    dueIso: p.dataVencimento,
    value: p.total,
    status: situacaoDaParcela(p, referenciaIso),
    overdueDays: (p.diasAtraso ?? 0) > 0 ? (p.diasAtraso ?? 0) : null,
    paidIso: p.dataPagamento ?? null,
  }));
}

export function contratoDaAgenda(
  agenda: AgendaPagamentoResponse,
  idCurto: string,
  agendaId: string,
): ContratoDaCarteira {
  const emAberto = agenda.parcelas.filter((p) => p.status !== 'PAGA');
  return {
    id: idCurto,
    agendaId,
    operation: agenda.produto ?? '—',
    contracted: agenda.valorContratado ?? 0,
    open: centavos(emAberto.reduce((soma, p) => soma + p.total, 0)),
    status: emAberto.some((p) => (p.diasAtraso ?? 0) > 0) ? 'ATRASADO' : 'EM_DIA',
  };
}

// ============ Blocos da coluna lateral, todos derivados das parcelas ============

export interface AlertaCobranca {
  chave: string;
  tom: 'red' | 'orange' | 'blue';
  titulo: string;
  detalhe: string;
  /** Valor da parcela, quando o alerta e de um vencimento. */
  valor?: number;
}

/**
 * Os tres alertas do dia: as duas parcelas mais atrasadas e o proximo vencimento. Antes eram textos fixos
 * ("Parcela 4/24") de contratos que tem 10 parcelas; agora citam a parcela e o contrato que existem.
 */
export function alertasDaCarteira(
  linhas: readonly LinhaDeParcela[],
  referenciaIso: string,
): AlertaCobranca[] {
  const atrasadas = linhas
    .filter((l) => (l.overdueDays ?? 0) > 0)
    .sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0))
    .slice(0, 2);
  const alertas: AlertaCobranca[] = atrasadas.map((l) => ({
    chave: `atraso-${l.contractId}-${l.number}`,
    tom: (l.overdueDays ?? 0) > 15 ? 'red' : 'orange',
    titulo: `Parcela ${l.number} em atraso`,
    detalhe: `Contrato ${l.contractId} - ${l.overdueDays} dias`,
  }));
  const proxima = linhas
    .filter((l) => l.status !== 'PAGA' && !l.overdueDays && l.dueIso >= referenciaIso)
    .sort((a, b) => a.dueIso.localeCompare(b.dueIso))[0];
  if (proxima) {
    const dias = Math.round(
      (new Date(`${proxima.dueIso}T00:00:00Z`).getTime() -
        new Date(`${referenciaIso}T00:00:00Z`).getTime()) /
        DIA_MS,
    );
    alertas.push({
      chave: `vencimento-${proxima.contractId}-${proxima.number}`,
      tom: 'blue',
      titulo:
        dias === 0
          ? 'Vencimento hoje'
          : dias === 1
            ? 'Vencimento amanhã'
            : `Vencimento em ${dias} dias`,
      detalhe: `Parcela ${proxima.number} - Contrato ${proxima.contractId}`,
      valor: proxima.value,
    });
  }
  return alertas;
}

export interface RecebimentosDaJanela {
  total: number;
  anterior: number;
  /** Variacao sobre a janela anterior, em %; null quando nao havia recebimento para comparar. */
  variacaoPct: number | null;
  /** Primeiro e ultimo dia da janela, AAAA-MM-DD. */
  inicio: string;
  fim: string;
  /** Recebido acumulado dia a dia, do primeiro ao ultimo da janela. */
  acumulado: number[];
}

function somarDias(iso: string, dias: number): string {
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Recebido nos ultimos `dias` dias (ate a referencia) contra os `dias` anteriores, das parcelas pagas. */
export function recebimentosDaJanela(
  linhas: readonly LinhaDeParcela[],
  referenciaIso: string,
  dias = 30,
): RecebimentosDaJanela {
  const pagas = linhas.filter((l) => l.status === 'PAGA' && l.paidIso);
  const inicio = somarDias(referenciaIso, -(dias - 1));
  const anteriorInicio = somarDias(inicio, -dias);
  const anteriorFim = somarDias(inicio, -1);
  const soma = (de: string, ate: string) =>
    centavos(
      pagas
        .filter((l) => (l.paidIso as string) >= de && (l.paidIso as string) <= ate)
        .reduce((s, l) => s + l.value, 0),
    );
  const total = soma(inicio, referenciaIso);
  const anterior = soma(anteriorInicio, anteriorFim);
  const acumulado: number[] = [];
  for (let i = 0; i < dias; i += 1) acumulado.push(soma(inicio, somarDias(inicio, i)));
  return {
    total,
    anterior,
    variacaoPct: anterior > 0 ? ((total - anterior) / anterior) * 100 : null,
    inicio,
    fim: referenciaIso,
    acumulado,
  };
}

/** Caminhos SVG (linha e area) de uma serie, na caixa `largura` x `altura`. Serie vazia ou zerada: linha reta na base. */
export function caminhosDoGrafico(
  serie: readonly number[],
  largura = 320,
  altura = 94,
): { linha: string; area: string; maximo: number } {
  const maximo = Math.max(...serie, 0);
  const topo = 6;
  const pontos = serie.map((v, i) => {
    const x = serie.length > 1 ? (i / (serie.length - 1)) * largura : 0;
    const y = maximo > 0 ? altura - (v / maximo) * (altura - topo) : altura - 1;
    return `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
  });
  const linha = `M${pontos.join(' ')}`;
  return { linha, area: `${linha}V${altura}H0Z`, maximo };
}

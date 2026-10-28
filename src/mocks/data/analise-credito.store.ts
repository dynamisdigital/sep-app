import type {
  AnaliseCreditoResponse,
  CapacidadePagamento,
  ConsultaBureau,
  DecisaoSugerida,
  ExecutarAnaliseRequest,
  FaixaRisco,
  AjusteScore,
  FatorScore,
  FonteBureau,
  ParametrosAnalise,
  RegistrarParecerRequest,
  RegraDisparada,
  RestricaoBureau,
  SentidoFator,
} from '../../app/core/credito/analise-credito.models';
import { centavos } from '../../app/core/financeiro/calculo-financeiro';
import { TAXA_MENSAL_PADRAO } from '../../app/core/financeiro/politica-credito';

// Motor de analise de credito de demonstracao. Reproduz o que o backend precisa fazer: consultar os bureaus
// (aqui, dados ficticios por perfil), pontuar fatores explicaveis, aplicar regras bloqueantes e sugerir uma
// decisao. O analista confirma ou diverge, sempre com justificativa. O front so apresenta o resultado.

export interface ErroAnalise {
  erro: string;
  status: 400 | 403 | 404 | 409 | 422;
}

export interface PropostaParaAnalise {
  id: string;
  status: string;
  valorSolicitado: number;
  prazoMeses: number;
  valorParcelaEstimado?: number;
  /** O tomador tem Pix Automático ativo em algum contrato: pagamento previsível. */
  pixAutomaticoAtivo?: boolean;
}

const AGORA = '2026-10-07T10:00:00-03:00';
const TETO_REGIMENTO = 15_000;
export const VERSAO_MODELO = 'score-interno 1.0';

const PARAMETROS_INICIAIS: ParametrosAnalise = {
  bureausHabilitados: { SERASA: true, SPC_BOA_VISTA: true, SCR_BACEN: true },
  validadeConsultaDias: 30,
  corteAprovacao: 700,
  corteRecusa: 500,
  comprometimentoMaximoPct: 30,
  bonusPixAutomatico: 30,
};

let parametros: ParametrosAnalise = clonarParametros(PARAMETROS_INICIAIS);
let analises = new Map<string, AnaliseCreditoResponse>();

function clonarParametros(p: ParametrosAnalise): ParametrosAnalise {
  return { ...p, bureausHabilitados: { ...p.bureausHabilitados } };
}

export function reiniciarAnalises(): void {
  parametros = clonarParametros(PARAMETROS_INICIAIS);
  analises = new Map();
}

export function consultarParametros(): ParametrosAnalise {
  return clonarParametros(parametros);
}

export function atualizarParametros(
  mudanca: Partial<ParametrosAnalise>,
): ParametrosAnalise | ErroAnalise {
  const proximo = clonarParametros({ ...parametros, ...mudanca } as ParametrosAnalise);
  if (mudanca.bureausHabilitados) {
    proximo.bureausHabilitados = {
      ...parametros.bureausHabilitados,
      ...mudanca.bureausHabilitados,
    };
  }
  if (!Object.values(proximo.bureausHabilitados).some(Boolean)) {
    return { erro: 'Pelo menos uma fonte de consulta deve ficar habilitada', status: 422 };
  }
  if (proximo.validadeConsultaDias < 1 || proximo.validadeConsultaDias > 90) {
    return { erro: 'A validade da consulta deve ficar entre 1 e 90 dias', status: 422 };
  }
  if (
    proximo.corteRecusa < 0 ||
    proximo.corteAprovacao > 1000 ||
    proximo.corteRecusa >= proximo.corteAprovacao
  ) {
    return {
      erro: 'O corte de recusa deve ficar abaixo do corte de aprovação (0 a 1000)',
      status: 422,
    };
  }
  if (proximo.bonusPixAutomatico < 0 || proximo.bonusPixAutomatico > 100) {
    return { erro: 'O ajuste do Pix Automatico deve ficar entre 0 e 100 pontos', status: 422 };
  }
  if (proximo.comprometimentoMaximoPct < 5 || proximo.comprometimentoMaximoPct > 50) {
    return { erro: 'O comprometimento máximo da renda deve ficar entre 5% e 50%', status: 422 };
  }
  parametros = proximo;
  return clonarParametros(parametros);
}

// ============ Perfil ficticio do titular, por situacao da proposta ============

interface Perfil {
  faturamentoMensal: number;
  mesesDeAtividade: number;
  serasa: number | null;
  spc: number | null;
  restricoes: RestricaoBureau[];
  scrDivida: number | null;
  scrAtraso: number | null;
}

function perfilDe(status: string): Perfil {
  switch (status) {
    case 'APROVADA':
    case 'PRE_APROVADA':
      return {
        faturamentoMensal: 42_000,
        mesesDeAtividade: 72,
        serasa: 842,
        spc: 815,
        restricoes: [],
        scrDivida: 18_000,
        scrAtraso: 0,
      };
    case 'REJEITADA':
      return {
        faturamentoMensal: 6_500,
        mesesDeAtividade: 11,
        serasa: 388,
        spc: 352,
        restricoes: [
          {
            tipo: 'PROTESTO',
            credor: 'Distribuidora Norte Ltda',
            valor: 4_200,
            desde: '2026-02-11',
          },
          { tipo: 'DIVIDA_VENCIDA', credor: 'Banco Alfa S.A.', valor: 1_800, desde: '2026-04-03' },
        ],
        scrDivida: 31_000,
        scrAtraso: 120,
      };
    case 'PENDENCIA':
      // O SCR não respondeu: o motor não decide sem ele.
      return {
        faturamentoMensal: 19_000,
        mesesDeAtividade: 40,
        serasa: 704,
        spc: 691,
        restricoes: [],
        scrDivida: null,
        scrAtraso: null,
      };
    default:
      return {
        faturamentoMensal: 9_000,
        mesesDeAtividade: 14,
        serasa: 560,
        spc: 540,
        restricoes: [
          {
            tipo: 'DIVIDA_VENCIDA',
            credor: 'Telecom Brasil S.A.',
            valor: 120,
            desde: '2026-07-20',
          },
        ],
        scrDivida: 28_000,
        scrAtraso: 12,
      };
  }
}

function consultar(fonte: FonteBureau, perfil: Perfil, habilitada: boolean): ConsultaBureau {
  const vazia: ConsultaBureau = {
    fonte,
    status: 'NAO_CONSULTADA',
    consultadaEm: null,
    scoreExterno: null,
    restricoes: [],
    endividamentoTotal: null,
    maiorAtrasoDias: null,
    mensagem: null,
  };
  if (!habilitada) return { ...vazia, mensagem: 'Fonte desabilitada nos parâmetros' };
  if (fonte === 'SCR_BACEN') {
    if (perfil.scrDivida === null) {
      return {
        ...vazia,
        status: 'INDISPONIVEL',
        mensagem: 'O SCR não respondeu. Tente de novo mais tarde.',
      };
    }
    return {
      ...vazia,
      status: 'OK',
      consultadaEm: AGORA,
      endividamentoTotal: perfil.scrDivida,
      maiorAtrasoDias: perfil.scrAtraso,
    };
  }
  const score = fonte === 'SERASA' ? perfil.serasa : perfil.spc;
  if (score === null) return { ...vazia, status: 'INDISPONIVEL', mensagem: 'Fonte indisponível' };
  return {
    ...vazia,
    status: 'OK',
    consultadaEm: AGORA,
    scoreExterno: score,
    // Cada bureau enxerga parte das restricoes; o protesto aparece nos dois.
    restricoes: perfil.restricoes.filter((r) =>
      fonte === 'SERASA' ? true : r.tipo === 'PROTESTO' || r.tipo === 'CHEQUE_SEM_FUNDO',
    ),
  };
}

// ============ Pontuacao ============

const PESOS = {
  comprometimento: 25,
  bureaus: 25,
  restricoes: 20,
  endividamento: 15,
  atividade: 10,
  operacao: 5,
} as const;

function limitar(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function sentido(pontos: number): SentidoFator {
  return pontos >= 70 ? 'POSITIVO' : pontos >= 40 ? 'NEUTRO' : 'NEGATIVO';
}

function fator(
  chave: keyof typeof PESOS,
  nome: string,
  pontos: number,
  observado: string,
  explicacao: string,
): FatorScore {
  const p = Math.round(limitar(pontos));
  const peso = PESOS[chave];
  return {
    chave,
    nome,
    peso,
    pontos: p,
    contribuicao: Math.round((p * peso) / 10),
    observado,
    sentido: sentido(p),
    explicacao,
  };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function faixaDe(score: number): FaixaRisco {
  return score >= 800 ? 'A' : score >= 700 ? 'B' : score >= 600 ? 'C' : score >= 500 ? 'D' : 'E';
}

/** Maior principal cuja parcela Price (taxa padrao) cabe em `parcelaMaxima`. */
function principalQueCabe(parcelaMaxima: number, prazo: number): number {
  const i = TAXA_MENSAL_PADRAO;
  return (parcelaMaxima * (1 - Math.pow(1 + i, -prazo))) / i;
}

export function calcularAnalise(
  proposta: PropostaParaAnalise,
  consultas: ConsultaBureau[],
  perfil: Perfil,
  params: ParametrosAnalise,
): Omit<AnaliseCreditoResponse, 'propostaId' | 'geradaEm' | 'validaAte' | 'parecer'> {
  const parcela = proposta.valorParcelaEstimado ?? 0;
  const comprometimento = (parcela / perfil.faturamentoMensal) * 100;
  const max = params.comprometimentoMaximoPct;

  const respostas = consultas.filter((c) => c.status === 'OK' && c.scoreExterno !== null);
  const mediaExterna = respostas.length
    ? respostas.reduce((s, c) => s + (c.scoreExterno as number), 0) / respostas.length
    : null;
  const restricoes = consultas.flatMap((c) => c.restricoes);
  // A mesma restricao pode aparecer nos dois bureaus; conta uma vez.
  const unicas = restricoes.filter(
    (r, i) => restricoes.findIndex((x) => x.credor === r.credor && x.tipo === r.tipo) === i,
  );
  const totalRestricoes = centavos(unicas.reduce((s, r) => s + r.valor, 0));
  const scr = consultas.find((c) => c.fonte === 'SCR_BACEN');
  const scrOk = scr?.status === 'OK';
  const razaoDivida = scrOk
    ? (scr!.endividamentoTotal as number) / (perfil.faturamentoMensal * 12)
    : null;
  const atraso = scrOk ? (scr!.maiorAtrasoDias ?? 0) : 0;

  const fatores: FatorScore[] = [
    fator(
      'comprometimento',
      'Comprometimento da renda',
      100 - (50 * comprometimento) / max,
      `Parcela de ${brl(parcela)} = ${comprometimento.toFixed(1).replace('.', ',')}% do faturamento de ${brl(perfil.faturamentoMensal)}`,
      `Quanto da renda mensal a parcela consome. O máximo aceito é ${max}%; quanto menor, melhor.`,
    ),
    fator(
      'bureaus',
      'Score dos bureaus',
      mediaExterna === null ? 40 : mediaExterna / 10,
      mediaExterna === null
        ? 'Nenhum bureau respondeu'
        : `Média ${Math.round(mediaExterna)} em ${respostas.length} fonte(s)`,
      'Média dos scores de mercado das fontes que responderam. Sem resposta, o fator fica baixo e a decisão vai para análise manual.',
    ),
    fator(
      'restricoes',
      'Restrições ativas',
      100 - 35 * unicas.length - Math.min(50, (50 * totalRestricoes) / proposta.valorSolicitado),
      unicas.length
        ? `${unicas.length} restrição(ões), ${brl(totalRestricoes)}`
        : 'Nenhuma restrição',
      'Protestos, cheques sem fundo e dividas vencidas. Pesa pelo número e pelo valor frente ao que foi pedido.',
    ),
    fator(
      'endividamento',
      'Endividamento no SCR',
      razaoDivida === null ? 50 : 100 - razaoDivida * 200 - (atraso > 30 ? 30 : 0),
      razaoDivida === null
        ? 'SCR indisponível'
        : `${brl(scr!.endividamentoTotal as number)} em operações, maior atraso ${atraso} dia(s)`,
      'Dívida no sistema financeiro frente ao faturamento anual, com desconto para atrasos acima de 30 dias.',
    ),
    fator(
      'atividade',
      'Tempo de atividade',
      (perfil.mesesDeAtividade / 60) * 100,
      `${perfil.mesesDeAtividade} meses`,
      'Empresas mais antigas têm histórico mais previsível; 60 meses ou mais pontua por inteiro.',
    ),
    fator(
      'operacao',
      'Tamanho da operação',
      100 - 50 * (proposta.valorSolicitado / TETO_REGIMENTO),
      `${brl(proposta.valorSolicitado)} em ${proposta.prazoMeses} meses`,
      'Operações proximas do teto do regimento (R$ 15.000) exigem mais folga.',
    ),
  ];

  // O Pix Automático ativo mostra pagamento previsível e entra como ajuste próprio, visível na análise, e
  // não escondido dentro de um fator. O score continua limitado a 1.000.
  const ajustes: AjusteScore[] =
    proposta.pixAutomaticoAtivo && params.bonusPixAutomatico > 0
      ? [
          {
            chave: 'PIX_AUTOMATICO',
            nome: 'Pix Automático ativo',
            pontos: params.bonusPixAutomatico,
            explicacao:
              'O tomador autorizou o débito automático das parcelas: o pagamento é previsível e o risco de esquecimento cai.',
          },
        ]
      : [];
  const somaFatores = fatores.reduce((s, f) => s + f.contribuicao, 0);
  const score = Math.max(
    0,
    Math.min(1000, somaFatores + ajustes.reduce((s, a) => s + a.pontos, 0)),
  );

  const regras: RegraDisparada[] = [];
  if (proposta.valorSolicitado > TETO_REGIMENTO) {
    regras.push({
      regra: 'Teto do regimento',
      bloqueante: true,
      motivo: `O valor pedido passa do teto de ${brl(TETO_REGIMENTO)} por operacao.`,
    });
  }
  if (totalRestricoes > 0.3 * proposta.valorSolicitado) {
    regras.push({
      regra: 'Restrições relevantes',
      bloqueante: true,
      motivo: `Restrições de ${brl(totalRestricoes)} passam de 30% do valor pedido.`,
    });
  }
  if (atraso > 90) {
    regras.push({
      regra: 'Atraso grave no SCR',
      bloqueante: true,
      motivo: `Há operação em atraso há ${atraso} dias no sistema financeiro.`,
    });
  }
  const indisponiveis = consultas.filter((c) => c.status === 'INDISPONIVEL');
  if (indisponiveis.length) {
    regras.push({
      regra: 'Fonte indisponível',
      bloqueante: false,
      motivo: `${indisponiveis.map((c) => c.fonte).join(', ')} não respondeu; o motor não decide sem todas as fontes habilitadas.`,
    });
  }
  const acimaDoMaximo = comprometimento > max;
  if (acimaDoMaximo) {
    regras.push({
      regra: 'Comprometimento acima do máximo',
      bloqueante: false,
      motivo: `A parcela consome ${comprometimento.toFixed(1).replace('.', ',')}% da renda; o máximo é ${max}%.`,
    });
  }

  const bloqueada = regras.some((r) => r.bloqueante);
  let decisaoSugerida: DecisaoSugerida;
  if (bloqueada) decisaoSugerida = 'RECUSAR';
  else if (indisponiveis.length || acimaDoMaximo) decisaoSugerida = 'ANALISE_MANUAL';
  else if (score >= params.corteAprovacao) decisaoSugerida = 'APROVAR';
  else if (score < params.corteRecusa) decisaoSugerida = 'RECUSAR';
  else decisaoSugerida = 'ANALISE_MANUAL';

  const capacidade: CapacidadePagamento = {
    faturamentoMensal: perfil.faturamentoMensal,
    parcelaEstimada: parcela,
    comprometimentoPct: Math.round(comprometimento * 10) / 10,
    comprometimentoMaximoPct: max,
    limiteSugerido: Math.min(
      TETO_REGIMENTO,
      Math.floor(principalQueCabe((perfil.faturamentoMensal * max) / 100, proposta.prazoMeses)),
    ),
  };

  const pior = [...fatores].sort((a, b) => a.pontos - b.pontos)[0];
  const melhor = [...fatores].sort((a, b) => b.pontos - a.pontos)[0];
  const resumo =
    decisaoSugerida === 'APROVAR'
      ? `Score ${score} (faixa ${faixaDe(score)}), acima do corte de aprovacao. Pesou a favor: ${melhor.nome.toLowerCase()}.`
      : decisaoSugerida === 'RECUSAR'
        ? bloqueada
          ? `Recusa sugerida por regra bloqueante: ${regras.find((r) => r.bloqueante)!.motivo}`
          : `Score ${score} (faixa ${faixaDe(score)}), abaixo do corte de recusa. Pesou contra: ${pior.nome.toLowerCase()}.`
        : indisponiveis.length
          ? `Faltam fontes de consulta, então a decisão vai para análise manual. Score parcial ${score}.`
          : acimaDoMaximo
            ? `Score ${score}, mas a parcela passa do comprometimento máximo; o limite que cabe é ${brl(capacidade.limiteSugerido)}.`
            : `Score ${score} (faixa ${faixaDe(score)}), entre os cortes: análise manual. Ponto de atenção: ${pior.nome.toLowerCase()}.`;

  return {
    consultas,
    score,
    faixa: faixaDe(score),
    fatores,
    ajustes,
    capacidade,
    decisaoSugerida,
    regras,
    resumo: ajustes.length ? `${resumo} Inclui +${ajustes[0].pontos} pelo Pix Automático.` : resumo,
    versaoModelo: VERSAO_MODELO,
  };
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString();
}

export function executarAnalise(
  proposta: PropostaParaAnalise | undefined,
  body: ExecutarAnaliseRequest,
): { analise: AnaliseCreditoResponse; reaproveitada: boolean } | ErroAnalise {
  if (!proposta) return { erro: 'Proposta não encontrada', status: 404 };
  if (!body.consentimentoTitular) {
    return {
      erro: 'A consulta aos bureaus exige o consentimento do titular (LGPD)',
      status: 400,
    };
  }
  const existente = analises.get(proposta.id);
  if (existente && !body.forcar && existente.validaAte > AGORA) {
    return { analise: existente, reaproveitada: true };
  }
  if (!Object.values(parametros.bureausHabilitados).some(Boolean)) {
    return { erro: 'Nenhuma fonte de consulta está habilitada', status: 409 };
  }
  const perfil = perfilDe(proposta.status);
  const consultas = (['SERASA', 'SPC_BOA_VISTA', 'SCR_BACEN'] as FonteBureau[]).map((f) =>
    consultar(f, perfil, parametros.bureausHabilitados[f]),
  );
  const resultado = calcularAnalise(proposta, consultas, perfil, parametros);
  const analise: AnaliseCreditoResponse = {
    propostaId: proposta.id,
    geradaEm: AGORA,
    validaAte: somarDias(AGORA, parametros.validadeConsultaDias),
    parecer: null,
    ...resultado,
  };
  analises.set(proposta.id, analise);
  return { analise, reaproveitada: false };
}

export function consultarAnalise(propostaId: string): AnaliseCreditoResponse | undefined {
  return analises.get(propostaId);
}

export function registrarParecer(
  propostaId: string,
  body: RegistrarParecerRequest,
  analista: string,
): AnaliseCreditoResponse | ErroAnalise {
  const a = analises.get(propostaId);
  if (!a) return { erro: 'Execute a análise antes de registrar o parecer', status: 409 };
  if (!body.justificativa?.trim()) return { erro: 'A justificativa é obrigatória', status: 400 };
  const sugerida = a.decisaoSugerida;
  const diverge =
    (sugerida === 'APROVAR' && body.decisao !== 'APROVAR') ||
    (sugerida === 'RECUSAR' && body.decisao !== 'REJEITAR');
  if (diverge && body.justificativa.trim().length < 20) {
    return {
      erro: 'Divergir da sugestão do motor exige uma justificativa detalhada (20 caracteres ou mais)',
      status: 422,
    };
  }
  a.parecer = {
    decisao: body.decisao,
    justificativa: body.justificativa.trim(),
    divergeDoMotor: diverge,
    analista,
    em: AGORA,
  };
  return a;
}

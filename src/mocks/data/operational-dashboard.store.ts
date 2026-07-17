import {
  AtividadeOperacional,
  DashboardOperacionalResponse,
  DesempenhoOperacionalItem,
  SaudeServicoOperacional,
} from '../../app/core/api/api.models';

type StatusOnboarding = 'EM_ANDAMENTO' | 'CONCLUIDO';
type StatusProposta = 'EM_ANALISE' | 'APROVADA' | 'REPROVADA';
type StatusContrato = 'AGUARDANDO_ASSINATURA' | 'ASSINADO';
type StatusParcela = 'PENDENTE' | 'VENCIDA' | 'PAGA';
type StatusPix = 'CONCLUIDO' | 'FALHOU';

interface RegistroBase {
  id: string;
  criadoEm: string;
}

interface OnboardingFake extends RegistroBase {
  status: StatusOnboarding;
}

interface PropostaFake extends RegistroBase {
  status: StatusProposta;
}

interface ContratoFake extends RegistroBase {
  status: StatusContrato;
}

interface ParcelaFake extends RegistroBase {
  status: StatusParcela;
}

interface PixFake extends RegistroBase {
  status: StatusPix;
  valor: number;
}

export interface OperationalDashboardStore {
  referencia: string;
  onboardings: OnboardingFake[];
  propostas: PropostaFake[];
  contratos: ContratoFake[];
  parcelas: ParcelaFake[];
  transacoesPix: PixFake[];
  atividades: AtividadeOperacional[];
  saudeServicos: SaudeServicoOperacional[];
  desempenho: DesempenhoOperacionalItem[];
  comparativos: {
    onboardingEmAndamentoAnterior: number;
    propostasEmAnaliseAnterior: number;
    contratosAguardandoAnterior: number;
    parcelasAtencaoAnterior: number;
    pixConcluidosAnterior: number;
    volumeSeteDiasAnterior: number;
    novosCadastrosAnterior: number;
    propostasRecebidasAnterior: number;
    contratosAssinadosAnterior: number;
  };
}

const HOJE = '2026-07-17';
const ONTEM = '2026-07-16';

function registros<T extends RegistroBase>(
  prefixo: string,
  quantidade: number,
  criadoEm: string,
  complemento: Omit<T, keyof RegistroBase>,
): T[] {
  return Array.from({ length: quantidade }, (_, indice) => ({
    id: `${prefixo}-${String(indice + 1).padStart(3, '0')}`,
    criadoEm,
    ...complemento,
  })) as T[];
}

export function createOperationalDashboardStore(): OperationalDashboardStore {
  return {
    referencia: `${HOJE}T12:00:00-03:00`,
    onboardings: [
      ...registros<OnboardingFake>('onb-hoje', 7, `${HOJE}T09:00:00-03:00`, {
        status: 'EM_ANDAMENTO',
      }),
      ...registros<OnboardingFake>('onb-anterior', 5, `${ONTEM}T09:00:00-03:00`, {
        status: 'EM_ANDAMENTO',
      }),
    ],
    propostas: [
      ...registros<PropostaFake>('prop-hoje', 5, `${HOJE}T10:00:00-03:00`, {
        status: 'EM_ANALISE',
      }),
      ...registros<PropostaFake>('prop-anterior', 3, `${ONTEM}T10:00:00-03:00`, {
        status: 'EM_ANALISE',
      }),
    ],
    contratos: [
      ...registros<ContratoFake>('contrato-pendente', 5, `${ONTEM}T11:00:00-03:00`, {
        status: 'AGUARDANDO_ASSINATURA',
      }),
      ...registros<ContratoFake>('contrato-assinado', 3, `${HOJE}T11:00:00-03:00`, {
        status: 'ASSINADO',
      }),
    ],
    parcelas: [
      ...registros<ParcelaFake>('parcela-vencida', 5, `${ONTEM}T08:00:00-03:00`, {
        status: 'VENCIDA',
      }),
      ...registros<ParcelaFake>('parcela-pendente', 4, `${HOJE}T08:00:00-03:00`, {
        status: 'PENDENTE',
      }),
    ],
    transacoesPix: registros<PixFake>('pix-concluido', 24, `${HOJE}T11:30:00-03:00`, {
      status: 'CONCLUIDO',
      valor: 103_333.333333,
    }),
    atividades: [
      {
        id: 'atividade-001',
        tipo: 'CADASTRO_INICIADO',
        titulo: 'Novo cadastro iniciado',
        detalhe: 'Pessoa física · CPF 123.456.789-00',
        status: 'Em andamento',
        severidade: 'INFO',
        ocorridaEm: `${HOJE}T11:56:00-03:00`,
      },
      {
        id: 'atividade-002',
        tipo: 'PROPOSTA_RECEBIDA',
        titulo: 'Proposta recebida',
        detalhe: 'Empresa XYZ Ltda · R$ 150.000,00',
        status: 'Em análise',
        severidade: 'SUCESSO',
        ocorridaEm: `${HOJE}T11:52:00-03:00`,
      },
      {
        id: 'atividade-003',
        tipo: 'DOCUMENTO_ENVIADO',
        titulo: 'Documento enviado',
        detalhe: 'Contrato social · Empresa ABC Ltda',
        status: 'Recebido',
        severidade: 'SUCESSO',
        ocorridaEm: `${HOJE}T11:48:00-03:00`,
      },
      {
        id: 'atividade-004',
        tipo: 'PAGAMENTO_PIX',
        titulo: 'Pagamento via PIX',
        detalhe: 'R$ 25.000,00 · ID: PIX1234567890',
        status: 'Concluído',
        severidade: 'SUCESSO',
        ocorridaEm: `${HOJE}T11:40:00-03:00`,
      },
      {
        id: 'atividade-005',
        tipo: 'ALERTA_INADIMPLENCIA',
        titulo: 'Alerta de inadimplência',
        detalhe: 'Parcela vencida · Cliente DEF Ltda',
        status: 'Atenção',
        severidade: 'PERIGO',
        ocorridaEm: `${HOJE}T11:35:00-03:00`,
      },
    ],
    saudeServicos: [
      { id: 'credito-api', nome: 'API de crédito', status: 'ONLINE' },
      { id: 'documentos', nome: 'Serviço de documentos', status: 'ONLINE' },
      { id: 'analise', nome: 'Motor de análise', status: 'ONLINE' },
      { id: 'assinatura', nome: 'Serviço de assinatura', status: 'ONLINE' },
      { id: 'pagamentos', nome: 'Gateway de pagamentos', status: 'ONLINE' },
    ],
    desempenho: [
      {
        id: 'CONVERSAO_CREDITO',
        percentual: 78,
        variacaoPercentual: 12,
        contexto: 'vs período anterior',
      },
      {
        id: 'CONTRATOS_FINALIZADOS',
        percentual: 65,
        variacaoPercentual: 18,
        contexto: 'vs período anterior',
      },
      {
        id: 'DOCUMENTOS_VALIDOS',
        percentual: 92,
        variacaoPercentual: 8,
        contexto: 'vs período anterior',
      },
      {
        id: 'SLA_MEDIO',
        percentual: 84,
        variacaoPercentual: null,
        contexto: '3h 12m de resposta',
      },
    ],
    comparativos: {
      onboardingEmAndamentoAnterior: 10,
      propostasEmAnaliseAnterior: 7,
      contratosAguardandoAnterior: 4,
      parcelasAtencaoAnterior: 8,
      pixConcluidosAnterior: 18,
      volumeSeteDiasAnterior: 2_101_694.92,
      novosCadastrosAnterior: 6,
      propostasRecebidasAnterior: 4,
      contratosAssinadosAnterior: 2,
    },
  };
}

function percentual(atual: number, anterior: number): number {
  if (anterior === 0) return atual === 0 ? 0 : 100;
  return Math.round(((atual - anterior) / anterior) * 100);
}

function criadoNaData(registro: RegistroBase, data: string): boolean {
  return registro.criadoEm.startsWith(data);
}

export function buildOperationalDashboardSnapshot(
  store: OperationalDashboardStore,
): DashboardOperacionalResponse {
  const onboardingsEmAndamento = store.onboardings.filter(
    (item) => item.status === 'EM_ANDAMENTO',
  ).length;
  const novosCadastros = store.onboardings.filter((item) => criadoNaData(item, HOJE)).length;
  const propostasEmAnalise = store.propostas.filter((item) => item.status === 'EM_ANALISE').length;
  const propostasRecebidas = store.propostas.filter((item) => criadoNaData(item, HOJE)).length;
  const aguardandoAssinatura = store.contratos.filter(
    (item) => item.status === 'AGUARDANDO_ASSINATURA',
  ).length;
  const contratosAssinados = store.contratos.filter(
    (item) => item.status === 'ASSINADO' && criadoNaData(item, HOJE),
  ).length;
  const parcelasEmAtencao = store.parcelas.filter((item) =>
    ['VENCIDA', 'PENDENTE'].includes(item.status),
  ).length;
  const parcelasVencidas = store.parcelas.filter((item) => item.status === 'VENCIDA').length;
  const pixConcluidos = store.transacoesPix.filter(
    (item) => item.status === 'CONCLUIDO' && criadoNaData(item, HOJE),
  );
  const volume = pixConcluidos.reduce((total, item) => total + item.valor, 0);

  return {
    indicadores: [
      {
        dominio: 'ONBOARDING',
        valor: onboardingsEmAndamento,
        unidade: 'cadastros',
        subtitulo: 'Em andamento',
        variacaoPercentual: percentual(
          onboardingsEmAndamento,
          store.comparativos.onboardingEmAndamentoAnterior,
        ),
        comparacao: 'vs ontem',
      },
      {
        dominio: 'CREDITO',
        valor: propostasEmAnalise,
        unidade: 'propostas',
        subtitulo: 'Em análise',
        variacaoPercentual: percentual(
          propostasEmAnalise,
          store.comparativos.propostasEmAnaliseAnterior,
        ),
        comparacao: 'vs ontem',
      },
      {
        dominio: 'FORMALIZACAO',
        valor: aguardandoAssinatura,
        unidade: 'contratos',
        subtitulo: 'Aguardando assinatura',
        variacaoPercentual: percentual(
          aguardandoAssinatura,
          store.comparativos.contratosAguardandoAnterior,
        ),
        comparacao: 'vs ontem',
      },
      {
        dominio: 'COBRANCA',
        valor: parcelasEmAtencao,
        unidade: 'parcelas',
        subtitulo: 'Em atenção',
        variacaoPercentual: percentual(
          parcelasEmAtencao,
          store.comparativos.parcelasAtencaoAnterior,
        ),
        comparacao: 'vs ontem',
      },
      {
        dominio: 'PIX',
        valor: pixConcluidos.length,
        unidade: 'transações',
        subtitulo: 'Operacional',
        variacaoPercentual: percentual(
          pixConcluidos.length,
          store.comparativos.pixConcluidosAnterior,
        ),
        comparacao: 'vs ontem',
      },
    ],
    volume: {
      valor: Math.round(volume * 100) / 100,
      moeda: 'BRL',
      periodoDias: 7,
      variacaoPercentual: percentual(volume, store.comparativos.volumeSeteDiasAnterior),
    },
    jornadas: [
      {
        dominio: 'ONBOARDING',
        pendencias: onboardingsEmAndamento,
        total: store.onboardings.length,
        unidade: 'cadastros',
        status: 'Em preparação',
      },
      {
        dominio: 'CREDITO',
        pendencias: propostasEmAnalise,
        total: store.propostas.length,
        unidade: 'propostas',
        status: 'Em preparação',
      },
      {
        dominio: 'FORMALIZACAO',
        pendencias: aguardandoAssinatura,
        total: store.contratos.length,
        unidade: 'contratos',
        status: 'Aguardando',
      },
      {
        dominio: 'COBRANCA',
        pendencias: parcelasVencidas,
        total: store.parcelas.length,
        unidade: 'parcelas',
        status: 'Em atenção',
      },
    ],
    resumo: [
      {
        id: 'NOVOS_CADASTROS',
        valor: novosCadastros,
        variacaoPercentual: percentual(novosCadastros, store.comparativos.novosCadastrosAnterior),
      },
      {
        id: 'PROPOSTAS_RECEBIDAS',
        valor: propostasRecebidas,
        variacaoPercentual: percentual(
          propostasRecebidas,
          store.comparativos.propostasRecebidasAnterior,
        ),
      },
      {
        id: 'CONTRATOS_ASSINADOS',
        valor: contratosAssinados,
        variacaoPercentual: percentual(
          contratosAssinados,
          store.comparativos.contratosAssinadosAnterior,
        ),
      },
      {
        id: 'PAGAMENTOS_PIX',
        valor: pixConcluidos.length,
        variacaoPercentual: percentual(
          pixConcluidos.length,
          store.comparativos.pixConcluidosAnterior,
        ),
      },
      {
        id: 'ALERTAS_CRITICOS',
        valor: parcelasVencidas >= 5 ? 2 : 0,
        variacaoPercentual: null,
      },
    ],
    desempenho: store.desempenho.map((item) => ({ ...item })),
    atividades: [...store.atividades]
      .sort((a, b) => new Date(b.ocorridaEm).getTime() - new Date(a.ocorridaEm).getTime())
      .slice(0, 5),
    saudeServicos: store.saudeServicos.map((item) => ({ ...item })),
    geradoEm: store.referencia,
  };
}

export const operationalDashboardStore = createOperationalDashboardStore();

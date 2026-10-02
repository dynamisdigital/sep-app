// Fonte de dados do painel Pix Operacional (Mockup 20).
//
// O contrato atual do PixService cobre apenas operacoes por identificador (solicitar e
// consultar desembolso, gerar e consultar referencia, consultar recebimento). Nao existe
// endpoint de agregados, serie historica, alertas ou saude do provider. Enquanto isso, o
// painel le este conjunto deterministico, que reproduz os numeros do mockup e fecha
// aritmeticamente entre si. Quando os agregados forem publicados, apenas `carregarPainelPix`
// muda: a tela ja trata carregando e erro.

export type TomPix = 'blue' | 'cyan' | 'green' | 'orange' | 'red' | 'purple';

export interface MetricaPix {
  chave: 'desembolsos' | 'recebimentos' | 'divergencias';
  rotulo: string;
  total: number;
  rotuloHoje: string;
  hoje: number;
  legendaTotal: string;
  variacao: string;
  variacaoSobe: boolean;
  rotuloValor: string;
  valor: number;
  tom: TomPix;
  icone: string;
  rota: string;
}

export interface FaixaVolume {
  rotulo: string;
  valor: number;
  tom: TomPix;
}

export interface IndicadorConciliacao {
  chave: string;
  rotulo: string;
  valor: string;
  unidade: string;
  nota: string;
  // Fracao do arco preenchida, de 0 a 100.
  percentual: number;
  tom: TomPix;
}

export type SeveridadeAlerta = 'CRITICA' | 'ALTA' | 'MEDIA';

export interface AlertaPix {
  id: string;
  titulo: string;
  referencia: string;
  valor: number | null;
  severidade: SeveridadeAlerta;
  hora: string;
  rota: string;
}

export type TipoAtividade = 'RECEBIMENTO_CONCILIADO' | 'DESEMBOLSO_REALIZADO' | 'DIVERGENCIA';

export interface AtividadePix {
  id: string;
  tipo: TipoAtividade;
  titulo: string;
  referencia: string;
  valor: number;
  hora: string;
  rota: string;
}

export interface IntegracaoPix {
  nome: string;
  detalhe: string;
  rotuloEstado: string;
  estado: string;
  ativa: boolean;
  icone: string;
}

export const SEVERIDADE_ALERTA_LABEL: Record<SeveridadeAlerta, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Média',
};

// Dias do grafico de transferencias, do mais antigo ao mais recente.
export const DIAS_TRANSFERENCIAS = [
  '24/05',
  '25/05',
  '26/05',
  '27/05',
  '28/05',
  '29/05',
  '30/05',
] as const;

// As tres series batem com o balao do mockup em 29/05 (indice 5): desembolsos 156,
// recebimentos 198 e divergencias 17. Os demais dias ficam na mesma faixa alta do eixo em que
// o mockup desenha as curvas, com 29/05 como a queda que o proprio balao registra.
export const SERIES_TRANSFERENCIAS: Record<
  'desembolsos' | 'recebimentos' | 'divergencias',
  readonly number[]
> = {
  desembolsos: [268, 232, 330, 258, 296, 156, 340],
  recebimentos: [214, 196, 252, 208, 238, 198, 262],
  divergencias: [14, 11, 18, 12, 16, 17, 13],
};

export const ESCALA_TRANSFERENCIAS = [400, 300, 200, 100, 0] as const;

export interface PainelPix {
  provider: {
    nome: string;
    estado: string;
    online: boolean;
    tempoRespostaMs: number;
    serie: readonly number[];
  };
  metricas: readonly MetricaPix[];
  volume24h: readonly FaixaVolume[];
  conciliacao: readonly IndicadorConciliacao[];
  alertas: readonly AlertaPix[];
  atividades: readonly AtividadePix[];
  integracoes: readonly IntegracaoPix[];
}

const PAINEL: PainelPix = {
  provider: {
    nome: 'Provider Pix',
    estado: 'ONLINE',
    online: true,
    tempoRespostaMs: 186,
    // Serie densa para o traco ficar fino como no mockup, e nao serrilhado.
    serie: [
      196, 188, 204, 182, 210, 176, 192, 168, 200, 184, 172, 194, 180, 208, 174, 190, 166, 198, 182,
      176, 192, 170, 186, 178,
    ],
  },
  metricas: [
    {
      chave: 'desembolsos',
      rotulo: 'Desembolsos',
      total: 1248,
      rotuloHoje: 'Hoje',
      hoje: 89,
      legendaTotal: 'Total este mês',
      variacao: '18,6%',
      variacaoSobe: true,
      rotuloValor: 'Valor total',
      valor: 1975430.2,
      tom: 'blue',
      icone: 'send',
      rota: '/app/pix/desembolsos',
    },
    {
      chave: 'recebimentos',
      rotulo: 'Recebimentos',
      total: 1573,
      rotuloHoje: 'Hoje',
      hoje: 112,
      legendaTotal: 'Total este mês',
      variacao: '22,3%',
      variacaoSobe: true,
      rotuloValor: 'Valor total',
      valor: 2431987.64,
      tom: 'green',
      icone: 'download',
      rota: '/app/pix/recebimentos',
    },
    {
      chave: 'divergencias',
      rotulo: 'Divergências',
      total: 37,
      rotuloHoje: 'Hoje',
      hoje: 5,
      legendaTotal: 'Pendentes',
      variacao: '12,1%',
      variacaoSobe: true,
      rotuloValor: 'Valor divergente',
      valor: 87642.31,
      tom: 'orange',
      icone: 'triangle-alert',
      rota: '/app/pix/divergencias',
    },
  ],
  // 89 + 112 + 23 = 224, o mesmo total exibido no nucleo do donut.
  volume24h: [
    { rotulo: 'Desembolsos', valor: 89, tom: 'blue' },
    { rotulo: 'Recebimentos', valor: 112, tom: 'green' },
    { rotulo: 'Divergências', valor: 23, tom: 'orange' },
  ],
  conciliacao: [
    {
      chave: 'taxa',
      rotulo: 'Taxa de conciliação',
      valor: '96,8%',
      unidade: 'Excelente',
      nota: 'Meta: > 95%',
      percentual: 96.8,
      tom: 'green',
    },
    {
      chave: 'pendencias',
      rotulo: 'Pendências de conciliação',
      valor: '48',
      unidade: 'Itens',
      nota: 'R$ 21.340,80',
      percentual: 62,
      tom: 'purple',
    },
    {
      chave: 'tempo',
      rotulo: 'Tempo médio conciliação',
      valor: '2h 18m',
      unidade: 'Hoje',
      nota: 'Meta: < 6h',
      percentual: 38,
      tom: 'blue',
    },
    {
      chave: 'transito',
      rotulo: 'Transferências em trânsito',
      valor: '27',
      unidade: 'Itens',
      nota: 'R$ 14.875,60',
      percentual: 45,
      tom: 'cyan',
    },
  ],
  alertas: [
    {
      id: 'a1',
      titulo: 'Divergência de valor detectada',
      referencia: 'ID: PARC-4/24',
      valor: 1250,
      severidade: 'CRITICA',
      hora: '11:52',
      rota: '/app/pix/divergencias',
    },
    {
      id: 'a2',
      titulo: 'Recebimento sem parcela vinculada',
      referencia: 'Ref: 9f7e2a21...',
      valor: 890,
      severidade: 'ALTA',
      hora: '11:45',
      rota: '/app/pix/divergencias',
    },
    {
      id: 'a3',
      titulo: 'Timeout em consulta de status',
      referencia: 'ID: 5b771e05 • Transferência Pix',
      valor: null,
      severidade: 'MEDIA',
      hora: '11:32',
      rota: '/app/pix/desembolsos',
    },
  ],
  atividades: [
    {
      id: 'v1',
      tipo: 'RECEBIMENTO_CONCILIADO',
      titulo: 'Recebimento conciliado',
      referencia: 'Ref: 9f7e2a21...',
      valor: 1250,
      hora: '11:55',
      rota: '/app/pix/recebimentos',
    },
    {
      id: 'v2',
      tipo: 'DESEMBOLSO_REALIZADO',
      titulo: 'Desembolso realizado',
      referencia: 'ID: 5b771e05',
      valor: 980,
      hora: '11:53',
      rota: '/app/pix/desembolsos',
    },
    {
      id: 'v3',
      tipo: 'DIVERGENCIA',
      titulo: 'Divergência identificada',
      referencia: 'PARC-4/24',
      valor: 1250,
      hora: '11:52',
      rota: '/app/pix/divergencias',
    },
    {
      id: 'v4',
      tipo: 'RECEBIMENTO_CONCILIADO',
      titulo: 'Recebimento conciliado',
      referencia: 'Ref: a8c3d9f1...',
      valor: 2150,
      hora: '11:48',
      rota: '/app/pix/recebimentos',
    },
  ],
  integracoes: [
    {
      nome: 'Provider Pix',
      detalhe: 'Cielo Pix',
      rotuloEstado: 'Status',
      estado: 'Online',
      ativa: true,
      icone: 'plug-zap',
    },
    {
      nome: 'Webhooks',
      detalhe: 'Ativos',
      rotuloEstado: 'Última entrega',
      estado: '11:56:12',
      ativa: true,
      icone: 'webhook',
    },
  ],
};

export function carregarPainelPix(): PainelPix {
  return PAINEL;
}

import { TipoReprocesso } from '../../../../core/api/api.models';

// Fonte de dados da tela de Reprocessos (Mockup 18).
//
// O contrato atual do backend so expoe o DISPARO de reprocesso
// (POST /backoffice/reprocessos/webhook/{id} e /provider/{tipo}/{entidade}); nao existe GET de
// listagem, historico ou agregados. Enquanto esse endpoint nao existe, a tela le este conjunto
// deterministico, que reproduz os numeros do mockup e fecha aritmeticamente com os donuts, as
// metricas e a paginacao. Quando a listagem for publicada, apenas `carregarReprocessos` muda:
// a tela ja trata carregando, vazio e erro.
//
// StatusReprocesso do contrato tem tres valores (PENDENTE | SUCESSO | FALHA) e o mockup exibe
// quatro faixas. AGUARDANDO e EM_EXECUCAO sao as duas leituras de PENDENTE; a distincao e
// visual e depende de o backend passar a informar a execucao em andamento.
export type StatusReprocessoUi = 'CONCLUIDO' | 'EM_EXECUCAO' | 'AGUARDANDO' | 'FALHA';

export type TipoReprocessoUi =
  | 'INTEGRACAO_PIX'
  | 'COBRANCA'
  | 'CREDITO'
  | 'FORMALIZACAO'
  | 'ONBOARDING';

export interface LinhaReprocesso {
  id: string;
  codigo: string;
  tipo: TipoReprocessoUi;
  referencia: string;
  status: StatusReprocessoUi;
  criadoEm: string;
  atualizadoEm: string;
  solicitante: string;
  // Vinculo opcional com a fila operacional; alimenta o atalho "Ver item da fila".
  itemId: string | null;
  // Percentual de execucao; so existe enquanto o reprocesso esta em andamento.
  progresso: number | null;
  // Origem no contrato real: define qual endpoint de disparo atende a reexecucao.
  origem: TipoReprocesso;
  resultado: string | null;
}

export const TIPO_REPROCESSO_UI_LABEL: Record<TipoReprocessoUi, string> = {
  INTEGRACAO_PIX: 'Integração Pix',
  COBRANCA: 'Cobrança',
  CREDITO: 'Crédito',
  FORMALIZACAO: 'Formalização',
  ONBOARDING: 'Onboarding',
};

// Rotulo curto da coluna Origem; no mockup Integracao Pix aparece como "PIX".
export const ORIGEM_REPROCESSO_LABEL: Record<TipoReprocessoUi, string> = {
  INTEGRACAO_PIX: 'PIX',
  COBRANCA: 'Cobrança',
  CREDITO: 'Crédito',
  FORMALIZACAO: 'Formalização',
  ONBOARDING: 'Onboarding',
};

export const STATUS_REPROCESSO_UI_LABEL: Record<StatusReprocessoUi, string> = {
  CONCLUIDO: 'Concluído',
  EM_EXECUCAO: 'Em execução',
  AGUARDANDO: 'Aguardando',
  FALHA: 'Falha',
};

export const SOLICITANTES = [
  'Ana Martins',
  'Rafael Ferreira',
  'Camila Andrade',
  'João Silva',
  'Lucas Gomes',
] as const;

// Totais do mockup. Somam 128 em cada eixo e sustentam donuts, metricas e paginacao.
export const TOTAL_REPROCESSOS = 128;

const QUOTA_STATUS: Record<StatusReprocessoUi, number> = {
  CONCLUIDO: 86,
  FALHA: 12,
  EM_EXECUCAO: 9,
  AGUARDANDO: 21,
};

const QUOTA_TIPO: Record<TipoReprocessoUi, number> = {
  INTEGRACAO_PIX: 38,
  COBRANCA: 32,
  CREDITO: 24,
  FORMALIZACAO: 18,
  ONBOARDING: 16,
};

const ITEM_FILA_VINCULADO = 'c0000000-0000-4000-8000-000000000002';

// UUID estavel por sequencial: o codigo RPR-000128 e a identificacao amigavel exibida, e o id
// e o identificador tecnico usado em copia e nas rotas, como no padrao das demais telas.
function idDe(sequencial: number): string {
  return `e0000000-0000-4000-8000-${String(sequencial).padStart(12, '0')}`;
}

function codigoDe(sequencial: number): string {
  return `RPR-${String(sequencial).padStart(6, '0')}`;
}

function referenciaDe(tipo: TipoReprocessoUi, sequencial: number): string {
  const sufixo = String(sequencial).padStart(6, '0');
  switch (tipo) {
    case 'INTEGRACAO_PIX':
      return `PIX-20260530-${sufixo}`;
    case 'COBRANCA':
      return `PARC-${(sequencial % 24) + 1}/24`;
    case 'CREDITO':
      return `PROP-5b77${sufixo.slice(-4)}`;
    case 'FORMALIZACAO':
      return `CTR-5b77${sufixo.slice(-4)}`;
    case 'ONBOARDING':
      return `ONB-9f13${sufixo.slice(-4)}`;
  }
}

// As oito linhas mais recentes reproduzem exatamente a primeira pagina do mockup.
const LINHAS_DO_MOCKUP: readonly {
  sequencial: number;
  tipo: TipoReprocessoUi;
  referencia: string;
  status: StatusReprocessoUi;
  criadoEm: string;
  atualizadoEm: string;
  solicitante: string;
  progresso: number | null;
}[] = [
  {
    sequencial: 128,
    tipo: 'INTEGRACAO_PIX',
    referencia: 'PIX-20260530-001256',
    status: 'CONCLUIDO',
    criadoEm: '2026-05-30T11:40:00-03:00',
    atualizadoEm: '2026-05-30T11:45:00-03:00',
    solicitante: 'Ana Martins',
    progresso: null,
  },
  {
    sequencial: 127,
    tipo: 'FORMALIZACAO',
    referencia: 'CTR-5b771e03',
    status: 'EM_EXECUCAO',
    criadoEm: '2026-05-30T11:35:00-03:00',
    atualizadoEm: '2026-05-30T11:41:00-03:00',
    solicitante: 'Rafael Ferreira',
    progresso: 62,
  },
  {
    sequencial: 126,
    tipo: 'COBRANCA',
    referencia: 'PARC-4/24',
    status: 'AGUARDANDO',
    criadoEm: '2026-05-30T11:32:00-03:00',
    atualizadoEm: '2026-05-30T11:32:00-03:00',
    solicitante: 'Camila Andrade',
    progresso: null,
  },
  {
    sequencial: 125,
    tipo: 'CREDITO',
    referencia: 'PROP-5b771e05',
    status: 'FALHA',
    criadoEm: '2026-05-30T11:20:00-03:00',
    atualizadoEm: '2026-05-30T11:28:00-03:00',
    solicitante: 'João Silva',
    progresso: null,
  },
  {
    sequencial: 124,
    tipo: 'INTEGRACAO_PIX',
    referencia: 'PIX-20260530-001189',
    status: 'CONCLUIDO',
    criadoEm: '2026-05-30T11:18:00-03:00',
    atualizadoEm: '2026-05-30T11:22:00-03:00',
    solicitante: 'Lucas Gomes',
    progresso: null,
  },
  {
    sequencial: 123,
    tipo: 'ONBOARDING',
    referencia: 'ONB-9f13b2a1',
    status: 'FALHA',
    criadoEm: '2026-05-30T11:05:00-03:00',
    atualizadoEm: '2026-05-30T11:12:00-03:00',
    solicitante: 'Ana Martins',
    progresso: null,
  },
  {
    sequencial: 122,
    tipo: 'COBRANCA',
    referencia: 'PARC-3/24',
    status: 'CONCLUIDO',
    criadoEm: '2026-05-30T10:58:00-03:00',
    atualizadoEm: '2026-05-30T11:03:00-03:00',
    solicitante: 'Rafael Ferreira',
    progresso: null,
  },
  {
    sequencial: 121,
    tipo: 'CREDITO',
    referencia: 'PROP-5b771e02',
    status: 'AGUARDANDO',
    criadoEm: '2026-05-30T10:50:00-03:00',
    atualizadoEm: '2026-05-30T10:50:00-03:00',
    solicitante: 'Camila Andrade',
    progresso: null,
  },
  // Segunda execucao em andamento do painel lateral. O mockup a rotula RPR-000129, numero que
  // nao cabe em um conjunto de 128 registros; mantivemos tipo, referencia e percentual.
  {
    sequencial: 120,
    tipo: 'INTEGRACAO_PIX',
    referencia: 'PIX-20260530-001303',
    status: 'EM_EXECUCAO',
    criadoEm: '2026-05-30T10:44:00-03:00',
    atualizadoEm: '2026-05-30T10:47:00-03:00',
    solicitante: 'Lucas Gomes',
    progresso: 28,
  },
];

const MENSAGEM_FALHA = 'Provider retornou HTTP 500 na tentativa de reconsulta.';
const MENSAGEM_SUCESSO = 'Reprocesso concluído e evento reconciliado.';

function origemDe(tipo: TipoReprocessoUi): TipoReprocesso {
  // Integracao Pix reprocessa a chamada ao provider; os demais reenviam o webhook de origem.
  return tipo === 'INTEGRACAO_PIX' ? 'PROVIDER' : 'WEBHOOK';
}

function resultadoDe(status: StatusReprocessoUi): string | null {
  if (status === 'CONCLUIDO') return MENSAGEM_SUCESSO;
  if (status === 'FALHA') return MENSAGEM_FALHA;
  return null;
}

function montar(
  sequencial: number,
  tipo: TipoReprocessoUi,
  status: StatusReprocessoUi,
  referencia: string,
  criadoEm: string,
  atualizadoEm: string,
  solicitante: string,
  progresso: number | null,
): LinhaReprocesso {
  return {
    id: idDe(sequencial),
    codigo: codigoDe(sequencial),
    tipo,
    referencia,
    status,
    criadoEm,
    atualizadoEm,
    solicitante,
    // Falhas sao as que geram item na fila operacional; o atalho so aparece quando ha vinculo.
    itemId: status === 'FALHA' ? ITEM_FILA_VINCULADO : null,
    progresso,
    origem: origemDe(tipo),
    resultado: resultadoDe(status),
  };
}

// Distribui as cotas restantes de forma deterministica sobre os sequenciais 1..119, cobrindo o
// periodo de 24/04 a 30/05 exibido no grafico de historico.
function gerarAnteriores(): LinhaReprocesso[] {
  const statusRestante: Record<StatusReprocessoUi, number> = { ...QUOTA_STATUS };
  const tipoRestante: Record<TipoReprocessoUi, number> = { ...QUOTA_TIPO };
  for (const linha of LINHAS_DO_MOCKUP) {
    statusRestante[linha.status] -= 1;
    tipoRestante[linha.tipo] -= 1;
  }

  const statusPool = expandir(statusRestante);
  const tipoPool = expandir(tipoRestante);
  const menor = LINHAS_DO_MOCKUP[LINHAS_DO_MOCKUP.length - 1].sequencial - 1;
  const inicio = new Date('2026-04-24T09:00:00-03:00').getTime();
  const fim = new Date('2026-05-30T10:30:00-03:00').getTime();
  const passo = (fim - inicio) / Math.max(menor - 1, 1);

  const linhas: LinhaReprocesso[] = [];
  for (let sequencial = menor; sequencial >= 1; sequencial -= 1) {
    const indice = menor - sequencial;
    const status = statusPool[indice];
    const tipo = tipoPool[indice];
    const criado = new Date(inicio + (sequencial - 1) * passo);
    // Reprocesso concluido ou falho encerra alguns minutos depois; pendente nao teve atualizacao.
    const minutos = status === 'AGUARDANDO' ? 0 : 3 + (indice % 9);
    const atualizado = new Date(criado.getTime() + minutos * 60_000);
    linhas.push(
      montar(
        sequencial,
        tipo,
        status,
        referenciaDe(tipo, sequencial),
        criado.toISOString(),
        atualizado.toISOString(),
        SOLICITANTES[indice % SOLICITANTES.length],
        status === 'EM_EXECUCAO' ? 15 + ((indice * 7) % 70) : null,
      ),
    );
  }
  return linhas;
}

// Intercala as cotas em vez de agrupa-las, para que qualquer pagina da tabela mostre a mesma
// variedade de status e tipos do mockup. Escolher sempre a cota de maior saldo esgotaria a
// maior faixa primeiro (uma pagina inteira de "Concluido"); o credito proporcional espalha
// cada faixa na mesma proporcao da sua cota, e o total emitido continua exato.
function expandir<T extends string>(cotas: Record<T, number>): T[] {
  const chaves = Object.keys(cotas) as T[];
  const total = chaves.reduce((soma, chave) => soma + cotas[chave], 0);
  const restante = { ...cotas };
  const credito = Object.fromEntries(chaves.map((chave) => [chave, 0])) as Record<T, number>;

  const saida: T[] = [];
  while (saida.length < total) {
    const disponiveis = chaves.filter((chave) => restante[chave] > 0);
    for (const chave of disponiveis) {
      credito[chave] += cotas[chave] / total;
    }
    const escolhida = disponiveis.reduce((maior, atual) =>
      credito[atual] > credito[maior] ? atual : maior,
    );
    credito[escolhida] -= 1;
    restante[escolhida] -= 1;
    saida.push(escolhida);
  }
  return saida;
}

const REPROCESSOS: readonly LinhaReprocesso[] = [
  ...LINHAS_DO_MOCKUP.map((linha) =>
    montar(
      linha.sequencial,
      linha.tipo,
      linha.status,
      linha.referencia,
      linha.criadoEm,
      linha.atualizadoEm,
      linha.solicitante,
      linha.progresso,
    ),
  ),
  ...gerarAnteriores(),
];

// Ponto unico de leitura: quando o GET de listagem existir, esta funcao passa a delegar ao
// BackofficeService sem que a tela precise mudar.
export function carregarReprocessos(): readonly LinhaReprocesso[] {
  return REPROCESSOS;
}

// ---- Historico do disparo manual (Mockup 19) -------------------------------------------
// Mesma lacuna de contrato da listagem: o backend nao expoe historico de disparos. O
// resultado tem tres faixas porque e isso que o disparo devolve — SUCESSO, FALHA e o
// pendente, que aqui aparece como "Sem retorno" (o provider aceitou mas nao reconsultou).
export type ResultadoDisparo = 'SUCESSO' | 'SEM_RETORNO' | 'FALHA';

export interface LinhaHistoricoDisparo {
  id: string;
  dataHora: string;
  tipoChamada: string;
  entidade: string;
  // Codigo curto exibido na coluna "Item da fila".
  itemFila: string;
  // UUID do mesmo item: e o que a rota /app/backoffice/fila/:id espera. Sem ele o atalho da
  // linha abria uma tela vazia, porque o codigo curto nao resolve nenhum item.
  itemFilaId: string;
  usuario: string;
  resultado: ResultadoDisparo;
  // Duracao da chamada em segundos; `null` quando o provider nao retornou.
  duracaoSegundos: number | null;
}

export const RESULTADO_DISPARO_LABEL: Record<ResultadoDisparo, string> = {
  SUCESSO: 'Sucesso',
  SEM_RETORNO: 'Sem retorno',
  FALHA: 'Falha',
};

const HISTORICO_DISPARO: readonly LinhaHistoricoDisparo[] = [
  {
    id: 'f0000000-0000-4000-8000-000000000001',
    dataHora: '2026-05-30T11:42:15-03:00',
    tipoChamada: 'Transferência Pix',
    entidade: 'PROP-5b771e05',
    itemFila: '5b771e05',
    itemFilaId: 'c0000000-0000-4000-8000-000000000001',
    usuario: 'Ana Martins',
    resultado: 'SUCESSO',
    duracaoSegundos: 2.34,
  },
  {
    id: 'f0000000-0000-4000-8000-000000000002',
    dataHora: '2026-05-30T11:28:07-03:00',
    tipoChamada: 'Transferência Pix',
    entidade: 'CONT-8d991a11',
    itemFila: '5b771e02',
    itemFilaId: 'c0000000-0000-4000-8000-000000000002',
    usuario: 'Rafael Ferreira',
    resultado: 'SUCESSO',
    duracaoSegundos: 1.98,
  },
  {
    id: 'f0000000-0000-4000-8000-000000000003',
    dataHora: '2026-05-30T10:55:32-03:00',
    tipoChamada: 'Cobrança',
    entidade: 'PARC-4/24',
    itemFila: '5b771e01',
    itemFilaId: 'c0000000-0000-4000-8000-000000000003',
    usuario: 'Camila Andrade',
    resultado: 'SEM_RETORNO',
    duracaoSegundos: null,
  },
  {
    id: 'f0000000-0000-4000-8000-000000000004',
    dataHora: '2026-05-30T10:41:09-03:00',
    tipoChamada: 'Onboarding',
    entidade: 'USU-afa712e3',
    itemFila: '5b771df9',
    itemFilaId: 'c0000000-0000-4000-8000-000000000004',
    usuario: 'Lucas Gomes',
    resultado: 'FALHA',
    duracaoSegundos: 0.75,
  },
  {
    id: 'f0000000-0000-4000-8000-000000000005',
    dataHora: '2026-05-30T10:12:26-03:00',
    tipoChamada: 'Formalização',
    entidade: 'CONT-9a22b77',
    itemFila: '5b771df1',
    itemFilaId: 'c0000000-0000-4000-8000-000000000005',
    usuario: 'João Silva',
    resultado: 'SUCESSO',
    duracaoSegundos: 2.11,
  },
];

export function carregarHistoricoDisparos(): readonly LinhaHistoricoDisparo[] {
  return HISTORICO_DISPARO;
}

import type {
  AcaoAuditoria,
  AtualizarMetaRequest,
  ComissoesResponse,
  CriarInteracaoRequest,
  CriarProspectRequest,
  DesempenhoCorrespondente,
  DesempenhoRedeResponse,
  EtapaFunil,
  EventoAuditoria,
  InteracaoResponse,
  LancamentoComissao,
  MetaCorrespondente,
  MeuDesempenhoResponse,
  ProspectResponse,
  RegraComissao,
} from '../../app/core/correspondentes/correspondentes-gestao.models';
import {
  consultarCorrespondente,
  consultarRede,
  HOJE_DEMO,
  ID_CORRESPONDENTE_CARLA,
  ID_CORRESPONDENTE_MARCOS,
  ID_CORRESPONDENTE_RAFAEL,
  listarBaseDe,
  listarTodasOperacoes,
  somarMeses,
} from './correspondentes.store';

// Dados ficticios da gestao comercial do modulo de Correspondentes: funil, agenda, comissoes,
// metas, desempenho e auditoria. As regras (comissao pela versao vigente da regra, atribuicao ao
// vinculo vigente na data do evento, status derivado da data) espelham o que o backend precisa
// fazer; aqui existem para o front ser demonstravel antes do contrato real.

// ---------------------------------------------------------------- funil e agenda

function prospect(
  n: number,
  corr: string,
  nome: string,
  tipo: 'PF' | 'PJ',
  produto: string,
  valor: number,
  etapa: EtapaFunil,
  proximoContato: string | null,
): ProspectResponse & { correspondenteId: string } {
  return {
    id: `p1000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`,
    correspondenteId: corr,
    nome,
    tipoPessoa: tipo,
    telefone: `(11) 9${String(8000 + n * 37).padStart(4, '0')}-${String(1200 + n * 91).slice(0, 4)}`,
    produtoInteresse: produto,
    valorEstimado: valor,
    etapa,
    origem: n % 2 ? 'Indicação' : 'Visita',
    criadoEm: somarMeses('2026-07-01', n % 3),
    atualizadoEm: HOJE_DEMO,
    proximoContato,
    motivoPerda: etapa === 'PERDIDO' ? 'Optou por outra instituição' : null,
  };
}

type ProspectInterno = ProspectResponse & { correspondenteId: string };
type InteracaoInterna = InteracaoResponse & { correspondenteId: string };

const C = ID_CORRESPONDENTE_CARLA;
const R = ID_CORRESPONDENTE_RAFAEL;
const M = ID_CORRESPONDENTE_MARCOS;

const SEMENTE_PROSPECTS: ProspectInterno[] = [
  prospect(
    1,
    C,
    'Academia Corpo em Forma',
    'PJ',
    'Capital de giro',
    40000,
    'PROSPECTADO',
    '2026-10-09',
  ),
  prospect(2, C, 'Beatriz Nogueira', 'PF', 'Crédito pessoal', 8000, 'PROSPECTADO', null),
  prospect(
    3,
    C,
    'Restaurante Sabor da Terra',
    'PJ',
    'Capital de giro',
    55000,
    'CONTATADO',
    '2026-10-08',
  ),
  prospect(4, C, 'Rogério Tavares', 'PF', 'Crédito pessoal', 12000, 'CONTATADO', '2026-10-05'),
  prospect(
    5,
    C,
    'Mecânica Irmãos Lopes',
    'PJ',
    'Capital de giro',
    30000,
    'EM_NEGOCIACAO',
    '2026-10-10',
  ),
  prospect(6, C, 'Oficina Rápida ME', 'PJ', 'Capital de giro', 35000, 'ANALISE_CREDITO', null),
  prospect(7, C, 'Mercado Bom Preço', 'PJ', 'Capital de giro', 80000, 'APROVADO', null),
  prospect(8, C, 'Padaria Estrela Ltda', 'PJ', 'Capital de giro', 60000, 'ATIVO', null),
  prospect(9, C, 'Fábio Menezes', 'PF', 'Crédito pessoal', 6000, 'PERDIDO', null),
  prospect(10, R, 'Studio Pilates Vida', 'PJ', 'Capital de giro', 25000, 'CONTATADO', '2026-10-11'),
  prospect(11, R, 'Clínica Vida Plena', 'PJ', 'Capital de giro', 120000, 'ATIVO', null),
  prospect(12, R, 'Pedro Henrique Alves', 'PF', 'Crédito pessoal', 9000, 'CONTRATADO', null),
  prospect(
    13,
    R,
    'Lavanderia Brilho',
    'PJ',
    'Capital de giro',
    18000,
    'DOCUMENTACAO',
    '2026-10-09',
  ),
  prospect(14, M, 'Transportes Horizonte', 'PJ', 'Capital de giro', 45000, 'ATIVO', null),
  prospect(15, M, 'Luciana Prado', 'PF', 'Crédito pessoal', 15000, 'PERDIDO', null),
  prospect(16, M, 'Auto Peças Central', 'PJ', 'Capital de giro', 38000, 'PROSPECTADO', null),
];

function interacao(
  n: number,
  corr: string,
  cliente: string,
  tipo: InteracaoResponse['tipo'],
  descricao: string,
  data: string,
  status: InteracaoResponse['status'],
): InteracaoInterna {
  return {
    id: `i1000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`,
    correspondenteId: corr,
    clienteNome: cliente,
    prospectId: null,
    tipo,
    descricao,
    data,
    status,
  };
}

const SEMENTE_INTERACOES: InteracaoInterna[] = [
  interacao(
    1,
    C,
    'Restaurante Sabor da Terra',
    'VISITA',
    'Visita ao estabelecimento; apresentou o capital de giro.',
    '2026-10-02',
    'REGISTRADA',
  ),
  interacao(
    2,
    C,
    'Mecânica Irmãos Lopes',
    'REUNIAO',
    'Reunião de proposta; cliente pediu simulação em 12 parcelas.',
    '2026-10-06',
    'REGISTRADA',
  ),
  interacao(
    3,
    C,
    'Ana Beatriz Costa',
    'LIGACAO',
    'Parcela de agosto em aberto; cliente prometeu pagar até sexta.',
    '2026-10-05',
    'REGISTRADA',
  ),
  interacao(
    4,
    C,
    'Rogério Tavares',
    'RETORNO',
    'Retornar com a simulação do crédito pessoal.',
    '2026-10-05',
    'AGENDADA',
  ),
  interacao(
    5,
    C,
    'Restaurante Sabor da Terra',
    'WHATSAPP',
    'Enviar a lista de documentos da empresa.',
    '2026-10-08',
    'AGENDADA',
  ),
  interacao(
    6,
    C,
    'Mecânica Irmãos Lopes',
    'PENDENCIA_DOCUMENTAL',
    'Falta o último balanço assinado pelo contador.',
    '2026-10-10',
    'AGENDADA',
  ),
  interacao(
    7,
    C,
    'Academia Corpo em Forma',
    'LIGACAO',
    'Primeiro contato para apresentar as linhas de crédito.',
    '2026-10-09',
    'AGENDADA',
  ),
  interacao(
    8,
    R,
    'Lavanderia Brilho',
    'VISITA',
    'Coletar documentos da empresa.',
    '2026-10-09',
    'AGENDADA',
  ),
  interacao(
    9,
    M,
    'Auto Peças Central',
    'LIGACAO',
    'Apresentação inicial.',
    '2026-10-03',
    'REGISTRADA',
  ),
];

// ---------------------------------------------------------------- comissao

const SEMENTE_REGRAS: RegraComissao[] = [
  {
    id: 'r1000000-0000-4000-8000-000000000001',
    produto: 'Capital de giro',
    base: 'VALOR_LIBERADO',
    percentual: 2,
    gatilhoPagamento: 'Após a liberação do crédito',
    versao: 1,
    vigenteDesde: '2026-01-01',
    atualizadoPor: 'sistema',
  },
  {
    id: 'r1000000-0000-4000-8000-000000000002',
    produto: 'Crédito pessoal',
    base: 'VALOR_LIBERADO',
    percentual: 3,
    gatilhoPagamento: 'Após a liberação do crédito',
    versao: 1,
    vigenteDesde: '2026-01-01',
    atualizadoPor: 'sistema',
  },
  {
    id: 'r1000000-0000-4000-8000-000000000003',
    produto: 'Todos os produtos',
    base: 'PARCELA_RECEBIDA',
    percentual: 0.5,
    gatilhoPagamento: 'Mensal, sobre a parcela efetivamente recebida',
    versao: 1,
    vigenteDesde: '2026-01-01',
    atualizadoPor: 'sistema',
  },
];

const SEMENTE_METAS: MetaCorrespondente[] = [C, R, M].map((id, i) => ({
  correspondenteId: id,
  periodo: '2026',
  metaClientes: [8, 5, 4][i],
  metaValorOriginado: [150000, 100000, 60000][i],
  realizadoClientes: 0,
  realizadoValorOriginado: 0,
  atingimentoClientesPct: 0,
  atingimentoValorPct: 0,
}));

// ---------------------------------------------------------------- auditoria

const SEMENTE_AUDITORIA: EventoAuditoria[] = [
  ev(
    1,
    '2026-09-30T16:10:00-03:00',
    'admin@empresa.com',
    'ADMIN',
    'CADASTRO_RENOVADO',
    'Correspondente',
    ID_CORRESPONDENTE_CARLA,
    'Validade 31/03/2026 → 31/03/2027, dados cadastrais atualizados.',
  ),
  ev(
    2,
    '2026-10-02T09:46:00-03:00',
    'backoffice@empresa.com',
    'BACKOFFICE',
    'ENVIO_VALIDADO',
    'Envio de documentos',
    'e1000000-0000-4000-8000-000000000003',
    'Envio de Pedro Henrique Alves validado.',
  ),
  ev(
    3,
    '2026-09-28T15:30:00-03:00',
    'backoffice@empresa.com',
    'BACKOFFICE',
    'ENVIO_DEVOLVIDO',
    'Envio de documentos',
    'e1000000-0000-4000-8000-000000000002',
    'Devolvido: contrato social sem a última alteração contratual.',
  ),
  ev(
    4,
    '2026-10-05T10:20:00-03:00',
    'correspondente@empresa.com',
    'CORRESPONDENTE',
    'ENVIO_CRIADO',
    'Envio de documentos',
    'e1000000-0000-4000-8000-000000000001',
    'Envio de Ana Beatriz Costa com atesto de conferência.',
  ),
  ev(
    5,
    '2026-08-14T11:00:00-03:00',
    'admin@empresa.com',
    'ADMIN',
    'REGRA_COMISSAO_ALTERADA',
    'Regra de comissão',
    'r1000000-0000-4000-8000-000000000002',
    'Crédito pessoal: 2,50% → 3,00%. Justificativa: política comercial do 2º semestre.',
  ),
  ev(
    6,
    '2026-09-01T08:00:00-03:00',
    'sistema',
    'SISTEMA',
    'META_ALTERADA',
    'Meta',
    ID_CORRESPONDENTE_RAFAEL,
    'Meta anual definida: 5 clientes e R$ 100.000,00 originados.',
  ),
  ev(
    7,
    '2026-10-06T14:05:00-03:00',
    'correspondente@empresa.com',
    'CORRESPONDENTE',
    'PROSPECT_MOVIDO',
    'Prospect',
    'p1000000-0000-4000-8000-000000000005',
    'Mecânica Irmãos Lopes: Contatado → Em negociação.',
  ),
];

function ev(
  n: number,
  quando: string,
  ator: string,
  papel: string,
  acao: AcaoAuditoria,
  entidade: string,
  entidadeId: string,
  detalhe: string,
): EventoAuditoria {
  return {
    id: `a1000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`,
    quando,
    ator,
    papel,
    acao,
    entidade,
    entidadeId,
    detalhe,
  };
}

// ---------------------------------------------------------------- estado

let prospects: ProspectInterno[] = [];
let interacoes: InteracaoInterna[] = [];
let regras: RegraComissao[] = [];
let metas: MetaCorrespondente[] = [];
let auditoria: EventoAuditoria[] = [];
let seq = 0;

export function resetGestaoState(): void {
  prospects = SEMENTE_PROSPECTS.map((p) => ({ ...p }));
  interacoes = SEMENTE_INTERACOES.map((i) => ({ ...i }));
  regras = SEMENTE_REGRAS.map((r) => ({ ...r }));
  metas = SEMENTE_METAS.map((m) => ({ ...m }));
  auditoria = SEMENTE_AUDITORIA.map((e) => ({ ...e }));
  seq = 0;
}
resetGestaoState();

// ---------------------------------------------------------------- auditoria (publico)

export function registrarAuditoria(
  ator: string,
  papel: string,
  acao: AcaoAuditoria,
  entidade: string,
  entidadeId: string,
  detalhe: string,
): void {
  seq += 1;
  auditoria.unshift({
    id: `a1000000-0000-4000-8000-0000000001${String(seq).padStart(2, '0')}`,
    quando: `${HOJE_DEMO}T${String(9 + (seq % 9)).padStart(2, '0')}:${String((seq * 7) % 60).padStart(2, '0')}:00-03:00`,
    ator,
    papel,
    acao,
    entidade,
    entidadeId,
    detalhe,
  });
}

export function listarAuditoria(): EventoAuditoria[] {
  return [...auditoria].sort((a, b) => b.quando.localeCompare(a.quando));
}

// ---------------------------------------------------------------- funil (publico)

export function listarProspectsDe(id: string): ProspectResponse[] {
  return prospects.filter((p) => p.correspondenteId === id).map(semDono);
}

function semDono<T extends { correspondenteId: string }>(item: T): Omit<T, 'correspondenteId'> {
  // O dono nao sai da API: copia e remove o campo, sem desestruturar para descartar.
  const copia: Partial<T> = { ...item };
  delete copia.correspondenteId;
  return copia as Omit<T, 'correspondenteId'>;
}

export function criarProspect(id: string, body: CriarProspectRequest): ProspectResponse {
  seq += 1;
  const novo: ProspectInterno = {
    id: `p1000000-0000-4000-8000-0000000001${String(seq).padStart(2, '0')}`,
    correspondenteId: id,
    nome: body.nome,
    tipoPessoa: body.tipoPessoa,
    telefone: body.telefone,
    produtoInteresse: body.produtoInteresse,
    valorEstimado: body.valorEstimado,
    etapa: 'PROSPECTADO',
    origem: 'Cadastro direto',
    criadoEm: HOJE_DEMO,
    atualizadoEm: HOJE_DEMO,
    proximoContato: null,
    motivoPerda: null,
  };
  prospects.unshift(novo);
  return semDono(novo) as ProspectResponse;
}

/** Devolve o prospect e a etapa anterior; so mexe em prospect do proprio correspondente. */
export function moverEtapa(
  id: string,
  prospectId: string,
  etapa: EtapaFunil,
  motivoPerda?: string,
): { prospect: ProspectResponse; anterior: EtapaFunil } | undefined {
  const p = prospects.find((x) => x.id === prospectId && x.correspondenteId === id);
  if (!p) return undefined;
  const anterior = p.etapa;
  p.etapa = etapa;
  p.atualizadoEm = HOJE_DEMO;
  p.motivoPerda = etapa === 'PERDIDO' ? (motivoPerda ?? 'Não informado') : null;
  return { prospect: semDono(p) as ProspectResponse, anterior };
}

// ---------------------------------------------------------------- agenda (publico)

function statusReal(i: InteracaoInterna): InteracaoResponse['status'] {
  return i.status === 'AGENDADA' && i.data < HOJE_DEMO ? 'ATRASADA' : i.status;
}

export function listarInteracoesDe(id: string): InteracaoResponse[] {
  return interacoes
    .filter((i) => i.correspondenteId === id)
    .map((i) => ({ ...(semDono(i) as InteracaoResponse), status: statusReal(i) }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

export function criarInteracao(id: string, body: CriarInteracaoRequest): InteracaoResponse {
  seq += 1;
  const nova: InteracaoInterna = {
    id: `i1000000-0000-4000-8000-0000000001${String(seq).padStart(2, '0')}`,
    correspondenteId: id,
    clienteNome: body.clienteNome,
    prospectId: null,
    tipo: body.tipo,
    descricao: body.descricao,
    data: body.data,
    status: body.agendar ? 'AGENDADA' : 'REGISTRADA',
  };
  interacoes.push(nova);
  return { ...(semDono(nova) as InteracaoResponse), status: statusReal(nova) };
}

export function concluirInteracao(id: string, interacaoId: string): InteracaoResponse | undefined {
  const i = interacoes.find((x) => x.id === interacaoId && x.correspondenteId === id);
  if (!i) return undefined;
  i.status = 'CONCLUIDA';
  return { ...(semDono(i) as InteracaoResponse), status: 'CONCLUIDA' };
}

// ---------------------------------------------------------------- comissao (publico)

export function listarRegras(): RegraComissao[] {
  return regras.map((r) => ({ ...r }));
}

/** Nova versao da regra: o historico fica nos lancamentos, que guardam a versao usada. */
export function atualizarRegra(
  id: string,
  percentual: number,
  ator: string,
): { regra: RegraComissao; anterior: number } | undefined {
  const r = regras.find((x) => x.id === id);
  if (!r) return undefined;
  const anterior = r.percentual;
  r.percentual = percentual;
  r.versao += 1;
  r.vigenteDesde = HOJE_DEMO;
  r.atualizadoPor = ator;
  return { regra: { ...r }, anterior };
}

function regraDe(produto: string, base: RegraComissao['base']): RegraComissao | undefined {
  return regras.find(
    (r) => r.base === base && (r.produto === produto || r.produto === 'Todos os produtos'),
  );
}

/**
 * Livro de comissoes do correspondente, derivado dos contratos dos clientes que ele captou. Cada
 * evento so conta se aconteceu dentro da vigencia do vinculo: perdida a base, o que ja foi gerado
 * fica e o que viria depois nao nasce.
 */
export function lancamentosDe(id: string): LancamentoComissao[] {
  const nome = consultarCorrespondente(id)?.nome ?? '';
  const vinculos = listarBaseDe(id);
  const operacoes = listarTodasOperacoes().filter((o) => o.tipo === 'CONTRATO');
  const lancamentos: LancamentoComissao[] = [];
  const mesAtual = HOJE_DEMO.slice(0, 7);

  for (const op of operacoes) {
    const v = vinculos.find((x) => x.clienteNome === op.clienteNome);
    if (!v) continue;
    const dentro = (data: string) => data >= v.inicio && (!v.fim || data <= v.fim);

    const ro = regraDe(op.produto, 'VALOR_LIBERADO');
    if (ro && op.contratadoEm && dentro(op.contratadoEm)) {
      const competencia = op.contratadoEm.slice(0, 7);
      lancamentos.push({
        id: `l-${op.numero}-O`,
        correspondenteId: id,
        correspondenteNome: nome,
        clienteNome: op.clienteNome,
        contratoNumero: op.numero,
        evento: 'ORIGINACAO',
        competencia,
        baseCalculo: op.valorContratado,
        percentual: ro.percentual,
        valor: Math.round(op.valorContratado * ro.percentual) / 100,
        status: competencia < mesAtual ? 'PAGA' : 'DISPONIVEL',
        pagoEm: competencia < mesAtual ? `${somarMeses(`${competencia}-01`, 1)}` : null,
        regraVersao: ro.versao,
      });
    }

    const rp = regraDe(op.produto, 'PARCELA_RECEBIDA');
    if (!rp) continue;
    for (const p of op.parcelas) {
      const competencia = p.vencimento.slice(0, 7);
      const paga = p.status === 'PAGA';
      if (p.status === 'VENCIDA') continue; // sem recebimento, sem comissao
      if (paga && !dentro(p.pagoEm ?? p.vencimento)) continue;
      if (!paga && v.fim) continue; // base perdida: parcela futura nao gera
      lancamentos.push({
        id: `l-${op.numero}-P${p.numero}`,
        correspondenteId: id,
        correspondenteNome: nome,
        clienteNome: op.clienteNome,
        contratoNumero: op.numero,
        evento: 'PARCELA_RECEBIDA',
        competencia,
        baseCalculo: p.valor,
        percentual: rp.percentual,
        valor: Math.round(p.valor * rp.percentual) / 100,
        status: !paga ? 'PREVISTA' : competencia < mesAtual ? 'PAGA' : 'DISPONIVEL',
        pagoEm: paga && competencia < mesAtual ? `${somarMeses(`${competencia}-01`, 1)}` : null,
        regraVersao: rp.versao,
      });
    }
  }
  return lancamentos.sort((a, b) => b.competencia.localeCompare(a.competencia));
}

export function comissoesDe(id: string): ComissoesResponse {
  const l = lancamentosDe(id);
  const soma = (s: LancamentoComissao['status'][]) =>
    Math.round(l.filter((x) => s.includes(x.status)).reduce((t, x) => t + x.valor, 0) * 100) / 100;
  const mesAtual = HOJE_DEMO.slice(0, 7);
  const porMes = Array.from({ length: 6 }, (_, i) => {
    const mes = somarMeses(`${mesAtual}-01`, i - 3).slice(0, 7);
    return {
      mes,
      valor:
        Math.round(
          l
            .filter((x) => x.competencia === mes && x.status !== 'PREVISTA')
            .reduce((t, x) => t + x.valor, 0) * 100,
        ) / 100,
    };
  });
  return {
    acumulada: soma(['PAGA', 'DISPONIVEL']),
    prevista: soma(['PREVISTA']),
    disponivel: soma(['DISPONIVEL']),
    paga: soma(['PAGA']),
    estornada: soma(['ESTORNADA']),
    porMes,
    lancamentos: l,
  };
}

export function comissaoPrevistaDe(id: string): number {
  const c = comissoesDe(id);
  return Math.round((c.prevista + c.disponivel) * 100) / 100;
}

export function lancamentosDaRede(): LancamentoComissao[] {
  return consultarRede()
    .correspondentes.flatMap((c) => lancamentosDe(c.id))
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}

// ---------------------------------------------------------------- metas e desempenho (publico)

function metaDe(id: string): MetaCorrespondente {
  const base = metas.find((m) => m.correspondenteId === id) ?? SEMENTE_METAS[0];
  const clientes = listarBaseDe(id).length;
  const valor = listarTodasOperacoes()
    .filter(
      (o) => o.tipo === 'CONTRATO' && listarBaseDe(id).some((v) => v.clienteNome === o.clienteNome),
    )
    .reduce((t, o) => t + o.valorContratado, 0);
  const pct = (real: number, meta: number) => (meta ? Math.round((real / meta) * 1000) / 10 : 0);
  return {
    ...base,
    realizadoClientes: clientes,
    realizadoValorOriginado: valor,
    atingimentoClientesPct: pct(clientes, base.metaClientes),
    atingimentoValorPct: pct(valor, base.metaValorOriginado),
  };
}

export function atualizarMeta(
  id: string,
  body: AtualizarMetaRequest,
): { meta: MetaCorrespondente; anterior: MetaCorrespondente } | undefined {
  const m = metas.find((x) => x.correspondenteId === id);
  if (!m) return undefined;
  const anterior = metaDe(id);
  m.metaClientes = body.metaClientes;
  m.metaValorOriginado = body.metaValorOriginado;
  return { meta: metaDe(id), anterior };
}

function desempenhoBase(id: string): Omit<DesempenhoCorrespondente, 'posicao'> {
  const c = consultarCorrespondente(id)!;
  const meusProspects = prospects.filter((p) => p.correspondenteId === id);
  const contratadosFunil = meusProspects.filter(
    (p) => p.etapa === 'CONTRATADO' || p.etapa === 'ATIVO',
  ).length;
  const meta = metaDe(id);
  const lanc = lancamentosDe(id);
  const soma = (f: (l: LancamentoComissao) => boolean) =>
    Math.round(lanc.filter(f).reduce((t, l) => t + l.valor, 0) * 100) / 100;
  return {
    correspondenteId: id,
    nome: c.nome,
    clientesCaptados: meta.realizadoClientes,
    prospects: meusProspects.length,
    contratados: contratadosFunil,
    taxaConversaoPct: meusProspects.length
      ? Math.round((contratadosFunil / meusProspects.length) * 1000) / 10
      : 0,
    valorOriginado: meta.realizadoValorOriginado,
    contratos: new Set(lanc.filter((l) => l.evento === 'ORIGINACAO').map((l) => l.contratoNumero))
      .size,
    carteiraAtiva: c.valorCarteira,
    inadimplenciaPct: c.inadimplenciaPct,
    comissaoGerada: soma((l) => l.status === 'PAGA' || l.status === 'DISPONIVEL'),
    comissaoPaga: soma((l) => l.status === 'PAGA'),
    atingimentoMetaPct:
      Math.round(((meta.atingimentoClientesPct + meta.atingimentoValorPct) / 2) * 10) / 10,
  };
}

export function desempenhoDaRede(): DesempenhoRedeResponse {
  const ids = consultarRede().correspondentes.map((c) => c.id);
  const ranking = ids
    .map(desempenhoBase)
    .sort((a, b) => b.valorOriginado - a.valorOriginado)
    .map((d, i) => ({ ...d, posicao: i + 1 }));
  return { ranking, metas: ids.map(metaDe) };
}

export function meuDesempenho(id: string): MeuDesempenhoResponse {
  const { ranking } = desempenhoDaRede();
  return {
    meu: ranking.find((r) => r.correspondenteId === id)!,
    meta: metaDe(id),
    totalCorrespondentes: ranking.length,
  };
}

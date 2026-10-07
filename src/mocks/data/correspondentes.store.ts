import type {
  CarteiraResumo,
  CorrespondenteResponse,
  OperacaoClienteResponse,
  ParcelaContrato,
  SituacaoOperacao,
  EnvioDocumentosResponse,
  EnviarDocumentosRequest,
  ProcessarVigenciaResponse,
  RedeResumoResponse,
  ResumoCorrespondenteResponse,
  StatusCadastroCorrespondente,
  ValidarEnvioRequest,
  VinculoResponse,
} from '../../app/core/correspondentes/correspondentes.models';

// Dados ficticios do modulo de Correspondentes, no mesmo espirito dos demais mocks do SEP. As
// regras abaixo (vigencia, perda de base, validacao) espelham o que o backend precisa fazer; aqui
// existem so para o front ser demonstravel antes do contrato real.

/** "Hoje" do ambiente de demonstracao, fixo para a demonstracao ser reproduzivel. */
export const HOJE_DEMO = '2026-10-07';
const JANELA_A_VENCER_DIAS = 30;

interface CorrespondenteBase {
  id: string;
  nome: string;
  cpfMascarado: string;
  email: string;
  validadeCadastro: string;
  cadastroAtualizadoEm: string;
  suspenso: boolean;
  comissaoPrevista: number;
}

export const ID_CORRESPONDENTE_CARLA = 'c1000000-0000-4000-8000-000000000001';
export const ID_CORRESPONDENTE_RAFAEL = 'c1000000-0000-4000-8000-000000000002';
export const ID_CORRESPONDENTE_MARCOS = 'c1000000-0000-4000-8000-000000000003';

const SEMENTE_CORRESPONDENTES: CorrespondenteBase[] = [
  {
    id: ID_CORRESPONDENTE_CARLA,
    nome: 'Carla Mendes',
    cpfMascarado: '***.482.915-**',
    email: 'correspondente@empresa.com',
    validadeCadastro: '2027-03-31',
    cadastroAtualizadoEm: '2026-09-30',
    suspenso: false,
    comissaoPrevista: 4280,
  },
  {
    id: ID_CORRESPONDENTE_RAFAEL,
    nome: 'Rafael Souza',
    cpfMascarado: '***.730.264-**',
    email: 'rafael.souza@empresa.com',
    validadeCadastro: '2026-10-25',
    cadastroAtualizadoEm: '2026-04-12',
    suspenso: false,
    comissaoPrevista: 2150,
  },
  {
    id: ID_CORRESPONDENTE_MARCOS,
    nome: 'Marcos Lima',
    cpfMascarado: '***.119.508-**',
    email: 'correspondente-vencido@empresa.com',
    validadeCadastro: '2026-09-15',
    cadastroAtualizadoEm: '2025-09-15',
    suspenso: false,
    comissaoPrevista: 960,
  },
];

function vinculo(
  n: number,
  correspondenteId: string,
  clienteNome: string,
  doc: string,
  inicio: string,
  cita: boolean | null,
): VinculoResponse {
  return {
    id: `v1000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`,
    correspondenteId,
    correspondenteNome: null,
    clienteNome,
    clienteDocumentoMascarado: doc,
    status: 'VIGENTE',
    inicio,
    fim: null,
    motivoFim: null,
    ultimaPropostaCitaCorrespondente: cita,
  };
}

const SEMENTE_VINCULOS: VinculoResponse[] = [
  vinculo(
    1,
    ID_CORRESPONDENTE_CARLA,
    'Padaria Estrela Ltda',
    '**.481.220/0001-**',
    '2026-02-10',
    true,
  ),
  vinculo(2, ID_CORRESPONDENTE_CARLA, 'João da Silva', '***.250.771-**', '2026-03-04', true),
  vinculo(
    3,
    ID_CORRESPONDENTE_CARLA,
    'Oficina Rápida ME',
    '**.903.114/0001-**',
    '2026-05-19',
    null,
  ),
  vinculo(4, ID_CORRESPONDENTE_CARLA, 'Ana Beatriz Costa', '***.617.402-**', '2026-06-22', true),
  vinculo(
    5,
    ID_CORRESPONDENTE_CARLA,
    'Mercado Bom Preço',
    '**.552.870/0001-**',
    '2026-08-03',
    false,
  ),
  vinculo(
    6,
    ID_CORRESPONDENTE_RAFAEL,
    'Clínica Vida Plena',
    '**.221.640/0001-**',
    '2026-01-15',
    true,
  ),
  vinculo(
    7,
    ID_CORRESPONDENTE_RAFAEL,
    'Pedro Henrique Alves',
    '***.804.133-**',
    '2026-04-27',
    true,
  ),
  vinculo(
    8,
    ID_CORRESPONDENTE_MARCOS,
    'Transportes Horizonte',
    '**.776.019/0001-**',
    '2026-03-12',
    true,
  ),
  vinculo(9, ID_CORRESPONDENTE_MARCOS, 'Luciana Prado', '***.395.826-**', '2026-07-01', null),
];

const SEMENTE_ENVIOS: EnvioDocumentosResponse[] = [
  {
    id: 'e1000000-0000-4000-8000-000000000001',
    correspondenteId: ID_CORRESPONDENTE_CARLA,
    correspondenteNome: 'Carla Mendes',
    clienteNome: 'Ana Beatriz Costa',
    enviadoEm: '2026-10-05T10:20:00-03:00',
    documentos: [
      { tipo: 'Documento de identidade', nomeArquivo: 'rg-ana-beatriz.pdf' },
      { tipo: 'Comprovante de renda', nomeArquivo: 'holerite-set-2026.pdf' },
    ],
    atestoConferencia: true,
    status: 'EM_VALIDACAO',
    observacaoBackoffice: null,
  },
  {
    id: 'e1000000-0000-4000-8000-000000000002',
    correspondenteId: ID_CORRESPONDENTE_CARLA,
    correspondenteNome: 'Carla Mendes',
    clienteNome: 'Mercado Bom Preço',
    enviadoEm: '2026-09-28T15:02:00-03:00',
    documentos: [{ tipo: 'Contrato social', nomeArquivo: 'contrato-social.pdf' }],
    atestoConferencia: true,
    status: 'DEVOLVIDO',
    observacaoBackoffice: 'Contrato social sem a última alteração contratual. Reenviar completo.',
  },
  {
    id: 'e1000000-0000-4000-8000-000000000003',
    correspondenteId: ID_CORRESPONDENTE_RAFAEL,
    correspondenteNome: 'Rafael Souza',
    clienteNome: 'Pedro Henrique Alves',
    enviadoEm: '2026-10-02T09:45:00-03:00',
    documentos: [
      { tipo: 'Documento de identidade', nomeArquivo: 'cnh-pedro.pdf' },
      { tipo: 'Comprovante de residência', nomeArquivo: 'conta-luz.pdf' },
    ],
    atestoConferencia: true,
    status: 'VALIDADO',
    observacaoBackoffice: null,
  },
];

// ---- Operacoes (propostas e contratos) dos clientes da base ----

function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(d, ultimo));
  return base.toISOString().slice(0, 10);
}

interface ContratoSemente {
  numero: string;
  cliente: string;
  produto: string;
  valor: number;
  parcela: number;
  total: number;
  primeiroVencimento: string;
  pagas: number;
}

interface PropostaSemente {
  numero: string;
  cliente: string;
  produto: string;
  valor: number;
  situacao: 'EM_ANALISE' | 'EM_FORMALIZACAO' | 'RECUSADA';
}

const SEMENTE_CONTRATOS: ContratoSemente[] = [
  {
    numero: 'CT-2026-0412',
    cliente: 'Padaria Estrela Ltda',
    produto: 'Capital de giro',
    valor: 60000,
    parcela: 5650,
    total: 12,
    primeiroVencimento: '2026-03-10',
    pagas: 7,
  },
  {
    numero: 'CT-2026-0431',
    cliente: 'João da Silva',
    produto: 'Crédito pessoal',
    valor: 18000,
    parcela: 1980,
    total: 10,
    primeiroVencimento: '2026-04-04',
    pagas: 7,
  },
  {
    numero: 'CT-2026-0502',
    cliente: 'Ana Beatriz Costa',
    produto: 'Crédito pessoal',
    valor: 12000,
    parcela: 1190,
    total: 12,
    primeiroVencimento: '2026-07-22',
    pagas: 1,
  },
  {
    numero: 'CT-2026-0301',
    cliente: 'Clínica Vida Plena',
    produto: 'Capital de giro',
    valor: 120000,
    parcela: 7940,
    total: 18,
    primeiroVencimento: '2026-02-15',
    pagas: 8,
  },
  {
    numero: 'CT-2026-0466',
    cliente: 'Pedro Henrique Alves',
    produto: 'Crédito pessoal',
    valor: 9000,
    parcela: 1620,
    total: 6,
    primeiroVencimento: '2026-05-27',
    pagas: 6,
  },
  {
    numero: 'CT-2026-0388',
    cliente: 'Transportes Horizonte',
    produto: 'Capital de giro',
    valor: 45000,
    parcela: 4310,
    total: 12,
    primeiroVencimento: '2026-04-12',
    pagas: 3,
  },
];

const SEMENTE_PROPOSTAS: PropostaSemente[] = [
  {
    numero: 'PR-2026-0877',
    cliente: 'Oficina Rápida ME',
    produto: 'Capital de giro',
    valor: 35000,
    situacao: 'EM_ANALISE',
  },
  {
    numero: 'PR-2026-0910',
    cliente: 'Mercado Bom Preço',
    produto: 'Capital de giro',
    valor: 80000,
    situacao: 'EM_FORMALIZACAO',
  },
  {
    numero: 'PR-2026-0845',
    cliente: 'Luciana Prado',
    produto: 'Crédito pessoal',
    valor: 15000,
    situacao: 'RECUSADA',
  },
];

function idOperacao(numero: string): string {
  return `o1000000-0000-4000-8000-${numero.replace(/\D/g, '').padStart(12, '0')}`;
}

function montarContrato(c: ContratoSemente, doc: string): OperacaoClienteResponse {
  const parcelas: ParcelaContrato[] = [];
  for (let i = 1; i <= c.total; i += 1) {
    const vencimento = somarMeses(c.primeiroVencimento, i - 1);
    const paga = i <= c.pagas;
    const atraso = !paga && diasEntre(vencimento, HOJE_DEMO) > 0;
    parcelas.push({
      numero: i,
      vencimento,
      valor: c.parcela,
      status: paga ? 'PAGA' : atraso ? 'VENCIDA' : 'A_VENCER',
      pagoEm: paga ? (vencimento > HOJE_DEMO ? HOJE_DEMO : vencimento) : null,
      diasAtraso: atraso ? diasEntre(vencimento, HOJE_DEMO) : 0,
    });
  }
  const vencidas = parcelas.filter((p) => p.status === 'VENCIDA');
  const abertas = parcelas.filter((p) => p.status !== 'PAGA');
  const situacao: SituacaoOperacao = !abertas.length
    ? 'QUITADO'
    : vencidas.length
      ? 'EM_ATRASO'
      : 'EM_DIA';
  return {
    id: idOperacao(c.numero),
    numero: c.numero,
    tipo: 'CONTRATO',
    clienteNome: c.cliente,
    clienteDocumentoMascarado: doc,
    produto: c.produto,
    situacao,
    valorContratado: c.valor,
    valorParcela: c.parcela,
    totalParcelas: c.total,
    parcelasPagas: parcelas.filter((p) => p.status === 'PAGA').length,
    parcelasVencidas: vencidas.length,
    valorPago: parcelas.filter((p) => p.status === 'PAGA').reduce((t, p) => t + p.valor, 0),
    valorEmAtraso: vencidas.reduce((t, p) => t + p.valor, 0),
    saldoAReceber: abertas.reduce((t, p) => t + p.valor, 0),
    proximoVencimento: abertas[0]?.vencimento ?? null,
    contratadoEm: somarMeses(c.primeiroVencimento, -1),
    parcelas,
  };
}

function montarProposta(p: PropostaSemente, doc: string): OperacaoClienteResponse {
  return {
    id: idOperacao(p.numero),
    numero: p.numero,
    tipo: 'PROPOSTA',
    clienteNome: p.cliente,
    clienteDocumentoMascarado: doc,
    produto: p.produto,
    situacao: p.situacao,
    valorContratado: p.valor,
    valorParcela: 0,
    totalParcelas: 0,
    parcelasPagas: 0,
    parcelasVencidas: 0,
    valorPago: 0,
    valorEmAtraso: 0,
    saldoAReceber: 0,
    proximoVencimento: null,
    contratadoEm: null,
    parcelas: [],
  };
}

function documentoDe(cliente: string): string {
  return SEMENTE_VINCULOS.find((v) => v.clienteNome === cliente)?.clienteDocumentoMascarado ?? '';
}

const OPERACOES: OperacaoClienteResponse[] = [
  ...SEMENTE_CONTRATOS.map((c) => montarContrato(c, documentoDe(c.cliente))),
  ...SEMENTE_PROPOSTAS.map((p) => montarProposta(p, documentoDe(p.cliente))),
];

/**
 * O correspondente so enxerga as operacoes de clientes cujo vinculo com ele esta vigente. Perdida a
 * base, a leitura acaba junto: e a mesma regra que o backend precisa aplicar na camada de dados.
 */
export function listarOperacoesDe(id: string): OperacaoClienteResponse[] {
  const clientes = new Set(
    vinculos
      .filter((v) => v.correspondenteId === id && v.status === 'VIGENTE')
      .map((v) => v.clienteNome),
  );
  return OPERACOES.filter((o) => clientes.has(o.clienteNome)).map((o) => ({
    ...o,
    parcelas: o.parcelas.map((p) => ({ ...p })),
  }));
}

function resumirCarteira(id: string): CarteiraResumo {
  const ops = listarOperacoesDe(id);
  const contratos = ops.filter((o) => o.tipo === 'CONTRATO');
  const parcelas = contratos.flatMap((o) => o.parcelas);
  const devidas = parcelas.filter((p) => p.status === 'VENCIDA' || p.pagoEm !== null).length;
  const porSituacao: Record<SituacaoOperacao, number> = {
    EM_ANALISE: 0,
    EM_FORMALIZACAO: 0,
    EM_DIA: 0,
    EM_ATRASO: 0,
    QUITADO: 0,
    RECUSADA: 0,
  };
  for (const o of ops) porSituacao[o.situacao] += 1;

  // Proximos seis meses a partir do mes corrente, so com parcelas ainda em aberto.
  const mesAtual = HOJE_DEMO.slice(0, 7);
  const aReceberPorMes = Array.from({ length: 6 }, (_, i) => {
    const mes = somarMeses(`${mesAtual}-01`, i).slice(0, 7);
    const valor = parcelas
      .filter((p) => p.status === 'A_VENCER' && p.vencimento.slice(0, 7) === mes)
      .reduce((t, p) => t + p.valor, 0);
    return { mes, valor };
  });

  const vencidas = parcelas.filter((p) => p.status === 'VENCIDA').length;
  return {
    contratosAtivos: contratos.filter((o) => o.situacao === 'EM_DIA' || o.situacao === 'EM_ATRASO')
      .length,
    valorContratado: contratos.reduce((t, o) => t + o.valorContratado, 0),
    valorEmAtraso: contratos.reduce((t, o) => t + o.valorEmAtraso, 0),
    saldoAReceber: contratos.reduce((t, o) => t + o.saldoAReceber, 0),
    parcelasPagas: parcelas.filter((p) => p.status === 'PAGA').length,
    parcelasEmDia: parcelas.filter((p) => p.status === 'A_VENCER').length,
    parcelasVencidas: vencidas,
    inadimplenciaPct: devidas ? Math.round((vencidas / devidas) * 1000) / 10 : 0,
    porSituacao,
    aReceberPorMes,
  };
}

let correspondentes: CorrespondenteBase[] = [];
let vinculos: VinculoResponse[] = [];
let envios: EnvioDocumentosResponse[] = [];
let seqEnvio = 0;
let seqVinculo = 0;

export function resetCorrespondentesState(): void {
  correspondentes = SEMENTE_CORRESPONDENTES.map((c) => ({ ...c }));
  vinculos = SEMENTE_VINCULOS.map((v) => ({ ...v }));
  envios = SEMENTE_ENVIOS.map((e) => ({ ...e, documentos: [...e.documentos] }));
  seqEnvio = 0;
  seqVinculo = 0;
}
resetCorrespondentesState();

function diasEntre(deIso: string, ateIso: string): number {
  const ms = Date.parse(`${ateIso}T00:00:00Z`) - Date.parse(`${deIso}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function statusDoCadastro(c: CorrespondenteBase): StatusCadastroCorrespondente {
  if (c.suspenso) return 'SUSPENSO';
  const dias = diasEntre(HOJE_DEMO, c.validadeCadastro);
  if (dias < 0) return 'VENCIDO';
  if (dias <= JANELA_A_VENCER_DIAS) return 'A_VENCER';
  return 'ATIVO';
}

function nomeDoCorrespondente(id: string | null): string | null {
  return correspondentes.find((c) => c.id === id)?.nome ?? null;
}

function comNome(v: VinculoResponse): VinculoResponse {
  return { ...v, correspondenteNome: nomeDoCorrespondente(v.correspondenteId) };
}

function montar(c: CorrespondenteBase): CorrespondenteResponse {
  const carteira = resumirCarteira(c.id);
  return {
    id: c.id,
    nome: c.nome,
    cpfMascarado: c.cpfMascarado,
    email: c.email,
    status: statusDoCadastro(c),
    validadeCadastro: c.validadeCadastro,
    cadastroAtualizadoEm: c.cadastroAtualizadoEm,
    diasParaVencer: diasEntre(HOJE_DEMO, c.validadeCadastro),
    clientesNaBase: vinculos.filter((v) => v.correspondenteId === c.id && v.status === 'VIGENTE')
      .length,
    envios: envios.filter((e) => e.correspondenteId === c.id).length,
    comissaoPrevista: c.comissaoPrevista,
    valorCarteira: carteira.valorContratado,
    valorEmAtraso: carteira.valorEmAtraso,
    inadimplenciaPct: carteira.inadimplenciaPct,
  };
}

export function correspondentePorEmail(email: string): CorrespondenteResponse | undefined {
  const c = correspondentes.find((x) => x.email === email);
  return c ? montar(c) : undefined;
}

export function consultarRede(): RedeResumoResponse {
  const lista = correspondentes.map(montar);
  return {
    correspondentes: lista,
    totalClientesNaBase: vinculos.filter((v) => v.status === 'VIGENTE').length,
    totalClientesDiretoSep: vinculos.filter((v) => v.status === 'DIRETO_SEP').length,
    cadastrosAVencer: lista.filter((c) => c.status === 'A_VENCER').length,
    cadastrosVencidos: lista.filter((c) => c.status === 'VENCIDO').length,
    enviosEmValidacao: envios.filter((e) => e.status === 'EM_VALIDACAO').length,
  };
}

export function consultarCorrespondente(id: string): CorrespondenteResponse | undefined {
  const c = correspondentes.find((x) => x.id === id);
  return c ? montar(c) : undefined;
}

/** Vinculos do correspondente, vigentes ou encerrados: o historico fica no proprio vinculo. */
export function listarBaseDe(id: string): VinculoResponse[] {
  return vinculos.filter((v) => v.correspondenteId === id).map(comNome);
}

/** Clientes que hoje operam direto com o SEP (perderam ou deixaram a base de um correspondente). */
export function listarDiretoSep(): VinculoResponse[] {
  return vinculos.filter((v) => v.status === 'DIRETO_SEP').map(comNome);
}

export function resumoDe(id: string): ResumoCorrespondenteResponse | undefined {
  const c = consultarCorrespondente(id);
  if (!c) return undefined;
  const meus = vinculos.filter((v) => v.correspondenteId === id);
  const meusEnvios = envios.filter((e) => e.correspondenteId === id);
  return {
    correspondente: c,
    carteira: resumirCarteira(id),
    vinculosVigentes: meus.filter((v) => v.status === 'VIGENTE').length,
    vinculosPerdidos: meus.filter((v) => v.status === 'PERDIDO').length,
    enviosEmValidacao: meusEnvios.filter((e) => e.status === 'EM_VALIDACAO').length,
    enviosValidados: meusEnvios.filter((e) => e.status === 'VALIDADO').length,
    enviosDevolvidos: meusEnvios.filter((e) => e.status === 'DEVOLVIDO').length,
  };
}

export function listarEnviosDe(id: string): EnvioDocumentosResponse[] {
  return envios.filter((e) => e.correspondenteId === id).map((e) => ({ ...e }));
}

export function listarTodosOsEnvios(): EnvioDocumentosResponse[] {
  return envios.map((e) => ({ ...e }));
}

export function renovarCadastro(
  id: string,
  novaValidade: string,
): CorrespondenteResponse | undefined {
  const c = correspondentes.find((x) => x.id === id);
  if (!c) return undefined;
  c.validadeCadastro = novaValidade;
  c.cadastroAtualizadoEm = HOJE_DEMO;
  return montar(c);
}

/**
 * Regra de perda por cadastro vencido: todo vinculo vigente de correspondente com cadastro vencido
 * passa a PERDIDO, com motivo e data, e o cliente fica livre para eleger outro correspondente ou o
 * SEP. Em producao e um job do backend; aqui roda por acao de tela.
 */
export function processarVigencia(): ProcessarVigenciaResponse {
  const afetados = new Set<string>();
  let encerrados = 0;
  for (const v of vinculos) {
    const dono = correspondentes.find((c) => c.id === v.correspondenteId);
    if (v.status === 'VIGENTE' && dono && statusDoCadastro(dono) === 'VENCIDO') {
      v.status = 'PERDIDO';
      v.fim = HOJE_DEMO;
      v.motivoFim = 'CADASTRO_VENCIDO';
      afetados.add(dono.nome);
      encerrados += 1;
    }
  }
  return { vinculosEncerrados: encerrados, correspondentesAfetados: [...afetados] };
}

/** Cliente elege outro correspondente ou o SEP direto: o vinculo antigo encerra e o novo nasce. */
export function reatribuirVinculo(
  vinculoId: string,
  destinoId: string | null,
): VinculoResponse | undefined {
  const atual = vinculos.find((v) => v.id === vinculoId);
  if (!atual) return undefined;
  seqVinculo += 1;
  const novo: VinculoResponse = {
    ...atual,
    id: `v1000000-0000-4000-8000-0000000001${String(seqVinculo).padStart(2, '0')}`,
    correspondenteId: destinoId,
    status: destinoId ? 'VIGENTE' : 'DIRETO_SEP',
    inicio: HOJE_DEMO,
    fim: null,
    motivoFim: null,
  };
  if (atual.status === 'VIGENTE') {
    atual.status = 'TRANSFERIDO';
    atual.fim = HOJE_DEMO;
    atual.motivoFim = 'TRANSFERENCIA_ADMIN';
  } else if (atual.status === 'PERDIDO') {
    // Cliente que perdeu o correspondente por vigencia: a eleicao e dele (ELEICAO_CLIENTE).
    atual.motivoFim = atual.motivoFim ?? 'ELEICAO_CLIENTE';
  }
  vinculos.push(novo);
  return comNome(novo);
}

export function registrarEnvio(
  correspondenteId: string,
  body: EnviarDocumentosRequest,
): EnvioDocumentosResponse {
  seqEnvio += 1;
  const envio: EnvioDocumentosResponse = {
    id: `e1000000-0000-4000-8000-0000000001${String(seqEnvio).padStart(2, '0')}`,
    correspondenteId,
    correspondenteNome: nomeDoCorrespondente(correspondenteId) ?? '',
    clienteNome: body.clienteNome,
    enviadoEm: `${HOJE_DEMO}T11:00:00-03:00`,
    documentos: body.documentos,
    atestoConferencia: body.atestoConferencia,
    status: 'EM_VALIDACAO',
    observacaoBackoffice: null,
  };
  envios.unshift(envio);
  return envio;
}

export function validarEnvio(
  id: string,
  body: ValidarEnvioRequest,
): EnvioDocumentosResponse | undefined {
  const envio = envios.find((e) => e.id === id);
  if (!envio) return undefined;
  envio.status = body.decisao === 'VALIDAR' ? 'VALIDADO' : 'DEVOLVIDO';
  envio.observacaoBackoffice = body.observacao || null;
  return { ...envio };
}

/** Todas as operacoes, sem filtro de vinculo: base do livro de comissoes, que sobrevive a perda da base. */
export function listarTodasOperacoes(): OperacaoClienteResponse[] {
  return OPERACOES.map((o) => ({ ...o, parcelas: o.parcelas.map((p) => ({ ...p })) }));
}

export { somarMeses, diasEntre };

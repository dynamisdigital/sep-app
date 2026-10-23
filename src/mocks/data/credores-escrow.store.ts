// Dados ficticios da conta escrow do credor e da gestao de credores (fase operacional, sem backend).
//
// Fonte de verdade: o livro-razao (`lancamentos`). Saldo, extrato, rateio e tesouraria sao SEMPRE
// derivados dele (escrow-ledger.ts), nunca digitados. As regras espelham a Res. CMN 5.050 e o modelo
// da conta escrow da Celcoin (destinatario pre-cadastrado, saque com aprovacao, partes fixas).

import { gerarCronograma } from '../../app/core/financeiro/calculo-financeiro';
import { TAXA_MENSAL_PADRAO } from '../../app/core/financeiro/politica-credito';
import type {
  AlocacaoRequest,
  AlocacaoResponse,
  AporteResponse,
  CategoriaInvestidor,
  ContaEscrowResponse,
  CredorGestaoResponse,
  DestinatarioRequest,
  DestinatarioResponse,
  DivergenciaEscrow,
  EventoAuditoriaCredor,
  LancamentoEscrow,
  LimiteDevedorResponse,
  OperacaoEscrowResponse,
  OportunidadeAlocavelResponse,
  OportunidadeTesourariaResponse,
  PerfilRiscoCredor,
  SaldoEscrow,
  SaqueResponse,
  StatusCredorGestao,
  TesourariaResumoResponse,
  TipoEventoCredor,
  TipoLancamentoEscrow,
} from '../../app/core/credores/credores-escrow.models';
import {
  MOVIMENTO,
  PRAZO_DIAS_UTEIS,
  adicionarDiasUteis,
  calcularLimiteDevedor,
  calcularSaldo,
  ratearParcela,
  saldoVazio,
  validarAlocacao,
  validarLancamento,
} from '../../app/core/credores/escrow-ledger';

// ---------- Identificadores ----------

/** Credoras que ja existem nas personas de login da jornada credora. */
export const ID_CREDOR_AURORA = '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001';
export const ID_CREDOR_BOREAL = '7f0799c0-98b9-6d9d-bc4a-7d6f5b780002';
/** Personas novas desta fase. */
export const ID_CREDOR_HELENA = '7f0799c0-98b9-6d9d-bc4a-7d6f5b780003';
export const ID_CREDOR_CARLOS = '7f0799c0-98b9-6d9d-bc4a-7d6f5b780004';
export const ID_CREDOR_MARINA = '7f0799c0-98b9-6d9d-bc4a-7d6f5b780005';

/** Usuario de login -> credor. A credora e um usuario CLIENTE; nao existe papel proprio. */
export const USUARIO_AURORA = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771006';
export const USUARIO_BOREAL = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771007';
export const USUARIO_HELENA = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771030';

/** Oportunidades do mock de credora (mesmos ids do handlers.ts). */
export const OPORTUNIDADE_BETA = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b001';
export const OPORTUNIDADE_ESTRELA = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b002';
export const OPERACAO_BETA = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

export interface OportunidadeEscrow {
  id: string;
  devedorId: string;
  devedorNome: string;
  /** Valor total a financiar: a soma das alocacoes nao pode passar disso. */
  valor: number;
  taxaJurosMensal: number;
  prazoMeses: number;
  disponivel: boolean;
}

const DEVEDOR_BETA = 'devedor-comercio-beta';
const DEVEDOR_ESTRELA = 'devedor-padaria-estrela';

function oportunidadesSeed(): Record<string, OportunidadeEscrow> {
  return {
    [OPORTUNIDADE_BETA]: {
      id: OPORTUNIDADE_BETA,
      devedorId: DEVEDOR_BETA,
      devedorNome: 'Comércio Beta ME',
      valor: 6000,
      taxaJurosMensal: TAXA_MENSAL_PADRAO,
      prazoMeses: 10,
      disponivel: false, // ja financiada
    },
    [OPORTUNIDADE_ESTRELA]: {
      id: OPORTUNIDADE_ESTRELA,
      devedorId: DEVEDOR_ESTRELA,
      devedorNome: 'Padaria Estrela ME',
      valor: 4625,
      taxaJurosMensal: 0.019,
      prazoMeses: 10,
      disponivel: true,
    },
  };
}

// ---------- Estado ----------

interface CredorInterno {
  id: string;
  usuarioId: string | null;
  nome: string;
  documentoMascarado: string;
  tipoPessoa: CredorGestaoResponse['tipoPessoa'];
  categoria: CategoriaInvestidor;
  perfilRisco: PerfilRiscoCredor | null;
  status: StatusCredorGestao;
  motivoStatus: string | null;
  termoQualificadoEm: string | null;
  cienciaRiscoEm: string | null;
  capacidadeAporte: number | null;
  dataCadastro: string;
  banco: string;
  agencia: string;
  conta: string;
}

interface OperacaoInterna {
  operacaoId: string;
  oportunidadeId: string;
  devedorNome: string;
  principal: number;
  taxaJurosMensal: number;
  prazoMeses: number;
  primeiroVencimento: string;
}

interface DestinatarioInterno extends DestinatarioResponse {
  credorId: string;
}

const BANCO_PARCEIRO = 'Banco parceiro (BaaS)';

let credores: CredorInterno[] = [];
let lancamentos: LancamentoEscrow[] = [];
let aportes: AporteResponse[] = [];
let alocacoes: AlocacaoResponse[] = [];
let destinatarios: DestinatarioInterno[] = [];
let saques: SaqueResponse[] = [];
let auditoria: EventoAuditoriaCredor[] = [];
let divergencias: DivergenciaEscrow[] = [];
let oportunidades: Record<string, OportunidadeEscrow> = {};
let repassesFeitos = new Set<string>();
let operacoes: OperacaoInterna[] = [];
let seq = 0;
let seqConta = 0;

const novoId = (prefixo: string): string => {
  seq += 1;
  return `${prefixo}-0000-4000-8000-${String(seq).padStart(12, '0')}`;
};

const agora = (): string => new Date().toISOString();

const emCentavos = (valor: number): number => Math.round((valor + Number.EPSILON) * 100);
const arredondar = (valor: number): number => emCentavos(valor) / 100;

function lancar(
  credorId: string,
  tipo: TipoLancamentoEscrow,
  valor: number,
  extra: { operacaoId?: string | null; parcela?: number | null; descricao: string; data?: string },
): LancamentoEscrow {
  const movimento = MOVIMENTO[tipo];
  const lancamento: LancamentoEscrow = {
    id: novoId('9e0799c0'),
    credorId,
    tipo,
    valor,
    de: movimento.de,
    para: movimento.para,
    operacaoId: extra.operacaoId ?? null,
    parcela: extra.parcela ?? null,
    descricao: extra.descricao,
    dataLancamento: extra.data ?? agora(),
  };
  lancamentos.push(lancamento);
  return lancamento;
}

function auditar(
  credorId: string,
  tipo: TipoEventoCredor,
  autor: string,
  papel: string,
  descricao: string,
  data = agora(),
): void {
  auditoria.push({ id: novoId('9d0799c0'), credorId, tipo, autor, papel, descricao, data });
}

// ---------- Seeds ----------

function credorSeed(parcial: Partial<CredorInterno> & Pick<CredorInterno, 'id' | 'nome'>) {
  const padrao: CredorInterno = {
    id: parcial.id,
    usuarioId: null,
    nome: parcial.nome,
    documentoMascarado: '',
    tipoPessoa: 'PF',
    categoria: 'NAO_QUALIFICADO',
    perfilRisco: null,
    status: 'ATIVO',
    motivoStatus: null,
    termoQualificadoEm: null,
    cienciaRiscoEm: null,
    capacidadeAporte: null,
    dataCadastro: '2026-01-01T00:00:00-03:00',
    banco: BANCO_PARCEIRO,
    agencia: '',
    conta: '',
  };
  return { ...padrao, ...parcial };
}

function semear(): void {
  seq = 0;
  seqConta = 0;
  oportunidades = oportunidadesSeed();
  repassesFeitos = new Set<string>();
  operacoes = [];
  credores = [
    credorSeed({
      id: ID_CREDOR_AURORA,
      usuarioId: USUARIO_AURORA,
      nome: 'Aurora Capital Investimentos LTDA',
      documentoMascarado: '12.345.678/0001-90',
      tipoPessoa: 'PJ',
      categoria: 'QUALIFICADO',
      perfilRisco: 'ARROJADO',
      termoQualificadoEm: '2025-08-12T10:00:00-03:00',
      cienciaRiscoEm: '2025-08-12T10:05:00-03:00',
      capacidadeAporte: 500000,
      dataCadastro: '2025-08-10T09:00:00-03:00',
      agencia: '0001',
      conta: '90010-1',
    }),
    credorSeed({
      id: ID_CREDOR_HELENA,
      usuarioId: USUARIO_HELENA,
      nome: 'Helena Martins',
      documentoMascarado: '***.456.789-**',
      perfilRisco: 'MODERADO',
      cienciaRiscoEm: '2026-09-20T14:00:00-03:00',
      capacidadeAporte: 30000,
      dataCadastro: '2026-09-20T13:40:00-03:00',
      agencia: '0001',
      conta: '90022-7',
    }),
    credorSeed({
      id: ID_CREDOR_CARLOS,
      nome: 'Carlos Nogueira',
      documentoMascarado: '***.321.654-**',
      categoria: 'QUALIFICADO',
      perfilRisco: 'ARROJADO',
      termoQualificadoEm: '2026-08-02T11:00:00-03:00',
      cienciaRiscoEm: '2026-08-02T11:10:00-03:00',
      capacidadeAporte: 200000,
      dataCadastro: '2026-08-01T16:20:00-03:00',
      agencia: '0001',
      conta: '90031-4',
    }),
    credorSeed({
      id: ID_CREDOR_MARINA,
      nome: 'Marina Duarte',
      documentoMascarado: '***.987.123-**',
      status: 'EM_ANALISE',
      capacidadeAporte: 10000,
      dataCadastro: '2026-10-08T10:30:00-03:00',
    }),
    credorSeed({
      id: ID_CREDOR_BOREAL,
      usuarioId: USUARIO_BOREAL,
      nome: 'Boreal Fomento Mercantil LTDA',
      documentoMascarado: '98.765.432/0001-10',
      tipoPessoa: 'PJ',
      status: 'REPROVADO',
      motivoStatus: 'Onboarding PJ reprovado na verificação PLD',
      dataCadastro: '2026-09-02T09:15:00-03:00',
    }),
  ];

  lancamentos = [];
  aportes = [];
  alocacoes = [];
  saques = [];
  auditoria = [];
  destinatarios = [];

  // Aurora: financiou integralmente a operacao Beta (R$ 6.000, 10 parcelas, 8 pagas).
  lancar(ID_CREDOR_AURORA, 'APORTE', 30000, {
    descricao: 'Aporte por Pix',
    data: '2025-09-20T10:00:00-03:00',
  });
  lancar(ID_CREDOR_AURORA, 'RESERVA', 6000, {
    operacaoId: OPERACAO_BETA,
    descricao: 'Reserva para Comércio Beta ME',
    data: '2025-09-22T10:00:00-03:00',
  });
  lancar(ID_CREDOR_AURORA, 'DESEMBOLSO', 6000, {
    operacaoId: OPERACAO_BETA,
    descricao: 'Desembolso ao devedor',
    data: '2025-09-25T10:00:00-03:00',
  });
  const plano = gerarCronograma({
    principal: 6000,
    taxaMensal: TAXA_MENSAL_PADRAO,
    prazoMeses: 10,
    primeiroVencimento: '2025-10-25',
  });
  plano.slice(0, 8).forEach((parcela) => {
    lancar(ID_CREDOR_AURORA, 'RETORNO_PRINCIPAL', parcela.principal, {
      operacaoId: OPERACAO_BETA,
      parcela: parcela.numero,
      descricao: `Parcela ${parcela.numero}: principal`,
      data: `${parcela.vencimento}T12:00:00-03:00`,
    });
    lancar(ID_CREDOR_AURORA, 'RETORNO_JUROS', parcela.juros, {
      operacaoId: OPERACAO_BETA,
      parcela: parcela.numero,
      descricao: `Parcela ${parcela.numero}: juros`,
      data: `${parcela.vencimento}T12:00:01-03:00`,
    });
    repassesFeitos.add(`${OPERACAO_BETA}:${parcela.numero}`);
  });
  operacoes.push({
    operacaoId: OPERACAO_BETA,
    oportunidadeId: OPORTUNIDADE_BETA,
    devedorNome: 'Comércio Beta ME',
    principal: 6000,
    taxaJurosMensal: TAXA_MENSAL_PADRAO,
    prazoMeses: 10,
    primeiroVencimento: '2025-10-25',
  });
  aportes.push({
    id: novoId('9b0799c0'),
    credorId: ID_CREDOR_AURORA,
    valor: 30000,
    status: 'CONFIRMADO',
    pixCopiaECola: '00020126-ficticio-aporte-30000',
    expiraEm: '2025-09-20T11:00:00-03:00',
    dataCriacao: '2025-09-20T09:55:00-03:00',
    dataConfirmacao: '2025-09-20T10:00:00-03:00',
  });
  alocacoes.push({
    id: novoId('9c0799c0'),
    credorId: ID_CREDOR_AURORA,
    oportunidadeId: OPORTUNIDADE_BETA,
    operacaoId: OPERACAO_BETA,
    devedorId: DEVEDOR_BETA,
    devedorNome: 'Comércio Beta ME',
    valor: 6000,
    status: 'EM_OPERACAO',
    motivoLiberacao: null,
    cienciaRiscoEm: '2025-09-22T10:00:00-03:00',
    dataCriacao: '2025-09-22T10:00:00-03:00',
  });

  // Helena: aportou, reservou valor para a Padaria Estrela e tem um novo aporte aguardando o Pix.
  lancar(ID_CREDOR_HELENA, 'APORTE', 12000, {
    descricao: 'Aporte por Pix',
    data: '2026-09-28T09:00:00-03:00',
  });
  lancar(ID_CREDOR_HELENA, 'RESERVA', 4625, {
    descricao: 'Reserva para Padaria Estrela ME',
    data: '2026-10-05T15:00:00-03:00',
  });
  alocacoes.push({
    id: novoId('9c0799c0'),
    credorId: ID_CREDOR_HELENA,
    oportunidadeId: OPORTUNIDADE_ESTRELA,
    operacaoId: null,
    devedorId: DEVEDOR_ESTRELA,
    devedorNome: 'Padaria Estrela ME',
    valor: 4625,
    status: 'RESERVADA',
    motivoLiberacao: null,
    cienciaRiscoEm: '2026-10-05T15:00:00-03:00',
    dataCriacao: '2026-10-05T15:00:00-03:00',
  });
  aportes.push(
    {
      id: novoId('9b0799c0'),
      credorId: ID_CREDOR_HELENA,
      valor: 12000,
      status: 'CONFIRMADO',
      pixCopiaECola: '00020126-ficticio-aporte-12000',
      expiraEm: '2026-09-28T10:00:00-03:00',
      dataCriacao: '2026-09-28T08:55:00-03:00',
      dataConfirmacao: '2026-09-28T09:00:00-03:00',
    },
    {
      id: novoId('9b0799c0'),
      credorId: ID_CREDOR_HELENA,
      valor: 3000,
      status: 'AGUARDANDO_PIX',
      pixCopiaECola: '00020126-ficticio-aporte-3000',
      expiraEm: '2099-12-31T23:59:59-03:00',
      dataCriacao: '2026-10-09T18:00:00-03:00',
      dataConfirmacao: null,
    },
  );

  // Carlos: qualificado, so aportou.
  lancar(ID_CREDOR_CARLOS, 'APORTE', 80000, {
    descricao: 'Aporte por Pix',
    data: '2026-08-05T10:00:00-03:00',
  });

  // Contas de destino ja cadastradas.
  destinatarios.push(
    {
      id: novoId('9a0799c0'),
      credorId: ID_CREDOR_AURORA,
      titularNome: 'Aurora Capital Investimentos LTDA',
      titularDocumentoMascarado: '12.345.678/0001-90',
      banco: 'Itaú Unibanco (341)',
      agencia: '1234',
      contaMascarada: '****567',
      tipoConta: 'CORRENTE',
      mesmaTitularidade: true,
      dataCriacao: '2025-09-18T10:00:00-03:00',
    },
    {
      id: novoId('9a0799c0'),
      credorId: ID_CREDOR_HELENA,
      titularNome: 'Helena Martins',
      titularDocumentoMascarado: '***.456.789-**',
      banco: 'Nubank (260)',
      agencia: '0001',
      contaMascarada: '****901',
      tipoConta: 'PAGAMENTO',
      mesmaTitularidade: true,
      dataCriacao: '2026-09-21T10:00:00-03:00',
    },
  );

  divergencias = [
    {
      id: novoId('9f0799c0'),
      tipo: 'APORTE_SEM_CREDOR',
      credorId: null,
      valorEsperado: 0,
      valorRecebido: 1500,
      descricao: 'Pix recebido de CPF sem credor cadastrado. Devolver ao pagador em 1 dia útil.',
      data: '2026-10-09T16:42:00-03:00',
    },
  ];

  auditar(
    ID_CREDOR_AURORA,
    'APROVACAO',
    'admin@empresa.com',
    'ADMIN',
    'Cadastro aprovado como investidor qualificado',
    '2025-08-12T10:10:00-03:00',
  );
  auditar(
    ID_CREDOR_HELENA,
    'APROVACAO',
    'backoffice@empresa.com',
    'BACKOFFICE',
    'Cadastro aprovado, perfil moderado',
    '2026-09-20T15:00:00-03:00',
  );
  auditar(
    ID_CREDOR_BOREAL,
    'REPROVACAO',
    'backoffice@empresa.com',
    'BACKOFFICE',
    'Onboarding PJ reprovado na verificação PLD',
    '2026-09-03T11:00:00-03:00',
  );
}

semear();

/** Restaura o estado ficticio ao seed; os testes chamam no beforeEach. */
export function resetCredoresEscrowState(): void {
  semear();
}

// ---------- Resultado ----------

export type ResultadoEscrow<T> =
  | { ok: true; valor: T }
  | { ok: false; status: number; erro: string };

const ok = <T>(valor: T): ResultadoEscrow<T> => ({ ok: true, valor });
const falha = (status: number, erro: string): ResultadoEscrow<never> => ({
  ok: false,
  status,
  erro,
});

// ---------- Consultas ----------

export function credorDoUsuario(usuarioId: string): CredorGestaoResponse | undefined {
  const credor = credores.find((c) => c.usuarioId === usuarioId);
  return credor ? paraGestao(credor) : undefined;
}

export function saldoDe(credorId: string): SaldoEscrow {
  const proprios = lancamentos.filter((l) => l.credorId === credorId);
  return proprios.length ? calcularSaldo(proprios) : saldoVazio();
}

/** Saque pedido e ainda nao aprovado ja compromete o disponivel. */
function valorEmSaquePendente(credorId: string): number {
  return arredondar(
    saques
      .filter((s) => s.credorId === credorId && s.status === 'AGUARDANDO_APROVACAO')
      .reduce((soma, s) => soma + s.valor, 0),
  );
}

/** Disponivel menos o que ja esta comprometido em saques aguardando aprovacao. */
export function disponivelLivre(credorId: string): number {
  return arredondar(saldoDe(credorId).disponivel - valorEmSaquePendente(credorId));
}

export function contaEscrowDe(credorId: string): ContaEscrowResponse | undefined {
  const credor = credores.find((c) => c.id === credorId);
  if (!credor) return undefined;
  return {
    credorId,
    banco: credor.banco,
    agencia: credor.agencia,
    conta: credor.conta,
    saldo: saldoDe(credorId),
  };
}

export function extratoDe(credorId: string): LancamentoEscrow[] {
  return lancamentos
    .filter((l) => l.credorId === credorId)
    .sort((a, b) => b.dataLancamento.localeCompare(a.dataLancamento));
}

function paraGestao(credor: CredorInterno): CredorGestaoResponse {
  return {
    id: credor.id,
    nome: credor.nome,
    documentoMascarado: credor.documentoMascarado,
    tipoPessoa: credor.tipoPessoa,
    categoria: credor.categoria,
    perfilRisco: credor.perfilRisco,
    status: credor.status,
    motivoStatus: credor.motivoStatus,
    termoQualificadoEm: credor.termoQualificadoEm,
    cienciaRiscoEm: credor.cienciaRiscoEm,
    capacidadeAporte: credor.capacidadeAporte,
    saldo: saldoDe(credor.id),
    dataCadastro: credor.dataCadastro,
  };
}

export function listarCredores(status?: StatusCredorGestao): CredorGestaoResponse[] {
  return credores
    .filter((c) => !status || c.status === status)
    .map(paraGestao)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function detalheCredor(id: string): CredorGestaoResponse | undefined {
  const credor = credores.find((c) => c.id === id);
  return credor ? paraGestao(credor) : undefined;
}

export function auditoriaDe(credorId: string): EventoAuditoriaCredor[] {
  return auditoria
    .filter((e) => e.credorId === credorId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Proposta aprovada vira oportunidade de financiamento: a escrow passa a oferece-la para alocacao. A
 * jornada de demonstracao usa isto para a proposta recem-aprovada aparecer para o credor.
 */
export function registrarOportunidade(nova: Omit<OportunidadeEscrow, 'disponivel'>): void {
  oportunidades[nova.id] = { ...nova, disponivel: true };
}

export function listarOportunidadesEscrow(): OportunidadeEscrow[] {
  return Object.values(oportunidades);
}

/** Oportunidades abertas, com quanto ja foi reservado e quanto falta financiar. */
export function listarOportunidadesAlocaveis(): OportunidadeAlocavelResponse[] {
  return Object.values(oportunidades)
    .filter((o) => o.disponivel)
    .map((o) => {
      const alocado = alocadoNaOportunidade(o.id);
      return {
        id: o.id,
        devedorId: o.devedorId,
        devedorNome: o.devedorNome,
        valor: o.valor,
        alocado,
        faltante: arredondar(o.valor - alocado),
        taxaJurosMensal: o.taxaJurosMensal,
        prazoMeses: o.prazoMeses,
      };
    });
}

// ---------- Aporte ----------

export function criarAporte(credorId: string, valor: number): ResultadoEscrow<AporteResponse> {
  const credor = credores.find((c) => c.id === credorId);
  if (!credor) return falha(404, 'Credor não encontrado');
  if (credor.status !== 'ATIVO') return falha(422, 'Credor não está ativo para aportar');
  if (!Number.isFinite(valor) || emCentavos(valor) <= 0) {
    return falha(422, 'Informe um valor maior que zero');
  }
  const aporte: AporteResponse = {
    id: novoId('9b0799c0'),
    credorId,
    valor,
    status: 'AGUARDANDO_PIX',
    pixCopiaECola: `00020126-ficticio-aporte-${valor}`,
    expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    dataCriacao: agora(),
    dataConfirmacao: null,
  };
  aportes.push(aporte);
  return ok({ ...aporte });
}

export function listarAportes(credorId: string): AporteResponse[] {
  return aportes
    .filter((a) => a.credorId === credorId)
    .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
    .map((a) => ({ ...a }));
}

/** Simula o webhook de deposito confirmado: credita o aporte no disponivel. Idempotente por aporte. */
export function confirmarAporte(
  credorId: string,
  aporteId: string,
): ResultadoEscrow<AporteResponse> {
  const aporte = aportes.find((a) => a.id === aporteId && a.credorId === credorId);
  if (!aporte) return falha(404, 'Aporte não encontrado');
  if (aporte.status === 'CONFIRMADO') return falha(409, 'Aporte já confirmado');
  if (aporte.status === 'EXPIRADO' || Date.parse(aporte.expiraEm) < Date.now()) {
    aporte.status = 'EXPIRADO';
    return falha(422, 'Aporte expirado');
  }
  aporte.status = 'CONFIRMADO';
  aporte.dataConfirmacao = agora();
  lancar(credorId, 'APORTE', aporte.valor, { descricao: 'Aporte por Pix' });
  return ok({ ...aporte });
}

// ---------- Alocacao ----------

/**
 * Exposicao do credor ao devedor para o limite do art. 24 (Res. CMN 5.050): soma dos SALDOS
 * DEVEDORES, nao do principal original. Reserva conta inteira; operacao em curso conta o principal
 * desembolsado menos o que ja retornou, entao cada parcela paga reabre espaco no limite.
 */
export function alocadoAoDevedor(credorId: string, devedorId: string): number {
  const doPar = alocacoes.filter((a) => a.credorId === credorId && a.devedorId === devedorId);
  const reservado = doPar
    .filter((a) => a.status === 'RESERVADA')
    .reduce((soma, a) => soma + a.valor, 0);

  const emOperacao = new Map<string, number>();
  for (const a of doPar) {
    if (a.status !== 'EM_OPERACAO' || !a.operacaoId) continue;
    emOperacao.set(a.operacaoId, (emOperacao.get(a.operacaoId) ?? 0) + a.valor);
  }
  let saldoDevedor = 0;
  for (const [operacaoId, principal] of emOperacao) {
    const devolvido = lancamentos
      .filter(
        (l) =>
          l.credorId === credorId && l.operacaoId === operacaoId && l.tipo === 'RETORNO_PRINCIPAL',
      )
      .reduce((soma, l) => soma + l.valor, 0);
    saldoDevedor += Math.max(principal - devolvido, 0);
  }
  return arredondar(reservado + saldoDevedor);
}

function alocadoNaOportunidade(oportunidadeId: string): number {
  return arredondar(
    alocacoes
      .filter(
        (a) =>
          a.oportunidadeId === oportunidadeId &&
          (a.status === 'RESERVADA' || a.status === 'EM_OPERACAO'),
      )
      .reduce((soma, a) => soma + a.valor, 0),
  );
}

export function limiteDe(
  credorId: string,
  oportunidadeId: string,
): ResultadoEscrow<LimiteDevedorResponse> {
  const credor = credores.find((c) => c.id === credorId);
  const oportunidade = oportunidades[oportunidadeId];
  if (!credor || !oportunidade) return falha(404, 'Oportunidade não encontrada');
  return ok(
    calcularLimiteDevedor({
      devedorId: oportunidade.devedorId,
      categoria: credor.categoria,
      alocadoAoDevedor: alocadoAoDevedor(credorId, oportunidade.devedorId),
    }),
  );
}

export function listarAlocacoes(credorId: string): AlocacaoResponse[] {
  return alocacoes
    .filter((a) => a.credorId === credorId)
    .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
    .map((a) => ({ ...a }));
}

export function alocar(
  credorId: string,
  pedido: AlocacaoRequest,
): ResultadoEscrow<AlocacaoResponse> {
  const credor = credores.find((c) => c.id === credorId);
  if (!credor) return falha(404, 'Credor não encontrado');
  if (credor.status !== 'ATIVO') return falha(422, 'Credor não está ativo para alocar');
  const oportunidade = oportunidades[pedido.oportunidadeId];
  if (!oportunidade) return falha(404, 'Oportunidade não encontrada');
  if (!oportunidade.disponivel) return falha(422, 'Oportunidade indisponível');

  const livre = arredondar(oportunidade.valor - alocadoNaOportunidade(oportunidade.id));
  if (emCentavos(pedido.valor) > emCentavos(livre)) {
    return falha(422, 'O valor passa do que ainda falta para financiar a oportunidade');
  }
  const motivo = validarAlocacao({
    categoria: credor.categoria,
    alocadoAoDevedor: alocadoAoDevedor(credorId, oportunidade.devedorId),
    valor: pedido.valor,
    saldoDisponivel: disponivelLivre(credorId),
    cienciaRisco: pedido.cienciaRisco,
  });
  if (motivo) return falha(422, motivo);

  const instante = agora();
  lancar(credorId, 'RESERVA', pedido.valor, {
    descricao: `Reserva para ${oportunidade.devedorNome}`,
    data: instante,
  });
  const alocacao: AlocacaoResponse = {
    id: novoId('9c0799c0'),
    credorId,
    oportunidadeId: oportunidade.id,
    operacaoId: null,
    devedorId: oportunidade.devedorId,
    devedorNome: oportunidade.devedorNome,
    valor: pedido.valor,
    status: 'RESERVADA',
    motivoLiberacao: null,
    cienciaRiscoEm: instante,
    dataCriacao: instante,
  };
  alocacoes.push(alocacao);
  return ok({ ...alocacao });
}

function liberar(alocacao: AlocacaoResponse, motivo: string): void {
  lancar(alocacao.credorId, 'LIBERACAO_RESERVA', alocacao.valor, {
    descricao: `Reserva liberada: ${motivo}`,
  });
  alocacao.status = 'LIBERADA';
  alocacao.motivoLiberacao = motivo;
}

/** O credor desiste enquanto a operacao ainda nao foi formada: a reserva volta ao disponivel. */
export function cancelarAlocacao(credorId: string, alocacaoId: string): ResultadoEscrow<null> {
  const alocacao = alocacoes.find((a) => a.id === alocacaoId && a.credorId === credorId);
  if (!alocacao) return falha(404, 'Alocação não encontrada');
  if (alocacao.status !== 'RESERVADA') {
    return falha(422, 'Só é possível cancelar enquanto a operação não foi formada');
  }
  liberar(alocacao, 'Cancelada pelo credor');
  return ok(null);
}

// ---------- Tesouraria: formar operacao, devolver, repassar parcela ----------

export interface ResumoFormacao {
  operacaoId: string;
  credores: number;
  total: number;
  /** Data limite para o repasse ao devedor (art. 21, I). */
  repasseAoDevedorAte: string;
}

/**
 * Operacao formada e aprovada para desembolso: as reservas viram principal em operacao. So desembolsa
 * quando as alocacoes cobrem 100% da oportunidade.
 */
export function desembolsarOperacao(
  oportunidadeId: string,
  operacaoId: string,
): ResultadoEscrow<ResumoFormacao> {
  const oportunidade = oportunidades[oportunidadeId];
  if (!oportunidade) return falha(404, 'Oportunidade não encontrada');
  const reservadas = alocacoes.filter(
    (a) => a.oportunidadeId === oportunidadeId && a.status === 'RESERVADA',
  );
  if (!reservadas.length) return falha(422, 'Não há reservas para desembolsar');
  const total = arredondar(reservadas.reduce((soma, a) => soma + a.valor, 0));
  if (emCentavos(total) !== emCentavos(oportunidade.valor)) {
    return falha(422, 'As reservas não cobrem o valor integral da oportunidade');
  }
  reservadas.forEach((alocacao) => {
    lancar(alocacao.credorId, 'DESEMBOLSO', alocacao.valor, {
      operacaoId,
      descricao: `Desembolso ao devedor ${oportunidade.devedorNome}`,
    });
    alocacao.status = 'EM_OPERACAO';
    alocacao.operacaoId = operacaoId;
  });
  oportunidade.disponivel = false;
  operacoes.push({
    operacaoId,
    oportunidadeId,
    devedorNome: oportunidade.devedorNome,
    principal: oportunidade.valor,
    taxaJurosMensal: oportunidade.taxaJurosMensal,
    prazoMeses: oportunidade.prazoMeses,
    primeiroVencimento: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  });
  return ok({
    operacaoId,
    credores: reservadas.length,
    total,
    repasseAoDevedorAte: adicionarDiasUteis(
      agora().slice(0, 10),
      PRAZO_DIAS_UTEIS.REPASSE_AO_DEVEDOR,
    ),
  });
}

/** A operacao nao se formou: devolve as reservas ao disponivel dos credores (art. 21, par. 2). */
export function encerrarSemFormar(
  oportunidadeId: string,
  motivo: string,
): ResultadoEscrow<{ devolvidas: number; devolverAte: string }> {
  if (!oportunidades[oportunidadeId]) return falha(404, 'Oportunidade não encontrada');
  const reservadas = alocacoes.filter(
    (a) => a.oportunidadeId === oportunidadeId && a.status === 'RESERVADA',
  );
  if (!reservadas.length) return falha(422, 'Não há reservas para devolver');
  reservadas.forEach((alocacao) => liberar(alocacao, motivo));
  return ok({
    devolvidas: reservadas.length,
    devolverAte: adicionarDiasUteis(agora().slice(0, 10), PRAZO_DIAS_UTEIS.DEVOLUCAO_AO_CREDOR),
  });
}

export interface ResumoRepasse {
  operacaoId: string;
  parcela: number;
  quinhoes: { credorId: string; principal: number; juros: number; total: number }[];
  repasseAoCredorAte: string;
}

/** Parcela do tomador paga: rateia entre os credores da operacao e credita no disponivel de cada um. */
export function repassarParcela(
  operacaoId: string,
  numeroParcela: number,
  parcela: { principal: number; juros: number },
): ResultadoEscrow<ResumoRepasse> {
  const participantes = alocacoes.filter(
    (a) => a.operacaoId === operacaoId && a.status === 'EM_OPERACAO',
  );
  if (!participantes.length) return falha(404, 'Operação não encontrada');
  const chave = `${operacaoId}:${numeroParcela}`;
  if (repassesFeitos.has(chave)) return falha(409, 'Parcela já repassada aos credores');

  // Um credor com mais de uma alocacao na mesma operacao recebe um unico quinhao.
  const porCredor = new Map<string, number>();
  participantes.forEach((a) =>
    porCredor.set(a.credorId, arredondar((porCredor.get(a.credorId) ?? 0) + a.valor)),
  );
  const quinhoes = ratearParcela(
    parcela,
    [...porCredor].map(([credorId, valorAlocado]) => ({ credorId, valorAlocado })),
  );
  // Valida antes de gravar: o principal devolvido nao pode passar do que o credor tem em operacao.
  for (const q of quinhoes) {
    if (emCentavos(q.principal) > emCentavos(saldoDe(q.credorId).emOperacao)) {
      return falha(422, 'O principal da parcela passa do que o credor tem em operação');
    }
  }
  quinhoes.forEach((q) => {
    if (q.principal > 0) {
      lancar(q.credorId, 'RETORNO_PRINCIPAL', q.principal, {
        operacaoId,
        parcela: numeroParcela,
        descricao: `Parcela ${numeroParcela}: principal`,
      });
    }
    if (q.juros > 0) {
      lancar(q.credorId, 'RETORNO_JUROS', q.juros, {
        operacaoId,
        parcela: numeroParcela,
        descricao: `Parcela ${numeroParcela}: juros`,
      });
    }
  });
  repassesFeitos.add(chave);
  return ok({
    operacaoId,
    parcela: numeroParcela,
    quinhoes,
    repasseAoCredorAte: adicionarDiasUteis(
      agora().slice(0, 10),
      PRAZO_DIAS_UTEIS.RETORNO_AO_CREDOR,
    ),
  });
}

// ---------- Destinatarios e saque ----------

function paraDestinatario(d: DestinatarioInterno): DestinatarioResponse {
  return {
    id: d.id,
    titularNome: d.titularNome,
    titularDocumentoMascarado: d.titularDocumentoMascarado,
    banco: d.banco,
    agencia: d.agencia,
    contaMascarada: d.contaMascarada,
    tipoConta: d.tipoConta,
    mesmaTitularidade: d.mesmaTitularidade,
    dataCriacao: d.dataCriacao,
  };
}

export function listarDestinatarios(credorId: string): DestinatarioResponse[] {
  return destinatarios.filter((d) => d.credorId === credorId).map(paraDestinatario);
}

export function criarDestinatario(
  credorId: string,
  pedido: DestinatarioRequest,
): ResultadoEscrow<DestinatarioResponse> {
  const credor = credores.find((c) => c.id === credorId);
  if (!credor) return falha(404, 'Credor não encontrado');
  if (!pedido.banco.trim() || !pedido.agencia.trim() || !pedido.conta.trim()) {
    return falha(422, 'Informe banco, agência e conta');
  }
  const mascarada = `****${pedido.conta.replace(/\D/g, '').slice(-3)}`;
  const repetida = destinatarios.some(
    (d) =>
      d.credorId === credorId &&
      d.banco === pedido.banco &&
      d.agencia === pedido.agencia &&
      d.contaMascarada === mascarada,
  );
  if (repetida) return falha(409, 'Conta já cadastrada');
  const criado: DestinatarioInterno = {
    id: novoId('9a0799c0'),
    credorId,
    titularNome: credor.nome,
    titularDocumentoMascarado: credor.documentoMascarado,
    banco: pedido.banco,
    agencia: pedido.agencia,
    contaMascarada: mascarada,
    tipoConta: pedido.tipoConta,
    // Conta informada pelo proprio credor: a titularidade e conferida no cadastro bancario (backend).
    mesmaTitularidade: true,
    dataCriacao: agora(),
  };
  destinatarios.push(criado);
  return ok(paraDestinatario(criado));
}

export function removerDestinatario(credorId: string, id: string): ResultadoEscrow<null> {
  const indice = destinatarios.findIndex((d) => d.id === id && d.credorId === credorId);
  if (indice < 0) return falha(404, 'Destinatário não encontrado');
  destinatarios.splice(indice, 1);
  return ok(null);
}

export function solicitarSaque(
  credorId: string,
  pedido: { destinatarioId: string; valor: number },
): ResultadoEscrow<SaqueResponse> {
  const credor = credores.find((c) => c.id === credorId);
  if (!credor) return falha(404, 'Credor não encontrado');
  if (credor.status !== 'ATIVO') return falha(422, 'Credor não está ativo para sacar');
  const destino = destinatarios.find(
    (d) => d.id === pedido.destinatarioId && d.credorId === credorId,
  );
  if (!destino) return falha(404, 'Conta de destino não cadastrada');
  if (!destino.mesmaTitularidade) {
    return falha(422, 'O saque só vai para conta de mesma titularidade');
  }
  if (!Number.isFinite(pedido.valor) || emCentavos(pedido.valor) <= 0) {
    return falha(422, 'Informe um valor maior que zero');
  }
  if (emCentavos(pedido.valor) > emCentavos(disponivelLivre(credorId))) {
    return falha(422, 'Saldo disponível insuficiente');
  }
  const saque: SaqueResponse = {
    id: novoId('990799c0'),
    credorId,
    destinatarioId: destino.id,
    valor: pedido.valor,
    status: 'AGUARDANDO_APROVACAO',
    dataCriacao: agora(),
  };
  saques.push(saque);
  return ok({ ...saque });
}

export function listarSaques(credorId: string): SaqueResponse[] {
  return saques
    .filter((s) => s.credorId === credorId)
    .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
    .map((s) => ({ ...s }));
}

export function listarSaquesPendentes(): SaqueResponse[] {
  return saques.filter((s) => s.status === 'AGUARDANDO_APROVACAO').map((s) => ({ ...s }));
}

/** Aprova o saque e lanca a saida da escrow. A regra de dupla mao (autor diferente) fica na rota. */
export function aprovarSaque(id: string): ResultadoEscrow<SaqueResponse> {
  const saque = saques.find((s) => s.id === id);
  if (!saque) return falha(404, 'Saque não encontrado');
  if (saque.status !== 'AGUARDANDO_APROVACAO') return falha(409, 'Saque já decidido');
  const erro = validarLancamento(saldoDe(saque.credorId), {
    tipo: 'SAQUE',
    valor: saque.valor,
    ...MOVIMENTO['SAQUE'],
  });
  if (erro) return falha(422, erro);
  lancar(saque.credorId, 'SAQUE', saque.valor, { descricao: 'Saque para conta cadastrada' });
  saque.status = 'EXECUTADO';
  return ok({ ...saque });
}

export function rejeitarSaque(id: string): ResultadoEscrow<SaqueResponse> {
  const saque = saques.find((s) => s.id === id);
  if (!saque) return falha(404, 'Saque não encontrado');
  if (saque.status !== 'AGUARDANDO_APROVACAO') return falha(409, 'Saque já decidido');
  saque.status = 'REJEITADO';
  return ok({ ...saque });
}

// ---------- Gestao (Backoffice) ----------

interface Autor {
  username: string;
  role: string;
}

export function alterarStatusCredor(
  id: string,
  status: Extract<StatusCredorGestao, 'ATIVO' | 'SUSPENSO' | 'REPROVADO'>,
  motivo: string,
  autor: Autor,
): ResultadoEscrow<CredorGestaoResponse> {
  const credor = credores.find((c) => c.id === id);
  if (!credor) return falha(404, 'Credor não encontrado');
  if (!motivo.trim()) return falha(422, 'Informe o motivo');
  if (credor.status === status) return falha(409, 'O credor já está neste status');
  if (status === 'ATIVO' && credor.status === 'REPROVADO') {
    return falha(422, 'Credor reprovado precisa de novo cadastro');
  }
  if (status === 'REPROVADO' && credor.status !== 'EM_ANALISE') {
    return falha(422, 'Só é possível reprovar um cadastro em análise');
  }
  if (status === 'ATIVO' && credor.status === 'EM_ANALISE') {
    // A aprovacao exige o perfil de risco apurado (art. 28) e abre a conta vinculada.
    credor.perfilRisco = credor.perfilRisco ?? 'CONSERVADOR';
    credor.cienciaRiscoEm = credor.cienciaRiscoEm ?? agora();
    if (!credor.agencia) {
      seqConta += 1;
      credor.agencia = '0001';
      credor.conta = `9${String(1000 + seqConta)}-0`;
    }
  }
  const evento: Record<typeof status, TipoEventoCredor> = {
    ATIVO: 'APROVACAO',
    SUSPENSO: 'SUSPENSAO',
    REPROVADO: 'REPROVACAO',
  };
  credor.status = status;
  credor.motivoStatus = status === 'ATIVO' ? null : motivo;
  auditar(id, evento[status], autor.username, autor.role, motivo);
  return ok(paraGestao(credor));
}

export function alterarPerfilRisco(
  id: string,
  perfil: PerfilRiscoCredor,
  autor: Autor,
): ResultadoEscrow<CredorGestaoResponse> {
  const credor = credores.find((c) => c.id === id);
  if (!credor) return falha(404, 'Credor não encontrado');
  credor.perfilRisco = perfil;
  auditar(id, 'PERFIL_ALTERADO', autor.username, autor.role, `Perfil de risco: ${perfil}`);
  return ok(paraGestao(credor));
}

export function alterarCategoria(
  id: string,
  categoria: CategoriaInvestidor,
  autor: Autor,
): ResultadoEscrow<CredorGestaoResponse> {
  const credor = credores.find((c) => c.id === id);
  if (!credor) return falha(404, 'Credor não encontrado');
  if (categoria === 'QUALIFICADO' && !credor.termoQualificadoEm) {
    return falha(422, 'Investidor qualificado exige o termo assinado');
  }
  credor.categoria = categoria;
  auditar(id, 'CATEGORIA_ALTERADA', autor.username, autor.role, `Categoria: ${categoria}`);
  return ok(paraGestao(credor));
}

export function resumoTesouraria(): TesourariaResumoResponse {
  const saldos = credores.map((c) => saldoDe(c.id));
  const soma = (campo: 'disponivel' | 'reservado' | 'emOperacao' | 'totalCustodiado') =>
    arredondar(saldos.reduce((s, x) => s + x[campo], 0));
  const hoje = agora().slice(0, 10);
  return {
    totalCustodiado: soma('totalCustodiado'),
    totalDisponivel: soma('disponivel'),
    totalReservado: soma('reservado'),
    totalEmOperacao: soma('emOperacao'),
    aportesHoje: arredondar(
      aportes
        .filter((a) => a.status === 'CONFIRMADO' && a.dataConfirmacao?.slice(0, 10) === hoje)
        .reduce((s, a) => s + a.valor, 0),
    ),
    aportesPendentes: aportes.filter((a) => a.status === 'AGUARDANDO_PIX').length,
    saquesPendentes: saques.filter((s) => s.status === 'AGUARDANDO_APROVACAO').length,
    credoresAtivos: credores.filter((c) => c.status === 'ATIVO').length,
  };
}

export function listarDivergencias(): DivergenciaEscrow[] {
  return divergencias.map((d) => ({ ...d }));
}

/** Todas as oportunidades, abertas ou ja formadas, com as reservas e se ja podem ser desembolsadas. */
export function listarOportunidadesTesouraria(): OportunidadeTesourariaResponse[] {
  return Object.values(oportunidades).map((o) => {
    const reservadas = alocacoes.filter(
      (a) => a.oportunidadeId === o.id && a.status === 'RESERVADA',
    );
    const totalReservado = arredondar(reservadas.reduce((soma, a) => soma + a.valor, 0));
    const alocado = alocadoNaOportunidade(o.id);
    return {
      id: o.id,
      devedorId: o.devedorId,
      devedorNome: o.devedorNome,
      valor: o.valor,
      alocado,
      faltante: arredondar(o.valor - alocado),
      taxaJurosMensal: o.taxaJurosMensal,
      prazoMeses: o.prazoMeses,
      disponivel: o.disponivel,
      reservas: reservadas.length,
      pronta:
        o.disponivel && reservadas.length > 0 && emCentavos(totalReservado) === emCentavos(o.valor),
    };
  });
}

/** Operacoes formadas e o andamento do repasse das parcelas (a proxima e calculada pela tabela Price). */
export function listarOperacoesEscrow(): OperacaoEscrowResponse[] {
  return operacoes.map((op) => {
    const plano = gerarCronograma({
      principal: op.principal,
      taxaMensal: op.taxaJurosMensal,
      prazoMeses: op.prazoMeses,
      primeiroVencimento: op.primeiroVencimento,
    });
    const repassada = (numero: number) => repassesFeitos.has(`${op.operacaoId}:${numero}`);
    const feitas = plano.filter((p) => repassada(p.numero)).length;
    const proxima = plano.find((p) => !repassada(p.numero)) ?? null;
    const credoresDaOperacao = new Set(
      alocacoes
        .filter((a) => a.operacaoId === op.operacaoId && a.status === 'EM_OPERACAO')
        .map((a) => a.credorId),
    );
    return {
      operacaoId: op.operacaoId,
      oportunidadeId: op.oportunidadeId,
      devedorNome: op.devedorNome,
      principal: op.principal,
      taxaJurosMensal: op.taxaJurosMensal,
      prazoMeses: op.prazoMeses,
      credores: credoresDaOperacao.size,
      parcelasTotal: plano.length,
      parcelasRepassadas: feitas,
      saldoEmOperacao: feitas > 0 ? (plano[feitas - 1]?.saldoDevedor ?? 0) : op.principal,
      proximaParcela: proxima
        ? {
            numero: proxima.numero,
            vencimento: proxima.vencimento,
            principal: proxima.principal,
            juros: proxima.juros,
            total: proxima.total,
          }
        : null,
    };
  });
}

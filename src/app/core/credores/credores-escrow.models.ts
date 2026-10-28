// Contrato da conta escrow do credor e da gestao de credores (Backoffice).
//
// Fase atual: fluxo operacional com dados ficticios (MSW). Estes tipos viram o contrato entregue ao
// backend. Valores em reais (number, 2 casas); datas em ISO-8601. Regras de origem: Res. CMN 5.050
// (arts. 16, 20, 21, 22, 24, 28 e 32) e a documentacao da conta escrow da Celcoin.

export type TipoPessoaCredor = 'PF' | 'PJ';

/** Condicao de investidor qualificado (Res. CVM 30/2021): isenta do limite por devedor (art. 24, par. 2). */
export type CategoriaInvestidor = 'NAO_QUALIFICADO' | 'QUALIFICADO';

/** Perfil de risco apurado pela SEP (art. 28). */
export type PerfilRiscoCredor = 'CONSERVADOR' | 'MODERADO' | 'ARROJADO';

export type StatusCredorGestao = 'EM_ANALISE' | 'ATIVO' | 'SUSPENSO' | 'REPROVADO';

/**
 * Onde o dinheiro do credor esta. DISPONIVEL e RESERVADO sao caixa dentro da escrow; EM_OPERACAO e o
 * principal emprestado (a receber). EXTERNO e tudo que esta fora da escrow (banco do credor, devedor).
 */
export type BucketSaldo = 'DISPONIVEL' | 'RESERVADO' | 'EM_OPERACAO';
export type OrigemDestino = BucketSaldo | 'EXTERNO';

export type TipoLancamentoEscrow =
  | 'APORTE'
  | 'RESERVA'
  | 'LIBERACAO_RESERVA'
  | 'DESEMBOLSO'
  | 'RETORNO_PRINCIPAL'
  | 'RETORNO_JUROS'
  | 'SAQUE'
  | 'TARIFA';

/** Lancamento imutavel do livro-razao: sempre move valor de um bucket para outro. */
export interface LancamentoEscrow {
  id: string;
  credorId: string;
  tipo: TipoLancamentoEscrow;
  valor: number;
  de: OrigemDestino;
  para: OrigemDestino;
  /** Operacao financiada a que o lancamento se refere, quando houver. */
  operacaoId: string | null;
  /** Parcela do tomador que originou o retorno, quando houver. */
  parcela: number | null;
  descricao: string;
  dataLancamento: string;
}

export interface SaldoEscrow {
  disponivel: number;
  reservado: number;
  emOperacao: number;
  /** Caixa sob custodia na escrow: disponivel + reservado. */
  totalCustodiado: number;
  /** Posicao total do credor: caixa + principal emprestado. */
  patrimonio: number;
}

// ---------- Conta escrow / aporte ----------

export interface ContaEscrowResponse {
  credorId: string;
  /** Dados para o aporte por Pix (agencia e conta) da conta vinculada do credor. */
  banco: string;
  agencia: string;
  conta: string;
  saldo: SaldoEscrow;
}

export type StatusAporte = 'AGUARDANDO_PIX' | 'CONFIRMADO' | 'EXPIRADO';

export interface AporteRequest {
  valor: number;
}

export interface AporteResponse {
  id: string;
  credorId: string;
  valor: number;
  status: StatusAporte;
  /** Pix copia e cola (ficticio no mock). */
  pixCopiaECola: string;
  expiraEm: string;
  dataCriacao: string;
  dataConfirmacao: string | null;
}

// ---------- Alocacao em oportunidade ----------

export type StatusAlocacao = 'RESERVADA' | 'EM_OPERACAO' | 'LIBERADA';

export interface AlocacaoRequest {
  oportunidadeId: string;
  valor: number;
  /** Ciencia de risco obrigatoria (art. 20, IX). */
  cienciaRisco: boolean;
}

export interface AlocacaoResponse {
  id: string;
  credorId: string;
  oportunidadeId: string;
  /** Operacao financiada, preenchida quando a oportunidade vira operacao. */
  operacaoId: string | null;
  devedorId: string;
  devedorNome: string;
  valor: number;
  status: StatusAlocacao;
  motivoLiberacao: string | null;
  cienciaRiscoEm: string;
  dataCriacao: string;
}

/** Oportunidade aberta a alocacao de recursos de credores (GET /credores/me/oportunidades). */
export interface OportunidadeAlocavelResponse {
  id: string;
  devedorId: string;
  devedorNome: string;
  /** Valor total a financiar. */
  valor: number;
  /** Ja reservado por todos os credores. */
  alocado: number;
  /** Quanto ainda falta para fechar o financiamento. */
  faltante: number;
  taxaJurosMensal: number;
  prazoMeses: number;
}

/** Limite de emprestimo do credor para um devedor na SEP (art. 24). */
export interface LimiteDevedorResponse {
  devedorId: string;
  limite: number;
  isento: boolean;
  alocado: number;
  /** Quanto ainda cabe no limite; null quando o credor e isento (qualificado). */
  disponivel: number | null;
}

// ---------- Destinatarios e saque ----------

export type TipoContaBancaria = 'CORRENTE' | 'POUPANCA' | 'PAGAMENTO';

/** Conta de destino pre-cadastrada. A Celcoin so paga destino cadastrado e so por banco/agencia/conta. */
export interface DestinatarioRequest {
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: TipoContaBancaria;
}

export interface DestinatarioResponse {
  id: string;
  titularNome: string;
  titularDocumentoMascarado: string;
  banco: string;
  agencia: string;
  contaMascarada: string;
  tipoConta: TipoContaBancaria;
  /** O saque so e aceito para conta de mesma titularidade do credor. */
  mesmaTitularidade: boolean;
  dataCriacao: string;
}

export type StatusSaque = 'AGUARDANDO_APROVACAO' | 'EXECUTADO' | 'REJEITADO';

export interface SaqueRequest {
  destinatarioId: string;
  valor: number;
}

export interface SaqueResponse {
  id: string;
  credorId: string;
  destinatarioId: string;
  valor: number;
  status: StatusSaque;
  dataCriacao: string;
}

// ---------- Gestao de credores (Backoffice) ----------

export interface CredorGestaoResponse {
  id: string;
  nome: string;
  documentoMascarado: string;
  tipoPessoa: TipoPessoaCredor;
  categoria: CategoriaInvestidor;
  perfilRisco: PerfilRiscoCredor | null;
  status: StatusCredorGestao;
  motivoStatus: string | null;
  /** Termo de investidor qualificado assinado, quando houver. */
  termoQualificadoEm: string | null;
  /** Ciencia de risco geral registrada no cadastro. */
  cienciaRiscoEm: string | null;
  capacidadeAporte: number | null;
  saldo: SaldoEscrow;
  dataCadastro: string;
}

export interface AlterarStatusCredorRequest {
  status: Extract<StatusCredorGestao, 'ATIVO' | 'SUSPENSO' | 'REPROVADO'>;
  motivo: string;
}

export type TipoEventoCredor =
  'CADASTRO' | 'APROVACAO' | 'SUSPENSAO' | 'REPROVACAO' | 'CATEGORIA_ALTERADA' | 'PERFIL_ALTERADO';

export interface EventoAuditoriaCredor {
  id: string;
  credorId: string;
  tipo: TipoEventoCredor;
  autor: string;
  papel: string;
  descricao: string;
  data: string;
}

// ---------- Tesouraria (Backoffice) ----------

export interface TesourariaResumoResponse {
  totalCustodiado: number;
  totalDisponivel: number;
  totalReservado: number;
  totalEmOperacao: number;
  aportesHoje: number;
  aportesPendentes: number;
  saquesPendentes: number;
  credoresAtivos: number;
}

export type TipoDivergenciaEscrow =
  'APORTE_SEM_CREDOR' | 'VALOR_DIVERGENTE' | 'SAQUE_NAO_EXECUTADO';

export interface DivergenciaEscrow {
  id: string;
  tipo: TipoDivergenciaEscrow;
  credorId: string | null;
  valorEsperado: number;
  valorRecebido: number;
  descricao: string;
  data: string;
}

// ---------- Tesouraria: formacao e repasse ----------

/** Oportunidade vista pela tesouraria: aberta ou ja formada, com o quanto foi reservado. */
export interface OportunidadeTesourariaResponse extends OportunidadeAlocavelResponse {
  /** false quando a operacao ja foi formada e desembolsada. */
  disponivel: boolean;
  /** Quantidade de reservas em aberto (aguardando a formacao). */
  reservas: number;
  /** As reservas cobrem 100% do valor e a operacao pode ser desembolsada. */
  pronta: boolean;
}

export interface ParcelaRepasseResponse {
  numero: number;
  vencimento: string;
  principal: number;
  juros: number;
  /** principal + juros: o que o tomador paga e a tesouraria repassa aos credores. */
  total: number;
}

/** Operacao formada, com o andamento do repasse das parcelas aos credores. */
export interface OperacaoEscrowResponse {
  operacaoId: string;
  oportunidadeId: string;
  devedorNome: string;
  principal: number;
  taxaJurosMensal: number;
  prazoMeses: number;
  credores: number;
  parcelasTotal: number;
  parcelasRepassadas: number;
  /** Principal que ainda esta emprestado (a receber). */
  saldoEmOperacao: number;
  /** Proxima parcela a repassar; null quando a operacao foi liquidada. */
  proximaParcela: ParcelaRepasseResponse | null;
}

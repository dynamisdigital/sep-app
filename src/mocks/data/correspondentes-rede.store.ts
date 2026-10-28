import type {
  OperacaoClienteResponse,
  ParcelaContrato,
} from '../../app/core/correspondentes/correspondentes.models';
import type {
  AtualizarPercentuaisSubRequest,
  ComissaoDaRedeResponse,
  ComissaoPorOrigem,
  ConsolidadoDaRede,
  CriarSubRequest,
  MinhaPosicaoNaRedeResponse,
  OperacaoDaRedeResponse,
  PercentualSub,
  PercentualSubRequest,
  RedeDoMajoritarioResponse,
  SubCorrespondenteResponse,
  TetoComissaoSub,
} from '../../app/core/correspondentes/correspondentes-rede.models';
import type { RegraComissao } from '../../app/core/correspondentes/correspondentes-gestao.models';
import { centavos } from '../../app/core/financeiro/calculo-financeiro';
import { comissoesDe, lancamentosDe, listarRegras } from './correspondentes-gestao.store';
import {
  consultarCorrespondente,
  consultarSub,
  criarSub,
  definirPercentuaisSub,
  emailCadastrado,
  listarBaseDe,
  listarOperacoesDe,
  listarSubs,
  majoritarioDe,
  nivelDe,
  nomeDe,
  resumoDe,
  suspenderSub,
  type SubBase,
} from './correspondentes.store';

// Visoes da rede de sub-correspondentes. Os dados nascem nos stores de correspondentes e de comissoes; aqui
// so se montam as respostas e se aplicam as regras do SEP sobre o repasse. A regra central: o repasse de
// um sub, por produto, nunca passa do teto que o SEP fixou para aquele produto (e o teto nunca passa da
// comissao cheia da regra). Quem decide e o backend; este store espelha a decisao para o front.

export interface ErroRede {
  erro: string;
  status: 400 | 403 | 404 | 409 | 422;
}

function arredondar(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

export function tetos(): TetoComissaoSub[] {
  return listarRegras().map((r: RegraComissao) => ({
    produto: r.produto,
    base: r.base,
    percentualSep: r.percentual,
    tetoSub: r.tetoSub,
  }));
}

function percentuaisDe(mapa: Record<string, number>): PercentualSub[] {
  return tetos().map((t) => {
    const percentualSub = mapa[t.produto] ?? 0;
    return {
      produto: t.produto,
      base: t.base,
      percentualSep: t.percentualSep,
      tetoSub: t.tetoSub,
      percentualSub,
      margemMajoritario: arredondar(t.percentualSep - percentualSub),
    };
  });
}

/** Valida os repasses contra o teto do SEP. Devolve a mensagem do primeiro problema, ou null. */
export function validarPercentuais(percentuais: PercentualSubRequest[]): string | null {
  const porProduto = new Map(tetos().map((t) => [t.produto, t]));
  const vistos = new Set<string>();
  for (const p of percentuais) {
    const teto = porProduto.get(p.produto);
    if (!teto) return `Produto sem regra de comissao: ${p.produto}`;
    if (vistos.has(p.produto)) return `Produto repetido: ${p.produto}`;
    vistos.add(p.produto);
    if (!Number.isFinite(p.percentualSub) || p.percentualSub < 0) {
      return `O repasse de ${p.produto} nao pode ser negativo`;
    }
    if (p.percentualSub > teto.tetoSub) {
      return `O repasse de ${p.produto} (${p.percentualSub}%) passa do teto do SEP (${teto.tetoSub}%)`;
    }
  }
  const faltando = [...porProduto.keys()].filter((produto) => !vistos.has(produto));
  if (faltando.length) return `Informe o repasse de: ${faltando.join(', ')}`;
  return null;
}

function mapaDe(percentuais: PercentualSubRequest[]): Record<string, number> {
  return Object.fromEntries(percentuais.map((p) => [p.produto, p.percentualSub]));
}

function totalNaoEstornado(id: string, filtro: (evento: string) => boolean = () => true): number {
  return centavos(
    lancamentosDe(id)
      .filter((l) => l.status !== 'ESTORNADA' && filtro(l.evento))
      .reduce((s, l) => s + l.valor, 0),
  );
}

function margemSobre(majoritarioId: string, subId: string): number {
  return centavos(
    lancamentosDe(majoritarioId)
      .filter((l) => l.evento === 'MARGEM_SUB' && l.viaSubId === subId && l.status !== 'ESTORNADA')
      .reduce((s, l) => s + l.valor, 0),
  );
}

function montarSub(majoritarioId: string, sub: SubBase): SubCorrespondenteResponse {
  const resumo = resumoDe(sub.id);
  const carteira = resumo?.carteira;
  return {
    id: sub.id,
    nome: sub.nome,
    cpfMascarado: sub.cpfMascarado,
    email: sub.email,
    telefone: sub.telefone,
    status: sub.status,
    criadoEm: sub.criadoEm,
    clientesNaBase: listarBaseDe(sub.id).filter((v) => v.status === 'VIGENTE').length,
    valorCarteira: carteira?.valorContratado ?? 0,
    valorEmAtraso: carteira?.valorEmAtraso ?? 0,
    inadimplenciaPct: carteira?.inadimplenciaPct ?? 0,
    comissaoDoSub: totalNaoEstornado(sub.id),
    margemDoMajoritario: margemSobre(majoritarioId, sub.id),
    percentuais: percentuaisDe(sub.percentuais),
  };
}

function inadimplencia(ops: OperacaoClienteResponse[]): number {
  const parcelas: ParcelaContrato[] = ops
    .filter((o) => o.tipo === 'CONTRATO')
    .flatMap((o) => o.parcelas);
  const devidas = parcelas.filter((p) => p.status === 'VENCIDA' || p.pagoEm !== null).length;
  const vencidas = parcelas.filter((p) => p.status === 'VENCIDA').length;
  return devidas ? Math.round((vencidas / devidas) * 1000) / 10 : 0;
}

function consolidar(majoritarioId: string, subs: SubCorrespondenteResponse[]): ConsolidadoDaRede {
  const proprias = listarOperacoesDe(majoritarioId);
  const dosSubs = subs.flatMap((s) => listarOperacoesDe(s.id));
  const todas = [...proprias, ...dosSubs];
  const contratos = (ops: OperacaoClienteResponse[]) => ops.filter((o) => o.tipo === 'CONTRATO');
  const comissaoPropria = totalNaoEstornado(majoritarioId, (e) => e !== 'MARGEM_SUB');
  const margem = totalNaoEstornado(majoritarioId, (e) => e === 'MARGEM_SUB');
  const repasse = centavos(subs.reduce((s, x) => s + x.comissaoDoSub, 0));
  return {
    clientesProprios: listarBaseDe(majoritarioId).filter((v) => v.status === 'VIGENTE').length,
    clientes:
      listarBaseDe(majoritarioId).filter((v) => v.status === 'VIGENTE').length +
      subs.reduce((s, x) => s + x.clientesNaBase, 0),
    valorCarteira: centavos(contratos(todas).reduce((s, o) => s + o.valorContratado, 0)),
    valorEmAtraso: centavos(contratos(todas).reduce((s, o) => s + o.valorEmAtraso, 0)),
    inadimplenciaPct: inadimplencia(todas),
    comissaoBruta: centavos(comissaoPropria + margem + repasse),
    repasseAosSubs: repasse,
    comissaoLiquida: centavos(comissaoPropria + margem),
  };
}

export function redeDoMajoritario(majoritarioId: string): RedeDoMajoritarioResponse {
  const subs = listarSubs(majoritarioId).map((s) => montarSub(majoritarioId, s));
  return { majoritarioId, subs, tetos: tetos(), consolidado: consolidar(majoritarioId, subs) };
}

export function criarSubNaRede(
  majoritarioId: string,
  body: CriarSubRequest,
): { sub: SubCorrespondenteResponse } | ErroRede {
  if (!body.nome?.trim() || !body.email?.trim() || !body.cpf?.trim()) {
    return { erro: 'Nome, CPF e e-mail sao obrigatorios', status: 400 };
  }
  if (!/^\S+@\S+\.\S+$/.test(body.email)) return { erro: 'E-mail invalido', status: 400 };
  if (body.cpf.replace(/\D/g, '').length !== 11) return { erro: 'CPF invalido', status: 400 };
  if (emailCadastrado(body.email)) {
    return { erro: 'Ja existe um correspondente com este e-mail', status: 409 };
  }
  const problema = validarPercentuais(body.percentuais ?? []);
  if (problema) return { erro: problema, status: 422 };
  const sub = criarSub(majoritarioId, {
    nome: body.nome,
    cpf: body.cpf,
    email: body.email,
    telefone: body.telefone ?? '',
    percentuais: mapaDe(body.percentuais),
  });
  return { sub: montarSub(majoritarioId, sub) };
}

export function atualizarPercentuaisDoSub(
  majoritarioId: string,
  subId: string,
  body: AtualizarPercentuaisSubRequest,
): { sub: SubCorrespondenteResponse; anteriores: Record<string, number> } | ErroRede {
  const sub = consultarSub(subId);
  if (!sub || majoritarioDe(subId) !== majoritarioId) {
    return { erro: 'Sub-correspondente nao encontrado na sua rede', status: 404 };
  }
  if (!body.justificativa?.trim()) return { erro: 'A justificativa e obrigatoria', status: 400 };
  const problema = validarPercentuais(body.percentuais ?? []);
  if (problema) return { erro: problema, status: 422 };
  const anteriores = { ...sub.percentuais };
  definirPercentuaisSub(subId, mapaDe(body.percentuais));
  return { sub: montarSub(majoritarioId, consultarSub(subId) as SubBase), anteriores };
}

export function suspenderOuReativarSub(
  majoritarioId: string,
  subId: string,
  suspenso: boolean,
): { sub: SubCorrespondenteResponse } | ErroRede {
  const atual = consultarSub(subId);
  if (!atual || majoritarioDe(subId) !== majoritarioId) {
    return { erro: 'Sub-correspondente nao encontrado na sua rede', status: 404 };
  }
  if (atual.status === 'PENDENTE') {
    return { erro: 'O cadastro ainda aguarda a validacao do SEP', status: 409 };
  }
  const sub = suspenderSub(subId, suspenso) as SubBase;
  return { sub: montarSub(majoritarioId, sub) };
}

export function carteiraDaRede(majoritarioId: string): OperacaoDaRedeResponse[] {
  const propria = listarOperacoesDe(majoritarioId).map<OperacaoDaRedeResponse>((operacao) => ({
    origem: 'PROPRIA',
    subId: null,
    subNome: null,
    operacao,
  }));
  const dosSubs = listarSubs(majoritarioId).flatMap((s) =>
    listarOperacoesDe(s.id).map<OperacaoDaRedeResponse>((operacao) => ({
      origem: 'SUB',
      subId: s.id,
      subNome: s.nome,
      operacao,
    })),
  );
  return [...propria, ...dosSubs];
}

export function comissaoDaRede(majoritarioId: string): ComissaoDaRedeResponse {
  const propria = totalNaoEstornado(majoritarioId, (e) => e !== 'MARGEM_SUB');
  const linhas: ComissaoPorOrigem[] = [
    {
      origem: 'PROPRIA',
      subId: null,
      subNome: nomeDe(majoritarioId),
      bruta: propria,
      repasse: 0,
      liquida: propria,
    },
  ];
  for (const sub of listarSubs(majoritarioId)) {
    const doSub = totalNaoEstornado(sub.id);
    const margem = margemSobre(majoritarioId, sub.id);
    linhas.push({
      origem: 'SUB',
      subId: sub.id,
      subNome: sub.nome,
      bruta: centavos(doSub + margem),
      repasse: doSub,
      liquida: margem,
    });
  }
  const soma = (campo: 'bruta' | 'repasse' | 'liquida') =>
    centavos(linhas.reduce((s, l) => s + l[campo], 0));
  return {
    porOrigem: linhas,
    totalBruta: soma('bruta'),
    totalRepasse: soma('repasse'),
    totalLiquida: soma('liquida'),
  };
}

export function minhaPosicao(id: string): MinhaPosicaoNaRedeResponse {
  const nivel = nivelDe(id);
  if (nivel === 'SUB') {
    const sub = consultarSub(id);
    const majId = majoritarioDe(id);
    return {
      nivel,
      majoritarioNome: majId ? (consultarCorrespondente(majId)?.nome ?? null) : null,
      percentuais: percentuaisDe(sub?.percentuais ?? {}),
    };
  }
  return { nivel, majoritarioNome: null, percentuais: [] };
}

// Reexporta para os handlers poderem checar a pertenca sem importar dois stores.
export { comissoesDe };

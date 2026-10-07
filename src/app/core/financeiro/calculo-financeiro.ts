// Matematica financeira do SEP: uma so implementacao para tudo que mostra parcela, juros ou total.
//
// Antes, cada tela e cada mock fazia a sua conta: a proposta dividia o valor pelo prazo (sem juros) enquanto
// anunciava "2,4% a.m.", e a agenda mostrava juros zero. O resultado era uma carteira em que a taxa nao
// aparecia em lugar nenhum. Aqui a tabela Price e feita uma vez, em centavos inteiros, e quem precisa de
// parcela, de juros ou de saldo devedor pede a este modulo.
//
// Convencoes:
//  - taxa mensal como fracao (0,024 = 2,4% ao mes), nunca em porcentagem;
//  - valores em reais com 2 casas; a soma das parcelas de principal fecha EXATAMENTE no valor financiado
//    (a ultima parcela absorve a diferenca de arredondamento);
//  - carencia = meses iniciais em que so se pagam os juros do saldo, sem amortizar.

export interface ParcelaCalculada {
  numero: number;
  /** Data do vencimento, AAAA-MM-DD. */
  vencimento: string;
  /** Parte que abate a divida. */
  principal: number;
  /** Juros do periodo, sobre o saldo devedor anterior. */
  juros: number;
  /** principal + juros: o que o tomador paga. */
  total: number;
  /** Saldo devedor depois de pagar esta parcela. */
  saldoDevedor: number;
}

export interface EntradaCronograma {
  principal: number;
  /** Taxa mensal como fracao (0,024 = 2,4% a.m.). */
  taxaMensal: number;
  /** Numero de parcelas, carencia incluida. */
  prazoMeses: number;
  /** Meses iniciais so de juros. */
  carenciaMeses?: number;
  /** Vencimento da primeira parcela, AAAA-MM-DD. Sem ele, as datas ficam vazias. */
  primeiroVencimento?: string;
}

export interface ResumoCronograma {
  principal: number;
  totalJuros: number;
  totalAPagar: number;
  /** Parcela de amortizacao (a fixa da tabela Price); a da carencia e menor e a ultima pode diferir em centavos. */
  parcelaCheia: number;
}

/** Arredonda para centavos, sem o erro de ponto flutuante de `Math.round(x * 100) / 100` em x.xx5. */
export function centavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** "2,4% a.m." ou "2,4" -> 0,024. Devolve null quando nao e uma taxa. */
export function lerTaxaMensal(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const achado = /(\d+(?:[.,]\d+)?)\s*%/.exec(texto) ?? /^\s*(\d+(?:[.,]\d+)?)\s*$/.exec(texto);
  if (!achado) return null;
  const valor = parseFloat(achado[1].replace(',', '.'));
  return Number.isFinite(valor) ? valor / 100 : null;
}

/** Parcela fixa da tabela Price: PMT = PV * i / (1 - (1+i)^-n). Com taxa zero, e a divisao simples. */
export function parcelaPrice(principal: number, taxaMensal: number, prazoMeses: number): number {
  if (prazoMeses <= 0) return 0;
  if (taxaMensal <= 0) return centavos(principal / prazoMeses);
  return centavos((principal * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -prazoMeses)));
}

/** Taxa efetiva anual equivalente a uma taxa mensal composta. */
export function taxaAnualEfetiva(taxaMensal: number): number {
  return Math.pow(1 + taxaMensal, 12) - 1;
}

function somarMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  // Dia 31 num mes de 30 dias: cai no ultimo dia do mes, nao no 1o do seguinte.
  const ultimoDia = new Date(Date.UTC(ano, mes - 1 + meses + 1, 0)).getUTCDate();
  const data = new Date(Date.UTC(ano, mes - 1 + meses, Math.min(dia, ultimoDia)));
  return data.toISOString().slice(0, 10);
}

/**
 * Cronograma Price mes a mes. Em cada parcela: juros = saldo anterior x taxa; principal = parcela - juros;
 * a ultima parcela liquida o saldo que restar, absorvendo os centavos de arredondamento.
 */
export function gerarCronograma(entrada: EntradaCronograma): ParcelaCalculada[] {
  const { principal, taxaMensal, prazoMeses, primeiroVencimento } = entrada;
  const carencia = Math.min(Math.max(entrada.carenciaMeses ?? 0, 0), Math.max(prazoMeses - 1, 0));
  const amortizacoes = prazoMeses - carencia;
  const cheia = parcelaPrice(principal, taxaMensal, amortizacoes);
  const linhas: ParcelaCalculada[] = [];
  let saldo = centavos(principal);

  for (let i = 0; i < prazoMeses; i += 1) {
    const numero = i + 1;
    const juros = centavos(saldo * taxaMensal);
    let parteDoPrincipal: number;
    if (i < carencia) {
      parteDoPrincipal = 0;
    } else if (numero === prazoMeses) {
      parteDoPrincipal = saldo;
    } else {
      parteDoPrincipal = Math.min(centavos(cheia - juros), saldo);
    }
    saldo = centavos(saldo - parteDoPrincipal);
    linhas.push({
      numero,
      vencimento: primeiroVencimento ? somarMeses(primeiroVencimento, i) : '',
      principal: parteDoPrincipal,
      juros,
      total: centavos(parteDoPrincipal + juros),
      saldoDevedor: saldo,
    });
  }
  return linhas;
}

export function resumirCronograma(parcelas: readonly ParcelaCalculada[]): ResumoCronograma {
  const principal = centavos(parcelas.reduce((s, p) => s + p.principal, 0));
  const totalJuros = centavos(parcelas.reduce((s, p) => s + p.juros, 0));
  return {
    principal,
    totalJuros,
    totalAPagar: centavos(principal + totalJuros),
    parcelaCheia: (parcelas.find((p) => p.principal > 0) ?? parcelas[0])?.total ?? 0,
  };
}

/**
 * Custo efetivo mensal do contrato: a taxa que iguala o valor LIBERADO (financiado menos tarifas retidas)
 * ao valor presente das parcelas. Maior que a taxa nominal quando ha tarifa retida. Bissecao, sem biblioteca.
 */
export function custoEfetivoMensal(valorLiberado: number, totais: readonly number[]): number {
  if (valorLiberado <= 0 || totais.length === 0) return 0;
  const valorPresente = (i: number) =>
    totais.reduce((s, t, k) => s + t / Math.pow(1 + i, k + 1), 0);
  let baixo = 0;
  let alto = 1;
  for (let passo = 0; passo < 80; passo += 1) {
    const meio = (baixo + alto) / 2;
    if (valorPresente(meio) > valorLiberado) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}

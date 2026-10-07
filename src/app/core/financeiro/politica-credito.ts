// Condicoes comerciais do credito que mais de um lugar precisa conhecer. Espelham os parametros operacionais
// (Administracao > Parametros) e existem aqui porque o catalogo de parametros so e legivel pela
// administracao: o tomador, o simulador e o mock leem este modulo, e nenhum deles digita a taxa de novo.
// Antes, a proposta anunciava 2,4% a.m., o simulador calculava com 1,85% e a agenda nao cobrava juros.

/** Taxa de juros mensal da oferta padrao (2,4% a.m.), como fracao. */
export const TAXA_MENSAL_PADRAO = 0.024;

/** Tarifa de originacao retida no desembolso: o valor liberado e o contratado menos isto. */
export const TARIFA_ORIGINACAO_PCT = 0.04;

/** Estimativa de IOF mostrada ao tomador antes da contratacao; o valor real e apurado na liberacao. */
export const IOF_ESTIMADO_PCT = 0.0338;

/** Texto da taxa como a proposta exibe: "2,4% a.m.". */
export function textoTaxaMensal(taxaMensal: number = TAXA_MENSAL_PADRAO): string {
  return `${(taxaMensal * 100).toFixed(1).replace('.', ',')}% a.m.`;
}

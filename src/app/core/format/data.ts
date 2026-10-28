/**
 * Formata uma data ISO vinda da API para exibicao em `pt-BR`, sem nunca lancar e sem nunca inventar
 * um instante que o backend nao mandou.
 *
 * Corpo unico de verdade para os `formatarData`/`formatarDataHora` de cada feature, que continuam
 * existindo com nome e opcoes proprias: a escolha entre mostrar so a data ou data e hora e do call
 * site, e nao se generaliza. O que se generaliza e o tratamento do que **nao** formata.
 *
 * Tres desfechos:
 *
 * 1. **ausente** (`null`, `undefined`) -> `''`. Nao ha instante a mostrar, e a tela renderiza vazio
 *    em vez de uma data falsa.
 * 2. **presente mas nao parseavel** -> o proprio texto recebido. Falha visivel na tela e melhor que
 *    falha silenciosa: quem ve `"2026-13-45"` no lugar de uma data sabe que veio errado do servidor.
 *    String vazia cai aqui e devolve `''`, que e o desfecho 1 pelo caminho 2 — **nao ha guarda
 *    propria para `''`, e isso foi medido**: uma mutacao que a removia sobreviveu, porque
 *    `new Date('')` ja e `Invalid Date`. Guarda que nao morre por mutacao sai (licao da F-27).
 * 3. **parseavel** -> `Intl.DateTimeFormat('pt-BR', opcoes)`.
 *
 * **Por que `null` precisa de ramo proprio, e por que `Number.isNaN(data.getTime())` sozinho nao
 * basta.** Esta foi a causa do defeito que a FMF-4.1 fecha, e o ponto merece registro porque a
 * guarda "obvia" erra exatamente aqui:
 *
 * ```
 * new Date(undefined).getTime()  // NaN   -> a guarda por NaN pega
 * new Date('lixo').getTime()     // NaN   -> a guarda por NaN pega
 * new Date(null).getTime()       // 0     -> a guarda por NaN NAO pega
 * ```
 *
 * `new Date(null)` faz coercao numerica de `null` para `0` e devolve a **epoch**, que e um instante
 * perfeitamente valido. Formatado em `pt-BR` num fuso a oeste de Greenwich, sai **`31/12/1969`**.
 * Nao lanca, nao avisa, e o usuario le uma data plausivel de 1969 numa tela de produto financeiro.
 * As duas unicas versoes que tinham guarda antes desta funcao (F-27 e M-19) testavam so o `NaN` e
 * portanto renderizavam 1969 do mesmo jeito.
 *
 * O parametro e tipado `string` porque e isso que os modelos gerados do OpenAPI declaram. **O tipo
 * mente, e mente por um motivo medido**: o springdoc descarta `nullable` em OpenAPI 3.1 (aprendizado
 * (2) da Sprint 38), entao o documento inteiro tem zero marcas de nulidade e o gerador produz
 * `string` para campo que o backend pode mandar `null`. O `contract:check` nao ve diferenca. Por
 * isso a guarda e de runtime e nao de tipo — `iso == null` cobre `null` e `undefined` de uma vez.
 */
export function formatarDataIso(iso: string, opcoes: Intl.DateTimeFormatOptions): string {
  if (iso == null) {
    return '';
  }
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('pt-BR', opcoes).format(data);
}

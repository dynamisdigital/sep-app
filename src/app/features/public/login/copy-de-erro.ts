/**
 * Frases de erro compartilhadas entre `login` e `verify-totp` — as duas telas do mesmo fluxo de
 * autenticacao. Eram tres literais byte-identicos duplicados em cada uma; divergir sem querer e
 * facil, e a copy de desfecho de autenticacao e das que menos podem divergir.
 *
 * **Isto extrai a FRASE, nao o RAMO.** O operador de cada call site continua sendo decisao local:
 * `login` e `verify-totp` usam `??` sobre `mensagemBrutaDaApi`, que ja normaliza branco para
 * `undefined` (F-24.3), mas quais status caem no corpo da API e quais usam copia local difere entre
 * as duas telas de proposito — o `400` do `verify-totp`, por exemplo, precisa do corpo, porque o
 * backend colapsa tres causas nesse status e so o `message` as discrimina.
 */

/**
 * O servidor ACEITOU a operacao e o `tap` estourou ao persistir o token (localStorage cheio ou
 * desabilitado, como no modo privado do Safari). Nao veio do fio: acusar credencial ou conexao seria
 * mentira dupla.
 */
export const FALHA_DE_ARMAZENAMENTO_LOCAL =
  'Nao foi possivel concluir o acesso neste navegador. Verifique se o armazenamento local esta habilitado.';

/**
 * Fallback do `423` quando o corpo do servidor nao vem.
 *
 * **Follow-up conhecido, fora do escopo da F-24.7**: o "30 minutos" e fixo, e
 * `app.security.lockout.lockout-minutes` e sobrescrivel por ambiente — mesmo defeito que a F-23
 * corrigiu na `/account-locked`, onde a pagina passou a derivar os numeros de
 * `GET /auth/politica-lockout`. Aqui o literal so aparece quando corpo E `Retry-After` faltam, entao
 * o risco e menor; centralizado, consertar ficou barato: as duas telas consomem esta constante.
 */
export const CONTA_BLOQUEADA_FALLBACK =
  'Conta bloqueada temporariamente. Tente novamente em 30 minutos.';

/** Fallback de 5xx e status nao mapeados. */
export const SERVICO_INDISPONIVEL = 'Servico indisponivel no momento. Tente de novo em instantes.';

/**
 * Frases de erro compartilhadas entre `login` e `verify-totp` — as duas telas do mesmo fluxo de
 * autenticacao. Eram tres literais byte-identicos duplicados em cada uma; divergir sem querer e
 * facil, e a copy de desfecho de autenticacao e das que menos podem divergir.
 *
 * **Isto extrai a FRASE, nao o RAMO.** O operador de cada call site continua sendo decisao local:
 * `login` e `verify-totp` usam `??` sobre `mensagemBrutaDaApi`, que ja normaliza branco para
 * `undefined` (F-24.3), mas quais status caem no corpo da API e quais usam copia local difere entre
 * as duas telas de proposito — o `400` do `verify-totp`, por exemplo, precisa do corpo, porque o
 * backend colapsa tres causas nesse status.
 *
 * **Atualizado na F-26**: a frase daquele `400` continua vindo do corpo, mas o `message` deixou de
 * ser o unico discriminador — a Sprint 36 poe `codigo` no fio, e `verify-totp.component.ts` usa
 * `MFA-400-003`/`MFA-400-004` para escolher o ramo. A separacao anunciada neste docblock passou de
 * observacao a regra implementada: **codigo escolhe o ramo, corpo escolhe a frase.**
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
 * **Nao cita duracao, e isso e requisito.** Ate a F-26 a frase prometia "30 minutos", enquanto
 * `app.security.lockout.lockout-minutes` e sobrescrivel por ambiente: sob
 * `APP_LOCKOUT_LOCKOUT_MINUTES=60` a tela mentia por metade do bloqueio. E o mesmo defeito que a
 * F-23 ja havia corrigido na `/account-locked`, cujo docblock fixa o criterio — *entre vago e
 * verdadeiro ou preciso e falso, numa tela de desfecho de evento de seguranca, vago vence*.
 *
 * Nao inventar outro prazo no lugar. Quem tem numero verdadeiro para mostrar e o `Retry-After` do
 * `423` e o `GET /auth/politica-lockout`; este literal so aparece quando **os dois** faltam, que e
 * exatamente o caso em que nao ha numero para dizer. Centralizado desde a F-24.7, o conserto valeu
 * para as duas telas de uma vez.
 */
export const CONTA_BLOQUEADA_FALLBACK =
  'Conta bloqueada temporariamente. Aguarde o periodo de bloqueio antes de tentar de novo.';

/** Fallback de 5xx e status nao mapeados. */
export const SERVICO_INDISPONIVEL = 'Servico indisponivel no momento. Tente de novo em instantes.';

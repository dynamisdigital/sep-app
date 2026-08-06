/**
 * Endpoints publicos do sep-api que o web chama SEM sessao e para os quais a isencao ja foi
 * verificada. **Nao e a lista dos `permitAll`**: o `SecurityConfig` tem oito, e ficam de fora
 * `POST /usuarios`, `/auth/refresh`, `/auth/logout`, `/auth/totp/verify` e os webhooks.
 *
 * A omissao de `/auth/totp/verify` e um defeito conhecido, anterior a esta lista e nao corrigido
 * aqui: `handleTokenResponse` retorna cedo no ramo `mfaRequired` sem limpar o token, entao a
 * verificacao de TOTP leva um `Authorization` morto, toma 401 e o usuario perde o desafio. Corrigir
 * exige uma linha aqui e um teste — registrado como follow-up para nao misturar com o escopo desta
 * task. Quem for fechar: acrescentar a rota e cobrir o caminho do challenge.
 *
 * Nao e cosmetica. Um token velho ainda no storage faz o `JwtAuthenticationFilter` responder 401
 * ANTES de olhar a autorizacao. Em `/auth/politica-lockout` isso nao degrada a copy da pagina de
 * conta bloqueada: ARRANCA o usuario da pagina que o 423 acabou de abrir. O cenario e comum, nao
 * teorico — `/account-locked` e alcancavel por URL direta e por reload, e nesses caminhos ninguem
 * limpou o token antes.
 *
 * Lista, e nao um `HttpContextToken` como `TRATA_403_LOCALMENTE`: aquele token existe porque o
 * interceptor NAO pode inferir se a tela trata 403 localmente — ali a decisao e mesmo do call site.
 * Ser publico e propriedade do ENDPOINT, que o interceptor le da URL; um token faria cada chamador
 * ter de lembrar, e esquecer voltaria ao bug em silencio.
 *
 * COMPARTILHADA de proposito entre o `authInterceptor` (nao anexa `Authorization`) e o
 * `errorInterceptor` (nao navega para fora em 401/403). Duas listas divergem na proxima rota
 * publica, e foi exatamente essa divergencia que manteve o defeito vivo: a F-23 isentou
 * `/auth/politica-lockout` so no `authInterceptor`, o que impede o header de ser ENVIADO mas nao
 * impede a resposta de ser TRATADA — o `errorInterceptor` e o ultimo da cadeia
 * (`app.config.ts`), logo o mais interno, e ve o erro antes do `catchError` do servico.
 */
const ROTAS_PUBLICAS = ['/auth/login', '/auth/politica-lockout'];

/**
 * Verdadeiro quando a URL e de um endpoint publico. Predicado, e nao a lista exportada, para que a
 * forma de casar a URL fique num lugar so — dois `some(...)` copiados divergiriam como as duas
 * listas divergiram.
 */
export function ehRotaPublica(url: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => url.includes(rota));
}

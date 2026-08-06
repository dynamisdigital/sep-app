/**
 * Endpoints publicos do sep-api que o web chama SEM sessao e para os quais a isencao ja foi
 * verificada. **Nao e a lista dos `permitAll`**: o `SecurityConfig` tem oito
 * (`SecurityConfig.java:61-85`), e ficam de fora `POST /usuarios`, `/auth/refresh`, `/auth/logout` e
 * os webhooks.
 *
 * **Acrescentar uma rota aqui tem DOIS efeitos, nao um**: o `authInterceptor` para de anexar o
 * `Authorization` E o `errorInterceptor` para de navegar em 401/403. Uma rota so entra se os dois
 * forem desejados. E por isso que `/auth/refresh` e `/auth/logout`, ambos `permitAll`, ficam de
 * fora: um 401 neles significa sessao morta e PRECISA navegar para `/login`. "Publico no backend"
 * nao implica "erro benigno" — sao duas propriedades diferentes sob um nome so.
 *
 * `/auth/totp/verify` entrou na F-24.2, fechando defeito anterior a esta lista:
 * `handleTokenResponse` (`auth.service.ts:124-128`) retorna cedo no ramo `mfaRequired` **sem limpar
 * o token**, entao um token de sessao anterior sobrevive ate o desafio, viajava na verificacao,
 * tomava 401 do `JwtAuthenticationFilter` e o usuario perdia o desafio de MFA.
 *
 * O segundo efeito (suprimir o redirect de 401) e **vacuo** para esta rota, e vale registrar por
 * que, senao a proxima leitura acha que falta um ramo de 401 em `verify-totp.component.ts`:
 * `JwtAuthenticationFilter.java:39-42` faz `chain.doFilter` e retorna quando NAO ha header, entao
 * parar de enviar o `Authorization` remove o unico produtor de 401 neste endpoint — o handler nunca
 * responde 401, porque `MfaChallengeInvalidoException extends ValidacaoException`, que o
 * `ApiExceptionHandler` mapeia para 400. Nao ha 401 a tratar, e tratar um seria codigo morto.
 * **A vacuidade depende da isencao**: quem voltar a mandar `Authorization` nesta rota perde as duas
 * protecoes de uma vez.
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
const ROTAS_PUBLICAS = ['/auth/login', '/auth/politica-lockout', '/auth/totp/verify'];

/**
 * Verdadeiro quando a URL e de um endpoint publico. Predicado, e nao a lista exportada, para que a
 * forma de casar a URL fique num lugar so — dois `some(...)` copiados divergiriam como as duas
 * listas divergiram.
 *
 * Casa o FIM do `pathname`, nao um `includes` na URL crua. `/auth/login` e um prefixo propenso a
 * colisao: um futuro `/auth/login-attempts` (o backend ja tem a tabela `login_attempt`) seria
 * aceito por `includes` e perderia de uma vez o `Authorization` e o redirect de 401/403 — o mesmo
 * tipo de degradacao silenciosa que esta lista existe para matar. Usar o `pathname` tambem descarta
 * query string, entao nenhum parametro pode simular uma rota publica.
 */
export function ehRotaPublica(url: string): boolean {
  const caminho = new URL(url, window.location.origin).pathname;
  return ROTAS_PUBLICAS.some((rota) => caminho.endsWith(rota));
}

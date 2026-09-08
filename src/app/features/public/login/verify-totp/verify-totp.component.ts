import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { codigoDeErroDaApi, mensagemBrutaDaApi } from '../../../../core/api/api-error';
import {
  CONTA_BLOQUEADA_FALLBACK,
  FALHA_DE_ARMAZENAMENTO_LOCAL,
  SERVICO_INDISPONIVEL,
} from '../copy-de-erro';
import { AuthService } from '../../../../core/auth/auth.service';
import { MfaService } from '../../../../core/auth/mfa.service';

/**
 * Traducao de borda: erro da verificacao de TOTP -> mensagem para o usuario. Mesmo desenho do
 * `mensagemDeErroDeLogin`, mas a copy NAO e a mesma: aqui o 400 nao e "confira e-mail e senha".
 *
 * O 400 usa o corpo de proposito. `MfaController.verify` colapsa tres causas distintas no mesmo
 * status — "Codigo invalido, challenge expirado ou MFA nao habilitado" — e o backend discrimina as
 * tres pelo `message` (`TotpInvalidoException` "Codigo TOTP invalido ou expirado.",
 * `MfaChallengeInvalidoException` "Desafio MFA invalido ou expirado. Refaca o login.",
 * `MfaNaoHabilitadoException` "MFA TOTP nao esta habilitado para este usuario."). O `message` segue
 * fornecendo a FRASE — um literal local mandaria quem teve o desafio expirado redigitar codigo para
 * sempre, em vez de refazer o login.
 *
 * **Mudou na F-26**: o `ErrorResponseDto` passou a serializar o codigo (`MFA-400-00x`) desde a
 * Sprint 36 do `sep-api`, entao o `message` deixou de ser o unico discriminador. O codigo escolhe o
 * RAMO; a frase continua vindo do corpo. Ver `ehDesfechoTerminal` logo abaixo — e o docblock de
 * `copy-de-erro.ts`, que e a casa dessa separacao.
 *
 * O 401 e **fallback defensivo**, como o 423, e nao caminho normal. Contra o backend de hoje ele nao
 * e produzivel aqui: o unico 401 do lado do handler e
 * `ApiExceptionHandler.java:121-124` (`@ExceptionHandler(AuthenticationException.class)`), e nada no
 * caminho de `VerificarTotpUseCase` lanca `AuthenticationException` — esse e o invariante a
 * reconferir, e nao o mapeamento de uma excecao isolada. Do lado do filtro, `/auth/totp/verify`
 * entrou na lista de `core/interceptors/rotas-publicas.ts` na F-24.2, entao nenhum `Authorization`
 * viaja mais e `JwtAuthenticationFilter.java:39-43` faz `chain.doFilter` sem olhar token.
 *
 * O ramo existe mesmo assim porque a improdutibilidade depende de **duas** pre-condicoes, e uma
 * delas mora no outro repo: a isencao continuar na lista **e** `SecurityConfig.java:82-83` manter o
 * `permitAll`. Se o `permitAll` cair — ou se este web rodar contra um backend mais antigo, cenario
 * que a F-24.1 tratou como real para a rota irma —, o POST anonimo e negado pelo `AuthorizationFilter`
 * e volta 401 **sem nenhum `Authorization` no fio**. Como a rota tambem esta isenta no
 * `errorInterceptor`, esse 401 nao redireciona: sem este ramo ele escorreria para o `default:` e a
 * tela anunciaria "Servico indisponivel" numa falha de autenticacao, prendendo o usuario no desafio.
 * Tres linhas de ramo morto contra um beco sem saida com copy enganosa.
 *
 * A justificativa ANTERIOR da ausencia — "o `errorInterceptor` navega para /login e destroi este
 * componente" — **nao vale mais**: aquela lista alimenta os dois interceptors desde a F-24.1, entao
 * o redirect de 401 tambem foi suprimido para esta rota.
 *
 * O 423 e fallback defensivo, nao caminho normal: o `errorInterceptor` ja fez `clearSession()` e
 * navegou para /account-locked antes deste componente renderizar. NAO trocar por navegacao aqui — o
 * redirect do 423 e responsabilidade unica do interceptor.
 */
const FORMATO_INVALIDO =
  'Informe o codigo de 6 digitos do aplicativo ou um backup code de 8 caracteres.';

/**
 * Os dois codigos do `400` em que **redigitar e impossivel**, e por isso o formulario vira armadilha:
 *
 * - `MFA-400-004` (`MfaChallengeInvalidoException`) — o desafio morreu. A propria copy do backend
 *   manda refazer o login.
 * - `MFA-400-003` (`MfaNaoHabilitadoException`) — a conta nao tem TOTP ativo. Nenhum codigo que o
 *   usuario digite pode dar certo aqui.
 *
 * `MFA-400-002` (`TotpInvalidoException`) fica **fora** de proposito: ali o desafio segue vivo e
 * tentar de novo e exatamente o que a pessoa deve fazer.
 *
 * Ate a F-26 os tres caiam no mesmo lugar — erro inline, formulario visivel —, e quem chegava aqui
 * com desafio expirado redigitava codigo contra um challenge morto ate desistir. E um conjunto de
 * RAMO, nao de copy: nenhuma frase mora nele.
 */
const CODIGOS_DE_DESFECHO_TERMINAL = new Set(['MFA-400-003', 'MFA-400-004']);

/**
 * So o `400` consulta o codigo. Os demais status ja tem tratamento proprio e nao ganham ramo novo
 * nesta sprint — `423` e `429` inclusive, cujos codigos a Sprint 36 deixou **fora** do perimetro
 * porque vem da cadeia de seguranca, que escreve na response sem passar pelo handler.
 *
 * Codigo ausente ou desconhecido devolve `false`: backend anterior a 36, handler sem taxonomia e
 * codigo que a Sprint 37 venha a criar caem todos no comportamento legado por status.
 */
function ehDesfechoTerminal(erro: unknown): boolean {
  if (!(erro instanceof HttpErrorResponse) || erro.status !== 400) {
    return false;
  }
  const codigo = codigoDeErroDaApi(erro);
  return codigo !== undefined && CODIGOS_DE_DESFECHO_TERMINAL.has(codigo);
}

function mensagemDeErroDeTotp(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return 'Nao foi possivel concluir a verificacao. Tente de novo em instantes.';
  }

  // `mensagemBrutaDaApi` normaliza branco para `undefined`, entao o `??` dos ramos abaixo e o
  // operador certo. O porque da guarda mora em `core/api/api-error.ts`, casa unica desse raciocinio
  // — este comentario ja carregou duas explicacoes diferentes e erradas do produtor de `message`
  // vazia, e centralizar e o que impede a terceira.
  const mensagemDaApi = mensagemBrutaDaApi(erro);

  switch (erro.status) {
    case 400:
      return (
        mensagemDaApi ?? 'Codigo invalido ou desafio expirado. Refaca o login e tente de novo.'
      );
    case 401:
      // Fallback defensivo (ver docblock): improduzivel contra o backend de hoje, mas nao ha como
      // este repo garantir o `permitAll` que sustenta isso. Copia local e nao `mensagemDaApi`: o
      // `ApiAuthenticationEntryPoint` responde "Autenticacao requerida", que nao diz ao usuario o
      // que fazer.
      return 'Sua sessao expirou. Refaca o login e tente de novo.';
    case 423:
      // A duracao real vem de `app.security.lockout.lockout-minutes`, sobrescrevivel por ambiente:
      // fixar 30 aqui faria a tela mentir apos um override.
      return mensagemDaApi ?? CONTA_BLOQUEADA_FALLBACK;
    case 429:
      // Copia local de proposito: o RateLimitFilter responde "Limite de requisicoes excedido.
      // Aguarde antes de tentar novamente.", sem dizer quanto esperar. A janela e de 1 minuto.
      return 'Muitas tentativas seguidas. Aguarde cerca de 1 minuto e tente de novo.';
    case 0:
      // Rede, CORS ou offline. Requisito, nao detalhe: falha de rede jamais pode ser reportada
      // como codigo invalido.
      return 'Nao foi possivel verificar o codigo agora. Verifique sua conexao e tente de novo.';
    default:
      // 5xx e status nao mapeados. Em 5xx o errorInterceptor ja anexou o codigo de suporte ao
      // `message` via withSupportReference; descartar o corpo tiraria o traceId do usuario.
      return mensagemDaApi ?? SERVICO_INDISPONIVEL;
  }
}

@Component({
  selector: 'sep-verify-totp',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-totp.component.html',
  styleUrl: './verify-totp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyTotpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly mfaService = inject(MfaService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly challengeAusente = signal<boolean>(!this.authService.pendingMfaChallenge());
  /**
   * Texto do bloco terminal quando quem o abriu foi o backend, e nao a ausencia local de challenge.
   * `null` preserva a copy fixa do template — o ramo "nao ha challenge pendente" nao mudou.
   *
   * Existe separado de `errorMessage` porque os dois vivem em ramos mutuamente exclusivos do
   * template: reaproveitar um so signal faria o bloco terminal e o erro inline disputarem o mesmo
   * valor, e um teste que verificasse o texto nao distinguiria qual ramo o produziu.
   */
  protected readonly mensagemTerminal = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    // O formato vem do contrato do `TotpVerifyRequestDto`: 6 digitos OU backup code de 8
    // alfanumericos. Sem isto `Validators.required` aceita so espacos, o `@NotBlank` do backend
    // reprova e o `ApiExceptionHandler` devolve "codigo must not be blank" — texto de bean
    // validation, que a tela exibiria cru para o usuario.
    codigo: ['', [Validators.required, Validators.pattern(/^(\d{6}|[A-Za-z0-9]{8})$/)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(FORMATO_INVALIDO);
      return;
    }
    const challengeId = this.authService.pendingMfaChallenge();
    if (!challengeId) {
      this.challengeAusente.set(true);
      return;
    }
    this.loading.set(true);
    // NAO remover por parecer redundante: zerar a mensagem destroi o no do `@if`, e o callback de
    // erro o recria. Sem isso, dois erros consecutivos de texto identico nao mudam o DOM e a live
    // region `role="alert"` do template nao anuncia o segundo.
    this.errorMessage.set(null);
    this.mfaService
      .verify({ mfaChallengeId: challengeId, codigo: this.form.controls.codigo.value })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          try {
            this.authService.applyMfaVerifyResponse(response);
          } catch {
            // O servidor ACEITOU o codigo; quem falhou foi persistir a sessao (localStorage cheio
            // ou desabilitado, como no modo privado do Safari). Sem este catch a excecao viraria
            // unhandled error do RxJS — `next` nao alimenta o callback de erro — e a tela ficaria
            // muda com o desafio ja consumido, empurrando o usuario para um retry impossivel.
            this.errorMessage.set(FALHA_DE_ARMAZENAMENTO_LOCAL);
            return;
          }
          if (response.usuario?.precisaRedefinirSenha) {
            void this.router.navigateByUrl('/app/profile/change-password?forced=true');
            return;
          }
          void this.router.navigateByUrl('/app/dashboard');
        },
        error: (erro: unknown) => {
          this.loading.set(false);
          // A frase e a mesma dos dois lados: o codigo escolhe ONDE ela aparece, nao QUAL ela e.
          const mensagem = mensagemDeErroDeTotp(erro);
          if (ehDesfechoTerminal(erro)) {
            this.mensagemTerminal.set(mensagem);
            this.challengeAusente.set(true);
            return;
          }
          this.errorMessage.set(mensagem);
        },
      });
  }
}

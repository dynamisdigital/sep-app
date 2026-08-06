import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/api/api.models';
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
 * `MfaNaoHabilitadoException` "MFA TOTP nao esta habilitado para este usuario."). O `ErrorResponseDto`
 * nao serializa o codigo (`MFA-400-00x`), entao o `message` e o unico discriminador no fio: um
 * literal local mandaria quem teve o desafio expirado redigitar codigo para sempre, em vez de
 * refazer o login.
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

function mensagemDeErroDeTotp(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return 'Nao foi possivel concluir a verificacao. Tente de novo em instantes.';
  }

  // `||` e nao `??` de proposito: `message` vazia e produzivel — um `ErrorResponseDto` de 400 ou 423
  // pode chegar com o campo em branco, caso coberto pelos testes desta spec. Com `??` a string vazia
  // passaria adiante e o `@if` do template, que a trata como falsy, nao criaria o no `role="alert"`:
  // a tela ficaria muda apos o erro.
  // O produtor citado aqui antes era o `sendError` do `JwtAuthenticationFilter`; ele deixou de ser
  // alcancavel nesta rota na F-24.2, quando o `Authorization` parou de viajar. A guarda continua
  // necessaria pelo caso acima.
  const mensagemDaApi = (erro.error as ApiErrorResponse | undefined)?.message?.trim();

  switch (erro.status) {
    case 400:
      return (
        mensagemDaApi || 'Codigo invalido ou desafio expirado. Refaca o login e tente de novo.'
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
      return mensagemDaApi || 'Conta bloqueada temporariamente. Tente novamente em 30 minutos.';
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
      return mensagemDaApi || 'Servico indisponivel no momento. Tente de novo em instantes.';
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
            this.errorMessage.set(
              'Nao foi possivel concluir o acesso neste navegador. Verifique se o armazenamento local esta habilitado.',
            );
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
          this.errorMessage.set(mensagemDeErroDeTotp(erro));
        },
      });
  }
}

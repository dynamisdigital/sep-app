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
 * NAO ha ramo de 401. O *handler* nunca o responde — `MfaChallengeInvalidoException` estende
 * `ValidacaoException`, que o `ApiExceptionHandler` mapeia para 400, e o OpenAPI declara so
 * 200/400/423/429. Um 401 aqui so pode vir do `JwtAuthenticationFilter`, que roda antes da
 * autorizacao e rejeita token expirado mesmo em rota `permitAll`; o `authInterceptor` isenta apenas
 * `/auth/login`, entao um token velho ainda viaja nesta chamada. Nesse caminho o `errorInterceptor`
 * ja faz `clearSession()` e navega para /login, destruindo este componente antes que qualquer
 * mensagem pudesse ser lida — por isso o ramo continua nao existindo.
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

  // `||` e nao `??` de proposito: `message` vazia e produzivel — o `JwtAuthenticationFilter` usa
  // `response.sendError(...)`, e com `server.error.include-message` nao configurado o Spring Boot
  // emite `"message": ""`. Com `??` a string vazia passaria adiante e o `@if` do template, que a
  // trata como falsy, nao criaria o no `role="alert"`: a tela ficaria muda apos o erro.
  const mensagemDaApi = (erro.error as ApiErrorResponse | undefined)?.message?.trim();

  switch (erro.status) {
    case 400:
      return (
        mensagemDaApi || 'Codigo invalido ou desafio expirado. Refaca o login e tente de novo.'
      );
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

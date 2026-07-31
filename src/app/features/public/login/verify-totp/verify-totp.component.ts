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
 * NAO ha ramo de 401: este endpoint nunca o responde. `MfaChallengeInvalidoException` estende
 * `ValidacaoException`, que o `ApiExceptionHandler` mapeia para 400, e o OpenAPI declara so
 * 200/400/423/429. Um ramo de 401 aqui seria codigo morto.
 *
 * O 423 e fallback defensivo, nao caminho normal: o `errorInterceptor` ja fez `clearSession()` e
 * navegou para /account-locked antes deste componente renderizar. NAO trocar por navegacao aqui — o
 * redirect do 423 e responsabilidade unica do interceptor.
 */
function mensagemDeErroDeTotp(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return 'Nao foi possivel concluir a verificacao. Tente de novo em instantes.';
  }

  const mensagemDaApi = (erro.error as ApiErrorResponse | undefined)?.message;

  switch (erro.status) {
    case 400:
      return (
        mensagemDaApi ?? 'Codigo invalido ou desafio expirado. Refaca o login e tente de novo.'
      );
    case 423:
      // A duracao real vem de `app.security.lockout.lockout-minutes`, sobrescrevivel por ambiente:
      // fixar 30 aqui faria a tela mentir apos um override.
      return mensagemDaApi ?? 'Conta bloqueada temporariamente. Tente novamente em 30 minutos.';
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
      return mensagemDaApi ?? 'Servico indisponivel no momento. Tente de novo em instantes.';
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
    codigo: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const challengeId = this.authService.pendingMfaChallenge();
    if (!challengeId) {
      this.challengeAusente.set(true);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.mfaService
      .verify({ mfaChallengeId: challengeId, codigo: this.form.controls.codigo.value })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.authService.applyMfaVerifyResponse(response);
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

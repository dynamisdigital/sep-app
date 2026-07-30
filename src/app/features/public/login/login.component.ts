import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';

/**
 * Traducao de borda: status HTTP -> mensagem para o usuario. O status e o unico discriminador
 * disponivel no fio — o ErrorResponseDto do sep-api nao carrega campo de codigo, e o
 * `AUTH-423-001` de ContaBloqueadaException nunca e serializado.
 *
 * O 423 aparece aqui como fallback defensivo, nao como caminho normal: no fluxo normal o
 * errorInterceptor ja navegou para /account-locked e este componente foi destruido antes de
 * renderizar. Se a navegacao for cancelada um dia (um guard novo, por exemplo), o usuario nao
 * pode ficar lendo "senha invalida". NAO trocar por navegacao aqui — o redirect do 423 e
 * responsabilidade unica do errorInterceptor, que tambem faz clearSession() e cobre o 423 vindo
 * de /auth/totp/verify.
 */
function mensagemDeErroDeLogin(status: number): string {
  switch (status) {
    case 400:
      return 'Dados invalidos. Confira o e-mail e a senha e tente de novo.';
    case 401:
      return 'E-mail ou senha invalidos.';
    case 423:
      return 'Conta bloqueada temporariamente. Tente novamente em 30 minutos.';
    case 429:
      // Rate limit por IP (RateLimitFilter), nao o account lockout: nao ha conta trancada aqui,
      // so requisicoes demais na janela de 1 minuto.
      return 'Muitas tentativas seguidas. Aguarde cerca de 1 minuto e tente de novo.';
    default:
      // Inclui status 0 (falha de rede/CORS) e 5xx. Requisito, nao detalhe: falha de rede jamais
      // pode ser reportada como senha invalida.
      return 'Nao foi possivel entrar agora. Verifique sua conexao e tente de novo.';
  }
}

@Component({
  selector: 'sep-login',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    // Sprint 5: politica server-side (12+ chars ou passphrase). Bean Validation
    // bloqueia senha vazia; aqui exigimos apenas obrigatorio para UX previa.
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.mfaRequired) {
          void this.router.navigateByUrl('/login/verify-totp');
          return;
        }
        if (response.usuario?.precisaRedefinirSenha) {
          void this.router.navigateByUrl('/app/profile/change-password?forced=true');
          return;
        }
        void this.router.navigateByUrl('/app/dashboard');
      },
      error: (erro: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(mensagemDeErroDeLogin(erro.status));
      },
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { mensagemBrutaDaApi } from '../../../core/api/api-error';
import { esperaDoRetryAfter } from '../../../core/api/retry-after';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Traducao de borda: erro do login -> mensagem para o usuario. O status HTTP e o unico
 * discriminador de *categoria* disponivel no fio — o ErrorResponseDto do sep-api nao carrega campo
 * de codigo, e o `AUTH-423-001` de ContaBloqueadaException nunca e serializado. Ja o `message` do
 * corpo existe e, em dois casos, e mais autoritativo que qualquer literal daqui.
 *
 * O 423 aparece aqui como fallback defensivo, nao como caminho normal: no fluxo normal o
 * errorInterceptor ja navegou para /account-locked e este componente foi destruido antes de
 * renderizar. Se a navegacao for cancelada um dia (um guard novo, por exemplo), o usuario nao
 * pode ficar lendo "senha invalida". NAO trocar por navegacao aqui — o redirect do 423 e
 * responsabilidade unica do errorInterceptor, que tambem faz clearSession() e cobre o 423 vindo
 * de /auth/totp/verify.
 */
function mensagemDeErroDeLogin(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    // Nao veio do fio: o `tap` de AuthService.login estourou ao persistir o token (localStorage
    // cheio ou desabilitado, como no modo privado do Safari). O servidor ACEITOU o login, entao
    // acusar credencial ou conexao seria mentira dupla.
    return 'Nao foi possivel concluir o acesso neste navegador. Verifique se o armazenamento local esta habilitado.';
  }

  // `mensagemBrutaDaApi` normaliza branco para `undefined`, entao o `??` dos ramos abaixo volta a
  // ser o operador certo. O porque da guarda — e por que ela e defensiva, nao correcao de um bug
  // observado — esta em `core/api/api-error.ts`, casa unica desse raciocinio.
  const mensagemDaApi = mensagemBrutaDaApi(erro);

  switch (erro.status) {
    case 400:
      return 'Dados invalidos. Confira o e-mail e a senha e tente de novo.';
    case 401:
      // Copia local de proposito: o sep-api responde "Autenticacao requerida" no 401
      // (ApiExceptionHandler), que orienta menos o usuario que a frase daqui.
      return 'E-mail ou senha invalidos.';
    case 423: {
      // O header GANHA do corpo, e essa ordem e o ponto todo: a `message` do sep-api e montada a
      // partir de `lockoutMinutes` (a duracao NOMINAL da politica), nao do relogio, entao ela
      // superestima a espera por design — quem esta bloqueado ha 29 minutos le "30 minutos". O
      // `Retry-After` traz os segundos que realmente faltam.
      // Sem header (corpo antigo, proxy que filtrou, CORS mal configurado), cai no comportamento
      // anterior: a duracao real vem de `app.security.lockout.lockout-minutes`, sobrescrevivel por
      // ambiente, entao o corpo do servidor ainda ganha do literal local.
      const espera = esperaDoRetryAfter(erro);
      return espera
        ? `Conta bloqueada temporariamente. Tente novamente em ${espera}.`
        : (mensagemDaApi ?? 'Conta bloqueada temporariamente. Tente novamente em 30 minutos.');
    }
    case 429: {
      // Rate limit por IP (RateLimitFilter), nao o account lockout: nao ha conta trancada aqui,
      // so requisicoes demais na janela.
      // O "cerca de" fica so aqui: o `Retry-After` do 429 e o periodo de refresh do limitador
      // (60s constantes), um limite SUPERIOR e nao a espera exata — ao contrario do 423, onde o
      // header e o restante real e hedge seria ruido.
      const espera = esperaDoRetryAfter(erro);
      return `Muitas tentativas seguidas. Aguarde cerca de ${espera ?? '1 minuto'} e tente de novo.`;
    }
    case 0:
      // Rede, CORS ou offline. Requisito, nao detalhe: falha de rede jamais pode ser reportada
      // como senha invalida.
      return 'Nao foi possivel entrar agora. Verifique sua conexao e tente de novo.';
    default:
      // 5xx e status nao mapeados. Em 5xx o errorInterceptor ja anexou o codigo de suporte ao
      // `message` via withSupportReference; descartar o corpo tiraria o traceId do usuario, e
      // mandar ele conferir a conexao apontaria para o lado errado do problema.
      return mensagemDaApi ?? 'Servico indisponivel no momento. Tente de novo em instantes.';
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
    // NAO remover por parecer redundante: zerar a mensagem destroi o no do `@if`, e o callback de
    // erro o recria. Sem isso, dois erros consecutivos de texto identico nao mudam o DOM e a live
    // region `role="alert"` do template nao anuncia o segundo.
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
      error: (erro: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(mensagemDeErroDeLogin(erro));
      },
    });
  }
}

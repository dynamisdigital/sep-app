import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Destino do redirect global de 423 (`errorInterceptor`), tambem alcancavel por URL direta.
 *
 * Copy estatica de proposito: o interceptor navega e descarta o `HttpErrorResponse`, entao a
 * `message` do servidor nao chega ate aqui — e a pagina tambem responde a um 423 de qualquer
 * endpoint, onde nao ha mensagem alguma.
 *
 * Cada afirmacao da copy foi conferida contra o sep-api:
 * - "ate 30 minutos, contados a partir da ultima tentativa": `PoliticaLockout.eventoDeBloqueio`
 *   mede o prazo a partir da falha que fecha a janela, nao de quando esta tela abre. Como nenhuma
 *   falha e gravada durante o bloqueio (`verificar()` roda antes do registro), o prazo nunca se
 *   estende — mas quem chega aqui depois pode ter menos tempo restante. Dizer "30 minutos" seco
 *   superestimava a espera. O 30 vem de `app.security.lockout.lockout-minutes`, sobrescrevivel
 *   por ambiente: se ops mudar, esta pagina desalinha (follow-up: expor o valor no contrato).
 * - "senha ou codigo de verificacao": `LockoutService.STATUSES_FALHA` conta SENHA_INVALIDA e
 *   TOTP_INVALIDO, e `VerificarTotpUseCase` lanca o mesmo 423 — quem errou o TOTP tambem cai aqui.
 * - "nao existe liberacao manual": conferido que nao ha endpoint de unlock, acao de backoffice,
 *   job ou delete em `LoginAttemptRepository`. A unica saida e a expiracao. A frase descreve o
 *   sistema sem mandar o usuario desistir de pedir ajuda — nao ha fluxo de recuperacao de senha
 *   para quem nao esta autenticado.
 * - a orientacao de seguranca nao cita "revisar dispositivos": nao existe tela de sessoes, e
 *   `AuthService.logoutAll()` nao tem nenhum chamador.
 */
@Component({
  selector: 'sep-account-locked',
  imports: [RouterLink],
  template: `
    <main class="sep-account-locked">
      <section class="sep-account-locked-card" aria-labelledby="account-locked-title">
        <span class="sep-account-locked-badge" aria-hidden="true">423</span>
        <h1 #titulo id="account-locked-title" tabindex="-1">Conta bloqueada temporariamente</h1>
        <p>
          Detectamos varias tentativas de acesso malsucedidas — senha ou codigo de verificacao. Por
          seguranca, sua conta fica bloqueada por ate 30 minutos, contados a partir da ultima
          tentativa.
        </p>
        <p>
          O desbloqueio e automatico e acontece so por expiracao desse prazo: nao existe liberacao
          manual. Depois disso, basta entrar de novo.
        </p>
        <p>
          Se voce nao reconhece essas tentativas, troque sua senha assim que o acesso for
          restabelecido.
        </p>
        <a routerLink="/login" class="sep-account-locked-link">Voltar ao login</a>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        background: hsl(var(--background));
      }
      .sep-account-locked {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: var(--sep-space-32);
      }
      .sep-account-locked-card {
        max-width: 480px;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--sep-radius-lg);
        padding: var(--sep-space-32);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        gap: var(--sep-space-17);
        text-align: center;
      }
      .sep-account-locked-badge {
        align-self: center;
        background: hsl(var(--destructive) / 12%);
        color: hsl(var(--destructive));
        padding: 4px 12px;
        border-radius: var(--sep-radius-pill);
        font-size: 13px;
        font-weight: 600;
      }
      h1 {
        margin: 0;
        color: hsl(var(--foreground));
      }
      p {
        margin: 0;
        color: hsl(var(--muted-foreground));
      }
      .sep-account-locked-link {
        color: hsl(var(--primary));
        text-decoration: none;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLockedComponent implements AfterViewInit {
  private readonly titulo = viewChild.required<ElementRef<HTMLHeadingElement>>('titulo');

  ngAfterViewInit(): void {
    // Esta pagina e destino de redirect automatico do errorInterceptor. O Angular nao move foco na
    // navegacao e o app nao tem live region de rota, entao sem isto o foco cai em <body> e o
    // usuario de leitor de tela fica em silencio numa tela nova, sem saber que a conta foi
    // bloqueada — justo no desfecho de um evento de seguranca.
    this.titulo().nativeElement.focus();
  }
}

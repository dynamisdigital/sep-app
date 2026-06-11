import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sep-account-locked',
  imports: [RouterLink],
  template: `
    <section class="sep-account-locked">
      <div class="sep-account-locked-card">
        <span class="sep-account-locked-badge">423</span>
        <h1>Conta bloqueada temporariamente</h1>
        <p>
          Detectamos varias tentativas de login com credenciais invalidas. Por seguranca, sua conta
          ficara bloqueada por alguns minutos. Tente novamente em breve.
        </p>
        <p>
          Se voce nao reconhece essas tentativas, troque sua senha e revise os dispositivos
          conectados assim que o acesso for restabelecido.
        </p>
        <a routerLink="/login" class="sep-account-locked-link">Voltar ao login</a>
      </div>
    </section>
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
export class AccountLockedComponent {}

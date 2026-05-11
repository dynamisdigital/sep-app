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
        background: var(--apple-color-canvas-parchment);
      }
      .sep-account-locked {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: var(--apple-space-xl);
      }
      .sep-account-locked-card {
        max-width: 480px;
        background: var(--apple-color-canvas-light);
        border-radius: var(--apple-radius-lg);
        padding: var(--apple-space-xl);
        box-shadow: var(--apple-shadow-product);
        display: flex;
        flex-direction: column;
        gap: var(--apple-space-md);
        text-align: center;
      }
      .sep-account-locked-badge {
        align-self: center;
        background: #fbecec;
        color: #b00020;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
      }
      h1 {
        margin: 0;
      }
      p {
        margin: 0;
        color: var(--apple-color-ink-muted-80);
      }
      .sep-account-locked-link {
        color: var(--apple-color-ink);
        text-decoration: none;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLockedComponent {}

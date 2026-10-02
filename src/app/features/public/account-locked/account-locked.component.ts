import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'sep-account-locked',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <section class="sep-account-locked">
      <button
        type="button"
        class="sep-tema-publico"
        [attr.aria-label]="temaEscuro() ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'"
        [attr.aria-pressed]="!temaEscuro()"
        (click)="alternarTema()"
      >
        <lucide-icon [name]="temaEscuro() ? 'sun' : 'moon'" [size]="20" [strokeWidth]="2" />
      </button>

      <div class="sep-account-locked-card">
        <span class="sep-account-locked-badge">423</span>
        <h1>Conta bloqueada temporariamente</h1>
        <p>
          Detectamos várias tentativas de login com credenciais inválidas. Por segurança, sua conta
          ficará bloqueada por alguns minutos. Tente novamente em breve.
        </p>
        <p>
          Se você não reconhece essas tentativas, troque sua senha e revise os dispositivos
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
      /* O botao de tema fica no canto, como no login: estas telas nao usam cabecalho. */
      .sep-tema-publico {
        position: absolute;
        top: 24px;
        right: 24px;
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        padding: 0;
        color: hsl(var(--foreground));
        cursor: pointer;
        border: 1px solid hsl(var(--border));
        border-radius: 11px;
        background: hsl(var(--card));
      }
      .sep-account-locked {
        position: relative;
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
export class AccountLockedComponent {
  private readonly tema = inject(ThemeService);

  /** Mesma troca de tema das demais telas publicas; o escuro e o padrao. */
  protected readonly temaEscuro = this.tema.isDark;

  protected alternarTema(): void {
    this.tema.toggle();
  }
}

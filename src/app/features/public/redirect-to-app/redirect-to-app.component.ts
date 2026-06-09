import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Sprint 5: cadastro publico via web foi descontinuado em favor da canalizacao
 * por perfil. Tomador deve baixar o app mobile; empresa credora entra por
 * convite; usuarios internos pelo admin. Esta tela substitui /register.
 */
@Component({
  selector: 'sep-redirect-to-app',
  imports: [RouterLink],
  template: `
    <section class="sep-redirect">
      <div class="sep-redirect-card">
        <h1>Como cadastrar sua conta</h1>
        <ul>
          <li>
            <strong>Tomador (pessoa fisica ou MEI):</strong> baixe o aplicativo SEP nas lojas e siga
            o onboarding KYC.
          </li>
          <li>
            <strong>Empresa credora:</strong> o cadastro e feito por convite. Solicite acesso pelo
            seu gestor de relacionamento.
          </li>
          <li>
            <strong>Usuario interno:</strong> sua conta e criada pelo administrador do sistema.
          </li>
        </ul>
        <a routerLink="/login" class="sep-redirect-link">Ja tenho conta — fazer login</a>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        background: hsl(var(--background));
      }
      .sep-redirect {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: var(--sep-space-32);
      }
      .sep-redirect-card {
        max-width: 560px;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--sep-radius-lg);
        padding: var(--sep-space-32);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        gap: var(--sep-space-17);
      }
      h1 {
        margin: 0;
        color: hsl(var(--foreground));
      }
      ul {
        margin: 0;
        padding-left: 20px;
        color: hsl(var(--muted-foreground));
        line-height: 1.6;
      }
      .sep-redirect-link {
        align-self: flex-start;
        color: hsl(var(--primary));
        text-decoration: none;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectToAppComponent {}

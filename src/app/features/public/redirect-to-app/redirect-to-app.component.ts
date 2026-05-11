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
        background: var(--apple-color-canvas-parchment);
      }
      .sep-redirect {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: var(--apple-space-xl);
      }
      .sep-redirect-card {
        max-width: 560px;
        background: var(--apple-color-canvas-light);
        border-radius: var(--apple-radius-lg);
        padding: var(--apple-space-xl);
        box-shadow: var(--apple-shadow-product);
        display: flex;
        flex-direction: column;
        gap: var(--apple-space-md);
      }
      h1 {
        margin: 0;
      }
      ul {
        margin: 0;
        padding-left: 20px;
        color: var(--apple-color-ink-muted-80);
        line-height: 1.6;
      }
      .sep-redirect-link {
        align-self: flex-start;
        color: var(--apple-color-ink);
        text-decoration: none;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectToAppComponent {}

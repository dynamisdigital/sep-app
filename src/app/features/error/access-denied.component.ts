import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sep-access-denied',
  imports: [RouterLink],
  template: `
    <main class="access-denied">
      <section class="access-denied-panel" aria-labelledby="access-denied-title">
        <p class="access-denied-badge">403</p>
        <h1 id="access-denied-title" class="access-denied-title">Acesso negado</h1>
        <p class="access-denied-body">Seu perfil nao possui permissao para acessar esta area.</p>
        <a routerLink="/app/dashboard" class="access-denied-link">Voltar ao dashboard</a>
      </section>
    </main>
  `,
  styleUrl: './access-denied.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedComponent {}

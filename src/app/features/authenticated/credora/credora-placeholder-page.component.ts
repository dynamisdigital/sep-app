import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Placeholder temporario da jornada credora. As paginas reais (cadastro/perfil, oportunidades e
// carteira) chegam nas Tasks F-11.3 a F-11.6, que substituem o loadComponent de cada rota. Mantido
// para que as rotas e os links do shell existam ja na F-11.2, sem link morto e com build verde.
@Component({
  selector: 'sep-credora-placeholder-page',
  imports: [RouterLink],
  template: `
    <section class="sep-credora-placeholder">
      <h1 class="sep-credora-placeholder-title">Em construcao</h1>
      <p class="sep-credora-placeholder-body">
        Esta area da jornada credora sera implementada em uma etapa desta sprint.
      </p>
      <a routerLink="/app/credora" class="sep-credora-placeholder-link">
        Voltar para a jornada credora
      </a>
    </section>
  `,
  styles: `
    .sep-credora-placeholder {
      display: flex;
      flex-direction: column;
      gap: var(--sep-space-8);
      align-items: flex-start;
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--sep-space-16) 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoraPlaceholderPageComponent {}

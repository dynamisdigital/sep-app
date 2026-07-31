import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sep-access-denied',
  imports: [RouterLink],
  template: `
    <main class="access-denied">
      <section class="access-denied-panel" aria-labelledby="access-denied-title">
        <p class="access-denied-badge">403</p>
        <h1 #titulo id="access-denied-title" class="access-denied-title" tabindex="-1">
          Acesso negado
        </h1>
        <p class="access-denied-body">Seu perfil nao possui permissao para acessar esta area.</p>
        <a routerLink="/app/dashboard" class="access-denied-link">Voltar ao dashboard</a>
      </section>
    </main>
  `,
  styleUrl: './access-denied.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedComponent implements AfterViewInit {
  private readonly titulo = viewChild.required<ElementRef<HTMLHeadingElement>>('titulo');

  ngAfterViewInit(): void {
    // Destino de redirect automatico por dois caminhos: o 403 do errorInterceptor e o roleGuard.
    // O Angular nao move foco na navegacao e o app nao tem live region de rota, entao sem isto o
    // foco fica onde estava, na tela anterior ja substituida, e o usuario de leitor de tela nao
    // percebe que a acao foi negada — continua tentando operar algo que nao existe mais.
    this.titulo().nativeElement.focus();
  }
}

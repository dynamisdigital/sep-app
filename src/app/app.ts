/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { ThemeService } from './core/theme/theme.service';
import { TourOverlayComponent } from './shared/tour/tour-overlay.component';

@Component({
  selector: 'sep-root',
  imports: [RouterOutlet, TourOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /**
   * O tema é aplicado na raiz, e não por quem consome o serviço.
   *
   * `ThemeService` aplica a classe do tema no construtor, e o construtor só roda quando alguém o
   * injeta. Telas que não montam o shell nem o cabeçalho — a página do Mockup 03, por exemplo —
   * carregavam sem tema nenhum quando abertas direto pela URL. Enquanto as cores eram literais
   * isso não aparecia; com tokens, a moldura saía no tema errado.
   */
  private readonly theme = inject(ThemeService);

  private readonly router = inject(Router);

  protected readonly demonstracao = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => /^\/demonstracao(?:[/?#]|$)/.test(evento.urlAfterRedirects)),
    ),
    { initialValue: /^\/demonstracao(?:[/?#]|$)/.test(this.router.url) },
  );

  protected readonly title = signal('sep-app');
}

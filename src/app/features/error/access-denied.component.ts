import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { OperationalShellComponent } from '../../layout/operational-shell/operational-shell.component';

// Mockup 42 — Acesso negado. A tela é o destino do `roleGuard` e do 403 do errorInterceptor:
// quem chega aqui está autenticado, mas o papel dele não alcança a área pedida. Por isso a tela
// diz **qual** é o papel corrente e para onde ir, em vez de só recusar — sem essa informação o
// operador não sabe se pediu a tela errada ou se falta permissão na conta dele.
@Component({
  selector: 'sep-access-denied',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedComponent {
  private readonly auth = inject(AuthService);

  protected readonly usuario = this.auth.currentUser;

  /** O papel corrente, quando há sessão. É o dado que explica a recusa. */
  protected readonly papel = computed(() => this.usuario()?.role ?? null);
}

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/auth/auth.service';
import { marcadorDaCentral, rotuloDaCentral } from '../../core/notificacoes/central-rotulos';
import { NotificacoesNaoLidasStore } from '../../core/notificacoes/notificacoes-nao-lidas.store';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'sep-header',
  imports: [LucideAngularModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly naoLidas = inject(NotificacoesNaoLidasStore);

  @Output() readonly toggleSidenav = new EventEmitter<void>();

  protected readonly currentUser = this.auth.currentUser;
  protected readonly isDark = this.theme.isDark;
  protected readonly rotuloCentral = computed(() => rotuloDaCentral(this.naoLidas.contagem()));
  protected readonly marcadorCentral = computed(() => marcadorDaCentral(this.naoLidas.contagem()));

  // Pelo id, e nao pelo objeto: recarregar o perfil troca o objeto do usuario e nao pode reconsultar.
  private readonly usuarioId = computed(() => this.currentUser()?.id);

  constructor() {
    // O header monta junto com o shell; a contagem carrega quando a sessao existe. Nenhum timer.
    effect(() => {
      if (this.usuarioId()) {
        untracked(() => this.naoLidas.carregar());
      }
    });
  }

  onToggle(): void {
    this.toggleSidenav.emit();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
    });
  }
}

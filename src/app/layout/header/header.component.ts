import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'sep-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @Output() readonly toggleSidenav = new EventEmitter<void>();

  protected readonly currentUser = this.auth.currentUser;

  onToggle(): void {
    this.toggleSidenav.emit();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

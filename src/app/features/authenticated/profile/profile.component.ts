import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'sep-profile',
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly loadingUser = this.auth.loadingUser;

  recarregar(): void {
    this.auth.loadCurrentUser().subscribe({
      error: () => {
        // erro mostrado via UI; AuthService limpa loadingUser via finalize.
      },
    });
  }
}

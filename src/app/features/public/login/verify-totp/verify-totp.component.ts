import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { MfaService } from '../../../../core/auth/mfa.service';

@Component({
  selector: 'sep-verify-totp',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-totp.component.html',
  styleUrl: './verify-totp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyTotpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly mfaService = inject(MfaService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly challengeAusente = signal<boolean>(!this.authService.pendingMfaChallenge());

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const challengeId = this.authService.pendingMfaChallenge();
    if (!challengeId) {
      this.challengeAusente.set(true);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.mfaService
      .verify({ mfaChallengeId: challengeId, codigo: this.form.controls.codigo.value })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.authService.applyMfaVerifyResponse(response);
          if (response.usuario?.precisaRedefinirSenha) {
            void this.router.navigateByUrl('/app/profile/change-password?forced=true');
            return;
          }
          void this.router.navigateByUrl('/app/dashboard');
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Codigo TOTP invalido ou expirado.');
        },
      });
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { TotpSetupResponse } from '../../../../core/api/api.models';
import { MfaService } from '../../../../core/auth/mfa.service';

@Component({
  selector: 'sep-setup-totp',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './setup-totp.component.html',
  styleUrl: './setup-totp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupTotpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly mfaService = inject(MfaService);
  private readonly router = inject(Router);

  protected readonly setup = signal<TotpSetupResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly confirmado = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  iniciar(): void {
    if (this.setup() || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.mfaService.setup().subscribe({
      next: (response) => {
        this.setup.set(response);
        this.loading.set(false);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('MFA ja esta habilitado nesta conta.');
        } else {
          this.errorMessage.set('Falha ao iniciar setup. Tente novamente em alguns segundos.');
        }
      },
    });
  }

  confirmar(): void {
    if (this.form.invalid || this.confirmando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmando.set(true);
    this.errorMessage.set(null);
    this.mfaService.confirm(this.form.controls.codigo.value).subscribe({
      next: () => {
        this.confirmando.set(false);
        this.confirmado.set(true);
      },
      error: () => {
        this.confirmando.set(false);
        this.errorMessage.set(
          'Codigo invalido. Verifique o relogio do dispositivo e tente novamente.',
        );
      },
    });
  }

  voltarAoPerfil(): void {
    void this.router.navigateByUrl('/app/profile');
  }
}

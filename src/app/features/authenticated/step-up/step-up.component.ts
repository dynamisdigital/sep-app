import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MfaService } from '../../../core/auth/mfa.service';
import { StepUpTokenStore } from '../../../core/auth/step-up-token.store';

/**
 * Sprint 5: rota intermediaria que coleta codigo TOTP e produz step-up token
 * antes de uma operacao sensivel. Recebe {@code next} via query string e
 * redireciona apos sucesso.
 */
@Component({
  selector: 'sep-step-up',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="sep-step-up">
      <div class="sep-step-up-card">
        <h1>Confirmacao adicional</h1>
        <p>
          Esta operacao exige uma confirmacao por TOTP (segunda etapa) alem da sua sessao atual.
        </p>

        @if (!challengeId() && !iniciando()) {
          <button type="button" class="sep-step-up-cta" (click)="iniciar()">Iniciar</button>
        }

        @if (challengeId()) {
          <form [formGroup]="form" (ngSubmit)="completar()">
            <label>
              <span>Codigo TOTP ou backup code</span>
              <input
                type="text"
                inputmode="text"
                autocomplete="one-time-code"
                formControlName="codigo"
                data-testid="sep-step-up-input"
              />
            </label>

            @if (errorMessage(); as msg) {
              <p role="alert" class="sep-step-up-error">{{ msg }}</p>
            }

            <button type="submit" [disabled]="completando()" class="sep-step-up-cta">
              @if (completando()) {
                Validando...
              } @else {
                Confirmar
              }
            </button>
          </form>
        }

        <a [routerLink]="fallbackUrl()" class="sep-step-up-cancel">Cancelar</a>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .sep-step-up {
        max-width: 480px;
        margin: 48px auto;
      }
      .sep-step-up-card {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--sep-radius-lg);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h1 {
        margin: 0;
        font-size: 22px;
        color: hsl(var(--foreground));
      }
      p {
        margin: 0;
        color: hsl(var(--muted-foreground));
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        span {
          font-size: 13px;
          color: hsl(var(--muted-foreground));
        }
        input {
          padding: 10px 12px;
          color: hsl(var(--foreground));
          background: hsl(var(--background));
          border: 1px solid hsl(var(--input));
          border-radius: var(--sep-radius-sm);
          font-size: 16px;
          letter-spacing: 0.15em;
          text-align: center;
        }
      }
      .sep-step-up-cta {
        align-self: flex-start;
        padding: 10px 18px;
        border-radius: var(--sep-radius-md);
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
        font-weight: 600;
        cursor: pointer;
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
      .sep-step-up-error {
        color: hsl(var(--destructive));
        font-size: 14px;
      }
      .sep-step-up-cancel {
        font-size: 14px;
        color: hsl(var(--muted-foreground));
        text-decoration: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly mfaService = inject(MfaService);
  private readonly store = inject(StepUpTokenStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly challengeId = signal<string | null>(null);
  protected readonly iniciando = signal(false);
  protected readonly completando = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required]],
  });

  protected fallbackUrl(): string {
    return this.next() ?? '/app/profile';
  }

  iniciar(): void {
    this.iniciando.set(true);
    this.errorMessage.set(null);
    this.mfaService.stepUpInitiate().subscribe({
      next: (response) => {
        this.challengeId.set(response.stepUpChallengeId);
        this.iniciando.set(false);
      },
      error: (err: { status?: number }) => {
        this.iniciando.set(false);
        if (err.status === 400) {
          this.errorMessage.set(
            'MFA nao habilitado nesta conta. Habilite antes de tentar a operacao.',
          );
        } else {
          this.errorMessage.set('Falha ao iniciar step-up.');
        }
      },
    });
  }

  completar(): void {
    const challengeId = this.challengeId();
    if (!challengeId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.completando.set(true);
    this.errorMessage.set(null);
    this.mfaService
      .stepUpComplete({ stepUpChallengeId: challengeId, codigo: this.form.controls.codigo.value })
      .subscribe({
        next: (response) => {
          this.completando.set(false);
          this.store.set(response.stepUpToken);
          const proximo = this.next() ?? '/app/profile';
          void this.router.navigateByUrl(proximo);
        },
        error: () => {
          this.completando.set(false);
          this.errorMessage.set('Codigo invalido ou challenge expirado.');
        },
      });
  }

  private next(): string | null {
    return this.route.snapshot.queryParamMap.get('next');
  }
}

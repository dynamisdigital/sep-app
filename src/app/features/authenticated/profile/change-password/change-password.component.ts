import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { mensagemDeErroDaApi } from '../../../../core/api/api-error';
import { AuthService } from '../../../../core/auth/auth.service';
import { UsuariosService } from '../../../../core/users/usuarios.service';

function confirmacaoIgualValidator(control: AbstractControl): ValidationErrors | null {
  const novaSenha = control.get('novaSenha')?.value;
  const confirmacao = control.get('confirmacaoNovaSenha')?.value;
  if (!novaSenha || !confirmacao) return null;
  return novaSenha === confirmacao ? null : { confirmacaoDivergente: true };
}

@Component({
  selector: 'sep-change-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly submitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      passwordAtual: ['', [Validators.required]],
      // Sprint 5: politica server-side (12+ chars OU passphrase 4+ palavras).
      novaSenha: ['', [Validators.required]],
      confirmacaoNovaSenha: ['', [Validators.required]],
    },
    { validators: confirmacaoIgualValidator },
  );

  submit(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const user = this.currentUser();
    if (!user) {
      this.errorMessage.set('Sessao expirada. Faca login novamente.');
      return;
    }

    const { passwordAtual, novaSenha } = this.form.getRawValue();
    this.submitting.set(true);

    this.usuarios.alterarSenha(user.id, { passwordAtual, novaSenha }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Senha alterada com sucesso.');
        this.form.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (err.status === 403 && user.mfaHabilitado) {
          // Sprint 5: step-up exigido. Redireciona para coletar codigo TOTP.
          void this.router.navigateByUrl('/app/step-up?next=/app/profile/change-password');
          return;
        }
        this.errorMessage.set(
          mensagemDeErroDaApi(err, 'Nao foi possivel alterar a senha. Tente novamente.'),
        );
      },
    });
  }
}

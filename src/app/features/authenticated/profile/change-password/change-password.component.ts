import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ApiErrorResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { UsuariosService } from '../../../../core/users/usuarios.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { SepArteComponent } from '../../../../shared/arte/sep-arte.component';

function confirmacaoIgualValidator(control: AbstractControl): ValidationErrors | null {
  const novaSenha = control.get('novaSenha')?.value;
  const confirmacao = control.get('confirmacaoNovaSenha')?.value;
  if (!novaSenha || !confirmacao) return null;
  return novaSenha === confirmacao ? null : { confirmacaoDivergente: true };
}

@Component({
  selector: 'sep-change-password',
  imports: [
    SepArteComponent,
    LucideAngularModule,
    OperationalShellComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly assetBase = '/image/sep_mockup_05_assets';
  protected readonly submitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordAtualVisivel = signal(false);
  protected readonly novaSenhaVisivel = signal(false);
  protected readonly confirmacaoVisivel = signal(false);
  protected readonly passwordDraft = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      passwordAtual: ['', [Validators.required]],
      // Sprint 5: politica server-side (12+ chars OU passphrase 4+ palavras).
      novaSenha: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
        ],
      ],
      confirmacaoNovaSenha: ['', [Validators.required]],
    },
    { validators: confirmacaoIgualValidator },
  );

  protected readonly passwordRequirements = computed(() => {
    const password = this.passwordDraft();
    const username = this.currentUser()?.username.split('@')[0].toLocaleLowerCase() ?? '';
    return [
      {
        label: 'Mínimo de 12 caracteres',
        icon: 'ruler',
        valid: password.length >= 12,
      },
      {
        label: 'Contém letras maiúsculas e minúsculas',
        icon: 'case-sensitive',
        valid: /[a-z]/.test(password) && /[A-Z]/.test(password),
      },
      {
        label: 'Contém números (0-9)',
        icon: 'hash',
        valid: /\d/.test(password),
      },
      {
        label: 'Contém símbolos especiais (!@#$%&*)',
        icon: 'asterisk',
        valid: /[^A-Za-z0-9]/.test(password),
      },
      {
        label: 'Não deve conter dados pessoais',
        icon: 'user-x',
        valid:
          password.length > 0 && (!username || !password.toLocaleLowerCase().includes(username)),
      },
      {
        label: 'Não deve ser uma senha comum',
        icon: 'shield-off',
        valid: !['123456', 'password', 'senha123', 'admin123'].includes(
          password.toLocaleLowerCase(),
        ),
      },
    ];
  });
  protected readonly strengthPercentage = computed(() => {
    if (!this.passwordDraft()) return 0;
    const valid = this.passwordRequirements().filter((requirement) => requirement.valid).length;
    return Math.round((valid / this.passwordRequirements().length) * 96);
  });
  protected readonly strengthLabel = computed(() => {
    const value = this.strengthPercentage();
    if (value >= 90) return 'Muito forte';
    if (value >= 65) return 'Forte';
    if (value >= 40) return 'Média';
    return 'Fraca';
  });
  protected readonly strengthMessage = computed(() => {
    const value = this.strengthPercentage();
    if (value >= 90) return 'Excelente! Sua senha está muito segura.';
    if (value >= 65) return 'Boa senha. Verifique os requisitos restantes.';
    return 'Reforce sua senha para aumentar a proteção.';
  });
  protected readonly strengthRingStyle = computed(
    () =>
      `conic-gradient(var(--sep-success) 0 ${this.strengthPercentage()}%, rgb(var(--sep-c-line) / 55%) ${this.strengthPercentage()}% 100%)`,
  );

  constructor() {
    this.form.controls.novaSenha.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.passwordDraft.set(value));
  }

  protected toggleVisibility(field: 'atual' | 'nova' | 'confirmacao'): void {
    if (field === 'atual') this.passwordAtualVisivel.update((value) => !value);
    if (field === 'nova') this.novaSenhaVisivel.update((value) => !value);
    if (field === 'confirmacao') this.confirmacaoVisivel.update((value) => !value);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'long',
    }).format(new Date(value));
  }

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
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(
          apiErr?.message ?? 'Nao foi possivel alterar a senha. Tente novamente.',
        );
      },
    });
  }
}

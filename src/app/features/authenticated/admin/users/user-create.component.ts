import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ApiErrorResponse, UsuarioRole } from '../../../../core/api/api.models';
import { UsuariosService } from '../../../../core/users/usuarios.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  PERMISSOES_POR_PAPEL,
  ROLES_DISPONIVEIS,
  TOM_POR_PAPEL,
  VETOR_POR_PAPEL,
  gravarRolesPendentes,
  selecaoVaziaInicial,
} from './usuario-papeis';

// Mesma politica da troca de senha (`change-password.component.ts`), que espelha a do backend.
const POLITICA_SENHA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const senha = grupo.get('senha')?.value as string;
  const confirmacao = grupo.get('confirmacao')?.value as string;
  return confirmacao && senha !== confirmacao ? { senhasDiferentes: true } : null;
}

/**
 * Cadastro de usuario pela administracao (Referencia 62: a tela nunca teve desenho).
 *
 * O backend so tem `POST /usuarios`, que sempre cria CLIENTE. Os demais papeis sao uma segunda
 * operacao, `PUT /usuarios/:id/roles`, que exige confirmacao adicional por TOTP. A tela cria a
 * conta, grava os papeis escolhidos como intencao pendente e abre o detalhe do usuario, que ja
 * sabe pedir o step-up e reenviar a alteracao ao voltar.
 */
@Component({
  selector: 'sep-user-create',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './user-create.component.html',
  styleUrl: './user-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);

  protected readonly rolesDisponiveis = ROLES_DISPONIVEIS;
  protected readonly selecao = signal<Record<UsuarioRole, boolean>>({
    ...selecaoVaziaInicial(),
    CLIENTE: true,
  });
  protected readonly senhaVisivel = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly tentouEnviar = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      senha: [
        '',
        [Validators.required, Validators.minLength(12), Validators.pattern(POLITICA_SENHA)],
      ],
      confirmacao: ['', [Validators.required]],
    },
    { validators: senhasIguais },
  );

  private readonly senha = toSignal(this.form.controls.senha.valueChanges, { initialValue: '' });

  /** Os quatro criterios da politica, para o checklist ao lado do campo. */
  protected readonly criterios = computed(() => {
    const senha = this.senha();
    return [
      { rotulo: 'Mínimo de 12 caracteres', ok: senha.length >= 12 },
      { rotulo: 'Letra maiúscula e minúscula', ok: /[a-z]/.test(senha) && /[A-Z]/.test(senha) },
      { rotulo: 'Ao menos um número', ok: /\d/.test(senha) },
      { rotulo: 'Ao menos um símbolo', ok: /[^A-Za-z0-9]/.test(senha) },
    ];
  });

  protected readonly rolesEscolhidas = computed(() =>
    this.rolesDisponiveis.filter((role) => this.selecao()[role]),
  );

  /** Papeis alem de CLIENTE: sao os que dependem da segunda operacao, com step-up. */
  protected readonly exigeConfirmacao = computed(() =>
    this.rolesEscolhidas().some((role) => role !== 'CLIENTE'),
  );

  /**
   * Os quatro papeis com o que cada um habilita; os nao escolhidos aparecem esmaecidos. Explica o
   * chip antes do clique e mostra, lado a lado, o que a conta vai e nao vai alcancar.
   */
  protected readonly alcance = computed(() =>
    this.rolesDisponiveis.map((role) => ({
      role,
      ativo: this.selecao()[role],
      tom: VETOR_POR_PAPEL[role].tom,
      vetor: VETOR_POR_PAPEL[role],
      permissoes: PERMISSOES_POR_PAPEL[role],
    })),
  );

  protected tomDoPapel(role: UsuarioRole): string {
    return TOM_POR_PAPEL[role];
  }

  protected alternarRole(role: UsuarioRole): void {
    if (this.enviando()) return;
    this.selecao.update((atual) => ({ ...atual, [role]: !atual[role] }));
  }

  protected invalido(campo: 'email' | 'senha' | 'confirmacao'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && (controle.touched || this.tentouEnviar());
  }

  protected confirmacaoDivergente(): boolean {
    return (
      !!this.form.errors?.['senhasDiferentes'] &&
      (this.form.controls.confirmacao.touched || this.tentouEnviar())
    );
  }

  protected criar(): void {
    this.tentouEnviar.set(true);
    this.erro.set(null);
    if (this.form.invalid || this.rolesEscolhidas().length === 0 || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, senha } = this.form.getRawValue();
    const roles = this.rolesEscolhidas();
    this.enviando.set(true);
    this.usuarios.criar({ username: email.trim().toLowerCase(), password: senha }).subscribe({
      next: (criado) => {
        // So CLIENTE: a conta ja nasce assim, nao ha segunda operacao.
        if (this.exigeConfirmacao()) {
          gravarRolesPendentes({ usuarioId: criado.id, roles });
        }
        void this.router.navigate(['/app/admin/users', criado.id], {
          queryParams: { criado: 1 },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        const apiErr = err.error as ApiErrorResponse | undefined;
        if (err.status === 409) {
          this.erro.set('Já existe um usuário com este e-mail.');
          return;
        }
        if (err.status === 400) {
          this.erro.set(apiErr?.message ?? 'O backend recusou os dados informados.');
          return;
        }
        this.erro.set(apiErr?.message ?? 'Não foi possível criar o usuário.');
      },
    });
  }
}

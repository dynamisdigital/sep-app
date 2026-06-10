import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ApiErrorResponse,
  UsuarioResponse,
  UsuarioRole,
  UsuarioRolesResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { GovernancaService } from '../../../../core/governanca/governanca.service';
import { UsuariosService } from '../../../../core/users/usuarios.service';

// Roles atribuiveis. A precedencia (role principal) e resolvida pelo backend; a UI so
// apresenta o conjunto e a principal retornada, sem recalcular.
const ROLES_DISPONIVEIS: readonly UsuarioRole[] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE', 'CLIENTE'];

function selecaoVaziaInicial(): Record<UsuarioRole, boolean> {
  return { ADMIN: false, FINANCEIRO: false, BACKOFFICE: false, CLIENTE: false };
}

@Component({
  selector: 'sep-user-detail',
  imports: [RouterLink],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuarios = inject(UsuariosService);
  private readonly governanca = inject(GovernancaService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly usuario = signal<UsuarioResponse | null>(null);

  protected readonly rolesDisponiveis = ROLES_DISPONIVEIS;
  protected readonly usuarioId = signal<string | null>(null);
  protected readonly rolesCarregando = signal(false);
  protected readonly rolesErro = signal<string | null>(null);
  protected readonly rolesSucesso = signal<string | null>(null);
  protected readonly rolePrincipal = signal<UsuarioRole | null>(null);
  protected readonly selecao = signal<Record<UsuarioRole, boolean>>(selecaoVaziaInicial());
  protected readonly salvando = signal(false);

  // Auto-protecao: o backend retorna 403 se o ADMIN tentar alterar as proprias roles. A UI
  // previne o obvio desabilitando a edicao quando o alvo e o usuario autenticado.
  protected readonly ehProprioUsuario = computed(() => {
    const atual = this.auth.currentUser();
    const alvo = this.usuarioId();
    return !!atual && !!alvo && atual.id === alvo;
  });

  protected readonly selecaoVazia = computed(
    () => !this.rolesDisponiveis.some((role) => this.selecao()[role]),
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Identificador do usuario nao informado.');
      return;
    }
    this.usuarioId.set(id);

    this.loading.set(true);
    this.usuarios.buscarPorId(id).subscribe({
      next: (u) => {
        this.usuario.set(u);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Nao foi possivel carregar o usuario.');
        this.loading.set(false);
      },
    });

    this.carregarRoles(id);
  }

  protected alternarRole(role: UsuarioRole): void {
    if (this.ehProprioUsuario() || this.salvando()) {
      return;
    }
    this.rolesSucesso.set(null);
    this.selecao.update((atual) => ({ ...atual, [role]: !atual[role] }));
  }

  protected salvarRoles(): void {
    const id = this.usuarioId();
    if (!id || this.ehProprioUsuario() || this.selecaoVazia() || this.salvando()) {
      return;
    }
    const roles = this.rolesDisponiveis.filter((role) => this.selecao()[role]);

    this.salvando.set(true);
    this.rolesErro.set(null);
    this.rolesSucesso.set(null);
    this.governanca.substituirRoles(id, { roles }).subscribe({
      next: (resposta) => {
        this.aplicarRoles(resposta);
        this.salvando.set(false);
        this.rolesSucesso.set('Roles atualizadas.');
      },
      error: (err: HttpErrorResponse) => this.tratarErroRoles(err, id),
    });
  }

  private carregarRoles(id: string): void {
    this.rolesCarregando.set(true);
    this.rolesErro.set(null);
    this.governanca.consultarRoles(id).subscribe({
      next: (resposta) => {
        this.aplicarRoles(resposta);
        this.rolesCarregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.rolesErro.set(apiErr?.message ?? 'Nao foi possivel carregar as roles.');
        this.rolesCarregando.set(false);
      },
    });
  }

  private aplicarRoles(resposta: UsuarioRolesResponse): void {
    this.rolePrincipal.set(resposta.principal);
    const selecao = selecaoVaziaInicial();
    for (const role of resposta.roles) {
      selecao[role] = true;
    }
    this.selecao.set(selecao);
  }

  private tratarErroRoles(err: HttpErrorResponse, id: string): void {
    this.salvando.set(false);
    // 403 com MFA habilitado: step-up exigido. Coleta o token e volta a este usuario.
    // A auto-edicao ja foi bloqueada antes do request, entao o 403 aqui e ausencia de step-up.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      void this.router.navigateByUrl(`/app/step-up?next=/app/admin/users/${id}`);
      return;
    }
    const apiErr = err.error as ApiErrorResponse | undefined;
    if (err.status === 404) {
      this.rolesErro.set(apiErr?.message ?? 'Usuario nao encontrado.');
      return;
    }
    this.rolesErro.set(apiErr?.message ?? 'Nao foi possivel atualizar as roles.');
  }
}

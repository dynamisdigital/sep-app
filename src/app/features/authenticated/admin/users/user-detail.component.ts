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
import { LucideAngularModule } from 'lucide-angular';

import {
  ApiErrorResponse,
  UsuarioResponse,
  UsuarioRole,
  UsuarioRolesResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { GovernancaService } from '../../../../core/governanca/governanca.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { UsuariosService } from '../../../../core/users/usuarios.service';
import {
  CHAVE_ROLES_PENDENTES,
  PERMISSOES_POR_PAPEL,
  ROLES_DISPONIVEIS,
  TOM_POR_PAPEL,
  VETOR_POR_PAPEL,
  gravarRolesPendentes,
  lerRolesPendentes,
  selecaoVaziaInicial,
} from './usuario-papeis';

@Component({
  selector: 'sep-user-detail',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
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
  // Chegou do cadastro (`?criado=1`): a conta existe, e os papeis escolhidos sao aplicados aqui.
  protected readonly criadoAgora = signal(false);

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

  /** Papel de referencia para permissoes e vetor: o principal devolvido pelo backend. */
  private readonly papelDeReferencia = computed<UsuarioRole | null>(
    () => this.rolePrincipal() ?? this.usuario()?.role ?? null,
  );

  protected readonly permissoes = computed(() => {
    const papel = this.papelDeReferencia();
    return papel ? PERMISSOES_POR_PAPEL[papel] : [];
  });

  protected readonly vetorDeAcesso = computed(() => {
    const papel = this.papelDeReferencia();
    return papel ? VETOR_POR_PAPEL[papel] : null;
  });

  // Trilha derivada do proprio DTO: sao os dois unicos eventos que o contrato carimba com data e
  // ator. Nao existe endpoint de historico de atividades.
  protected readonly eventos = computed(() => {
    const u = this.usuario();
    if (!u) return [];
    const linhas = [
      {
        quando: u.dataCriacao,
        acao: 'Criação',
        detalhe: `Usuário cadastrado por ${u.criadoPor}`,
        tom: 'green',
      },
    ];
    if (u.dataModificacao !== u.dataCriacao) {
      linhas.unshift({
        quando: u.dataModificacao,
        acao: 'Alteração',
        detalhe: `Último registro alterado por ${u.modificadoPor}`,
        tom: 'blue',
      });
    }
    return linhas;
  });

  protected readonly situacao = computed(() => {
    const u = this.usuario();
    if (!u) return { rotulo: '—', tom: 'green' };
    return u.precisaRedefinirSenha
      ? { rotulo: 'Senha pendente', tom: 'amber' }
      : { rotulo: 'Ativo', tom: 'green' };
  });

  protected tomDoPapel(role: UsuarioRole): string {
    return TOM_POR_PAPEL[role];
  }

  protected inicial(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  protected formatarDataHora(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso));
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Identificador do usuário não informado.');
      return;
    }
    this.usuarioId.set(id);
    this.criadoAgora.set(this.route.snapshot.queryParamMap.get('criado') === '1');

    this.loading.set(true);
    this.usuarios.buscarPorId(id).subscribe({
      next: (u) => {
        this.usuario.set(u);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Não foi possível carregar o usuário.');
        this.loading.set(false);
      },
    });

    this.carregarRoles(id);
  }

  /**
   * Retoma a alteracao autorizada no step-up. A intencao fica em `sessionStorage` porque a ida ao
   * step-up recarrega o componente; sem isso o usuario confirmaria a identidade para nada.
   */
  private retomarAlteracaoAutorizada(id: string): boolean {
    const pendente = lerRolesPendentes();
    if (!pendente || pendente.usuarioId !== id || pendente.roles.length === 0) {
      return false;
    }
    window.sessionStorage.removeItem(CHAVE_ROLES_PENDENTES);
    const selecao = selecaoVaziaInicial();
    for (const role of pendente.roles) {
      selecao[role] = true;
    }
    this.selecao.set(selecao);
    this.enviarRoles(id, pendente.roles);
    return true;
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
    this.enviarRoles(id, roles);
  }

  private enviarRoles(id: string, roles: UsuarioRole[]): void {
    this.salvando.set(true);
    this.rolesErro.set(null);
    this.rolesSucesso.set(null);
    this.governanca.substituirRoles(id, { roles }).subscribe({
      next: (resposta) => {
        this.aplicarRoles(resposta);
        this.salvando.set(false);
        this.rolesSucesso.set('Roles atualizadas.');
      },
      error: (err: HttpErrorResponse) => this.tratarErroRoles(err, id, roles),
    });
  }

  private carregarRoles(id: string): void {
    this.rolesCarregando.set(true);
    this.rolesErro.set(null);
    this.governanca.consultarRoles(id).subscribe({
      next: (resposta) => {
        this.aplicarRoles(resposta);
        this.rolesCarregando.set(false);
        this.retomarAlteracaoAutorizada(id);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.rolesErro.set(apiErr?.message ?? 'Não foi possível carregar as roles.');
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

  private tratarErroRoles(err: HttpErrorResponse, id: string, roles: UsuarioRole[] = []): void {
    this.salvando.set(false);
    // 403 com MFA habilitado: step-up exigido. Guarda a intencao, coleta o token e volta a este
    // usuario, onde a alteracao e reenviada sozinha.
    // A auto-edicao ja foi bloqueada antes do request, entao o 403 aqui e ausencia de step-up.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      if (roles.length) {
        gravarRolesPendentes({ usuarioId: id, roles });
      }
      void this.router.navigateByUrl(`/app/step-up?next=/app/admin/users/${id}`);
      return;
    }
    const apiErr = err.error as ApiErrorResponse | undefined;
    if (err.status === 404) {
      this.rolesErro.set(apiErr?.message ?? 'Usuário não encontrado.');
      return;
    }
    this.rolesErro.set(apiErr?.message ?? 'Não foi possível atualizar as roles.');
  }
}

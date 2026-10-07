import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';

import { ApiErrorResponse, UsuarioResponse, UsuarioRole } from '../../../../core/api/api.models';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { UsuariosService } from '../../../../core/users/usuarios.service';

// Papeis do contrato (UsuarioRole). A contagem sai daqui porque o conjunto e fechado pela API.
const PAPEIS_DO_CONTRATO: UsuarioRole[] = [
  'ADMIN',
  'CLIENTE',
  'FINANCEIRO',
  'BACKOFFICE',
  'CORRESPONDENTE',
];

// Descricao legivel do papel, para a linha dizer o que o perfil faz sem consultar outra tela.
const DESCRICAO_POR_PAPEL: Record<UsuarioRole, string> = {
  ADMIN: 'Administrador do sistema',
  CLIENTE: 'Usuário cliente',
  FINANCEIRO: 'Analista financeiro',
  BACKOFFICE: 'Analista backoffice',
  CORRESPONDENTE: 'Correspondente (capta e envia documentos)',
};

const TOM_POR_PAPEL: Record<UsuarioRole, string> = {
  ADMIN: 'blue',
  CLIENTE: 'green',
  FINANCEIRO: 'purple',
  BACKOFFICE: 'amber',
  CORRESPONDENTE: 'cyan',
};

type Coluna = 'username' | 'role' | 'dataCriacao' | 'dataModificacao';

// Lista de usuarios da area administrativa (ADMIN-only; guard herdado da rota pai). A tela apenas
// apresenta: filtro, ordenacao e paginacao acontecem sobre a lista que o backend devolveu, e os
// agregados do topo sao somados dessa mesma lista, para os numeros fecharem com a tabela.
@Component({
  selector: 'sep-users-list',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly usuariosList = signal<UsuarioResponse[]>([]);

  protected readonly filtroControl = new FormControl<string>('', { nonNullable: true });
  private readonly filtroSignal = toSignal(this.filtroControl.valueChanges, {
    initialValue: '',
  });

  protected readonly ordem = signal<{ coluna: Coluna; desc: boolean }>({
    coluna: 'dataCriacao',
    desc: true,
  });
  protected readonly porPagina = signal(10);
  protected readonly pagina = signal(1);

  protected readonly usuariosFiltrados = computed(() => {
    const termo = this.filtroSignal().trim().toLowerCase();
    const lista = this.usuariosList();
    if (!termo) return lista;
    return lista.filter((u) => u.username.toLowerCase().includes(termo));
  });

  protected readonly usuariosOrdenados = computed(() => {
    const { coluna, desc } = this.ordem();
    return [...this.usuariosFiltrados()].sort((a, b) => {
      const comparacao = String(a[coluna]).localeCompare(String(b[coluna]), 'pt-BR');
      return desc ? -comparacao : comparacao;
    });
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.usuariosOrdenados().length / this.porPagina())),
  );

  protected readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  protected readonly usuariosNaPagina = computed(() => {
    const inicio = (this.paginaAtual() - 1) * this.porPagina();
    return this.usuariosOrdenados().slice(inicio, inicio + this.porPagina());
  });

  protected readonly paginas = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1),
  );

  protected readonly primeiroDaPagina = computed(() =>
    this.usuariosOrdenados().length === 0 ? 0 : (this.paginaAtual() - 1) * this.porPagina() + 1,
  );

  protected readonly ultimoDaPagina = computed(() =>
    Math.min(this.paginaAtual() * this.porPagina(), this.usuariosOrdenados().length),
  );

  // ============ AGREGADOS ============

  protected readonly totalUsuarios = computed(() => this.usuariosList().length);
  protected readonly totalPapeis = PAPEIS_DO_CONTRATO.length;

  protected readonly papeisEmUso = computed(
    () => new Set(this.usuariosList().map((u) => u.role)).size,
  );

  protected readonly comMfa = computed(
    () => this.usuariosList().filter((u) => u.mfaHabilitado).length,
  );

  protected readonly senhaPendente = computed(
    () => this.usuariosList().filter((u) => u.precisaRedefinirSenha).length,
  );

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.usuarios.listar().subscribe({
      next: (lista) => {
        this.usuariosList.set(lista);
        this.pagina.set(1);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Não foi possível carregar os usuários.');
        this.loading.set(false);
      },
    });
  }

  ordenarPor(coluna: Coluna): void {
    this.ordem.update((atual) =>
      atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false },
    );
    this.pagina.set(1);
  }

  irParaPagina(numero: number): void {
    this.pagina.set(Math.min(Math.max(1, numero), this.totalPaginas()));
  }

  mudarPorPagina(valor: string): void {
    this.porPagina.set(Number(valor));
    this.pagina.set(1);
  }

  descricaoDoPapel(role: UsuarioRole): string {
    return DESCRICAO_POR_PAPEL[role];
  }

  tomDoPapel(role: UsuarioRole): string {
    return TOM_POR_PAPEL[role];
  }

  inicial(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  // O contrato nao traz campo de situacao; o que existe de real e a pendencia de troca de senha.
  situacao(usuario: UsuarioResponse): { rotulo: string; tom: string } {
    return usuario.precisaRedefinirSenha
      ? { rotulo: 'Senha pendente', tom: 'amber' }
      : { rotulo: 'Ativo', tom: 'green' };
  }

  formatarDataHora(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  }
}

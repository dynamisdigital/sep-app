import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';

import { ParametroOperacional, UsuarioResponse } from '../../../core/api/api.models';
import { GovernancaService } from '../../../core/governanca/governanca.service';
import { UsuariosService } from '../../../core/users/usuarios.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';

// Papeis de acesso do contrato (UsuarioRole no backend). A contagem de papeis sai daqui, e nao de
// um endpoint, porque o conjunto e fechado pelo proprio contrato da API.
const PAPEIS_DO_CONTRATO = [
  'ADMIN',
  'CLIENTE',
  'FINANCEIRO',
  'BACKOFFICE',
  'CORRESPONDENTE',
] as const;

// Landing da area Administracao (ADMIN-only; guard herdado da rota pai). Os dois modulos entregues
// sao Usuarios e Parametros operacionais. Roles cumulativas nao tem modulo proprio — sao geridas no
// detalhe do usuario (/app/admin/users/:id).
//
// O resumo do sistema e somado das proprias listas devolvidas pelos endpoints, para os numeros
// fecharem com as telas de destino. Onde nao ha endpoint, a metrica degrada para travessao com o
// motivo, em vez de exibir numero inventado.
@Component({
  selector: 'sep-admin-home',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);
  private readonly governanca = inject(GovernancaService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly listaUsuarios = signal<UsuarioResponse[]>([]);
  protected readonly listaParametros = signal<ParametroOperacional[]>([]);

  protected readonly totalUsuarios = computed(() => this.listaUsuarios().length);
  protected readonly totalPapeis = PAPEIS_DO_CONTRATO.length;

  protected readonly parametrosAtivos = computed(
    () => this.listaParametros().filter((p) => p.ativo).length,
  );

  // Cada parametro na versao N acumulou N-1 alteracoes registradas na trilha auditavel.
  protected readonly totalAlteracoes = computed(() =>
    this.listaParametros().reduce((soma, p) => soma + Math.max(0, p.versao - 1), 0),
  );

  // Papeis efetivamente em uso pelos usuarios listados, para a nota da metrica de papeis.
  protected readonly papeisEmUso = computed(
    () => new Set(this.listaUsuarios().map((u) => u.role)).size,
  );

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      usuarios: this.usuarios.listar(),
      parametros: this.governanca.listarParametros(),
    }).subscribe({
      next: ({ usuarios, parametros }) => {
        this.listaUsuarios.set(usuarios);
        this.listaParametros.set(parametros);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.status === 403
            ? 'Apenas ADMIN acessa a governança.'
            : 'Não foi possível carregar o resumo do sistema.',
        );
        this.loading.set(false);
      },
    });
  }
}

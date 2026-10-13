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

import {
  CredorGestaoResponse,
  StatusCredorGestao,
} from '../../../../core/credores/credores-escrow.models';
import { CredoresEscrowService } from '../../../../core/credores/credores-escrow.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  CATEGORIA_LABEL,
  PERFIL_RISCO_LABEL,
  STATUS_CREDOR_LABEL,
  TOM_STATUS_CREDOR,
} from '../../credora/escrow/escrow-format';
import { formatarMoeda, mensagemCredoraErro } from '../../credora/shared/credora-format';

type Filtro = StatusCredorGestao | 'TODOS';

// Gestao dos credores (investidores) da SEP: fila de cadastros em analise e carteira de credores
// ativos, suspensos e reprovados. Aprovar, suspender e alterar perfil ficam no detalhe.
@Component({
  selector: 'sep-credores-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './credores-page.component.html',
  styleUrl: './credores-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoresPageComponent implements OnInit {
  private readonly escrow = inject(CredoresEscrowService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly credores = signal<CredorGestaoResponse[]>([]);
  protected readonly filtro = signal<Filtro>('TODOS');

  protected readonly filtros: { valor: Filtro; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'EM_ANALISE', rotulo: STATUS_CREDOR_LABEL.EM_ANALISE },
    { valor: 'ATIVO', rotulo: STATUS_CREDOR_LABEL.ATIVO },
    { valor: 'SUSPENSO', rotulo: STATUS_CREDOR_LABEL.SUSPENSO },
    { valor: 'REPROVADO', rotulo: STATUS_CREDOR_LABEL.REPROVADO },
  ];

  protected readonly visiveis = computed(() => {
    const filtro = this.filtro();
    return filtro === 'TODOS'
      ? this.credores()
      : this.credores().filter((c) => c.status === filtro);
  });

  protected readonly emAnalise = computed(
    () => this.credores().filter((c) => c.status === 'EM_ANALISE').length,
  );

  protected readonly statusLabel = STATUS_CREDOR_LABEL;
  protected readonly statusTom = TOM_STATUS_CREDOR;
  protected readonly categoriaLabel = CATEGORIA_LABEL;
  protected readonly perfilLabel = PERFIL_RISCO_LABEL;
  protected readonly formatarMoeda = formatarMoeda;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.escrow.listarCredores().subscribe({
      next: (credores) => {
        this.credores.set(credores);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(mensagemCredoraErro(err, 'Não foi possível carregar os credores.'));
        this.loading.set(false);
      },
    });
  }

  contar(filtro: Filtro): number {
    return filtro === 'TODOS'
      ? this.credores().length
      : this.credores().filter((c) => c.status === filtro).length;
  }

  filtrar(filtro: Filtro): void {
    this.filtro.set(filtro);
  }
}

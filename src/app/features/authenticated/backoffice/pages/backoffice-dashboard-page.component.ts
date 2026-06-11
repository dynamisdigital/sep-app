import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { DashboardResponse } from '../../../../core/api/api.models';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import {
  PRIORIDADE_ITEM_LABEL,
  STATUS_ITEM_FILA_LABEL,
  TIPO_ITEM_FILA_LABEL,
  formatarDataHora,
  formatarDuracao,
  formatarMoeda,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';

// Visao consolidada operacional/financeira. O backend calcula contadores, medias e
// somatorios e responde Cache-Control: no-store; a tela apenas apresenta, sem recalcular
// nem persistir a resposta. Falha vira estado de erro com retry, sem quebrar o shell.
@Component({
  selector: 'sep-backoffice-dashboard-page',
  templateUrl: './backoffice-dashboard-page.component.html',
  styleUrl: './backoffice-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeDashboardPageComponent implements OnInit {
  private readonly backoffice = inject(BackofficeService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly dashboard = signal<DashboardResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly formatarDuracao = formatarDuracao;
  protected readonly tipoLabel = TIPO_ITEM_FILA_LABEL;
  protected readonly prioridadeLabel = PRIORIDADE_ITEM_LABEL;
  protected readonly statusLabel = STATUS_ITEM_FILA_LABEL;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.backoffice.consultarDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemBackofficeErro(err, 'Nao foi possivel carregar o dashboard.'),
        );
        this.loading.set(false);
      },
    });
  }
}

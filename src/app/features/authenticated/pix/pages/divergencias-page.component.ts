import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ItemFilaResponse } from '../../../../core/api/api.models';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { BackofficeChipComponent } from '../../backoffice/shared/backoffice-chip.component';
import { formatarDataHora, mensagemPixErro } from '../shared/pix-format';

// Painel de divergencias Pix. Nao e uma fila propria: reaproveita a fila operacional do backoffice
// filtrada pelos tipos Pix (RECEBIMENTO_PIX_DIVERGENTE e DESEMBOLSO_PIX_FALHOU) e leva cada item ao
// seu detalhe no backoffice, onde vivem assumir/comentar/resolver/ignorar. A UI nao duplica esse
// tratamento, nao reenvia Pix e nao reprocessa provider para recebimento (o Pix ja foi recebido);
// para desembolso falho oferece apenas a reconsulta de status (F-13.3).
@Component({
  selector: 'sep-divergencias-page',
  imports: [RouterLink, BackofficeChipComponent],
  templateUrl: './divergencias-page.component.html',
  styleUrl: './divergencias-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DivergenciasPageComponent implements OnInit {
  private readonly backoffice = inject(BackofficeService);

  protected readonly formatarDataHora = formatarDataHora;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly recebimentosDivergentes = signal<ItemFilaResponse[]>([]);
  protected readonly desembolsosFalhos = signal<ItemFilaResponse[]>([]);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      recebimentos: this.backoffice.listarFila({ tipo: 'RECEBIMENTO_PIX_DIVERGENTE', size: 50 }),
      desembolsos: this.backoffice.listarFila({ tipo: 'DESEMBOLSO_PIX_FALHOU', size: 50 }),
    }).subscribe({
      next: ({ recebimentos, desembolsos }) => {
        this.recebimentosDivergentes.set(recebimentos.content);
        this.desembolsosFalhos.set(desembolsos.content);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(mensagemPixErro(err, 'Nao foi possivel carregar as divergencias.'));
      },
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ItemFilaResponse, StatusItemFila } from '../../../../core/api/api.models';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { BackofficeChipComponent } from '../../backoffice/shared/backoffice-chip.component';
import {
  STATUS_ITEM_FILA_LABEL,
  STATUS_ITENS_FILA,
} from '../../backoffice/shared/backoffice-format';
import { formatarDataHora, mensagemPixErro } from '../shared/pix-format';

// Tamanho fixo da pagina consultada; os titulos usam SEMPRE o totalElements do backend e,
// quando a pagina e parcial, a UI diz explicitamente quantos itens estao exibidos (F-17.2).
const TAMANHO_PAGINA = 50;

// Painel de divergencias Pix. Nao e uma fila propria: reaproveita a fila operacional do backoffice
// filtrada pelos tipos Pix (RECEBIMENTO_PIX_DIVERGENTE e DESEMBOLSO_PIX_FALHOU) e leva cada item ao
// seu detalhe no backoffice, onde vivem assumir/comentar/resolver/ignorar. A UI nao duplica esse
// tratamento, nao reenvia Pix e nao reprocessa provider para recebimento (o Pix ja foi recebido);
// para desembolso falho oferece apenas a reconsulta de status (F-13.3).
//
// F-17.2: o recorte por status e enviado ao backend (um status por consulta, como o contrato
// aceita; default ABERTO) e contagem/filtragem nunca sao derivadas localmente.
@Component({
  selector: 'sep-divergencias-page',
  imports: [RouterLink, BackofficeChipComponent],
  templateUrl: './divergencias-page.component.html',
  styleUrl: './divergencias-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DivergenciasPageComponent implements OnInit {
  private readonly backoffice = inject(BackofficeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatarDataHora = formatarDataHora;
  protected readonly statusLabel = STATUS_ITEM_FILA_LABEL;
  protected readonly statusItens = STATUS_ITENS_FILA;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  // '' = todos os status; caso contrario, um StatusItemFila valido enviado ao backend.
  protected readonly statusFiltro = signal<StatusItemFila | ''>('ABERTO');
  protected readonly recebimentosDivergentes = signal<ItemFilaResponse[]>([]);
  protected readonly recebimentosTotal = signal(0);
  protected readonly desembolsosFalhos = signal<ItemFilaResponse[]>([]);
  protected readonly desembolsosTotal = signal(0);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const status = this.statusFiltro() || undefined;
    forkJoin({
      recebimentos: this.backoffice.listarFila({
        tipo: 'RECEBIMENTO_PIX_DIVERGENTE',
        status,
        size: TAMANHO_PAGINA,
      }),
      desembolsos: this.backoffice.listarFila({
        tipo: 'DESEMBOLSO_PIX_FALHOU',
        status,
        size: TAMANHO_PAGINA,
      }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ recebimentos, desembolsos }) => {
          this.recebimentosDivergentes.set(recebimentos.content);
          this.recebimentosTotal.set(recebimentos.totalElements);
          this.desembolsosFalhos.set(desembolsos.content);
          this.desembolsosTotal.set(desembolsos.totalElements);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(mensagemPixErro(err, 'Nao foi possivel carregar as divergencias.'));
        },
      });
  }

  filtrarPorStatus(valor: string): void {
    this.statusFiltro.set(valor as StatusItemFila | '');
    this.carregar();
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ItemFilaDetalheResponse } from '../../../../core/api/api.models';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { BackofficeChipComponent } from '../shared/backoffice-chip.component';
import {
  TIPO_ENTIDADE_LABEL,
  TIPO_ITEM_FILA_LABEL,
  formatarDataHora,
  idCurto,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';

// Detalhe de leitura do item da fila: dados, descricao, comentarios e resumo do objeto
// original. Apresenta apenas o resumo (status + descricaoCurta), sem buscar payload bruto no
// modulo de origem. As acoes (assumir/comentar/resolver/ignorar) entram na Task F-10.5.
@Component({
  selector: 'sep-item-fila-detail-page',
  imports: [RouterLink, BackofficeChipComponent],
  templateUrl: './item-fila-detail-page.component.html',
  styleUrl: './item-fila-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemFilaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly backoffice = inject(BackofficeService);

  protected readonly tipoLabel = TIPO_ITEM_FILA_LABEL;
  protected readonly entidadeLabel = TIPO_ENTIDADE_LABEL;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly idCurto = idCurto;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly naoEncontrado = signal(false);
  protected readonly item = signal<ItemFilaDetalheResponse | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.naoEncontrado.set(true);
      return;
    }
    this.carregar(id);
  }

  private carregar(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrado.set(false);
    this.backoffice.consultarItem(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrado.set(true);
          return;
        }
        this.errorMessage.set(mensagemBackofficeErro(err, 'Nao foi possivel carregar o item.'));
      },
    });
  }
}

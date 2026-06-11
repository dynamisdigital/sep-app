import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ItemFilaResponse,
  PageResponse,
  PrioridadeItem,
  StatusItemFila,
  TipoItemFila,
} from '../../../../core/api/api.models';
import {
  BackofficeService,
  ListarFilaParams,
} from '../../../../core/backoffice/backoffice.service';
import { BackofficeChipComponent } from '../shared/backoffice-chip.component';
import {
  PRIORIDADES_ITEM,
  PRIORIDADE_ITEM_LABEL,
  STATUS_ITEM_FILA_LABEL,
  STATUS_ITENS_FILA,
  TIPOS_ITEM_FILA,
  TIPO_ITEM_FILA_LABEL,
  fimDoDiaIso,
  formatarDataHora,
  idCurto,
  inicioDoDiaIso,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';

const PAGE_SIZE = 20;

// Triagem da fila operacional (FINANCEIRO/BACKOFFICE/ADMIN). Filtros, paginacao e ordenacao
// vem do backend; a tela nao mantem cache local nem ordena/conta itens por conta propria.
@Component({
  selector: 'sep-fila-operacional-page',
  imports: [ReactiveFormsModule, RouterLink, BackofficeChipComponent],
  templateUrl: './fila-operacional-page.component.html',
  styleUrl: './fila-operacional-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaOperacionalPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly backoffice = inject(BackofficeService);

  protected readonly tiposItem = TIPOS_ITEM_FILA;
  protected readonly prioridades = PRIORIDADES_ITEM;
  protected readonly statusItens = STATUS_ITENS_FILA;

  protected readonly tipoLabel = TIPO_ITEM_FILA_LABEL;
  protected readonly prioridadeLabel = PRIORIDADE_ITEM_LABEL;
  protected readonly statusLabel = STATUS_ITEM_FILA_LABEL;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly idCurto = idCurto;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal<PageResponse<ItemFilaResponse> | null>(null);
  private readonly pageIndex = signal(0);

  protected readonly filtros = this.fb.group({
    tipo: this.fb.nonNullable.control<TipoItemFila | ''>(''),
    prioridade: this.fb.nonNullable.control<PrioridadeItem | ''>(''),
    status: this.fb.nonNullable.control<StatusItemFila | ''>(''),
    dataAberturaDe: this.fb.control<string | null>(null),
    dataAberturaAte: this.fb.control<string | null>(null),
    atribuidoA: this.fb.nonNullable.control<string>(''),
  });

  ngOnInit(): void {
    this.carregar();
  }

  // Toda mudanca de filtro reseta para a primeira pagina.
  aplicarFiltros(): void {
    this.pageIndex.set(0);
    this.carregar();
  }

  irParaPagina(indice: number): void {
    this.pageIndex.set(indice);
    this.carregar();
  }

  private carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const f = this.filtros.getRawValue();
    const params: ListarFilaParams = {
      tipo: f.tipo || undefined,
      prioridade: f.prioridade || undefined,
      status: f.status || undefined,
      dataAberturaDe: f.dataAberturaDe ? inicioDoDiaIso(f.dataAberturaDe) : undefined,
      dataAberturaAte: f.dataAberturaAte ? fimDoDiaIso(f.dataAberturaAte) : undefined,
      atribuidoA: f.atribuidoA.trim() || undefined,
      page: this.pageIndex(),
      size: PAGE_SIZE,
    };
    this.backoffice.listarFila(params).subscribe({
      next: (page) => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(mensagemBackofficeErro(err, 'Nao foi possivel carregar a fila.'));
      },
    });
  }
}

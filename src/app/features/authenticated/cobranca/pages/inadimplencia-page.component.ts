import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InadimplenciaResponse, StatusParcela } from '../../../../core/api/api.models';
import {
  CobrancaService,
  ListarInadimplenciaParams,
} from '../../../../core/cobranca/cobranca.service';
import { ParcelaStatusComponent } from '../shared/parcela-status.component';
import {
  formatarDataLocal,
  formatarMoeda,
  idCurto,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

const STATUS_FILTRAVEIS: StatusParcela[] = ['ATRASADA', 'INADIMPLENTE'];

// Triagem de inadimplencia para FINANCEIRO/ADMIN (GET /cobranca/inadimplencia). Filtros
// simples por dias de atraso e status; cada linha leva ao detalhe financeiro da parcela.
// Nao ha calculo no frontend — a lista vem pronta do backend.
@Component({
  selector: 'sep-inadimplencia-page',
  imports: [RouterLink, ReactiveFormsModule, ParcelaStatusComponent],
  templateUrl: './inadimplencia-page.component.html',
  styleUrl: './inadimplencia-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InadimplenciaPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cobranca = inject(CobrancaService);

  protected readonly statusFiltraveis = STATUS_FILTRAVEIS;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly linhas = signal<InadimplenciaResponse[]>([]);

  protected readonly formatarDataLocal = formatarDataLocal;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  protected readonly filtros = this.fb.group({
    diasAtrasoMin: this.fb.control<number | null>(null, [Validators.min(0)]),
    diasAtrasoMax: this.fb.control<number | null>(null, [Validators.min(0)]),
    status: this.fb.nonNullable.control<StatusParcela | ''>(''),
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    if (this.filtros.invalid) {
      this.filtros.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const { diasAtrasoMin, diasAtrasoMax, status } = this.filtros.getRawValue();
    const params: ListarInadimplenciaParams = {
      diasAtrasoMin: diasAtrasoMin ?? undefined,
      diasAtrasoMax: diasAtrasoMax ?? undefined,
      status: status || undefined,
    };
    this.cobranca.listarInadimplencia(params).subscribe({
      next: (linhas) => {
        this.linhas.set(linhas);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          mensagemCobrancaErro(err, 'Nao foi possivel carregar a inadimplencia.'),
        );
      },
    });
  }
}

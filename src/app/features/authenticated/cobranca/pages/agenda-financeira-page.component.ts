import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { RecebimentoResponse } from '../../../../core/api/api.models';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { ParcelaStatusComponent } from '../shared/parcela-status.component';
import {
  formatarData,
  formatarMoeda,
  idCurto,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

// Visao financeira: lista de recebimentos (GET /cobranca/recebimentos) e atalho para
// abrir uma parcela por id. O backend nao expoe lista global de agendas nem paginacao
// nesta fase (gaps sinalizados na UI); a operacao parte da parcela conhecida.
@Component({
  selector: 'sep-agenda-financeira-page',
  imports: [RouterLink, ReactiveFormsModule, ParcelaStatusComponent],
  templateUrl: './agenda-financeira-page.component.html',
  styleUrl: './agenda-financeira-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaFinanceiraPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cobranca = inject(CobrancaService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly recebimentos = signal<RecebimentoResponse[]>([]);

  protected readonly formatarData = formatarData;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  protected readonly lookupForm = this.fb.group({
    parcelaId: this.fb.nonNullable.control('', [Validators.required]),
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cobranca.listarRecebimentos().subscribe({
      next: (recebimentos) => {
        this.recebimentos.set(recebimentos);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          mensagemCobrancaErro(err, 'Nao foi possivel carregar os recebimentos.'),
        );
      },
    });
  }

  abrirParcela(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }
    const parcelaId = this.lookupForm.getRawValue().parcelaId.trim();
    void this.router.navigate(['/app/cobranca/financeiro/parcelas', parcelaId]);
  }
}

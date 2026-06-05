import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AgendaPagamentoResponse } from '../../../../core/api/api.models';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { ParcelaStatusComponent } from '../shared/parcela-status.component';
import {
  formatarData,
  formatarDataLocal,
  formatarMoeda,
  idCurto,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

// Agenda de pagamento do contrato para o tomador. Mostra o resumo e a composicao
// estatica de cada parcela; o valor atualizado por mora/multa e o saldo em aberto
// aparecem so no detalhe (GET /parcelas/{id}). 404 vira estado de agenda indisponivel;
// 403 e tratado pelo errorInterceptor global (redirect /access-denied).
@Component({
  selector: 'sep-agenda-tomador-page',
  imports: [RouterLink, ParcelaStatusComponent],
  templateUrl: './agenda-tomador-page.component.html',
  styleUrl: './agenda-tomador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaTomadorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cobranca = inject(CobrancaService);

  private contratoId = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly indisponivel = signal(false);
  protected readonly agenda = signal<AgendaPagamentoResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarDataLocal = formatarDataLocal;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    this.contratoId = this.route.snapshot.paramMap.get('contratoId') ?? '';
    if (this.contratoId) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.indisponivel.set(false);
    this.cobranca.consultarAgendaPorContrato(this.contratoId).subscribe({
      next: (agenda) => {
        this.agenda.set(agenda);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.indisponivel.set(true);
          return;
        }
        this.errorMessage.set(mensagemCobrancaErro(err, 'Nao foi possivel carregar a agenda.'));
      },
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OperacaoCarteiraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { AportesListComponent } from '../shared/aportes-list.component';
import { OperacaoStatusComponent } from '../shared/operacao-status.component';
import {
  formatarData,
  formatarMoeda,
  formatarTaxaMensal,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';

// Detalhe de uma operacao financiada da carteira da credora. Leitura por ownership no backend (404
// para operacao de outra credora ou inexistente). Apresenta o snapshot da oportunidade de origem, a
// justificativa, o status do contrato, o resumo AGREGADO de cobranca e a lista owner-scoped de
// aportes (F-18.4, somente leitura — registrar/retry/matching sao do recorte operacional); nunca
// busca parcelas individuais nem dado sensivel do tomador. Falha da lista de aportes fica
// localizada no componente embutido e nao derruba o detalhe ja carregado.
@Component({
  selector: 'sep-operacao-carteira-detail-page',
  imports: [RouterLink, OperacaoStatusComponent, AportesListComponent],
  templateUrl: './operacao-carteira-detail-page.component.html',
  styleUrl: './operacao-carteira-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperacaoCarteiraDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly credora = inject(CredoraService);

  private id = '';

  protected readonly loading = signal(true);
  protected readonly naoEncontrada = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly operacao = signal<OperacaoCarteiraResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    // O parametro :id e garantido pela rota; carrega incondicionalmente.
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrada.set(false);
    this.credora.consultarOperacaoCarteira(this.id).subscribe({
      next: (operacao) => {
        this.operacao.set(operacao);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(mensagemCredoraErro(err, 'Nao foi possivel carregar a operacao.'));
      },
    });
  }
}

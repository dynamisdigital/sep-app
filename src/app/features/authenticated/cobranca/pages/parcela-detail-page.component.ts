import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ValorAtualizadoParcelaResponse } from '../../../../core/api/api.models';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { ParcelaComposicaoComponent } from '../shared/parcela-composicao.component';
import { ParcelaStatusComponent } from '../shared/parcela-status.component';
import { formatarDataLocal, mensagemCobrancaErro } from '../shared/cobranca-format';

// Detalhe da parcela com o valor atualizado contra 'agora' calculado no backend:
// composicao original, mora/multa, total recebido e saldo em aberto. Leitura apenas;
// nada e recalculado no frontend. 404 vira estado de parcela nao encontrada; 403 e
// tratado pelo errorInterceptor global (redirect /access-denied).
@Component({
  selector: 'sep-parcela-detail-page',
  imports: [ParcelaStatusComponent, ParcelaComposicaoComponent],
  templateUrl: './parcela-detail-page.component.html',
  styleUrl: './parcela-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cobranca = inject(CobrancaService);

  private id = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly naoEncontrada = signal(false);
  protected readonly parcela = signal<ValorAtualizadoParcelaResponse | null>(null);

  protected readonly formatarDataLocal = formatarDataLocal;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrada.set(false);
    this.cobranca.consultarParcela(this.id).subscribe({
      next: (parcela) => {
        this.parcela.set(parcela);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(mensagemCobrancaErro(err, 'Nao foi possivel carregar a parcela.'));
      },
    });
  }
}

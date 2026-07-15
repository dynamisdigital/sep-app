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
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RenegociacaoTomadorResponse } from '../../../../core/api/api.models';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import {
  STATUS_RENEGOCIACAO_LABEL,
  formatarData,
  formatarDataLocal,
  formatarMoeda,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

// Decisao do tomador sobre a renegociacao ativa da parcela (F-16 / backend Sprint 24).
// Apresenta somente os termos publicos e autoritativos do backend: total, desconto,
// expiracao, status e elegibilidade nunca sao derivados aqui. 404 = proposta
// indisponivel (decidida, expirada ou inexistente). 403 e neutro: em runtime o
// errorInterceptor global redireciona para /access-denied; o fallback local nao
// distingue parcela alheia de inexistente.
@Component({
  selector: 'sep-renegociacao-tomador-page',
  imports: [RouterLink],
  templateUrl: './renegociacao-tomador-page.component.html',
  styleUrl: './renegociacao-tomador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenegociacaoTomadorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cobranca = inject(CobrancaService);
  private readonly destroyRef = inject(DestroyRef);

  protected parcelaId = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly indisponivel = signal(false);
  protected readonly termos = signal<RenegociacaoTomadorResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarDataLocal = formatarDataLocal;
  protected readonly statusLabel = STATUS_RENEGOCIACAO_LABEL;

  ngOnInit(): void {
    this.parcelaId = this.route.snapshot.paramMap.get('parcelaId') ?? '';
    if (this.parcelaId) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.indisponivel.set(false);
    // Cancela request em voo se o usuario sair da tela (retry pode deixar consulta pendente).
    this.cobranca
      .consultarRenegociacaoAtiva(this.parcelaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (termos) => {
          this.termos.set(termos);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.termos.set(null);
          if (err.status === 404) {
            this.indisponivel.set(true);
            return;
          }
          this.errorMessage.set(mensagemCobrancaErro(err, 'Nao foi possivel carregar a proposta.'));
        },
      });
  }
}

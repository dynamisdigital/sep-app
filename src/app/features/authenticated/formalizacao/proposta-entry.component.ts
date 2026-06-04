import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ContratoResponse } from '../../../core/api/api.models';
import { ContratosService } from '../../../core/contratos/contratos.service';
import {
  STATUS_FORMALIZACAO_LABEL,
  idCurto,
  mensagemFormalizacaoErro,
} from './shared/formalizacao-format';

// Resolve o contrato de uma proposta aprovada sob demanda (sem lista global no
// backend). 404 significa que o contrato ainda nao foi gerado; demais erros viram
// mensagem. 403 e tratado pelo errorInterceptor global.
@Component({
  selector: 'sep-proposta-entry',
  imports: [RouterLink],
  templateUrl: './proposta-entry.component.html',
  styleUrl: './proposta-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostaEntryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly contratos = inject(ContratosService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly semContrato = signal(false);
  protected readonly contrato = signal<ContratoResponse | null>(null);

  protected readonly statusLabel = STATUS_FORMALIZACAO_LABEL;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    const propostaId = this.route.snapshot.paramMap.get('propostaId');
    if (propostaId) {
      this.carregar(propostaId);
    }
  }

  carregar(propostaId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.semContrato.set(false);
    this.contratos.consultarContratoPorProposta(propostaId).subscribe({
      next: (contrato) => {
        this.contrato.set(contrato);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.semContrato.set(true);
          return;
        }
        this.errorMessage.set(
          mensagemFormalizacaoErro(err, 'Nao foi possivel carregar o contrato.'),
        );
      },
    });
  }
}

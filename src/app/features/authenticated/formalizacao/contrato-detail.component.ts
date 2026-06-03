import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ContratoResponse } from '../../../core/api/api.models';
import { ContratosService } from '../../../core/contratos/contratos.service';
import {
  STATUS_FORMALIZACAO_LABEL,
  formatarData,
  idCurto,
  mensagemFormalizacaoErro,
} from './shared/formalizacao-format';

// Detalhe do contrato. Nesta Task apresenta apenas os metadados (status, proposta,
// tipo, datas e versao vigente). Conteudo contratual, clausulas, historico de
// versoes e aceite entram nas Tasks F-8.3/F-8.4.
@Component({
  selector: 'sep-contrato-detail',
  imports: [],
  templateUrl: './contrato-detail.component.html',
  styleUrl: './contrato-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly contratos = inject(ContratosService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly contrato = signal<ContratoResponse | null>(null);

  protected readonly statusLabel = STATUS_FORMALIZACAO_LABEL;
  protected readonly formatarData = formatarData;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregar(id);
    }
  }

  carregar(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.contratos.consultarContrato(id).subscribe({
      next: (contrato) => {
        this.contrato.set(contrato);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemFormalizacaoErro(err, 'Nao foi possivel carregar o contrato.'),
        );
        this.loading.set(false);
      },
    });
  }
}

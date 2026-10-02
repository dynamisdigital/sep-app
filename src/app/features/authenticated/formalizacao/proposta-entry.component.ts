import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ContratoResponse } from '../../../core/api/api.models';
import { ContratosService } from '../../../core/contratos/contratos.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  STATUS_FORMALIZACAO_LABEL,
  idCurto,
  mensagemFormalizacaoErro,
} from './shared/formalizacao-format';

/**
 * Resolve o contrato de uma proposta aprovada sob demanda: o backend não tem lista global, então
 * a única forma de chegar ao contrato a partir da proposta é esta consulta.
 *
 * A tela é de passagem — quando o contrato existe, ela redireciona. O que importa aqui são os
 * dois desfechos em que **não** há para onde ir: proposta sem contrato gerado (404) e falha de
 * consulta. Antes os dois apareciam como uma linha de texto solta, sem dizer o que fazer.
 */
@Component({
  selector: 'sep-proposta-entry',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './proposta-entry.component.html',
  styleUrl: './proposta-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostaEntryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly contratos = inject(ContratosService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly semContrato = signal(false);
  protected readonly contrato = signal<ContratoResponse | null>(null);
  protected readonly propostaId = signal<string | null>(null);

  protected readonly statusLabel = STATUS_FORMALIZACAO_LABEL;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    const propostaId = this.route.snapshot.paramMap.get('propostaId');
    this.propostaId.set(propostaId);
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
        void this.router.navigateByUrl(`/app/formalizacao/contratos/${contrato.id}`);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.semContrato.set(true);
          return;
        }
        this.errorMessage.set(
          mensagemFormalizacaoErro(err, 'Não foi possível carregar o contrato.'),
        );
      },
    });
  }

  /** Nova tentativa a partir do estado de erro, sem obrigar a recarregar a página. */
  protected tentarDeNovo(): void {
    const id = this.propostaId();
    if (id) {
      this.carregar(id);
    }
  }
}

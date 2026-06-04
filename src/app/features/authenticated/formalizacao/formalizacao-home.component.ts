import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PropostaResponse } from '../../../core/api/api.models';
import { CreditoService } from '../../../core/credito/credito.service';
import { formatarMoeda, idCurto, mensagemFormalizacaoErro } from './shared/formalizacao-format';

// Entrada da jornada de formalizacao. O backend nao expoe lista global de
// contratos: listamos as propostas APROVADAS do tomador como pontos de partida e
// o contrato e resolvido por proposta na proxima tela. Ownership fica no backend.
@Component({
  selector: 'sep-formalizacao-home',
  imports: [RouterLink],
  templateUrl: './formalizacao-home.component.html',
  styleUrl: './formalizacao-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormalizacaoHomeComponent implements OnInit {
  private readonly credito = inject(CreditoService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly propostas = signal<PropostaResponse[]>([]);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credito.listarPropostas({ status: 'APROVADA' }).subscribe({
      next: (page) => {
        this.propostas.set(page.content);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemFormalizacaoErro(err, 'Nao foi possivel carregar as propostas.'),
        );
        this.loading.set(false);
      },
    });
  }
}

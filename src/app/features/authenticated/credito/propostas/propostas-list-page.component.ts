import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PropostaResponse } from '../../../../core/api/api.models';
import { CreditoService } from '../../../../core/credito/credito.service';
import { mensagemCreditoErro } from '../shared/credito-error';
import { formatarData, formatarMoeda, idCurto } from '../shared/credito-format';
import { PropostaStatusComponent } from '../shared/proposta-status.component';

// Lista as propostas do tomador autenticado. O backend resolve ownership: o
// CLIENTE nunca envia tomadorId. A tela so apresenta o status retornado.
@Component({
  selector: 'sep-propostas-list-page',
  imports: [RouterLink, PropostaStatusComponent],
  templateUrl: './propostas-list-page.component.html',
  styleUrl: './propostas-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostasListPageComponent implements OnInit {
  private readonly credito = inject(CreditoService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly propostas = signal<PropostaResponse[]>([]);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credito.listarPropostas().subscribe({
      next: (page) => {
        this.propostas.set(page.content);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(mensagemCreditoErro(err, 'Nao foi possivel carregar as propostas.'));
        this.loading.set(false);
      },
    });
  }
}

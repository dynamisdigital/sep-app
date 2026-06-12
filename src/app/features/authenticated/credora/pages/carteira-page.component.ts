import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OperacaoCarteiraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OperacaoStatusComponent } from '../shared/operacao-status.component';
import {
  formatarData,
  formatarMoeda,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';

// Lista a carteira de operacoes financiadas da credora autenticada. O backend resolve ownership; a
// tela so apresenta o agregado, sem dado sensivel do tomador. A carteira nasce por associacao
// operacional assistida (admin) — manifestar interesse nao gera carteira.
@Component({
  selector: 'sep-carteira-page',
  imports: [RouterLink, OperacaoStatusComponent],
  templateUrl: './carteira-page.component.html',
  styleUrl: './carteira-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteiraPageComponent implements OnInit {
  private readonly credora = inject(CredoraService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly operacoes = signal<OperacaoCarteiraResponse[]>([]);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credora.listarCarteira().subscribe({
      next: (operacoes) => {
        this.operacoes.set(operacoes);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(mensagemCredoraErro(err, 'Nao foi possivel carregar a carteira.'));
        this.loading.set(false);
      },
    });
  }
}

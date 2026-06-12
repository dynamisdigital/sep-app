import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OportunidadeResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OportunidadeStatusComponent } from '../shared/oportunidade-status.component';
import {
  formatarData,
  formatarMoeda,
  formatarTaxaMensal,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';

// Lista as oportunidades disponiveis para a credora autenticada. O backend resolve ownership e
// disponibilidade (so retorna DISPONIVEL); a tela apenas apresenta e linka ao detalhe. A acao de
// interesse pertence a Task F-11.5.
@Component({
  selector: 'sep-oportunidades-page',
  imports: [RouterLink, OportunidadeStatusComponent],
  templateUrl: './oportunidades-page.component.html',
  styleUrl: './oportunidades-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OportunidadesPageComponent implements OnInit {
  private readonly credora = inject(CredoraService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly oportunidades = signal<OportunidadeResponse[]>([]);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credora.listarOportunidades().subscribe({
      next: (oportunidades) => {
        this.oportunidades.set(oportunidades);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemCredoraErro(err, 'Nao foi possivel carregar as oportunidades.'),
        );
        this.loading.set(false);
      },
    });
  }
}

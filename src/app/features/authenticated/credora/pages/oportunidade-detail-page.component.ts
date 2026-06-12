import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

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

// Detalhe de uma oportunidade disponivel para a credora. Leitura por ownership no backend (404 para
// oportunidade de outra credora ou inexistente). A acao de manifestar interesse entra na Task F-11.5;
// aqui a area de acao fica ausente.
@Component({
  selector: 'sep-oportunidade-detail-page',
  imports: [RouterLink, OportunidadeStatusComponent],
  templateUrl: './oportunidade-detail-page.component.html',
  styleUrl: './oportunidade-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OportunidadeDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly credora = inject(CredoraService);

  private id = '';

  protected readonly loading = signal(true);
  protected readonly naoEncontrada = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly oportunidade = signal<OportunidadeResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    // O parametro :id e garantido pela rota; carrega incondicionalmente para nunca deixar o
    // estado de loading preso caso o id venha vazio.
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrada.set(false);
    this.credora.consultarOportunidade(this.id).subscribe({
      next: (oportunidade) => {
        this.oportunidade.set(oportunidade);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(
          mensagemCredoraErro(err, 'Nao foi possivel carregar a oportunidade.'),
        );
      },
    });
  }
}

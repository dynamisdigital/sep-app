import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ElegibilidadeCredoraResponse,
  OportunidadeResponse,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OportunidadeStatusComponent } from '../shared/oportunidade-status.component';
import {
  formatarData,
  formatarMoeda,
  formatarTaxaMensal,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';

// Detalhe de uma oportunidade disponivel para a credora, com manifestacao/cancelamento de interesse.
// Leitura por ownership no backend (404 para oportunidade de outra credora ou inexistente). A
// elegibilidade da credora vem do backend (GET /me/elegibilidade) so para gatear a acao; a decisao
// real (elegivel + disponivel + unicidade) e do backend. O backend NAO expoe estado de interesse por
// item, entao o estado de interesse e local: comeca sem interesse e e corrigido pelos retornos do
// backend (201/409 marcam ativo; 204/404 marcam inativo). Manifestar interesse NAO gera carteira.
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
  protected readonly elegibilidade = signal<ElegibilidadeCredoraResponse | null>(null);

  protected readonly interesseAtivo = signal(false);
  protected readonly enviando = signal(false);
  protected readonly acaoErro = signal<string | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;
  protected readonly idCurto = idCurto;

  // Espelha o gate do backend: interesse so e aceito de credora ATIVA + ELEGIVEL em oportunidade
  // DISPONIVEL. A tela apenas habilita a acao; o backend ainda valida e pode recusar.
  protected readonly podeManifestar = computed(() => {
    const o = this.oportunidade();
    const e = this.elegibilidade();
    return o?.status === 'DISPONIVEL' && e?.status === 'ATIVA' && e?.elegibilidade === 'ELEGIVEL';
  });

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
    forkJoin({
      oportunidade: this.credora.consultarOportunidade(this.id),
      elegibilidade: this.credora.consultarElegibilidade(),
    }).subscribe({
      next: ({ oportunidade, elegibilidade }) => {
        this.oportunidade.set(oportunidade);
        this.elegibilidade.set(elegibilidade);
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

  manifestarInteresse(): void {
    this.acaoErro.set(null);
    this.enviando.set(true);
    this.credora.registrarInteresse(this.id).subscribe({
      next: () => {
        this.enviando.set(false);
        this.interesseAtivo.set(true);
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        // 409: ja existe interesse ativo -> reflete "interesse registrado".
        if (err.status === 409) {
          this.interesseAtivo.set(true);
          return;
        }
        // 404: oportunidade sumiu/encerrou.
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        // 422 (inelegivel) e demais: mensagem clara, sem marcar interesse.
        this.acaoErro.set(mensagemCredoraErro(err, 'Nao foi possivel manifestar interesse.'));
      },
    });
  }

  cancelarInteresse(): void {
    this.acaoErro.set(null);
    this.enviando.set(true);
    this.credora.cancelarInteresse(this.id).subscribe({
      next: () => {
        this.enviando.set(false);
        this.interesseAtivo.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        // DELETE nao e idempotente: 404 = sem interesse ativo (estado desejado), nao erro duro.
        if (err.status === 404) {
          this.interesseAtivo.set(false);
          return;
        }
        this.acaoErro.set(mensagemCredoraErro(err, 'Nao foi possivel cancelar o interesse.'));
      },
    });
  }
}

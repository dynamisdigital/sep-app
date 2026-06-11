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

import { PixRecebimentoResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { PixRecebimentoStatusComponent } from '../shared/pix-recebimento-status.component';
import { formatarDataHora, formatarMoeda, idCurto, mensagemPixErro } from '../shared/pix-format';

// Detalhe de um recebimento Pix (papeis internos). Leitura local. Um recebimento conciliado mostra
// o vinculo com a parcela/referencia sem recalcular baixa; um recebimento sem vinculo
// (NAO_IDENTIFICADO/divergente) e estado operacional rastreavel, nao um erro de tela. Conciliacao e
// tratamento de divergencia pertencem ao backend/backoffice.
@Component({
  selector: 'sep-recebimento-detail-page',
  imports: [RouterLink, PixRecebimentoStatusComponent],
  templateUrl: './recebimento-detail-page.component.html',
  styleUrl: './recebimento-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecebimentoDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);

  private id = '';

  protected readonly loading = signal(false);
  protected readonly naoEncontrado = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly recebimento = signal<PixRecebimentoResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly idCurto = idCurto;

  protected readonly podeVerParcela = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrado.set(false);
    this.pix.consultarRecebimento(this.id).subscribe({
      next: (recebimento) => {
        this.recebimento.set(recebimento);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrado.set(true);
          return;
        }
        this.errorMessage.set(mensagemPixErro(err, 'Nao foi possivel carregar o recebimento.'));
      },
    });
  }
}

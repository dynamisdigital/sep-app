import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { PixReferenciaRecebimentoResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { PixReferenciaStatusComponent } from '../shared/pix-referencia-status.component';
import { formatarMoeda, idCurto, mensagemPixErro } from '../shared/pix-format';

// Detalhe de uma referencia Pix de recebimento (papeis internos). Leitura local. O vinculo com a
// parcela leva a jornada de cobranca quando o operador tem acesso (FINANCEIRO/ADMIN); status,
// conciliacao e baixa pertencem ao backend.
@Component({
  selector: 'sep-referencia-detail-page',
  imports: [RouterLink, PixReferenciaStatusComponent],
  templateUrl: './referencia-detail-page.component.html',
  styleUrl: './referencia-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenciaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);

  private id = '';

  protected readonly loading = signal(false);
  protected readonly naoEncontrada = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly referencia = signal<PixReferenciaRecebimentoResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  // Apenas FINANCEIRO/ADMIN acessam a parcela financeira na cobranca; para os demais o id da
  // parcela aparece como texto (o backoffice trata divergencias pelo seu fluxo).
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
    this.naoEncontrada.set(false);
    this.pix.consultarReferenciaRecebimento(this.id).subscribe({
      next: (referencia) => {
        this.referencia.set(referencia);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(mensagemPixErro(err, 'Nao foi possivel carregar a referencia.'));
      },
    });
  }
}

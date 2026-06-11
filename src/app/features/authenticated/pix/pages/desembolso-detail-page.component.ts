import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PixStatusDesembolsoResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { PixTransferenciaStatusComponent } from '../shared/pix-transferencia-status.component';
import { formatarMoeda, idCurto, mensagemPixErro } from '../shared/pix-format';

// Detalhe e status de um desembolso Pix (papeis internos). A leitura (GET) e local — nao chama o
// provider. A reconsulta (POST /status) reconcilia no provider e exige step-up; provider
// indisponivel volta como estado rastreavel, nunca como sucesso falso. Status, conciliacao e
// transicoes pertencem ao backend.
@Component({
  selector: 'sep-desembolso-detail-page',
  imports: [PixTransferenciaStatusComponent],
  templateUrl: './desembolso-detail-page.component.html',
  styleUrl: './desembolso-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesembolsoDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private id = '';

  protected readonly loading = signal(false);
  protected readonly naoEncontrado = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly desembolso = signal<PixStatusDesembolsoResponse | null>(null);
  protected readonly reconsultando = signal(false);
  protected readonly reconsultaErro = signal<string | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

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
    this.pix.consultarDesembolso(this.id).subscribe({
      next: (desembolso) => {
        this.desembolso.set(desembolso);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrado.set(true);
          return;
        }
        this.errorMessage.set(mensagemPixErro(err, 'Nao foi possivel carregar o desembolso.'));
      },
    });
  }

  reconsultar(): void {
    this.reconsultaErro.set(null);
    this.reconsultando.set(true);
    this.pix.consultarStatusDesembolso(this.id).subscribe({
      next: (desembolso) => {
        this.reconsultando.set(false);
        this.desembolso.set(desembolso);
      },
      error: (err: HttpErrorResponse) => {
        this.reconsultando.set(false);
        this.tratarErroReconsulta(err);
      },
    });
  }

  private tratarErroReconsulta(err: HttpErrorResponse): void {
    // Step-up exigido (@RequireStepUp): coleta o token e volta a este desembolso. O
    // stepUpInterceptor anexa o token no proximo POST de status.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      void this.router.navigateByUrl(`/app/step-up?next=/app/pix/desembolsos/${this.id}`);
      return;
    }
    this.reconsultaErro.set(mensagemPixErro(err, 'Nao foi possivel reconsultar o status.'));
  }
}

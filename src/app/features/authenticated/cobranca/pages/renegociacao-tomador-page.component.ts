import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { RenegociacaoTomadorResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import {
  STATUS_RENEGOCIACAO_LABEL,
  formatarData,
  formatarDataLocal,
  formatarMoeda,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

// Decisao do tomador sobre a renegociacao ativa da parcela (F-16 / backend Sprints 24 e 27).
// Apresenta somente os termos publicos e autoritativos do backend: total, desconto,
// expiracao, status e elegibilidade nunca sao derivados aqui. 404 = proposta
// indisponivel (decidida, expirada ou inexistente). 403 e neutro: em runtime o
// errorInterceptor global redireciona para /access-denied; o fallback local nao
// distingue parcela alheia de inexistente.
//
// Aceite (@RequireStepUpEstrito no backend): MFA ativo e pre-condicao — sem MFA a UI
// orienta a habilitacao e nao tenta o bypass que o backend estrito rejeita. O gesto
// reconsulta os termos, exige confirmacao explicita e so entao envia o PATCH; o token
// de uso unico vive no StepUpTokenStore e e anexado/consumido pelo stepUpInterceptor
// apenas nesse PATCH. Voltar do step-up nunca dispara aceite automatico.
@Component({
  selector: 'sep-renegociacao-tomador-page',
  imports: [RouterLink],
  templateUrl: './renegociacao-tomador-page.component.html',
  styleUrl: './renegociacao-tomador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenegociacaoTomadorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly stepUpTokens = inject(StepUpTokenStore);
  private readonly cobranca = inject(CobrancaService);
  private readonly destroyRef = inject(DestroyRef);

  protected parcelaId = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly indisponivel = signal(false);
  protected readonly termos = signal<RenegociacaoTomadorResponse | null>(null);

  protected readonly reconsultando = signal(false);
  protected readonly confirmandoAceite = signal(false);
  protected readonly decisaoEmVoo = signal(false);
  protected readonly decisaoErro = signal<string | null>(null);
  protected readonly mfaNecessario = signal(false);
  protected readonly aceitaComSucesso = signal(false);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarDataLocal = formatarDataLocal;
  protected readonly statusLabel = STATUS_RENEGOCIACAO_LABEL;

  ngOnInit(): void {
    this.parcelaId = this.route.snapshot.paramMap.get('parcelaId') ?? '';
    if (this.parcelaId) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.indisponivel.set(false);
    // Cancela request em voo se o usuario sair da tela (retry pode deixar consulta pendente).
    this.cobranca
      .consultarRenegociacaoAtiva(this.parcelaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (termos) => {
          this.termos.set(termos);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.tratarErroConsulta(err);
        },
      });
  }

  // Reconsulta os termos e so abre a confirmacao com a resposta nova: a decisao e sempre
  // sobre o snapshot mais recente do backend. MFA inativo bloqueia antes de qualquer
  // chamada. Guard de concorrencia impede abertura dupla enquanto ha consulta/decisao em voo.
  aceitarClick(): void {
    if (this.reconsultando() || this.decisaoEmVoo() || this.confirmandoAceite()) {
      return;
    }
    this.decisaoErro.set(null);
    if (!this.auth.currentUser()?.mfaHabilitado) {
      this.mfaNecessario.set(true);
      return;
    }
    this.mfaNecessario.set(false);
    this.reconsultando.set(true);
    this.cobranca
      .consultarRenegociacaoAtiva(this.parcelaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (termos) => {
          this.reconsultando.set(false);
          this.termos.set(termos);
          this.confirmandoAceite.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.reconsultando.set(false);
          this.tratarErroConsulta(err);
        },
      });
  }

  cancelarConfirmacao(): void {
    this.confirmandoAceite.set(false);
  }

  // Ultima etapa do gesto. Sem token: fecha a confirmacao e coleta o step-up com retorno
  // para ESTA rota (next montado de rota conhecida, nunca de input externo); ao voltar, o
  // aceite exige novo clique + confirmacao. Com token: PATCH unico com o renegociacaoId do
  // snapshot recem lido; o stepUpInterceptor anexa e consome o token somente nele.
  confirmarAceite(): void {
    if (this.decisaoEmVoo()) {
      return;
    }
    const termos = this.termos();
    if (!termos) {
      return;
    }
    if (!this.stepUpTokens.token()) {
      this.confirmandoAceite.set(false);
      void this.router.navigateByUrl(
        `/app/step-up?next=/app/cobranca/parcelas/${this.parcelaId}/renegociacao`,
      );
      return;
    }
    this.decisaoEmVoo.set(true);
    this.decisaoErro.set(null);
    this.cobranca
      .aceitarRenegociacao(termos.renegociacaoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.decisaoEmVoo.set(false);
          this.confirmandoAceite.set(false);
          this.aceitaComSucesso.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.decisaoEmVoo.set(false);
          this.confirmandoAceite.set(false);
          this.decisaoErro.set(mensagemCobrancaErro(err, 'Nao foi possivel aceitar a proposta.'));
        },
      });
  }

  private tratarErroConsulta(err: HttpErrorResponse): void {
    this.termos.set(null);
    this.confirmandoAceite.set(false);
    if (err.status === 404) {
      this.indisponivel.set(true);
      return;
    }
    this.errorMessage.set(mensagemCobrancaErro(err, 'Nao foi possivel carregar a proposta.'));
  }
}

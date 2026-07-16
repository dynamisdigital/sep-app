import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AcaoDecisaoMatching, MatchingSugestaoResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { CredoraService } from '../../../../core/credora/credora.service';
import {
  formatarData,
  formatarMoeda,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';
import { MatchingStatusComponent } from '../shared/matching-status.component';

const MOTIVO_MAX = 255;

// Detalhe e decisao assistida da sugestao de matching (F-18.3 / backend Sprint 30), para
// FINANCEIRO/ADMIN. O detalhe e autoritativo: a decisao so e oferecida sobre o status atual
// SUGERIDA e cada gesto reconsulta o backend antes de abrir a confirmacao — falha na reconsulta
// nunca chama o POST. Confirmar e rejeitar exigem MFA ativo e step-up estrito (backend
// @RequireStepUpEstrito, sem bypass): sem token a tela navega ao step-up com retorno para ESTA
// rota e, ao voltar, exige novo clique — nada e decidido automaticamente. O 403 do POST e tratado
// localmente (TRATA_403_LOCALMENTE no CredoraService); GET e guard de role seguem no fluxo global.
// Confirmar apenas registra a decisao: nenhum aporte e criado e nenhum recurso e transferido.
@Component({
  selector: 'sep-matching-detail-page',
  imports: [RouterLink, MatchingStatusComponent],
  templateUrl: './matching-detail-page.component.html',
  styleUrl: './matching-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchingDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly stepUpTokens = inject(StepUpTokenStore);
  private readonly credoraService = inject(CredoraService);
  private readonly destroyRef = inject(DestroyRef);

  protected sugestaoId = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly indisponivel = signal(false);
  protected readonly sugestao = signal<MatchingSugestaoResponse | null>(null);

  protected readonly reconsultando = signal(false);
  protected readonly confirmando = signal<AcaoDecisaoMatching | null>(null);
  protected readonly motivo = signal('');
  protected readonly decisaoEmVoo = signal(false);
  protected readonly decisaoErro = signal<string | null>(null);
  protected readonly mfaNecessario = signal(false);
  // Rede/5xx: o snapshot exibido permanece, marcado como desatualizado, e as decisoes ficam
  // bloqueadas ate nova leitura bem-sucedida — nunca decisao sobre estado desconhecido.
  protected readonly desatualizado = signal(false);
  // 403 do POST com token ja consumido: reverificacao somente por gesto explicito, sem loop.
  protected readonly verificacaoNecessaria = signal(false);

  protected readonly formatarData = formatarData;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;
  protected readonly motivoMax = MOTIVO_MAX;

  // Dialogo acessivel (padrao F-16): foco entra na confirmacao ao abrir e volta ao botao que a
  // disparou ao fechar; Escape cancela; Tab cicla dentro do dialogo.
  private readonly confirmacaoBox = viewChild<ElementRef<HTMLElement>>('confirmacaoBox');
  private gatilhoDecisao: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const box = this.confirmacaoBox();
      if (box) {
        box.nativeElement.focus();
      } else if (this.gatilhoDecisao) {
        this.gatilhoDecisao.focus();
        this.gatilhoDecisao = null;
      }
    });
  }

  ngOnInit(): void {
    this.sugestaoId = this.route.snapshot.paramMap.get('sugestaoId') ?? '';
    if (this.sugestaoId) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.indisponivel.set(false);
    this.credoraService
      .consultarMatching(this.sugestaoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sugestao) => {
          this.sugestao.set(sugestao);
          this.desatualizado.set(false);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.tratarErroConsulta(err);
        },
      });
  }

  // Ambas as decisoes exigem MFA ativo (o backend estrito rejeita bypass e a UI nao tenta) e
  // reconsultam o detalhe antes de abrir a confirmacao sobre o snapshot novo.
  decidirClick(acao: AcaoDecisaoMatching): void {
    if (this.decisaoBloqueada()) {
      return;
    }
    this.decisaoErro.set(null);
    this.verificacaoNecessaria.set(false);
    if (!this.auth.currentUser()?.mfaHabilitado) {
      this.mfaNecessario.set(true);
      return;
    }
    this.mfaNecessario.set(false);
    this.registrarGatilhoDecisao();
    this.motivo.set('');
    this.reconsultando.set(true);
    this.credoraService
      .consultarMatching(this.sugestaoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sugestao) => {
          this.reconsultando.set(false);
          this.sugestao.set(sugestao);
          this.desatualizado.set(false);
          // Dialogo somente sobre o estado atual SUGERIDA; terminal recem-lido substitui o
          // detalhe (a tela mostra o resultado, sem CTA).
          if (sugestao.status === 'SUGERIDA') {
            this.confirmando.set(acao);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.reconsultando.set(false);
          this.tratarErroConsulta(err);
        },
      });
  }

  // Retry explicito da leitura quando o snapshot esta desatualizado; mantem a visualizacao.
  atualizarSugestao(): void {
    if (this.reconsultando() || this.decisaoEmVoo()) {
      return;
    }
    this.reconsultando.set(true);
    this.credoraService
      .consultarMatching(this.sugestaoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sugestao) => {
          this.reconsultando.set(false);
          this.sugestao.set(sugestao);
          this.desatualizado.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.reconsultando.set(false);
          this.tratarErroConsulta(err);
        },
      });
  }

  // Reverificacao de identidade por gesto explicito apos 403 no POST (token ja consumido).
  verificarNovamente(): void {
    this.verificacaoNecessaria.set(false);
    this.decisaoErro.set(null);
    this.navegarParaStepUp();
  }

  cancelarConfirmacao(): void {
    if (this.decisaoEmVoo()) {
      return;
    }
    this.confirmando.set(null);
  }

  atualizarMotivo(valor: string): void {
    this.motivo.set(valor.slice(0, MOTIVO_MAX));
  }

  // Trap de Tab do dialogo: cicla entre os controles focaveis da confirmacao (textarea e botoes).
  prenderFoco(event: Event): void {
    const box = this.confirmacaoBox()?.nativeElement;
    if (!box) {
      return;
    }
    const focaveis = box.querySelectorAll<HTMLElement>(
      'textarea:not([disabled]), button:not([disabled])',
    );
    if (focaveis.length === 0) {
      return;
    }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const teclado = event as KeyboardEvent;
    if (
      teclado.shiftKey &&
      (document.activeElement === primeiro || document.activeElement === box)
    ) {
      teclado.preventDefault();
      ultimo.focus();
      return;
    }
    if (
      !teclado.shiftKey &&
      (document.activeElement === ultimo || document.activeElement === box)
    ) {
      teclado.preventDefault();
      primeiro.focus();
    }
  }

  // Ultima etapa da decisao. Sem token: fecha a confirmacao e coleta o step-up com retorno para
  // ESTA rota; ao voltar, a decisao exige novo clique + confirmacao. Com token: POST unico — o
  // stepUpInterceptor anexa e consome o token somente nele.
  confirmarDecisao(): void {
    const acao = this.confirmando();
    if (this.decisaoEmVoo() || acao === null) {
      return;
    }
    if (!this.stepUpTokens.token()) {
      this.confirmando.set(null);
      this.navegarParaStepUp();
      return;
    }
    const motivo = this.motivo().trim();
    this.decisaoEmVoo.set(true);
    this.decisaoErro.set(null);
    this.credoraService
      .decidirMatching(this.sugestaoId, motivo ? { acao, motivo } : { acao })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sugestao) => {
          this.decisaoEmVoo.set(false);
          this.confirmando.set(null);
          this.sugestao.set(sugestao);
        },
        error: (err: HttpErrorResponse) => {
          this.decisaoEmVoo.set(false);
          this.confirmando.set(null);
          this.tratarErroDecisao(err);
        },
      });
  }

  // Um unico gesto por vez: reconsulta em voo, confirmacao aberta, POST em voo ou snapshot
  // desatualizado bloqueiam novo clique (anti duplo-submit e anti clique cruzado).
  protected decisaoBloqueada(): boolean {
    return (
      this.reconsultando() ||
      this.decisaoEmVoo() ||
      this.confirmando() !== null ||
      this.desatualizado()
    );
  }

  private registrarGatilhoDecisao(): void {
    this.gatilhoDecisao =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  private navegarParaStepUp(): void {
    void this.router.navigateByUrl(`/app/step-up?next=/app/credora/matching/${this.sugestaoId}`);
  }

  // Matriz de falhas da decisao: nenhum caminho presume sucesso e nenhum erro ecoa UUID.
  private tratarErroDecisao(err: HttpErrorResponse): void {
    if (err.status === 409) {
      this.decisaoErro.set('A sugestao ja foi decidida. O estado foi atualizado.');
      this.atualizarSugestao();
      return;
    }
    if (err.status === 404) {
      this.decisaoErro.set('A sugestao nao esta mais disponivel.');
      this.atualizarSugestao();
      return;
    }
    if (err.status === 403) {
      if (!this.auth.currentUser()?.mfaHabilitado) {
        this.mfaNecessario.set(true);
        return;
      }
      this.verificacaoNecessaria.set(true);
      return;
    }
    if (err.status === 400) {
      this.decisaoErro.set(
        mensagemCredoraErro(err, 'Dados da decisao invalidos. Revise e tente novamente.'),
      );
      return;
    }
    // Rede/5xx: resultado desconhecido nunca vira decisao presumida; exige nova leitura
    // bem-sucedida antes de qualquer novo gesto.
    this.decisaoErro.set(
      'Nao foi possivel concluir a decisao. Atualize a sugestao antes de tentar novamente.',
    );
    this.desatualizado.set(true);
  }

  private tratarErroConsulta(err: HttpErrorResponse): void {
    this.confirmando.set(null);
    if (err.status === 404) {
      this.sugestao.set(null);
      this.indisponivel.set(true);
      return;
    }
    // Rede/5xx com detalhe ja na tela: mantem a visualizacao anterior marcada como
    // desatualizada em vez de descartar o snapshot.
    if (this.sugestao() !== null) {
      this.desatualizado.set(true);
      return;
    }
    this.errorMessage.set(mensagemCredoraErro(err, 'Nao foi possivel carregar a sugestao.'));
  }
}

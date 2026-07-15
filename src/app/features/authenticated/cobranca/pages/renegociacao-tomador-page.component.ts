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

type TipoConfirmacao = 'ACEITE' | 'RECUSA';

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
//
// Recusa (F-16.4): tambem reconsulta e exige confirmacao, mas NAO exige MFA nem
// step-up — o gesto nao verifica, nao navega e nao consome token algum (o backend so
// valida ownership). Um unico estado de decisao em voo bloqueia duplo submit e clique
// cruzado aceitar <-> recusar.
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
  protected readonly confirmando = signal<TipoConfirmacao | null>(null);
  protected readonly decisaoEmVoo = signal(false);
  protected readonly decisaoErro = signal<string | null>(null);
  protected readonly mfaNecessario = signal(false);
  protected readonly decisaoFinal = signal<'ACEITA' | 'RECUSADA' | null>(null);
  // Rede/5xx com termos ja exibidos: a visualizacao permanece, marcada como desatualizada,
  // e as decisoes ficam bloqueadas ate uma nova leitura bem-sucedida (116.5.1).
  protected readonly desatualizado = signal(false);
  // 403 do aceite apos tentativa autenticada (token consumido): reverificacao apenas por
  // acao explicita do usuario — nunca redirecionamento automatico em loop (116.5.2).
  protected readonly verificacaoNecessaria = signal(false);

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
          this.desatualizado.set(false);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.tratarErroConsulta(err);
        },
      });
  }

  // Aceite: MFA inativo bloqueia antes de qualquer chamada (o backend estrito rejeita
  // bypass e a UI nao tenta). A confirmacao so abre com o snapshot novo dos termos.
  aceitarClick(): void {
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
    this.abrirConfirmacao('ACEITE');
  }

  // Recusa: sem MFA e sem step-up — apenas reconsulta + confirmacao explicita.
  recusarClick(): void {
    if (this.decisaoBloqueada()) {
      return;
    }
    this.decisaoErro.set(null);
    this.verificacaoNecessaria.set(false);
    this.mfaNecessario.set(false);
    this.abrirConfirmacao('RECUSA');
  }

  // Retry explicito da leitura quando os termos exibidos estao desatualizados; nao passa
  // pelo estado de loading global para nao esconder a visualizacao anterior.
  atualizarTermos(): void {
    if (this.reconsultando() || this.decisaoEmVoo()) {
      return;
    }
    this.consultarTermos(() => undefined);
  }

  // Reverificacao de identidade por gesto explicito apos 403 no aceite (token ja
  // consumido). Mesmo next de rota conhecida do fluxo normal de step-up.
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

  // Ultima etapa do aceite. Sem token: fecha a confirmacao e coleta o step-up com retorno
  // para ESTA rota (next montado de rota conhecida, nunca de input externo); ao voltar, o
  // aceite exige novo clique + confirmacao. Com token: PATCH unico com o renegociacaoId do
  // snapshot recem lido; o stepUpInterceptor anexa e consome o token somente nele.
  confirmarAceite(): void {
    if (this.decisaoEmVoo() || this.confirmando() !== 'ACEITE') {
      return;
    }
    const termos = this.termos();
    if (!termos) {
      return;
    }
    if (!this.stepUpTokens.token()) {
      this.confirmando.set(null);
      this.navegarParaStepUp();
      return;
    }
    this.enviarDecisao(this.cobranca.aceitarRenegociacao(termos.renegociacaoId), 'ACEITA');
  }

  // Ultima etapa da recusa: PATCH unico, sem tocar no StepUpTokenStore (token eventual
  // permanece intacto — a recusa esta fora da allowlist do stepUpInterceptor).
  confirmarRecusa(): void {
    if (this.decisaoEmVoo() || this.confirmando() !== 'RECUSA') {
      return;
    }
    const termos = this.termos();
    if (!termos) {
      return;
    }
    this.enviarDecisao(this.cobranca.recusarRenegociacao(termos.renegociacaoId), 'RECUSADA');
  }

  // Um unico gesto de decisao por vez: consulta em voo, confirmacao aberta, decisao em
  // voo ou termos desatualizados bloqueiam novo clique (anti duplo-submit, anti clique
  // cruzado aceitar <-> recusar e decisao somente sobre leitura atual).
  private decisaoBloqueada(): boolean {
    return (
      this.reconsultando() ||
      this.decisaoEmVoo() ||
      this.confirmando() !== null ||
      this.desatualizado()
    );
  }

  private abrirConfirmacao(tipo: TipoConfirmacao): void {
    this.consultarTermos(() => this.confirmando.set(tipo));
  }

  // Leitura compartilhada de reconsulta: sucesso substitui o snapshot e limpa a marca de
  // desatualizado; falha cai no tratamento comum de leitura.
  private consultarTermos(aoAtualizar: () => void): void {
    this.reconsultando.set(true);
    this.cobranca
      .consultarRenegociacaoAtiva(this.parcelaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (termos) => {
          this.reconsultando.set(false);
          this.termos.set(termos);
          this.desatualizado.set(false);
          aoAtualizar();
        },
        error: (err: HttpErrorResponse) => {
          this.reconsultando.set(false);
          this.tratarErroConsulta(err);
        },
      });
  }

  private navegarParaStepUp(): void {
    void this.router.navigateByUrl(
      `/app/step-up?next=/app/cobranca/parcelas/${this.parcelaId}/renegociacao`,
    );
  }

  private enviarDecisao(
    decisao: ReturnType<CobrancaService['aceitarRenegociacao']>,
    resultado: 'ACEITA' | 'RECUSADA',
  ): void {
    this.decisaoEmVoo.set(true);
    this.decisaoErro.set(null);
    decisao.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.decisaoEmVoo.set(false);
        this.confirmando.set(null);
        this.decisaoFinal.set(resultado);
      },
      error: (err: HttpErrorResponse) => {
        this.decisaoEmVoo.set(false);
        this.confirmando.set(null);
        this.tratarErroDecisao(err, resultado);
      },
    });
  }

  // Matriz de falhas da decisao (116.5.2/116.5.3). Nenhum caminho presume sucesso e
  // nenhum 403 revela ownership ou dispara step-up automatico.
  private tratarErroDecisao(err: HttpErrorResponse, resultado: 'ACEITA' | 'RECUSADA'): void {
    // Decisao concorrente ou proposta que sumiu: invalida o snapshot e reconsulta; se o
    // GET responder 404, a tela encerra a decisao no estado de proposta indisponivel.
    if (err.status === 404 || err.status === 409) {
      this.decisaoErro.set('A proposta foi alterada ou ja decidida. Os termos foram atualizados.');
      this.atualizarTermos();
      return;
    }
    if (err.status === 403) {
      if (resultado === 'ACEITA') {
        if (!this.auth.currentUser()?.mfaHabilitado) {
          this.mfaNecessario.set(true);
          return;
        }
        this.verificacaoNecessaria.set(true);
        return;
      }
      this.decisaoErro.set('Acesso negado.');
      return;
    }
    // Rede/5xx: resultado desconhecido nunca vira decisao presumida; exige nova leitura
    // bem-sucedida antes de qualquer novo gesto.
    this.decisaoErro.set(
      resultado === 'ACEITA'
        ? 'Nao foi possivel concluir o aceite. Atualize os termos antes de tentar novamente.'
        : 'Nao foi possivel concluir a recusa. Atualize os termos antes de tentar novamente.',
    );
    this.desatualizado.set(true);
  }

  private tratarErroConsulta(err: HttpErrorResponse): void {
    this.confirmando.set(null);
    if (err.status === 404) {
      this.termos.set(null);
      this.indisponivel.set(true);
      return;
    }
    // Rede/5xx com termos ja na tela: mantem a visualizacao anterior marcada como
    // desatualizada em vez de descartar o snapshot; 403 continua derrubando para o
    // estado de acesso negado neutro.
    if (err.status !== 403 && this.termos() !== null) {
      this.desatualizado.set(true);
      return;
    }
    this.termos.set(null);
    this.errorMessage.set(mensagemCobrancaErro(err, 'Nao foi possivel carregar a proposta.'));
  }
}

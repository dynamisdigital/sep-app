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

import { AporteCredoraResponse, MatchingSugestaoResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { AporteIntencaoStore } from '../../../../core/credora/aporte-intencao.store';
import { CredoraService } from '../../../../core/credora/credora.service';
import {
  formatarData,
  formatarMoeda,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';
import { AporteStatusComponent } from '../shared/aporte-status.component';
import { AportesListComponent } from '../shared/aportes-list.component';

// Valor monetario digitado: obrigatorio, positivo, ate duas casas (validacao APENAS de formato —
// elegibilidade, teto e capacidade sao do backend).
const VALOR_PATTERN = /^\d+([.,]\d{1,2})?$/;

// Aporte assistido a partir de um matching CONFIRMADO (F-18.4 / backend Sprint 29), para
// FINANCEIRO/ADMIN. A pagina reconsulta o matching na entrada e usa operacaoId/valorElegivel
// recebidos do backend; o CTA so existe em CONFIRMADA como regra de UX — o POST /aportes continua
// sendo a autoridade de elegibilidade. O registro exige MFA ativo e step-up estrito com retorno
// para ESTA rota; voltar do step-up nunca registra sozinho. 201 (novo) e 200 (replay) sao sucesso
// real; rede/5xx nunca presume registro — a tela reconsulta a lista antes de nova tentativa.
// Provider fake/local na Fase 4: nenhum dinheiro real e movimentado.
@Component({
  selector: 'sep-matching-aporte-page',
  imports: [RouterLink, AporteStatusComponent, AportesListComponent],
  templateUrl: './matching-aporte-page.component.html',
  styleUrl: './matching-aporte-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchingAportePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly stepUpTokens = inject(StepUpTokenStore);
  // Intencao {operacao, valor, key} num singleton de root: sobrevive a ida/volta do step-up (que
  // destroi este componente) para o retry pos-rede/5xx reusar a MESMA key e nao duplicar aporte.
  private readonly intencoes = inject(AporteIntencaoStore);
  private readonly credoraService = inject(CredoraService);
  private readonly destroyRef = inject(DestroyRef);

  protected sugestaoId = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly indisponivel = signal(false);
  protected readonly matching = signal<MatchingSugestaoResponse | null>(null);

  protected readonly valor = signal('');
  protected readonly valorErro = signal<string | null>(null);
  protected readonly confirmando = signal(false);
  protected readonly aporteEmVoo = signal(false);
  protected readonly aporteErro = signal<string | null>(null);
  protected readonly mfaNecessario = signal(false);
  protected readonly verificacaoNecessaria = signal(false);
  protected readonly resultado = signal<AporteCredoraResponse | null>(null);

  protected readonly formatarData = formatarData;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  private readonly aportesList = viewChild(AportesListComponent);

  // Dialogo acessivel (padrao F-16): foco entra na confirmacao ao abrir e volta ao gatilho ao
  // fechar; Escape cancela; Tab cicla dentro do dialogo.
  private readonly confirmacaoBox = viewChild<ElementRef<HTMLElement>>('confirmacaoBox');
  private gatilhoAporte: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const box = this.confirmacaoBox();
      if (box) {
        box.nativeElement.focus();
      } else if (this.gatilhoAporte) {
        this.gatilhoAporte.focus();
        this.gatilhoAporte = null;
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
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.indisponivel.set(false);
    this.credoraService
      .consultarMatching(this.sugestaoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (matching) => {
          this.matching.set(matching);
          // Prefill autoritativo: o valor inicial vem do valorElegivel do backend. Revisao
          // consciente e permitida; nenhum calculo, soma ou capacidade e aplicado localmente.
          if (matching.status === 'CONFIRMADA' && this.valor() === '') {
            this.valor.set(matching.valorElegivel.toFixed(2));
          }
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 404) {
            this.matching.set(null);
            this.indisponivel.set(true);
            return;
          }
          this.errorMessage.set(mensagemCredoraErro(err, 'Nao foi possivel carregar o matching.'));
        },
      });
  }

  atualizarValor(texto: string): void {
    this.valor.set(texto);
    this.valorErro.set(null);
  }

  // Abre a confirmacao do aporte: MFA ativo e formato do valor sao pre-condicoes; o dialogo
  // apresenta o valor exato que sera enviado.
  registrarClick(): void {
    if (this.aporteBloqueado()) {
      return;
    }
    this.aporteErro.set(null);
    this.verificacaoNecessaria.set(false);
    if (!this.auth.currentUser()?.mfaHabilitado) {
      this.mfaNecessario.set(true);
      return;
    }
    this.mfaNecessario.set(false);
    if (this.valorValidado() === null) {
      return;
    }
    this.gatilhoAporte =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.confirmando.set(true);
  }

  cancelarConfirmacao(): void {
    if (this.aporteEmVoo()) {
      return;
    }
    this.confirmando.set(false);
  }

  // Reverificacao de identidade por gesto explicito apos 403 no POST (token ja consumido). A
  // intencao (valor + key) permanece em memoria para o retry legitimo apos novo step-up.
  verificarNovamente(): void {
    this.verificacaoNecessaria.set(false);
    this.aporteErro.set(null);
    this.navegarParaStepUp();
  }

  // Trap de Tab do dialogo (padrao F-16).
  prenderFoco(event: Event): void {
    const box = this.confirmacaoBox()?.nativeElement;
    if (!box) {
      return;
    }
    const focaveis = box.querySelectorAll<HTMLElement>('button:not([disabled])');
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

  // Ultima etapa do registro. Sem token: fecha a confirmacao e coleta o step-up com retorno para
  // ESTA rota; ao voltar, o registro exige novo clique + confirmacao (o rascunho recomeca do
  // prefill). Com token: POST unico com a key da intencao corrente — mesma key para o mesmo
  // valor em retry, key nova quando o valor mudou.
  confirmarAporte(): void {
    if (this.aporteEmVoo() || !this.confirmando()) {
      return;
    }
    const matching = this.matching();
    const valor = this.valorValidado();
    if (!matching || valor === null) {
      this.confirmando.set(false);
      return;
    }
    if (!this.stepUpTokens.token()) {
      this.confirmando.set(false);
      this.navegarParaStepUp();
      return;
    }
    const idempotencyKey = this.intencoes.chave(matching.operacaoId, valor);
    this.aporteEmVoo.set(true);
    this.aporteErro.set(null);
    this.credoraService
      .registrarAporte(matching.operacaoId, { valor }, idempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (aporte) => {
          this.aporteEmVoo.set(false);
          this.confirmando.set(false);
          // 201 e 200 (replay idempotente) chegam ambos aqui: sucesso real nos dois casos.
          this.resultado.set(aporte);
          this.intencoes.limpar();
          this.aportesList()?.atualizar();
        },
        error: (err: HttpErrorResponse) => {
          this.aporteEmVoo.set(false);
          this.confirmando.set(false);
          this.tratarErroAporte(err);
        },
      });
  }

  protected aporteBloqueado(): boolean {
    return this.loading() || this.aporteEmVoo() || this.confirmando();
  }

  // Validacao somente de formato; devolve o valor numerico ou null (com mensagem).
  private valorValidado(): number | null {
    const texto = this.valor().trim();
    if (!texto) {
      this.valorErro.set('Informe o valor do aporte.');
      return null;
    }
    if (!VALOR_PATTERN.test(texto)) {
      this.valorErro.set('Valor invalido: use um numero positivo com ate duas casas decimais.');
      return null;
    }
    const valor = Number(texto.replace(',', '.'));
    if (valor <= 0) {
      this.valorErro.set('O valor do aporte deve ser maior que zero.');
      return null;
    }
    return valor;
  }

  private navegarParaStepUp(): void {
    void this.router.navigateByUrl(
      `/app/step-up?next=/app/credora/matching/${this.sugestaoId}/aporte`,
    );
  }

  // Matriz de falhas do registro: nenhum caminho presume aporte criado e nenhum erro ecoa UUID,
  // key ou dado de escrow/provider.
  private tratarErroAporte(err: HttpErrorResponse): void {
    if (err.status === 400) {
      // Valor/key invalidos: mantem o formulario para correcao. Nada foi criado — a intencao e
      // encerrada e a proxima confirmacao nasce com key nova.
      this.aporteErro.set(
        mensagemCredoraErro(err, 'Dados do aporte invalidos. Revise o valor e tente novamente.'),
      );
      this.intencoes.limpar();
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
    if (err.status === 404) {
      this.aporteErro.set('Operacao indisponivel para aporte.');
      this.intencoes.limpar();
      return;
    }
    if (err.status === 409) {
      // Elegibilidade/key conflitante: reconsultar a lista, sem sucesso presumido; a proxima
      // confirmacao cria nova intencao.
      this.aporteErro.set(
        'A operacao nao aceitou o aporte (elegibilidade ou registro conflitante). O status foi atualizado.',
      );
      this.intencoes.limpar();
      this.aportesList()?.atualizar();
      return;
    }
    // Rede/5xx: o aporte pode ou nao ter sido registrado. A intencao (mesma key) e mantida para o
    // retry com o mesmo valor — o backend faz o replay idempotente — e a lista e reconsultada.
    this.aporteErro.set(
      'Nao foi possivel confirmar o registro do aporte. Atualize o status antes de tentar novamente com o mesmo valor.',
    );
    this.aportesList()?.atualizar();
  }
}

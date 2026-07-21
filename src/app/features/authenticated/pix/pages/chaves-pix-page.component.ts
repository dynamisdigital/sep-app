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
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ChavePixResponse, TipoChavePix } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { ChavePixIntencaoStore } from '../../../../core/pix/chave-pix-intencao.store';
import { PixService } from '../../../../core/pix/pix.service';
import { formatarDataHora, mensagemPixErro, TIPO_CHAVE_LABEL } from '../shared/pix-format';
import { ChavePixStatusComponent } from '../shared/chave-pix-status.component';

const TIPOS: TipoChavePix[] = ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'EVP'];

// Rota de retorno do step-up. Voltar para ESTA tela e o que permite exigir um novo clique em vez
// de retomar o POST automaticamente.
const ROTA_STEP_UP = '/app/step-up?next=/app/pix/chaves';

// Gestao assistida das chaves Pix da conta operacional/escrow (F-20.2/F-20.3 / backend Sprint 31),
// para FINANCEIRO e ADMIN. A lista chega sempre mascarada e inclui o historico INATIVA, na ordem
// devolvida pelo backend — a UI nao reordena, nao filtra e nao deriva estado. Tipo, digito
// verificador, unicidade e idempotencia sao autoritativos no backend; aqui so se valida formato
// minimo (campo preenchido).
//
// O GET nunca responde 404: sem conta operacional o backend devolve lista vazia. Por isso as
// superficies de leitura sao tres — lista, vazia e erro tecnico — e o 404 neutro pertence a
// remocao (F-20.4). A atualizacao acontece uma vez na entrada e depois somente por gesto
// explicito, sem polling.
//
// O cadastro exige MFA ativo e step-up estrito com retorno para esta rota; voltar do step-up nunca
// cadastra sozinho. A idempotencia vive no ChavePixIntencaoStore (root, so memoria): retry apos
// rede/5xx reusa a MESMA key, e mudar tipo/valor cria intencao e key novas. Nem a key nem o valor
// em claro sao persistidos. Nesta fase o provider e local (fake).
@Component({
  selector: 'sep-chaves-pix-page',
  imports: [RouterLink, ChavePixStatusComponent],
  templateUrl: './chaves-pix-page.component.html',
  styleUrl: './chaves-pix-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChavesPixPageComponent implements OnInit {
  private readonly pixService = inject(PixService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly stepUpTokens = inject(StepUpTokenStore);
  private readonly intencoes = inject(ChavePixIntencaoStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly chaves = signal<ChavePixResponse[]>([]);
  protected readonly carregado = signal(false);

  protected readonly tipos = TIPOS;
  protected readonly tipo = signal<TipoChavePix>('EMAIL');
  protected readonly valor = signal('');
  protected readonly valorErro = signal<string | null>(null);
  protected readonly confirmando = signal(false);
  protected readonly cadastroEmVoo = signal(false);
  protected readonly cadastroErro = signal<string | null>(null);
  protected readonly cadastroSucesso = signal<string | null>(null);
  protected readonly mfaNecessario = signal(false);
  protected readonly verificacaoNecessaria = signal(false);

  protected readonly formatarDataHora = formatarDataHora;
  protected readonly tipoLabel = TIPO_CHAVE_LABEL;

  // Dialogo acessivel (padrao F-16/F-18): foco entra na confirmacao ao abrir e volta ao gatilho ao
  // fechar; Escape cancela; Tab cicla dentro do dialogo.
  private readonly confirmacaoBox = viewChild<ElementRef<HTMLElement>>('confirmacaoBox');
  private gatilhoCadastro: HTMLElement | null = null;

  private consultaAtual: Subscription | null = null;

  constructor() {
    effect(() => {
      const box = this.confirmacaoBox();
      if (box) {
        box.nativeElement.focus();
      } else if (this.gatilhoCadastro) {
        this.gatilhoCadastro.focus();
        this.gatilhoCadastro = null;
      }
    });
  }

  ngOnInit(): void {
    // Reconstitui o rascunho de uma intencao viva: ao voltar do step-up este componente foi
    // recriado, e um formulario vazio faria o operador redigitar — um erro de digitacao geraria
    // key nova e reabriria justamente o risco de duplicacao que a intencao evita.
    const rascunho = this.intencoes.rascunho();
    if (rascunho) {
      this.tipo.set(rascunho.tipo);
      this.valor.set(rascunho.valor);
    }
    this.carregar();
  }

  // Consulta unica na entrada e reconsulta por gesto. Uma consulta em andamento e SUBSTITUIDA:
  // a resposta tardia da anterior e cancelada e nao sobrescreve a lista mais nova. O botao fica
  // desabilitado durante a carga, entao um duplo toque nao dispara dois GETs.
  carregar(): void {
    this.consultaAtual?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.consultaAtual = this.pixService
      .listarChavesPix()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chaves) => {
          this.chaves.set(chaves);
          this.carregado.set(true);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(
            mensagemPixErro(err, 'Nao foi possivel carregar as chaves Pix da conta operacional.'),
          );
        },
      });
  }

  atualizarTipo(tipo: string): void {
    this.tipo.set(tipo as TipoChavePix);
    this.valorErro.set(null);
  }

  atualizarValor(texto: string): void {
    this.valor.set(texto);
    this.valorErro.set(null);
  }

  // Abre a confirmacao do cadastro: MFA ativo e valor preenchido sao pre-condicoes; o dialogo
  // apresenta exatamente o que sera enviado.
  cadastrarClick(): void {
    if (this.cadastroBloqueado()) {
      return;
    }
    this.cadastroErro.set(null);
    this.cadastroSucesso.set(null);
    this.verificacaoNecessaria.set(false);
    if (!this.auth.currentUser()?.mfaHabilitado) {
      this.mfaNecessario.set(true);
      return;
    }
    this.mfaNecessario.set(false);
    if (this.valorValidado() === null) {
      return;
    }
    this.gatilhoCadastro =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.confirmando.set(true);
  }

  cancelarConfirmacao(): void {
    if (this.cadastroEmVoo()) {
      return;
    }
    this.confirmando.set(false);
  }

  // Reverificacao de identidade por gesto explicito apos 403 no POST (token ja consumido). A
  // intencao (tipo, valor e key) permanece em memoria para o retry legitimo apos novo step-up.
  verificarNovamente(): void {
    this.verificacaoNecessaria.set(false);
    this.cadastroErro.set(null);
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

  // Ultima etapa do cadastro. Sem token: fecha a confirmacao e coleta o step-up com retorno para
  // ESTA rota; ao voltar, o cadastro exige novo clique (o rascunho e reconstituido da intencao).
  // Com token: POST unico com a key da intencao corrente — mesma key para o mesmo tipo/valor em
  // retry, key nova quando qualquer um dos dois mudou.
  confirmarCadastro(): void {
    if (this.cadastroEmVoo() || !this.confirmando()) {
      return;
    }
    const valor = this.valorValidado();
    if (valor === null) {
      this.confirmando.set(false);
      return;
    }
    const tipo = this.tipo();
    if (!this.stepUpTokens.token()) {
      // A intencao nasce ANTES da ida ao step-up: e ela que sobrevive a destruicao deste
      // componente e devolve a mesma key no retorno.
      this.intencoes.chave(tipo, valor);
      this.confirmando.set(false);
      this.navegarParaStepUp();
      return;
    }
    const idempotencyKey = this.intencoes.chave(tipo, valor);
    this.cadastroEmVoo.set(true);
    this.cadastroErro.set(null);
    this.pixService
      .cadastrarChavePix({ tipo, valor }, idempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chave) => {
          this.cadastroEmVoo.set(false);
          this.confirmando.set(false);
          // 201 (nova) e 200 (replay idempotente) chegam ambos aqui: sucesso real nos dois casos.
          // A mensagem nao distingue os dois porque o efeito observavel e o mesmo — a chave existe.
          this.cadastroSucesso.set(
            `Chave ${this.tipoLabel[chave.tipo]} cadastrada (${chave.valorMascarado}).`,
          );
          this.intencoes.limpar();
          this.valor.set('');
          this.carregar();
        },
        error: (err: HttpErrorResponse) => {
          this.cadastroEmVoo.set(false);
          this.confirmando.set(false);
          this.tratarErroCadastro(err);
        },
      });
  }

  protected cadastroBloqueado(): boolean {
    return this.loading() || this.cadastroEmVoo() || this.confirmando();
  }

  // Validacao apenas de formato: campo preenchido. Digito verificador, formato por tipo e
  // unicidade sao do backend — o frontend nunca os reinterpreta. `valor` e obrigatorio para todo
  // tipo, inclusive EVP (@NotBlank no backend).
  private valorValidado(): string | null {
    const texto = this.valor().trim();
    if (!texto) {
      this.valorErro.set('Informe o valor da chave.');
      return null;
    }
    return texto;
  }

  private navegarParaStepUp(): void {
    void this.router.navigateByUrl(ROTA_STEP_UP);
  }

  // Matriz de falhas do cadastro: nenhum caminho presume chave cadastrada e nenhuma mensagem ecoa
  // o valor em claro, a Idempotency-Key, o hash ou dado de provider.
  private tratarErroCadastro(err: HttpErrorResponse): void {
    if (err.status === 400) {
      // Valor/tipo/key invalidos: mantem o formulario para correcao. Nada foi criado — a intencao
      // e encerrada e a proxima confirmacao nasce com key nova.
      this.cadastroErro.set(
        mensagemPixErro(
          err,
          'Dados da chave invalidos. Revise o tipo e o valor e tente novamente.',
        ),
      );
      this.intencoes.limpar();
      return;
    }
    if (err.status === 403) {
      if (!this.auth.currentUser()?.mfaHabilitado) {
        this.mfaNecessario.set(true);
        return;
      }
      // Token de uso unico ja consumido: reverificacao por gesto, preservando a intencao para que
      // o retry use a MESMA key.
      this.verificacaoNecessaria.set(true);
      return;
    }
    if (err.status === 409) {
      // Key reusada com payload diferente ou chave equivalente ja ativa: sem sucesso presumido; a
      // lista e reconsultada e a proxima confirmacao cria nova intencao.
      this.cadastroErro.set(
        'A chave nao foi aceita (ja existe uma equivalente ativa ou houve conflito de registro). A lista foi atualizada.',
      );
      this.intencoes.limpar();
      this.carregar();
      return;
    }
    if (err.status === 422) {
      // Indisponibilidade da conta operacional/escrow: nao e falha do operador e nada foi criado.
      this.cadastroErro.set(
        'A conta operacional esta indisponivel para cadastro de chave no momento.',
      );
      this.intencoes.limpar();
      return;
    }
    // Rede/5xx: a chave pode ou nao ter sido cadastrada. A intencao (mesma key) e mantida para o
    // retry com o mesmo tipo/valor — o backend faz o replay idempotente — e a lista e reconsultada.
    this.cadastroErro.set(
      'Nao foi possivel confirmar o cadastro da chave. Atualize a lista antes de tentar novamente com o mesmo tipo e valor.',
    );
    this.carregar();
  }
}

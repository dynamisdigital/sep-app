import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  ItemFilaDetalheResponse,
  PrioridadeItem,
  ReprocessoResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { BackofficeChipComponent } from '../shared/backoffice-chip.component';
import { ReprocessoResultadoComponent } from '../shared/reprocesso-resultado.component';
import {
  PRIORIDADE_ITEM_LABEL,
  STATUS_ITEM_FILA_LABEL,
  TIPO_ENTIDADE_LABEL,
  TIPO_ITEM_FILA_LABEL,
  formatarDataHora,
  idCurto,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';

const JUSTIFICATIVA_MIN = 20;
const TEXTO_MAX = 10000;
// Limite de digitacao das justificativas exibido no contador do Mockup 17. O backend aceita ate
// TEXTO_MAX; 500 e o teto da interface, bem acima do minimo de 20.
const JUSTIFICATIVA_MAX = 500;

// Etapas fixas da linha do tempo do item; o estado de cada uma vem do status e das datas reais.
interface EtapaTempo {
  titulo: string;
  tom: string;
  data: string | null;
  autor: string | null;
}

// Acoes que exigem step-up (gate @RequireStepUp no backend).
type AcaoComStepUp = 'resolver' | 'ignorar' | 'reprocesso';

// Detalhe e conducao do item da fila. Apresenta dados, descricao, comentarios e o resumo do
// objeto original (sem payload bruto) e permite o fluxo assistido: assumir, comentar, resolver
// e ignorar. As transicoes de estado, ownership, auditoria e o gate de step-up sao do backend;
// o componente apenas dispara as chamadas e reage ao resultado. resolver/ignorar exigem step-up
// (anexado pelo stepUpInterceptor); sem token o backend responde 403 e redirecionamos ao fluxo
// de confirmacao adicional.
@Component({
  selector: 'sep-item-fila-detail-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    BackofficeChipComponent,
    ReprocessoResultadoComponent,
    OperationalShellComponent,
  ],
  templateUrl: './item-fila-detail-page.component.html',
  styleUrl: './item-fila-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemFilaDetailPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);

  protected readonly textoMax = TEXTO_MAX;
  protected readonly tipoLabel = TIPO_ITEM_FILA_LABEL;
  protected readonly entidadeLabel = TIPO_ENTIDADE_LABEL;
  protected readonly prioridadeLabel = PRIORIDADE_ITEM_LABEL;
  protected readonly statusLabel = STATUS_ITEM_FILA_LABEL;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly idCurto = idCurto;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly naoEncontrado = signal(false);
  protected readonly item = signal<ItemFilaDetalheResponse | null>(null);

  protected readonly acaoEmAndamento = signal(false);
  protected readonly acaoErro = signal<string | null>(null);
  protected readonly acaoResultado = signal<ReprocessoResponse | null>(null);

  // Visibilidade das acoes por status (UX); a transicao real e validada no backend (409).
  protected readonly podeAssumir = computed(() => this.item()?.status === 'ABERTO');
  protected readonly podeResolver = computed(() => this.item()?.status === 'EM_TRATAMENTO');
  protected readonly podeIgnorar = computed(() => {
    const status = this.item()?.status;
    return status === 'ABERTO' || status === 'EM_TRATAMENTO';
  });

  // Atalhos de reprocesso quando o item tem handler real: WEBHOOK_FALHOU reenfileira o webhook;
  // DESEMBOLSO_PIX_FALHOU reconsulta a transferencia Pix. RECEBIMENTO_PIX_DIVERGENTE e demais
  // tipos seguem so com tratamento manual (comentar/resolver/ignorar).
  protected readonly podeReprocessarWebhook = computed(
    () => this.item()?.tipo === 'WEBHOOK_FALHOU',
  );
  protected readonly podeReprocessarProvider = computed(
    () => this.item()?.tipo === 'DESEMBOLSO_PIX_FALHOU',
  );

  protected readonly comentarioForm = this.fb.nonNullable.group({
    conteudo: ['', [Validators.required, Validators.maxLength(TEXTO_MAX)]],
  });
  protected readonly resolverForm = this.fb.nonNullable.group({
    justificativa: [
      '',
      [
        Validators.required,
        Validators.minLength(JUSTIFICATIVA_MIN),
        Validators.maxLength(JUSTIFICATIVA_MAX),
      ],
    ],
    acao: [''],
  });
  protected readonly ignorarForm = this.fb.nonNullable.group({
    justificativa: [
      '',
      [
        Validators.required,
        Validators.minLength(JUSTIFICATIVA_MIN),
        Validators.maxLength(JUSTIFICATIVA_MAX),
      ],
    ],
    motivo: [''],
  });

  // ---- Apresentacao do Mockup 17 -------------------------------------------------------------

  // O componente e OnPush: ler `form.value`/`form.invalid` direto no template nao dispara nova
  // deteccao ao digitar, entao o contador de caracteres e o estado dos botoes vem de signals.
  private readonly resolverTexto = toSignal(this.resolverForm.controls.justificativa.valueChanges, {
    initialValue: '',
  });
  private readonly ignorarTexto = toSignal(this.ignorarForm.controls.justificativa.valueChanges, {
    initialValue: '',
  });
  private readonly comentarioTexto = toSignal(this.comentarioForm.controls.conteudo.valueChanges, {
    initialValue: '',
  });

  protected readonly resolverLen = computed(() => this.resolverTexto().length);
  protected readonly ignorarLen = computed(() => this.ignorarTexto().length);
  protected readonly resolverPronto = computed(
    () => this.resolverTexto().trim().length >= JUSTIFICATIVA_MIN,
  );
  protected readonly ignorarPronto = computed(
    () => this.ignorarTexto().trim().length >= JUSTIFICATIVA_MIN,
  );
  protected readonly comentarioPronto = computed(() => this.comentarioTexto().trim().length > 0);

  // Prazo de atendimento por prioridade, o mesmo publicado nos cartoes da fila (Mockup 16):
  // Alta em 4h, Media em 24h, Baixa em 72h; Critica e o caso mais agressivo, 2h.
  private readonly slaHoras: Record<PrioridadeItem, number> = {
    CRITICA: 2,
    ALTA: 4,
    MEDIA: 24,
    BAIXA: 72,
  };

  // SLA calculado a partir da data real de abertura e da prioridade do item - nao e valor fixo.
  protected readonly sla = computed(() => {
    const it = this.item();
    if (!it) return null;
    const abertura = new Date(it.dataAbertura).getTime();
    if (it.dataResolucao) {
      const duracao = (new Date(it.dataResolucao).getTime() - abertura) / 60000;
      return { valor: this.duracao(duracao), nota: 'Tempo de tratamento', tom: 'done' };
    }
    const alvo = this.slaHoras[it.prioridade] * 60;
    const restante = alvo - (Date.now() - abertura) / 60000;
    if (restante < 0) {
      return { valor: `-${this.duracao(-restante)}`, nota: 'Atrasado', tom: 'late' };
    }
    return {
      valor: this.duracao(restante),
      nota: 'Restante',
      tom: restante < 240 ? 'risk' : 'open',
    };
  });

  private duracao(minutos: number): string {
    const total = Math.max(Math.round(minutos), 0);
    if (total >= 2880) {
      return `${Math.floor(total / 1440)}d ${Math.floor((total % 1440) / 60)}h`;
    }
    return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
  }

  protected readonly assetBase = '/image/sep_mockup_17_assets';
  protected readonly justificativaMin = JUSTIFICATIVA_MIN;
  protected readonly justificativaMax = JUSTIFICATIVA_MAX;

  protected readonly acoesResolver = [
    'Contato realizado com o tomador',
    'Pagamento confirmado',
    'Ajuste manual no sistema',
    'Reprocessamento concluído',
  ];
  protected readonly motivosIgnorar = [
    'Falso positivo',
    'Duplicidade de ocorrência',
    'Tratado em outro canal',
    'Registro de teste',
  ];

  protected readonly abaComentarios = signal<'comentarios' | 'privadas'>('comentarios');
  protected readonly apenasMeus = signal(false);
  protected readonly menuAberto = signal(false);
  protected readonly copiado = signal<string | null>(null);

  // O backend nao expoe anotacoes privadas; a aba existe, alterna e mostra o estado vazio real
  // em vez de simular conteudo.
  protected readonly anotacoesPrivadas = signal<readonly never[]>([]);

  protected readonly comentariosVisiveis = computed(() => {
    const comentarios = this.item()?.comentarios ?? [];
    if (!this.apenasMeus()) return comentarios;
    const meuId = this.auth.currentUser()?.id;
    return comentarios.filter((comentario) => comentario.autorId === meuId);
  });

  // Cinco etapas fixas; as concluidas trazem data e autor reais, as futuras ficam com "—".
  protected readonly linhaTempo = computed<EtapaTempo[]>(() => {
    const it = this.item();
    if (!it) return [];
    const emTratamento = it.status === 'EM_TRATAMENTO';
    const encerrado = it.status === 'RESOLVIDO' || it.status === 'IGNORADO';
    const atribuido = !!it.atribuidoA;
    const nomeAtribuido = it.atribuidoA ? this.autorNome(it.atribuidoA) : null;
    return [
      {
        titulo: 'Aberto automaticamente',
        tom: 'open',
        data: it.dataAbertura,
        autor: 'Sistema SEP',
      },
      {
        titulo: atribuido ? `Atribuído a ${nomeAtribuido}` : 'Aguardando atribuição',
        tom: atribuido ? 'assigned' : 'idle',
        data: atribuido ? it.dataAbertura : null,
        autor: nomeAtribuido,
      },
      {
        titulo: 'Em tratamento pela operação',
        tom: emTratamento || encerrado ? 'progress' : 'idle',
        data: emTratamento || encerrado ? it.dataAbertura : null,
        autor: nomeAtribuido,
      },
      {
        titulo: 'Aguardando resolução',
        tom: encerrado ? 'progress' : 'idle',
        data: encerrado ? it.dataResolucao : null,
        autor: null,
      },
      {
        // Titulo proposital diferente do rotulo de status para nao duplicar o mesmo texto na tela.
        titulo: it.status === 'IGNORADO' ? 'Ocorrência ignorada' : 'Ocorrência resolvida',
        tom: encerrado ? 'done' : 'idle',
        data: it.dataResolucao,
        autor: encerrado ? nomeAtribuido : null,
      },
    ];
  });

  // Campos escolhidos para nao repetir o que ja aparece no cartao "Objeto original".
  protected readonly informacoes = computed(() => {
    const it = this.item();
    if (!it) return [];
    return [
      { rotulo: 'ID do item', valor: idCurto(it.id), copia: it.id },
      { rotulo: 'Entidade', valor: idCurto(it.entidadeId), copia: it.entidadeId },
      { rotulo: 'Tipo do item', valor: this.tipoLabel[it.tipo], copia: null },
      { rotulo: 'Prioridade', valor: this.prioridadeLabel[it.prioridade], copia: null },
      {
        rotulo: 'Canal de origem',
        valor: it.atribuidoA ? 'Operação (manual)' : 'Sistema (automático)',
        copia: null,
      },
      {
        rotulo: 'Responsável',
        valor: it.atribuidoA ? this.autorNome(it.atribuidoA) : 'Sem atribuição',
        copia: null,
      },
    ];
  });

  protected readonly auditoria = computed(() => {
    const it = this.item();
    if (!it) return [];
    const nome = it.atribuidoA ? this.autorNome(it.atribuidoA) : null;
    const registros = [
      { rotulo: 'Criado', data: it.dataAbertura, autor: 'Sistema SEP' },
      ...(it.atribuidoA ? [{ rotulo: 'Atribuído', data: it.dataAbertura, autor: nome }] : []),
      ...(it.dataResolucao ? [{ rotulo: 'Encerrado', data: it.dataResolucao, autor: nome }] : []),
    ];
    return registros;
  });

  protected readonly totalAtualizacoes = computed(
    () => this.auditoria().length + (this.item()?.comentarios.length ?? 0),
  );

  protected autorNome(autorId: string): string {
    const nomes: Record<string, string> = {
      '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001': 'Ana Martins',
      '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003': 'Camila Andrade',
      '1f0799c0-98b9-6d9d-bc4a-7d6f5b771004': 'Rafael Ferreira',
    };
    return nomes[autorId] ?? `Operador ${idCurto(autorId)}`;
  }

  protected iniciais(nome: string): string {
    return nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toLocaleUpperCase('pt-BR');
  }

  protected async copiar(valor: string, rotulo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(valor);
      this.copiado.set(rotulo);
      window.setTimeout(() => this.copiado.update((r) => (r === rotulo ? null : r)), 1600);
    } catch {
      /* area de transferencia indisponivel (permissao negada ou contexto inseguro) */
    }
  }

  protected alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  // Acao primaria do mockup. O backend exige justificativa, entao quando ela ainda nao e valida
  // levamos o foco ao campo em vez de deixar um botao morto sem explicacao.
  protected marcarComoResolvido(): void {
    if (this.resolverForm.invalid) {
      this.resolverForm.controls.justificativa.markAsTouched();
      document.querySelector<HTMLTextAreaElement>('#bo17-justificativa-resolver')?.focus();
      return;
    }
    this.resolver();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.naoEncontrado.set(true);
      return;
    }
    this.carregar(id);
  }

  assumir(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    this.iniciarAcao();
    this.backoffice.assumirItem(item.id).subscribe({
      next: () => this.aoConcluir(item.id),
      error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'assumir'),
    });
  }

  comentar(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    if (this.comentarioForm.invalid) {
      this.comentarioForm.markAllAsTouched();
      return;
    }
    this.iniciarAcao();
    this.backoffice
      .registrarComentario(item.id, { conteudo: this.comentarioForm.controls.conteudo.value })
      .subscribe({
        next: () => {
          this.comentarioForm.reset({ conteudo: '' });
          this.aoConcluir(item.id);
        },
        error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'comentar'),
      });
  }

  resolver(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    if (this.resolverForm.invalid) {
      this.resolverForm.markAllAsTouched();
      return;
    }
    this.iniciarAcao();
    this.backoffice
      .resolverItem(item.id, {
        justificativa: this.comJustificativa(
          this.resolverForm.controls.acao.value,
          this.resolverForm.controls.justificativa.value,
        ),
      })
      .subscribe({
        next: () => {
          this.resolverForm.reset({ justificativa: '', acao: '' });
          this.aoConcluir(item.id);
        },
        error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'resolver'),
      });
  }

  ignorar(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    if (this.ignorarForm.invalid) {
      this.ignorarForm.markAllAsTouched();
      return;
    }
    this.iniciarAcao();
    this.backoffice
      .ignorarItem(item.id, {
        justificativa: this.comJustificativa(
          this.ignorarForm.controls.motivo.value,
          this.ignorarForm.controls.justificativa.value,
        ),
      })
      .subscribe({
        next: () => {
          this.ignorarForm.reset({ justificativa: '', motivo: '' });
          this.aoConcluir(item.id);
        },
        error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'ignorar'),
      });
  }

  // A opcao escolhida no dropdown vai junto da justificativa enviada ao backend, para o controle
  // nao ser decorativo e a acao ficar rastreavel na auditoria.
  private comJustificativa(opcao: string, texto: string): string {
    return opcao ? `${opcao}. ${texto}` : texto;
  }

  reprocessarWebhook(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    this.iniciarAcao();
    this.backoffice.reprocessarWebhook(item.entidadeId, { itemId: item.id }).subscribe({
      next: (resultado) => this.aoReprocessar(resultado),
      error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'reprocesso'),
    });
  }

  reprocessarProvider(): void {
    const item = this.item();
    if (!item || this.acaoEmAndamento()) {
      return;
    }
    this.iniciarAcao();
    this.backoffice
      .reprocessarProvider('PIX_TRANSFERENCIA', item.entidadeId, { itemId: item.id })
      .subscribe({
        next: (resultado) => this.aoReprocessar(resultado),
        error: (err: HttpErrorResponse) => this.tratarErro(err, item.id, 'reprocesso'),
      });
  }

  private iniciarAcao(): void {
    this.acaoEmAndamento.set(true);
    this.acaoErro.set(null);
    this.acaoResultado.set(null);
  }

  private aoConcluir(id: string): void {
    this.acaoEmAndamento.set(false);
    this.carregar(id);
  }

  // O reprocesso nao muda o estado do item; apenas exibimos o resultado retornado.
  private aoReprocessar(resultado: ReprocessoResponse): void {
    this.acaoEmAndamento.set(false);
    this.acaoResultado.set(resultado);
  }

  private carregar(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrado.set(false);
    this.backoffice.consultarItem(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrado.set(true);
          return;
        }
        this.errorMessage.set(mensagemBackofficeErro(err, 'Não foi possível carregar o item.'));
      },
    });
  }

  private tratarErro(
    err: HttpErrorResponse,
    id: string,
    acao: AcaoComStepUp | 'assumir' | 'comentar',
  ): void {
    this.acaoEmAndamento.set(false);
    // resolver/ignorar/reprocesso exigem step-up: 403 com MFA coleta o token e volta a este item.
    const exigeStepUp = acao === 'resolver' || acao === 'ignorar' || acao === 'reprocesso';
    if (err.status === 403 && exigeStepUp && this.auth.currentUser()?.mfaHabilitado) {
      void this.router.navigateByUrl(`/app/step-up?next=/app/backoffice/fila/${id}`);
      return;
    }
    // 429: anti-abuso de reprocesso (3/24h por entidade); sem retentativa automatica.
    if (err.status === 429) {
      this.acaoErro.set('Limite de 3 reprocessos por entidade em 24h atingido. Tente mais tarde.');
      return;
    }
    // 409: o item mudou de estado. Mostra mensagem e recarrega a situacao real.
    if (err.status === 409) {
      this.acaoErro.set('O item mudou de estado. Recarregamos a situação atual.');
      this.carregar(id);
      return;
    }
    this.acaoErro.set(mensagemBackofficeErro(err, 'Não foi possível concluir a ação.'));
  }
}

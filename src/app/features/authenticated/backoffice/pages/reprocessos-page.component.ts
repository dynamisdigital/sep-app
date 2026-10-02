import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Observable } from 'rxjs';

import { ReprocessoResponse, TipoChamadaProvider } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { formatarCelulaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import { ReprocessoResultadoComponent } from '../shared/reprocesso-resultado.component';
import {
  TIPOS_CHAMADA_PROVIDER,
  TIPO_CHAMADA_PROVIDER_LABEL,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';
import {
  LinhaReprocesso,
  ORIGEM_REPROCESSO_LABEL,
  STATUS_REPROCESSO_UI_LABEL,
  StatusReprocessoUi,
  TIPO_REPROCESSO_UI_LABEL,
  TOTAL_REPROCESSOS,
  TipoReprocessoUi,
  carregarReprocessos,
} from '../shared/reprocessos-dados';

type Aba = 'webhook' | 'provider';

// O mockup pagina de 8 em 8 ("Mostrando 1 a 8 de 128", 16 paginas). Os demais tamanhos existem
// porque o seletor "Itens por pagina" e um controle real.
const PAGE_SIZES = [8, 10, 20, 50] as const;
const PAGE_SIZE = PAGE_SIZES[0];
const MAX_PAGE_BUTTONS = 7;

// A serie diaria sai dos proprios reprocessos: cada linha tem `criadoEm` e `status`, entao o
// grafico e as sparklines contam o mesmo conjunto que a tabela e os donuts. Antes havia uma
// serie escrita a mao aqui, que nao tinha relacao com as 128 solicitacoes exibidas.
const GRAFICO = { largura: 420, base: 128, topo: 12 } as const;

// Paleta semantica compartilhada por donuts, series do grafico e selos.
const TONS: Record<string, string> = {
  green: 'var(--sep-success)',
  red: 'var(--sep-danger)',
  orange: 'var(--sep-warning)',
  blue: 'var(--sep-accent)',
  purple: 'var(--sep-purple)',
};

@Component({
  selector: 'sep-reprocessos-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    OperationalShellComponent,
    ReprocessoResultadoComponent,
  ],
  templateUrl: './reprocessos-page.component.html',
  styleUrl: './reprocessos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReprocessosPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);

  protected readonly assetBase = '/image/sep_mockup_18_assets';
  protected readonly tiposChamada = TIPOS_CHAMADA_PROVIDER;
  protected readonly chamadaLabel = TIPO_CHAMADA_PROVIDER_LABEL;
  protected readonly tipoLabel = TIPO_REPROCESSO_UI_LABEL;
  protected readonly origemLabel = ORIGEM_REPROCESSO_LABEL;
  protected readonly statusLabel = STATUS_REPROCESSO_UI_LABEL;
  protected readonly tiposReprocesso = Object.keys(TIPO_REPROCESSO_UI_LABEL) as TipoReprocessoUi[];
  protected readonly statusReprocesso = Object.keys(
    STATUS_REPROCESSO_UI_LABEL,
  ) as StatusReprocessoUi[];
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly totalReprocessos = TOTAL_REPROCESSOS;

  // ---- Disparo manual (contrato real do backend) ----------------------------------------
  // Fluxo preservado da versao anterior desta rota: step-up (403), anti-abuso 3/24h (429) e
  // 400 de tipo nao suportado continuam tratados aqui. A UI nao compensa stub do backend.
  protected readonly aba = signal<Aba>('webhook');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly resultado = signal<ReprocessoResponse | null>(null);
  protected readonly dialogoAberto = signal(false);

  protected readonly webhookForm = this.fb.nonNullable.group({
    webhookEventId: ['', [Validators.required]],
    itemId: [''],
  });
  protected readonly providerForm = this.fb.nonNullable.group({
    tipoChamada: ['PIX_TRANSFERENCIA' as TipoChamadaProvider, [Validators.required]],
    entidadeId: ['', [Validators.required]],
    itemId: [''],
  });

  // ---- Listagem -------------------------------------------------------------------------
  private readonly reprocessos = signal<readonly LinhaReprocesso[]>(carregarReprocessos());
  protected readonly carregando = signal(false);
  protected readonly erroLista = signal<string | null>(null);
  protected readonly copiado = signal<string | null>(null);
  protected readonly menuAberto = signal<string | null>(null);
  protected readonly detalhe = signal<LinhaReprocesso | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly pageSize = signal<number>(PAGE_SIZE);
  private readonly pageIndex = signal(0);

  // O periodo padrao cobre 24/04 a 30/05, o mesmo intervalo do grafico de historico. O mockup
  // desenha 30/04 no campo, mas nesse recorte a base nao fecha os 128 que ele mesmo exibe na
  // tabela, nos dois donuts, no cartao de metrica e no total do periodo.
  protected readonly filtros = this.fb.group({
    busca: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<StatusReprocessoUi | ''>(''),
    tipo: this.fb.nonNullable.control<TipoReprocessoUi | ''>(''),
    criadoDe: this.fb.control<string | null>('2026-04-24'),
    criadoAte: this.fb.control<string | null>('2026-05-30'),
    origem: this.fb.nonNullable.control<TipoReprocessoUi | ''>(''),
  });

  // Os computed nao podem ler o FormGroup diretamente (ele nao e signal e nao os invalidaria).
  // `aplicarFiltros` publica aqui o valor corrente, e a tabela reage a esta copia.
  private readonly filtrosAplicados = signal(this.filtros.getRawValue());

  protected readonly filtrados = computed(() => {
    const f = this.filtrosAplicados();
    const termo = f.busca.trim().toLocaleLowerCase('pt-BR');
    const de = f.criadoDe ? new Date(`${f.criadoDe}T00:00:00-03:00`).getTime() : null;
    const ate = f.criadoAte ? new Date(`${f.criadoAte}T23:59:59-03:00`).getTime() : null;

    return this.reprocessos().filter((linha) => {
      if (f.status && linha.status !== f.status) return false;
      if (f.tipo && linha.tipo !== f.tipo) return false;
      if (f.origem && linha.tipo !== f.origem) return false;
      const criado = new Date(linha.criadoEm).getTime();
      if (de !== null && criado < de) return false;
      if (ate !== null && criado > ate) return false;
      if (!termo) return true;
      return [linha.codigo, linha.referencia, linha.solicitante, this.tipoLabel[linha.tipo]]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(termo);
    });
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(Math.ceil(this.filtrados().length / this.pageSize()), 1),
  );

  // A pagina corrente e limitada ao total: mudar o filtro pode encurtar a lista.
  protected readonly paginaAtual = computed(() =>
    Math.min(this.pageIndex(), this.totalPaginas() - 1),
  );

  protected readonly visiveis = computed(() => {
    const inicio = this.paginaAtual() * this.pageSize();
    return this.filtrados().slice(inicio, inicio + this.pageSize());
  });

  protected readonly faixa = computed(() => {
    const total = this.filtrados().length;
    const quantidade = this.visiveis().length;
    if (quantidade === 0) return { de: 0, ate: 0, total };
    const de = this.paginaAtual() * this.pageSize() + 1;
    return { de, ate: de + quantidade - 1, total };
  });

  // Paginas visiveis; `null` representa as reticencias do mockup (1 2 3 4 5 … 16).
  protected readonly botoesPagina = computed<(number | null)[]>(() => {
    const total = this.totalPaginas();
    if (total <= MAX_PAGE_BUTTONS) {
      return Array.from({ length: total }, (_, indice) => indice);
    }
    const atual = this.paginaAtual();
    const visiveis = new Set<number>([0, total - 1, atual]);
    const inicio = atual <= 2 ? 0 : atual >= total - 3 ? total - 5 : atual - 1;
    for (let i = inicio; i < inicio + 5; i += 1) {
      if (i >= 0 && i < total) visiveis.add(i);
    }
    const ordenadas = [...visiveis].sort((a, b) => a - b);
    const itens: (number | null)[] = [];
    let anterior = -1;
    for (const numero of ordenadas) {
      if (anterior >= 0 && numero - anterior > 1) itens.push(null);
      itens.push(numero);
      anterior = numero;
    }
    return itens;
  });

  // ---- Agregados ------------------------------------------------------------------------
  // Contados sobre o conjunto completo, nao sobre a pagina: os paineis descrevem o periodo.
  private readonly porStatus = computed(() => {
    const contagem = { CONCLUIDO: 0, EM_EXECUCAO: 0, AGUARDANDO: 0, FALHA: 0 };
    for (const linha of this.reprocessos()) contagem[linha.status] += 1;
    return contagem;
  });

  private readonly porTipo = computed(() => {
    const contagem = {
      INTEGRACAO_PIX: 0,
      COBRANCA: 0,
      CREDITO: 0,
      FORMALIZACAO: 0,
      ONBOARDING: 0,
    };
    for (const linha of this.reprocessos()) contagem[linha.tipo] += 1;
    return contagem;
  });

  protected readonly total = computed(() => this.reprocessos().length);

  // ---- Serie diaria ------------------------------------------------------------------------
  // Um ponto por dia entre a solicitacao mais antiga e a mais recente, contando pela data de
  // criacao. `null` no status devolve o total do dia, que e a serie do primeiro cartao.
  private serieDiaria(status: StatusReprocessoUi | null): number[] {
    const linhas = this.reprocessos();
    if (!linhas.length) return [];
    const dia = (iso: string) => iso.slice(0, 10);
    const dias = [...new Set(linhas.map((l) => dia(l.criadoEm)))].sort();
    const contagem = new Map(dias.map((d) => [d, 0]));
    for (const linha of linhas) {
      if (status && linha.status !== status) continue;
      contagem.set(dia(linha.criadoEm), (contagem.get(dia(linha.criadoEm)) ?? 0) + 1);
    }
    return dias.map((d) => contagem.get(d) ?? 0);
  }

  protected readonly serieTotal = computed(() => this.serieDiaria(null));
  protected readonly serieConcluidos = computed(() => this.serieDiaria('CONCLUIDO'));
  protected readonly serieFalhas = computed(() => this.serieDiaria('FALHA'));
  protected readonly serieExecucao = computed(() => this.serieDiaria('EM_EXECUCAO'));
  protected readonly serieAguardando = computed(() => this.serieDiaria('AGUARDANDO'));

  private serieDaChave(chave: string): number[] {
    if (chave === 'falhas') return this.serieFalhas();
    if (chave === 'execucao') return this.serieExecucao();
    if (chave === 'aguardando') return this.serieAguardando();
    return this.serieConcluidos();
  }

  // Variacao dos ultimos 30 dias contra os 30 anteriores, na mesma serie.
  private variacao(serie: readonly number[]): string {
    const metade = Math.floor(serie.length / 2);
    if (metade < 1) return '0,0%';
    const antes = serie.slice(0, metade).reduce((a, b) => a + b, 0);
    const depois = serie.slice(metade).reduce((a, b) => a + b, 0);
    if (!antes) return depois ? '+100,0%' : '0,0%';
    const delta = ((depois - antes) / antes) * 100;
    return `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1).replace('.', ',')}%`;
  }

  protected readonly metricas = computed(() => {
    const s = this.porStatus();
    const total = this.total();
    return [
      {
        chave: 'total',
        rotulo: 'Total de solicitações',
        valor: total,
        nota: 'vs. 30 dias anteriores',
        destaque: this.variacao(this.serieTotal()),
        tom: 'blue',
        icone: 'inbox',
        serie: this.serieTotal(),
      },
      {
        chave: 'concluidos',
        rotulo: 'Concluídos com sucesso',
        valor: s.CONCLUIDO,
        nota: 'do total',
        destaque: this.percentual(s.CONCLUIDO, total),
        tom: 'green',
        icone: 'circle-check-big',
        serie: this.serieConcluidos(),
      },
      {
        chave: 'execucao',
        rotulo: 'Em execução',
        valor: s.EM_EXECUCAO,
        nota: 'do total',
        destaque: this.percentual(s.EM_EXECUCAO, total),
        tom: 'orange',
        icone: 'loader-circle',
        serie: this.serieExecucao(),
      },
      {
        chave: 'aguardando',
        rotulo: 'Aguardando execução',
        valor: s.AGUARDANDO,
        nota: 'do total',
        destaque: this.percentual(s.AGUARDANDO, total),
        tom: 'purple',
        icone: 'hourglass',
        serie: this.serieAguardando(),
      },
      {
        chave: 'falhas',
        rotulo: 'Falhas',
        valor: s.FALHA,
        nota: 'do total',
        destaque: this.percentual(s.FALHA, total),
        tom: 'red',
        icone: 'circle-x',
        serie: this.serieFalhas(),
      },
    ];
  });

  protected readonly legendaStatus = computed(() => {
    const s = this.porStatus();
    const total = this.total();
    return [
      {
        rotulo: 'Concluídos',
        valor: s.CONCLUIDO,
        percentual: this.percentual(s.CONCLUIDO, total),
        tom: 'green',
        chave: 'CONCLUIDO' as StatusReprocessoUi,
      },
      {
        rotulo: 'Falhas',
        valor: s.FALHA,
        percentual: this.percentual(s.FALHA, total),
        tom: 'red',
        chave: 'FALHA' as StatusReprocessoUi,
      },
      {
        rotulo: 'Em execução',
        valor: s.EM_EXECUCAO,
        percentual: this.percentual(s.EM_EXECUCAO, total),
        tom: 'orange',
        chave: 'EM_EXECUCAO' as StatusReprocessoUi,
      },
      {
        rotulo: 'Aguardando',
        valor: s.AGUARDANDO,
        percentual: this.percentual(s.AGUARDANDO, total),
        tom: 'blue',
        chave: 'AGUARDANDO' as StatusReprocessoUi,
      },
    ];
  });

  protected readonly legendaTipo = computed(() => {
    const t = this.porTipo();
    const total = this.total();
    return [
      {
        rotulo: 'Integração Pix',
        valor: t.INTEGRACAO_PIX,
        percentual: this.percentual(t.INTEGRACAO_PIX, total),
        tom: 'green',
        chave: 'INTEGRACAO_PIX' as TipoReprocessoUi,
      },
      {
        rotulo: 'Cobrança',
        valor: t.COBRANCA,
        percentual: this.percentual(t.COBRANCA, total),
        tom: 'red',
        chave: 'COBRANCA' as TipoReprocessoUi,
      },
      {
        rotulo: 'Crédito',
        valor: t.CREDITO,
        percentual: this.percentual(t.CREDITO, total),
        tom: 'blue',
        chave: 'CREDITO' as TipoReprocessoUi,
      },
      {
        rotulo: 'Formalização',
        valor: t.FORMALIZACAO,
        percentual: this.percentual(t.FORMALIZACAO, total),
        tom: 'purple',
        chave: 'FORMALIZACAO' as TipoReprocessoUi,
      },
      {
        rotulo: 'Onboarding',
        valor: t.ONBOARDING,
        percentual: this.percentual(t.ONBOARDING, total),
        tom: 'orange',
        chave: 'ONBOARDING' as TipoReprocessoUi,
      },
    ];
  });

  // conic-gradient do donut, iniciando em 12 horas e na ordem da legenda.
  protected readonly donutStatus = computed(() => this.donut(this.legendaStatus()));
  protected readonly donutTipo = computed(() => this.donut(this.legendaTipo()));

  protected readonly emAndamento = computed(() =>
    this.reprocessos()
      .filter((linha) => linha.status === 'EM_EXECUCAO')
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
  );

  // ---- Grafico de historico --------------------------------------------------------------
  protected readonly series = computed(() => [
    {
      chave: 'concluidos',
      rotulo: 'Concluídos',
      tom: 'green',
      pontos: this.pontos(this.serieConcluidos()),
    },
    {
      chave: 'falhas',
      rotulo: 'Falhas',
      tom: 'red',
      pontos: this.pontos(this.serieFalhas()),
    },
    {
      chave: 'execucao',
      rotulo: 'Em execução',
      tom: 'orange',
      pontos: this.pontos(this.serieExecucao()),
    },
    {
      chave: 'aguardando',
      rotulo: 'Aguardando',
      tom: 'blue',
      pontos: this.pontos(this.serieAguardando()),
    },
  ]);

  protected readonly marcasHistorico = computed(() =>
    this.series().map((serie) => ({
      chave: serie.chave,
      tom: serie.tom,
      marcas: this.coordenadas(this.serieDaChave(serie.chave)),
    })),
  );

  protected readonly datasHistorico = [
    '24/04',
    '27/04',
    '30/04',
    '03/05',
    '06/05',
    '09/05',
    '12/05',
    '15/05',
    '18/05',
    '21/05',
    '24/05',
    '27/05',
    '30/05',
  ];

  // O teto do eixo acompanha a serie: com o valor fixo de 40 do mockup as linhas reais, que
  // batem em menos de dez por dia, ficavam esmagadas na base do grafico.
  protected readonly tetoHistorico = computed(() => {
    const maior = Math.max(
      ...this.serieConcluidos(),
      ...this.serieFalhas(),
      ...this.serieExecucao(),
      ...this.serieAguardando(),
      1,
    );
    const passo = maior <= 4 ? 1 : maior <= 8 ? 2 : maior <= 20 ? 5 : 10;
    return Math.ceil(maior / passo) * passo;
  });

  protected readonly escalaHistorico = computed(() => {
    const teto = this.tetoHistorico();
    return [0, 1, 2, 3, 4].map((i) => Math.round((teto * (4 - i)) / 4));
  });

  // Grade do grafico: uma horizontal por marca do eixo e uma vertical por rotulo de data.
  protected readonly linhasGrade = computed(() => {
    const escala = this.escalaHistorico();
    const horizontais = escala.map((_, indice) => {
      const y = GRAFICO.topo + (indice * (GRAFICO.base - GRAFICO.topo)) / (escala.length - 1);
      return { x1: 0, y1: y, x2: GRAFICO.largura, y2: y };
    });
    const verticais = this.datasHistorico.map((_, indice) => {
      const x = (indice * GRAFICO.largura) / (this.datasHistorico.length - 1);
      return { x1: x, y1: GRAFICO.topo, x2: x, y2: GRAFICO.base };
    });
    return [...horizontais, ...verticais];
  });

  constructor() {
    // Sem isto os dropdowns e o periodo ficariam decorativos: so a busca (submit) reagiria.
    // `busca` fica de fora de proposito, para nao filtrar a cada tecla.
    const { busca, ...aplicaveis } = this.filtros.controls;
    void busca;
    const controles: AbstractControl[] = Object.values(aplicaveis);
    for (const controle of controles) {
      controle.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.aplicarFiltros());
    }
  }

  // ---- Acoes da listagem -----------------------------------------------------------------
  protected aplicarFiltros(): void {
    this.filtrosAplicados.set(this.filtros.getRawValue());
    this.pageIndex.set(0);
  }

  protected filtrarPorStatus(status: StatusReprocessoUi): void {
    this.filtros.patchValue({ status }, { emitEvent: false });
    this.aplicarFiltros();
  }

  protected irParaPagina(indice: number | null): void {
    if (indice === null || indice < 0 || indice >= this.totalPaginas()) return;
    this.pageIndex.set(indice);
  }

  protected alterarTamanhoPagina(evento: Event): void {
    const tamanho = Number((evento.target as HTMLSelectElement).value);
    if (!Number.isFinite(tamanho) || tamanho <= 0) return;
    this.pageSize.set(tamanho);
    this.pageIndex.set(0);
  }

  protected async copiarId(linha: LinhaReprocesso): Promise<void> {
    this.menuAberto.set(null);
    try {
      await navigator.clipboard.writeText(linha.id);
      this.copiado.set(linha.id);
      window.setTimeout(() => this.copiado.update((id) => (id === linha.id ? null : id)), 1600);
    } catch {
      /* area de transferencia indisponivel (permissao negada ou contexto inseguro) */
    }
  }

  protected alternarMenu(linha: LinhaReprocesso): void {
    this.menuAberto.update((id) => (id === linha.id ? null : linha.id));
  }

  protected abrirDetalhe(linha: LinhaReprocesso): void {
    this.menuAberto.set(null);
    this.detalhe.set(linha);
  }

  protected fecharDetalhe(): void {
    this.detalhe.set(null);
  }

  // Exporta o resultado filtrado corrente em CSV; roda inteiramente no navegador.
  protected exportarRelatorio(): void {
    const cabecalho = [
      'ID',
      'Tipo de reprocesso',
      'Origem',
      'Referência',
      'Status',
      'Criado em',
      'Solicitante',
      'Última atualização',
    ];
    const linhas = this.filtrados().map((linha) => [
      linha.codigo,
      this.tipoLabel[linha.tipo],
      this.origemLabel[linha.tipo],
      linha.referencia,
      this.statusLabel[linha.status],
      this.dataHora(linha.criadoEm).join(' '),
      linha.solicitante,
      this.dataHora(linha.atualizadoEm).join(' '),
    ]);
    const csv = [cabecalho, ...linhas]
      .map((colunas) => colunas.map((valor) => formatarCelulaCsv(valor)).join(';'))
      .join('\r\n');
    // BOM para o Excel em pt-BR reconhecer os acentos.

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reprocessos.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.anunciar(`Relatório exportado com ${linhas.length} reprocessos.`);
  }

  // Nao existe disparo em lote no backend: o atalho filtra as falhas e explica que a
  // reexecucao e feita linha a linha, sem prometer o que a API nao oferece.
  protected reexecutarFalhas(): void {
    this.filtrarPorStatus('FALHA');
    this.anunciar(
      `${this.porStatus().FALHA} falhas no período. A reexecução é disparada por linha, na coluna Ações.`,
    );
  }

  protected verAgendados(): void {
    this.filtrarPorStatus('AGUARDANDO');
    this.anunciar('Mostrando os reprocessos aguardando execução.');
  }

  // ---- Disparo manual --------------------------------------------------------------------
  // "Novo reprocesso" abre a tela dedicada (Mockup 19), que traz o formulario completo com as
  // regras, o historico e o painel de conformidade. O dialogo permanece para a reexecucao a
  // partir de uma linha, onde o contexto ja esta preenchido e trocar de tela atrapalharia.
  protected novoReprocesso(): void {
    this.menuAberto.set(null);
    void this.router.navigate(['/app/backoffice/reprocessos', 'provider']);
  }

  protected abrirDialogo(aba: Aba = 'webhook'): void {
    this.menuAberto.set(null);
    this.selecionarAba(aba);
    this.dialogoAberto.set(true);
  }

  protected fecharDialogo(): void {
    this.dialogoAberto.set(false);
    this.erro.set(null);
    this.resultado.set(null);
  }

  selecionarAba(aba: Aba): void {
    this.aba.set(aba);
    this.erro.set(null);
    this.resultado.set(null);
  }

  reprocessarWebhook(): void {
    if (this.enviando()) {
      return;
    }
    if (this.webhookForm.invalid) {
      this.webhookForm.markAllAsTouched();
      return;
    }
    const { webhookEventId, itemId } = this.webhookForm.getRawValue();
    this.enviar(this.backoffice.reprocessarWebhook(webhookEventId.trim(), corpo(itemId)));
  }

  reprocessarProvider(): void {
    if (this.enviando()) {
      return;
    }
    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }
    const { tipoChamada, entidadeId, itemId } = this.providerForm.getRawValue();
    this.enviar(this.backoffice.reprocessarProvider(tipoChamada, entidadeId.trim(), corpo(itemId)));
  }

  // Reexecucao a partir da linha: preenche o formulario do tipo correspondente e dispara pelo
  // mesmo caminho do painel manual, preservando step-up e anti-abuso.
  protected reexecutar(linha: LinhaReprocesso): void {
    this.menuAberto.set(null);
    this.detalhe.set(null);
    this.dialogoAberto.set(true);
    if (linha.origem === 'PROVIDER') {
      this.selecionarAba('provider');
      this.providerForm.patchValue({
        tipoChamada: 'PIX_TRANSFERENCIA',
        entidadeId: linha.id,
        itemId: linha.itemId ?? '',
      });
      this.reprocessarProvider();
      return;
    }
    this.selecionarAba('webhook');
    this.webhookForm.patchValue({ webhookEventId: linha.id, itemId: linha.itemId ?? '' });
    this.reprocessarWebhook();
  }

  private enviar(chamada: Observable<ReprocessoResponse>): void {
    this.enviando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    chamada.subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.enviando.set(false);
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err),
    });
  }

  private tratarErro(err: HttpErrorResponse): void {
    this.enviando.set(false);
    if (err.status === 403) {
      // Com MFA habilitado o fluxo coleta o token e volta a este painel.
      if (this.auth.currentUser()?.mfaHabilitado) {
        void this.router.navigateByUrl('/app/step-up?next=/app/backoffice/reprocessos');
        return;
      }
      // Sem MFA o step-up nao tem como ser cumprido; a mensagem generica anterior nao dizia isso.
      this.erro.set(
        'Este disparo exige confirmação adicional (step-up). Habilite a verificação em duas etapas em Meu perfil para prosseguir.',
      );
      return;
    }
    // Anti-abuso 3/24h por entidade: sem retentativa automatica.
    if (err.status === 429) {
      this.erro.set('Limite de 3 reprocessos por entidade em 24h atingido. Tente mais tarde.');
      return;
    }
    if (err.status === 400) {
      this.erro.set(
        mensagemBackofficeErro(err, 'Tipo de reprocesso não suportado ou dados inválidos.'),
      );
      return;
    }
    this.erro.set(mensagemBackofficeErro(err, 'Não foi possível disparar o reprocesso.'));
  }

  // ---- Apresentacao ----------------------------------------------------------------------
  protected dataHora(iso: string): [string, string] {
    const data = new Date(iso);
    return [
      data.toLocaleDateString('pt-BR'),
      data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    ];
  }

  protected iniciais(nome: string): string {
    return nome
      .split(' ')
      .filter((parte) => parte.length > 2)
      .slice(0, 2)
      .map((parte) => parte[0]?.toLocaleUpperCase('pt-BR') ?? '')
      .join('');
  }

  // Os PNGs `icon_avatar_*.png` do pacote do Mockup 18 vieram recortados errado (metade do
  // circulo mais um retangulo da celula vizinha), entao o avatar e desenhado em CSS a partir
  // das iniciais, com as cores amostradas do mockup. Sao tinta saturada, invariante por tema:
  // o texto por cima e branco nos dois (`--sep-on-tint`), e todas passam de 6,3:1 com ele.
  protected corDoAvatar(nome: string): string {
    const cores: Record<string, string> = {
      AM: '#4a2f96',
      RF: '#3f42a0',
      CA: '#5a5f6b',
      JS: '#575c68',
      LG: '#17509e',
    };
    return cores[this.iniciais(nome)] ?? '#3d5468';
  }

  protected iconeTipo(tipo: TipoReprocessoUi): string {
    const arquivos: Record<TipoReprocessoUi, string> = {
      INTEGRACAO_PIX: 'plug-zap',
      COBRANCA: 'receipt',
      CREDITO: 'credit-card',
      FORMALIZACAO: 'file-check',
      ONBOARDING: 'user-plus',
    };
    return arquivos[tipo];
  }

  protected tomStatus(status: StatusReprocessoUi): string {
    const tons: Record<StatusReprocessoUi, string> = {
      CONCLUIDO: 'green',
      EM_EXECUCAO: 'orange',
      AGUARDANDO: 'blue',
      FALHA: 'red',
    };
    return tons[status];
  }

  protected iconeStatus(status: StatusReprocessoUi): string {
    const icones: Record<StatusReprocessoUi, string> = {
      CONCLUIDO: 'circle-check',
      EM_EXECUCAO: 'loader-circle',
      AGUARDANDO: 'clock',
      FALHA: 'circle-alert',
    };
    return icones[status];
  }

  // Reprocesso ainda em curso pode ser acompanhado/disparado; encerrado abre o detalhe.
  protected emCurso(linha: LinhaReprocesso): boolean {
    return linha.status === 'AGUARDANDO' || linha.status === 'EM_EXECUCAO';
  }

  // Sparkline dos cartoes de metrica: mesma serie do historico, normalizada na caixa do cartao.
  protected sparkline(valores: readonly number[]): string {
    const maximo = Math.max(...valores, 1);
    const passo = 190 / (valores.length - 1);
    return valores
      .map(
        (valor, indice) =>
          `${(indice * passo).toFixed(2)},${(32 - (valor / maximo) * 28).toFixed(2)}`,
      )
      .join(' ');
  }

  protected corDaSerie(tom: string): string {
    return TONS[tom] ?? TONS['blue'];
  }

  // "Ver detalhes" leva ao Dashboard operacional, onde as distribuicoes sao analisadas por
  // periodo; a ancora identifica qual painel abriu o link.
  protected verDistribuicao(painel: 'status' | 'tipo'): void {
    void this.router.navigate(['/app/backoffice'], { fragment: `distribuicao-${painel}` });
  }

  private percentual(valor: number, total: number): string {
    if (total === 0) return '0,0%';
    return `${((valor / total) * 100).toFixed(1).replace('.', ',')}%`;
  }

  // `from 0deg` faz a primeira faixa comecar as 12 horas, como no mockup.
  private donut(faixas: readonly { valor: number; tom: string }[]): string {
    const total = faixas.reduce((soma, faixa) => soma + faixa.valor, 0) || 1;
    let inicio = 0;
    const partes = faixas.map((faixa) => {
      const fim = inicio + (faixa.valor / total) * 360;
      const trecho = `${this.corDaSerie(faixa.tom)} ${inicio.toFixed(2)}deg ${fim.toFixed(2)}deg`;
      inicio = fim;
      return trecho;
    });
    return `conic-gradient(from 0deg, ${partes.join(', ')})`;
  }

  private pontos(valores: readonly number[]): string {
    return this.coordenadas(valores)
      .map((ponto) => `${ponto.x},${ponto.y}`)
      .join(' ');
  }

  private coordenadas(valores: readonly number[]): { x: number; y: number }[] {
    const passo = GRAFICO.largura / Math.max(valores.length - 1, 1);
    const altura = GRAFICO.base - GRAFICO.topo;
    return valores.map((valor, indice) => ({
      x: Number((indice * passo).toFixed(2)),
      y: Number((GRAFICO.base - (valor / this.tetoHistorico()) * altura).toFixed(2)),
    }));
  }

  private anunciar(mensagem: string): void {
    this.aviso.set(mensagem);
    window.setTimeout(
      () => this.aviso.update((atual) => (atual === mensagem ? null : atual)),
      5200,
    );
  }
}

// itemId e opcional; quando informado vincula o reprocesso ao item da fila.
function corpo(itemId: string): { itemId: string } | undefined {
  const valor = itemId.trim();
  return valor ? { itemId: valor } : undefined;
}

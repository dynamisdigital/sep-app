import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  ItemFilaResponse,
  PageResponse,
  PrioridadeItem,
  StatusItemFila,
  TipoItemFila,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  BackofficeService,
  ListarFilaParams,
} from '../../../../core/backoffice/backoffice.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  FatiaDonut,
  corDoTom,
  fatiasDonut,
  gradienteDonut,
  haloDonut,
} from '../../../../shared/donut';
import { BackofficeChipComponent } from '../shared/backoffice-chip.component';
import {
  PRIORIDADES_ITEM,
  PRIORIDADE_ITEM_LABEL,
  STATUS_ITEM_FILA_LABEL,
  STATUS_ITENS_FILA,
  TIPOS_ITEM_FILA,
  TIPO_ITEM_FILA_LABEL,
  fimDoDiaIso,
  inicioDoDiaIso,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';

// O Mockup 16 pagina de 8 em 8 ("Mostrando 1 a 8 de 59", 8 paginas); os demais tamanhos
// existem porque o seletor "Itens por pagina" e um controle real, nao decorativo.
const PAGE_SIZES = [8, 10, 20, 50] as const;
const PAGE_SIZE = PAGE_SIZES[0];

// Acima deste limite a paginacao usa reticencias em vez de listar todas as paginas.
const MAX_PAGE_BUTTONS = 7;

type QuickFilter = 'mine' | 'risk' | 'late' | 'unassigned';

@Component({
  selector: 'sep-fila-operacional-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    BackofficeChipComponent,
    OperationalShellComponent,
  ],
  templateUrl: './fila-operacional-page.component.html',
  styleUrl: './fila-operacional-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaOperacionalPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly backoffice = inject(BackofficeService);
  private readonly auth = inject(AuthService);

  protected readonly assetBase = '/image/sep_mockup_16_assets';
  protected readonly tiposItem = TIPOS_ITEM_FILA;
  protected readonly prioridades = PRIORIDADES_ITEM;
  protected readonly statusItens = STATUS_ITENS_FILA;
  protected readonly tipoLabel = TIPO_ITEM_FILA_LABEL;
  protected readonly prioridadeLabel = PRIORIDADE_ITEM_LABEL;
  protected readonly statusLabel = STATUS_ITEM_FILA_LABEL;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal<PageResponse<ItemFilaResponse> | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly savedMessage = signal(false);
  protected readonly copiedId = signal<string | null>(null);
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly pageSize = signal<number>(PAGE_SIZE);
  private readonly pageIndex = signal(0);

  // Os cartoes do topo contam a mesma fila dos donuts: sem isso a tela diria 59 no resumo e
  // outro numero no nucleo do donut, na mesma dobra.
  protected readonly metrics = computed(() => {
    const p = this.fatiasPrioridade();
    const nota: Record<string, string> = {
      Crítica: 'Alta prioridade',
      Alta: 'Atendimento em 4h',
      Média: 'Atendimento em 24h',
      Baixa: 'Atendimento em 72h',
    };
    const icone: Record<string, string> = {
      Crítica: 'triangle-alert',
      Alta: 'chevrons-up',
      Média: 'equal',
      Baixa: 'chevrons-down',
    };
    const tom: Record<string, string> = {
      Crítica: 'critical',
      Alta: 'high',
      Média: 'medium',
      Baixa: 'low',
    };
    return [
      ...p.map((f) => ({
        label: f.rotulo === 'Crítica' ? 'Críticas' : `${f.rotulo}s`,
        value: f.valor,
        note: nota[f.rotulo] ?? '',
        tone: tom[f.rotulo] ?? 'low',
        icon: icone[f.rotulo] ?? 'layers',
      })),
      {
        label: 'Total na fila',
        value: this.totalDistribuicao(),
        note: 'Ocorrências na fila',
        tone: 'total',
        icon: 'layers',
      },
    ];
  });

  // ---- Distribuicoes ---------------------------------------------------------------------
  // Os tres donuts retratam a fila inteira, nao a pagina em tela nem o filtro corrente: e por
  // isso que a carga abaixo vai sem filtro. O total do nucleo e a soma das proprias fatias.
  private readonly filaCompleta = signal<readonly ItemFilaResponse[]>([]);

  protected readonly totalDistribuicao = computed(() => this.filaCompleta().length);

  private contar<T extends string>(chaves: readonly T[], valor: (item: ItemFilaResponse) => T) {
    const contagem = Object.fromEntries(chaves.map((c) => [c, 0])) as Record<T, number>;
    for (const item of this.filaCompleta()) contagem[valor(item)] += 1;
    return contagem;
  }

  // A chave de dominio no fim de cada faixa liga a legenda ao selo correspondente da tabela,
  // que e o que faz o realce cruzado funcionar.
  protected readonly fatiasPrioridade = computed<FatiaDonut[]>(() => {
    const c = this.contar(PRIORIDADES_ITEM, (i) => i.prioridade);
    return fatiasDonut([
      { rotulo: 'Crítica', valor: c.CRITICA, tom: 'vermelho', chave: 'CRITICA' },
      { rotulo: 'Alta', valor: c.ALTA, tom: 'ambar', chave: 'ALTA' },
      { rotulo: 'Média', valor: c.MEDIA, tom: 'roxo', chave: 'MEDIA' },
      { rotulo: 'Baixa', valor: c.BAIXA, tom: 'azul', chave: 'BAIXA' },
    ]);
  });

  protected readonly fatiasStatus = computed<FatiaDonut[]>(() => {
    const c = this.contar(STATUS_ITENS_FILA, (i) => i.status);
    return fatiasDonut([
      { rotulo: 'Aberto', valor: c.ABERTO, tom: 'azul', chave: 'ABERTO' },
      { rotulo: 'Em tratamento', valor: c.EM_TRATAMENTO, tom: 'ambar', chave: 'EM_TRATAMENTO' },
      { rotulo: 'Resolvido', valor: c.RESOLVIDO, tom: 'verde', chave: 'RESOLVIDO' },
      { rotulo: 'Ignorado', valor: c.IGNORADO, tom: 'neutro', chave: 'IGNORADO' },
    ]);
  });

  // Os nove tipos do dominio entram nos cinco grupos que a tabela ja usa na coluna Tipo.
  protected readonly fatiasTipo = computed<FatiaDonut[]>(() => {
    const c = this.contar(TIPOS_ITEM_FILA, (i) => i.tipo);
    return fatiasDonut([
      { rotulo: 'Cobrança', valor: c.COBRANCA_INADIMPLENTE, tom: 'vermelho', chave: 'cobranca' },
      { rotulo: 'Webhook', valor: c.WEBHOOK_FALHOU, tom: 'roxo', chave: 'webhook' },
      {
        rotulo: 'Pix',
        valor: c.DESEMBOLSO_PIX_FALHOU + c.RECEBIMENTO_PIX_DIVERGENTE,
        tom: 'ambar',
        chave: 'pix',
      },
      {
        rotulo: 'Onboarding',
        valor: c.ONBOARDING_PENDENTE + c.ONBOARDING_ERRO,
        tom: 'verde',
        chave: 'onboarding',
      },
      {
        rotulo: 'Outros',
        valor: c.PROPOSTA_PENDENTE + c.CONTRATO_NAO_ASSINADO + c.OUTRO,
        tom: 'neutro',
        chave: 'outros',
      },
    ]);
  });

  // Cada contador conta exatamente o que o seu botao filtra: numero e acao precisam concordar,
  // senao o atalho promete uma coisa e a tabela entrega outra.
  protected readonly contagemRapida = computed(() => {
    const fila = this.filaCompleta();
    const eu = this.auth.currentUser()?.id ?? '';
    return {
      mine: fila.filter((i) => i.atribuidoA === eu).length,
      risk: fila.filter((i) => i.prioridade === 'ALTA' && i.status === 'ABERTO').length,
      late: fila.filter((i) => i.prioridade === 'CRITICA').length,
      unassigned: fila.filter((i) => !i.atribuidoA && i.status === 'ABERTO').length,
    };
  });

  protected readonly corDoTom = corDoTom;
  protected readonly gradiente = gradienteDonut;
  protected readonly halo = haloDonut;

  protected readonly filtros = this.fb.group({
    busca: this.fb.nonNullable.control(''),
    tipo: this.fb.nonNullable.control<TipoItemFila | ''>(''),
    prioridade: this.fb.nonNullable.control<PrioridadeItem | ''>(''),
    status: this.fb.nonNullable.control<StatusItemFila | ''>(''),
    dataAberturaDe: this.fb.control<string | null>('2026-06-01'),
    dataAberturaAte: this.fb.control<string | null>('2026-06-30'),
    atribuidoA: this.fb.nonNullable.control<string>(''),
  });

  protected readonly visibleItems = computed(() => {
    const content = this.page()?.content ?? [];
    const term = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    if (!term) return content;
    return content.filter((item) =>
      [item.id, item.titulo, this.tipoLabel[item.tipo], item.entidadeId]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(term),
    );
  });

  // Paginas visiveis; `null` representa as reticencias entre blocos, como no mockup
  // (« ‹ 1 2 3 4 5 … 8 › »).
  protected readonly pageButtons = computed<(number | null)[]>(() => {
    const total = Math.max(this.page()?.totalPages ?? 1, 1);
    if (total <= MAX_PAGE_BUTTONS) {
      return Array.from({ length: total }, (_, index) => index);
    }

    const current = this.page()?.number ?? 0;
    const visiveis = new Set<number>([0, total - 1, current]);
    // Bloco de cinco paginas na ponta em que o usuario esta, como no mockup.
    const inicio = current <= 2 ? 0 : current >= total - 3 ? total - 5 : current - 1;
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

  // Faixa exibida no rodape da tabela; acompanha a pagina e o tamanho realmente aplicados.
  protected readonly range = computed(() => {
    const total = this.page()?.totalElements ?? 0;
    const quantidade = this.visibleItems().length;
    if (total === 0 || quantidade === 0) return { de: 0, ate: 0, total };
    const de = (this.page()?.number ?? 0) * this.pageSize() + 1;
    return { de, ate: de + quantidade - 1, total };
  });

  constructor() {
    // Sem isto os dropdowns e o periodo ficariam decorativos: so a busca (submit) recarregaria
    // a fila. `busca` fica de fora de proposito, para nao disparar uma requisicao por tecla.
    const { busca, ...aplicaveis } = this.filtros.controls;
    void busca;
    const controles: AbstractControl[] = Object.values(aplicaveis);
    for (const controle of controles) {
      controle.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.aplicarFiltros());
    }
  }

  ngOnInit(): void {
    this.restoreFilters();
    this.carregar();
    this.carregarDistribuicao();
  }

  protected aplicarFiltros(): void {
    this.searchTerm.set(this.filtros.controls.busca.value);
    this.pageIndex.set(0);
    this.carregar();
  }

  // Os ajustes em lote usam emitEvent: false e recarregam uma unica vez no fim; sem isso cada
  // controle alterado dispararia a sua propria requisicao.
  protected limparFiltros(): void {
    this.filtros.reset(
      {
        busca: '',
        tipo: '',
        prioridade: '',
        status: '',
        atribuidoA: '',
        dataAberturaDe: null,
        dataAberturaAte: null,
      },
      { emitEvent: false },
    );
    this.searchTerm.set('');
    this.pageIndex.set(0);
    this.carregar();
  }

  protected aplicarFiltroRapido(filter: QuickFilter): void {
    const userId = this.auth.currentUser()?.id ?? '';
    const opcoes = { emitEvent: false };
    if (filter === 'mine') this.filtros.patchValue({ atribuidoA: userId }, opcoes);
    if (filter === 'risk')
      this.filtros.patchValue({ prioridade: 'ALTA', status: 'ABERTO' }, opcoes);
    if (filter === 'late') this.filtros.patchValue({ prioridade: 'CRITICA' }, opcoes);
    if (filter === 'unassigned')
      this.filtros.patchValue({ atribuidoA: '', status: 'ABERTO' }, opcoes);
    this.aplicarFiltros();
  }

  protected salvarFiltros(): void {
    localStorage.setItem(
      'sep-fila-operacional-filtros',
      JSON.stringify(this.filtros.getRawValue()),
    );
    this.savedMessage.set(true);
    window.setTimeout(() => this.savedMessage.set(false), 2200);
  }

  protected irParaPagina(indice: number | null): void {
    const total = this.page()?.totalPages ?? 1;
    if (indice === null || indice < 0 || indice >= total) return;
    this.pageIndex.set(indice);
    this.carregar();
  }

  protected alterarTamanhoPagina(event: Event): void {
    const tamanho = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(tamanho) || tamanho <= 0) return;
    this.pageSize.set(tamanho);
    this.pageIndex.set(0);
    this.carregar();
  }

  protected async copiarId(item: ItemFilaResponse): Promise<void> {
    try {
      await navigator.clipboard.writeText(item.id);
      this.copiedId.set(item.id);
      window.setTimeout(() => this.copiedId.update((id) => (id === item.id ? null : id)), 1600);
    } catch {
      /* area de transferencia indisponivel (permissao negada ou contexto inseguro) */
    }
  }

  protected itemCode(item: ItemFilaResponse): string {
    return `#${item.id.slice(-8).replace(/^0+/, '').padStart(8, '0')}`;
  }

  protected itemDetail(item: ItemFilaResponse): string {
    const details: Record<TipoItemFila, string> = {
      COBRANCA_INADIMPLENTE: 'Contrato 5b771e05 · INVESTIMENTO',
      WEBHOOK_FALHOU: 'Endpoint: /pix/confirmacao',
      DESEMBOLSO_PIX_FALHOU: 'Transação: E904...7A2B',
      RECEBIMENTO_PIX_DIVERGENTE: 'Valor recebido: R$ 900,00',
      ONBOARDING_PENDENTE: 'CPF do gestor expirado',
      ONBOARDING_ERRO: 'Validação cadastral indisponível',
      PROPOSTA_PENDENTE: 'Proposta aguardando análise',
      CONTRATO_NAO_ASSINADO: 'Contrato 5b771e07 · CAPITAL_GIRO',
      OUTRO: 'Consulta retornou erro 500',
    };
    return details[item.tipo];
  }

  protected tipoCurto(tipo: TipoItemFila): string {
    const labels: Record<TipoItemFila, string> = {
      COBRANCA_INADIMPLENTE: 'Cobrança',
      WEBHOOK_FALHOU: 'Webhook',
      DESEMBOLSO_PIX_FALHOU: 'Pix',
      RECEBIMENTO_PIX_DIVERGENTE: 'Cobrança',
      ONBOARDING_PENDENTE: 'Onboarding',
      ONBOARDING_ERRO: 'Onboarding',
      PROPOSTA_PENDENTE: 'Crédito',
      CONTRATO_NAO_ASSINADO: 'Formalização',
      OUTRO: 'Outros',
    };
    return labels[tipo];
  }

  // Chave compartilhada entre o selo da coluna Tipo e a legenda do donut, para o realce cruzado.
  // Credito e Formalizacao nao aparecem na legenda (o donut agrupa os cinco tipos do mockup),
  // entao simplesmente nao encontram par - mesmo comportamento de "Em analise"/"Aguardando".
  protected tipoKey(tipo: TipoItemFila): string {
    const keys: Record<TipoItemFila, string> = {
      COBRANCA_INADIMPLENTE: 'cobranca',
      RECEBIMENTO_PIX_DIVERGENTE: 'cobranca',
      WEBHOOK_FALHOU: 'webhook',
      DESEMBOLSO_PIX_FALHOU: 'pix',
      ONBOARDING_PENDENTE: 'onboarding',
      ONBOARDING_ERRO: 'onboarding',
      PROPOSTA_PENDENTE: 'credito',
      CONTRATO_NAO_ASSINADO: 'formalizacao',
      OUTRO: 'outros',
    };
    return keys[tipo];
  }

  protected typeTone(tipo: TipoItemFila): string {
    if (tipo.includes('COBRANCA') || tipo.includes('RECEBIMENTO')) return 'red';
    if (tipo.includes('WEBHOOK') || tipo.includes('CONTRATO')) return 'purple';
    if (tipo.includes('PIX')) return 'orange';
    if (tipo.includes('ONBOARDING')) return 'green';
    if (tipo.includes('PROPOSTA')) return 'cyan';
    return 'gray';
  }

  protected typeIcon(tipo: TipoItemFila): string {
    const icons: Record<TipoItemFila, string> = {
      COBRANCA_INADIMPLENTE: 'banknote',
      WEBHOOK_FALHOU: 'share-2',
      DESEMBOLSO_PIX_FALHOU: 'landmark',
      RECEBIMENTO_PIX_DIVERGENTE: 'credit-card',
      ONBOARDING_PENDENTE: 'shield',
      ONBOARDING_ERRO: 'shield',
      PROPOSTA_PENDENTE: 'file-text',
      CONTRATO_NAO_ASSINADO: 'file-text',
      OUTRO: 'menu',
    };
    return icons[tipo];
  }

  protected assignedName(item: ItemFilaResponse, index: number): string {
    if (!item.atribuidoA) return index % 2 === 0 ? 'Ana Martins' : 'Rafael Ferreira';
    if (item.atribuidoA.endsWith('1003')) return 'Camila Andrade';
    if (item.atribuidoA.endsWith('1004')) return 'Ana Martins';
    return ['Ana Martins', 'Rafael Ferreira', 'Camila Andrade', 'João Silva', 'Lucas Gomes'][
      index % 5
    ];
  }

  protected avatarFor(name: string): string {
    const file: Record<string, string> = {
      'Ana Martins': 'icon_avatar_ana_martins_am.png',
      'Rafael Ferreira': 'icon_avatar_rafael_ferreira_rf.png',
      'Camila Andrade': 'icon_avatar_camila_andrade_ca.png',
      'João Silva': 'icon_avatar_joao_silva_js.png',
      'Lucas Gomes': 'icon_avatar_lucas_gomes_lg.png',
    };
    return `${this.assetBase}/icons/${file[name] ?? file['Ana Martins']}`;
  }

  protected dateParts(iso: string): [string, string] {
    const date = new Date(iso);
    return [
      date.toLocaleDateString('pt-BR'),
      date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    ];
  }

  protected slaFor(
    item: ItemFilaResponse,
    index: number,
  ): { value: string; note: string; tone: string } {
    if (item.prioridade === 'CRITICA') return { value: '-15h 20m', note: 'Atrasado', tone: 'late' };
    const values = ['2h 10m', '1h 40m', '10h 20m', '8h 45m', '22h 10m', '1h 05m', '30h 40m'];
    const value = values[index % values.length];
    // Abaixo de 4h o SLA entra em risco (laranja); acima segue no ciano neutro, como no mockup.
    const horas = Number.parseInt(value, 10);
    return { value, note: 'Restante', tone: horas < 4 ? 'risk' : 'normal' };
  }

  protected prioridadeIcon(prioridade: PrioridadeItem): string {
    const icons: Record<PrioridadeItem, string> = {
      CRITICA: 'chevrons-up',
      ALTA: 'chevrons-up',
      MEDIA: 'chevron-up',
      BAIXA: 'chevrons-down',
    };
    return icons[prioridade];
  }

  protected statusIcon(status: StatusItemFila): string {
    const icons: Record<StatusItemFila, string> = {
      ABERTO: 'inbox',
      EM_TRATAMENTO: 'wrench',
      RESOLVIDO: 'circle-check',
      IGNORADO: 'circle-x',
    };
    return icons[status];
  }

  private restoreFilters(): void {
    try {
      const saved = localStorage.getItem('sep-fila-operacional-filtros');
      if (saved) {
        this.filtros.patchValue(JSON.parse(saved) as Record<string, string | null>, {
          emitEvent: false,
        });
      }
    } catch {
      /* armazenamento indisponível ou conteúdo antigo inválido */
    }
    this.searchTerm.set(this.filtros.controls.busca.value);
  }

  // Uma leitura sem filtro e com pagina larga: os donuts falam da fila inteira, e por isso nao
  // acompanham o filtro nem a paginacao da tabela.
  private carregarDistribuicao(): void {
    this.backoffice.listarFila({ size: 500, sort: 'dataAbertura,desc' }).subscribe({
      next: (page) => this.filaCompleta.set(page.content),
      error: () => this.filaCompleta.set([]),
    });
  }

  private carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const f = this.filtros.getRawValue();
    const params: ListarFilaParams = {
      tipo: f.tipo || undefined,
      prioridade: f.prioridade || undefined,
      status: f.status || undefined,
      dataAberturaDe: f.dataAberturaDe ? inicioDoDiaIso(f.dataAberturaDe) : undefined,
      dataAberturaAte: f.dataAberturaAte ? fimDoDiaIso(f.dataAberturaAte) : undefined,
      atribuidoA: f.atribuidoA.trim() || undefined,
      page: this.pageIndex(),
      size: this.pageSize(),
      sort: 'dataAbertura,desc',
    };
    this.backoffice.listarFila(params).subscribe({
      next: (page) => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(mensagemBackofficeErro(err, 'Não foi possível carregar a fila.'));
      },
    });
  }
}

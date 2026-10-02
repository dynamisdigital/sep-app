import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PropostaResponse, StatusProposta, TipoOperacao } from '../../../../core/api/api.models';
import { CreditoService } from '../../../../core/credito/credito.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { mensagemCreditoErro } from '../shared/credito-error';
import { LIMITE_MAXIMO_CREDITO } from '../shared/credito-limite';
import { formatarDuracao, formatarPercentual } from '../../../../core/format/br-format';
import { formatarData, formatarMoeda, idCurto } from '../shared/credito-format';
import { PropostaStatusComponent } from '../shared/proposta-status.component';

interface ProposalMetric {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: 'green' | 'blue' | 'amber';
  percent?: string;
  percentValue?: number;
  action: string;
  // Sem status, o botao abre o painel do limite; com status, filtra a tabela por ele.
  status?: StatusProposta;
}

const STATUS_CONSULTA: readonly StatusProposta[] = [
  'EM_ANALISE',
  'PRE_APROVADA',
  'APROVADA',
  'PENDENCIA',
  'REJEITADA',
];

interface SummaryMetric {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: 'blue' | 'green';
}

@Component({
  selector: 'sep-propostas-list-page',
  imports: [
    FormsModule,
    LucideAngularModule,
    OperationalShellComponent,
    PropostaStatusComponent,
    RouterLink,
  ],
  templateUrl: './propostas-list-page.component.html',
  styleUrl: './propostas-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostasListPageComponent implements OnInit {
  private readonly credito = inject(CreditoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly assetBase = '/image/sep_mockup_10_assets_v3_centro_expandido_final';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly propostas = signal<PropostaResponse[]>([]);
  protected readonly busca = signal('');
  protected readonly statusFiltro = signal<StatusProposta | ''>('');
  protected readonly tipoFiltro = signal<TipoOperacao | ''>('');
  protected readonly dataInicial = signal('');
  protected readonly dataFinal = signal('');
  protected readonly valoresOcultos = signal<ReadonlySet<string>>(new Set());

  protected readonly limiteAberto = signal(false);

  // Os cartoes eram constantes ("3 aprovadas") que nao batiam com a tabela: ao filtrar por
  // eles a lista mostrava outra quantidade. Agora saem das propostas carregadas.
  protected readonly metrics = computed<ProposalMetric[]>(() => {
    const todas = this.propostas();
    const recorte = (status: StatusProposta) => {
      const lista = todas.filter((p) => p.status === status);
      const percentual = todas.length ? (lista.length / todas.length) * 100 : 0;
      return {
        value: String(lista.length),
        detail: `Valor total: ${formatarMoeda(this.soma(lista), 'BRL')}`,
        percent: `${percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
        percentValue: percentual,
        status,
      };
    };
    return [
      {
        label: 'Limite pré-aprovado',
        value: formatarMoeda(LIMITE_MAXIMO_CREDITO, 'BRL'),
        detail: 'Sujeito a análise final',
        icon: 'wallet',
        tone: 'green',
        action: 'Ver detalhes do limite',
      },
      {
        label: 'Propostas em análise',
        icon: 'file-search',
        tone: 'blue',
        action: 'Acompanhar',
        ...recorte('EM_ANALISE'),
      },
      {
        label: 'Propostas aprovadas',
        icon: 'file-check',
        tone: 'green',
        action: 'Ver aprovadas',
        ...recorte('APROVADA'),
      },
      {
        label: 'Propostas pendentes',
        icon: 'file-clock',
        tone: 'amber',
        action: 'Ver pendentes',
        ...recorte('PENDENCIA'),
      },
    ];
  });

  // Painel do limite: o teto vem do regimento; o resto e a soma do que ja esta na esteira.
  protected readonly limite = computed(() => {
    const todas = this.propostas();
    const somaDe = (...status: StatusProposta[]) =>
      this.soma(todas.filter((p) => status.includes(p.status)));
    return {
      teto: LIMITE_MAXIMO_CREDITO,
      emAnalise: somaDe('EM_ANALISE', 'PENDENCIA'),
      aprovado: somaDe('PRE_APROVADA', 'APROVADA'),
      maiorSolicitacao: todas.reduce((maior, p) => Math.max(maior, p.valorSolicitado), 0),
    };
  });

  // Os quatro indicadores do pe da tela saem das propostas carregadas, como os cartoes do topo. Eram
  // constantes do mockup ("71,4%", "Em 12 propostas") que nao fechavam com a propria tabela. Sem
  // proposta decidida, o valor e travessao: melhor nada do que um numero que nao existe.
  protected readonly summaries = computed<SummaryMetric[]>(() => {
    const todas = this.propostas();
    const aprovadas = todas.filter((p) => p.status === 'APROVADA');
    // "Decidida" e aprovada ou reprovada; pre-aprovada ainda depende de conferencia.
    const decididas = todas.filter((p) => p.status === 'APROVADA' || p.status === 'REJEITADA');
    const duracoes = decididas
      .map((p) => Date.parse(p.dataModificacao) - Date.parse(p.dataCriacao))
      .filter((ms) => ms > 0);
    const total = this.soma(aprovadas);
    const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

    return [
      {
        label: 'Tempo médio de análise',
        value: duracoes.length
          ? formatarDuracao(duracoes.reduce((t, ms) => t + ms, 0) / duracoes.length)
          : '—',
        detail: duracoes.length
          ? `Em ${plural(duracoes.length, 'proposta decidida', 'propostas decididas')}`
          : 'Sem proposta decidida',
        icon: 'timer',
        tone: 'blue',
      },
      {
        label: 'Taxa de aprovação',
        value: decididas.length ? formatarPercentual(aprovadas.length / decididas.length, 1) : '—',
        detail: decididas.length
          ? `${aprovadas.length} de ${plural(decididas.length, 'decidida', 'decididas')}`
          : 'Sem proposta decidida',
        icon: 'percent',
        tone: 'green',
      },
      {
        label: 'Valor médio aprovado',
        value: aprovadas.length ? formatarMoeda(total / aprovadas.length, 'BRL') : '—',
        detail: aprovadas.length
          ? `Em ${plural(aprovadas.length, 'proposta aprovada', 'propostas aprovadas')}`
          : 'Nenhuma aprovada',
        icon: 'chart-column',
        tone: 'green',
      },
      {
        label: 'Total aprovado',
        value: formatarMoeda(total, 'BRL'),
        detail: aprovadas.length ? 'Soma das propostas aprovadas' : 'Nenhuma aprovada',
        icon: 'circle-dollar-sign',
        tone: 'green',
      },
    ];
  });

  protected readonly propostasFiltradas = computed(() => {
    const termo = this.busca().trim().toLocaleLowerCase('pt-BR');
    const inicio = this.dataInicial();
    const fim = this.dataFinal();
    return this.propostas().filter((proposta) => {
      const texto =
        `${proposta.id} ${proposta.tipoOperacao} ${proposta.valorSolicitado}`.toLocaleLowerCase(
          'pt-BR',
        );
      const data = proposta.dataCriacao.slice(0, 10);
      return (
        (!termo || texto.includes(termo)) &&
        (!this.statusFiltro() || proposta.status === this.statusFiltro()) &&
        (!this.tipoFiltro() || proposta.tipoOperacao === this.tipoFiltro()) &&
        (!inicio || data >= inicio) &&
        (!fim || data <= fim)
      );
    });
  });

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    // `?status=` permite chegar ja filtrado vindo de outra tela.
    const status = this.route.snapshot.queryParamMap.get('status') as StatusProposta | null;
    if (status && STATUS_CONSULTA.includes(status)) this.statusFiltro.set(status);
    this.carregar();
  }

  /** Acao dos cartoes: filtra a tabela pelo status do cartao, ou abre o painel do limite. */
  protected acionarCartao(metric: ProposalMetric): void {
    if (!metric.status) {
      this.limiteAberto.set(true);
      // O foco vai para o painel, para o Esc e o leitor de tela o alcancarem.
      setTimeout(() => this.document.querySelector<HTMLElement>('.limit-close')?.focus());
      return;
    }
    this.statusFiltro.set(metric.status);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: metric.status },
      replaceUrl: true,
    });
    this.mostrarTabela();
  }

  protected fecharLimite(): void {
    this.limiteAberto.set(false);
  }

  /**
   * Leva a tabela filtrada para a vista. Nao usa `scrollIntoView`: ele rola tambem os containers
   * `overflow: hidden` do shell, e o cabecalho saia da tela com o rodape subindo para o meio.
   * Aqui so o primeiro ancestral que rola de verdade se move, e so se a tabela estiver fora.
   */
  private mostrarTabela(): void {
    const tabela = this.document.getElementById('lista-propostas');
    let rolavel = tabela?.parentElement ?? null;
    while (rolavel) {
      const { overflowY } = getComputedStyle(rolavel);
      if (/(auto|scroll)/.test(overflowY) && rolavel.scrollHeight > rolavel.clientHeight) break;
      rolavel = rolavel.parentElement;
    }
    if (!tabela || !rolavel) return;
    const topo = tabela.getBoundingClientRect().top - rolavel.getBoundingClientRect().top;
    if (topo >= 0 && topo < rolavel.clientHeight * 0.6) return;
    rolavel.scrollTo?.({ top: rolavel.scrollTop + topo - 16, behavior: 'smooth' });
  }

  private soma(lista: readonly PropostaResponse[]): number {
    return lista.reduce((total, p) => total + p.valorSolicitado, 0);
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credito.listarPropostas().subscribe({
      next: (page) => {
        this.propostas.set(page.content);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(mensagemCreditoErro(err, 'Não foi possível carregar as propostas.'));
        this.loading.set(false);
      },
    });
  }

  protected limparFiltros(): void {
    this.busca.set('');
    this.statusFiltro.set('');
    this.tipoFiltro.set('');
    this.dataInicial.set('');
    this.dataFinal.set('');
  }

  protected tipoLabel(tipo: TipoOperacao): string {
    return tipo.replaceAll('_', ' ');
  }

  protected abrirCalendario(input: HTMLInputElement): void {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
  }

  protected alternarValor(propostaId: string): void {
    this.valoresOcultos.update((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(propostaId)) {
        proximos.delete(propostaId);
      } else {
        proximos.add(propostaId);
      }
      return proximos;
    });
  }
}

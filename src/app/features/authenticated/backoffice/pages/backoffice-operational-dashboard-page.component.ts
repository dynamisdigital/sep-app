import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { BackofficeDashboardPageComponent } from './backoffice-dashboard-page.component';
import {
  ItemFilaResponse,
  PropostaResponse,
  StatusProposta,
} from '../../../../core/api/api.models';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { CreditoService } from '../../../../core/credito/credito.service';
import { formatarCelulaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import {
  FatiaDonut,
  corDoTom,
  fatiasDonut,
  gradienteDonut,
  haloDonut,
} from '../../../../shared/donut';
import { PRIORIDADES_ITEM, STATUS_ITENS_FILA, TIPOS_ITEM_FILA } from '../shared/backoffice-format';

@Component({
  selector: 'sep-backoffice-operational-dashboard-page',
  imports: [OperationalShellComponent, RouterLink, LucideAngularModule],
  templateUrl: './backoffice-operational-dashboard-page.component.html',
  styleUrl: './backoffice-operational-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeOperationalDashboardPageComponent
  extends BackofficeDashboardPageComponent
  implements OnInit
{
  private readonly backofficeApi = inject(BackofficeService);
  private readonly credito = inject(CreditoService);

  protected readonly mockupAssetBase = '/image/sep_mockup_15_assets';
  protected selectedPeriod = 'Últimos 30 dias';

  protected onPeriodChange(event: Event): void {
    this.selectedPeriod = (event.target as HTMLSelectElement).value;
  }

  protected exportReport(): void {
    const rows = [
      ['Dashboard operacional', this.selectedPeriod],
      ['Indicador', 'Resultado', 'Variação'],
      ...this.operationalMetrics().map((metric) => [metric[0], metric[1], metric[2]]),
      [],
      ['Ocorrências críticas recentes'],
      ['ID', 'Tipo', 'Descrição', 'Aberto em', 'Atribuído a', 'Status'],
      ...this.critical.map((row) => row.slice(0, 6)),
    ];
    const csv = rows
      .map((row) => row.map((value) => formatarCelulaCsv(value)).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dashboard-operacional.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // Os dois ultimos cartoes contam a mesma fila e as mesmas propostas dos donuts logo abaixo;
  // por isso sao computados, e nao escritos. Os tres primeiros ainda vem do desenho do mockup.
  protected readonly operationalMetrics = computed(() => [
    [
      'Recebimentos (30d)',
      'R$ 18.450,75',
      '▲ 12,4%',
      'cyan',
      'users',
      '0,29 18,28 35,25 52,28 69,27 86,31 103,28 120,16 137,27 154,26 171,18 190,23',
    ],
    [
      'Inadimplência total',
      'R$ 92.000,00',
      '▲ 8,7%',
      'purple',
      'calendar',
      '0,31 18,30 36,28 54,27 72,29 90,28 108,30 126,26 144,20 160,24 176,16 190,21',
    ],
    [
      'Tempo médio de resolução',
      '2h 08min',
      '▼ 15,3%',
      'amber',
      'settings',
      '0,31 17,29 34,27 51,25 68,29 85,25 102,30 119,22 136,27 151,17 166,24 178,14 190,20',
    ],
    [
      'Críticos abertos',
      String(this.criticosAbertos()),
      '▼ 33,3%',
      'red',
      'shield',
      '0,30 18,28 36,25 54,29 72,27 90,30 108,22 126,28 143,17 158,24 174,15 190,21',
    ],
    [
      'Propostas em análise',
      String(this.propostasEmAnalise()),
      '▲ 33,3%',
      'green',
      'briefcase',
      '0,30 19,29 38,27 57,25 76,29 95,31 114,26 133,17 150,27 166,14 180,23 190,17',
    ],
  ]);
  // ---- Distribuicoes -----------------------------------------------------------------------
  // Os quatro donuts desta tela mostram a fila e as propostas como elas estao: nada aqui e
  // desenho. A carga vai sem filtro porque o painel e a visao geral da operacao.
  private readonly fila = signal<readonly ItemFilaResponse[]>([]);
  private readonly propostas = signal<readonly PropostaResponse[]>([]);

  protected readonly totalFila = computed(() => this.fila().length);
  protected readonly totalPropostas = computed(() => this.propostas().length);

  private contarFila<T extends string>(
    chaves: readonly T[],
    valor: (item: ItemFilaResponse) => T,
  ): Record<T, number> {
    const contagem = Object.fromEntries(chaves.map((c) => [c, 0])) as Record<T, number>;
    for (const item of this.fila()) contagem[valor(item)] += 1;
    return contagem;
  }

  protected readonly fatiasStatus = computed<FatiaDonut[]>(() => {
    const c = this.contarFila(STATUS_ITENS_FILA, (i) => i.status);
    return fatiasDonut([
      { rotulo: 'Aberto', valor: c.ABERTO, tom: 'azul', chave: 'ABERTO' },
      { rotulo: 'Em tratamento', valor: c.EM_TRATAMENTO, tom: 'ambar', chave: 'EM_TRATAMENTO' },
      { rotulo: 'Resolvido', valor: c.RESOLVIDO, tom: 'verde', chave: 'RESOLVIDO' },
      { rotulo: 'Ignorado', valor: c.IGNORADO, tom: 'neutro', chave: 'IGNORADO' },
    ]);
  });

  protected readonly fatiasPrioridade = computed<FatiaDonut[]>(() => {
    const c = this.contarFila(PRIORIDADES_ITEM, (i) => i.prioridade);
    return fatiasDonut([
      { rotulo: 'Crítica', valor: c.CRITICA, tom: 'vermelho', chave: 'CRITICA' },
      { rotulo: 'Alta', valor: c.ALTA, tom: 'ambar', chave: 'ALTA' },
      { rotulo: 'Média', valor: c.MEDIA, tom: 'roxo', chave: 'MEDIA' },
      { rotulo: 'Baixa', valor: c.BAIXA, tom: 'azul', chave: 'BAIXA' },
    ]);
  });

  protected readonly fatiasTipo = computed<FatiaDonut[]>(() => {
    const c = this.contarFila(TIPOS_ITEM_FILA, (i) => i.tipo);
    return fatiasDonut([
      {
        rotulo: 'Webhook falhou',
        valor: c.WEBHOOK_FALHOU,
        tom: 'roxo',
        chave: 'WEBHOOK_FALHOU',
      },
      {
        rotulo: 'Cobrança inadimplente',
        valor: c.COBRANCA_INADIMPLENTE,
        tom: 'ambar',
        chave: 'COBRANCA_INADIMPLENTE',
      },
      {
        rotulo: 'Desembolso Pix falhou',
        valor: c.DESEMBOLSO_PIX_FALHOU,
        tom: 'vermelho',
        chave: 'DESEMBOLSO_PIX_FALHOU',
      },
      {
        rotulo: 'Onboarding pendente',
        valor: c.ONBOARDING_PENDENTE,
        tom: 'azul',
        chave: 'ONBOARDING_PENDENTE',
      },
      {
        rotulo: 'Outros',
        valor:
          c.ONBOARDING_ERRO +
          c.PROPOSTA_PENDENTE +
          c.CONTRATO_NAO_ASSINADO +
          c.RECEBIMENTO_PIX_DIVERGENTE +
          c.OUTRO,
        tom: 'neutro',
        chave: null,
      },
    ]);
  });

  protected readonly fatiasPropostas = computed<FatiaDonut[]>(() => {
    const lista = this.propostas();
    const conta = (status: StatusProposta) => lista.filter((p) => p.status === status).length;
    return fatiasDonut([
      { rotulo: 'Em análise', valor: conta('EM_ANALISE') + conta('PENDENCIA'), tom: 'azul' },
      { rotulo: 'Aprovadas', valor: conta('APROVADA') + conta('PRE_APROVADA'), tom: 'verde' },
      { rotulo: 'Reprovadas', valor: conta('REJEITADA'), tom: 'vermelho' },
    ]);
  });

  // A lista "Top 5 tipos mais frequentes" e a mesma contagem do donut de tipo, ordenada.
  protected readonly topTiposFila = computed(() =>
    this.fatiasTipo()
      .filter((fatia) => fatia.valor > 0)
      .slice()
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5),
  );

  protected readonly propostasEmAnalise = computed(
    () => this.propostas().filter((p) => p.status === 'EM_ANALISE').length,
  );

  protected readonly criticosAbertos = computed(
    () => this.fila().filter((i) => i.prioridade === 'CRITICA' && i.status !== 'RESOLVIDO').length,
  );

  protected readonly corDoTom = corDoTom;
  protected readonly gradiente = gradienteDonut;
  protected readonly halo = haloDonut;

  ngOnInit(): void {
    this.backofficeApi.listarFila({ size: 500, sort: 'dataAbertura,desc' }).subscribe({
      next: (page) => this.fila.set(page.content),
      error: () => this.fila.set([]),
    });
    this.credito.listarPropostas({ size: 500 }).subscribe({
      next: (page) => this.propostas.set(page.content),
      error: () => this.propostas.set([]),
    });
  }

  protected readonly evolutionBluePoints = [
    [0, 99],
    [18, 82],
    [36, 88],
    [54, 69],
    [72, 52],
    [90, 44],
    [108, 48],
    [126, 56],
    [144, 61],
    [162, 50],
    [180, 56],
    [198, 42],
    [216, 31],
    [234, 43],
    [252, 53],
    [270, 58],
    [288, 48],
    [306, 29],
    [324, 40],
    [342, 55],
    [360, 59],
    [378, 49],
    [396, 30],
    [420, 12],
  ];
  protected readonly evolutionGreenPoints = [
    [0, 116],
    [18, 102],
    [36, 111],
    [54, 95],
    [72, 105],
    [90, 91],
    [108, 96],
    [126, 101],
    [144, 99],
    [162, 106],
    [180, 99],
    [198, 82],
    [216, 75],
    [234, 87],
    [252, 92],
    [270, 87],
    [288, 76],
    [306, 83],
    [324, 96],
    [342, 102],
    [360, 95],
    [378, 87],
    [396, 82],
    [420, 70],
  ];
  protected readonly ranking = [
    ['AM', 'Ana Martins', 7, 100],
    ['RF', 'Rafael Ferreira', 5, 72],
    ['CA', 'Camila Andrade', 4, 57],
    ['JS', 'João Silva', 3, 43],
    ['LG', 'Lucas Gomes', 2, 29],
  ];
  protected readonly critical = [
    [
      '5b771e05',
      'Cobrança',
      'Parcela inadimplente há 35 dias',
      '05/06/2026 11:30',
      'Ana Martins',
      'Em tratamento',
      'c0000000-0000-4000-8000-000000000002',
    ],
    [
      '5b771e03',
      'Webhook',
      'Webhook falhou no processamento',
      '06/06/2026 09:00',
      'Rafael Ferreira',
      'Aberto',
      'c0000000-0000-4000-8000-000000000001',
    ],
    [
      '5b771e09',
      'Pix',
      'Desembolso Pix retornou falha',
      '06/06/2026 10:20',
      'Camila Andrade',
      'Aberto',
      'c0000000-0000-4000-8000-000000000005',
    ],
  ];
  protected readonly operationalIndicators = [
    ['Taxa de resolução no prazo (SLA)', '91,2%', 'Meta: 90%', 'purple', 'circle-check', 91],
    ['Reabertura de itens resolvidos', '6,8%', 'Meta: < 10%', 'amber', 'clock', 68],
    ['Itens aguardando atendimento', '9', 'Meta: < 15', 'cyan', 'user-check', 60],
  ];
}

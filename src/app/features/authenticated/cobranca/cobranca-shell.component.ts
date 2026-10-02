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

import { RenegociacaoResponse, StatusRenegociacao } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { CobrancaService } from '../../../core/cobranca/cobranca.service';
import { gerarLinhaCsv } from '../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';

import {
  FaixaDonut,
  corDoTom,
  fatiasDonut,
  gradienteDonut,
  haloDonut,
} from '../../../shared/donut';

type ContractStatus = 'EM_DIA' | 'ATRASADO';
type InstallmentStatus = 'PAGA' | 'PENDENTE' | 'ATRASADA' | 'AGENDADA';

// `id` é o identificador curto exibido; `agendaId` é o UUID real do contrato usado na rota da
// agenda, no mesmo padrão já homologado de "UUID real na rota, id curto na tela". Sem ele o
// link levava o id curto para a URL e a agenda abria vazia.
interface ContractCard {
  id: string;
  agendaId?: string;
  operation: string;
  contracted: number;
  open: number;
  status: ContractStatus;
}

interface InstallmentRow {
  contractId: string;
  number: string;
  dueDate: string;
  dueIso: string;
  value: number;
  status: InstallmentStatus;
  overdueDays: number | null;
}

@Component({
  selector: 'sep-cobranca-shell',
  imports: [LucideAngularModule, OperationalShellComponent, RouterLink],
  templateUrl: './cobranca-shell.component.html',
  styleUrl: './cobranca-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CobrancaShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly cobranca = inject(CobrancaService);
  private advancedFiltersTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly assetBase = '/image/sep_mockup_14_assets';
  protected readonly currentUser = this.auth.currentUser;
  protected readonly selectedContractId = signal('5b771c05');
  protected readonly contractStatus = signal('TODOS');
  protected readonly installmentStatus = signal('TODOS');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly sensitiveValuesVisible = signal(true);
  protected readonly advancedFiltersVisible = signal(false);
  protected readonly journeyConfigured = signal(false);
  protected readonly hiddenInstallmentValues = signal<ReadonlySet<string>>(new Set());
  // Mesma data de referencia da carteira do mock: e a partir dela que "proximo
  // vencimento" e os dias de atraso das parcelas fazem sentido.
  protected readonly referenceDateIso = '2026-05-30';

  protected readonly isTomador = computed(() => this.currentUser()?.role === 'CLIENTE');
  protected readonly canViewDashboard = computed(() => !this.isTomador());

  // Carteira canonica da base ficticia: os mesmos quatro contratos que o mock devolve, com
  // prazo e valor de parcela coerentes com o contratado. `agendaId` e o UUID real usado na
  // rota da agenda do contrato (Mockup 32); o id curto e o que a tela mostra.
  protected readonly contracts: ContractCard[] = [
    {
      id: '5b771c03',
      agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c03',
      operation: 'CAPITAL_GIRO',
      contracted: 1250,
      open: 250,
      status: 'EM_DIA',
    },
    {
      id: '5b771c05',
      agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03',
      operation: 'INVESTIMENTO',
      contracted: 3125,
      open: 937.5,
      status: 'ATRASADO',
    },
    {
      id: '5b771c06',
      agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c06',
      operation: 'REFINANCIAMENTO',
      contracted: 4625,
      open: 1850,
      status: 'ATRASADO',
    },
    {
      id: '5b771c08',
      agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c08',
      operation: 'CAPITAL_GIRO',
      contracted: 6000,
      open: 1200,
      status: 'EM_DIA',
    },
  ];

  // Todas as parcelas dos quatro contratos, geradas da mesma carteira do mock.
  protected readonly installments: InstallmentRow[] = [
    {
      contractId: '5b771c03',
      number: '1/10',
      dueDate: '20/10/2025',
      dueIso: '2025-10-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '2/10',
      dueDate: '20/11/2025',
      dueIso: '2025-11-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '3/10',
      dueDate: '20/12/2025',
      dueIso: '2025-12-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '4/10',
      dueDate: '20/01/2026',
      dueIso: '2026-01-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '5/10',
      dueDate: '20/02/2026',
      dueIso: '2026-02-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '6/10',
      dueDate: '20/03/2026',
      dueIso: '2026-03-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '7/10',
      dueDate: '20/04/2026',
      dueIso: '2026-04-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '8/10',
      dueDate: '20/05/2026',
      dueIso: '2026-05-20',
      value: 125,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '9/10',
      dueDate: '20/06/2026',
      dueIso: '2026-06-20',
      value: 125,
      status: 'PENDENTE',
      overdueDays: null,
    },
    {
      contractId: '5b771c03',
      number: '10/10',
      dueDate: '20/07/2026',
      dueIso: '2026-07-20',
      value: 125,
      status: 'AGENDADA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '1/10',
      dueDate: '05/09/2025',
      dueIso: '2025-09-05',
      value: 312.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '2/10',
      dueDate: '05/10/2025',
      dueIso: '2025-10-05',
      value: 312.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '3/10',
      dueDate: '05/11/2025',
      dueIso: '2025-11-05',
      value: 312.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '4/10',
      dueDate: '05/12/2025',
      dueIso: '2025-12-05',
      value: 312.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '5/10',
      dueDate: '05/01/2026',
      dueIso: '2026-01-05',
      value: 312.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '6/10',
      dueDate: '05/02/2026',
      dueIso: '2026-02-05',
      value: 312.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '7/10',
      dueDate: '05/03/2026',
      dueIso: '2026-03-05',
      value: 312.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c05',
      number: '8/10',
      dueDate: '05/04/2026',
      dueIso: '2026-04-05',
      value: 312.5,
      status: 'ATRASADA',
      overdueDays: 55,
    },
    {
      contractId: '5b771c05',
      number: '9/10',
      dueDate: '05/05/2026',
      dueIso: '2026-05-05',
      value: 312.5,
      status: 'ATRASADA',
      overdueDays: 25,
    },
    {
      contractId: '5b771c05',
      number: '10/10',
      dueDate: '05/06/2026',
      dueIso: '2026-06-05',
      value: 312.5,
      status: 'AGENDADA',
      overdueDays: null,
    },
    {
      contractId: '5b771c06',
      number: '1/10',
      dueDate: '15/09/2025',
      dueIso: '2025-09-15',
      value: 462.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c06',
      number: '2/10',
      dueDate: '15/10/2025',
      dueIso: '2025-10-15',
      value: 462.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c06',
      number: '3/10',
      dueDate: '15/11/2025',
      dueIso: '2025-11-15',
      value: 462.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c06',
      number: '4/10',
      dueDate: '15/12/2025',
      dueIso: '2025-12-15',
      value: 462.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c06',
      number: '5/10',
      dueDate: '15/01/2026',
      dueIso: '2026-01-15',
      value: 462.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c06',
      number: '6/10',
      dueDate: '15/02/2026',
      dueIso: '2026-02-15',
      value: 462.5,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c06',
      number: '7/10',
      dueDate: '15/03/2026',
      dueIso: '2026-03-15',
      value: 462.5,
      status: 'ATRASADA',
      overdueDays: 76,
    },
    {
      contractId: '5b771c06',
      number: '8/10',
      dueDate: '15/04/2026',
      dueIso: '2026-04-15',
      value: 462.5,
      status: 'ATRASADA',
      overdueDays: 45,
    },
    {
      contractId: '5b771c06',
      number: '9/10',
      dueDate: '15/05/2026',
      dueIso: '2026-05-15',
      value: 462.5,
      status: 'ATRASADA',
      overdueDays: 15,
    },
    {
      contractId: '5b771c06',
      number: '10/10',
      dueDate: '15/06/2026',
      dueIso: '2026-06-15',
      value: 462.5,
      status: 'AGENDADA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '1/10',
      dueDate: '25/10/2025',
      dueIso: '2025-10-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '2/10',
      dueDate: '25/11/2025',
      dueIso: '2025-11-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '3/10',
      dueDate: '25/12/2025',
      dueIso: '2025-12-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '4/10',
      dueDate: '25/01/2026',
      dueIso: '2026-01-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '5/10',
      dueDate: '25/02/2026',
      dueIso: '2026-02-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '6/10',
      dueDate: '25/03/2026',
      dueIso: '2026-03-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '7/10',
      dueDate: '25/04/2026',
      dueIso: '2026-04-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '8/10',
      dueDate: '25/05/2026',
      dueIso: '2026-05-25',
      value: 600,
      status: 'PAGA',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '9/10',
      dueDate: '25/06/2026',
      dueIso: '2026-06-25',
      value: 600,
      status: 'PENDENTE',
      overdueDays: null,
    },
    {
      contractId: '5b771c08',
      number: '10/10',
      dueDate: '25/07/2026',
      dueIso: '2026-07-25',
      value: 600,
      status: 'AGENDADA',
      overdueDays: null,
    },
  ];

  protected readonly filteredContracts = computed(() => {
    const status = this.contractStatus();
    return status === 'TODOS'
      ? this.contracts
      : this.contracts.filter((item) => item.status === status);
  });

  protected readonly filteredInstallments = computed(() => {
    const status = this.installmentStatus();
    const start = this.startDate();
    const end = this.endDate();
    return this.installments.filter((item) => {
      if (item.contractId !== this.selectedContractId()) return false;
      if (status !== 'TODOS' && item.status !== status) return false;
      if (start && item.dueIso < start) return false;
      if (end && item.dueIso > end) return false;
      return true;
    });
  });

  protected readonly selectedContract = computed(
    () => this.contracts.find((item) => item.id === this.selectedContractId()) ?? this.contracts[0],
  );

  // Rota da agenda: UUID real quando o contrato tem agenda, id curto como fallback.
  protected readonly selectedContractRouteId = computed(() => {
    const contrato = this.selectedContract();
    return contrato.agendaId ?? contrato.id;
  });

  protected readonly totalContracted = computed(() =>
    this.contracts.reduce((total, contract) => total + contract.contracted, 0),
  );
  protected readonly totalOpen = computed(() =>
    this.contracts.reduce((total, contract) => total + contract.open, 0),
  );
  protected readonly openPercentage = computed(() =>
    this.totalContracted() ? (this.totalOpen() / this.totalContracted()) * 100 : 0,
  );
  // Faixas somadas das proprias parcelas: com valores fixos, o resumo divergia do que a
  // inadimplencia e a agenda financeira mostravam para os mesmos contratos.
  private faixa(min: number, max: number): number {
    const total = this.installments
      .filter((i) => (i.overdueDays ?? 0) >= min && (i.overdueDays ?? 0) <= max)
      .reduce((soma, i) => soma + i.value, 0);
    return Math.round(total * 100) / 100;
  }

  protected readonly overdueCount = computed(
    () => this.installments.filter((i) => (i.overdueDays ?? 0) > 15).length,
  );

  protected readonly delinquencyBands = {
    current:
      Math.round((this.contracts.reduce((s, c) => s + c.open, 0) - this.faixa(1, Infinity)) * 100) /
      100,
    from1To15: this.faixa(1, 15),
    from16To30: this.faixa(16, 30),
    over30: this.faixa(31, Infinity),
  };
  protected readonly overdueOver15 = computed(
    () => this.delinquencyBands.from16To30 + this.delinquencyBands.over30,
  );
  protected readonly delinquencyPercentage = computed(() =>
    this.totalContracted()
      ? ((this.delinquencyBands.from1To15 + this.overdueOver15()) / this.totalContracted()) * 100
      : 0,
  );
  protected readonly delinquencyGradient = computed(() => {
    const total = this.totalContracted() || 1;
    const firstEnd = (this.delinquencyBands.from1To15 / total) * 100;
    const secondEnd = firstEnd + (this.delinquencyBands.from16To30 / total) * 100;
    const overdueEnd = secondEnd + (this.delinquencyBands.over30 / total) * 100;
    return `conic-gradient(from 0deg, var(--sep-warning) 0 ${firstEnd}%, var(--sep-tint-orange) ${firstEnd}% ${secondEnd}%, var(--sep-tint-coral) ${secondEnd}% ${overdueEnd}%, var(--sep-success) ${overdueEnd}% 100%)`;
  });
  // ---- Renegociacoes -------------------------------------------------------------------------
  // O painel mostrava um total digitado no HTML (3, com uma legenda de 1/1/1 que nao vinha de
  // lugar nenhum). Agora conta a carteira devolvida por `GET /cobranca/renegociacoes`. Os quatro
  // status do contrato aparecem sempre, inclusive zerados: quem le precisa saber o universo.
  private readonly renegociacoes = signal<readonly RenegociacaoResponse[]>([]);
  protected readonly renegociacoesIndisponivel = signal(false);

  private readonly ROTULO_RENEGOCIACAO: Record<StatusRenegociacao, string> = {
    PROPOSTA: 'Em proposta',
    ACEITA: 'Aceitas',
    RECUSADA: 'Recusadas',
    EXPIRADA: 'Expiradas',
  };

  private readonly TOM_RENEGOCIACAO: Record<StatusRenegociacao, FaixaDonut['tom']> = {
    PROPOSTA: 'ambar',
    ACEITA: 'verde',
    RECUSADA: 'vermelho',
    EXPIRADA: 'neutro',
  };

  protected readonly renegociacoesTotal = computed(() => this.renegociacoes().length);

  protected readonly renegociacoesFaixas = computed(() => {
    const lista = this.renegociacoes();
    return fatiasDonut(
      (Object.keys(this.ROTULO_RENEGOCIACAO) as StatusRenegociacao[]).map((status) => ({
        rotulo: this.ROTULO_RENEGOCIACAO[status],
        valor: lista.filter((item) => item.status === status).length,
        tom: this.TOM_RENEGOCIACAO[status],
        chave: status,
      })),
    );
  });

  protected readonly renegociacoesDonut = computed(() =>
    gradienteDonut(this.renegociacoesFaixas()),
  );
  protected readonly renegociacoesHalo = computed(() => haloDonut(this.renegociacoesFaixas()));
  protected readonly corDoTom = corDoTom;

  ngOnInit(): void {
    this.cobranca.listarRenegociacoes().subscribe({
      next: (lista) => {
        this.renegociacoes.set(lista);
        this.renegociacoesIndisponivel.set(false);
      },
      error: () => {
        this.renegociacoes.set([]);
        this.renegociacoesIndisponivel.set(true);
      },
    });
  }

  protected readonly nextInstallment = computed<InstallmentRow | undefined>(
    () =>
      [...this.installments]
        .filter((item) => item.dueIso > this.referenceDateIso && item.status !== 'PAGA')
        .sort((a, b) => a.dueIso.localeCompare(b.dueIso))[0],
  );

  protected setContractStatus(event: Event): void {
    this.contractStatus.set((event.target as HTMLSelectElement).value);
    const visibleContracts = this.filteredContracts();
    if (!visibleContracts.some((contract) => contract.id === this.selectedContractId())) {
      this.selectedContractId.set(visibleContracts[0]?.id ?? '');
    }
  }

  protected setInstallmentStatus(event: Event): void {
    this.installmentStatus.set((event.target as HTMLSelectElement).value);
  }

  protected setDate(kind: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (kind === 'start') {
      this.startDate.set(value);
      if (value && this.endDate() && value > this.endDate()) this.endDate.set('');
      return;
    }
    this.endDate.set(value);
    if (value && this.startDate() && value < this.startDate()) this.startDate.set('');
  }

  protected openDatePicker(event: Event): void {
    const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    input.showPicker?.();
  }

  protected selectContract(id: string): void {
    this.selectedContractId.set(id);
  }

  protected toggleInstallmentValue(installmentNumber: string): void {
    this.hiddenInstallmentValues.update((current) => {
      const next = new Set(current);
      if (next.has(installmentNumber)) next.delete(installmentNumber);
      else next.add(installmentNumber);
      return next;
    });
  }

  protected toggleSensitiveValues(): void {
    this.sensitiveValuesVisible.update((visible) => !visible);
  }

  protected toggleAdvancedFilters(): void {
    const visible = !this.advancedFiltersVisible();
    this.advancedFiltersVisible.set(visible);
    if (this.advancedFiltersTimer) clearTimeout(this.advancedFiltersTimer);
    if (visible) {
      this.advancedFiltersTimer = setTimeout(() => {
        this.advancedFiltersVisible.set(false);
        this.advancedFiltersTimer = undefined;
      }, 4000);
    }
  }

  protected configureJourney(): void {
    this.journeyConfigured.update((configured) => !configured);
  }

  protected formatMoney(value: number): string {
    if (!this.sensitiveValuesVisible()) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  protected formatPercentage(value: number): string {
    return `${value.toFixed(2).replace('.', ',')}%`;
  }

  protected formatIsoDate(value: string | undefined): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  protected exportReport(): void {
    const header = gerarLinhaCsv(['Parcela', 'Vencimento', 'Valor', 'Status', 'Dias em atraso']);
    const rows = this.filteredInstallments().map((item) =>
      gerarLinhaCsv([
        item.number,
        item.dueDate,
        item.value.toFixed(2),
        item.status,
        item.overdueDays ?? '-',
      ]),
    );
    const blob = new Blob([`\uFEFF${[header, ...rows].join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'relatorio-cobranca-sep.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

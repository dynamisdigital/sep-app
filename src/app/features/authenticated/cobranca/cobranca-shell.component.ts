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
import { forkJoin } from 'rxjs';

import { RenegociacaoResponse, StatusRenegociacao } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { CobrancaService } from '../../../core/cobranca/cobranca.service';
import { centavos } from '../../../core/financeiro/calculo-financeiro';
import { gerarLinhaCsv } from '../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  ContratoDaCarteira,
  LinhaDeParcela,
  alertasDaCarteira,
  caminhosDoGrafico,
  contratoDaAgenda,
  linhasDaAgenda,
  recebimentosDaJanela,
} from './shared/cobranca-carteira';

import {
  FaixaDonut,
  corDoTom,
  fatiasDonut,
  gradienteDonut,
  haloDonut,
} from '../../../shared/donut';

type ContractCard = ContratoDaCarteira;
type InstallmentRow = LinhaDeParcela;

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
  // O universo da tela e a carteira. Nao ha endpoint que liste as agendas, entao fica aqui so a identificacao
  // de cada contrato (id curto e UUID da rota); contratado, em aberto, parcelas, juros e atrasos vem da
  // agenda de cada um (GET /cobranca/contratos/{id}/agenda), a mesma que as demais telas consultam.
  private static readonly CONTRATOS_DA_CARTEIRA = [
    { id: '5b771c03', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c03' },
    { id: '5b771c05', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03' },
    { id: '5b771c06', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c06' },
    { id: '5b771c08', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c08' },
  ] as const;

  protected readonly contracts = signal<readonly ContractCard[]>([]);
  protected readonly installments = signal<readonly InstallmentRow[]>([]);
  protected readonly carteiraIndisponivel = signal(false);

  protected readonly filteredContracts = computed(() => {
    const status = this.contractStatus();
    return status === 'TODOS'
      ? this.contracts()
      : this.contracts().filter((item) => item.status === status);
  });

  protected readonly filteredInstallments = computed(() => {
    const status = this.installmentStatus();
    const start = this.startDate();
    const end = this.endDate();
    return this.installments().filter((item) => {
      if (item.contractId !== this.selectedContractId()) return false;
      if (status !== 'TODOS' && item.status !== status) return false;
      if (start && item.dueIso < start) return false;
      if (end && item.dueIso > end) return false;
      return true;
    });
  });

  protected readonly selectedContract = computed(
    () =>
      this.contracts().find((item) => item.id === this.selectedContractId()) ??
      this.contracts()[0] ?? {
        id: '—',
        operation: '—',
        contracted: 0,
        open: 0,
        status: 'EM_DIA' as const,
      },
  );

  // Rota da agenda: UUID real quando o contrato tem agenda, id curto como fallback.
  protected readonly selectedContractRouteId = computed(() => {
    const contrato = this.selectedContract();
    return contrato.agendaId ?? contrato.id;
  });

  protected readonly totalContracted = computed(() =>
    this.contracts().reduce((total, contract) => total + contract.contracted, 0),
  );
  protected readonly totalOpen = computed(() =>
    this.contracts().reduce((total, contract) => total + contract.open, 0),
  );
  protected readonly openPercentage = computed(() =>
    this.totalContracted() ? (this.totalOpen() / this.totalContracted()) * 100 : 0,
  );
  // Faixas somadas das proprias parcelas: com valores fixos, o resumo divergia do que a
  // inadimplencia e a agenda financeira mostravam para os mesmos contratos.
  protected readonly overdueCount = computed(
    () => this.installments().filter((i) => (i.overdueDays ?? 0) > 15).length,
  );

  protected readonly delinquencyBands = computed(() => {
    const valor = (min: number, max: number): number =>
      centavos(
        this.installments()
          .filter((i) => (i.overdueDays ?? 0) >= min && (i.overdueDays ?? 0) <= max)
          .reduce((soma, i) => soma + i.value, 0),
      );
    return {
      current: centavos(this.totalOpen() - valor(1, Infinity)),
      from1To15: valor(1, 15),
      from16To30: valor(16, 30),
      over30: valor(31, Infinity),
    };
  });
  protected readonly overdueOver15 = computed(
    () => this.delinquencyBands().from16To30 + this.delinquencyBands().over30,
  );
  protected readonly delinquencyPercentage = computed(() =>
    this.totalContracted()
      ? ((this.delinquencyBands().from1To15 + this.overdueOver15()) / this.totalContracted()) * 100
      : 0,
  );
  protected readonly delinquencyGradient = computed(() => {
    const total = this.totalContracted() || 1;
    const bandas = this.delinquencyBands();
    const firstEnd = (bandas.from1To15 / total) * 100;
    const secondEnd = firstEnd + (bandas.from16To30 / total) * 100;
    const overdueEnd = secondEnd + (bandas.over30 / total) * 100;
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
    this.carregarCarteira();
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

  // Uma agenda por contrato, em paralelo. Se qualquer uma falhar, a tela diz que a carteira esta indisponivel
  // em vez de mostrar uma carteira pela metade, que somaria numeros errados.
  private carregarCarteira(): void {
    const contratos = CobrancaShellComponent.CONTRATOS_DA_CARTEIRA;
    forkJoin(contratos.map((c) => this.cobranca.consultarAgendaPorContrato(c.agendaId))).subscribe({
      next: (agendas) => {
        this.contracts.set(
          agendas.map((a, i) => contratoDaAgenda(a, contratos[i].id, contratos[i].agendaId)),
        );
        this.installments.set(
          agendas.flatMap((a, i) => linhasDaAgenda(a, contratos[i].id, this.referenceDateIso)),
        );
        this.carteiraIndisponivel.set(false);
      },
      error: () => {
        this.contracts.set([]);
        this.installments.set([]);
        this.carteiraIndisponivel.set(true);
      },
    });
  }

  // ---- Coluna lateral: tudo sai das parcelas e das renegociacoes carregadas ------------------------------
  protected readonly alertas = computed(() =>
    alertasDaCarteira(this.installments(), this.referenceDateIso),
  );

  /** Acordos de renegociacao aceitos e o valor que eles somam (parcela nova x numero de parcelas). */
  protected readonly acordosAtivos = computed(() => {
    const aceitos = this.renegociacoes().filter((r) => r.status === 'ACEITA');
    return {
      quantidade: aceitos.length,
      valor: centavos(aceitos.reduce((s, r) => s + r.novoValorParcela * r.numeroParcelas, 0)),
    };
  });

  protected readonly recebimentos30 = computed(() => {
    const janela = recebimentosDaJanela(this.installments(), this.referenceDateIso, 30);
    const caminhos = caminhosDoGrafico(janela.acumulado);
    const maximo = caminhos.maximo;
    const rotulo = (v: number) =>
      v >= 1000
        ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')}k`
        : String(Math.round(v));
    const data = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
    const meio = janela.acumulado.length >> 1;
    return {
      ...janela,
      linha: caminhos.linha,
      area: caminhos.area,
      // Do maior para o menor, como as marcas do eixo vertical aparecem na tela.
      eixoY: [maximo, (maximo * 2) / 3, maximo / 3, 0].map(rotulo),
      datas: [
        data(janela.inicio),
        data(somarDiasIso(janela.inicio, Math.round(meio / 2))),
        data(somarDiasIso(janela.inicio, meio)),
        data(somarDiasIso(janela.inicio, Math.round((meio + janela.acumulado.length - 1) / 2))),
        data(janela.fim),
      ],
    };
  });

  protected readonly nextInstallment = computed<InstallmentRow | undefined>(
    () =>
      [...this.installments()]
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

function somarDiasIso(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

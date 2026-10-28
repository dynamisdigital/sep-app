import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';

import {
  DashboardOperacionalResponse,
  DominioOperacional,
  UsuarioResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

interface MetricCard {
  label: string;
  value: string;
  subtitle: string;
  unit?: string;
  trendValue: string;
  trendContext: string;
  icon: string;
  tone: 'cyan' | 'green' | 'blue' | 'amber' | 'purple';
}

interface JourneyCard {
  title: string;
  description: string;
  pendingValue: number;
  total: number;
  pendingLabel: string;
  status: string;
  statusTone: 'cyan' | 'green' | 'amber';
  route: string;
  icon: string;
}

interface SummaryItem {
  label: string;
  value: string;
  trend: string;
  icon: string;
  severity?: 'danger';
}

interface ActivityItem {
  title: string;
  detail: string;
  time: string;
  status: string;
  tone: 'cyan' | 'green' | 'red';
  icon: string;
}

interface PerformanceItem {
  label: string;
  value: string;
  progress: number;
  color: string;
  trend?: string;
  context: string;
}

interface HealthItem {
  label: string;
  status: string;
  icon: string;
}

@Component({
  selector: 'sep-backoffice-dashboard-page',
  imports: [LucideAngularModule, OperationalShellComponent, RouterLink],
  templateUrl: './backoffice-dashboard-page.component.html',
  styleUrl: './backoffice-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeDashboardPageComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentDateTime = signal(new Date());
  private readonly dashboard = signal<DashboardOperacionalResponse | null>(null);
  protected readonly dashboardLoading = signal(true);
  protected readonly dashboardError = signal<string | null>(null);
  private readonly clockInterval = window.setInterval(() => {
    this.currentDateTime.set(new Date());
  }, 1000);

  protected readonly greeting = computed(() => {
    const hour = this.currentDateTime().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  });
  protected readonly currentUser = computed<UsuarioResponse>(() => {
    const authenticatedUser = this.auth.currentUser();
    if (authenticatedUser?.role === 'BACKOFFICE') return authenticatedUser;
    return {
      id: 'mockup-03-backoffice',
      username: 'backoffice@empresa.com',
      role: 'BACKOFFICE',
      dataCriacao: '2026-07-08T00:00:00Z',
      dataModificacao: '2026-07-08T00:00:00Z',
      criadoPor: 'sistema',
      modificadoPor: 'sistema',
      precisaRedefinirSenha: false,
      mfaHabilitado: false,
    };
  });

  constructor() {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.dashboardLoading.set(true);
    this.dashboardError.set(null);
    this.backoffice
      .consultarDashboardOperacional()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.dashboardLoading.set(false);
        },
        error: () => {
          this.dashboardLoading.set(false);
          this.dashboardError.set(
            'Não foi possível atualizar os indicadores operacionais. Tente novamente.',
          );
        },
      });
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockInterval);
  }

  protected readonly metrics = computed<MetricCard[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];

    const metadata: Record<DominioOperacional, Pick<MetricCard, 'label' | 'icon' | 'tone'>> = {
      ONBOARDING: {
        label: 'Onboarding',
        icon: 'user-plus',
        tone: 'cyan',
      },
      CREDITO: {
        label: 'Crédito',
        icon: 'credit-card',
        tone: 'green',
      },
      FORMALIZACAO: {
        label: 'Formalização',
        icon: 'file-check',
        tone: 'blue',
      },
      COBRANCA: {
        label: 'Cobrança',
        icon: 'banknote',
        tone: 'amber',
      },
      PIX: {
        label: 'PIX',
        icon: 'pix',
        tone: 'purple',
      },
    };

    const indicators = dashboard.indicadores.map((indicator) => ({
      ...metadata[indicator.dominio],
      value: String(indicator.valor),
      subtitle: indicator.subtitulo,
      unit: indicator.unidade,
      trendValue: formatTrend(indicator.variacaoPercentual),
      trendContext: indicator.comparacao,
    }));

    return [
      ...indicators,
      {
        label: 'Volume operacional',
        value: formatCompactCurrency(dashboard.volume.valor),
        subtitle: `Últimos ${dashboard.volume.periodoDias} dias`,
        trendValue: formatTrend(dashboard.volume.variacaoPercentual),
        trendContext: `vs ${dashboard.volume.periodoDias} dias anteriores`,
        icon: 'activity',
        tone: 'cyan',
      },
    ];
  });

  // Tendencia do volume: o unico dado de serie que a API entrega para este cartao e o proprio
  // volume mais a variacao contra o periodo anterior, entao a linha liga esses dois pontos. O
  // desenho que estava aqui era um PNG com "+18% vs 7 dias anteriores" gravado na imagem, que
  // repetia o texto logo abaixo e nunca mudava, qualquer que fosse o numero real.
  protected readonly volumeTendencia = computed(() => {
    const volume = this.dashboard()?.volume;
    if (!volume) return null;
    const variacao = volume.variacaoPercentual ?? 0;
    const anterior = variacao === -100 ? 0 : volume.valor / (1 + variacao / 100);
    const maximo = Math.max(volume.valor, anterior, 1);
    const minimo = Math.min(volume.valor, anterior, 0);
    const y = (v: number) => (44 - ((v - minimo) / Math.max(maximo - minimo, 1)) * 36).toFixed(2);
    return { pontos: `4,${y(anterior)} 216,${y(volume.valor)}`, subindo: variacao >= 0 };
  });

  protected readonly journeys = computed<JourneyCard[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];

    const metadata: Record<
      DashboardOperacionalResponse['jornadas'][number]['dominio'],
      Pick<JourneyCard, 'title' | 'description' | 'statusTone' | 'route' | 'icon'>
    > = {
      ONBOARDING: {
        title: 'Onboarding',
        description: 'KYC/KYB e validações cadastrais.',
        statusTone: 'cyan',
        route: '/app/onboarding',
        icon: 'user-plus',
      },
      CREDITO: {
        title: 'Análise de crédito',
        description: 'Proposta, parecer e decisão.',
        statusTone: 'green',
        route: '/app/credito',
        icon: 'credit-card',
      },
      FORMALIZACAO: {
        title: 'Formalização',
        description: 'Aceite e assinatura digital.',
        statusTone: 'cyan',
        route: '/app/formalizacao',
        icon: 'file-check',
      },
      COBRANCA: {
        title: 'Cobrança',
        description: 'Parcelas e inadimplência.',
        statusTone: 'amber',
        route: '/app/cobranca',
        icon: 'banknote',
      },
    };

    return dashboard.jornadas.map((journey) => ({
      ...metadata[journey.dominio],
      pendingValue: journey.pendencias,
      pendingLabel: journey.unidade,
      status: journey.status,
      total: journey.total,
    }));
  });

  protected journeyProgress(journey: JourneyCard): number {
    if (!journey.total) return 0;
    return Math.min(100, Math.round((journey.pendingValue / journey.total) * 100));
  }

  protected readonly summary = computed<SummaryItem[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];
    const metadata: Record<
      DashboardOperacionalResponse['resumo'][number]['id'],
      Pick<SummaryItem, 'label' | 'icon' | 'severity'>
    > = {
      NOVOS_CADASTROS: {
        label: 'Novos cadastros',
        icon: 'user-plus',
      },
      PROPOSTAS_RECEBIDAS: {
        label: 'Propostas recebidas',
        icon: 'inbox',
      },
      CONTRATOS_ASSINADOS: {
        label: 'Contratos assinados',
        icon: 'file-check',
      },
      PAGAMENTOS_PIX: {
        label: 'Pagamentos via PIX',
        icon: 'qr-code',
      },
      ALERTAS_CRITICOS: {
        label: 'Alertas críticos',
        icon: 'triangle-alert',
        severity: 'danger',
      },
    };
    return dashboard.resumo.map((item) => ({
      ...metadata[item.id],
      value: String(item.valor),
      trend: item.variacaoPercentual == null ? '-' : formatTrend(item.variacaoPercentual),
    }));
  });

  protected readonly activities = computed<ActivityItem[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];
    const icons: Record<DashboardOperacionalResponse['atividades'][number]['tipo'], string> = {
      CADASTRO_INICIADO: 'circle',
      PROPOSTA_RECEBIDA: 'circle-check',
      DOCUMENTO_ENVIADO: 'circle-check',
      PAGAMENTO_PIX: 'circle-check',
      ALERTA_INADIMPLENCIA: 'circle',
    };
    return dashboard.atividades.map((activity) => ({
      title: activity.titulo,
      detail: activity.detalhe,
      time: new Date(activity.ocorridaEm).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: activity.status,
      tone:
        activity.severidade === 'PERIGO'
          ? 'red'
          : activity.severidade === 'INFO'
            ? 'cyan'
            : 'green',
      icon: icons[activity.tipo],
    }));
  });

  protected readonly performance = computed<PerformanceItem[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];
    const metadata: Record<
      DashboardOperacionalResponse['desempenho'][number]['id'],
      Pick<PerformanceItem, 'label' | 'color'>
    > = {
      CONVERSAO_CREDITO: { label: 'Conversão crédito', color: 'var(--sep-accent)' },
      CONTRATOS_FINALIZADOS: { label: 'Contratos finalizados', color: 'var(--sep-success)' },
      DOCUMENTOS_VALIDOS: { label: 'Documentos válidos', color: 'var(--sep-purple)' },
      SLA_MEDIO: { label: 'SLA médio', color: 'var(--sep-warning)' },
    };
    return dashboard.desempenho.map((item) => ({
      ...metadata[item.id],
      value: `${item.percentual}%`,
      progress: item.percentual,
      trend: item.variacaoPercentual == null ? undefined : formatTrend(item.variacaoPercentual),
      context: item.contexto,
    }));
  });

  protected readonly health = computed<HealthItem[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];
    return dashboard.saudeServicos.map((item) => ({
      label: item.nome,
      status: item.status.toLocaleLowerCase('pt-BR'),
      icon: 'activity',
    }));
  });
}

function formatTrend(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}M`;
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  DashboardOperacionalResponse,
  DominioOperacional,
  UsuarioResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';

interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  section: 'jornadas' | 'operacao' | 'conta' | 'primary';
  badge?: string;
  active?: boolean;
}

interface MetricCard {
  label: string;
  value: string;
  subtitle: string;
  unit?: string;
  trendValue: string;
  trendContext: string;
  icon: string;
  tone: 'cyan' | 'green' | 'blue' | 'amber' | 'purple';
  visual?: string;
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

interface FooterStatus {
  label: string;
  detail: string;
  icon: string;
}

@Component({
  selector: 'sep-backoffice-dashboard-page',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './backoffice-dashboard-page.component.html',
  styleUrl: './backoffice-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeDashboardPageComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionStartedAt = new Date();
  private readonly currentDateTime = signal(new Date());
  private readonly dashboard = signal<DashboardOperacionalResponse | null>(null);
  protected readonly dashboardLoading = signal(true);
  protected readonly dashboardError = signal<string | null>(null);
  private readonly clockInterval = window.setInterval(() => {
    this.currentDateTime.set(new Date());
  }, 1000);

  protected readonly assetBase = '/image/sep_mockup_03_assets';
  protected readonly systemTime = computed(() =>
    this.currentDateTime().toLocaleTimeString('pt-BR', { hour12: false }),
  );
  protected readonly systemDate = computed(() =>
    this.currentDateTime().toLocaleDateString('pt-BR'),
  );
  protected readonly lastAccess = `${this.sessionStartedAt.toLocaleDateString(
    'pt-BR',
  )} ${this.sessionStartedAt.toLocaleTimeString('pt-BR', { hour12: false })}`;
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

  protected readonly sidebarItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      route: '/app/backoffice/dashboard',
      icon: 'icons/icon_sidebar_dashboard.png',
      section: 'primary',
      active: true,
    },
    {
      label: 'Onboarding',
      route: '/app/onboarding',
      icon: 'icons/icon_sidebar_onboarding.png',
      section: 'jornadas',
      badge: '2',
    },
    {
      label: 'Crédito',
      route: '/app/credito',
      icon: 'icons/icon_sidebar_credito.png',
      section: 'jornadas',
      badge: '3',
    },
    {
      label: 'Formalização',
      route: '/app/formalizacao',
      icon: 'icons/icon_sidebar_formalizacao.png',
      section: 'jornadas',
      badge: '1',
    },
    {
      label: 'Cobrança',
      route: '/app/cobranca',
      icon: 'icons/icon_sidebar_cobranca.png',
      section: 'jornadas',
      badge: '4',
    },
    {
      label: 'Backoffice',
      route: '/app/backoffice/fila',
      icon: 'icons/icon_sidebar_backoffice.png',
      section: 'operacao',
      active: true,
    },
    {
      label: 'Pix',
      route: '/app/pix',
      icon: 'icons/icon_sidebar_pix.png',
      section: 'operacao',
      badge: '1',
    },
    {
      label: 'Meu perfil',
      route: '/app/profile',
      icon: 'icons/icon_sidebar_perfil.png',
      section: 'conta',
    },
  ];

  protected readonly metrics = computed<MetricCard[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];

    const metadata: Record<DominioOperacional, Pick<MetricCard, 'label' | 'icon' | 'tone'>> = {
      ONBOARDING: {
        label: 'Onboarding',
        icon: 'icons/icon_metric_onboarding.png',
        tone: 'cyan',
      },
      CREDITO: {
        label: 'Crédito',
        icon: 'icons/icon_metric_credito.png',
        tone: 'green',
      },
      FORMALIZACAO: {
        label: 'Formalização',
        icon: 'icons/icon_metric_formalizacao.png',
        tone: 'blue',
      },
      COBRANCA: {
        label: 'Cobrança',
        icon: 'icons/icon_metric_cobranca.png',
        tone: 'amber',
      },
      PIX: {
        label: 'PIX',
        icon: 'icons/icon_metric_pix.png',
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
        icon: 'icons/icon_metric_volume_operacional.png',
        tone: 'cyan',
        visual: 'visuals/visual_sparkline_volume_operacional.png',
      },
    ];
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
        icon: 'icons/icon_jornada_onboarding.png',
      },
      CREDITO: {
        title: 'Análise de crédito',
        description: 'Proposta, parecer e decisão.',
        statusTone: 'green',
        route: '/app/credito',
        icon: 'icons/icon_jornada_analise_credito.png',
      },
      FORMALIZACAO: {
        title: 'Formalização',
        description: 'Aceite e assinatura digital.',
        statusTone: 'cyan',
        route: '/app/formalizacao',
        icon: 'icons/icon_jornada_formalizacao.png',
      },
      COBRANCA: {
        title: 'Cobrança',
        description: 'Parcelas e inadimplência.',
        statusTone: 'amber',
        route: '/app/cobranca',
        icon: 'icons/icon_jornada_cobranca.png',
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
        icon: 'icons/icon_resumo_novos_cadastros.png',
      },
      PROPOSTAS_RECEBIDAS: {
        label: 'Propostas recebidas',
        icon: 'icons/icon_resumo_propostas_recebidas.png',
      },
      CONTRATOS_ASSINADOS: {
        label: 'Contratos assinados',
        icon: 'icons/icon_resumo_contratos_assinados.png',
      },
      PAGAMENTOS_PIX: {
        label: 'Pagamentos via PIX',
        icon: 'icons/icon_resumo_pagamentos_pix.png',
      },
      ALERTAS_CRITICOS: {
        label: 'Alertas críticos',
        icon: 'icons/icon_resumo_alertas_criticos.png',
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
      CADASTRO_INICIADO: 'icons/icon_timeline_dot_info.png',
      PROPOSTA_RECEBIDA: 'icons/icon_timeline_dot_success_01.png',
      DOCUMENTO_ENVIADO: 'icons/icon_timeline_dot_success_02.png',
      PAGAMENTO_PIX: 'icons/icon_timeline_dot_success_03.png',
      ALERTA_INADIMPLENCIA: 'icons/icon_timeline_dot_danger.png',
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
      CONVERSAO_CREDITO: { label: 'Conversão crédito', color: '#2997ff' },
      CONTRATOS_FINALIZADOS: { label: 'Contratos finalizados', color: '#37e0a6' },
      DOCUMENTOS_VALIDOS: { label: 'Documentos válidos', color: '#b85cff' },
      SLA_MEDIO: { label: 'SLA médio', color: '#ffb545' },
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
    return dashboard.saudeServicos.map((item, index) => ({
      label: item.nome,
      status: item.status.toLocaleLowerCase('pt-BR'),
      icon: `icons/icon_health_service_0${index + 1}.png`,
    }));
  });

  protected readonly footerStatus: FooterStatus[] = [
    {
      label: 'Ambiente regulado',
      detail: 'Resolução CMN 4.656/2018',
      icon: 'icons/icon_footer_ambiente_regulado.png',
    },
    {
      label: 'Segregação patrimonial',
      detail: 'Conta escrow ativa',
      icon: 'icons/icon_footer_segregacao_patrimonial.png',
    },
    {
      label: 'Segurança',
      detail: 'Dados criptografados',
      icon: 'icons/icon_footer_seguranca.png',
    },
    {
      label: 'Rastreabilidade',
      detail: 'Auditoria completa',
      icon: 'icons/icon_footer_rastreabilidade.png',
    },
  ];

  protected readonly sidebarSections = [
    { id: 'jornadas', label: 'Jornadas' },
    { id: 'operacao', label: 'Operação' },
    { id: 'conta', label: 'Conta' },
  ] as const;

  protected itemsBySection(section: SidebarItem['section']): SidebarItem[] {
    return this.sidebarItems.filter((item) => item.section === section);
  }
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

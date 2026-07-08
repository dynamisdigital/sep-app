import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { UsuarioResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';

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
  context: string;
  trend: string;
  icon: string;
  tone: 'cyan' | 'green' | 'blue' | 'amber' | 'purple';
  visual?: string;
}

interface JourneyCard {
  title: string;
  description: string;
  pending: string;
  status: string;
  statusTone: 'cyan' | 'green' | 'amber';
  progress: number;
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
  detail: string;
  visual: string;
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
export class BackofficeDashboardPageComponent {
  private readonly auth = inject(AuthService);

  protected readonly assetBase = '/image/sep_mockup_03_assets';
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

  protected readonly metrics: MetricCard[] = [
    {
      label: 'Onboarding',
      value: '12',
      context: 'cadastros',
      trend: '+20% vs ontem',
      icon: 'icons/icon_metric_onboarding.png',
      tone: 'cyan',
    },
    {
      label: 'Crédito',
      value: '8',
      context: 'propostas',
      trend: '+14% vs ontem',
      icon: 'icons/icon_metric_credito.png',
      tone: 'green',
    },
    {
      label: 'Formalização',
      value: '5',
      context: 'contratos',
      trend: '+25% vs ontem',
      icon: 'icons/icon_metric_formalizacao.png',
      tone: 'blue',
    },
    {
      label: 'Cobrança',
      value: '9',
      context: 'parcelas',
      trend: '+9% vs ontem',
      icon: 'icons/icon_metric_cobranca.png',
      tone: 'amber',
    },
    {
      label: 'PIX',
      value: '24',
      context: 'transações',
      trend: '+30% vs ontem',
      icon: 'icons/icon_metric_pix.png',
      tone: 'purple',
    },
    {
      label: 'Volume operacional',
      value: 'R$ 2,48M',
      context: 'Últimos 7 dias',
      trend: '+18% vs 7 dias anteriores',
      icon: 'icons/icon_metric_volume_operacional.png',
      tone: 'cyan',
      visual: 'visuals/visual_sparkline_volume_operacional.png',
    },
  ];

  protected readonly journeys: JourneyCard[] = [
    {
      title: 'Onboarding',
      description: 'KYC/KYB e validações cadastrais.',
      pending: '12 cadastros',
      status: 'Em preparação',
      statusTone: 'cyan',
      progress: 43,
      route: '/app/onboarding',
      icon: 'icons/icon_jornada_onboarding.png',
    },
    {
      title: 'Análise de crédito',
      description: 'Proposta, parecer e decisão.',
      pending: '8 propostas',
      status: 'Em preparação',
      statusTone: 'green',
      progress: 38,
      route: '/app/credito',
      icon: 'icons/icon_jornada_analise_credito.png',
    },
    {
      title: 'Formalização',
      description: 'Aceite e assinatura digital.',
      pending: '5 contratos',
      status: 'Aguardando',
      statusTone: 'cyan',
      progress: 37,
      route: '/app/formalizacao',
      icon: 'icons/icon_jornada_formalizacao.png',
    },
    {
      title: 'Cobrança',
      description: 'Parcelas e inadimplência.',
      pending: '5 parcelas',
      status: 'Em atenção',
      statusTone: 'amber',
      progress: 18,
      route: '/app/cobranca',
      icon: 'icons/icon_jornada_cobranca.png',
    },
  ];

  protected readonly summary: SummaryItem[] = [
    {
      label: 'Novos cadastros',
      value: '7',
      trend: '+16%',
      icon: 'icons/icon_resumo_novos_cadastros.png',
    },
    {
      label: 'Propostas recebidas',
      value: '5',
      trend: '+11%',
      icon: 'icons/icon_resumo_propostas_recebidas.png',
    },
    {
      label: 'Contratos assinados',
      value: '3',
      trend: '+25%',
      icon: 'icons/icon_resumo_contratos_assinados.png',
    },
    {
      label: 'Pagamentos via PIX',
      value: '24',
      trend: '+30%',
      icon: 'icons/icon_resumo_pagamentos_pix.png',
    },
    {
      label: 'Alertas críticos',
      value: '2',
      trend: '-',
      icon: 'icons/icon_resumo_alertas_criticos.png',
      severity: 'danger',
    },
  ];

  protected readonly activities: ActivityItem[] = [
    {
      title: 'Novo cadastro iniciado',
      detail: 'Pessoa física · CPF 123.456.789-00',
      time: '11:56',
      status: 'Em andamento',
      tone: 'cyan',
      icon: 'icons/icon_timeline_dot_info.png',
    },
    {
      title: 'Proposta recebida',
      detail: 'Empresa XYZ Ltda · R$ 150.000,00',
      time: '11:52',
      status: 'Em análise',
      tone: 'green',
      icon: 'icons/icon_timeline_dot_success_01.png',
    },
    {
      title: 'Documento enviado',
      detail: 'Contrato social · Empresa ABC Ltda',
      time: '11:48',
      status: 'Recebido',
      tone: 'green',
      icon: 'icons/icon_timeline_dot_success_02.png',
    },
    {
      title: 'Pagamento via PIX',
      detail: 'R$ 25.000,00 · ID: PIX1234567890',
      time: '11:40',
      status: 'Concluído',
      tone: 'green',
      icon: 'icons/icon_timeline_dot_success_03.png',
    },
    {
      title: 'Alerta de inadimplência',
      detail: 'Parcela vencida · Cliente DEF Ltda',
      time: '11:35',
      status: 'Atenção',
      tone: 'red',
      icon: 'icons/icon_timeline_dot_danger.png',
    },
  ];

  protected readonly performance: PerformanceItem[] = [
    {
      label: 'Conversão crédito',
      value: '78%',
      detail: '+12% vs período anterior',
      visual: 'visuals/visual_performance_conversao_credito_78.png',
    },
    {
      label: 'Contratos finalizados',
      value: '65%',
      detail: '+18% vs período anterior',
      visual: 'visuals/visual_performance_contratos_finalizados_65.png',
    },
    {
      label: 'Documentos válidos',
      value: '92%',
      detail: '+8% vs período anterior',
      visual: 'visuals/visual_performance_documentos_validos_92.png',
    },
    {
      label: 'SLA médio',
      value: '84%',
      detail: '3h 12m de resposta',
      visual: 'visuals/visual_performance_sla_medio_84.png',
    },
  ];

  protected readonly health: HealthItem[] = [
    { label: 'API de crédito', status: 'online', icon: 'icons/icon_health_service_01.png' },
    { label: 'Serviço de documentos', status: 'online', icon: 'icons/icon_health_service_02.png' },
    { label: 'Motor de análise', status: 'online', icon: 'icons/icon_health_service_03.png' },
    { label: 'Serviço de assinatura', status: 'online', icon: 'icons/icon_health_service_04.png' },
    { label: 'Gateway de pagamentos', status: 'online', icon: 'icons/icon_health_service_05.png' },
  ];

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

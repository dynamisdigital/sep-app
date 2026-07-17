import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { UsuarioResponse } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

interface OperationalNavItem {
  label: string;
  route: string;
  icon: string;
  section: 'jornadas' | 'operacao' | 'conta' | 'primary';
  badge?: string;
}

interface OperationalFooterItem {
  label: string;
  detail: string;
  icon: string;
}

@Component({
  selector: 'sep-operational-shell',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './operational-shell.component.html',
  styleUrl:
    '../../features/authenticated/backoffice/pages/backoffice-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class OperationalShellComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly location = inject(Location);
  private readonly sessionStartedAt = new Date();
  private readonly currentDateTime = signal(new Date());
  private readonly clockInterval = window.setInterval(
    () => this.currentDateTime.set(new Date()),
    1000,
  );

  // O shell operacional foi homologado visualmente no mockup 03. As telas
  // seguintes reutilizam estes mesmos assets e medidas; apenas o conteúdo
  // projetado por ng-content pode usar o pacote específico de cada mockup.
  protected readonly assetBase = '/image/sep_mockup_03_assets';
  protected readonly currentUser = computed<UsuarioResponse>(() => {
    const user = this.auth.currentUser();
    if (user) return user;
    return {
      id: 'mockup-operational-user',
      username: 'backoffice@empresa.com',
      role: 'BACKOFFICE',
      dataCriacao: '2026-04-24T18:30:00-03:00',
      dataModificacao: '2026-04-24T18:30:00-03:00',
      criadoPor: 'system',
      modificadoPor: 'system',
      precisaRedefinirSenha: false,
      mfaHabilitado: true,
    };
  });
  protected readonly systemTime = computed(() =>
    this.currentDateTime().toLocaleTimeString('pt-BR', { hour12: false }),
  );
  protected readonly systemDate = computed(() =>
    this.currentDateTime().toLocaleDateString('pt-BR'),
  );
  protected readonly lastAccess = `${this.sessionStartedAt.toLocaleDateString(
    'pt-BR',
  )} ${this.sessionStartedAt.toLocaleTimeString('pt-BR', { hour12: false })}`;

  protected readonly navigation: OperationalNavItem[] = [
    {
      label: 'Dashboard',
      route: '/app/backoffice/dashboard',
      icon: 'icons/icon_sidebar_dashboard.png',
      section: 'primary',
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

  protected readonly footerItems: OperationalFooterItem[] = [
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

  protected itemsBySection(section: OperationalNavItem['section']): OperationalNavItem[] {
    return this.navigation.filter((item) => item.section === section);
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected goBack(): void {
    this.location.back();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockInterval);
  }
}

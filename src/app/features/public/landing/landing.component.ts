import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { SepArteComponent } from '../../../shared/arte/sep-arte.component';
import { SepLogoComponent } from '../../../shared/arte/sep-logo.component';
import { LarguraTelaDirective } from '../../../core/layout/largura-tela.directive';
import { ThemeService } from '../../../core/theme/theme.service';
import { AcoesPublicasComponent } from '../../../shared/acoes-publicas/acoes-publicas.component';

interface AssetItem {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'sep-landing',
  imports: [
    LucideAngularModule,
    RouterLink,
    SepArteComponent,
    SepLogoComponent,
    LarguraTelaDirective,
    AcoesPublicasComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  protected readonly assetBase = '/image/sep_mockup_01_assets';

  private readonly tema = inject(ThemeService);

  /** O botao do topo troca o tema da tela publica; o escuro e o padrao do projeto. */
  protected readonly temaEscuro = this.tema.isDark;

  protected alternarTema(): void {
    this.tema.toggle();
  }

  protected readonly trustBadges: AssetItem[] = [
    {
      icon: 'landmark',
      title: 'Regulado pela',
      description: 'CMN 4.656/2018',
    },
    {
      icon: 'split',
      title: 'Segregação',
      description: 'Patrimonial escrow',
    },
    {
      icon: 'shield-alert',
      title: 'KYC e PLD',
      description: 'Prevenção',
    },
  ];

  protected readonly platformPills: AssetItem[] = [
    {
      icon: 'landmark',
      title: 'Escrow',
      description: 'Seguro',
    },
    {
      icon: 'badge-check',
      title: 'KYC/KYB',
      description: 'Verificado',
    },
    {
      icon: 'shield-alert',
      title: 'PLD',
      description: 'Prevenção',
    },
    {
      icon: 'scroll-text',
      title: 'Auditoria',
      description: 'Completa',
    },
    {
      icon: 'history',
      title: 'Rastreabilidade',
      description: 'Total',
    },
  ];

  protected readonly workflowSteps: AssetItem[] = [
    {
      icon: 'user-plus',
      title: 'Cadastro e Verificação',
      description:
        'Empresas e investidores se cadastram na plataforma e passam por validações KYC/KYB e checagens regulatórias.',
    },
    {
      icon: 'file-search',
      title: 'Proposta e Análise',
      description:
        'A empresa solicita o crédito e a proposta é analisada com base em dados, regras e parecer técnico.',
    },
    {
      icon: 'file-check',
      title: 'Formalização e Escrow',
      description:
        'Com aprovação, o contrato é formalizado e o recurso fica em conta escrow segregada e auditável.',
    },
    {
      icon: 'send',
      title: 'Liberação e Acompanhamento',
      description:
        'Após condições cumpridas, o crédito é liberado e toda operação é acompanhada com rastreabilidade total.',
    },
  ];

  protected readonly indicators: AssetItem[] = [
    {
      icon: 'landmark',
      title: '100%',
      description: 'Ambiente regulado Resolução CMN 4.656/2018',
    },
    {
      icon: 'shield-check',
      title: 'Segurança',
      description: 'Dados protegidos com criptografia de ponta',
    },
    {
      icon: 'history',
      title: 'Rastreabilidade',
      description: 'Do cadastro à liquidação com auditoria completa',
    },
    {
      icon: 'lock',
      title: 'Conexão segura',
      description: 'Empresas que precisam e investidores que confiam',
    },
    {
      icon: 'clipboard-check',
      title: 'Conformidade',
      description: 'KYC, KYB, PLD e governança em todas as etapas',
    },
  ];
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { type NomeArte, SepArteComponent } from '../../../shared/arte/sep-arte.component';

interface OnboardingPath {
  label: string;
  badge: string;
  description: string;
  route: string;
  tone: 'person' | 'company';
  visual: NomeArte;
  action: string;
  steps: { label: string; icon: string }[];
  benefits: { title: string; description: string; icon: string }[];
}

@Component({
  selector: 'sep-onboarding-home',
  imports: [SepArteComponent, LucideAngularModule, OperationalShellComponent, RouterLink],
  templateUrl: './onboarding-home.component.html',
  styleUrl: './onboarding-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingHomeComponent {
  protected readonly assetBase = '/image/sep_mockup_06_assets';
  protected readonly paths: OnboardingPath[] = [
    {
      label: 'Pessoa física',
      badge: 'KYC',
      description: 'Cadastro individual com validação e verificação de identidade.',
      route: '/app/onboarding/pessoa',
      tone: 'person',
      visual: 'pessoa',
      action: 'Iniciar como pessoa física',
      steps: [
        { label: 'Dados pessoais e contato', icon: 'id-card' },
        { label: 'Validação de documentos', icon: 'file-check' },
        { label: 'Verificação de identidade', icon: 'scan-face' },
        {
          label: 'Auditoria e rastreabilidade',
          icon: 'history',
        },
      ],
      benefits: [
        {
          title: 'Rápido e seguro',
          description: 'Processo otimizado para pessoa física',
          icon: 'zap',
        },
        {
          title: 'Privacidade',
          description: 'Seus dados protegidos com criptografia',
          icon: 'lock-keyhole',
        },
      ],
    },
    {
      label: 'Empresa',
      badge: 'KYB',
      description: 'Cadastro empresarial com validação de empresa e representantes.',
      route: '/app/onboarding/empresa',
      tone: 'company',
      visual: 'empresa',
      action: 'Iniciar como empresa',
      steps: [
        { label: 'Dados da empresa', icon: 'building-2' },
        {
          label: 'Representantes e sócios',
          icon: 'users',
        },
        {
          label: 'Documentos societários',
          icon: 'file-text',
        },
        {
          label: 'Verificação e compliance',
          icon: 'badge-check',
        },
      ],
      benefits: [
        {
          title: 'Compliance total',
          description: 'Atende às normas KYC/KYB e requisitos regulatórios',
          icon: 'clipboard-check',
        },
        {
          title: 'Segurança jurídica',
          description: 'Informações validadas e auditadas',
          icon: 'scale',
        },
      ],
    },
  ];

  protected readonly reasons = [
    {
      title: 'Plataforma regulada',
      description: 'Atendimento à Resolução CMN 4.656/2018',
      icon: 'landmark',
    },
    {
      title: 'Segregação patrimonial',
      description: 'Recursos ativos em conta escrow segregada',
      icon: 'split',
    },
    {
      title: 'Rastreabilidade total',
      description: 'Todas as etapas registradas e auditáveis',
      icon: 'history',
    },
    {
      title: 'Segurança de ponta',
      description: 'Criptografia, monitoramento e prevenção a fraudes',
      icon: 'shield-check',
    },
    {
      title: 'Processo digital',
      description: '100% online, rápido e sem burocracia',
      icon: 'smartphone',
    },
  ];

  protected readonly complianceBadges = [
    { title: 'CMN', description: '4.656/2018', icon: 'landmark' },
    { title: 'PLD / FT', description: 'Prevenção', icon: 'shield-check' },
    { title: 'KYC / KYB', description: 'Verificado', icon: 'badge-check' },
    { title: 'Auditoria', description: 'Contínua', icon: 'scroll-text' },
  ];
}

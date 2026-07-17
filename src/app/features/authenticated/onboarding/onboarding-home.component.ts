import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';

interface OnboardingPath {
  label: string;
  badge: string;
  description: string;
  route: string;
  tone: 'person' | 'company';
  visual: string;
  action: string;
  steps: { label: string; icon: string }[];
  benefits: { title: string; description: string; icon: string }[];
}

@Component({
  selector: 'sep-onboarding-home',
  imports: [OperationalShellComponent, RouterLink],
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
      visual: 'visuals/visual_kyc_pessoa_fisica_hud.png',
      action: 'Iniciar como pessoa física',
      steps: [
        { label: 'Dados pessoais e contato', icon: 'icons/icon_pf_dados_pessoais.png' },
        { label: 'Validação de documentos', icon: 'icons/icon_pf_validacao_documentos.png' },
        { label: 'Verificação de identidade', icon: 'icons/icon_pf_verificacao_identidade.png' },
        {
          label: 'Auditoria e rastreabilidade',
          icon: 'icons/icon_pf_auditoria_rastreabilidade.png',
        },
      ],
      benefits: [
        {
          title: 'Rápido e seguro',
          description: 'Processo otimizado para pessoa física',
          icon: 'icons/icon_card_pf_rapido_seguro.png',
        },
        {
          title: 'Privacidade',
          description: 'Seus dados protegidos com criptografia',
          icon: 'icons/icon_card_pf_privacidade.png',
        },
      ],
    },
    {
      label: 'Empresa',
      badge: 'KYB',
      description: 'Cadastro empresarial com validação de empresa e representantes.',
      route: '/app/onboarding/empresa',
      tone: 'company',
      visual: 'visuals/visual_kyb_empresa_hud.png',
      action: 'Iniciar como empresa',
      steps: [
        { label: 'Dados da empresa', icon: 'icons/icon_empresa_dados_empresa.png' },
        {
          label: 'Representantes e sócios',
          icon: 'icons/icon_empresa_representantes_socios.png',
        },
        {
          label: 'Documentos societários',
          icon: 'icons/icon_empresa_documentos_societarios.png',
        },
        {
          label: 'Verificação e compliance',
          icon: 'icons/icon_empresa_verificacao_compliance.png',
        },
      ],
      benefits: [
        {
          title: 'Compliance total',
          description: 'Atende às normas KYC/KYB e requisitos regulatórios',
          icon: 'icons/icon_card_empresa_compliance_total.png',
        },
        {
          title: 'Segurança jurídica',
          description: 'Informações validadas e auditadas',
          icon: 'icons/icon_card_empresa_seguranca_juridica.png',
        },
      ],
    },
  ];

  protected readonly reasons = [
    {
      title: 'Plataforma regulada',
      description: 'Atendimento à Resolução CMN 4.656/2018',
      icon: 'icons/icon_motivo_plataforma_regulada.png',
    },
    {
      title: 'Segregação patrimonial',
      description: 'Recursos ativos em conta escrow segregada',
      icon: 'icons/icon_motivo_segregacao_patrimonial.png',
    },
    {
      title: 'Rastreabilidade total',
      description: 'Todas as etapas registradas e auditáveis',
      icon: 'icons/icon_motivo_rastreabilidade_total.png',
    },
    {
      title: 'Segurança de ponta',
      description: 'Criptografia, monitoramento e prevenção a fraudes',
      icon: 'icons/icon_motivo_seguranca_ponta.png',
    },
    {
      title: 'Processo digital',
      description: '100% online, rápido e sem burocracia',
      icon: 'icons/icon_motivo_processo_digital.png',
    },
  ];

  protected readonly complianceBadges = [
    { title: 'CMN', description: '4.656/2018', icon: 'icons/icon_badge_cmn.png' },
    { title: 'PLD / FT', description: 'Prevenção', icon: 'icons/icon_badge_pld_ft.png' },
    { title: 'KYC / KYB', description: 'Verificado', icon: 'icons/icon_badge_kyc_kyb.png' },
    { title: 'Auditoria', description: 'Contínua', icon: 'icons/icon_badge_auditoria.png' },
  ];
}

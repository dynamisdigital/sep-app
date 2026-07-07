import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface AssetItem {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'sep-landing',
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  protected readonly assetBase = '/image/sep_mockup_01_assets';

  protected readonly trustBadges: AssetItem[] = [
    {
      icon: `${this.assetBase}/icons/icon_regulacao_cmn.png`,
      title: 'Regulado pela',
      description: 'CMN 4.656/2018',
    },
    {
      icon: `${this.assetBase}/icons/icon_segregacao_patrimonial.png`,
      title: 'Segregação',
      description: 'Patrimonial escrow',
    },
    {
      icon: `${this.assetBase}/icons/icon_kyc_pld_prevencao.png`,
      title: 'KYC e PLD',
      description: 'Prevenção',
    },
  ];

  protected readonly platformPills: AssetItem[] = [
    {
      icon: `${this.assetBase}/icons/icon_escrow_seguro.png`,
      title: 'Escrow',
      description: 'Seguro',
    },
    {
      icon: `${this.assetBase}/icons/icon_kyc_kyb_verificado.png`,
      title: 'KYC/KYB',
      description: 'Verificado',
    },
    {
      icon: `${this.assetBase}/icons/icon_pld_prevencao.png`,
      title: 'PLD',
      description: 'Prevenção',
    },
    {
      icon: `${this.assetBase}/icons/icon_auditoria_completa.png`,
      title: 'Auditoria',
      description: 'Completa',
    },
    {
      icon: `${this.assetBase}/icons/icon_rastreabilidade_total.png`,
      title: 'Rastreabilidade',
      description: 'Total',
    },
  ];

  protected readonly workflowSteps: AssetItem[] = [
    {
      icon: `${this.assetBase}/icons/icon_fluxo_01_cadastro_verificacao.png`,
      title: 'Cadastro e Verificação',
      description:
        'Empresas e investidores se cadastram na plataforma e passam por validações KYC/KYB e checagens regulatórias.',
    },
    {
      icon: `${this.assetBase}/icons/icon_fluxo_02_proposta_analise.png`,
      title: 'Proposta e Análise',
      description:
        'A empresa solicita o crédito e a proposta é analisada com base em dados, regras e parecer técnico.',
    },
    {
      icon: `${this.assetBase}/icons/icon_fluxo_03_formalizacao_escrow.png`,
      title: 'Formalização e Escrow',
      description:
        'Com aprovação, o contrato é formalizado e o recurso fica em conta escrow segregada e auditável.',
    },
    {
      icon: `${this.assetBase}/icons/icon_fluxo_04_liberacao_acompanhamento.png`,
      title: 'Liberação e Acompanhamento',
      description:
        'Após condições cumpridas, o crédito é liberado e toda operação é acompanhada com rastreabilidade total.',
    },
  ];

  protected readonly indicators: AssetItem[] = [
    {
      icon: `${this.assetBase}/icons/icon_indicador_ambiente_regulado.png`,
      title: '100%',
      description: 'Ambiente regulado Resolução CMN 4.656/2018',
    },
    {
      icon: `${this.assetBase}/icons/icon_indicador_seguranca.png`,
      title: 'Segurança',
      description: 'Dados protegidos com criptografia de ponta',
    },
    {
      icon: `${this.assetBase}/icons/icon_indicador_rastreabilidade.png`,
      title: 'Rastreabilidade',
      description: 'Do cadastro à liquidação com auditoria completa',
    },
    {
      icon: `${this.assetBase}/icons/icon_indicador_conexao_segura.png`,
      title: 'Conexão segura',
      description: 'Empresas que precisam e investidores que confiam',
    },
    {
      icon: `${this.assetBase}/icons/icon_indicador_conformidade.png`,
      title: 'Conformidade',
      description: 'KYC, KYB, PLD e governança em todas as etapas',
    },
  ];
}

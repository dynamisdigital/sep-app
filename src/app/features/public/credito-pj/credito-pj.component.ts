import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { BANNERS_HERO } from '../landing/banners-hero';
import { FotoBannerComponent } from '../landing/foto-banner.component';
import { PublicShellComponent } from '../shared/public-shell.component';
import { SiteCartao, SiteLinha, TETO_EMPRESTIMO } from '../shared/site-conteudo';

// Página institucional de Crédito PJ. Os números vêm do que o sistema realmente pratica: o teto
// e os prazos são os parâmetros operacionais do catálogo, e as etapas são as do motor de crédito.
@Component({
  selector: 'sep-credito-pj-page',
  imports: [RouterLink, LucideAngularModule, PublicShellComponent, FotoBannerComponent],
  templateUrl: './credito-pj.component.html',
  styleUrl: './credito-pj.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditoPjComponent {
  protected readonly teto = TETO_EMPRESTIMO;
  /** Foto do topo: a mesma do banner de empresas da página inicial (ou a ilustração, se faltar). */
  protected readonly bannerEmpresas = BANNERS_HERO.find((b) => b.id === 'empresas')!;

  /** Condições. Cada linha declara o parâmetro operacional de onde sai o número. */
  protected readonly condicoes: SiteLinha[] = [
    {
      rotulo: 'Valor máximo por proposta',
      valor: TETO_EMPRESTIMO,
      origem: 'parâmetro credito.valor.maximo.pj',
    },
    {
      rotulo: 'Prazo máximo',
      valor: '24 meses',
      origem: 'parâmetro credito.prazo.maximo.pj.meses',
    },
    {
      rotulo: 'Score mínimo para pré-aprovação',
      valor: '700',
      origem: 'parâmetro credito.score.pre-aprovacao',
    },
    { rotulo: 'Finalidade', valor: 'Capital de giro', origem: 'tipo de operação do contrato' },
    { rotulo: 'Desembolso', valor: 'Pix, após a assinatura' },
    { rotulo: 'Garantia de aprovação', valor: 'Não existe' },
  ];

  protected readonly requisitos: SiteCartao[] = [
    {
      titulo: 'CNPJ ativo',
      descricao:
        'A empresa passa por KYB — verificação de dados cadastrais, quadro societário e situação fiscal — antes de qualquer proposta.',
      icone: 'building-2',
      tom: 'blue',
    },
    {
      titulo: 'Representante identificado',
      descricao:
        'O sócio ou procurador que assina responde pelo contrato e passa por KYC, com documento e verificação de identidade.',
      icone: 'user-check',
      tom: 'green',
    },
    {
      titulo: 'Consulta de PLD',
      descricao:
        'Prevenção à lavagem de dinheiro é checada para a empresa e para o representante, e o resultado fica na trilha.',
      icone: 'shield-check',
      tom: 'purple',
    },
    {
      titulo: 'Open Finance (opcional)',
      descricao:
        'Autorizar o compartilhamento do extrato melhora a leitura de capacidade de pagamento e pode elevar o score da proposta.',
      icone: 'share-2',
      tom: 'amber',
    },
  ];

  protected readonly decisao: SiteCartao[] = [
    {
      titulo: 'Em análise',
      descricao:
        'A proposta entrou na esteira. O motor avalia cadastro, score e, se houver, os dados de Open Finance.',
      icone: 'clock',
      tom: 'blue',
    },
    {
      titulo: 'Pré-aprovada',
      descricao:
        'O motor passou, mas a operação ainda depende de conferência humana no backoffice antes de virar contrato.',
      icone: 'circle-dashed',
      tom: 'amber',
    },
    {
      titulo: 'Aprovada',
      descricao:
        'A proposta virou contrato e segue para formalização: aceite, assinatura digital e desembolso por Pix.',
      icone: 'circle-check',
      tom: 'green',
    },
    {
      titulo: 'Pendência ou rejeitada',
      descricao:
        'Falta documento ou o perfil não atendeu à política vigente. O motivo fica registrado e é comunicado.',
      icone: 'circle-alert',
      tom: 'purple',
    },
  ];
}

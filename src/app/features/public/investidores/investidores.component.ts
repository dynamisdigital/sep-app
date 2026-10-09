import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { EntradaDirective } from '../shared/entrada.directive';
import { PublicShellComponent } from '../shared/public-shell.component';
import { SepIlustracaoComponent } from '../shared/sep-ilustracao.component';
import { SiteCartao, SiteEtapa, TETO_EMPRESTIMO } from '../shared/site-conteudo';

// Página "Para investidores": a metade do negócio que o site não explicava. Em uma SEP o investidor é o
// credor, quem financia as operações. A página diz como se entra, o que se vê antes de decidir, onde o
// dinheiro fica e, sempre perto de qualquer fala sobre financiar, que há risco e não há garantia.
@Component({
  selector: 'sep-investidores-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    PublicShellComponent,
    SepIlustracaoComponent,
    EntradaDirective,
  ],
  templateUrl: './investidores.component.html',
  styleUrl: './investidores.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestidoresComponent {
  protected readonly teto = TETO_EMPRESTIMO;

  protected readonly etapas: SiteEtapa[] = [
    {
      passo: '01',
      titulo: 'Cadastro e perfil',
      descricao:
        'Você se identifica, passa pelas verificações de identidade e de prevenção à lavagem de dinheiro e registra que entendeu os riscos de financiar operações de crédito.',
      icone: 'user-check',
      tom: 'green',
    },
    {
      passo: '02',
      titulo: 'Escolha',
      descricao:
        'Veja as oportunidades de capital de giro. Cada uma mostra o prazo, a taxa e a faixa de risco, com a explicação de cada fator do score.',
      icone: 'list-checks',
      tom: 'blue',
    },
    {
      passo: '03',
      titulo: 'Aporte',
      descricao:
        'Você decide quanto aportar em cada operação. O dinheiro vai para a conta segregada, e não para o caixa do Dynamis SEP.',
      icone: 'wallet',
      tom: 'green',
    },
    {
      passo: '04',
      titulo: 'Acompanhamento',
      descricao:
        'O painel mostra cada parcela: o que está paga, a vencer ou em atraso, e o histórico das ações de cobrança.',
      icone: 'chart-column',
      tom: 'blue',
    },
    {
      passo: '05',
      titulo: 'Retorno',
      descricao:
        'A cada parcela paga pelo tomador, o valor é repassado a você em prazo curto, definido pela regulamentação.',
      icone: 'banknote',
      tom: 'green',
    },
  ];

  protected readonly antesDeDecidir: SiteCartao[] = [
    {
      titulo: 'Score explicado',
      descricao:
        'Seis fatores com peso, o que foi observado e quanto cada um somou. A soma é exatamente o score, então você sabe por que a operação está onde está.',
      icone: 'gauge',
      tom: 'blue',
    },
    {
      titulo: 'Faixa de risco de A a E',
      descricao:
        'Um primeiro filtro para reduzir a lista. A faixa resume o risco, mas não substitui a leitura dos fatores.',
      icone: 'chart-column',
      tom: 'green',
    },
    {
      titulo: 'Prazo e taxa',
      descricao:
        'Quanto tempo o capital ficará parado e qual a taxa da operação, sempre antes de você aportar.',
      icone: 'calendar-clock',
      tom: 'blue',
    },
    {
      titulo: 'Inadimplência por faixa',
      descricao:
        'A plataforma divulga todo mês a inadimplência média por faixa de risco, para você ver o resultado real, e não só a expectativa.',
      icone: 'triangle-alert',
      tom: 'amber',
    },
  ];

  protected readonly quemPode: SiteCartao[] = [
    {
      titulo: 'Pessoas físicas',
      descricao:
        'Podem financiar operações depois de cadastradas e verificadas, com limite por tomador na mesma plataforma para quem não é investidor qualificado.',
      icone: 'user-round',
      tom: 'green',
    },
    {
      titulo: 'Empresas',
      descricao:
        'Pessoas jurídicas não financeiras podem aportar, com a verificação da empresa, dos sócios e de quem assina.',
      icone: 'building-2',
      tom: 'blue',
    },
    {
      titulo: 'Investidores qualificados',
      descricao:
        'Conforme a definição da Comissão de Valores Mobiliários, não têm o limite por tomador, mas passam pelas mesmas verificações.',
      icone: 'badge-check',
      tom: 'green',
    },
  ];

  protected readonly seguranca: SiteCartao[] = [
    {
      titulo: 'Dinheiro separado',
      descricao:
        'Os recursos das operações ficam em conta segregada. O Dynamis SEP não usa recursos próprios e não mistura o seu dinheiro com o caixa dele.',
      icone: 'landmark',
      tom: 'blue',
    },
    {
      titulo: 'Tudo registrado',
      descricao:
        'Cada decisão, aporte e repasse deixa registro com data, responsável e motivo. Você acompanha pela sua conta.',
      icone: 'scroll-text',
      tom: 'green',
    },
    {
      titulo: 'Sem promessa de ganho',
      descricao:
        'Não garantimos rendimento nem o pagamento das operações, e o investimento em crédito não conta com a cobertura do FGC.',
      icone: 'shield-alert',
      tom: 'amber',
    },
  ];
}

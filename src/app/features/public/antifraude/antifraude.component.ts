import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { EntradaDirective } from '../shared/entrada.directive';
import { PublicShellComponent } from '../shared/public-shell.component';
import { SepIlustracaoComponent } from '../shared/sep-ilustracao.component';
import { CONTATO_SEP, SiteCartao } from '../shared/site-conteudo';

// Página antifraude. O golpe do "pagamento para liberar o empréstimo" é o maior risco de reputação do
// setor, então ele ganha página própria, e a mesma mensagem aparece na faixa fixa do topo do site.
@Component({
  selector: 'sep-antifraude-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    PublicShellComponent,
    SepIlustracaoComponent,
    EntradaDirective,
  ],
  templateUrl: './antifraude.component.html',
  styleUrl: './antifraude.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AntifraudeComponent {
  protected readonly contato = CONTATO_SEP;

  protected readonly nunca: SiteCartao[] = [
    {
      titulo: 'Nunca pedimos pagamento antecipado',
      descricao:
        'Nenhuma taxa, depósito ou "seguro" é cobrado para liberar crédito. A única tarifa é a de originação, descontada do valor liberado e mostrada na simulação.',
      icone: 'ban',
      tom: 'amber',
    },
    {
      titulo: 'Nunca ligamos pedindo depósito',
      descricao:
        'Não fazemos contato telefônico para oferecer empréstimo, nem para pedir qualquer valor.',
      icone: 'phone-off',
      tom: 'amber',
    },
    {
      titulo: 'Nunca pedimos senha ou códigos',
      descricao:
        'Senha, código do autenticador e dados de cartão nunca são pedidos por telefone, e-mail ou mensagem.',
      icone: 'key-round',
      tom: 'amber',
    },
    {
      titulo: 'Atendemos só pelos canais oficiais',
      descricao:
        'E-mail e telefone da página Contato. Qualquer outro contato em nome do Dynamis SEP deve ser tratado como suspeito.',
      icone: 'mail-check',
      tom: 'green',
    },
  ];

  protected readonly sinais: string[] = [
    'Pede pagamento, taxa ou depósito antes de liberar o dinheiro.',
    'Chega por telefone, mensagem ou rede social, sem que você tenha pedido.',
    'Usa pressa: "só hoje", "última vaga", "aprovação garantida".',
    'Manda boleto em nome de pessoa física ou de um favorecido diferente do esperado.',
    'Promete rendimento garantido a quem quer financiar operações.',
    'Pede que você instale um aplicativo ou compartilhe a tela.',
  ];

  protected readonly passos: SiteCartao[] = [
    {
      titulo: 'Pare e não pague',
      descricao: 'Anote o número, o nome e o que foi pedido. Não faça nenhum depósito.',
      icone: 'hand',
      tom: 'amber',
    },
    {
      titulo: 'Guarde as provas',
      descricao: 'Salve mensagens, e-mails, capturas de tela e comprovantes.',
      icone: 'folder-open',
      tom: 'blue',
    },
    {
      titulo: 'Avise o canal oficial',
      descricao:
        'Escreva para o e-mail oficial com o que aconteceu, para que possamos orientar e alertar outros usuários.',
      icone: 'mail',
      tom: 'green',
    },
    {
      titulo: 'Se já pagou',
      descricao:
        'Registre boletim de ocorrência e fale com o seu banco o quanto antes, informando a transferência.',
      icone: 'siren',
      tom: 'amber',
    },
  ];
}

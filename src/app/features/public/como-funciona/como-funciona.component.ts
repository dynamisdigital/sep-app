import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PublicShellComponent } from '../shared/public-shell.component';
import { SiteCartao, SiteEtapa } from '../shared/site-conteudo';

// Página institucional "Como funciona". As seis etapas são exatamente os módulos da plataforma,
// na ordem em que a operação acontece — Onboarding, Crédito, Formalização, Pix, Cobrança e o
// acompanhamento. Descrever outra jornada aqui criaria expectativa que o produto não cumpre.
@Component({
  selector: 'sep-como-funciona-page',
  imports: [RouterLink, LucideAngularModule, PublicShellComponent],
  templateUrl: './como-funciona.component.html',
  styleUrl: './como-funciona.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComoFuncionaComponent {
  protected readonly etapas: SiteEtapa[] = [
    {
      passo: '01',
      titulo: 'Cadastro e verificação',
      descricao:
        'A empresa envia CNPJ, razão social e documentos; o representante confirma a própria identidade. KYC, KYB e PLD rodam antes de qualquer proposta existir.',
      icone: 'user-check',
      tom: 'green',
    },
    {
      passo: '02',
      titulo: 'Proposta de crédito',
      descricao:
        'Com o cadastro aprovado, a empresa informa valor, prazo e finalidade. Se autorizar o Open Finance, o extrato entra na leitura de capacidade de pagamento.',
      icone: 'credit-card',
      tom: 'blue',
    },
    {
      passo: '03',
      titulo: 'Análise e decisão',
      descricao:
        'O motor avalia cadastro e score e devolve um estado — em análise, pré-aprovada, pendência ou rejeitada. Pré-aprovação ainda passa por conferência humana.',
      icone: 'activity',
      tom: 'purple',
    },
    {
      passo: '04',
      titulo: 'Formalização',
      descricao:
        'Aprovada, a proposta vira contrato. O representante aceita as condições e assina digitalmente; cada versão do documento guarda o próprio hash.',
      icone: 'file-check',
      tom: 'amber',
    },
    {
      passo: '05',
      titulo: 'Desembolso por Pix',
      descricao:
        'Com o contrato assinado, o valor é transferido para a chave Pix da empresa. A transferência tem identificador próprio e comprovante.',
      icone: 'send',
      tom: 'green',
    },
    {
      passo: '06',
      titulo: 'Cobrança e quitação',
      descricao:
        'A agenda de parcelas nasce junto com o contrato. Cada recebimento é conciliado, e atraso entra na régua de cobrança com registro de cada contato.',
      icone: 'banknote',
      tom: 'blue',
    },
  ];

  protected readonly papeis: SiteCartao[] = [
    {
      titulo: 'Empresa tomadora',
      descricao:
        'Precisa de capital de giro. Cadastra-se, propõe, assina e paga. Acompanha agenda, parcelas e comprovantes pela própria conta.',
      icone: 'building-2',
      tom: 'blue',
    },
    {
      titulo: 'Empresa credora',
      descricao:
        'Quer aportar recursos. Cadastra-se, vê as oportunidades disponíveis e acompanha a carteira financiada operação a operação.',
      icone: 'briefcase',
      tom: 'green',
    },
    {
      titulo: 'Operação SEP',
      descricao:
        'Backoffice e financeiro cuidam da fila operacional, dos reprocessos, da conciliação Pix e da cobrança. Toda ação fica na trilha.',
      icone: 'settings',
      tom: 'purple',
    },
  ];
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CONTATO_SEP, SiteCartao, SiteLinha, TETO_EMPRESTIMO } from '../shared/site-conteudo';
import { PublicShellComponent } from '../shared/public-shell.component';

// Página institucional "Sobre o SEP". Explica o que é uma Sociedade de Empréstimo entre Pessoas
// sob a Resolução CMN 4.656/2018 e, principalmente, o que ela **não** é — a confusão com
// investimento garantido é o mal-entendido mais caro nesse mercado.
@Component({
  selector: 'sep-sobre-page',
  imports: [RouterLink, LucideAngularModule, PublicShellComponent],
  templateUrl: './sobre-o-sep.component.html',
  styleUrl: './sobre-o-sep.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SobreOSepComponent {
  protected readonly contato = CONTATO_SEP;
  protected readonly teto = TETO_EMPRESTIMO;

  protected readonly principios: SiteCartao[] = [
    {
      titulo: 'Intermediação, não intermediário de risco',
      descricao:
        'A SEP aproxima quem precisa de capital de quem quer aportar. O risco de crédito é da operação, e a plataforma não o assume nem o garante.',
      icone: 'handshake',
      tom: 'green',
    },
    {
      titulo: 'Recursos segregados',
      descricao:
        'O dinheiro das operações transita em conta segregada e não se confunde com o caixa da plataforma, em nenhum momento.',
      icone: 'landmark',
      tom: 'blue',
    },
    {
      titulo: 'Registro de ponta a ponta',
      descricao:
        'Cadastro, decisão, contrato, desembolso e cobrança deixam trilha própria, com autor, data e motivo. É o que torna a operação auditável.',
      icone: 'history',
      tom: 'purple',
    },
    {
      titulo: 'Limite que não se dobra',
      descricao: `O regimento fixa ${TETO_EMPRESTIMO} por proposta. O limite vale para todas as operações e é um parâmetro versionado, não uma política comercial.`,
      icone: 'circle-dollar-sign',
      tom: 'amber',
    },
  ];

  /** O que a plataforma não faz. Cada linha corresponde a uma confusão comum do mercado. */
  protected readonly naoSomos: string[] = [
    'Não somos banco: não captamos depósito nem oferecemos conta corrente.',
    'Não somos investimento garantido: não há rendimento prometido, nem cobertura do FGC.',
    'Não aprovamos crédito automaticamente: toda pré-aprovação passa por conferência humana.',
    'Não vendemos dados: informação de cadastro serve à operação, e não a terceiros.',
    'Não cobramos taxa para analisar proposta nem pedimos pagamento antecipado para liberar crédito.',
  ];

  protected readonly identificacao: SiteLinha[] = [
    { rotulo: 'Regime', valor: 'Resolução CMN 5.050/2022 e alterações' },
    { rotulo: 'CNPJ', valor: CONTATO_SEP.cnpj },
    { rotulo: 'Sede', valor: `${CONTATO_SEP.endereco} — ${CONTATO_SEP.cep}` },
    { rotulo: 'Canal oficial', valor: CONTATO_SEP.email },
  ];
}

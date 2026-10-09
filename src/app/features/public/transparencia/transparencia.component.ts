import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { TARIFA_ORIGINACAO_PCT } from '../../../core/financeiro/politica-credito';
import { EntradaDirective } from '../shared/entrada.directive';
import { PublicShellComponent } from '../shared/public-shell.component';
import { SepIlustracaoComponent } from '../shared/sep-ilustracao.component';
import { AUTORIZACAO_BC, CONTATO_SEP, SiteLinha } from '../shared/site-conteudo';

interface LinhaTarifa {
  servico: string;
  valor: string;
  observacao: string;
}

// Página "Transparência": identificação perante o Banco Central, tarifas, inadimplência por faixa de risco
// e canais de reclamação. A regulamentação obriga a SEP a divulgar a inadimplência todos os meses; a
// tabela existe desde já, e só passa a ter números quando houver carteira real. Nada aqui é inventado:
// o que ainda não existe aparece como "em atualização".
@Component({
  selector: 'sep-transparencia-page',
  imports: [
    RouterLink,
    LucideAngularModule,
    PublicShellComponent,
    SepIlustracaoComponent,
    EntradaDirective,
  ],
  templateUrl: './transparencia.component.html',
  styleUrl: './transparencia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransparenciaComponent {
  protected readonly consultaPublica = AUTORIZACAO_BC.consultaPublica;
  protected readonly contato = CONTATO_SEP;

  protected readonly identificacao: SiteLinha[] = [
    { rotulo: 'Nome', valor: 'Dynamis SEP — Sociedade de Empréstimo entre Pessoas' },
    { rotulo: 'CNPJ', valor: CONTATO_SEP.cnpj },
    { rotulo: 'Sede', valor: `${CONTATO_SEP.endereco} — ${CONTATO_SEP.cep}` },
    {
      rotulo: 'Autorização do Banco Central',
      valor: AUTORIZACAO_BC.referencia ?? 'Em atualização',
    },
    { rotulo: 'Regulamentação', valor: 'Resolução CMN 5.050/2022 e alterações' },
    { rotulo: 'Canal oficial', valor: CONTATO_SEP.email },
  ];

  protected readonly tarifas: LinhaTarifa[] = [
    {
      servico: 'Cadastro e verificação',
      valor: 'Sem tarifa de análise',
      observacao: 'Não cobramos para analisar cadastro ou proposta.',
    },
    {
      servico: 'Tarifa de originação',
      valor: `${(TARIFA_ORIGINACAO_PCT * 100).toLocaleString('pt-BR')}% do valor contratado`,
      observacao: 'Descontada do valor liberado e mostrada na simulação, antes do envio.',
    },
    {
      servico: 'Juros da operação',
      valor: 'Definidos em cada proposta',
      observacao: 'Aparecem na simulação, junto com o Custo Efetivo Total.',
    },
    {
      servico: 'Pagamento por Pix',
      valor: 'Sem tarifa adicional do Dynamis SEP',
      observacao: 'Tarifas do seu banco, se houver, são cobradas por ele.',
    },
  ];

  protected readonly faixas = ['A', 'B', 'C', 'D', 'E'];

  protected readonly ultimaAtualizacao = '09/10/2026';
}

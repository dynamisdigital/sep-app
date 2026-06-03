import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DecisaoParecer, ParecerCreditoResponse } from '../../../../core/api/api.models';
import { formatarData } from './credito-format';

// Label de apresentacao da decisao do parecer. So texto; nao altera a decisao.
const DECISAO_LABELS: Record<DecisaoParecer, string> = {
  APROVAR: 'Aprovado',
  REJEITAR: 'Rejeitado',
  PENDENCIA: 'Pendencia',
};

// Painel do ultimo parecer. Exibe apenas o parecer recebido da API; o web nao
// cria nem edita parecer (mesa de credito fica fora desta sprint).
@Component({
  selector: 'sep-parecer-panel',
  imports: [],
  templateUrl: './parecer-panel.component.html',
  styleUrl: './parecer-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParecerPanelComponent {
  readonly parecer = input.required<ParecerCreditoResponse>();

  protected readonly formatarData = formatarData;
  protected readonly decisaoLabel = computed(() => DECISAO_LABELS[this.parecer().decisao]);
}

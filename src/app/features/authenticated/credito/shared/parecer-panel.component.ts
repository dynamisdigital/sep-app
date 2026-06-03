import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ParecerCreditoResponse } from '../../../../core/api/api.models';
import { formatarData } from './credito-format';

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
}

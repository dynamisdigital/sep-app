import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ScoreInternoResponse } from '../../../../core/api/api.models';
import { formatarData } from './credito-format';
import { PropostaStatusComponent } from './proposta-status.component';

// Painel informativo do score do motor. Score e sugestao sao apresentados como
// vieram do backend; o web nunca calcula nem recalcula score.
@Component({
  selector: 'sep-score-panel',
  imports: [PropostaStatusComponent],
  templateUrl: './score-panel.component.html',
  styleUrl: './score-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScorePanelComponent {
  readonly score = input.required<ScoreInternoResponse>();

  protected readonly formatarData = formatarData;
}

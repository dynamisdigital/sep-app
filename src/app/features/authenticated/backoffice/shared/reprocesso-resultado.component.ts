import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ReprocessoResponse } from '../../../../core/api/api.models';
import { STATUS_REPROCESSO_LABEL, formatarDataHora, idCurto } from './backoffice-format';

// Resultado de um reprocesso disparado (status, mensagem do backend, identificador externo e
// data). Componente apresentacional reusado no painel de reprocessos e no atalho do detalhe.
// Mostra a mensagem do backend como veio — para strategies stub, o texto e neutro e nao promete
// retentativa real.
@Component({
  selector: 'sep-reprocesso-resultado',
  templateUrl: './reprocesso-resultado.component.html',
  styleUrl: './reprocesso-resultado.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReprocessoResultadoComponent {
  readonly reprocesso = input.required<ReprocessoResponse>();

  protected readonly statusLabel = STATUS_REPROCESSO_LABEL;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly idCurto = idCurto;
}

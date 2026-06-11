import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PixCard {
  label: string;
  description: string;
  route?: string;
  disabled?: boolean;
}

// Landing da jornada Pix operacional (interna; guard FINANCEIRO/ADMIN/BACKOFFICE herdado da rota
// pai). Cada operacao assistida e ativada na sua Task: desembolsos (F-13.3), recebimentos (F-13.4)
// e divergencias (F-13.5) entram como rota e card ativo quando entregues. O CTA de iniciar
// desembolso (FINANCEIRO/ADMIN) vive dentro da tela de desembolsos, nao aqui — a autorizacao real
// e sempre do backend. O card desabilitado segue o padrao da landing de Administracao.
@Component({
  selector: 'sep-pix-shell',
  imports: [RouterLink],
  templateUrl: './pix-shell.component.html',
  styleUrl: './pix-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixShellComponent {
  protected readonly cards: PixCard[] = [
    {
      label: 'Desembolsos',
      description: 'Desembolso Pix assistido e status de transferencia.',
      disabled: true,
    },
    {
      label: 'Recebimentos',
      description: 'Referencias Pix de parcelas e recebimentos conciliados.',
      disabled: true,
    },
    {
      label: 'Divergencias',
      description: 'Recebimentos nao identificados e conciliacao operacional assistida.',
      disabled: true,
    },
  ];
}

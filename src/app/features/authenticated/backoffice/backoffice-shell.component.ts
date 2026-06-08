import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface SecaoOperacional {
  label: string;
  descricao: string;
  // null enquanto a tela da secao nao foi entregue; habilitada na Task correspondente.
  route: string | null;
}

// Landing da operacao assistida do backoffice/financeiro (BACKOFFICE/FINANCEIRO/ADMIN). Cada
// secao e habilitada na Task que entrega sua tela: dashboard (F-10.3), fila (F-10.4) e
// reprocessos (F-10.6). Ate la a secao fica desabilitada em vez de apontar para rota
// inexistente. A autorizacao real permanece no backend; o route group ja e protegido por
// roleGuard.
@Component({
  selector: 'sep-backoffice-shell',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './backoffice-shell.component.html',
  styleUrl: './backoffice-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeShellComponent {
  protected readonly secoes: SecaoOperacional[] = [
    {
      label: 'Dashboard',
      descricao: 'Visao consolidada operacional e financeira.',
      route: '/app/backoffice/dashboard',
    },
    {
      label: 'Fila operacional',
      descricao: 'Triagem de itens, comentarios, resolucao e ignore.',
      route: '/app/backoffice/fila',
    },
    {
      label: 'Reprocessos',
      descricao: 'Reenvio de webhook e provider com step-up.',
      route: null,
    },
  ];
}

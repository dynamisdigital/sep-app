import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Placeholder temporario das telas financeiras de cobranca. As rotas
// /app/cobranca/financeiro/* ja existem e sao protegidas por roleGuard
// (FINANCEIRO/ADMIN) desde a F-9.2; o conteudo real entra nas Tasks F-9.4
// (agenda/recebimentos) e F-9.5 (inadimplencia), quando este componente sai.
@Component({
  selector: 'sep-cobranca-em-preparacao',
  imports: [RouterLink],
  template: `
    <section class="sep-cobranca-preparacao">
      <h1 class="sep-cobranca-preparacao-title">Em preparacao</h1>
      <p class="sep-cobranca-preparacao-body">Esta tela entra em uma proxima entrega da sprint.</p>
      <a routerLink="/app/cobranca">Voltar para cobranca</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CobrancaEmPreparacaoComponent {}

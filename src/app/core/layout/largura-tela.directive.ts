import { Directive, inject } from '@angular/core';

import { LarguraTelaService } from './largura-tela.service';

/** Marca o elemento com a largura escolhida; o CSS em `_largura-tela.scss` faz o resto. */
@Directive({
  selector: '[sepLarguraTela]',
  host: { '[attr.data-largura]': 'servico.largura()' },
})
export class LarguraTelaDirective {
  protected readonly servico = inject(LarguraTelaService);
}

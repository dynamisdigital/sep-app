import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CONTATO_SEP, TETO_EMPRESTIMO } from '../shared/site-conteudo';
import { PublicShellComponent } from '../shared/public-shell.component';

/** Uma seção do documento; a lista alimenta o índice lateral e os âncoras do texto. */
interface SecaoLegal {
  id: string;
  titulo: string;
}

@Component({
  selector: 'sep-termos-de-uso-page',
  imports: [RouterLink, LucideAngularModule, PublicShellComponent],
  templateUrl: './termos-de-uso.component.html',
  styleUrl: './termos-de-uso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermosDeUsoComponent {
  protected readonly contato = CONTATO_SEP;
  protected readonly teto = TETO_EMPRESTIMO;
  protected readonly vigencia = '21 de agosto de 2026';

  protected readonly secoes: SecaoLegal[] = [
    { id: 'aceite', titulo: '1. Aceite dos termos' },
    { id: 'plataforma', titulo: '2. O que a plataforma é' },
    { id: 'cadastro', titulo: '3. Cadastro e verificação' },
    { id: 'conta', titulo: '4. Conta e segurança' },
    { id: 'operacoes', titulo: '5. Operações de crédito' },
    { id: 'pagamentos', titulo: '6. Pagamentos e inadimplência' },
    { id: 'condutas', titulo: '7. Condutas vedadas' },
    { id: 'propriedade', titulo: '8. Propriedade intelectual' },
    { id: 'responsabilidade', titulo: '9. Limitação de responsabilidade' },
    { id: 'encerramento', titulo: '10. Suspensão e encerramento' },
    { id: 'gerais', titulo: '11. Disposições gerais' },
    { id: 'contato', titulo: '12. Contato' },
  ];
}

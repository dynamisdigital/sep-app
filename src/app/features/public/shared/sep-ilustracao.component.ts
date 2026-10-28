import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PIX_COR, PIX_LOGO_PATH } from '../../../shared/arte/pix-logo';

export type CenaIlustracao =
  | 'rede'
  | 'escudo'
  | 'fluxo'
  | 'documento'
  | 'grafico'
  | 'pix'
  | 'pessoas'
  | 'alerta'
  | 'analise'
  | 'cidade';

/**
 * Ilustrações vetoriais do site institucional: uma cena por assunto, no mesmo traço da página inicial
 * (linha fina, brilho ciano e verde). São desenhos, e não fotos: ficam nítidos em qualquer tela, trocam
 * de cor com o tema e pesam poucos bytes. Onde houver uma foto aprovada, o blog a usa no lugar (ver
 * `imagem` em `site-blog.ts`).
 */
@Component({
  selector: 'sep-ilustracao',
  templateUrl: './sep-ilustracao.component.html',
  styleUrl: './sep-ilustracao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SepIlustracaoComponent {
  protected readonly pixPath = PIX_LOGO_PATH;
  protected readonly pixCor = PIX_COR;

  readonly cena = input.required<CenaIlustracao>();
  /** Descrição para leitor de tela; vazia quando a ilustração é só decoração. */
  readonly descricao = input<string>('');
}

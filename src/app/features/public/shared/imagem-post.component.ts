import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { SepIlustracaoComponent } from './sep-ilustracao.component';
import { fotoDe, PostBlog } from './site-blog';

/**
 * Imagem de um texto do blog: a foto aprovada, quando houver (ver `FOTOS_DO_BLOG`), ou a ilustração da
 * cena. Se o arquivo da foto não carregar, a ilustração aparece no lugar, e o texto nunca fica sem imagem.
 */
@Component({
  selector: 'sep-imagem-post',
  imports: [SepIlustracaoComponent],
  template: `
    @if (foto(); as src) {
      @if (!falhou()) {
        <img [src]="src" [alt]="post().imagemAlt ?? ''" loading="lazy" (error)="falhou.set(true)" />
      }
    }
    @if (!foto() || falhou()) {
      <sep-ilustracao [cena]="post().cena" [descricao]="post().imagemAlt ?? ''" />
    }
  `,
  styles: `
    :host {
      display: block;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      border-radius: 14px;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagemPostComponent {
  readonly post = input.required<PostBlog>();
  protected readonly falhou = signal(false);
  protected readonly foto = computed(() => fotoDe(this.post()));
}

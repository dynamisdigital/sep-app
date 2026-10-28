import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { SepIlustracaoComponent } from '../shared/sep-ilustracao.component';
import { BannerHero, fotoDoBanner } from './banners-hero';

/**
 * Imagem de um banner da página inicial: a foto aprovada, quando houver, ou a ilustração da cena. Se o
 * arquivo da foto não carregar, a ilustração aparece no lugar. Foto de pessoas leva o rótulo "imagem
 * ilustrativa": ela mostra o tipo de cliente do Dynamis SEP, e não uma pessoa real nem um depoimento.
 */
@Component({
  selector: 'sep-foto-banner',
  imports: [SepIlustracaoComponent],
  template: `
    @if (foto(); as src) {
      @if (!falhou()) {
        <img
          [src]="src"
          [alt]="banner().midia.descricao"
          loading="lazy"
          (error)="falhou.set(true)"
        />
        <span class="rotulo">Imagem ilustrativa</span>
      }
    }
    @if (!foto() || falhou()) {
      <div class="arte">
        <sep-ilustracao [cena]="banner().midia.cena" [descricao]="banner().midia.descricao" />
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
      border-radius: inherit;
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      object-fit: cover;
    }

    .arte {
      --ilu-h: 100%;

      border-radius: inherit;
      display: grid;
      width: 100%;
      height: 100%;
      padding: clamp(14px, 2vw, 28px);
      place-items: center;
    }

    /* Fora da moldura, logo abaixo da imagem e alinhado à sua esquerda. O recipiente da imagem deixa
       esta faixa livre (margin-bottom) e não corta o que passa da sua borda. */
    .rotulo {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      opacity: 0.72;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoBannerComponent {
  readonly banner = input.required<BannerHero>();
  protected readonly falhou = signal(false);
  protected readonly foto = computed(() => fotoDoBanner(this.banner().id));
}

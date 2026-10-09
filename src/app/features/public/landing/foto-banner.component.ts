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
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .arte {
      --ilu-h: 100%;

      display: grid;
      width: 100%;
      height: 100%;
      padding: clamp(14px, 2vw, 28px);
      place-items: center;
    }

    .rotulo {
      position: absolute;
      bottom: 12px;
      left: 14px;
      padding: 3px 10px;
      color: rgb(var(--lp-c-texto));
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      border-radius: 99px;
      background: rgb(var(--lp-c-fundo) / 62%);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoBannerComponent {
  readonly banner = input.required<BannerHero>();
  protected readonly falhou = signal(false);
  protected readonly foto = computed(() => fotoDoBanner(this.banner().id));
}

import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AvisoCookiesService } from '../../core/privacidade/aviso-cookies.service';

/** Classe no `body` que reserva o espaco da faixa. Regra em `src/styles/index.scss`. */
const CLASSE_ESPACO = 'sep-com-aviso-cookies';

/** Altura real da faixa, medida no browser. O fallback da regra CSS cobre o instante anterior. */
const VAR_ALTURA = '--sep-aviso-cookies-altura';

/**
 * Faixa de aviso de cookies (F-Sprint 25). Montada no root, aparece em qualquer rota.
 *
 * **Informa, nao consente.** Nao ha "recusar" nem categorias porque nao ha nada a recusar: o unico
 * cookie do produto e o `sep-refresh`, necessario a autenticacao, e nao existe rastreamento de
 * terceiro. Por isso o botao diz "Entendi" e nao "Aceitar" — colher consentimento que nao e a base
 * legal aplicavel, para um cookie que nao e recusavel, seria anunciar uma escolha inexistente.
 *
 * **Nao e dialogo.** Os quatro modais do repo (`matching-aporte`, `renegociacao-tomador`,
 * `matching-detail`, `chaves-pix`) usam `role="dialog"` e prendem foco. Aqui isso seria defeito de
 * acessibilidade: o aviso nao bloqueia tarefa nenhuma, e prender o foco de quem so quer fazer login
 * transformaria uma nota de rodape em obstaculo. Vai como `region` rotulada, dispensavel a qualquer
 * momento e alcancavel por tabulacao.
 *
 * **Nao move foco e nao tem live region.** Ele ja esta no DOM na primeira renderizacao, entao nao ha
 * troca dinamica a anunciar; e mover o foco competiria com o `focus()` que as telas publicas de
 * desfecho fazem no proprio heading (F-21/F-23, travado por teste). Quem monta este componente no
 * `app.html` deve deixa-lo DEPOIS do `<router-outlet />` pela mesma razao: assim ele nasce no fim da
 * ordem de tabulacao, atras do conteudo da pagina.
 *
 * **Reserva o proprio espaco, e isso nao e refinamento visual.** Sendo `position: fixed` no rodape,
 * a faixa cobre o ULTIMO elemento de qualquer pagina, e rolar ate o fim nao resolve — o elemento
 * fixo continua por cima. O Playwright provou o efeito antes de qualquer suposicao: em
 * `onboarding.spec.ts:48` o botao "Iniciar onboarding" e o ultimo do formulario, e as 51 tentativas
 * de clique foram interceptadas por esta `<section>`, nomeada pelo proprio relatorio. Nao era
 * problema de teste: um usuario de primeira visita tambem nao conseguiria submeter o onboarding.
 *
 * A correcao acrescenta `padding-bottom` ao `body` enquanto a faixa existe, no mesmo precedente do
 * `ThemeService`, que alterna classe no `documentElement` (`theme.service.ts:51-53`). A classe e
 * dirigida pelo signal — logo, testavel em unidade —, enquanto a altura exata vem do
 * `ResizeObserver`, porque a faixa quebra em duas linhas em telas estreitas e um numero fixo mentiria
 * em algum viewport. Em teste `offsetHeight` e sempre 0 (happy-dom nao faz layout), entao quem prova
 * o comportamento real e o e2e, nao o unit.
 */
@Component({
  selector: 'sep-aviso-cookies',
  imports: [RouterLink],
  templateUrl: './aviso-cookies.component.html',
  styleUrl: './aviso-cookies.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoCookiesComponent implements AfterViewInit, OnDestroy {
  private readonly avisoCookies = inject(AvisoCookiesService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private observer?: ResizeObserver;

  protected readonly visivel = this.avisoCookies.avisoVisivel;

  constructor() {
    effect(() => {
      this.document.body.classList.toggle(CLASSE_ESPACO, this.visivel());
      if (!this.visivel()) {
        this.document.body.style.removeProperty(VAR_ALTURA);
      }
    });
  }

  ngAfterViewInit(): void {
    // `ResizeObserver` pode nao existir em runtime nao-browser; sem ele, a regra CSS cai no fallback.
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.observer = new ResizeObserver(() => this.sincronizarAltura());
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.document.body.classList.remove(CLASSE_ESPACO);
    this.document.body.style.removeProperty(VAR_ALTURA);
  }

  protected dispensar(): void {
    this.avisoCookies.marcarComoVisto();
  }

  private sincronizarAltura(): void {
    const altura = this.host.nativeElement.offsetHeight;
    if (altura > 0) {
      this.document.body.style.setProperty(VAR_ALTURA, `${altura}px`);
    }
  }
}

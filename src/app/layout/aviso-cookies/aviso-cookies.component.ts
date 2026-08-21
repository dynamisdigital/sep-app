import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AvisoCookiesService } from '../../core/privacidade/aviso-cookies.service';

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
 */
@Component({
  selector: 'sep-aviso-cookies',
  imports: [RouterLink],
  templateUrl: './aviso-cookies.component.html',
  styleUrl: './aviso-cookies.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoCookiesComponent {
  private readonly avisoCookies = inject(AvisoCookiesService);

  protected readonly visivel = this.avisoCookies.avisoVisivel;

  protected dispensar(): void {
    this.avisoCookies.marcarComoVisto();
  }
}

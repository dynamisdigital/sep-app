import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pagina publica de politica de privacidade e cookies (F-Sprint 25).
 *
 * Alcancavel sem sessao e por URL direta — e destino do link do aviso de cookies, que aparece antes
 * de qualquer autenticacao. Por isso NAO faz chamada de rede nenhuma: um usuario de primeira visita,
 * sem token, tem de conseguir ler o que gravamos no navegador dele.
 *
 * Cada afirmacao da copy foi conferida na fonte, e a lista abaixo e o que torna a pagina auditavel.
 * Qualquer mudanca de comportamento em um destes pontos OBRIGA a reconferir o texto:
 *
 * - **`sep-refresh` e o unico cookie do produto.** `RefreshCookieService.construirCookie` e o unico
 *   ponto que emite `Set-Cookie` no `sep-api` (`RefreshCookieService.java:62-68`).
 * - **`HttpOnly` e o unico atributo fixo em codigo** (`RefreshCookieService.java:64`). Nome, path,
 *   `Secure`, `SameSite`, `Domain` e validade sao configuraveis por ambiente
 *   (`application.yml:77`, `:93-97`), e por isso o texto descreve a politica de producao sem alegar
 *   medicao do ambiente de quem le.
 * - **Escopo `/api/v1/auth`** (`RefreshCookieProperties.java:21`): o cookie nao viaja nas demais
 *   rotas da API.
 * - **30 dias** = `refresh-expiration-seconds` 2592000 (`application.yml:77`), e o logout remove com
 *   `Max-Age=0` (`RefreshCookieService.java:57-60`).
 * - **Tres chaves de `localStorage`**: `SEP_ACCESS_TOKEN` e `SEP_PENDING_MFA_CHALLENGE`
 *   (`auth.service.ts:9-10`, removidas no logout em `:84-85`) e `SEP_THEME` (`theme.service.ts:6`).
 *   `NG_APP_USE_MSW` (`main.ts:9`) NAO entra: nao existe em build de producao, e cita-la confundiria
 *   o leitor com um artefato de desenvolvimento.
 * - **`sessionStorage` sem uso**: nenhuma escrita em `src/`; `chave-pix-intencao.store.ts:15`
 *   registra que a store vive so em memoria, de proposito.
 * - **Sem rastreamento de terceiro**: `index.html` nao carrega script externo, e nao ha biblioteca
 *   de analytics, marketing ou pixel no bundle.
 *
 * A ausencia de opcao de recusa e afirmada de proposito, e nao omitida: o unico cookie e necessario
 * a autenticacao, entao nao ha o que recusar sem desligar o login. Anunciar escolha inexistente
 * seria pior que nao anunciar nada.
 *
 * O texto ainda NAO passou por revisao juridica — as secoes que nao derivam de medicao (base legal,
 * direitos do titular, encarregado) estao nomeadas como pendentes, nunca preenchidas com texto
 * inventado. O marcador e visivel na pagina, nao um comentario aqui: quem le precisa saber.
 */
@Component({
  selector: 'sep-politica-privacidade-page',
  imports: [RouterLink],
  templateUrl: './politica-privacidade-page.component.html',
  styleUrl: './politica-privacidade-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaPrivacidadePageComponent implements AfterViewInit {
  private readonly titulo = viewChild.required<ElementRef<HTMLHeadingElement>>('titulo');

  ngAfterViewInit(): void {
    // Mesmo motivo da `/account-locked`: o Angular nao move foco na navegacao e o app nao tem live
    // region de rota. Sem isto, quem chega aqui pelo link do aviso de cookies fica com o foco em
    // <body>, em silencio, numa pagina nova.
    this.titulo().nativeElement.focus();
  }
}

import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';

/**
 * A ordem no DOM e requisito de acessibilidade, nao estetica — por isso e travada aqui e nao apenas
 * comentada.
 *
 * As telas publicas de desfecho movem foco para o proprio `<h1>` em `ngAfterViewInit` (F-21/F-23).
 * Com o aviso ANTES do `<router-outlet />`, ele nasceria na frente do conteudo na ordem de
 * tabulacao, e quem chega em `/account-locked` tabularia por uma nota sobre cookies antes de
 * alcancar a pagina que explica o bloqueio da conta. Depois do outlet, ele cai no fim da ordem,
 * onde uma nota de rodape pertence.
 */
describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('classe esta definida', () => {
    expect(App).toBeDefined();
  });

  it('monta o aviso de cookies junto do outlet de rotas', async () => {
    const { container } = await render(App, { providers: [provideRouter([])] });

    expect(container.querySelector('router-outlet')).not.toBeNull();
    expect(container.querySelector('sep-aviso-cookies')).not.toBeNull();
  });

  it('renderiza o outlet ANTES do aviso, para o aviso nao preceder o conteudo', async () => {
    const { container } = await render(App, { providers: [provideRouter([])] });

    const outlet = container.querySelector('router-outlet');
    const aviso = container.querySelector('sep-aviso-cookies');
    const posicao = outlet?.compareDocumentPosition(aviso as Node);

    // DOCUMENT_POSITION_FOLLOWING: o aviso vem depois do outlet no documento.
    expect(posicao).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AvisoCookiesComponent } from './aviso-cookies.component';
import { PUBLIC_ROUTES } from '../../features/public/public.routes';

const AVISO_KEY = 'SEP_AVISO_COOKIES';
const ROTA_POLITICA = '/politica-de-privacidade';

/**
 * O servico real entra no teste de proposito, em vez de um duble. Ele ja tem cobertura propria em
 * `aviso-cookies.service.spec.ts`, e o que importa aqui e o efeito observavel — a faixa some e o
 * navegador guarda o registro. Um spy provaria que o metodo foi chamado, nao que o aviso sumiu.
 *
 * As rotas publicas reais tambem entram: assim o `routerLink` e resolvido contra a configuracao de
 * verdade, e apontar para um caminho que nao existe muda o `href` renderizado. Sem isso, um
 * `routerLink` morto passaria verde — o defeito que a Sprint 34 achou duas vezes.
 */
async function renderizar() {
  return render(AvisoCookiesComponent, { providers: [provideRouter(PUBLIC_ROUTES)] });
}

describe('AvisoCookiesComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exibe a faixa como region rotulada na primeira visita', async () => {
    await renderizar();

    expect(screen.getByRole('region', { name: /aviso de cookies/i })).toBeInTheDocument();
  });

  it('nao exibe nada quando o usuario ja dispensou a versao corrente', async () => {
    window.localStorage.setItem(AVISO_KEY, '1');

    await renderizar();

    expect(screen.queryByRole('region', { name: /aviso de cookies/i })).not.toBeInTheDocument();
  });

  it('dispensa a faixa no clique e registra para nao reexibir', async () => {
    await renderizar();

    fireEvent.click(screen.getByRole('button', { name: /entendi/i }));

    expect(screen.queryByRole('region', { name: /aviso de cookies/i })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(AVISO_KEY)).toBe('1');
  });

  it('leva para a politica de privacidade, numa rota que existe', async () => {
    await renderizar();

    const link = screen.getByRole('link', { name: /politica de privacidade/i });
    expect(link.getAttribute('href')).toBe(ROTA_POLITICA);
  });

  it('nao e dialogo: nao prende foco nem se anuncia como modal', async () => {
    const { container } = await renderizar();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-modal]')).toBeNull();
    expect(container.querySelector('[autofocus]')).toBeNull();
  });

  it('nao move o foco ao montar: nao disputa com o heading das telas publicas', async () => {
    await renderizar();

    // As telas de desfecho publicas movem foco para o proprio <h1> em ngAfterViewInit (F-21/F-23).
    // Se esta faixa tambem movesse, ela venceria por montar depois — e o usuario de leitor de tela
    // ouviria o aviso de cookies em vez de saber que a conta foi bloqueada.
    expect(document.activeElement).toBe(document.body);
  });

  it('nao usa live region: a faixa ja nasce no DOM, nao ha troca a anunciar', async () => {
    const { container } = await renderizar();

    expect(container.querySelector('[aria-live]')).toBeNull();
  });
});

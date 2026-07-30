import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';

import { AccountLockedComponent } from './account-locked.component';

/**
 * A copy E o contrato desta pagina: ela responde a 423 de qualquer endpoint, sem mensagem do
 * servidor. Por isso o teste fixa o texto integral em vez de listar frases proibidas — uma
 * denylist so cobre as palavras que quem escreveu o teste imaginou. Verificado por mutacao: com os
 * asserts de ausencia anteriores (`alguns minutos`, `entre em contato`, `solicit`), trocar a copy
 * por "acione o atendimento e peca a reativacao" passava verde.
 *
 * Qualquer mudanca de copy DEVE quebrar aqui e ser reconferida contra o sep-api.
 */
const COPY_ESPERADA = [
  // Badge e heading sao irmaos sem espaco entre eles no DOM renderizado, dai virem colados aqui.
  '423Conta bloqueada temporariamente',
  'Detectamos varias tentativas de acesso malsucedidas — senha ou codigo de verificacao.',
  'Por seguranca, sua conta fica bloqueada por ate 30 minutos, contados a partir da ultima tentativa.',
  'O desbloqueio e automatico e acontece so por expiracao desse prazo: nao existe liberacao manual.',
  'Depois disso, basta entrar de novo.',
  'Se voce nao reconhece essas tentativas, troque sua senha assim que o acesso for restabelecido.',
  'Voltar ao login',
].join(' ');

async function renderPagina() {
  // O componente so importa RouterLink; provideRouter([]) basta para o link resolver.
  return render(AccountLockedComponent, { providers: [provideRouter([])] });
}

function textoNormalizado(elemento: Element | null | undefined): string {
  return (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('AccountLockedComponent', () => {
  it('anuncia o bloqueio no heading', async () => {
    await renderPagina();

    expect(
      screen.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
    ).toBeTruthy();
  });

  it('exibe exatamente a copy conferida contra o sep-api', async () => {
    const { container } = await renderPagina();

    expect(textoNormalizado(container.querySelector('.sep-account-locked-card'))).toBe(
      COPY_ESPERADA,
    );
  });

  it('expoe a pagina como landmark main, com a regiao nomeada pelo heading', async () => {
    await renderPagina();

    // Sem landmark o conteudo fica fora de qualquer regiao navegavel (`app.html` e so um
    // <router-outlet />). O padrao do repo e <main> + <section aria-labelledby>, como em
    // `access-denied`, `login` e `landing`. Seguem sem landmark `verify-totp` e `redirect-to-app`
    // — registrados como follow-up, nao corrigidos aqui.
    const principal = screen.getByRole('main');
    const regiao = screen.getByRole('region', { name: /conta bloqueada temporariamente/i });

    expect(principal.contains(regiao)).toBe(true);
  });

  it('move o foco para o heading, por ser destino de redirect automatico', async () => {
    await renderPagina();

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
    );
  });

  it('oferece o caminho de volta para /login', async () => {
    await renderPagina();

    const voltar = screen.getByRole('link', { name: /voltar ao login/i });

    expect(voltar.getAttribute('href')).toBe('/login');
  });
});

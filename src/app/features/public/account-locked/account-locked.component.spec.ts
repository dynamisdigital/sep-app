import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpResponse, http } from 'msw';

import { AccountLockedComponent } from './account-locked.component';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { server } from '../../../../mocks/server';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';
const URL_POLITICA = 'http://localhost:8080/api/v1/auth/politica-lockout';

/**
 * Valores distintos entre si e diferentes dos defaults (5/15/30) de proposito: com 3/10/45, trocar
 * `windowMinutes` por `lockoutMinutes` no template quebra o teste. Com os defaults, nao quebraria
 * se o mock e o codigo coincidissem por acaso.
 */
const POLITICA_DE_TESTE = { maxAttempts: 3, windowMinutes: 10, lockoutMinutes: 45 };

// Badge e heading sao irmaos sem espaco entre eles no DOM renderizado, dai virem colados aqui — e
// o paragrafo seguinte tambem cola, porque ele virou interpolacao pura e o Angular descarta os nos
// de whitespace entre elementos (`preserveWhitespaces: false` e o default). Nao muda o render: sao
// elementos de bloco.
const CABECALHO = '423Conta bloqueada temporariamente';

/** Trecho que nao depende da politica, identico nas duas variantes. */
const RODAPE = [
  'O desbloqueio e automatico e acontece so por expiracao desse prazo: nao existe liberacao manual.',
  'Depois disso, basta entrar de novo.',
  'Se voce nao reconhece essas tentativas, troque sua senha assim que o acesso for restabelecido.',
  'Voltar ao login',
].join(' ');

/**
 * A copy E o contrato desta pagina: ela responde a 423 de qualquer endpoint, sem mensagem do
 * servidor. Por isso o teste fixa o texto integral em vez de listar frases proibidas — uma
 * denylist so cobre as palavras que quem escreveu o teste imaginou. Verificado por mutacao: com os
 * asserts de ausencia anteriores (`alguns minutos`, `entre em contato`, `solicit`), trocar a copy
 * por "acione o atendimento e peca a reativacao" passava verde.
 *
 * O que e contrato agora e o MOLDE da frase, nao a string: os tres numeros vem do ambiente, pelo
 * `GET /auth/politica-lockout`. Qualquer mudanca de copy DEVE quebrar aqui e ser reconferida contra
 * o sep-api.
 */
const COPY_COM_POLITICA =
  `${CABECALHO}Detectamos 3 ou mais tentativas de acesso malsucedidas em 10 minutos — senha ou ` +
  'codigo de verificacao. Por seguranca, sua conta fica bloqueada por ate 45 minutos, contados a ' +
  `partir da ultima tentativa. ${RODAPE}`;

/**
 * Fallback. Nao cita numero de proposito: ele e o estado inicial de toda renderizacao, nao so do
 * endpoint fora do ar, e um literal aqui mentiria sob override de ambiente para quem le a tela antes
 * da resposta chegar — inclusive leitor de tela, que nao ouve a correcao.
 */
const COPY_SEM_POLITICA =
  `${CABECALHO}Detectamos varias tentativas de acesso malsucedidas — senha ou codigo de ` +
  'verificacao. Por seguranca, sua conta fica bloqueada por um periodo limitado, contado a partir ' +
  `da ultima tentativa. ${RODAPE}`;

function stubPolitica(resolver: Parameters<typeof http.get>[1]): void {
  server.use(http.get(URL_POLITICA, resolver));
}

async function renderPagina() {
  // `provideHttpClient` com o authInterceptor real: a pagina passou a fazer uma request, e a
  // isencao do endpoint publico e parte do comportamento sob teste (ver o ultimo caso).
  return render(AccountLockedComponent, {
    providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor]))],
  });
}

/** Deixa a resposta do MSW chegar ao signal e o template repintar. */
async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
  fixture.detectChanges();
}

function textoNormalizado(elemento: Element | null | undefined): string {
  return (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function textoDoCard(container: Element): string {
  return textoNormalizado(container.querySelector('.sep-account-locked-card'));
}

describe('AccountLockedComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubPolitica(() => HttpResponse.json(POLITICA_DE_TESTE));
  });

  it('anuncia o bloqueio no heading', async () => {
    await renderPagina();

    expect(
      screen.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
    ).toBeTruthy();
  });

  it('exibe exatamente a copy derivada da politica do backend', async () => {
    const { fixture, container } = await renderPagina();

    await estabilizar(fixture);

    expect(textoDoCard(container)).toBe(COPY_COM_POLITICA);
  });

  it('nasce completa com a copy de fallback, antes de qualquer resposta', async () => {
    // Requisito, nao detalhe: a pagina e destino de redirect e alcancavel por URL direta. Nada aqui
    // pode ficar `@if`-gated na resposta — o assert vem ANTES de estabilizar de proposito.
    const { container } = await renderPagina();

    expect(textoDoCard(container)).toBe(COPY_SEM_POLITICA);
  });

  it('continua funcional quando a consulta da politica falha', async () => {
    stubPolitica(() => new HttpResponse(null, { status: 500 }));

    const { fixture, container } = await renderPagina();
    await estabilizar(fixture);

    expect(textoDoCard(container)).toBe(COPY_SEM_POLITICA);
    expect(
      screen.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: /voltar ao login/i }).getAttribute('href')).toBe(
      '/login',
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

  it('move o foco para o heading e nao o perde quando a politica chega', async () => {
    // A chegada da politica troca um text node; se alguem puser o heading dentro de um @if guiado
    // pelo signal, o no e recriado e o foco cai em <body> — num desfecho de evento de seguranca.
    const { fixture } = await renderPagina();

    await estabilizar(fixture);

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
    );
  });

  it('flexiona o singular quando a politica tem valores de 1', async () => {
    stubPolitica(() => HttpResponse.json({ maxAttempts: 1, windowMinutes: 1, lockoutMinutes: 1 }));

    const { fixture, container } = await renderPagina();
    await estabilizar(fixture);

    expect(textoDoCard(container)).toContain(
      '1 ou mais tentativas de acesso malsucedidas em 1 minuto',
    );
    expect(textoDoCard(container)).toContain('bloqueada por ate 1 minuto,');
  });

  it('oferece o caminho de volta para /login', async () => {
    await renderPagina();

    const voltar = screen.getByRole('link', { name: /voltar ao login/i });

    expect(voltar.getAttribute('href')).toBe('/login');
  });

  it('nao manda o token velho do storage para o endpoint publico', async () => {
    // Cenario real: /account-locked alcancada por URL direta ou reload, com o token ainda no
    // storage. Se o Authorization viajar, o sep-api responde 401 e o errorInterceptor ARRANCA o
    // usuario para /login. O header e capturado dentro do handler porque a request sai na
    // construcao do componente — um espiao instalado depois do render() chegaria tarde.
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'token-expirado');
    let autorizacao: string | null = null;
    // Replica o tripwire do handler global: mantem o teste auto-contido e faz a consequencia
    // (copy degradada) aparecer junto da causa (header vazado).
    stubPolitica(({ request }) => {
      autorizacao = request.headers.get('Authorization');
      return autorizacao
        ? new HttpResponse(null, { status: 401 })
        : HttpResponse.json(POLITICA_DE_TESTE);
    });

    const { fixture, container } = await renderPagina();
    await estabilizar(fixture);

    expect(autorizacao).toBeNull();
    expect(textoDoCard(container)).toBe(COPY_COM_POLITICA);
  });
});

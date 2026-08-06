import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpResponse, http } from 'msw';

import { AccountLockedComponent } from './account-locked.component';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { server } from '../../../../mocks/server';
import { estabilizar } from '../../../../testing/estabilizar';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';
const URL_POLITICA = 'http://localhost:8080/api/v1/auth/politica-lockout';

/**
 * Valores distintos entre si e diferentes dos defaults (5/15/30) de proposito: com 3/10/45, trocar
 * `windowMinutes` por `lockoutMinutes` no template quebra o teste. Com os defaults, nao quebraria
 * se o mock e o codigo coincidissem por acaso.
 */
const POLITICA_DE_TESTE = { maxAttempts: 3, windowMinutes: 10, lockoutMinutes: 45 };

/**
 * Trechos que nao dependem da politica, identicos nas duas variantes. Cada entrada e UM elemento do
 * card, na ordem do template — badge, heading, paragrafo variavel, dois paragrafos fixos e o link.
 */
const BADGE = '423';
const TITULO = 'Conta bloqueada temporariamente';
const RODAPE = [
  'O desbloqueio e automatico e acontece so por expiracao desse prazo: nao existe liberacao ' +
    'manual. Depois disso, basta entrar de novo.',
  'Se voce nao reconhece essas tentativas, troque sua senha assim que o acesso for restabelecido.',
  'Voltar ao login',
];

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
 *
 * **Por elemento, e nao um textContent unico** (F-24.7): a versao anterior comparava o card inteiro
 * como uma string so, o que obrigava a codificar na expectativa que badge e heading vem **colados**
 * (`'423Conta bloqueada temporariamente'`). Medido: reindentar o template ou juntar os dois na mesma
 * linha nao quebrava — `preserveWhitespaces: false` descarta whitespace ENTRE elementos —, mas
 * quebrar linha DENTRO do `<span>` do badge derrubava tres testes, sem que uma letra da copy mudasse.
 * E reformatacao que o proprio prettier faz. Comparando elemento a elemento, a fronteira deixa de
 * existir e a deteccao de mudanca de texto fica intacta.
 */
const COPY_COM_POLITICA = [
  BADGE,
  TITULO,
  'Detectamos 3 ou mais tentativas de acesso malsucedidas em 10 minutos — senha ou codigo de ' +
    'verificacao. Por seguranca, sua conta fica bloqueada por ate 45 minutos, contados a partir da ' +
    'ultima tentativa.',
  ...RODAPE,
];

/**
 * Fallback. Nao cita numero de proposito: ele e o estado inicial de toda renderizacao, nao so do
 * endpoint fora do ar, e um literal aqui mentiria sob override de ambiente para quem le a tela antes
 * da resposta chegar — inclusive leitor de tela, que nao ouve a correcao.
 */
const COPY_SEM_POLITICA = [
  BADGE,
  TITULO,
  'Detectamos varias tentativas de acesso malsucedidas — senha ou codigo de verificacao. Por ' +
    'seguranca, sua conta fica bloqueada por um periodo limitado, contado a partir da ultima ' +
    'tentativa.',
  ...RODAPE,
];

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

function textoNormalizado(elemento: Element | null | undefined): string {
  return (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Texto de CADA elemento do card, normalizado e na ordem do DOM. Comparar por elemento — e nao o
 * `textContent` concatenado do card — e o que torna o teste indiferente a whitespace de formatacao
 * sem afrouxar a deteccao de mudanca de copy.
 */
function textosDoCard(container: Element): string[] {
  const card = container.querySelector('.sep-account-locked-card');
  return Array.from(card?.children ?? []).map((el) => textoNormalizado(el));
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

    expect(textosDoCard(container)).toEqual(COPY_COM_POLITICA);
  });

  it('nasce completa com a copy de fallback, antes de qualquer resposta', async () => {
    // Requisito, nao detalhe: a pagina e destino de redirect e alcancavel por URL direta. Nada aqui
    // pode ficar `@if`-gated na resposta — o assert vem ANTES de estabilizar de proposito.
    const { container } = await renderPagina();

    expect(textosDoCard(container)).toEqual(COPY_SEM_POLITICA);
  });

  it('continua funcional quando a consulta da politica falha', async () => {
    stubPolitica(() => new HttpResponse(null, { status: 500 }));

    const { fixture, container } = await renderPagina();
    await estabilizar(fixture);

    expect(textosDoCard(container)).toEqual(COPY_SEM_POLITICA);
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

    expect(textosDoCard(container).join(' ')).toContain(
      '1 ou mais tentativas de acesso malsucedidas em 1 minuto',
    );
    expect(textosDoCard(container).join(' ')).toContain('bloqueada por ate 1 minuto,');
  });

  it('oferece o caminho de volta para /login', async () => {
    await renderPagina();

    const voltar = screen.getByRole('link', { name: /voltar ao login/i });

    expect(voltar.getAttribute('href')).toBe('/login');
  });

  it('nao manda o token velho do storage para o endpoint publico', async () => {
    // Cenario real: /account-locked alcancada por URL direta ou reload, com o token ainda no
    // storage. Se o Authorization viajar, o sep-api responde 401 e a pagina cai na copy de
    // fallback. A F-24.1 tirou a consequencia pior: o `errorInterceptor` nao ARRANCA mais o usuario
    // para /login, porque tambem consulta a lista de rotas publicas. Sao duas camadas com alvos
    // diferentes — esta isencao no `authInterceptor` protege o CONTEUDO da pagina, a do
    // `errorInterceptor` protege a PAGINA. O header e capturado dentro do handler porque a request
    // sai na construcao do componente — um espiao instalado depois do render() chegaria tarde.
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
    expect(textosDoCard(container)).toEqual(COPY_COM_POLITICA);
  });
});

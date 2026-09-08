import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { VerifyTotpComponent } from './verify-totp.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { authInterceptor } from '../../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { server } from '../../../../../mocks/server';
import { estabilizar } from '../../../../../testing/estabilizar';

const VERIFY_URL = 'http://localhost:8080/api/v1/auth/totp/verify';
const PENDING_MFA_CHALLENGE_KEY = 'SEP_PENDING_MFA_CHALLENGE';
const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

/** Corpo de sucesso no formato real de `TokenResponse` + `UsuarioResponse`. */
function sucesso(overrides: Record<string, unknown> = {}): Response {
  return HttpResponse.json({
    accessToken: 'token-1',
    tokenType: 'Bearer',
    expiresIn: 900,
    usuario: {
      id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771010',
      username: 'a@b.com',
      role: 'CLIENTE',
      dataCriacao: '2026-07-31T09:00:00Z',
      dataModificacao: '2026-07-31T09:00:00Z',
      criadoPor: 'system',
      modificadoPor: 'system',
      precisaRedefinirSenha: false,
      mfaHabilitado: true,
      ...overrides,
    },
  });
}

/**
 * Versao regex para os asserts de ausencia. `queryByText` com string compara o texto normalizado do
 * no INTEIRO, entao uma mensagem que apenas *contenha* a copy de codigo invalido escaparia — e o
 * usuario voltaria a ser acusado de digitar o codigo errado num 423, num 429 ou numa queda de rede,
 * que e exatamente o bug desta Task.
 */
const ACUSA_CODIGO = /codigo (totp )?invalido/i;

/**
 * O componente le `pendingMfaChallenge` no construtor, e o AuthService inicializa esse signal a
 * partir do localStorage. Sem semear a chave ANTES do render, todo teste cai no ramo
 * `challengeAusente` e o formulario nem existe no DOM — o spec passaria sem exercitar nada.
 */
function semearChallenge(valor = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'): void {
  window.localStorage.setItem(PENDING_MFA_CHALLENGE_KEY, valor);
}

/**
 * `comInterceptors` monta a cadeia HTTP real, para provar que a navegacao do 423 vem do
 * errorInterceptor e nao do componente. O ramo sem interceptor prova que o mapeamento de mensagem
 * independe do redirect.
 */
async function setup(opts: { comInterceptors?: boolean; comAuth?: boolean } = {}) {
  // `comAuth` acrescenta o authInterceptor, na ordem RELATIVA de `app.config.ts` (auth antes de
  // error). Nao e a cadeia inteira: `clientChannel` e `stepUp` ficam de fora porque nenhum dos dois
  // toca esta rota (`step-up.interceptor.ts:37-64` nao casa `/auth/totp/verify`); a cadeia real so e
  // exercitada no e2e. Sem o authInterceptor aqui, um teste de "o token nao viaja" provaria apenas
  // que o componente nao anexa header sozinho — coisa que ele nunca fez.
  const interceptors = [
    ...(opts.comAuth ? [authInterceptor] : []),
    ...(opts.comInterceptors ? [errorInterceptor] : []),
  ];
  return render(VerifyTotpComponent, {
    providers: [
      // provideRouter([]) DE PROPOSITO sem as rotas reais: registrar /account-locked deixaria uma
      // navegacao de verdade acontecer e mascararia um stub de navigateByUrl faltando.
      provideRouter([]),
      interceptors.length ? provideHttpClient(withInterceptors(interceptors)) : provideHttpClient(),
    ],
  });
}

/**
 * Handler por teste, nao permanente: `src/mocks/handlers.ts` nao tem nenhuma rota de /auth/totp/*,
 * e adicionar uma la mudaria o comportamento de specs distantes.
 */
function stubVerify(resposta: () => Response): void {
  server.use(http.post(VERIFY_URL, resposta));
}

/**
 * Corpo `ErrorResponseDto` no formato que o sep-api realmente emite.
 *
 * `codigo` e opcional aqui pelo mesmo motivo que e opcional no contrato: backend anterior a Sprint
 * 36, handler sem taxonomia e os `401`/`403`/`429` da cadeia de seguranca chegam sem ele. Omitir o
 * parametro produz exatamente o corpo pre-36 — e e o que sustenta os testes de compatibilidade.
 */
function erroDaApi(status: number, error: string, message: string, codigo?: string): Response {
  return HttpResponse.json(
    {
      timestamp: '2026-07-31T09:00:00Z',
      status,
      error,
      message,
      path: '/api/v1/auth/totp/verify',
      ...(codigo === undefined ? {} : { codigo }),
    },
    { status },
  );
}

function espiarNavegacao(fixture: ComponentFixture<unknown>): () => string | null {
  const router = fixture.debugElement.injector.get(Router);
  let destino: string | null = null;
  router.navigateByUrl = (url: string) => {
    destino = url;
    return Promise.resolve(true);
  };
  return () => destino;
}

function preencherEEnviar(codigo = '123456'): void {
  fireEvent.input(screen.getByTestId('sep-verify-totp-input'), { target: { value: codigo } });
  fireEvent.click(screen.getByTestId('sep-verify-totp-submit'));
}

function textoDoErro(): string {
  return screen.getByTestId('sep-verify-totp-error').textContent?.trim() ?? '';
}

/**
 * Texto do bloco terminal — o ramo em que o formulario **nao existe**. Ler por aqui, e nao por
 * `textoDoErro`, e o que torna os dois desfechos distinguiveis: uma assercao so de texto passaria
 * nos dois ramos e nao provaria qual deles o codigo escolheu.
 */
function textoTerminal(): string {
  return screen.getByTestId('sep-verify-totp-no-challenge').textContent?.trim() ?? '';
}

/** O formulario sumiu: redigitar deixou de ser oferecido. E a metade do ramo que o texto nao prova. */
function esperarFormularioAusente(): void {
  expect(screen.queryByTestId('sep-verify-totp-input')).toBeNull();
  expect(screen.queryByTestId('sep-verify-totp-submit')).toBeNull();
}

/** O CTA precisa voltar a ser clicavel apos erro, senao so um reload permite tentar de novo. */
function esperarCtaLiberado(): void {
  const cta = screen.getByTestId('sep-verify-totp-submit') as HTMLButtonElement;
  expect(cta.disabled).toBe(false);
}

describe('VerifyTotpComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('token velho no storage NAO viaja para /auth/totp/verify', async () => {
    // Caminho inteiro do challenge, nao so a isencao no interceptor. `handleTokenResponse`
    // (`auth.service.ts:124-128`) retorna cedo no ramo `mfaRequired` SEM limpar o ACCESS_TOKEN_KEY,
    // entao o token de uma sessao anterior sobrevive ate aqui. Antes da F-24.2 ele viajava, o
    // `JwtAuthenticationFilter` respondia 401 via `sendError` e o usuario perdia o desafio de MFA.
    semearChallenge();
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'token-expirado');
    // Sentinela distinta de `null`: se o handler nao rodar, o assert falha em vez de passar por
    // ausencia de request — que e como um teste destes vira vacuo.
    let authHeader: string | null = 'HANDLER_NAO_RODOU';
    server.use(
      http.post(VERIFY_URL, ({ request }) => {
        authHeader = request.headers.get('Authorization');
        return sucesso();
      }),
    );
    const { fixture } = await setup({ comAuth: true });
    // Sem espiar, o sucesso dispara `navigateByUrl('/app/dashboard')` contra `provideRouter([])` e a
    // suite ganha um NG04002 permanente — que mascararia um NG04002 legitimo em outro teste.
    const destino = espiarNavegacao(fixture);

    preencherEEnviar();
    await estabilizar(fixture);

    expect(authHeader).toBeNull();
    // Controle positivo: garante que o fluxo completou, e nao que o assert acima passou por a
    // request nem ter saido.
    expect(destino()).toBe('/app/dashboard');
  });

  it('401 na verificacao: anuncia sessao expirada, nao "servico indisponivel"', async () => {
    // Ramo defensivo. Improduzivel contra o backend de hoje (ver docblock do componente), mas a
    // improdutibilidade depende de `SecurityConfig.java:82-83` manter o `permitAll`, que este repo
    // nao controla. Sem o ramo, o 401 cairia no `default:` — e como a rota tambem esta isenta no
    // errorInterceptor, o usuario ficaria preso no desafio lendo "Servico indisponivel".
    semearChallenge();
    stubVerify(() => erroDaApi(401, 'Unauthorized', 'Autenticacao requerida'));
    const { fixture } = await setup();

    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe('Sua sessao expirou. Refaca o login e tente de novo.');
    esperarCtaLiberado();
  });

  // O landmark fica FORA do @if, entao tem de existir nos dois ramos. Um teste por ramo: o
  // TestBed nao aceita dois `render` no mesmo teste.
  it('expoe a regiao principal nomeada pelo heading no ramo sem challenge', async () => {
    await setup();

    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Verificacao em duas etapas' })).toBeTruthy();
  });

  it('expoe a regiao principal nomeada pelo heading no ramo com formulario', async () => {
    semearChallenge();
    await setup();

    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Verificacao em duas etapas' })).toBeTruthy();
    expect(screen.getByTestId('sep-verify-totp-input')).toBeTruthy();
  });

  it('mostra o ramo de sessao expirada quando nao ha challenge pendente', async () => {
    await setup();
    expect(screen.getByTestId('sep-verify-totp-no-challenge')).toBeTruthy();
    expect(screen.queryByTestId('sep-verify-totp-input')).toBeNull();
  });

  // As tres causas do 400 (codigo invalido, challenge expirado, MFA nao habilitado) chegam com
  // `message` distinto. Este teste cobre o corpo SEM `codigo` — o que um backend anterior a Sprint
  // 36 emite —, e por isso segue caindo no erro inline: sem codigo nao ha ramo a escolher. A
  // discriminacao por codigo tem bloco proprio no fim deste arquivo.
  it('usa o message do corpo no 400 em vez de fixar uma unica causa', async () => {
    semearChallenge();
    stubVerify(() =>
      erroDaApi(400, 'Bad Request', 'Desafio MFA invalido ou expirado. Refaca o login.'),
    );
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe('Desafio MFA invalido ou expirado. Refaca o login.');
    esperarCtaLiberado();
  });

  it('cai no literal do 400 quando o corpo nao traz message', async () => {
    semearChallenge();
    stubVerify(() => new HttpResponse(null, { status: 400 }));
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe(
      'Codigo invalido ou desafio expirado. Refaca o login e tente de novo.',
    );
  });

  it('nao acusa codigo invalido no 423 e usa o prazo que o backend informou', async () => {
    semearChallenge();
    stubVerify(() =>
      erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente. Tente novamente em 45 minutos.'),
    );
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe('Conta bloqueada temporariamente. Tente novamente em 45 minutos.');
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  it('nao acusa codigo invalido no 429', async () => {
    semearChallenge();
    stubVerify(() =>
      erroDaApi(
        429,
        'Too Many Requests',
        'Limite de requisicoes excedido. Aguarde antes de tentar novamente.',
      ),
    );
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe(
      'Muitas tentativas seguidas. Aguarde cerca de 1 minuto e tente de novo.',
    );
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  // O fixture traz traceId e NAO traz o codigo de suporte pronto, para o withSupportReference do
  // errorInterceptor ter trabalho real: com a mensagem ja contendo a referencia ele curto-circuita
  // e o teste nao provaria nada sobre a cadeia.
  it('nao acusa codigo invalido no 5xx e preserva o codigo de suporte anexado pelo interceptor', async () => {
    semearChallenge();
    stubVerify(() =>
      HttpResponse.json(
        {
          timestamp: '2026-07-31T09:00:00Z',
          status: 500,
          error: 'Internal Server Error',
          message: 'Falha interna.',
          path: '/api/v1/auth/totp/verify',
          traceId: 'abc-123',
        },
        { status: 500 },
      ),
    );
    const { fixture } = await setup({ comInterceptors: true });
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toContain('abc-123');
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  // `??` deixaria a string vazia passar, e o `@if` do template a trata como falsy: o no
  // role="alert" nem seria criado e a tela ficaria muda depois do erro.
  it('cai no literal quando o corpo traz message vazia', async () => {
    semearChallenge();
    stubVerify(() => erroDaApi(423, 'Locked', '   '));
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    // F-26.5: o fallback local nao cita duracao — ver o docblock de `CONTA_BLOQUEADA_FALLBACK`.
    // Trava por texto integral, e nao por fragmento: a F-21 registrou que assert frouxo aqui deixa
    // passar copy inventada.
    expect(textoDoErro()).toBe(
      'Conta bloqueada temporariamente. Aguarde o periodo de bloqueio antes de tentar de novo.',
    );
  });

  // Sem este caso o ramo do 423 seria indistinguivel do `default`, que so difere no literal.
  it('usa o literal proprio do 423 quando nao ha corpo', async () => {
    semearChallenge();
    stubVerify(() => new HttpResponse(null, { status: 423 }));
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    // F-26.5: o fallback local nao cita duracao — ver o docblock de `CONTA_BLOQUEADA_FALLBACK`.
    // Trava por texto integral, e nao por fragmento: a F-21 registrou que assert frouxo aqui deixa
    // passar copy inventada.
    expect(textoDoErro()).toBe(
      'Conta bloqueada temporariamente. Aguarde o periodo de bloqueio antes de tentar de novo.',
    );
  });

  // Validators.required aceita so espacos; sem o pattern isso chega ao backend, o @NotBlank
  // reprova e a tela exibiria "codigo must not be blank" — texto cru de bean validation.
  it('rejeita codigo em branco localmente, sem chamar a API', async () => {
    semearChallenge();
    let chamou = false;
    stubVerify(() => {
      chamou = true;
      return sucesso();
    });
    const { fixture } = await setup();
    preencherEEnviar('   ');
    await estabilizar(fixture);

    expect(chamou).toBe(false);
    expect(textoDoErro()).toContain('6 digitos');
  });

  // Zerar a mensagem destroi o no do @if e o callback de erro o recria; sem isso dois erros
  // identicos seguidos nao mudam o DOM e a live region nao anuncia o segundo.
  it('recria o no do alerta em erros identicos consecutivos', async () => {
    semearChallenge();
    stubVerify(() => erroDaApi(429, 'Too Many Requests', 'Limite excedido.'));
    const { fixture } = await setup();

    preencherEEnviar();
    await estabilizar(fixture);
    const primeiro = screen.getByTestId('sep-verify-totp-error');

    preencherEEnviar();
    await estabilizar(fixture);
    const segundo = screen.getByTestId('sep-verify-totp-error');

    expect(segundo.textContent).toBe(primeiro.textContent);
    expect(segundo).not.toBe(primeiro);
  });

  it('nao acusa codigo invalido em falha de rede', async () => {
    semearChallenge();
    stubVerify(() => HttpResponse.error());
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe(
      'Nao foi possivel verificar o codigo agora. Verifique sua conexao e tente de novo.',
    );
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  // A navegacao do 423 e responsabilidade unica do errorInterceptor. Se o componente passar a
  // navegar, o clearSession() do interceptor deixa de ser garantido no caminho.
  it('nao navega no 423 por conta propria, sem a cadeia de interceptors', async () => {
    semearChallenge();
    stubVerify(() => erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente.'));
    const { fixture } = await setup();
    const destino = espiarNavegacao(fixture);
    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBeNull();
    expect(screen.getByTestId('sep-verify-totp-error')).toBeTruthy();
  });

  it('deixa o errorInterceptor levar a /account-locked no 423', async () => {
    semearChallenge();
    stubVerify(() => erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente.'));
    const { fixture } = await setup({ comInterceptors: true });
    const destino = espiarNavegacao(fixture);
    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBe('/account-locked');
  });

  it('conclui o login e vai para o dashboard quando o codigo e aceito', async () => {
    semearChallenge();
    stubVerify(() => sucesso());
    const { fixture } = await setup();
    const destino = espiarNavegacao(fixture);
    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBe('/app/dashboard');
    expect(screen.queryByTestId('sep-verify-totp-error')).toBeNull();
    // Sem estes dois asserts, apagar `applyMfaVerifyResponse` deixava a suite verde: o usuario
    // chegaria ao dashboard sem token e todo request seguinte o devolveria ao login.
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('token-1');
    expect(window.localStorage.getItem(PENDING_MFA_CHALLENGE_KEY)).toBeNull();
  });

  it('leva a troca de senha forcada quando o backend exige', async () => {
    semearChallenge();
    stubVerify(() => sucesso({ precisaRedefinirSenha: true }));
    const { fixture } = await setup();
    const destino = espiarNavegacao(fixture);
    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBe('/app/profile/change-password?forced=true');
  });

  // O servidor aceitou o codigo e o desafio ja foi consumido; falhar em silencio empurraria o
  // usuario para um retry que nunca funciona.
  it('avisa quando o navegador impede salvar a sessao mesmo com codigo aceito', async () => {
    semearChallenge();
    stubVerify(() => sucesso());
    const { fixture } = await setup();
    const destino = espiarNavegacao(fixture);
    // Simula o QuotaExceededError do modo privado do Safari na persistencia da sessao.
    const auth = fixture.debugElement.injector.get(AuthService);
    auth.applyMfaVerifyResponse = () => {
      throw new DOMException('QuotaExceededError');
    };

    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBeNull();
    expect(textoDoErro()).toContain('armazenamento local');
  });

  /**
   * F-Sprint 26. Ate aqui o `400` era um so: qualquer uma das tres causas mostrava erro inline e
   * deixava o formulario de pe. Quem chegava com o desafio morto redigitava codigo contra um
   * challenge que nunca mais aceitaria nada.
   *
   * A regra desta sprint: **o codigo escolhe o RAMO, o corpo continua escolhendo a FRASE.** Por isso
   * cada caso abaixo assere as duas coisas separadamente — o desfecho (formulario de pe ou nao) e o
   * texto. Um teste que so olhasse o texto passaria nos dois ramos.
   */
  describe('discriminacao do 400 por codigo de erro (Sprint 36)', () => {
    it('MFA-400-002: mantem o formulario, porque o desafio segue vivo e retry e a acao certa', async () => {
      semearChallenge();
      stubVerify(() =>
        erroDaApi(400, 'Bad Request', 'Codigo TOTP invalido ou expirado.', 'MFA-400-002'),
      );
      const { fixture } = await setup();

      preencherEEnviar();
      await estabilizar(fixture);

      expect(textoDoErro()).toBe('Codigo TOTP invalido ou expirado.');
      expect(screen.queryByTestId('sep-verify-totp-no-challenge')).toBeNull();
      esperarCtaLiberado();
    });

    it('MFA-400-003: fecha o formulario, porque a conta nao tem TOTP e nenhum codigo serviria', async () => {
      semearChallenge();
      stubVerify(() =>
        erroDaApi(
          400,
          'Bad Request',
          'MFA TOTP nao esta habilitado para este usuario.',
          'MFA-400-003',
        ),
      );
      const { fixture } = await setup();

      preencherEEnviar();
      await estabilizar(fixture);

      expect(textoTerminal()).toBe('MFA TOTP nao esta habilitado para este usuario.');
      esperarFormularioAusente();
    });

    it('MFA-400-004: fecha o formulario, porque o desafio morreu e so refazer o login resolve', async () => {
      semearChallenge();
      stubVerify(() =>
        erroDaApi(
          400,
          'Bad Request',
          'Desafio MFA invalido ou expirado. Refaca o login.',
          'MFA-400-004',
        ),
      );
      const { fixture } = await setup();

      preencherEEnviar();
      await estabilizar(fixture);

      expect(textoTerminal()).toBe('Desafio MFA invalido ou expirado. Refaca o login.');
      esperarFormularioAusente();
    });

    /**
     * Compatibilidade com backend anterior a Sprint 36, e com os 53 codigos que ela deixou fora do
     * perimetro. Sem codigo nao ha ramo a escolher: cai no tratamento por status, que e o
     * comportamento de antes desta sprint.
     */
    it('400 sem codigo preserva o comportamento legado, com o formulario de pe', async () => {
      semearChallenge();
      stubVerify(() =>
        erroDaApi(400, 'Bad Request', 'Desafio MFA invalido ou expirado. Refaca o login.'),
      );
      const { fixture } = await setup();

      preencherEEnviar();
      await estabilizar(fixture);

      expect(textoDoErro()).toBe('Desafio MFA invalido ou expirado. Refaca o login.');
      expect(screen.queryByTestId('sep-verify-totp-no-challenge')).toBeNull();
      esperarCtaLiberado();
    });

    /**
     * A Sprint 37 vai criar codigos novos e o backend pode publicar codigo que este web nao conhece.
     * Cliente tolera codigo futuro: desconhecido nao pode fechar o formulario nem virar erro proprio,
     * tem de escorrer para o legado.
     */
    it('codigo desconhecido escorre para o comportamento legado', async () => {
      semearChallenge();
      stubVerify(() => erroDaApi(400, 'Bad Request', 'Alguma condicao nova.', 'MFA-400-999'));
      const { fixture } = await setup();

      preencherEEnviar();
      await estabilizar(fixture);

      expect(textoDoErro()).toBe('Alguma condicao nova.');
      expect(screen.queryByTestId('sep-verify-totp-no-challenge')).toBeNull();
    });

    /**
     * Ramo e frase sao independentes: aqui o codigo abre o desfecho terminal e o corpo NAO traz
     * frase utilizavel, entao o literal local do `400` preenche. Se alguem trocar a origem do texto
     * por literal fixo, os tres testes de cima reprovam; se alguem remover o fallback, este reprova.
     */
    it('usa o literal local quando o codigo abre o ramo terminal mas o corpo nao traz message', async () => {
      semearChallenge();
      stubVerify(() =>
        HttpResponse.json(
          {
            timestamp: '2026-07-31T09:00:00Z',
            status: 400,
            error: 'Bad Request',
            path: '/api/v1/auth/totp/verify',
            codigo: 'MFA-400-004',
          },
          { status: 400 },
        ),
      );
      const { fixture } = await setup();

      preencherEEnviar();
      await estabilizar(fixture);

      expect(textoTerminal()).toBe(
        'Codigo invalido ou desafio expirado. Refaca o login e tente de novo.',
      );
      esperarFormularioAusente();
    });

    /**
     * A consulta ao codigo e exclusiva do `400`. Os codigos de `423`/`429` ficaram FORA do perimetro
     * da Sprint 36 — vem da cadeia de seguranca, que escreve na response sem passar pelo handler —,
     * mas um proxy ou um backend futuro pode carimbar qualquer coisa ali. Se a guarda de status cair,
     * um `423` com codigo terminal fecharia o formulario e roubaria o `423` do errorInterceptor.
     */
    it('nao consulta o codigo fora do 400: um 423 com codigo terminal segue no tratamento de 423', async () => {
      semearChallenge();
      stubVerify(() =>
        erroDaApi(
          423,
          'Locked',
          'Conta bloqueada temporariamente. Tente novamente em 45 minutos.',
          'MFA-400-004',
        ),
      );
      const { fixture } = await setup();

      preencherEEnviar();
      await estabilizar(fixture);

      expect(textoDoErro()).toBe('Conta bloqueada temporariamente. Tente novamente em 45 minutos.');
      expect(screen.queryByTestId('sep-verify-totp-no-challenge')).toBeNull();
    });

    /** O ramo local de "nao ha challenge pendente" nao mudou: segue com a copy fixa do template. */
    it('preserva a copy do ramo sem challenge, que nao vem da API', async () => {
      await setup();

      expect(textoTerminal()).toBe('Sessao de verificacao expirada. Refaca o login.');
      esperarFormularioAusente();
    });
  });
});

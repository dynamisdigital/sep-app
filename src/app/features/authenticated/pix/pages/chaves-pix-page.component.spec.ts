import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChavePixResponse, TipoChavePix } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { ChavePixIntencaoStore } from '../../../../core/pix/chave-pix-intencao.store';
import { PixService } from '../../../../core/pix/pix.service';
import { resetChavesPixState } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/server';
import { PIX_ROUTES } from '../pix.routes';
import { ChavesPixPageComponent } from './chaves-pix-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const CHAVES_URL = 'http://localhost:8080/api/v1/pix/chaves';
const ROTA_STEP_UP = '/app/step-up?next=/app/pix/chaves';

// Fixtures sempre mascaradas: o backend nunca devolve o valor integral da chave.
const CHAVE_ATIVA: ChavePixResponse = {
  id: 'e3000000-0000-4000-8000-000000000001',
  tipo: 'EMAIL',
  valorMascarado: 'fin***@dynamis.com.br',
  status: 'ATIVA',
  criadaEm: '2026-07-10T09:00:00-03:00',
  removidaEm: null,
};
const CHAVE_INATIVA: ChavePixResponse = {
  id: 'e3000000-0000-4000-8000-000000000002',
  tipo: 'CNPJ',
  valorMascarado: '**.***.***/0001-**',
  status: 'INATIVA',
  criadaEm: '2026-06-02T09:00:00-03:00',
  removidaEm: '2026-07-01T14:20:00-03:00',
};

const VALOR_EM_CLARO = 'financeiro@dynamis.com.br';

// `intencaoInicial` simula o estado real do retorno do step-up: o singleton de root sobreviveu a
// destruicao da pagina e carrega a intencao criada antes da navegacao.
function renderPage(
  opts: { tokenInicial?: string; intencaoInicial?: { tipo: TipoChavePix; valor: string } } = {},
) {
  return render(ChavesPixPageComponent, {
    providers: [
      provideHttpClient(withInterceptors([stepUpInterceptor, errorInterceptor])),
      provideRouter([]),
      ...(opts.tokenInicial
        ? [
            {
              provide: StepUpTokenStore,
              useFactory: () => {
                const store = new StepUpTokenStore();
                store.set(opts.tokenInicial as string);
                return store;
              },
            },
          ]
        : []),
      ...(opts.intencaoInicial
        ? [
            {
              provide: ChavePixIntencaoStore,
              useFactory: () => {
                const store = new ChavePixIntencaoStore();
                const { tipo, valor } = opts.intencaoInicial as {
                  tipo: TipoChavePix;
                  valor: string;
                };
                store.chave(tipo, valor);
                return store;
              },
            },
          ]
        : []),
    ],
  });
}

function autenticarFinanceiro(fixture: ComponentFixture<unknown>, mfaHabilitado: boolean): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771002',
    username: 'financeiro@empresa.com',
    role: 'FINANCEIRO',
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

// Conta os GETs recebidos e responde com o corpo dado. Serve para provar tanto a chamada unica
// da entrada quanto a ausencia de polling.
function stubLista(chaves: ChavePixResponse[]): { total: () => number } {
  let chamadas = 0;
  server.use(
    http.get(CHAVES_URL, () => {
      chamadas += 1;
      return HttpResponse.json(chaves);
    }),
  );
  return { total: () => chamadas };
}

// Captura os DELETEs recebidos (por id de chave) e responde com o status pedido.
function stubRemocao(responder: () => HttpResponse | Response): {
  ids: () => string[];
  headers: () => (string | null)[];
} {
  const ids: string[] = [];
  const headers: (string | null)[] = [];
  server.use(
    http.delete(`${CHAVES_URL}/:chaveId`, ({ params, request }) => {
      ids.push(String(params['chaveId']));
      headers.push(request.headers.get('Idempotency-Key'));
      return responder();
    }),
  );
  return { ids: () => ids, headers: () => headers };
}

// Captura as Idempotency-Keys de cada POST e responde com o status pedido. Permite provar o
// reuso da MESMA key em retry ambiguo e a troca de key quando tipo/valor mudam.
function stubCadastro(responder: () => HttpResponse | Response): { keys: () => string[] } {
  const keys: string[] = [];
  server.use(
    http.post(CHAVES_URL, ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key') ?? '');
      return responder();
    }),
  );
  return { keys: () => keys };
}

function preencherFormulario(fixture: ComponentFixture<unknown>, valor: string): void {
  fireEvent.input(screen.getByLabelText('Valor da chave'), { target: { value: valor } });
  fixture.detectChanges();
}

async function abrirConfirmacao(
  fixture: ComponentFixture<unknown>,
  valor = VALOR_EM_CLARO,
): Promise<void> {
  preencherFormulario(fixture, valor);
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar chave' }));
  await estabilizar(fixture);
}

async function confirmarCadastro(fixture: ComponentFixture<unknown>): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cadastro' }));
  await estabilizar(fixture);
}

async function abrirRemocao(fixture: ComponentFixture<unknown>): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /^Remover chave/ }));
  await estabilizar(fixture);
}

async function confirmarRemocao(fixture: ComponentFixture<unknown>): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar remocao' }));
  await estabilizar(fixture);
}

// O X-Step-Up-Token e de uso unico: o interceptor o consome ao anexar. Toda nova tentativa de
// mutacao exige um step-up novo — e por isso que o retry so pode preservar a Idempotency-Key, e
// nao o token.
function renovarStepUp(fixture: ComponentFixture<unknown>, token: string): void {
  fixture.debugElement.injector.get(StepUpTokenStore).set(token);
}

describe('ChavesPixPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // Handlers globais de chaves Pix passaram a existir na F-20.6: reset explicito garante que um
    // teste nao herde estado mutado por outro quando o stub por caso nao cobrir alguma rota.
    resetChavesPixState();
  });

  // O guard proprio da sub-rota e mais restrito que o pai /app/pix (que inclui BACKOFFICE): o
  // backend limita as tres operacoes de chave a FINANCEIRO/ADMIN.
  it('rota /app/pix/chaves e protegida por roleGuard para FINANCEIRO/ADMIN', () => {
    const rota = PIX_ROUTES.find((r) => r.path === 'chaves');

    expect(rota).toBeTruthy();
    expect(rota?.canActivate?.length).toBe(1);
    expect(rota?.data?.['roles']).toEqual(['FINANCEIRO', 'ADMIN']);
    expect(rota?.data?.['roles']).not.toContain('BACKOFFICE');
  });

  describe('listagem', () => {
    it('lista as chaves mascaradas com tipo, status e datas', async () => {
      stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      expect(screen.getByText('fin***@dynamis.com.br')).toBeTruthy();
      expect(screen.getByText('**.***.***/0001-**')).toBeTruthy();
      expect(screen.getByText('CNPJ', { selector: 'td' })).toBeTruthy();
      // Badge textual: a cor nao e o unico portador do estado.
      expect(screen.getByText('Ativa')).toBeTruthy();
      expect(screen.getByText('Inativa')).toBeTruthy();
    });

    // A regiao da lista precisa ser nomeada: sem o aria-labelledby o h2 fica solto e o leitor de
    // tela nao consegue anunciar em qual das duas regioes da pagina (lista x cadastro) o operador
    // esta. Fixa tambem que o id do heading nao volta a ficar orfao.
    it('a regiao da lista e um landmark nomeado pelo proprio heading', async () => {
      stubLista([CHAVE_ATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      const regiao = screen.getByRole('region', { name: 'Chaves cadastradas' });
      expect(regiao.getAttribute('aria-labelledby')).toBe('chaves-cadastradas-titulo');
      expect(regiao.querySelector('#chaves-cadastradas-titulo')?.textContent).toContain(
        'Chaves cadastradas',
      );
      // O heading rotula a regiao que de fato contem a tabela.
      expect(regiao.querySelector('table')).toBeTruthy();
    });

    it('preserva a ordem recebida do backend, sem reordenar', async () => {
      stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      const linhas = document.querySelectorAll('tbody tr');
      expect(linhas[0].textContent).toContain('fin***@dynamis.com.br');
      expect(linhas[1].textContent).toContain('**.***.***/0001-**');
    });

    // Colunas: 0 Tipo | 1 Chave | 2 Status | 3 Cadastrada em | 4 Removida em | 5 Acoes.
    const COLUNA_REMOVIDA_EM = 4;

    it('so exibe data de remocao quando a chave esta INATIVA', async () => {
      stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      const linhas = document.querySelectorAll('tbody tr');
      const removidaEmAtiva = linhas[0].querySelectorAll('td')[COLUNA_REMOVIDA_EM];
      const removidaEmInativa = linhas[1].querySelectorAll('td')[COLUNA_REMOVIDA_EM];

      expect(removidaEmAtiva.textContent?.trim()).toBe('—');
      expect(removidaEmInativa.textContent?.trim()).not.toBe('—');
      expect(removidaEmInativa.textContent).toContain('01/07/2026');
    });

    it('superficie vazia: 200 [] mostra mensagem neutra, sem fabricar linhas', async () => {
      stubLista([]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      expect(
        screen.getByText('Nenhuma chave Pix cadastrada para a conta operacional.'),
      ).toBeTruthy();
      expect(document.querySelector('tbody')).toBeNull();
    });

    it('superficie de erro: 500 mostra alerta com retry, sem listar nada', async () => {
      server.use(http.get(CHAVES_URL, () => new HttpResponse(null, { status: 500 })));
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('Tentar novamente')).toBeTruthy();
      expect(document.querySelector('tbody')).toBeNull();
    });

    it('retry apos erro recarrega e mostra a lista', async () => {
      server.use(http.get(CHAVES_URL, () => new HttpResponse(null, { status: 500 })));
      const { fixture } = await renderPage();
      await estabilizar(fixture);
      expect(screen.getByRole('alert')).toBeTruthy();

      stubLista([CHAVE_ATIVA]);
      fireEvent.click(screen.getByText('Tentar novamente'));
      await estabilizar(fixture);

      expect(screen.getByText('fin***@dynamis.com.br')).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('consulta uma unica vez na entrada e nao faz polling', async () => {
      const stub = stubLista([CHAVE_ATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      expect(stub.total()).toBe(1);

      // Sem gesto novo, nenhuma consulta adicional deve nascer (nem por interval nem por foco).
      await estabilizar(fixture);
      await estabilizar(fixture);
      expect(stub.total()).toBe(1);
    });

    // Concorrencia da leitura (F-20.5): a resposta de uma consulta ANTERIOR chega depois da mais
    // nova e nao pode sobrescrever a lista. Pela UI isso nao acontece (o botao Atualizar fica
    // desabilitado durante a carga); o caminho real e programatico — os handlers de mutacao
    // chamam carregar() com um refresh possivelmente em voo.
    //
    // O service e fakeado com Subjects porque a ordem de emissao precisa ser controlada: com MSW,
    // uma request pendente trava o whenStable e o teste nunca estabiliza.
    it('resposta tardia de uma consulta anterior nao sobrescreve a lista mais nova', async () => {
      const emissores: Subject<ChavePixResponse[]>[] = [];
      const pixFake = {
        listarChavesPix: () => {
          const emissor = new Subject<ChavePixResponse[]>();
          emissores.push(emissor);
          return emissor.asObservable();
        },
      };
      const { fixture } = await render(ChavesPixPageComponent, {
        providers: [
          provideHttpClient(),
          provideRouter([]),
          { provide: PixService, useValue: pixFake },
        ],
      });
      const pagina = fixture.componentInstance as ChavesPixPageComponent;

      // ngOnInit disparou a consulta 0; ela segue pendente quando a 1 comeca.
      pagina.carregar();
      expect(emissores.length).toBe(2);

      emissores[1].next([CHAVE_ATIVA]);
      emissores[1].complete();
      fixture.detectChanges();
      expect(screen.getByText(CHAVE_ATIVA.valorMascarado)).toBeTruthy();

      // A consulta 0 (obsoleta) so responde agora — sua assinatura ja foi descartada.
      emissores[0].next([CHAVE_INATIVA]);
      emissores[0].complete();
      fixture.detectChanges();

      expect(screen.getByText(CHAVE_ATIVA.valorMascarado)).toBeTruthy();
      expect(screen.queryByText(CHAVE_INATIVA.valorMascarado)).toBeNull();
    });

    it('o botao Atualizar reconsulta por gesto explicito', async () => {
      const stub = stubLista([CHAVE_ATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);
      expect(stub.total()).toBe(1);

      fireEvent.click(screen.getByText('Atualizar'));
      await estabilizar(fixture);

      expect(stub.total()).toBe(2);
    });
  });

  describe('cadastro assistido', () => {
    it('sem MFA ativo, bloqueia o cadastro com orientacao e nao abre a confirmacao', async () => {
      stubLista([]);
      const { fixture } = await renderPage();
      autenticarFinanceiro(fixture, false);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);

      expect(screen.getByText(/verificacao em duas etapas \(MFA\) ativa/)).toBeTruthy();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('valor vazio nao abre a confirmacao e sinaliza o campo', async () => {
      stubLista([]);
      const { fixture } = await renderPage();
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      // Espaco em branco tambem e vazio (o backend exige @NotBlank).
      await abrirConfirmacao(fixture, '   ');

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.getByText('Informe o valor da chave.')).toBeTruthy();
    });

    it('sem token, confirmar navega ao step-up desta rota e NAO chama o POST', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => HttpResponse.json(CHAVE_ATIVA, { status: 201 }));
      const { fixture } = await renderPage();
      autenticarFinanceiro(fixture, true);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      expect(screen.getByRole('alertdialog').textContent).toContain('provider local (fake)');

      await confirmarCadastro(fixture);

      expect(navegar).toHaveBeenCalledWith(ROTA_STEP_UP);
      expect(cadastro.keys()).toEqual([]);
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    // Cenario do retorno do step-up: a pagina renasce com token no store. Nenhum POST pode sair
    // sem um novo gesto do operador.
    it('voltar do step-up com token NAO cadastra sozinho: exige novo clique', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => HttpResponse.json(CHAVE_ATIVA, { status: 201 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);
      await estabilizar(fixture);

      expect(cadastro.keys()).toEqual([]);
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    // O prefill existe para que o retry apos o step-up reuse a MESMA key: com o formulario vazio,
    // um simples erro de digitacao no reenvio criaria intencao nova e poderia duplicar a chave.
    it('voltar do step-up reconstitui o rascunho da intencao viva', async () => {
      stubLista([]);
      const { fixture } = await renderPage({
        tokenInicial: 'step-up-tok',
        intencaoInicial: { tipo: 'CNPJ', valor: '11222333000181' },
      });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      expect((screen.getByLabelText('Valor da chave') as HTMLInputElement).value).toBe(
        '11222333000181',
      );
      expect((screen.getByLabelText('Tipo da chave') as HTMLSelectElement).value).toBe('CNPJ');
    });

    it('sem intencao viva, o formulario nasce vazio', async () => {
      stubLista([]);
      const { fixture } = await renderPage();
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      expect((screen.getByLabelText('Valor da chave') as HTMLInputElement).value).toBe('');
    });

    // O rascunho reconstituido tem de render a MESMA key da intencao que o originou — e disso que
    // depende o replay idempotente do backend apos um retry ambiguo.
    it('o cadastro apos o retorno do step-up reusa a key da intencao reconstituida', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => new HttpResponse(null, { status: 503 }));
      const { fixture } = await renderPage({
        tokenInicial: 'step-up-tok',
        intencaoInicial: { tipo: 'CNPJ', valor: '11222333000181' },
      });
      autenticarFinanceiro(fixture, true);
      const intencoes = fixture.debugElement.injector.get(ChavePixIntencaoStore);
      const keyOriginal = intencoes.chave('CNPJ', '11222333000181');
      await estabilizar(fixture);

      // Sem redigitar: o operador so reconfirma o rascunho que voltou.
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar chave' }));
      await estabilizar(fixture);
      await confirmarCadastro(fixture);

      expect(cadastro.keys()).toEqual([keyOriginal]);
    });

    it('com token, cadastra com Idempotency-Key, confirma sucesso e reconsulta a lista', async () => {
      const lista = stubLista([]);
      const cadastro = stubCadastro(() => HttpResponse.json(CHAVE_ATIVA, { status: 201 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      expect(cadastro.keys().length).toBe(1);
      expect(cadastro.keys()[0]).not.toBe('');
      expect(screen.getByText(/cadastrada/i, { selector: '[role="status"]' })).toBeTruthy();
      // Reconsulta pos-sucesso: entrada + refresh.
      expect(lista.total()).toBe(2);
    });

    it('200 (replay idempotente) tambem e sucesso real', async () => {
      stubLista([]);
      stubCadastro(() => HttpResponse.json(CHAVE_ATIVA, { status: 200 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      expect(screen.getByText(/cadastrada/i, { selector: '[role="status"]' })).toBeTruthy();
    });

    it('a mensagem de sucesso usa o valor MASCARADO do backend, nunca o valor digitado', async () => {
      stubLista([]);
      stubCadastro(() => HttpResponse.json(CHAVE_ATIVA, { status: 201 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      const sucesso = screen.getByText(/cadastrada/i, { selector: '[role="status"]' });
      expect(sucesso.textContent).toContain('fin***@dynamis.com.br');
      expect(sucesso.textContent).not.toContain(VALOR_EM_CLARO);
    });

    // Retry ambiguo: o backend pode ter cadastrado antes de a resposta se perder. Reusar a MESMA
    // key e o que permite o replay idempotente em vez de uma segunda chave.
    it('retry apos 5xx reusa a MESMA Idempotency-Key para o mesmo tipo/valor', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => new HttpResponse(null, { status: 503 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);
      expect(screen.getByText(/nao foi possivel confirmar o cadastro/i)).toBeTruthy();

      // Novo step-up (o token anterior foi consumido), mesmo tipo/valor: a intencao sobrevive.
      renovarStepUp(fixture, 'step-up-tok-2');
      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      const keys = cadastro.keys();
      expect(keys.length).toBe(2);
      expect(keys[1]).toBe(keys[0]);
    });

    it('mudar o valor apos um 5xx gera Idempotency-Key NOVA', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => new HttpResponse(null, { status: 503 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture, VALOR_EM_CLARO);
      await confirmarCadastro(fixture);

      renovarStepUp(fixture, 'step-up-tok-2');
      await abrirConfirmacao(fixture, 'outro@dynamis.com.br');
      await confirmarCadastro(fixture);

      const keys = cadastro.keys();
      expect(keys.length).toBe(2);
      expect(keys[1]).not.toBe(keys[0]);
    });

    it('400 mantem o formulario com mensagem neutra e sem sucesso presumido', async () => {
      stubLista([]);
      stubCadastro(() => new HttpResponse(null, { status: 400 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      expect(screen.getByText(/dados da chave invalidos/i)).toBeTruthy();
      expect(screen.queryByText(/cadastrada/i, { selector: '[role="status"]' })).toBeNull();
      expect((screen.getByLabelText('Valor da chave') as HTMLInputElement).value).toBe(
        VALOR_EM_CLARO,
      );
    });

    it('409 reconsulta a lista sem presumir sucesso', async () => {
      const lista = stubLista([]);
      stubCadastro(() => new HttpResponse(null, { status: 409 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      expect(screen.getByText(/ja existe uma equivalente ativa ou houve conflito/i)).toBeTruthy();
      expect(screen.queryByText(/cadastrada/i, { selector: '[role="status"]' })).toBeNull();
      expect(lista.total()).toBe(2);
    });

    it('422 informa indisponibilidade da conta operacional, sem culpar o operador', async () => {
      stubLista([]);
      stubCadastro(() => new HttpResponse(null, { status: 422 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      expect(screen.getByText(/conta operacional esta indisponivel/i)).toBeTruthy();
      expect(screen.queryByText(/cadastrada/i, { selector: '[role="status"]' })).toBeNull();
    });

    // TRATA_403_LOCALMENTE: o errorInterceptor nao pode ejetar o operador para /access-denied.
    it('403 oferece nova verificacao na propria tela e preserva a intencao (mesma key)', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => new HttpResponse(null, { status: 403 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      expect(screen.getByText(/nao foi possivel confirmar sua identidade/i)).toBeTruthy();
      expect(navegar).not.toHaveBeenCalledWith('/access-denied');

      // Reverificacao por gesto explicito; o POST nao e reenviado sozinho.
      fireEvent.click(screen.getByText('Verificar novamente'));
      await estabilizar(fixture);
      expect(navegar).toHaveBeenCalledWith(ROTA_STEP_UP);
      expect(cadastro.keys().length).toBe(1);
    });

    it('duplo clique em Confirmar cadastro: o botao desabilita apos o primeiro', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => HttpResponse.json(CHAVE_ATIVA, { status: 201 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      const confirmar = screen.getByRole('button', { name: 'Confirmar cadastro' });
      fireEvent.click(confirmar);
      fireEvent.click(confirmar);
      await estabilizar(fixture);

      expect(cadastro.keys().length).toBe(1);
    });

    // O teste acima cobre so a barreira visual: o fireEvent do testing-library roda change
    // detection, entao o segundo clique ja encontra o botao [disabled].
    //
    // Este exercita a invocacao direta, sem DOM. Verificado por mutacao: remover a guarda
    // `cadastroEmVoo()` do metodo NAO faz este teste falhar — quem impede o segundo POST e o
    // token de step-up, consumido sincronamente pelo interceptor no primeiro subscribe. A guarda
    // e defesa em profundidade e so viraria a unica barreira se o token deixasse de ser de uso
    // unico; e essa regressao que este teste fixa.
    it('duas chamadas sincronas a confirmarCadastro disparam um unico POST', async () => {
      stubLista([]);
      const cadastro = stubCadastro(() => HttpResponse.json(CHAVE_ATIVA, { status: 201 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);
      await abrirConfirmacao(fixture);

      const pagina = fixture.componentInstance as ChavesPixPageComponent;
      pagina.confirmarCadastro();
      pagina.confirmarCadastro();
      await estabilizar(fixture);

      expect(cadastro.keys().length).toBe(1);
    });

    it('nao abre o cadastro enquanto a confirmacao de remocao esta aberta', async () => {
      stubLista([CHAVE_ATIVA]);
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      expect(screen.getByRole('dialog')).toBeTruthy();

      preencherFormulario(fixture, VALOR_EM_CLARO);
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar chave' }));
      await estabilizar(fixture);

      // Dialogos nunca se sobrepoem: o de cadastro (alertdialog) nao abre sobre o de remocao.
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('nem a Idempotency-Key nem o valor em claro sao persistidos no navegador', async () => {
      stubLista([]);
      stubCadastro(() => new HttpResponse(null, { status: 503 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      await confirmarCadastro(fixture);

      expect(window.localStorage.length).toBe(0);
      expect(window.sessionStorage.length).toBe(0);
    });
  });

  describe('remocao assistida', () => {
    it('oferece Remover apenas em chave ATIVA; INATIVA nao tem CTA', async () => {
      stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
      const { fixture } = await renderPage();
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      const remover = screen.getAllByRole('button', { name: /^Remover chave/ });
      expect(remover.length).toBe(1);
      expect(remover[0].getAttribute('aria-label')).toContain(CHAVE_ATIVA.valorMascarado);
    });

    it('sem MFA ativo, bloqueia a remocao com orientacao e nao abre a confirmacao', async () => {
      stubLista([CHAVE_ATIVA]);
      const { fixture } = await renderPage();
      autenticarFinanceiro(fixture, false);
      await estabilizar(fixture);

      await abrirRemocao(fixture);

      expect(screen.getByText(/remover uma chave Pix e preciso ter a verificacao/i)).toBeTruthy();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('sem token, confirmar navega ao step-up desta rota e NAO chama o DELETE', async () => {
      stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage();
      autenticarFinanceiro(fixture, true);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      expect(screen.getByRole('dialog')).toBeTruthy();

      await confirmarRemocao(fixture);

      expect(navegar).toHaveBeenCalledWith(ROTA_STEP_UP);
      expect(remocao.ids()).toEqual([]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Cenario do retorno do step-up: a pagina renasce com token no store. Nenhuma chave pode ser
    // inativada sem um novo gesto do operador.
    it('voltar do step-up com token NAO remove sozinho: exige novo clique', async () => {
      stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);
      await estabilizar(fixture);

      expect(remocao.ids()).toEqual([]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('204 inativa a chave, confirma sucesso e reconsulta a lista', async () => {
      const lista = stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      await confirmarRemocao(fixture);

      expect(remocao.ids()).toEqual([CHAVE_ATIVA.id]);
      // DELETE e idempotente por contrato: nao ha Idempotency-Key nesta operacao.
      expect(remocao.headers()).toEqual([null]);
      expect(screen.getByText(/removida/i, { selector: '[role="status"]' })).toBeTruthy();
      expect(lista.total()).toBe(2);
    });

    it('404 e tratado como indisponivel neutro, sem enumerar o motivo', async () => {
      const lista = stubLista([CHAVE_ATIVA]);
      stubRemocao(() => new HttpResponse(null, { status: 404 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      await confirmarRemocao(fixture);

      const alerta = screen.getByText(/chave indisponivel para remocao/i);
      expect(alerta).toBeTruthy();
      // Neutro: nao distingue inexistente, fora de escopo ou conta ausente, nem ecoa o UUID.
      expect(alerta.textContent).not.toContain(CHAVE_ATIVA.id);
      expect(screen.queryByText(/removida/i, { selector: '[role="status"]' })).toBeNull();
      expect(lista.total()).toBe(2);
    });

    it('403 oferece nova verificacao na propria tela, sem redirect global', async () => {
      stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 403 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      await confirmarRemocao(fixture);

      expect(
        screen.getByText(/nao foi possivel confirmar sua identidade para a remocao/i),
      ).toBeTruthy();
      expect(navegar).not.toHaveBeenCalledWith('/access-denied');

      fireEvent.click(screen.getByText('Verificar novamente'));
      await estabilizar(fixture);
      expect(navegar).toHaveBeenCalledWith(ROTA_STEP_UP);
      expect(remocao.ids().length).toBe(1);
    });

    it('rede/5xx nao presume remocao e reconsulta a lista antes de repetir', async () => {
      const lista = stubLista([CHAVE_ATIVA]);
      stubRemocao(() => new HttpResponse(null, { status: 503 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      await confirmarRemocao(fixture);

      expect(screen.getByText(/nao foi possivel confirmar a remocao/i)).toBeTruthy();
      expect(screen.queryByText(/removida/i, { selector: '[role="status"]' })).toBeNull();
      expect(lista.total()).toBe(2);
    });

    it('duplo clique em Confirmar remocao: o botao desabilita apos o primeiro', async () => {
      stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      const confirmar = screen.getByRole('button', { name: 'Confirmar remocao' });
      fireEvent.click(confirmar);
      fireEvent.click(confirmar);
      await estabilizar(fixture);

      expect(remocao.ids().length).toBe(1);
    });

    // Invocacao direta, sem DOM. Mesma constatacao do cadastro: o token de step-up (uso unico,
    // consumido sincronamente pelo interceptor) e o que impede o segundo DELETE — remover a
    // guarda `remocaoEmVoo()` nao faz este teste falhar. O teste fixa a invariante observavel:
    // duas invocacoes sincronas nunca produzem duas mutacoes.
    it('duas chamadas sincronas a confirmarRemocao disparam um unico DELETE', async () => {
      stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);
      await abrirRemocao(fixture);

      const pagina = fixture.componentInstance as ChavesPixPageComponent;
      pagina.confirmarRemocao();
      pagina.confirmarRemocao();
      await estabilizar(fixture);

      expect(remocao.ids().length).toBe(1);
    });

    it('remocao tambem e bloqueada enquanto a confirmacao de cadastro esta aberta', async () => {
      stubLista([CHAVE_ATIVA]);
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirConfirmacao(fixture);
      expect(screen.getByRole('alertdialog')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /^Remover chave/ }));
      await estabilizar(fixture);

      // O inverso do teste de cadastro: nenhum dialogo de remocao abre sobre o de cadastro.
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('alertdialog')).toBeTruthy();
    });

    it('Escape fecha a confirmacao sem chamar o DELETE', async () => {
      stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      await estabilizar(fixture);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(remocao.ids()).toEqual([]);
    });

    // Foco entra no dialogo ao abrir e RETORNA ao gatilho ao fechar: sem isso o operador perde a
    // posicao na tabela e o leitor de tela volta ao inicio do documento.
    it('o foco entra no dialogo ao abrir e volta ao gatilho ao cancelar', async () => {
      stubLista([CHAVE_ATIVA]);
      stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      const gatilho = screen.getByRole('button', { name: /^Remover chave/ });
      gatilho.focus();
      expect(document.activeElement).toBe(gatilho);

      await abrirRemocao(fixture);
      expect(document.activeElement).toBe(screen.getByRole('dialog'));

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      await estabilizar(fixture);

      expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Remover chave/ }));
    });

    it('cancelar fecha a confirmacao sem chamar o DELETE', async () => {
      stubLista([CHAVE_ATIVA]);
      const remocao = stubRemocao(() => new HttpResponse(null, { status: 204 }));
      const { fixture } = await renderPage({ tokenInicial: 'step-up-tok' });
      autenticarFinanceiro(fixture, true);
      await estabilizar(fixture);

      await abrirRemocao(fixture);
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      await estabilizar(fixture);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(remocao.ids()).toEqual([]);
    });
  });
});

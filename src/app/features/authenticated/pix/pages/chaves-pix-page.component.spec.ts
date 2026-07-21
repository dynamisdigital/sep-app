import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChavePixResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { server } from '../../../../../mocks/server';
import { PIX_ROUTES } from '../pix.routes';
import { ChavesPixPageComponent } from './chaves-pix-page.component';

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

async function flush(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function renderPage(opts: { tokenInicial?: string } = {}) {
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

    it('preserva a ordem recebida do backend, sem reordenar', async () => {
      stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      const linhas = document.querySelectorAll('tbody tr');
      expect(linhas[0].textContent).toContain('fin***@dynamis.com.br');
      expect(linhas[1].textContent).toContain('**.***.***/0001-**');
    });

    it('nao exibe data de remocao enquanto a chave esta ATIVA', async () => {
      stubLista([CHAVE_ATIVA]);
      const { fixture } = await renderPage();
      await estabilizar(fixture);

      const celulas = document.querySelectorAll('tbody tr td');
      expect(celulas[celulas.length - 1].textContent?.trim()).toBe('—');
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

    it('duplo clique em Confirmar cadastro nao dispara dois POSTs', async () => {
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
});

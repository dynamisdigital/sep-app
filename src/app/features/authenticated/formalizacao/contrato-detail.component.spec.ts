import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../core/interceptors/step-up.interceptor';
import { server } from '../../../../mocks/server';
import { ContratoDetailComponent } from './contrato-detail.component';

const CONTRATO_AGUARDANDO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01';
const CONTRATO_EM_ASSINATURA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e02';
const CONTRATO_ASSINADO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const CONTRATO_SEM_VERSAO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e05';
const CONTRATO_PARA_ACEITE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e06';
const CONTRATO_INEXISTENTE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771dead';
const DOCUMENTO_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function activatedRoute(id: string) {
  return { snapshot: { paramMap: convertToParamMap({ id }) } };
}

function renderDetail(id: string, comStepUp = false) {
  return render(ContratoDetailComponent, {
    providers: [
      comStepUp ? provideHttpClient(withInterceptors([stepUpInterceptor])) : provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(id) },
    ],
  });
}

function autenticarComMfa(fixture: ComponentFixture<unknown>): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771002',
    username: 'cliente@empresa.com',
    role: 'CLIENTE',
    mfaHabilitado: true,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('ContratoDetailComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exibe status, conteudo da versao vigente, clausulas e hash', async () => {
    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Aguardando aceite')).toBeTruthy();
    expect(screen.getByText('OBJETO')).toBeTruthy();
    expect(screen.getByText('PRAZO')).toBeTruthy();
    expect(
      screen.getByText('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'),
    ).toBeTruthy();
  });

  it('alterna a visualizacao entre versoes sem mutar o contrato', async () => {
    const { fixture } = await renderDetail(CONTRATO_EM_ASSINATURA_ID);
    await estabilizar(fixture);

    // Vigente (versao 2) selecionada por padrao -> hash bb22.
    expect(screen.getByText('bb22')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Versao 1/ }));
    fixture.detectChanges();

    // Apos selecionar a versao 1, mostra o hash aa11.
    expect(screen.getByText('aa11')).toBeTruthy();
  });

  it('mantem a leitura do contrato quando o historico de versoes falha', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/contratos/:id/versoes', () =>
        HttpResponse.json({ message: 'erro' }, { status: 500 }),
      ),
    );

    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('OBJETO')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra estado "sem versao gerada" quando o contrato nao tem versao vigente', async () => {
    const { fixture } = await renderDetail(CONTRATO_SEM_VERSAO_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/ainda nao tem versao gerada/)).toBeTruthy();
  });

  it('exibe mensagem de erro quando o contrato nao existe (404)', async () => {
    const { fixture } = await renderDetail(CONTRATO_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('com step-up valido, o aceite move o contrato para EM_ASSINATURA', async () => {
    const { fixture } = await renderDetail(CONTRATO_PARA_ACEITE_ID, true);
    await estabilizar(fixture);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    fireEvent.click(screen.getByRole('button', { name: /Aceitar contrato/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Em assinatura')).toBeTruthy();
    expect(screen.getByText(/Aceite registrado em/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Aceitar contrato/ })).toBeNull();
  });

  it('sem step-up, o aceite (403) redireciona para a confirmacao adicional', async () => {
    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID, true);
    await estabilizar(fixture);
    autenticarComMfa(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fireEvent.click(screen.getByRole('button', { name: /Aceitar contrato/ }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/formalizacao/contratos/${CONTRATO_AGUARDANDO_ID}`,
    );
  });

  it('aceite em estado invalido (409) mostra mensagem clara', async () => {
    server.use(
      http.patch('http://localhost:8080/api/v1/contratos/:id/aceite', () =>
        HttpResponse.json({ message: 'estado invalido' }, { status: 409 }),
      ),
    );
    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID, true);
    await estabilizar(fixture);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    fireEvent.click(screen.getByRole('button', { name: /Aceitar contrato/ }));
    await estabilizar(fixture);

    expect(screen.getByText(/nao esta mais aguardando aceite/)).toBeTruthy();
  });

  it('contrato ASSINADO exibe CTA para a agenda de cobranca', async () => {
    const { fixture } = await renderDetail(CONTRATO_ASSINADO_ID);
    await estabilizar(fixture);

    const cta = screen.getByText('Ver agenda de cobranca').closest('a');
    expect(cta?.getAttribute('href')).toBe(
      `/app/cobranca/contratos/${CONTRATO_ASSINADO_ID}/agenda`,
    );
  });

  it('contrato AGUARDANDO_ACEITE nao sugere agenda de cobranca', async () => {
    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID);
    await estabilizar(fixture);

    expect(screen.queryByText('Ver agenda de cobranca')).toBeNull();
  });

  it('exibe o status do envelope de assinatura', async () => {
    const { fixture } = await renderDetail(CONTRATO_EM_ASSINATURA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Enviado para assinatura')).toBeTruthy();
  });

  it('baixa o documento assinado como blob e exibe o hash, revogando o object URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const { fixture } = await renderDetail(CONTRATO_ASSINADO_ID);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: /Baixar documento assinado/ }));
    await estabilizar(fixture);

    expect(createObjectURL).toHaveBeenCalled();
    // Revoga exatamente o object URL criado (sem vazamento).
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    // "Hash do documento" so aparece quando o hash do documento foi lido do header.
    expect(screen.getByText('Hash do documento')).toBeTruthy();
    expect(screen.getAllByText(DOCUMENTO_HASH).length).toBeGreaterThanOrEqual(1);
  });
});

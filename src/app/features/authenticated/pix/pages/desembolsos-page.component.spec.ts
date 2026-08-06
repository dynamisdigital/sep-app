import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PixDesembolsoResponse, UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { PixService } from '../../../../core/pix/pix.service';
import { resetPixState } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/server';
import { DesembolsosPageComponent } from './desembolsos-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const DESEMBOLSOS_URL = 'http://localhost:8080/api/v1/pix/desembolsos';
const CONTRATO_ELEGIVEL_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772a01';
const CONTRATO_INELEGIVEL_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772a02';
const TRANSFERENCIA_CRIADA_ID = 'e0000000-0000-4000-8000-000000000101';

function renderPage() {
  return render(DesembolsosPageComponent, {
    providers: [provideHttpClient(withInterceptors([stepUpInterceptor])), provideRouter([])],
  });
}

function autenticar(
  fixture: ComponentFixture<unknown>,
  role: UsuarioRole,
  mfaHabilitado: boolean,
): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003',
    username: 'operador@empresa.com',
    role,
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

function preencherDesembolso(container: HTMLElement, contratoId: string): void {
  const set = (name: string, value: string) => {
    const el = container.querySelector(`input[formControlName="${name}"]`) as HTMLInputElement;
    fireEvent.input(el, { target: { value } });
  };
  set('contratoId', contratoId);
  set('valor', '10000');
  set('chavePixDestino', 'joao.tomador@banco.com');
}

describe('DesembolsosPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPixState();
  });

  it('FINANCEIRO ve o formulario de novo desembolso', async () => {
    const { fixture } = await renderPage();
    autenticar(fixture, 'FINANCEIRO', true);
    fixture.detectChanges();

    expect(screen.getByRole('button', { name: /Solicitar desembolso/ })).toBeTruthy();
  });

  it('BACKOFFICE nao ve o formulario de novo desembolso, mas pode consultar', async () => {
    const { fixture } = await renderPage();
    autenticar(fixture, 'BACKOFFICE', true);
    fixture.detectChanges();

    expect(screen.queryByRole('button', { name: /Solicitar desembolso/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Abrir desembolso/ })).toBeTruthy();
  });

  it('solicita desembolso com step-up e navega para o detalhe', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO', true);
    fixture.detectChanges();
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    preencherDesembolso(container, CONTRATO_ELEGIVEL_ID);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Solicitar desembolso/ }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(['/app/pix/desembolsos', TRANSFERENCIA_CRIADA_ID]);
  });

  it('sem step-up (403) redireciona para a confirmacao adicional', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO', true);
    fixture.detectChanges();
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    preencherDesembolso(container, CONTRATO_ELEGIVEL_ID);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Solicitar desembolso/ }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith('/app/step-up?next=/app/pix/desembolsos');
  });

  it('422 inelegibilidade mostra o motivo retornado pelo backend', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO', true);
    fixture.detectChanges();
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    preencherDesembolso(container, CONTRATO_INELEGIVEL_ID);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Solicitar desembolso/ }));
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toMatch(/inelegivel/i);
  });

  it('409 conflito mostra mensagem operacional', async () => {
    server.use(
      http.post(DESEMBOLSOS_URL, () =>
        HttpResponse.json({ message: 'duplicado' }, { status: 409 }),
      ),
    );
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO', true);
    fixture.detectChanges();
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    preencherDesembolso(container, CONTRATO_ELEGIVEL_ID);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Solicitar desembolso/ }));
    await estabilizar(fixture);

    expect(screen.getByText(/conflito/i)).toBeTruthy();
  });

  it('nao dispara duas tentativas: submit desabilita durante o envio', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO', true);
    fixture.detectChanges();
    const service = fixture.debugElement.injector.get(PixService);
    const pendente = new Subject<PixDesembolsoResponse>();
    const spy = vi.spyOn(service, 'solicitarDesembolso').mockReturnValue(pendente.asObservable());

    preencherDesembolso(container, CONTRATO_ELEGIVEL_ID);
    fixture.detectChanges();
    const botao = screen.getByRole('button', {
      name: /Solicitar desembolso|Enviando/,
    }) as HTMLButtonElement;

    fireEvent.click(botao);
    fixture.detectChanges();
    expect(botao.disabled).toBe(true);

    fireEvent.click(botao);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('consultar por id navega para o detalhe do desembolso', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'BACKOFFICE', true);
    fixture.detectChanges();
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const input = container.querySelector(
      'input[formControlName="transferenciaId"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: TRANSFERENCIA_CRIADA_ID } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Abrir desembolso/ }));

    expect(navegar).toHaveBeenCalledWith(['/app/pix/desembolsos', TRANSFERENCIA_CRIADA_ID]);
  });

  it('consultar com id apenas de espacos nao navega', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'BACKOFFICE', true);
    fixture.detectChanges();
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const input = container.querySelector(
      'input[formControlName="transferenciaId"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: '   ' } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Abrir desembolso/ }));

    expect(navegar).not.toHaveBeenCalled();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { resetPixState } from '../../../../../mocks/handlers';
import { RecebimentosPageComponent } from './recebimentos-page.component';

const PARCELA_NOVA_ID = 'a0000000-0000-4000-8000-0000000000c3';
const PARCELA_INELEGIVEL_ID = 'a0000000-0000-4000-8000-0000000000c1';
const PARCELA_INEXISTENTE_ID = 'a0000000-0000-4000-8000-0000000000c2';
const REFERENCIA_CRIADA_ID = 'e1000000-0000-4000-8000-000000000101';
const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const RECEBIMENTO_ID = 'e2000000-0000-4000-8000-000000000001';

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

function renderPage() {
  return render(RecebimentosPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

function autenticar(fixture: ComponentFixture<unknown>, role: UsuarioRole): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003',
    username: 'operador@empresa.com',
    role,
    mfaHabilitado: false,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

function preencherParcela(container: HTMLElement, parcelaId: string): void {
  const el = container.querySelector('input[formControlName="parcelaId"]') as HTMLInputElement;
  fireEvent.input(el, { target: { value: parcelaId } });
}

describe('RecebimentosPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPixState();
  });

  it('FINANCEIRO ve o formulario de gerar referencia', async () => {
    const { fixture } = await renderPage();
    autenticar(fixture, 'FINANCEIRO');
    fixture.detectChanges();

    expect(screen.getByRole('button', { name: /Gerar referencia/ })).toBeTruthy();
  });

  it('BACKOFFICE nao ve o formulario de gerar, mas pode consultar', async () => {
    const { fixture } = await renderPage();
    autenticar(fixture, 'BACKOFFICE');
    fixture.detectChanges();

    expect(screen.queryByRole('button', { name: /Gerar referencia/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Abrir referencia/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Abrir recebimento/ })).toBeTruthy();
  });

  it('gera referencia e navega para o detalhe da referencia', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO');
    fixture.detectChanges();
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    preencherParcela(container, PARCELA_NOVA_ID);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Gerar referencia/ }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith([
      '/app/pix/recebimentos/referencias',
      REFERENCIA_CRIADA_ID,
    ]);
  });

  it('422 parcela inelegivel mostra o motivo do backend', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO');
    fixture.detectChanges();

    preencherParcela(container, PARCELA_INELEGIVEL_ID);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Gerar referencia/ }));
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toMatch(/recebivel|valor em aberto/i);
  });

  it('404 parcela inexistente mostra mensagem', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'FINANCEIRO');
    fixture.detectChanges();

    preencherParcela(container, PARCELA_INEXISTENTE_ID);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Gerar referencia/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Parcela nao encontrada.')).toBeTruthy();
  });

  it('consultar referencia por id navega para o detalhe', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'BACKOFFICE');
    fixture.detectChanges();
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const input = container.querySelector(
      'input[formControlName="referenciaId"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: REFERENCIA_ATIVA_ID } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Abrir referencia/ }));

    expect(navegar).toHaveBeenCalledWith([
      '/app/pix/recebimentos/referencias',
      REFERENCIA_ATIVA_ID,
    ]);
  });

  it('consultar recebimento por id navega para o detalhe', async () => {
    const { fixture, container } = await renderPage();
    autenticar(fixture, 'BACKOFFICE');
    fixture.detectChanges();
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const input = container.querySelector(
      'input[formControlName="recebimentoId"]',
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: RECEBIMENTO_ID } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Abrir recebimento/ }));

    expect(navegar).toHaveBeenCalledWith(['/app/pix/recebimentos', RECEBIMENTO_ID]);
  });
});

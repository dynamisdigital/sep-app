import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { resetPixState } from '../../../../../mocks/handlers';
import { DesembolsoDetailPageComponent } from './desembolso-detail-page.component';

const TRANSFERENCIA_CONCLUIDA_ID = 'e0000000-0000-4000-8000-000000000001';
const TRANSFERENCIA_PROCESSANDO_ID = 'e0000000-0000-4000-8000-000000000002';
const TRANSFERENCIA_PROVIDER_OFF_ID = 'e0000000-0000-4000-8000-000000000003';
const TRANSFERENCIA_INEXISTENTE_ID = 'e0000000-0000-4000-8000-0000000000aa';

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

function renderDetail(id: string) {
  return render(DesembolsoDetailPageComponent, {
    providers: [
      provideHttpClient(withInterceptors([stepUpInterceptor])),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

function autenticarMfa(fixture: ComponentFixture<unknown>): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003',
    username: 'financeiro@empresa.com',
    role: 'FINANCEIRO',
    mfaHabilitado: true,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('DesembolsoDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPixState();
  });

  it('carrega e mostra o status local do desembolso', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_CONCLUIDA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Concluida')).toBeTruthy();
    expect(screen.getByText('joa***')).toBeTruthy();
    expect(screen.getByText(/10\.000,00/)).toBeTruthy();
  });

  it('404 mostra desembolso nao encontrado', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Desembolso nao encontrado.')).toBeTruthy();
  });

  it('reconsulta com step-up avanca PROCESSANDO para CONCLUIDA', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROCESSANDO_ID);
    await estabilizar(fixture);
    expect(screen.getByText('Processando')).toBeTruthy();
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    fireEvent.click(screen.getByRole('button', { name: /Reconsultar status/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Concluida')).toBeTruthy();
  });

  it('reconsulta sem step-up (403) redireciona para a confirmacao adicional', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROCESSANDO_ID);
    await estabilizar(fixture);
    autenticarMfa(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fireEvent.click(screen.getByRole('button', { name: /Reconsultar status/ }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/pix/desembolsos/${TRANSFERENCIA_PROCESSANDO_ID}`,
    );
  });

  it('provider indisponivel aparece como alerta, sem sucesso falso', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROVIDER_OFF_ID);
    await estabilizar(fixture);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    fireEvent.click(screen.getByRole('button', { name: /Reconsultar status/ }));
    await estabilizar(fixture);

    expect(screen.getByText(/Provedor indisponivel/)).toBeTruthy();
    expect(screen.getByText('Solicitada')).toBeTruthy();
  });
});

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { server } from '../../../../../mocks/server';
import { ReprocessosPageComponent } from './reprocessos-page.component';

const WEBHOOK_EVENT_ID = 'd0000000-0000-4000-8000-000000000001';
const PIX_ENTIDADE_ID = 'd0000000-0000-4000-8000-000000000002';
const WEBHOOK_URL = `http://localhost:8080/api/v1/backoffice/reprocessos/webhook/${WEBHOOK_EVENT_ID}`;

interface ReprocessoProbe {
  webhookForm: { patchValue: (valor: Record<string, unknown>) => void };
  providerForm: { patchValue: (valor: Record<string, unknown>) => void };
  selecionarAba: (aba: 'webhook' | 'provider') => void;
  reprocessarWebhook: () => void;
  reprocessarProvider: () => void;
}

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

function renderPagina(comStepUp = false) {
  return render(ReprocessosPageComponent, {
    providers: [
      comStepUp ? provideHttpClient(withInterceptors([stepUpInterceptor])) : provideHttpClient(),
      provideRouter([]),
    ],
  });
}

function autenticarComMfa(fixture: ComponentFixture<unknown>): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771004',
    username: 'backoffice@empresa.com',
    role: 'BACKOFFICE',
    mfaHabilitado: true,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('ReprocessosPageComponent', () => {
  it('webhook sem step-up redireciona para a confirmacao adicional', async () => {
    const { fixture } = await renderPagina();
    autenticarComMfa(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.webhookForm.patchValue({ webhookEventId: WEBHOOK_EVENT_ID });
    probe.reprocessarWebhook();
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith('/app/step-up?next=/app/backoffice/reprocessos');
  });

  it('webhook com step-up mostra o resultado do reprocesso', async () => {
    const { fixture } = await renderPagina(true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.webhookForm.patchValue({ webhookEventId: WEBHOOK_EVENT_ID });
    probe.reprocessarWebhook();
    await estabilizar(fixture);

    expect(screen.getByText('Resultado')).toBeTruthy();
    expect(screen.getByText('Sucesso')).toBeTruthy();
  });

  it('provider PIX_TRANSFERENCIA com step-up retorna sucesso', async () => {
    const { fixture } = await renderPagina(true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.selecionarAba('provider');
    probe.providerForm.patchValue({
      tipoChamada: 'PIX_TRANSFERENCIA',
      entidadeId: PIX_ENTIDADE_ID,
    });
    probe.reprocessarProvider();
    await estabilizar(fixture);

    expect(screen.getByText('Sucesso')).toBeTruthy();
  });

  it('mostra mensagem de anti-abuso no 429', async () => {
    server.use(
      http.post(WEBHOOK_URL, () => HttpResponse.json({ message: 'limite' }, { status: 429 })),
    );
    const { fixture } = await renderPagina(true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.webhookForm.patchValue({ webhookEventId: WEBHOOK_EVENT_ID });
    probe.reprocessarWebhook();
    await estabilizar(fixture);

    expect(screen.getByText(/Limite de 3 reprocessos/)).toBeTruthy();
  });
});

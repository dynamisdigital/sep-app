import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { ItemFilaDetailPageComponent } from './item-fila-detail-page.component';

const ITEM_ABERTO_ID = 'c0000000-0000-4000-8000-000000000001';
const ITEM_EM_TRATAMENTO_ID = 'c0000000-0000-4000-8000-000000000002';
const ITEM_DESEMBOLSO_PIX_ID = 'c0000000-0000-4000-8000-000000000005';
const ITEM_INEXISTENTE_ID = 'c0000000-0000-4000-8000-0000000000aa';

interface DetailProbe {
  resolverForm: { patchValue: (valor: Record<string, unknown>) => void };
  comentarioForm: { patchValue: (valor: Record<string, unknown>) => void };
  resolver: () => void;
  comentar: () => void;
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

function activatedRoute(id?: string) {
  return { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } };
}

function renderPagina(id?: string, comStepUp = false) {
  return render(ItemFilaDetailPageComponent, {
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

describe('ItemFilaDetailPageComponent', () => {
  it('mostra titulo, objeto original e comentarios', async () => {
    const { fixture } = await renderPagina(ITEM_EM_TRATAMENTO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Parcela inadimplente ha 35 dias')).toBeTruthy();
    expect(screen.getByText('Parcela 3/12 vencida')).toBeTruthy();
    expect(screen.getByText('Tomador contatado; aguardando comprovante.')).toBeTruthy();
  });

  it('mostra "Item nao encontrado" para id inexistente (404)', async () => {
    const { fixture } = await renderPagina(ITEM_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Item nao encontrado.')).toBeTruthy();
  });

  it('assumir move o item ABERTO para EM_TRATAMENTO', async () => {
    const { fixture } = await renderPagina(ITEM_ABERTO_ID);
    await estabilizar(fixture);

    (screen.getByText('Assumir item').closest('button') as HTMLButtonElement).click();
    await estabilizar(fixture);

    expect(screen.getByText('Em tratamento')).toBeTruthy();
  });

  it('comentar adiciona o comentario ao detalhe', async () => {
    const { fixture } = await renderPagina(ITEM_DESEMBOLSO_PIX_ID);
    await estabilizar(fixture);

    const probe = fixture.componentInstance as unknown as DetailProbe;
    probe.comentarioForm.patchValue({ conteudo: 'Item em verificacao com o time.' });
    probe.comentar();
    await estabilizar(fixture);

    expect(screen.getByText('Item em verificacao com o time.')).toBeTruthy();
  });

  it('resolver sem step-up redireciona para a confirmacao adicional', async () => {
    const { fixture } = await renderPagina(ITEM_EM_TRATAMENTO_ID);
    await estabilizar(fixture);
    autenticarComMfa(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const probe = fixture.componentInstance as unknown as DetailProbe;
    probe.resolverForm.patchValue({
      justificativa: 'Documento validado manualmente apos contato.',
    });
    probe.resolver();
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/backoffice/fila/${ITEM_EM_TRATAMENTO_ID}`,
    );
  });

  it('resolver com step-up valido move o item para RESOLVIDO', async () => {
    const { fixture } = await renderPagina(ITEM_EM_TRATAMENTO_ID, true);
    await estabilizar(fixture);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as DetailProbe;
    probe.resolverForm.patchValue({
      justificativa: 'Documento validado manualmente apos contato.',
    });
    probe.resolver();
    await estabilizar(fixture);

    expect(screen.getByText('Resolvido')).toBeTruthy();
  });

  // ITEM_ABERTO_ID e do tipo WEBHOOK_FALHOU: o atalho de reprocesso de webhook fica disponivel.
  it('reprocessar webhook com step-up mostra o resultado', async () => {
    const { fixture } = await renderPagina(ITEM_ABERTO_ID, true);
    await estabilizar(fixture);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    (screen.getByText('Reprocessar webhook').closest('button') as HTMLButtonElement).click();
    await estabilizar(fixture);

    expect(screen.getByText('Sucesso')).toBeTruthy();
  });
});

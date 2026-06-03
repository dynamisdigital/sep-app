import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { PropostaDetailPageComponent } from './proposta-detail-page.component';

const PROPOSTA_PRE_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02';
const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';
const PROPOSTA_SEM_OWNERSHIP_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const OUTRO_USUARIO_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001';
const PROPOSTA_INEXISTENTE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771dead';
const TOMADOR_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771002';

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

function renderPagina(id?: string) {
  return render(PropostaDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(id) },
    ],
  });
}

function autenticarComo(fixture: ComponentFixture<unknown>, id: string): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id,
    username: 'cliente@empresa.com',
    role: 'CLIENTE',
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('PropostaDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exibe proposta, score e ultimo parecer', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    await estabilizar(fixture);

    expect(screen.getAllByText('Pre-aprovada').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Score')).toBeTruthy();
    expect(screen.getAllByText('720').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Ultimo parecer')).toBeTruthy();
    expect(
      screen.getByText('Aguardando comprovacao de faturamento via Open Finance.'),
    ).toBeTruthy();
  });

  it('mostra atalho Open Finance para o tomador dono em proposta nao final', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    autenticarComo(fixture, TOMADOR_ID);
    await estabilizar(fixture);

    const ofLink = screen.getByText('Compartilhar dados via Open Finance').closest('a');
    expect(ofLink?.getAttribute('href')).toBe(
      `/app/credito/propostas/${PROPOSTA_PRE_APROVADA_ID}/open-finance`,
    );
  });

  it('oculta atalho Open Finance quando o usuario nao e o tomador dono', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    autenticarComo(fixture, OUTRO_USUARIO_ID);
    await estabilizar(fixture);

    expect(screen.queryByText('Compartilhar dados via Open Finance')).toBeNull();
  });

  it('oculta atalho Open Finance quando a proposta esta em status final', async () => {
    const { fixture } = await renderPagina(PROPOSTA_APROVADA_ID);
    autenticarComo(fixture, TOMADOR_ID);
    await estabilizar(fixture);

    expect(screen.getAllByText('Aprovada').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Compartilhar dados via Open Finance')).toBeNull();
  });

  it('renderiza estado de erro com link para a lista em 404', async () => {
    const { fixture } = await renderPagina(PROPOSTA_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
    const voltar = screen.getByText('Ir para a lista de propostas').closest('a');
    expect(voltar?.getAttribute('href')).toBe('/app/credito/propostas');
  });

  it('renderiza estado de erro em 403 de ownership', async () => {
    const { fixture } = await renderPagina(PROPOSTA_SEM_OWNERSHIP_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

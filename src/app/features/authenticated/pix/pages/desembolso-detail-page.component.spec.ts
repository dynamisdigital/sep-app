import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
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
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

// Reconsultar é operação sensível: só FINANCEIRO/ADMIN veem o botão habilitado.
function autenticarFinanceiro(fixture: ComponentFixture<unknown>): void {
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

function selo(): string {
  return document.querySelector('.px27-selo-head')?.textContent?.trim() ?? '';
}

describe('DesembolsoDetailPageComponent — Mockup 27', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPixState();
  });

  it('carrega o desembolso com os blocos do mockup', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_CONCLUIDA_ID);
    await estabilizar(fixture);

    expect(selo()).toBe('Concluída');
    expect(screen.getByRole('heading', { name: 'Dados do desembolso' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Linha do tempo do desembolso' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Informações do contrato' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Informações da proposta' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Informações do recebedor' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Resumo da operação' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Informações complementares' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ações rápidas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Segurança e conformidade' })).toBeTruthy();
    expect(screen.getByText('joa***')).toBeTruthy();
    expect(screen.getAllByText(/10\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('000123456789')).toBeTruthy();
  });

  // A trilha só carimba o que o status garante: concluída fecha as seis etapas.
  it('carimba as seis etapas quando o desembolso está concluído', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_CONCLUIDA_ID);
    await estabilizar(fixture);

    expect(document.querySelectorAll('.px27-timeline-list li').length).toBe(6);
    expect(document.querySelectorAll('.px27-timeline-list li.concluida').length).toBe(6);
  });

  it('desembolso apenas solicitado deixa as etapas seguintes pendentes', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROVIDER_OFF_ID);
    await estabilizar(fixture);

    expect(document.querySelectorAll('.px27-timeline-list li').length).toBe(6);
    expect(document.querySelectorAll('.px27-timeline-list li.concluida').length).toBe(3);
    // NSU e end-to-end só existem depois da liquidação: viram travessão, não texto inventado.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('404 mostra desembolso não encontrado', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Desembolso não encontrado.')).toBeTruthy();
  });

  it('reconsulta com step-up avança PROCESSANDO para CONCLUIDA', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROCESSANDO_ID);
    await estabilizar(fixture);
    autenticarFinanceiro(fixture);
    fixture.detectChanges();
    expect(selo()).toBe('Processando');
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    fireEvent.click(screen.getByRole('button', { name: /Reconsultar no provider/ }));
    await estabilizar(fixture);

    expect(selo()).toBe('Concluída');
    // A transição também fecha os carimbos que o novo status garante.
    expect(document.querySelectorAll('.px27-timeline-list li.concluida').length).toBe(6);
  });

  it('reconsulta sem step-up (403) redireciona para a confirmação adicional', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROCESSANDO_ID);
    await estabilizar(fixture);
    autenticarFinanceiro(fixture);
    fixture.detectChanges();
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fireEvent.click(screen.getByRole('button', { name: /Reconsultar no provider/ }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/pix/desembolsos/${TRANSFERENCIA_PROCESSANDO_ID}`,
    );
  });

  it('provider indisponível aparece como alerta, sem sucesso falso', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROVIDER_OFF_ID);
    await estabilizar(fixture);
    autenticarFinanceiro(fixture);
    fixture.detectChanges();
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    fireEvent.click(screen.getByRole('button', { name: /Reconsultar no provider/ }));
    await estabilizar(fixture);

    expect(screen.getAllByText(/Provider indisponível/).length).toBeGreaterThan(0);
    expect(selo()).toBe('Solicitada');
  });

  it('BACKOFFICE não reconsulta: a ação sensível fica desabilitada com o motivo', async () => {
    const { fixture } = await renderDetail(TRANSFERENCIA_PROCESSANDO_ID);
    await estabilizar(fixture);

    const botao = screen.getByRole('button', { name: /Reconsultar no provider/ });
    expect(botao.hasAttribute('disabled')).toBe(true);
    expect(botao.getAttribute('title')).toContain('FINANCEIRO');
  });
});

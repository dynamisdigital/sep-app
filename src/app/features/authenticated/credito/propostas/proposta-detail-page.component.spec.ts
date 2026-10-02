import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
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
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
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

  it('exibe os blocos do mockup com score e último parecer', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    await estabilizar(fixture);

    expect(screen.getAllByText('Pré-aprovada').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { name: 'Dados da proposta' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Linha do tempo' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Resumo da proposta' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Análise e aprovação' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Segurança e conformidade' })).toBeTruthy();
    expect(screen.getByText('Score do motor')).toBeTruthy();
    expect(screen.getAllByText('720').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Último parecer')).toBeTruthy();
    expect(
      screen.getByText('Aguardando comprovacao de faturamento via Open Finance.'),
    ).toBeTruthy();
  });

  // A trilha só carimba o que o status garante: PRE_APROVADA fecha três etapas e marca a
  // quarta como em andamento, deixando a formalização aguardando.
  it('carimba a linha do tempo conforme o status', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    await estabilizar(fixture);

    expect(document.querySelectorAll('.px28-timeline-list li').length).toBe(5);
    expect(
      document.querySelectorAll('.px28-timeline-list li[data-situacao="CONCLUIDO"]').length,
    ).toBe(3);
    expect(
      document.querySelectorAll('.px28-timeline-list li[data-situacao="EM_ANDAMENTO"]').length,
    ).toBe(1);
  });

  // As três seções nascem fechadas, como no desenho, e abrem uma de cada vez.
  it('as seções recolhíveis abrem uma de cada vez', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    await estabilizar(fixture);
    expect(screen.queryByText('Taxa estimada')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Informações complementares/ }));
    fixture.detectChanges();
    expect(screen.getByText('Taxa estimada')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Documentos anexados/ }));
    fixture.detectChanges();
    expect(screen.queryByText('Taxa estimada')).toBeNull();
    expect(screen.getByText('Contrato social.pdf')).toBeTruthy();
  });

  it('Acompanhar análise abre o histórico na própria tela', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    await estabilizar(fixture);

    fireEvent.click(screen.getAllByRole('button', { name: /Acompanhar análise/ })[0]);
    fixture.detectChanges();

    expect(screen.getByText('Proposta registrada no portal')).toBeTruthy();
  });

  it('mostra atalho Open Finance para o tomador dono em proposta nao final', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    autenticarComo(fixture, TOMADOR_ID);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: 'Mais ações da proposta' }));
    fixture.detectChanges();
    const ofLink = screen.getByText('Compartilhar dados via Open Finance').closest('a');
    expect(ofLink?.getAttribute('href')).toBe(
      `/app/credito/propostas/${PROPOSTA_PRE_APROVADA_ID}/open-finance`,
    );
  });

  it('oculta atalho Open Finance quando o usuario nao e o tomador dono', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    autenticarComo(fixture, OUTRO_USUARIO_ID);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: 'Mais ações da proposta' }));
    fixture.detectChanges();
    expect(screen.queryByText('Compartilhar dados via Open Finance')).toBeNull();
  });

  it('oculta atalho Open Finance quando a proposta esta em status final', async () => {
    const { fixture } = await renderPagina(PROPOSTA_APROVADA_ID);
    autenticarComo(fixture, TOMADOR_ID);
    await estabilizar(fixture);

    expect(screen.getAllByText('Aprovada').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: 'Mais ações da proposta' }));
    fixture.detectChanges();
    expect(screen.queryByText('Compartilhar dados via Open Finance')).toBeNull();
  });

  it('mostra CTA de formalizacao para o tomador dono em proposta APROVADA', async () => {
    const { fixture } = await renderPagina(PROPOSTA_APROVADA_ID);
    autenticarComo(fixture, TOMADOR_ID);
    await estabilizar(fixture);

    const link = screen.getByTitle('Formalizar contrato');
    expect(link.getAttribute('href')).toBe(`/app/formalizacao/proposta/${PROPOSTA_APROVADA_ID}`);
  });

  it('oculta CTA de formalizacao quando a proposta nao esta APROVADA', async () => {
    const { fixture } = await renderPagina(PROPOSTA_PRE_APROVADA_ID);
    autenticarComo(fixture, TOMADOR_ID);
    await estabilizar(fixture);

    expect(screen.queryByTitle('Formalizar contrato')).toBeNull();
    // sem aprovação o ladrilho continua visível, porém desabilitado e com o motivo
    const ladrilho = screen.getByTitle('A formalização abre quando a proposta é aprovada');
    expect(ladrilho.hasAttribute('disabled')).toBe(true);
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

import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { resetPixState } from '../../../../../mocks/handlers';
import { RecebimentoDetailPageComponent } from './recebimento-detail-page.component';

const RECEBIMENTO_CONCILIADO_ID = 'e2000000-0000-4000-8000-000000000001';
const RECEBIMENTO_NAO_IDENTIFICADO_ID = 'e2000000-0000-4000-8000-000000000002';
const RECEBIMENTO_INEXISTENTE_ID = 'e2000000-0000-4000-8000-0000000000aa';
const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const PARCELA_RECEBIVEL_ID = 'a0000000-0000-4000-8000-000000000006';

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

function renderDetail(id: string, role: UsuarioRole) {
  return render(RecebimentoDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      {
        provide: AuthService,
        useValue: {
          // O shell homologado monta o avatar a partir de `username`.
          currentUser: () => ({ role, username: 'admin@empresa.com', mfaHabilitado: false }),
        },
      },
    ],
  });
}

describe('RecebimentoDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPixState();
  });

  it('recebimento CONCILIADO mostra status, referencia e parcela vinculadas', async () => {
    const { fixture } = await renderDetail(RECEBIMENTO_CONCILIADO_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getAllByText('Conciliado').length).toBeGreaterThan(0);
    expect(screen.getByText(REFERENCIA_ATIVA_ID).closest('a')?.getAttribute('href')).toBe(
      `/app/pix/recebimentos/referencias/${REFERENCIA_ATIVA_ID}`,
    );
    // O detalhe da parcela é o Mockup 24, e não a tela financeira.
    expect(screen.getByText(PARCELA_RECEBIVEL_ID).closest('a')?.getAttribute('href')).toBe(
      `/app/cobranca/parcelas/${PARCELA_RECEBIVEL_ID}`,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('apresenta a composicao do Mockup 25 com os sete cartoes', async () => {
    const { fixture } = await renderDetail(RECEBIMENTO_CONCILIADO_ID, 'ADMIN');
    await estabilizar(fixture);

    for (const titulo of [
      'Dados do recebimento',
      'Resumo da conciliação',
      'Linha do tempo do recebimento',
      'Informações da parcela vinculada',
      'Informações complementares',
      'Dados adicionais do Pix',
      'Comprovante do recebimento',
      'Ações rápidas',
      'Segurança e conformidade',
    ]) {
      expect(screen.getByRole('heading', { name: titulo })).toBeTruthy();
    }
  });

  // Campos de apresentação enviados pelo backend: conciliação, parcela, dados técnicos e trilha.
  it('preenche os campos complementares do recebimento conciliado', async () => {
    const { fixture, container } = await renderDetail(RECEBIMENTO_CONCILIADO_ID, 'ADMIN');
    await estabilizar(fixture);

    expect(screen.getByText('CONC-240426-183102')).toBeTruthy();
    expect(screen.getByText('Banco ABCD S.A.')).toBeTruthy();
    expect(screen.getByText('CONT-8d991a11')).toBeTruthy();
    expect(screen.getByText('177.12.45.98')).toBeTruthy();
    expect(screen.getByText('operacional')).toBeTruthy();
    // Cinco marcos da trilha, todos concluídos no caso conciliado.
    expect(container.querySelectorAll('.px25-timeline li').length).toBe(5);
    expect(container.querySelectorAll('.px25-timeline li.pendente').length).toBe(0);
  });

  it('recebimento NAO_IDENTIFICADO mostra divergencia sem vinculo de parcela', async () => {
    const { fixture, container } = await renderDetail(
      RECEBIMENTO_NAO_IDENTIFICADO_ID,
      'FINANCEIRO',
    );
    await estabilizar(fixture);

    expect(screen.getAllByText(/Nao identificado/).length).toBeGreaterThan(0);
    expect(screen.getByRole('alert').textContent).toMatch(/nao localizada/i);
    // Sem vínculo não há conciliação nem parcela: os blocos aparecem como travessão, e a trilha
    // para nos dois marcos que o evento do provider garante.
    expect(container.querySelectorAll('.px25-vazio').length).toBeGreaterThan(10);
    expect(container.querySelectorAll('.px25-timeline li.pendente').length).toBe(3);
  });

  it('nenhum campo renderiza em branco no recebimento conciliado', async () => {
    const { fixture, container } = await renderDetail(RECEBIMENTO_CONCILIADO_ID, 'ADMIN');
    await estabilizar(fixture);

    const valores = Array.from(container.querySelectorAll('.px25-card dd'));
    expect(valores.length).toBeGreaterThan(20);
    expect(valores.filter((el) => (el.textContent ?? '').trim() === '').length).toBe(0);
  });

  it('nenhum campo renderiza em branco no recebimento sem vínculo', async () => {
    const { fixture, container } = await renderDetail(RECEBIMENTO_NAO_IDENTIFICADO_ID, 'ADMIN');
    await estabilizar(fixture);

    const valores = Array.from(container.querySelectorAll('.px25-card dd'));
    expect(valores.length).toBeGreaterThan(20);
    expect(valores.filter((el) => (el.textContent ?? '').trim() === '').length).toBe(0);
  });

  it('atalho da parcela leva ao detalhe da parcela', async () => {
    const { fixture } = await renderDetail(RECEBIMENTO_CONCILIADO_ID, 'ADMIN');
    await estabilizar(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fireEvent.click(screen.getByRole('button', { name: /Abrir detalhes da parcela/ }));

    expect(navigate).toHaveBeenCalledWith(['/app/cobranca/parcelas', PARCELA_RECEBIVEL_ID]);
  });

  it('404 mostra recebimento nao encontrado', async () => {
    const { fixture } = await renderDetail(RECEBIMENTO_INEXISTENTE_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Recebimento não encontrado.')).toBeTruthy();
  });
});

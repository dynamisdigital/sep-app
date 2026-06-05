import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { ParcelaFinanceiraPageComponent } from './parcela-financeira-page.component';

const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';
const PARCELA_PAGA_ID = 'a0000000-0000-4000-8000-000000000004';

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

function renderParcela(id: string) {
  return render(ParcelaFinanceiraPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

describe('ParcelaFinanceiraPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('parcela recebivel mostra composicao e formulario de recebimento', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Valor em aberto')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Registrar recebimento/ })).toBeTruthy();
  });

  it('parcela PAGA bloqueia recebimento manual', async () => {
    const { fixture } = await renderParcela(PARCELA_PAGA_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/nao aceita recebimento manual/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Registrar recebimento/ })).toBeNull();
  });

  it('registra recebimento valido e passa a listar o recebimento da parcela', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    const valor = container.querySelector(
      'input[formControlName="valorRecebido"]',
    ) as HTMLInputElement;
    fireEvent.input(valor, { target: { value: '500' } });
    const data = container.querySelector(
      'input[formControlName="dataRecebimento"]',
    ) as HTMLInputElement;
    fireEvent.input(data, { target: { value: '2026-06-05T10:00' } });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Registrar recebimento/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Recebimentos desta parcela')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('envia dataRecebimento como ISO UTC (OffsetDateTime aceito pelo backend)', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);
    const service = fixture.debugElement.injector.get(CobrancaService);
    const spy = vi.spyOn(service, 'registrarRecebimento');

    const valor = container.querySelector(
      'input[formControlName="valorRecebido"]',
    ) as HTMLInputElement;
    fireEvent.input(valor, { target: { value: '500' } });
    const data = container.querySelector(
      'input[formControlName="dataRecebimento"]',
    ) as HTMLInputElement;
    fireEvent.input(data, { target: { value: '2026-06-05T10:00' } });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Registrar recebimento/ }));
    await estabilizar(fixture);

    expect(spy).toHaveBeenCalledTimes(1);
    const request = spy.mock.calls[0][1];
    expect(request.dataRecebimento).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

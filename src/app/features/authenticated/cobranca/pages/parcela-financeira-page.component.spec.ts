import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecebimentoResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { server } from '../../../../../mocks/server';
import { ParcelaFinanceiraPageComponent } from './parcela-financeira-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';
const PARCELA_PAGA_ID = 'a0000000-0000-4000-8000-000000000004';
const PARCELA_RENEG_ATIVA_ID = 'a0000000-0000-4000-8000-000000000007';
const RECEBIMENTOS_URL = 'http://localhost:8080/api/v1/cobranca/parcelas/:id/recebimentos';

function preencherRecebimento(container: HTMLElement): void {
  const valor = container.querySelector(
    'input[formControlName="valorRecebido"]',
  ) as HTMLInputElement;
  fireEvent.input(valor, { target: { value: '500' } });
  const data = container.querySelector(
    'input[formControlName="dataRecebimento"]',
  ) as HTMLInputElement;
  fireEvent.input(data, { target: { value: '2026-06-05T10:00' } });
}

function renderParcela(id: string, comStepUp = false) {
  return render(ParcelaFinanceiraPageComponent, {
    providers: [
      comStepUp ? provideHttpClient(withInterceptors([stepUpInterceptor])) : provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

function autenticarFinanceiro(fixture: ComponentFixture<unknown>, mfaHabilitado: boolean): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003',
    username: 'financeiro@empresa.com',
    role: 'FINANCEIRO',
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
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

  it('erro 400 mostra mensagem de validacao do backend', async () => {
    server.use(
      http.post(RECEBIMENTOS_URL, () =>
        HttpResponse.json({ message: 'payload invalido' }, { status: 400 }),
      ),
    );
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);
    preencherRecebimento(container);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Registrar recebimento/ }));
    await estabilizar(fixture);

    expect(screen.getByText('payload invalido')).toBeTruthy();
  });

  it('erro 409 mostra conflito e recarrega o estado da parcela', async () => {
    server.use(
      http.post(RECEBIMENTOS_URL, () =>
        HttpResponse.json({ message: 'conflito' }, { status: 409 }),
      ),
    );
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);
    preencherRecebimento(container);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Registrar recebimento/ }));
    await estabilizar(fixture);

    expect(screen.getByText(/conflito ou parcela nao aceita pagamento/)).toBeTruthy();
    // Recarregou o detalhe (parcela continua visivel apos o 409).
    expect(screen.getByText('Parcela 2')).toBeTruthy();
  });

  it('nao dispara duas tentativas: submit desabilita durante o envio', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);
    const service = fixture.debugElement.injector.get(CobrancaService);
    const pendente = new Subject<RecebimentoResponse>();
    const spy = vi.spyOn(service, 'registrarRecebimento').mockReturnValue(pendente.asObservable());

    preencherRecebimento(container);
    fixture.detectChanges();
    const botao = screen.getByRole('button', {
      name: /Registrar recebimento|Registrando/,
    }) as HTMLButtonElement;

    fireEvent.click(botao);
    fixture.detectChanges();
    expect(botao.disabled).toBe(true);

    fireEvent.click(botao);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('registra contato manual com descricao', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    const descricao = container.querySelector(
      'textarea[formControlName="descricao"]',
    ) as HTMLTextAreaElement;
    fireEvent.input(descricao, { target: { value: 'Cliente prometeu pagar sexta.' } });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Registrar contato/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Contato registrado.')).toBeTruthy();
  });

  it('propoe renegociacao com step-up e mostra a proposta criada', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID, true);
    await estabilizar(fixture);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    preencherRenegociacao(container);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Propor renegociacao/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Proposta de renegociacao criada')).toBeTruthy();
  });

  it('renegociacao com proposta ativa (409) mostra conflito', async () => {
    const { fixture, container } = await renderParcela(PARCELA_RENEG_ATIVA_ID, true);
    await estabilizar(fixture);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    preencherRenegociacao(container);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Propor renegociacao/ }));
    await estabilizar(fixture);

    expect(screen.getByText(/Ja existe renegociacao ativa/)).toBeTruthy();
  });

  it('renegociacao sem step-up (403) redireciona para a confirmacao adicional', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID, true);
    await estabilizar(fixture);
    autenticarFinanceiro(fixture, true);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    preencherRenegociacao(container);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Propor renegociacao/ }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/cobranca/financeiro/parcelas/${PARCELA_ATRASADA_ID}`,
    );
  });

  it('renegociacao 403 sem MFA habilitado mostra erro e nao redireciona', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID, true);
    await estabilizar(fixture);
    autenticarFinanceiro(fixture, false);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    preencherRenegociacao(container);
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /Propor renegociacao/ }));
    await estabilizar(fixture);

    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

function preencherRenegociacao(container: HTMLElement): void {
  const set = (name: string, value: string) => {
    const el = container.querySelector(`[formControlName="${name}"]`) as HTMLInputElement;
    fireEvent.input(el, { target: { value } });
  };
  set('novoValorParcela', '950');
  set('novoVencimento', '2026-07-10');
  set('numeroParcelas', '6');
  set('desconto', '50');
  set('justificativa', 'Acordo com o tomador.');
}

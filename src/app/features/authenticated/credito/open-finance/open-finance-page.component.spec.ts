import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { OpenFinancePageComponent } from './open-finance-page.component';

const PROPOSTA_EM_ANALISE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c01';
const PROPOSTA_OF_PENDENTE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c05';
const PROPOSTA_OF_AUTORIZADO_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c06';
const PROPOSTA_SEM_OWNERSHIP_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';

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

function activatedRoute(id: string, retorno = false) {
  return { snapshot: { paramMap: convertToParamMap({ id }), data: { retorno } } };
}

function renderPagina(id: string, retorno = false) {
  return render(OpenFinancePageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: activatedRoute(id, retorno) },
    ],
  });
}

describe('OpenFinancePageComponent', () => {
  it('mostra formulario de inicio quando ainda nao ha consentimento (404)', async () => {
    const { fixture } = await renderPagina(PROPOSTA_EM_ANALISE_ID);
    await estabilizar(fixture);

    expect(screen.getByLabelText('CPF ou CNPJ do titular da conta')).toBeTruthy();
  });

  it('inicia consentimento, faz handoff da URL e atualiza status', async () => {
    const { fixture } = await renderPagina(PROPOSTA_EM_ANALISE_ID);
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText('CPF ou CNPJ do titular da conta'), {
      target: { value: '52998224725' },
    });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar consentimento/ }));
    await estabilizar(fixture);

    expect(abrir).toHaveBeenCalledWith(
      'https://provider.openfinance.example/authorize?consent=fake',
      '_blank',
      'noopener',
    );
    abrir.mockRestore();
  });

  it('exibe agregados sanitizados quando AUTORIZADO', async () => {
    const { fixture } = await renderPagina(PROPOSTA_OF_AUTORIZADO_ID);
    await estabilizar(fixture);

    // O status cru virou rotulo em portugues; o selo e a situacao mostram o mesmo estado.
    expect(screen.getAllByText('Autorizado').length).toBeGreaterThan(0);
    expect(screen.getByText('Movimentação consolidada')).toBeTruthy();
    expect(screen.getByText('Meses avaliados')).toBeTruthy();
  });

  it('exibe status PENDENTE existente sem oferecer novo formulario', async () => {
    const { fixture } = await renderPagina(PROPOSTA_OF_PENDENTE_ID);
    await estabilizar(fixture);

    expect(screen.getAllByText('Aguardando autorização').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('CPF ou CNPJ do titular da conta')).toBeNull();
  });

  it('exibe orientacao de retorno na rota de retorno', async () => {
    const { fixture } = await renderPagina(PROPOSTA_OF_AUTORIZADO_ID, true);
    await estabilizar(fixture);

    expect(screen.getByText(/Você voltou da autorização/)).toBeTruthy();
  });

  it('mostra erro quando a proposta e de outro dono (403)', async () => {
    const { fixture } = await renderPagina(PROPOSTA_SEM_OWNERSHIP_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });
  // A mascara mostra o documento pontuado e guarda so os digitos: o contrato do backend pede
  // `^\d{11}$|^\d{14}$`, e antes o campo pedia digitos crus com o placeholder pontuado.
  it('mascara o documento e mantem o canonico no controle', async () => {
    const { fixture } = await renderPagina(PROPOSTA_EM_ANALISE_ID);
    await estabilizar(fixture);

    const campo = screen.getByLabelText('CPF ou CNPJ do titular da conta') as HTMLInputElement;
    fireEvent.input(campo, { target: { value: '52998224725' } });
    fixture.detectChanges();

    expect(campo.value).toBe('529.982.247-25');
    const componente = fixture.componentInstance as unknown as {
      form: { controls: { cpfCnpjTomador: { value: string } } };
    };
    expect(componente.form.controls.cpfCnpjTomador.value).toBe('52998224725');
  });

  it('aceita CNPJ de 14 digitos', async () => {
    const { fixture } = await renderPagina(PROPOSTA_EM_ANALISE_ID);
    await estabilizar(fixture);

    const campo = screen.getByLabelText('CPF ou CNPJ do titular da conta') as HTMLInputElement;
    fireEvent.input(campo, { target: { value: '11111111000191' } });
    fixture.detectChanges();

    expect(campo.value).toBe('11.111.111/0001-91');
    const componente = fixture.componentInstance as unknown as {
      form: { valid: boolean };
    };
    expect(componente.form.valid).toBe(true);
  });

  // Valores monetarios saem no padrao brasileiro, e os numeros batem com a carteira canonica.
  it('apresenta as medias em pt-BR', async () => {
    const { fixture } = await renderPagina(PROPOSTA_OF_AUTORIZADO_ID);
    await estabilizar(fixture);

    const texto = (document.body.textContent ?? '').replace(/\u00a0/g, ' ');
    expect(texto).toContain('R$ 18.000,00');
    expect(texto).toContain('R$ 15.400,00');
    expect(texto).toContain('R$ 3.200,00');
  });

  it('explica os tres passos do handoff antes de iniciar', async () => {
    const { fixture } = await renderPagina(PROPOSTA_EM_ANALISE_ID);
    await estabilizar(fixture);

    const passos = [...document.querySelectorAll('.px58-passos li')].map((e) =>
      (e.textContent ?? '').trim(),
    );
    expect(passos.length).toBe(3);
    // O segundo passo e o que evita o mal-entendido: a autorizacao nao acontece no SEP.
    expect(passos[1]).toContain('acontece no seu banco, não aqui');
  });
});

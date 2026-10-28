import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { CorrespondentesRedeService } from '../../../core/correspondentes/correspondentes-rede.service';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import {
  carteiraDaRede,
  comissaoDaRede,
  minhaPosicao,
  redeDoMajoritario,
} from '../../../../mocks/data/correspondentes-rede.store';
import {
  ID_CORRESPONDENTE_CARLA,
  ID_SUB_BRUNO,
} from '../../../../mocks/data/correspondentes.store';
import { MinhaRedePageComponent } from './minha-rede-page.component';

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  fixture.detectChanges();
}

function renderComo(id: string) {
  const servico: Partial<CorrespondentesRedeService> = {
    consultarMinhaPosicao: () => of(minhaPosicao(id)),
    consultarRede: () => of(redeDoMajoritario(id)),
    consultarCarteira: () => of(carteiraDaRede(id)),
    consultarComissoes: () => of(comissaoDaRede(id)),
  };
  return render(MinhaRedePageComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
      { provide: CorrespondentesRedeService, useValue: servico },
    ],
  });
}

describe('MinhaRedePageComponent', () => {
  it('majoritario: mostra o resumo, o limite do SEP e os subs da rede', async () => {
    const { fixture } = await renderComo(ID_CORRESPONDENTE_CARLA);
    await estabilizar(fixture);

    expect(screen.getByText('Limite de repasse imposto pelo SEP')).toBeTruthy();
    expect(screen.getAllByText('Bruno Teixeira').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Novo sub-correspondente/ })).toBeTruthy();
    expect(screen.getAllByText('Fica com você').length).toBeGreaterThan(0);
  });

  it('recusa na tela um repasse acima do teto do SEP e mantem o botao desabilitado', async () => {
    const { fixture } = await renderComo(ID_CORRESPONDENTE_CARLA);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: /Novo sub-correspondente/ }));
    fixture.detectChanges();
    const preencher = (nome: string, valor: string) =>
      fireEvent.input(document.querySelector(`input[name="${nome}"]`) as HTMLInputElement, {
        target: { value: valor },
      });
    preencher('nome', 'Sub Novo');
    preencher('cpf', '529.982.247-25');
    preencher('email', 'novo@teste.com');
    preencher('telefone', '(11) 90000-0000');
    await estabilizar(fixture);

    const credenciar = screen.getByRole('button', { name: 'Credenciar' }) as HTMLButtonElement;
    expect(credenciar.disabled).toBe(false);

    const campo = screen.getAllByLabelText(/repasse \(%\)/)[0] as HTMLInputElement;
    fireEvent.input(campo, { target: { value: '99' } });
    await estabilizar(fixture);

    expect(
      screen
        .getAllByRole('alert')
        .some((a) => /limite de .* que o SEP permite/.test(a.textContent ?? '')),
    ).toBe(true);
    expect((screen.getByRole('button', { name: 'Credenciar' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('sub: ve so a propria posicao, sem a gestao da rede', async () => {
    const { fixture } = await renderComo(ID_SUB_BRUNO);
    await estabilizar(fixture);

    expect(screen.getByText('Sua posição')).toBeTruthy();
    expect(screen.getByText(/Sub-correspondente de/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Novo sub-correspondente/ })).toBeNull();
    expect(screen.queryByText('Fica com você')).toBeNull();
  });
});

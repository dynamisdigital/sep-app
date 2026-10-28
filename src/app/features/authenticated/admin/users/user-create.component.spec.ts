import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { resetGovernancaState } from '../../../../../mocks/handlers';
import { UserCreateComponent } from './user-create.component';
import { CHAVE_ROLES_PENDENTES } from './usuario-papeis';

const SENHA_VALIDA = 'SepNovo#2026x';

async function esperarResposta(fixture: { detectChanges: () => void }): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  fixture.detectChanges();
}

async function setup() {
  const result = await render(UserCreateComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
  const router = result.fixture.debugElement.injector.get(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return { ...result, navigate };
}

function preencher(email: string, senha = SENHA_VALIDA, confirmacao = senha): void {
  fireEvent.input(screen.getByLabelText(/E-mail/), { target: { value: email } });
  fireEvent.input(screen.getByLabelText(/Senha inicial/), { target: { value: senha } });
  fireEvent.input(screen.getByLabelText(/Confirmar senha/), { target: { value: confirmacao } });
}

describe('UserCreateComponent', () => {
  beforeEach(() => {
    resetGovernancaState();
    window.sessionStorage.removeItem(CHAVE_ROLES_PENDENTES);
  });

  it('nao envia o formulario vazio e aponta cada campo', async () => {
    const { fixture, navigate } = await setup();

    fireEvent.click(screen.getByRole('button', { name: /Criar usuário/ }));
    fixture.detectChanges();

    expect(screen.getByText('Informe o e-mail.')).toBeTruthy();
    expect(screen.getByText('Repita a senha.')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('marca os criterios da politica de senha conforme a digitacao', async () => {
    const { fixture } = await setup();

    fireEvent.input(screen.getByLabelText(/Senha inicial/), { target: { value: 'abc' } });
    fixture.detectChanges();
    const ok = () => document.querySelectorAll('.px62-criterio-ok').length;
    expect(ok()).toBe(0);

    fireEvent.input(screen.getByLabelText(/Senha inicial/), { target: { value: SENHA_VALIDA } });
    fixture.detectChanges();
    expect(ok()).toBe(4);
  });

  it('recusa confirmacao diferente da senha', async () => {
    const { fixture, navigate } = await setup();

    preencher('nova@empresa.com', SENHA_VALIDA, 'OutraSenha#2026');
    fireEvent.click(screen.getByRole('button', { name: /Criar usuário/ }));
    fixture.detectChanges();

    expect(screen.getByText('As senhas não conferem.')).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('so CLIENTE: cria e abre o detalhe, sem papeis pendentes', async () => {
    const { fixture, navigate } = await setup();

    preencher('Nova.Cliente@Empresa.com');
    fireEvent.click(screen.getByRole('button', { name: /Criar usuário/ }));
    await esperarResposta(fixture);

    expect(navigate).toHaveBeenCalledWith(
      ['/app/admin/users', expect.stringMatching(/^1f0799c0-/)],
      { queryParams: { criado: 1 } },
    );
    expect(window.sessionStorage.getItem(CHAVE_ROLES_PENDENTES)).toBeNull();
  });

  it('com outros papeis: grava a intencao para o detalhe aplicar com step-up', async () => {
    const { fixture, navigate } = await setup();

    preencher('nova.operadora@empresa.com');
    fireEvent.click(screen.getByRole('button', { name: 'BACKOFFICE' }));
    fixture.detectChanges();
    expect(screen.getByText('Papéis aplicados com TOTP')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Criar usuário/ }));
    await esperarResposta(fixture);

    const [[rota]] = navigate.mock.calls as unknown as [[string[]]];
    const pendente = JSON.parse(window.sessionStorage.getItem(CHAVE_ROLES_PENDENTES) ?? '{}');
    expect(pendente.usuarioId).toBe(rota[1]);
    expect(pendente.roles).toEqual(['BACKOFFICE', 'CLIENTE']);
  });

  it('e-mail ja cadastrado mostra o conflito e continua na tela', async () => {
    const { fixture, navigate } = await setup();

    preencher('admin@empresa.com');
    fireEvent.click(screen.getByRole('button', { name: /Criar usuário/ }));
    await esperarResposta(fixture);

    expect(screen.getByRole('alert').textContent).toContain(
      'Já existe um usuário com este e-mail.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('exige ao menos um papel', async () => {
    const { fixture, navigate } = await setup();

    preencher('sem.papel@empresa.com');
    fireEvent.click(screen.getByRole('button', { name: 'CLIENTE' }));
    fixture.detectChanges();
    expect(screen.getByText('Selecione ao menos um papel.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Criar usuário/ }));
    await esperarResposta(fixture);
    expect(navigate).not.toHaveBeenCalled();
  });
});

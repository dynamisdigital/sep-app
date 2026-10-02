import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { UsersListComponent } from './users-list.component';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function setup() {
  const result = await render(UsersListComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

function emailsNaTabela(): string[] {
  return Array.from(document.querySelectorAll('.px38-usuario-texto strong')).map((el) =>
    (el.textContent ?? '').trim(),
  );
}

describe('UsersListComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('carrega usuarios e renderiza a tabela', async () => {
    await setup();

    expect(screen.getByText('admin@empresa.com')).toBeTruthy();
    expect(screen.getByText('cliente@empresa.com')).toBeTruthy();
    // A base fictitia tem mais de um ADMIN (inclusive o usuario de acesso rapido do
    // ambiente de desenvolvimento), entao a asserção é por ocorrência, não por unicidade.
    expect(screen.getAllByText('ADMIN').length).toBeGreaterThan(0);
    expect(screen.getByText('CLIENTE')).toBeTruthy();
  });

  // A descricao do papel e derivada do proprio role, para a linha explicar o perfil sem
  // depender de outra tela.
  it('cada linha descreve o papel do usuario', async () => {
    await setup();

    expect(screen.getAllByText('Administrador do sistema').length).toBeGreaterThan(0);
    expect(screen.getByText('Usuário cliente')).toBeTruthy();
    expect(screen.getAllByText('Analista financeiro').length).toBeGreaterThan(0);
  });

  // Os agregados do topo somam a propria lista devolvida; onde nao ha endpoint, degrada.
  it('resumo soma a lista e marca a metrica sem endpoint', async () => {
    await setup();

    const usuarios = screen.getByText('Usuários ativos').closest('.px38-metrica');
    expect(usuarios?.textContent).toContain(String(emailsNaTabela().length));

    const permissoes = screen.getByText('Permissões').closest('.px38-metrica');
    expect(permissoes?.textContent).toContain('—');
    expect(screen.getByText('sem endpoint de catálogo')).toBeTruthy();
  });

  it('filtro local por e-mail reduz a lista', async () => {
    const result = await setup();

    fireEvent.input(screen.getByLabelText(/filtrar por e-mail/i), {
      target: { value: 'admin' },
    });
    result.fixture.detectChanges();

    expect(screen.getByText('admin@empresa.com')).toBeTruthy();
    expect(screen.queryByText('cliente@empresa.com')).toBeNull();
  });

  it('estado vazio aparece quando filtro nao encontra', async () => {
    const result = await setup();

    fireEvent.input(screen.getByLabelText(/filtrar por e-mail/i), {
      target: { value: 'inexistente' },
    });
    result.fixture.detectChanges();

    expect(screen.getByText(/nenhum usuário encontrado/i)).toBeTruthy();
  });

  it('ordenacao por e-mail alterna entre crescente e decrescente', async () => {
    const result = await setup();

    const cabecalho = screen.getByRole('button', { name: /E-mail/i });
    fireEvent.click(cabecalho);
    result.fixture.detectChanges();
    const crescente = emailsNaTabela();

    fireEvent.click(cabecalho);
    result.fixture.detectChanges();
    const decrescente = emailsNaTabela();

    expect(crescente[0]).not.toBe(decrescente[0]);
    expect([...crescente].reverse()).toEqual(decrescente);
  });

  it('paginacao divide a lista e a contagem acompanha', async () => {
    const result = await setup();
    const total = emailsNaTabela().length;

    fireEvent.change(screen.getByLabelText(/usuários por página/i), { target: { value: '5' } });
    result.fixture.detectChanges();

    expect(emailsNaTabela().length).toBe(5);
    expect(screen.getByText(new RegExp(`Mostrando 1 a 5 de ${total}`))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    result.fixture.detectChanges();

    expect(emailsNaTabela().length).toBe(total - 5);
    expect(screen.getByText(new RegExp(`Mostrando 6 a ${total} de ${total}`))).toBeTruthy();
  });

  it('Novo usuario abre o cadastro; acoes sem endpoint ficam desabilitadas', async () => {
    await setup();

    const novo = screen.getByRole('link', { name: /Novo usuário/ });
    expect(novo.getAttribute('href')).toBe('/app/admin/users/novo');

    const exportar = screen.getByRole('button', { name: /Exportar/ });
    expect(exportar.hasAttribute('disabled')).toBe(true);
  });

  it('link de detalhe aponta para /app/admin/users/{id}', async () => {
    await setup();

    const links = screen.getAllByRole('link', { name: /ver detalhe/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toMatch(/^\/app\/admin\/users\//);
  });
});

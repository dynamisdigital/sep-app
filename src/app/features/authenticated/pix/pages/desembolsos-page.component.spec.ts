import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { DesembolsosPageComponent } from './desembolsos-page.component';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';

const EXEMPLO_ID = 'e0000000-0000-4000-8000-000000000001';

function renderPage() {
  return render(DesembolsosPageComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
    ],
  });
}

function autenticar(fixture: ComponentFixture<unknown>, role: UsuarioRole): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003',
    username: 'operador@empresa.com',
    role,
    mfaHabilitado: true,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('DesembolsosPageComponent — Mockup 21', () => {
  beforeEach(() => window.localStorage.clear());

  it('exibe consulta e o desembolso de exemplo coerente com o mockup', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Desembolsos Pix' })).toBeTruthy();
    expect(screen.getByDisplayValue(EXEMPLO_ID)).toBeTruthy();
    expect(screen.getAllByText('R$ 1.250,00').length).toBeGreaterThan(0);
    expect(screen.getByText(/CONCLUÍDO/)).toBeTruthy();
    expect(screen.getAllByText('PIX SPI').length).toBeGreaterThan(0);
  });

  it('renderiza as cinco etapas e os quatro cartões laterais', async () => {
    await renderPage();

    expect(screen.getByText('Solicitado')).toBeTruthy();
    expect(screen.getByText('Validado')).toBeTruthy();
    expect(screen.getByText('Enviado ao SPI')).toBeTruthy();
    expect(screen.getByText('Liquidado')).toBeTruthy();
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Segurança Pix' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Resumo da operação' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Informações adicionais' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ações rápidas' })).toBeTruthy();
  });

  it('mantém valores, taxa, total e duração coerentes com os dados de exemplo', async () => {
    await renderPage();

    expect(screen.getAllByText('R$ 1.250,00').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('R$ 0,00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1m 13s')).toBeTruthy();
    expect(screen.getByText('30/05/2026 11:41:02')).toBeTruthy();
    expect(screen.getAllByText('30/05/2026 11:42:15').length).toBeGreaterThan(0);
    expect(screen.getByText('30/05/2026 11:43:01')).toBeTruthy();
  });

  it('o botão Detalhado alterna efetivamente o modo do resultado', async () => {
    const { fixture } = await renderPage();
    const botao = screen.getByRole('button', { name: /Detalhado/ });

    expect(botao.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(botao);
    fixture.detectChanges();

    expect(screen.getByRole('button', { name: /Resumido/ }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('consulta outro ID no serviço e atualiza o resultado na própria tela', async () => {
    const { fixture, container } = await renderPage();
    const pix = fixture.debugElement.injector.get(PixService);
    vi.spyOn(pix, 'consultarDesembolso').mockReturnValue(
      of({
        transferenciaId: 'e0000000-0000-4000-8000-000000000002',
        contratoId: 'CONT-TESTE',
        status: 'PROCESSANDO',
        valor: 980,
        chaveDestinoMascara: 'abc***',
        providerIndisponivel: false,
      }),
    );
    const input = container.querySelector('#px21-id') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'e0000000-0000-4000-8000-000000000002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    fixture.detectChanges();

    expect(pix.consultarDesembolso).toHaveBeenCalledOnce();
    expect(screen.getByText('R$ 980,00')).toBeTruthy();
    expect(screen.getByText(/PROCESSANDO/)).toBeTruthy();
  });

  it('não consulta quando o identificador contém apenas espaços', async () => {
    const { fixture, container } = await renderPage();
    const pix = fixture.debugElement.injector.get(PixService);
    const consultar = vi.spyOn(pix, 'consultarDesembolso');
    fireEvent.input(container.querySelector('#px21-id') as HTMLInputElement, {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(consultar).not.toHaveBeenCalled();
  });

  it('limpar remove o identificador e o resultado', async () => {
    const { container } = await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect((container.querySelector('#px21-id') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('Desembolso encontrado')).toBeNull();
  });

  it('BACKOFFICE não recebe o formulário sensível de novo desembolso', async () => {
    const { fixture } = await renderPage();
    autenticar(fixture, 'BACKOFFICE');
    const probe = fixture.componentInstance as unknown as {
      solicitarAberto: { set: (valor: boolean) => void };
    };
    probe.solicitarAberto.set(true);
    fixture.detectChanges();

    expect(screen.queryByRole('dialog', { name: 'Novo desembolso' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Solicitar desembolso' })).toBeNull();
  });

  // O modal é aberto pelo botão do cabeçalho — o mesmo que some para quem não pode solicitar.
  it('FINANCEIRO abre o formulário sensível pelo botão do cabeçalho', async () => {
    const { fixture } = await renderPage();
    autenticar(fixture, 'FINANCEIRO');
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar desembolso' }));
    fixture.detectChanges();

    const dialogo = screen.getByRole('dialog', { name: 'Novo desembolso' });
    expect(dialogo).toBeTruthy();
    expect(within(dialogo).getByRole('button', { name: 'Solicitar desembolso' })).toBeTruthy();
  });
});

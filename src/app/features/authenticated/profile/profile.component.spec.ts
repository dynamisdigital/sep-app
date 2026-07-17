import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PerfilOperacionalResponse, UsuarioResponse } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../../../core/profile/profile.service';
import { ProfileComponent } from './profile.component';

const user: UsuarioResponse = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771004',
  username: 'backoffice@empresa.com',
  role: 'BACKOFFICE',
  dataCriacao: '2026-04-24T18:30:00-03:00',
  dataModificacao: '2026-04-24T18:30:00-03:00',
  criadoPor: 'system',
  modificadoPor: 'system',
  precisaRedefinirSenha: false,
  mfaHabilitado: true,
};

const profile: PerfilOperacionalResponse = {
  statusConta: 'ATIVA',
  contaVerificada: true,
  nivelAcesso: 'Administrador',
  ultimoAcesso: '2026-07-17T11:52:31-03:00',
  ultimaAutenticacao: '2026-07-17T11:52:31-03:00',
  tentativasLogin24h: 0,
  dispositivosAutorizados: 3,
  sessoesAtivas: 3,
  senhaForte: true,
  auditoriaAtiva: true,
  armazenamentoSincronizado: true,
  preferencias: {
    idioma: 'Português (Brasil)',
    fusoHorario: '(UTC-03:00) Brasília',
    tema: 'ESCURO',
    notificacoesAtivas: true,
    canalComunicacao: 'E-mail corporativo',
  },
  atualizadoEm: '2026-07-17T12:00:00-03:00',
};

async function renderProfile(service: Partial<ProfileService> = {}) {
  const profileService = {
    consultar: vi.fn(() => of(profile)),
    atualizarPreferencias: vi.fn(() => of(profile)),
    ...service,
  };
  const result = await render(ProfileComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: ProfileService, useValue: profileService },
    ],
  });
  const auth = result.fixture.debugElement.injector.get(AuthService) as AuthService & {
    currentUserState: { set: (value: UsuarioResponse | null) => void };
  };
  auth.currentUserState.set(user);
  result.fixture.detectChanges();
  return { result, profileService };
}

describe('ProfileComponent', () => {
  it('renderiza identidade, acesso, auditoria, seguranca e preferencias', async () => {
    await renderProfile();

    expect(screen.getByRole('heading', { name: 'Meu perfil' })).toBeTruthy();
    expect(screen.getAllByText('backoffice@empresa.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BACKOFFICE').length).toBeGreaterThan(0);
    expect(screen.getByText('Identificação e Acesso')).toBeTruthy();
    expect(screen.getByText('Auditoria da Conta')).toBeTruthy();
    expect(screen.getByText('Segurança da conta')).toBeTruthy();
    expect(screen.getByText('Informações complementares')).toBeTruthy();
    expect(screen.getByText('Administrador')).toBeTruthy();
    expect(screen.getByText('Português (Brasil)')).toBeTruthy();
    expect(screen.getByAltText('Avatar da conta').getAttribute('src')).toBe(
      '/image/sep_mockup_04_assets/icons/icon_profile_avatar_b.png',
    );
    expect(
      document.querySelector(
        'img[src="/image/sep_mockup_04_assets/icons/icon_security_mfa_lock.png"]',
      ),
    ).toBeTruthy();
    expect(document.querySelector('sep-profile lucide-icon')).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar para a tela anterior' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /editar perfil/i })).toHaveLength(1);
    expect(screen.getByText('Logs de auditoria')).toBeTruthy();
    expect(screen.getByText('Armazenamento')).toBeTruthy();
    expect(document.querySelector('.profile-regulatory-art img')).toBeTruthy();
    expect(document.querySelector('.profile-hero-hud')).toBeNull();
    expect(document.querySelector('.profile-now-badge')?.textContent).toContain('Agora');
    expect(document.querySelectorAll('.profile-live-state i')).toHaveLength(2);
    expect(
      screen
        .getByRole('button', { name: 'Copiar ID da conta' })
        .querySelector('.profile-copy-icon'),
    ).toBeTruthy();
  });

  it('abre a edicao e persiste preferencias pelo servico', async () => {
    const { profileService } = await renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
    expect(screen.getByRole('dialog', { name: 'Editar preferências' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'SISTEMA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(profileService.atualizarPreferencias).toHaveBeenCalledWith(
      expect.objectContaining({ tema: 'SISTEMA' }),
    );
    expect(screen.getByText('Preferências atualizadas com sucesso.')).toBeTruthy();
  });

  it('cancela a edicao sem persistir', async () => {
    const { profileService } = await renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(profileService.atualizarPreferencias).not.toHaveBeenCalled();
  });

  it('apresenta erro recuperavel quando os dados complementares falham', async () => {
    await renderProfile({
      consultar: vi.fn(() => throwError(() => new Error('indisponivel'))),
    });

    expect(
      screen.getByText('Não foi possível carregar os dados complementares do perfil.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });
});

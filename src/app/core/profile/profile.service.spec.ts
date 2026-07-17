import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ProfileService);
  });

  it('consulta os dados operacionais complementares do perfil', async () => {
    const profile = await firstValueFrom(service.consultar());

    expect(profile.statusConta).toBe('ATIVA');
    expect(profile.nivelAcesso).toBeTruthy();
    expect(profile.preferencias.idioma).toBeTruthy();
  });

  it('persiste preferencias no laboratorio MSW', async () => {
    const updated = await firstValueFrom(
      service.atualizarPreferencias({
        idioma: 'English',
        fusoHorario: '(UTC+00:00) UTC',
        tema: 'SISTEMA',
        notificacoesAtivas: false,
        canalComunicacao: 'Notificação na plataforma',
      }),
    );
    const reloaded = await firstValueFrom(service.consultar());

    expect(updated.preferencias.tema).toBe('SISTEMA');
    expect(reloaded.preferencias).toEqual(updated.preferencias);
  });
});

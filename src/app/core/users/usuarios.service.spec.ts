import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuariosService } from './usuarios.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

describe('UsuariosService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
  });

  it('listar() retorna lista do GET /usuarios', async () => {
    const service = TestBed.inject(UsuariosService);

    const usuarios = await awaitObservable(service.listar());

    expect(Array.isArray(usuarios)).toBe(true);
    expect(usuarios.length).toBeGreaterThanOrEqual(1);
    expect(usuarios.some((u) => u.username === 'admin@empresa.com')).toBe(true);
  });

  it('buscarPorId(id) retorna usuario do GET /usuarios/{id}', async () => {
    const service = TestBed.inject(UsuariosService);

    const usuario = await awaitObservable(
      service.buscarPorId('1f0799c0-98b9-6d9d-bc4a-7d6f5b771002'),
    );

    expect(usuario.username).toBe('cliente@empresa.com');
    expect(usuario.role).toBe('CLIENTE');
  });

  it('alterarSenha(id, payload) chama PATCH /usuarios/{id}/senha em sucesso', async () => {
    const service = TestBed.inject(UsuariosService);

    await expect(
      awaitObservable(
        service.alterarSenha('1f0799c0-98b9-6d9d-bc4a-7d6f5b771001', {
          passwordAtual: '123456',
          novaSenha: '654321',
        }),
      ),
    ).resolves.toBeNull();
  });

  it('alterarSenha falha com senha atual invalida', async () => {
    const service = TestBed.inject(UsuariosService);

    await expect(
      awaitObservable(
        service.alterarSenha('1f0799c0-98b9-6d9d-bc4a-7d6f5b771001', {
          passwordAtual: 'errada',
          novaSenha: '654321',
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});

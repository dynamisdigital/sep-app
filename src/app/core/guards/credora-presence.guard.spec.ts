import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { CredoraService } from '../credora/credora.service';
import { credoraPresenceGuard } from './credora-presence.guard';

type GuardResult = boolean | UrlTree;

function configurar(consultarMinhaCredora: () => Observable<unknown>): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CredoraService, useValue: { consultarMinhaCredora } },
    ],
  });
}

function executarGuard(): Promise<GuardResult> {
  const resultado = TestBed.runInInjectionContext(() =>
    credoraPresenceGuard({} as never, {} as never),
  );
  return firstValueFrom(isObservable(resultado) ? resultado : of(resultado as GuardResult));
}

describe('credoraPresenceGuard', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('libera quando o usuario tem credora', async () => {
    configurar(() => of({ id: 'cr-1' }));

    await expect(executarGuard()).resolves.toBe(true);
  });

  it('roteia ao cadastro quando o backend responde 404 (sem credora)', async () => {
    configurar(() => throwError(() => new HttpErrorResponse({ status: 404 })));

    const resultado = await executarGuard();
    const router = TestBed.inject(Router);
    expect(resultado).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/app/credora/cadastro');
  });

  it('libera em erro nao-404 para a pagina surfacar a falha', async () => {
    configurar(() => throwError(() => new HttpErrorResponse({ status: 500 })));

    await expect(executarGuard()).resolves.toBe(true);
  });
});

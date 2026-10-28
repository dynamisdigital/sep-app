import { ComponentFixture } from '@angular/core/testing';

import { AuthService } from '../app/core/auth/auth.service';

/**
 * Faz login como `admin@empresa.com` pelo `AuthService` do injector do componente renderizado. A
 * request cai no handler de `POST /auth/login` do MSW (`src/mocks/handlers.ts`), que aceita as
 * credenciais do dev-offline.
 */
export async function logarAdmin(result: { fixture: ComponentFixture<unknown> }): Promise<void> {
  const auth = result.fixture.debugElement.injector.get<AuthService>(AuthService);
  await new Promise<void>((resolve, reject) => {
    auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
      next: () => resolve(),
      error: reject,
    });
  });
}

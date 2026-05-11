import { Injectable, signal } from '@angular/core';

/**
 * Sprint 5: armazena temporariamente o step-up token cru em memoria (nao
 * localStorage — token de uso unico curto). Lido pelo {@code stepUpInterceptor}
 * para anexar como {@code X-Step-Up-Token} na proxima request sensivel; uma vez
 * consumido pelo backend, e descartado.
 */
@Injectable({ providedIn: 'root' })
export class StepUpTokenStore {
  private readonly tokenState = signal<string | null>(null);

  readonly token = this.tokenState.asReadonly();

  set(token: string): void {
    this.tokenState.set(token);
  }

  consume(): string | null {
    const valor = this.tokenState();
    this.tokenState.set(null);
    return valor;
  }

  clear(): void {
    this.tokenState.set(null);
  }
}

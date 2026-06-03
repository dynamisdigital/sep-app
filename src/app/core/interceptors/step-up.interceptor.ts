import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { StepUpTokenStore } from '../auth/step-up-token.store';

/**
 * Anexa {@code X-Step-Up-Token} (Sprint 5) na proxima request quando o store
 * estiver populado. O token e consumido (uso unico) apos anexar.
 */
export const stepUpInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(StepUpTokenStore);
  const token = store.token();
  if (!token) {
    return next(req);
  }
  // Anexa apenas em operacoes sensiveis conhecidas para nao gastar o token em chamadas irrelevantes.
  const exigeStepUp =
    (req.url.includes('/usuarios/') && req.url.endsWith('/senha')) ||
    req.url.endsWith('/auth/totp/disable') ||
    (req.url.includes('/contratos/') && req.url.endsWith('/aceite'));
  if (!exigeStepUp) {
    return next(req);
  }
  store.consume();
  return next(
    req.clone({
      setHeaders: { 'X-Step-Up-Token': token },
    }),
  );
};

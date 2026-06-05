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
  // O guard de metodo evita consumir o token (uso unico) num GET acidental para uma URL
  // terminada em /aceite. Cobranca (F-9.5): propor renegociacao (POST) e aceite do tomador
  // (PATCH) exigem step-up; a recusa NAO entra (o backend nao exige step-up na recusa).
  const exigeStepUp =
    (req.url.includes('/usuarios/') && req.url.endsWith('/senha')) ||
    req.url.endsWith('/auth/totp/disable') ||
    (req.method === 'PATCH' && req.url.includes('/contratos/') && req.url.endsWith('/aceite')) ||
    (req.method === 'POST' &&
      req.url.includes('/cobranca/parcelas/') &&
      req.url.endsWith('/renegociacao')) ||
    (req.method === 'PATCH' &&
      req.url.includes('/cobranca/renegociacoes/') &&
      req.url.endsWith('/aceite'));
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

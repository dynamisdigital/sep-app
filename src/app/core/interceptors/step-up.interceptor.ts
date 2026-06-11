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
  // Backoffice (F-10.5): resolver e ignorar item da fila exigem step-up (@RequireStepUp).
  // Governanca (F-12.3): mutacoes de roles cumulativas (PUT substitui o conjunto; POST/DELETE
  // role individual) exigem step-up. O GET /usuarios/:id/roles (leitura) NAO consome token —
  // por isso o guard de metodo: o PUT termina em /roles; POST/DELETE tem /roles/ no path.
  // Governanca (F-12.4): alterar parametro operacional (PATCH /governanca/parametros/:chave)
  // exige step-up; os GET de lista/detalhe nao (guard de metodo PATCH).
  // Pix (F-13.3): solicitar desembolso (POST /pix/desembolsos, step-up estrito) e reconciliar
  // status no provider (POST /pix/desembolsos/:id/status) exigem step-up. O guard de metodo POST
  // cobre os dois e exclui os GET de leitura; gerar referencia (POST /pix/recebimentos/...) NAO
  // exige step-up e fica fora deste path.
  const exigeStepUp =
    (req.url.includes('/usuarios/') && req.url.endsWith('/senha')) ||
    (req.method === 'PUT' && req.url.includes('/usuarios/') && req.url.endsWith('/roles')) ||
    ((req.method === 'POST' || req.method === 'DELETE') &&
      req.url.includes('/usuarios/') &&
      req.url.includes('/roles/')) ||
    (req.method === 'PATCH' && req.url.includes('/governanca/parametros/')) ||
    req.url.endsWith('/auth/totp/disable') ||
    (req.method === 'PATCH' && req.url.includes('/contratos/') && req.url.endsWith('/aceite')) ||
    (req.method === 'POST' &&
      req.url.includes('/cobranca/parcelas/') &&
      req.url.endsWith('/renegociacao')) ||
    (req.method === 'PATCH' &&
      req.url.includes('/cobranca/renegociacoes/') &&
      req.url.endsWith('/aceite')) ||
    (req.method === 'PATCH' &&
      req.url.includes('/backoffice/fila/') &&
      (req.url.endsWith('/resolver') || req.url.endsWith('/ignorar'))) ||
    (req.method === 'POST' && req.url.includes('/backoffice/reprocessos/')) ||
    (req.method === 'POST' && req.url.includes('/pix/desembolsos'));
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

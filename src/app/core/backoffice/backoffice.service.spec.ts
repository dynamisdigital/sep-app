import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { BackofficeService } from './backoffice.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

// Sentinelas espelhando os handlers MSW de backoffice (src/mocks/handlers.ts).
const ITEM_ABERTO_ID = 'c0000000-0000-4000-8000-000000000001';
const ITEM_EM_TRATAMENTO_ID = 'c0000000-0000-4000-8000-000000000002';
const ITEM_RESOLVIDO_ID = 'c0000000-0000-4000-8000-000000000003';
const ITEM_INEXISTENTE_ID = 'c0000000-0000-4000-8000-0000000000aa';
const WEBHOOK_EVENT_ID = 'd0000000-0000-4000-8000-000000000001';
const PIX_ENTIDADE_ID = 'd0000000-0000-4000-8000-000000000002';

describe('BackofficeService', () => {
  let service: BackofficeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(BackofficeService);
  });

  describe('consultarDashboard', () => {
    it('retorna os contadores e valores consolidados do backend', async () => {
      const dashboard = await awaitObservable(service.consultarDashboard());

      expect(dashboard.contadoresPorStatus.length).toBeGreaterThan(0);
      expect(dashboard.recebimentosDoDia).toBeGreaterThan(0);
      expect(dashboard.inadimplenciaTotal.numeroParcelas).toBeGreaterThanOrEqual(0);
      expect(dashboard.geradoEm).toBeTruthy();
    });
  });

  describe('listarFila', () => {
    it('retorna a pagina completa sem filtro', async () => {
      const page = await awaitObservable(service.listarFila());

      expect(page.content.length).toBeGreaterThan(0);
      expect(page.totalElements).toBe(page.content.length);
    });

    it('filtra por status enviando o query param correto', async () => {
      const page = await awaitObservable(service.listarFila({ status: 'ABERTO' }));

      expect(page.content.length).toBeGreaterThan(0);
      expect(page.content.every((i) => i.status === 'ABERTO')).toBe(true);
    });
  });

  describe('consultarItem', () => {
    it('retorna o detalhe com comentarios e objeto original', async () => {
      const item = await awaitObservable(service.consultarItem(ITEM_EM_TRATAMENTO_ID));

      expect(item.id).toBe(ITEM_EM_TRATAMENTO_ID);
      expect(Array.isArray(item.comentarios)).toBe(true);
      expect(item.objetoOriginal?.tipoEntidade).toBe('PARCELA_COBRANCA');
    });

    it('rejeita com 404 quando o item nao existe', async () => {
      await expect(
        awaitObservable(service.consultarItem(ITEM_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('assumirItem', () => {
    it('transiciona item ABERTO para EM_TRATAMENTO', async () => {
      const item = await awaitObservable(service.assumirItem(ITEM_ABERTO_ID));

      expect(item.status).toBe('EM_TRATAMENTO');
      expect(item.atribuidoA).toBeTruthy();
    });

    it('rejeita com 409 quando o item nao esta ABERTO', async () => {
      await expect(awaitObservable(service.assumirItem(ITEM_RESOLVIDO_ID))).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('registrarComentario', () => {
    it('cria comentario com 201', async () => {
      const comentario = await awaitObservable(
        service.registrarComentario(ITEM_ABERTO_ID, { conteudo: 'Em analise pela equipe.' }),
      );

      expect(comentario.conteudo).toBe('Em analise pela equipe.');
      expect(comentario.autorId).toBeTruthy();
    });

    it('rejeita com 400 quando o conteudo e vazio', async () => {
      await expect(
        awaitObservable(service.registrarComentario(ITEM_ABERTO_ID, { conteudo: '' })),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  // O step-up e anexado pelo stepUpInterceptor (Tasks F-10.5/F-10.6), nao pelo service. Sem o
  // header X-Step-Up-Token o backend (@RequireStepUp) responde 403 — comportamento real aqui.
  describe('operacoes sensiveis sem step-up', () => {
    it('resolver rejeita com 403', async () => {
      await expect(
        awaitObservable(
          service.resolverItem(ITEM_EM_TRATAMENTO_ID, {
            justificativa: 'Documento validado manualmente apos contato.',
          }),
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('ignorar rejeita com 403', async () => {
      await expect(
        awaitObservable(
          service.ignorarItem(ITEM_ABERTO_ID, {
            justificativa: 'Item duplicado de outro fluxo em tratamento.',
          }),
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('reprocessar webhook rejeita com 403', async () => {
      await expect(
        awaitObservable(service.reprocessarWebhook(WEBHOOK_EVENT_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('reprocessar provider rejeita com 403', async () => {
      await expect(
        awaitObservable(service.reprocessarProvider('PIX_TRANSFERENCIA', PIX_ENTIDADE_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});

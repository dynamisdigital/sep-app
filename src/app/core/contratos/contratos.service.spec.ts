import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { ContratosService } from './contratos.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

const CONTRATO_AGUARDANDO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01';
const CONTRATO_EM_ASSINATURA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e02';
const CONTRATO_ASSINADO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const CONTRATO_RECUSADO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e04';
const CONTRATO_SEM_OWNERSHIP_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const CONTRATO_INEXISTENTE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771dead';
const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';
const PROPOSTA_PRE_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02';

describe('ContratosService', () => {
  let service: ContratosService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ContratosService);
  });

  describe('consultarContrato', () => {
    it('retorna contrato AGUARDANDO_ACEITE com versao vigente e clausulas ordenadas', async () => {
      const contrato = await awaitObservable(service.consultarContrato(CONTRATO_AGUARDANDO_ID));

      expect(contrato.status).toBe('AGUARDANDO_ACEITE');
      expect(contrato.tipo).toBe('MUTUO');
      expect(contrato.versaoVigente?.clausulas.map((c) => c.ordem)).toEqual([1, 2]);
      expect(contrato.aceite).toBeNull();
    });

    it('rejeita com 403 quando o contrato e de outro tomador', async () => {
      await expect(
        awaitObservable(service.consultarContrato(CONTRATO_SEM_OWNERSHIP_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejeita com 404 quando o contrato nao existe', async () => {
      await expect(
        awaitObservable(service.consultarContrato(CONTRATO_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('consultarContratoPorProposta', () => {
    it('retorna contrato da proposta aprovada', async () => {
      const contrato = await awaitObservable(
        service.consultarContratoPorProposta(PROPOSTA_APROVADA_ID),
      );

      expect(contrato.id).toBe(CONTRATO_AGUARDANDO_ID);
      expect(contrato.propostaId).toBe(PROPOSTA_APROVADA_ID);
    });

    it('rejeita com 404 quando a proposta ainda nao tem contrato gerado', async () => {
      await expect(
        awaitObservable(service.consultarContratoPorProposta(PROPOSTA_PRE_APROVADA_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('listarVersoes', () => {
    it('retorna historico ordenado com a versao vigente primeiro', async () => {
      const versoes = await awaitObservable(service.listarVersoes(CONTRATO_EM_ASSINATURA_ID));

      expect(versoes.map((v) => v.numero)).toEqual([2, 1]);
    });
  });

  describe('registrarAceite', () => {
    // O token de step-up e anexado pelo stepUpInterceptor (F-8.4), nao pelo service.
    // Sem o header, o backend (@RequireStepUp) responde 403 — comportamento real aqui.
    it('rejeita com 403 quando nao ha step-up (sem X-Step-Up-Token)', async () => {
      await expect(
        awaitObservable(service.registrarAceite(CONTRATO_AGUARDANDO_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('consultarStatusAssinatura', () => {
    it('reflete envelope ENVIADO para contrato em assinatura', async () => {
      const status = await awaitObservable(
        service.consultarStatusAssinatura(CONTRATO_EM_ASSINATURA_ID),
      );

      expect(status.statusContrato).toBe('EM_ASSINATURA');
      expect(status.statusEnvelope).toBe('ENVIADO');
    });

    it('reflete envelope ASSINADO para contrato assinado', async () => {
      const status = await awaitObservable(service.consultarStatusAssinatura(CONTRATO_ASSINADO_ID));

      expect(status.statusEnvelope).toBe('ASSINADO');
    });

    it('reflete envelope RECUSADO', async () => {
      const status = await awaitObservable(service.consultarStatusAssinatura(CONTRATO_RECUSADO_ID));

      expect(status.statusEnvelope).toBe('RECUSADO');
    });
  });

  describe('baixarDocumentoAssinado', () => {
    it('retorna o PDF como blob com o hash no header X-Document-Hash-Sha256', async () => {
      const response = await awaitObservable(service.baixarDocumentoAssinado(CONTRATO_ASSINADO_ID));

      expect(response.body).toBeInstanceOf(Blob);
      expect(response.headers.get('X-Document-Hash-Sha256')).toBeTruthy();
    });

    it('rejeita com 409 quando o contrato existe mas ainda nao foi assinado', async () => {
      await expect(
        awaitObservable(service.baixarDocumentoAssinado(CONTRATO_AGUARDANDO_ID)),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rejeita com 404 quando o contrato nao existe', async () => {
      await expect(
        awaitObservable(service.baixarDocumentoAssinado(CONTRATO_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});

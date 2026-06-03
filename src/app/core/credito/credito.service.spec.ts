import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { CreditoService } from './credito.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

const PROPOSTA_PRE_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02';
const PROPOSTA_OF_PENDENTE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c05';
const PROPOSTA_OF_AUTORIZADO_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c06';
const PROPOSTA_SEM_OWNERSHIP_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const PROPOSTA_INEXISTENTE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771dead';
const ONBOARDING_APROVADO = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01';
const ONBOARDING_NAO_APROVADO = '99999999-9999-9999-9999-999999999999';

describe('CreditoService', () => {
  let service: CreditoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(CreditoService);
  });

  describe('propostas', () => {
    it('criarProposta() retorna proposta EM_ANALISE no POST /credito/propostas', async () => {
      const proposta = await awaitObservable(
        service.criarProposta({
          solicitacaoOnboardingId: ONBOARDING_APROVADO,
          tipoOperacao: 'CAPITAL_GIRO',
          valorSolicitado: 10000,
          prazoMeses: 12,
        }),
      );

      expect(proposta.id).toBeTruthy();
      expect(proposta.status).toBe('EM_ANALISE');
    });

    it('criarProposta() rejeita com 422 quando onboarding nao esta APROVADO_FINAL', async () => {
      await expect(
        awaitObservable(
          service.criarProposta({
            solicitacaoOnboardingId: ONBOARDING_NAO_APROVADO,
            tipoOperacao: 'CAPITAL_GIRO',
            valorSolicitado: 10000,
            prazoMeses: 12,
          }),
        ),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('listarPropostas() retorna pagina com os status do tomador', async () => {
      const page = await awaitObservable(service.listarPropostas());

      expect(page.content.length).toBe(4);
      expect(page.content.map((p) => p.status)).toContain('PRE_APROVADA');
      expect(page.empty).toBe(false);
    });

    it('listarPropostas() aplica filtro de status sem quebrar', async () => {
      const page = await awaitObservable(service.listarPropostas({ status: 'PENDENCIA' }));

      expect(page.content.length).toBeGreaterThanOrEqual(1);
    });

    it('consultarProposta() retorna proposta com score e parecer', async () => {
      const proposta = await awaitObservable(service.consultarProposta(PROPOSTA_PRE_APROVADA_ID));

      expect(proposta.status).toBe('PRE_APROVADA');
      expect(proposta.score?.valor).toBe(720);
      expect(proposta.parecer?.decisao).toBe('PENDENCIA');
    });

    it('consultarProposta() rejeita com 403 quando proposta e de outro dono', async () => {
      await expect(
        awaitObservable(service.consultarProposta(PROPOSTA_SEM_OWNERSHIP_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('consultarProposta() rejeita com 404 quando proposta nao existe', async () => {
      await expect(
        awaitObservable(service.consultarProposta(PROPOSTA_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('open finance', () => {
    it('iniciarConsentimentoOpenFinance() retorna urlAutorizacao no 201', async () => {
      const resposta = await awaitObservable(
        service.iniciarConsentimentoOpenFinance(PROPOSTA_PRE_APROVADA_ID, {
          cpfCnpjTomador: '52998224725',
          redirectUri: 'https://app.sep/app/credito/propostas/x/open-finance/retorno',
        }),
      );

      expect(resposta.status).toBe('PENDENTE');
      expect(resposta.urlAutorizacao).toMatch(/^https:\/\//);
    });

    it('iniciarConsentimentoOpenFinance() rejeita com 409 quando ja ha consentimento pendente', async () => {
      await expect(
        awaitObservable(
          service.iniciarConsentimentoOpenFinance(PROPOSTA_OF_PENDENTE_ID, {
            cpfCnpjTomador: '52998224725',
            redirectUri: 'https://app.sep/retorno',
          }),
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('consultarOpenFinance() retorna agregados quando AUTORIZADO', async () => {
      const status = await awaitObservable(service.consultarOpenFinance(PROPOSTA_OF_AUTORIZADO_ID));

      expect(status.statusConsentimento).toBe('AUTORIZADO');
      expect(status.ultimaMovimentacao?.numeroMesesAvaliados).toBe(6);
    });

    it('consultarOpenFinance() retorna PENDENTE sem movimentacao', async () => {
      const status = await awaitObservable(service.consultarOpenFinance(PROPOSTA_OF_PENDENTE_ID));

      expect(status.statusConsentimento).toBe('PENDENTE');
      expect(status.ultimaMovimentacao).toBeNull();
    });

    it('consultarOpenFinance() rejeita com 403 quando proposta e de outro dono', async () => {
      await expect(
        awaitObservable(service.consultarOpenFinance(PROPOSTA_SEM_OWNERSHIP_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});

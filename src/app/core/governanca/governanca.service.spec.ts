import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { GovernancaService } from './governanca.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

// Sentinelas espelhando os fakes de governanca dos handlers MSW (src/mocks/handlers.ts).
const FINANCEIRO_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003';
const MULTIROLE_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771005';
const USUARIO_INEXISTENTE_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b7710aa';
const PARAMETRO_COM_HISTORICO = 'credito.score.pre-aprovacao';

describe('GovernancaService', () => {
  let service: GovernancaService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(GovernancaService);
  });

  describe('consultarRoles', () => {
    it('retorna o conjunto e a role principal do usuario', async () => {
      const resposta = await awaitObservable(service.consultarRoles(FINANCEIRO_ID));

      expect(resposta.roles).toEqual(['FINANCEIRO']);
      expect(resposta.principal).toBe('FINANCEIRO');
    });

    it('expoe a principal por precedencia para usuario multi-role (FINANCEIRO + BACKOFFICE)', async () => {
      const resposta = await awaitObservable(service.consultarRoles(MULTIROLE_ID));

      expect(resposta.roles).toContain('FINANCEIRO');
      expect(resposta.roles).toContain('BACKOFFICE');
      expect(resposta.principal).toBe('FINANCEIRO');
    });

    it('rejeita com 404 quando o usuario nao existe', async () => {
      await expect(
        awaitObservable(service.consultarRoles(USUARIO_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // O step-up e anexado pelo stepUpInterceptor, nao pelo service. Sem o header X-Step-Up-Token
  // o backend (@RequireStepUp) responde 403 — comportamento real exercitado aqui.
  describe('mutacoes de roles sem step-up', () => {
    it('substituirRoles rejeita com 403', async () => {
      await expect(
        awaitObservable(
          service.substituirRoles(FINANCEIRO_ID, { roles: ['FINANCEIRO', 'BACKOFFICE'] }),
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('adicionarRole rejeita com 403', async () => {
      await expect(
        awaitObservable(service.adicionarRole(FINANCEIRO_ID, 'BACKOFFICE')),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('removerRole rejeita com 403', async () => {
      await expect(
        awaitObservable(service.removerRole(MULTIROLE_ID, 'BACKOFFICE')),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('listarParametros', () => {
    it('retorna os parametros do seed com tipos variados', async () => {
      const parametros = await awaitObservable(service.listarParametros());

      expect(parametros.length).toBeGreaterThan(0);
      expect(parametros.some((p) => p.chave === 'credito.valor.maximo.pf')).toBe(true);
      const tipos = new Set(parametros.map((p) => p.tipo));
      expect(tipos.has('INTEGER')).toBe(true);
      expect(tipos.has('DECIMAL')).toBe(true);
    });
  });

  describe('consultarParametro', () => {
    it('retorna detalhe + historico (mais recente primeiro)', async () => {
      const detalhe = await awaitObservable(service.consultarParametro(PARAMETRO_COM_HISTORICO));

      expect(detalhe.parametro.chave).toBe(PARAMETRO_COM_HISTORICO);
      expect(detalhe.historico.length).toBeGreaterThanOrEqual(2);
      expect(detalhe.historico[0].versao).toBeGreaterThan(detalhe.historico[1].versao);
    });

    it('rejeita com 404 quando a chave nao existe', async () => {
      await expect(
        awaitObservable(service.consultarParametro('chave.inexistente')),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('alterarParametro sem step-up', () => {
    it('rejeita com 403', async () => {
      await expect(
        awaitObservable(
          service.alterarParametro(PARAMETRO_COM_HISTORICO, {
            novoValor: '680',
            justificativa: 'Ajuste de score apos revisao de risco.',
          }),
        ),
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});

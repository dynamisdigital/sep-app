import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetGovernancaState } from '../../../mocks/handlers';
import { GovernancaService } from './governanca.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

// Sentinelas espelhando os fakes de governanca dos handlers MSW (src/mocks/handlers.ts).
const ADMIN_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001';
const FINANCEIRO_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003';
const MULTIROLE_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771005';
const USUARIO_INEXISTENTE_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b7710aa';
const PARAMETRO_COM_HISTORICO = 'credito.score.pre-aprovacao';

// O stepUpInterceptor real so reconhece as URLs de governanca a partir das Tasks F-12.3/F-12.4
// (e e testado la, em step-up.interceptor.spec.ts). Aqui um interceptor de teste simula a
// presenca do X-Step-Up-Token quando `anexarStepUp` esta ligado, permitindo exercitar o
// caminho feliz (200) e as regras de dominio (auto-edicao 403, ultima role 400) do MSW.
let anexarStepUp = false;
const stepUpDeTeste: HttpInterceptorFn = (req, next) =>
  anexarStepUp
    ? next(req.clone({ setHeaders: { 'X-Step-Up-Token': 'mock-step-up-token' } }))
    : next(req);

describe('GovernancaService', () => {
  let service: GovernancaService;

  beforeEach(() => {
    resetGovernancaState();
    anexarStepUp = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([stepUpDeTeste]))],
    });
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

  // Sem o header X-Step-Up-Token (anexarStepUp = false) o backend (@RequireStepUp) responde 403.
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

  // Com step-up presente: valida URL/metodo/body (o conjunto retornado prova o body enviado)
  // e as regras de dominio que o MSW replica do backend.
  describe('mutacoes de roles com step-up', () => {
    beforeEach(() => {
      anexarStepUp = true;
    });

    it('substituirRoles aplica o conjunto enviado e retorna roles + principal', async () => {
      const resposta = await awaitObservable(
        service.substituirRoles(FINANCEIRO_ID, { roles: ['FINANCEIRO', 'BACKOFFICE'] }),
      );

      expect(new Set(resposta.roles)).toEqual(new Set(['FINANCEIRO', 'BACKOFFICE']));
      expect(resposta.principal).toBe('FINANCEIRO');
    });

    it('adicionarRole inclui a role mantendo as existentes', async () => {
      const resposta = await awaitObservable(service.adicionarRole(FINANCEIRO_ID, 'BACKOFFICE'));

      expect(new Set(resposta.roles)).toEqual(new Set(['FINANCEIRO', 'BACKOFFICE']));
    });

    it('removerRole remove a role do conjunto', async () => {
      const resposta = await awaitObservable(service.removerRole(MULTIROLE_ID, 'BACKOFFICE'));

      expect(resposta.roles).toEqual(['FINANCEIRO']);
    });

    it('rejeita com 403 ao editar as proprias roles do admin (auto-protecao)', async () => {
      await expect(
        awaitObservable(service.substituirRoles(ADMIN_ID, { roles: ['ADMIN'] })),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejeita com 400 ao remover a ultima role do usuario', async () => {
      await expect(
        awaitObservable(service.removerRole(FINANCEIRO_ID, 'FINANCEIRO')),
      ).rejects.toMatchObject({ status: 400 });
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

  describe('alterarParametro com step-up', () => {
    beforeEach(() => {
      anexarStepUp = true;
    });

    it('altera o valor, incrementa a versao e registra no historico', async () => {
      const atualizado = await awaitObservable(
        service.alterarParametro('credito.valor.maximo.pf', {
          novoValor: '60000.00',
          justificativa: 'Reajuste do teto PF apos revisao de politica.',
        }),
      );

      expect(atualizado.valor).toBe('60000.00');
      expect(atualizado.versao).toBe(2);

      const detalhe = await awaitObservable(service.consultarParametro('credito.valor.maximo.pf'));
      expect(detalhe.historico[0]).toMatchObject({
        versao: 2,
        valorAnterior: '50000.00',
        valorNovo: '60000.00',
      });
    });

    it('rejeita com 400 valor incompativel com o tipo', async () => {
      await expect(
        awaitObservable(
          service.alterarParametro('credito.prazo.maximo.pf.meses', {
            novoValor: 'doze',
            justificativa: 'Valor textual invalido para INTEGER.',
          }),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});

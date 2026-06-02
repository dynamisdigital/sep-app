import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { OnboardingService } from './onboarding.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

function arquivoFake(): File {
  return new File(['conteudo'], 'documento.png', { type: 'image/png' });
}

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(OnboardingService);
  });

  describe('pessoa fisica', () => {
    it('iniciarPessoa() retorna solicitacao INICIADO no POST /onboarding/pessoa', async () => {
      const resposta = await awaitObservable(
        service.iniciarPessoa({
          cpf: '529.982.247-25',
          nomeCompleto: 'Joao da Silva',
          dataNascimento: '1990-01-15',
        }),
      );

      expect(resposta.id).toBeTruthy();
      expect(resposta.status).toBe('INICIADO');
    });

    it('iniciarPessoa() rejeita com 409 quando CPF ja tem onboarding ativo', async () => {
      await expect(
        awaitObservable(
          service.iniciarPessoa({
            cpf: '999.999.999-99',
            nomeCompleto: 'Joao da Silva',
            dataNascimento: '1990-01-15',
          }),
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('enviarDocumentoPessoa() resolve em sucesso (204)', async () => {
      await expect(
        awaitObservable(
          service.enviarDocumentoPessoa(
            '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01',
            'RG',
            arquivoFake(),
          ),
        ),
      ).resolves.toBeNull();
    });

    it('enviarDocumentoPessoa() rejeita com 400 para documento nao aceito em PF', async () => {
      await expect(
        awaitObservable(
          service.enviarDocumentoPessoa(
            '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01',
            'CONTRATO_SOCIAL',
            arquivoFake(),
          ),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('verificarPessoa() resolve em sucesso (202)', async () => {
      await expect(
        awaitObservable(service.verificarPessoa('2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01')),
      ).resolves.toBeNull();
    });

    it('consultarPessoa() retorna status final com documentos e resultado', async () => {
      const status = await awaitObservable(
        service.consultarPessoa('2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01'),
      );

      expect(status.status).toBe('APROVADO_FINAL');
      expect(status.documentosEnviados.length).toBeGreaterThanOrEqual(1);
      expect(status.resultado?.statusFinal).toBe('APROVADO_FINAL');
    });

    it('consultarPessoa() rejeita com 403 quando solicitacao e de outro dono', async () => {
      await expect(
        awaitObservable(service.consultarPessoa('2f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03')),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('pessoa juridica', () => {
    it('iniciarEmpresa() retorna solicitacao com cnpj e razaoSocial', async () => {
      const resposta = await awaitObservable(
        service.iniciarEmpresa({
          cnpj: '27.865.757/0001-02',
          razaoSocial: 'Acme Comercio LTDA',
          nomeFantasia: 'Acme',
          tipoSocietario: 'LTDA',
          porte: 'ME',
        }),
      );

      expect(resposta.status).toBe('INICIADO');
      expect(resposta.razaoSocial).toBe('Acme Comercio LTDA');
    });

    it('iniciarEmpresa() rejeita com 409 quando CNPJ ja tem onboarding ativo', async () => {
      await expect(
        awaitObservable(
          service.iniciarEmpresa({
            cnpj: '99.999.999/9999-99',
            razaoSocial: 'Conflito LTDA',
          }),
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('enviarDocumentoEmpresa() aceita CONTRATO_SOCIAL (204)', async () => {
      await expect(
        awaitObservable(
          service.enviarDocumentoEmpresa(
            '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f02',
            'CONTRATO_SOCIAL',
            arquivoFake(),
          ),
        ),
      ).resolves.toBeNull();
    });

    it('verificarEmpresa() resolve em sucesso (202)', async () => {
      await expect(
        awaitObservable(service.verificarEmpresa('2f0799c0-98b9-6d9d-bc4a-7d6f5b771f02')),
      ).resolves.toBeNull();
    });

    it('enviarDocumentoEmpresa() rejeita com 400 para documento nao aceito em PJ', async () => {
      await expect(
        awaitObservable(
          service.enviarDocumentoEmpresa(
            '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f02',
            'RG',
            arquivoFake(),
          ),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('consultarEmpresa() retorna representantes com CPF mascarado e status PLD', async () => {
      const status = await awaitObservable(
        service.consultarEmpresa('2f0799c0-98b9-6d9d-bc4a-7d6f5b771f02'),
      );

      expect(status.representantes.length).toBeGreaterThanOrEqual(1);
      expect(status.representantes[0].cpfMascarado).toContain('*');
      expect(status.representantes[0].pld?.statusPld).toBe('LIMPO');
    });

    it('listarRepresentantesEmpresa() retorna lista mascarada', async () => {
      const representantes = await awaitObservable(
        service.listarRepresentantesEmpresa('2f0799c0-98b9-6d9d-bc4a-7d6f5b771f02'),
      );

      expect(Array.isArray(representantes)).toBe(true);
      expect(representantes[0].cpfMascarado).not.toContain('999');
    });
  });
});

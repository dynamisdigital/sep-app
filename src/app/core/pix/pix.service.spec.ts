import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetChavesPixState, resetPixState } from '../../../mocks/handlers';
import {
  CadastrarChavePixRequest,
  ChavePixResponse,
  SolicitarDesembolsoPixRequest,
} from '../api/api.models';
import { TRATA_403_LOCALMENTE } from '../interceptors/error.interceptor';
import { PixService } from './pix.service';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

// Sentinelas espelhando os handlers MSW de Pix (src/mocks/handlers.ts).
const CONTRATO_ELEGIVEL_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772a01';
const CONTRATO_INELEGIVEL_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772a02';
const CONTRATO_INEXISTENTE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772dead';

const TRANSFERENCIA_CONCLUIDA_ID = 'e0000000-0000-4000-8000-000000000001';
const TRANSFERENCIA_PROCESSANDO_ID = 'e0000000-0000-4000-8000-000000000002';
const TRANSFERENCIA_PROVIDER_OFF_ID = 'e0000000-0000-4000-8000-000000000003';
const TRANSFERENCIA_INEXISTENTE_ID = 'e0000000-0000-4000-8000-0000000000aa';

const PARCELA_RECEBIVEL_ID = 'a0000000-0000-4000-8000-000000000006';
const PARCELA_NOVA_ID = 'a0000000-0000-4000-8000-0000000000c3';
const PARCELA_INELEGIVEL_ID = 'a0000000-0000-4000-8000-0000000000c1';
const PARCELA_INEXISTENTE_ID = 'a0000000-0000-4000-8000-0000000000c2';

const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const REFERENCIA_INEXISTENTE_ID = 'e1000000-0000-4000-8000-0000000000aa';
const RECEBIMENTO_CONCILIADO_ID = 'e2000000-0000-4000-8000-000000000001';
const RECEBIMENTO_NAO_IDENTIFICADO_ID = 'e2000000-0000-4000-8000-000000000002';
const RECEBIMENTO_INEXISTENTE_ID = 'e2000000-0000-4000-8000-0000000000aa';

const CHAVE_PIX_DESTINO = 'joao.tomador@banco.com';
const DESEMBOLSO_VALIDO: SolicitarDesembolsoPixRequest = {
  contratoId: CONTRATO_ELEGIVEL_ID,
  valor: 10000.0,
  chavePixDestino: CHAVE_PIX_DESTINO,
};

// Chaves Pix (F-20.1): fixtures sempre mascaradas — o valor em claro so existe na request de
// cadastro e nunca volta em nenhuma resposta.
const CHAVE_ATIVA: ChavePixResponse = {
  id: 'e3000000-0000-4000-8000-000000000001',
  tipo: 'EMAIL',
  valorMascarado: 'fin***@dynamis.com.br',
  status: 'ATIVA',
  criadaEm: '2026-07-10T09:00:00-03:00',
  removidaEm: null,
};
const CHAVE_INATIVA: ChavePixResponse = {
  id: 'e3000000-0000-4000-8000-000000000002',
  tipo: 'CNPJ',
  valorMascarado: '**.***.***/0001-**',
  status: 'INATIVA',
  criadaEm: '2026-06-02T09:00:00-03:00',
  removidaEm: '2026-07-01T14:20:00-03:00',
};
const CADASTRO_VALIDO: CadastrarChavePixRequest = {
  tipo: 'EMAIL',
  valor: 'financeiro@dynamis.com.br',
};

// Sentinelas espelhando os handlers MSW de chaves Pix (src/mocks/handlers.ts).
const CHAVE_PIX_ATIVA_ID = 'e3000000-0000-4000-8000-000000000001';
const CHAVE_PIX_INATIVA_ID = 'e3000000-0000-4000-8000-000000000002';
const CHAVE_PIX_INEXISTENTE_ID = 'e3000000-0000-4000-8000-0000000000aa';
const VALOR_INVALIDO = '000.000.000-00';
const VALOR_CONTA_INDISPONIVEL = 'conta-indisponivel@dynamis.com.br';

// O stepUpInterceptor real so reconhece as rotas Pix sensiveis a partir da Task F-13.3 (testado
// la). Aqui um interceptor de teste simula a presenca do X-Step-Up-Token quando `anexarStepUp`
// esta ligado, exercitando o caminho feliz e provando que o proprio service nao anexa o token.
let anexarStepUp = false;
const stepUpDeTeste: HttpInterceptorFn = (req, next) =>
  anexarStepUp
    ? next(req.clone({ setHeaders: { 'X-Step-Up-Token': 'mock-step-up-token' } }))
    : next(req);

describe('PixService (comportamento via MSW)', () => {
  let service: PixService;

  beforeEach(() => {
    resetPixState();
    resetChavesPixState();
    anexarStepUp = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([stepUpDeTeste]))],
    });
    service = TestBed.inject(PixService);
  });

  describe('solicitarDesembolso', () => {
    // Sem o header X-Step-Up-Token (anexarStepUp = false) o backend (@RequireStepUpEstrito)
    // responde 403 — prova que o service nao supre o token sozinho.
    it('rejeita com 403 quando nao ha step-up', async () => {
      await expect(
        awaitObservable(service.solicitarDesembolso(DESEMBOLSO_VALIDO, 'key-sem-stepup')),
      ).rejects.toMatchObject({ status: 403 });
    });

    describe('com step-up', () => {
      beforeEach(() => {
        anexarStepUp = true;
      });

      it('cria o desembolso (novo=true) sem devolver a chave Pix em claro', async () => {
        const resposta = await awaitObservable(
          service.solicitarDesembolso(DESEMBOLSO_VALIDO, 'key-novo-1'),
        );

        expect(resposta.novo).toBe(true);
        expect(resposta.transferenciaId).toBeTruthy();
        expect(resposta.contratoId).toBe(CONTRATO_ELEGIVEL_ID);
        expect(resposta.status).toBe('CRIADA');
        expect(resposta.chaveDestinoMascara).not.toBe(CHAVE_PIX_DESTINO);
        expect(resposta.chaveDestinoMascara).not.toContain('@');
      });

      it('faz replay (novo=false) com a mesma key e o mesmo payload', async () => {
        await awaitObservable(service.solicitarDesembolso(DESEMBOLSO_VALIDO, 'key-replay-1'));
        const replay = await awaitObservable(
          service.solicitarDesembolso(DESEMBOLSO_VALIDO, 'key-replay-1'),
        );

        expect(replay.novo).toBe(false);
      });

      it('rejeita com 409 quando a mesma key vem com payload divergente', async () => {
        await awaitObservable(service.solicitarDesembolso(DESEMBOLSO_VALIDO, 'key-conflito-1'));
        await expect(
          awaitObservable(
            service.solicitarDesembolso({ ...DESEMBOLSO_VALIDO, valor: 9999.0 }, 'key-conflito-1'),
          ),
        ).rejects.toMatchObject({ status: 409 });
      });

      it('rejeita com 400 quando a Idempotency-Key foge do pattern do backend', async () => {
        await expect(
          awaitObservable(service.solicitarDesembolso(DESEMBOLSO_VALIDO, 'key invalida')),
        ).rejects.toMatchObject({ status: 400 });
      });

      it('rejeita com 404 quando o contrato nao existe', async () => {
        await expect(
          awaitObservable(
            service.solicitarDesembolso(
              { ...DESEMBOLSO_VALIDO, contratoId: CONTRATO_INEXISTENTE_ID },
              'key-404',
            ),
          ),
        ).rejects.toMatchObject({ status: 404 });
      });

      it('rejeita com 422 quando o contrato e inelegivel', async () => {
        await expect(
          awaitObservable(
            service.solicitarDesembolso(
              { ...DESEMBOLSO_VALIDO, contratoId: CONTRATO_INELEGIVEL_ID },
              'key-422',
            ),
          ),
        ).rejects.toMatchObject({ status: 422 });
      });
    });
  });

  describe('consultarDesembolso', () => {
    // Leitura local: nao exige step-up (anexarStepUp = false) e nunca chama o provider.
    it('retorna o status local com providerIndisponivel=false', async () => {
      const resposta = await awaitObservable(
        service.consultarDesembolso(TRANSFERENCIA_CONCLUIDA_ID),
      );

      expect(resposta.status).toBe('CONCLUIDA');
      expect(resposta.providerIndisponivel).toBe(false);
    });

    it('rejeita com 404 quando a transferencia nao existe', async () => {
      await expect(
        awaitObservable(service.consultarDesembolso(TRANSFERENCIA_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('consultarStatusDesembolso', () => {
    it('rejeita com 403 quando nao ha step-up', async () => {
      await expect(
        awaitObservable(service.consultarStatusDesembolso(TRANSFERENCIA_PROCESSANDO_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    describe('com step-up', () => {
      beforeEach(() => {
        anexarStepUp = true;
      });

      it('reconcilia o status avancando PROCESSANDO para CONCLUIDA', async () => {
        const resposta = await awaitObservable(
          service.consultarStatusDesembolso(TRANSFERENCIA_PROCESSANDO_ID),
        );

        expect(resposta.status).toBe('CONCLUIDA');
        expect(resposta.providerIndisponivel).toBe(false);
      });

      it('nao mascara provider indisponivel como sucesso', async () => {
        const resposta = await awaitObservable(
          service.consultarStatusDesembolso(TRANSFERENCIA_PROVIDER_OFF_ID),
        );

        expect(resposta.providerIndisponivel).toBe(true);
        expect(resposta.status).toBe('SOLICITADA');
      });

      it('rejeita com 404 quando a transferencia nao existe', async () => {
        await expect(
          awaitObservable(service.consultarStatusDesembolso(TRANSFERENCIA_INEXISTENTE_ID)),
        ).rejects.toMatchObject({ status: 404 });
      });
    });
  });

  describe('gerarReferenciaRecebimento', () => {
    // Geracao de referencia nao exige step-up (anexarStepUp = false).
    it('gera referencia nova (novo=true, status ATIVA) com txid e copia-cola', async () => {
      const resposta = await awaitObservable(
        service.gerarReferenciaRecebimento({ parcelaId: PARCELA_NOVA_ID }),
      );

      expect(resposta.novo).toBe(true);
      expect(resposta.status).toBe('ATIVA');
      expect(resposta.txid).toBeTruthy();
      expect(resposta.codigoCopiaCola).toBeTruthy();
      expect(resposta.parcelaId).toBe(PARCELA_NOVA_ID);
    });

    it('reaproveita a referencia ATIVA existente da parcela (novo=false)', async () => {
      const resposta = await awaitObservable(
        service.gerarReferenciaRecebimento({ parcelaId: PARCELA_RECEBIVEL_ID }),
      );

      expect(resposta.novo).toBe(false);
      expect(resposta.referenciaId).toBe(REFERENCIA_ATIVA_ID);
    });

    it('rejeita com 422 quando a parcela e inelegivel', async () => {
      await expect(
        awaitObservable(service.gerarReferenciaRecebimento({ parcelaId: PARCELA_INELEGIVEL_ID })),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('rejeita com 404 quando a parcela nao existe', async () => {
      await expect(
        awaitObservable(service.gerarReferenciaRecebimento({ parcelaId: PARCELA_INEXISTENTE_ID })),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('consultarReferenciaRecebimento', () => {
    it('retorna a referencia ATIVA da parcela', async () => {
      const resposta = await awaitObservable(
        service.consultarReferenciaRecebimento(REFERENCIA_ATIVA_ID),
      );

      expect(resposta.status).toBe('ATIVA');
      expect(resposta.parcelaId).toBe(PARCELA_RECEBIVEL_ID);
    });

    it('rejeita com 404 quando a referencia nao existe', async () => {
      await expect(
        awaitObservable(service.consultarReferenciaRecebimento(REFERENCIA_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('consultarRecebimento', () => {
    it('retorna recebimento CONCILIADO vinculado a parcela', async () => {
      const resposta = await awaitObservable(
        service.consultarRecebimento(RECEBIMENTO_CONCILIADO_ID),
      );

      expect(resposta.status).toBe('CONCILIADO');
      expect(resposta.parcelaId).toBe(PARCELA_RECEBIVEL_ID);
      expect(resposta.recebimentoCobrancaId).toBeTruthy();
      expect(resposta.motivoDivergencia).toBeNull();
    });

    it('expoe recebimento NAO_IDENTIFICADO com motivo e sem vinculo', async () => {
      const resposta = await awaitObservable(
        service.consultarRecebimento(RECEBIMENTO_NAO_IDENTIFICADO_ID),
      );

      expect(resposta.status).toBe('NAO_IDENTIFICADO');
      expect(resposta.referenciaId).toBeNull();
      expect(resposta.parcelaId).toBeNull();
      expect(resposta.motivoDivergencia).toBeTruthy();
    });

    it('rejeita com 404 quando o recebimento nao existe (recebimento)', async () => {
      await expect(
        awaitObservable(service.consultarRecebimento(RECEBIMENTO_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // Chaves Pix da conta operacional (F-20.6): comportamento contra o MSW stateful, nao contra
  // stubs por caso. Exercita idempotencia real (replay x conflito), transicao ATIVA -> INATIVA e
  // as respostas de erro do contrato.
  describe('chaves Pix', () => {
    it('listarChavesPix devolve ATIVA e INATIVA, mascaradas e mais recentes primeiro', async () => {
      const chaves = await awaitObservable(service.listarChavesPix());

      expect(chaves.length).toBe(2);
      expect(chaves[0].status).toBe('ATIVA');
      expect(chaves[1].status).toBe('INATIVA');
      expect(chaves[1].removidaEm).toBeTruthy();
      // O valor em claro do seed nunca aparece na leitura.
      expect(JSON.stringify(chaves)).not.toContain('financeiro@dynamis.com.br');
      expect(chaves[0].valorMascarado).toContain('***');
    });

    it('listarChavesPix nao exige step-up', async () => {
      await expect(awaitObservable(service.listarChavesPix())).resolves.toBeTruthy();
    });

    describe('cadastrarChavePix', () => {
      it('rejeita com 403 quando nao ha step-up', async () => {
        await expect(
          awaitObservable(
            service.cadastrarChavePix({ tipo: 'EVP', valor: 'chave-evp' }, 'key-sem-stepup'),
          ),
        ).rejects.toMatchObject({ status: 403 });
      });

      describe('com step-up', () => {
        beforeEach(() => {
          anexarStepUp = true;
        });

        it('cadastra a chave e passa a lista-la, sem devolver o valor em claro', async () => {
          const criada = await awaitObservable(
            service.cadastrarChavePix({ tipo: 'EVP', valor: 'chave-evp-nova' }, 'key-nova-1'),
          );

          expect(criada.status).toBe('ATIVA');
          expect(criada.removidaEm).toBeNull();
          expect(criada.valorMascarado).not.toBe('chave-evp-nova');

          const chaves = await awaitObservable(service.listarChavesPix());
          expect(chaves.length).toBe(3);
          // Mais recente primeiro.
          expect(chaves[0].id).toBe(criada.id);
        });

        it('replay da MESMA key com o mesmo payload devolve a chave existente, sem duplicar', async () => {
          const primeira = await awaitObservable(
            service.cadastrarChavePix({ tipo: 'EVP', valor: 'chave-replay' }, 'key-replay'),
          );
          const replay = await awaitObservable(
            service.cadastrarChavePix({ tipo: 'EVP', valor: 'chave-replay' }, 'key-replay'),
          );

          expect(replay.id).toBe(primeira.id);
          const chaves = await awaitObservable(service.listarChavesPix());
          expect(chaves.length).toBe(3);
        });

        it('rejeita com 409 a MESMA key reapresentada com payload divergente', async () => {
          await awaitObservable(
            service.cadastrarChavePix({ tipo: 'EVP', valor: 'chave-original' }, 'key-conflito'),
          );

          await expect(
            awaitObservable(
              service.cadastrarChavePix({ tipo: 'EVP', valor: 'chave-outra' }, 'key-conflito'),
            ),
          ).rejects.toMatchObject({ status: 409 });
        });

        it('rejeita com 409 quando ja existe chave equivalente ativa', async () => {
          await expect(
            awaitObservable(
              service.cadastrarChavePix(
                { tipo: 'EMAIL', valor: 'financeiro@dynamis.com.br' },
                'key-equivalente',
              ),
            ),
          ).rejects.toMatchObject({ status: 409 });
        });

        it('rejeita com 400 valor invalido e com 422 conta operacional indisponivel', async () => {
          await expect(
            awaitObservable(
              service.cadastrarChavePix({ tipo: 'CPF', valor: VALOR_INVALIDO }, 'key-400'),
            ),
          ).rejects.toMatchObject({ status: 400 });

          await expect(
            awaitObservable(
              service.cadastrarChavePix(
                { tipo: 'EMAIL', valor: VALOR_CONTA_INDISPONIVEL },
                'key-422',
              ),
            ),
          ).rejects.toMatchObject({ status: 422 });
        });

        it('rejeita com 400 quando a Idempotency-Key vem vazia', async () => {
          await expect(
            awaitObservable(service.cadastrarChavePix({ tipo: 'EVP', valor: 'chave-x' }, '')),
          ).rejects.toMatchObject({ status: 400 });
        });
      });
    });

    describe('removerChavePix', () => {
      it('rejeita com 403 quando nao ha step-up', async () => {
        await expect(
          awaitObservable(service.removerChavePix(CHAVE_PIX_ATIVA_ID)),
        ).rejects.toMatchObject({ status: 403 });
      });

      describe('com step-up', () => {
        beforeEach(() => {
          anexarStepUp = true;
        });

        it('inativa a chave ATIVA e preserva o historico', async () => {
          await awaitObservable(service.removerChavePix(CHAVE_PIX_ATIVA_ID));

          const chaves = await awaitObservable(service.listarChavesPix());
          const removida = chaves.find((chave) => chave.id === CHAVE_PIX_ATIVA_ID);
          expect(chaves.length).toBe(2);
          expect(removida?.status).toBe('INATIVA');
          expect(removida?.removidaEm).toBeTruthy();
        });

        it('e idempotente: remover chave ja INATIVA tambem responde 204', async () => {
          await expect(
            awaitObservable(service.removerChavePix(CHAVE_PIX_INATIVA_ID)),
          ).resolves.toBeNull();
        });

        it('rejeita com 404 neutro quando a chave nao existe', async () => {
          await expect(
            awaitObservable(service.removerChavePix(CHAVE_PIX_INEXISTENTE_ID)),
          ).rejects.toMatchObject({ status: 404 });
        });
      });
    });
  });
});

// Contrato HTTP exato: URL, metodo, body e headers. Prova que so o desembolso envia
// Idempotency-Key, que as leituras nao a enviam e que o service nunca anexa X-Step-Up-Token
// (essa responsabilidade e do stepUpInterceptor).
describe('PixService (contrato HTTP)', () => {
  let service: PixService;
  let httpMock: HttpTestingController;
  const base = 'http://localhost:8080/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PixService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('solicitarDesembolso: POST com body, Idempotency-Key e sem X-Step-Up-Token', () => {
    service.solicitarDesembolso(DESEMBOLSO_VALIDO, 'key-contrato-1').subscribe();

    const req = httpMock.expectOne(`${base}/pix/desembolsos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(DESEMBOLSO_VALIDO);
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-contrato-1');
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    req.flush({});
  });

  it('consultarDesembolso: GET sem Idempotency-Key nem body', () => {
    service.consultarDesembolso(TRANSFERENCIA_CONCLUIDA_ID).subscribe();

    const req = httpMock.expectOne(`${base}/pix/desembolsos/${TRANSFERENCIA_CONCLUIDA_ID}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    req.flush({});
  });

  it('consultarStatusDesembolso: POST /status sem Idempotency-Key nem X-Step-Up-Token', () => {
    service.consultarStatusDesembolso(TRANSFERENCIA_PROCESSANDO_ID).subscribe();

    const req = httpMock.expectOne(
      `${base}/pix/desembolsos/${TRANSFERENCIA_PROCESSANDO_ID}/status`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    req.flush({});
  });

  it('gerarReferenciaRecebimento: POST com body parcelaId e sem Idempotency-Key', () => {
    service.gerarReferenciaRecebimento({ parcelaId: PARCELA_NOVA_ID }).subscribe();

    const req = httpMock.expectOne(`${base}/pix/recebimentos/referencias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ parcelaId: PARCELA_NOVA_ID });
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    req.flush({});
  });

  it('consultarReferenciaRecebimento: GET na referencia', () => {
    service.consultarReferenciaRecebimento(REFERENCIA_ATIVA_ID).subscribe();

    const req = httpMock.expectOne(`${base}/pix/recebimentos/referencias/${REFERENCIA_ATIVA_ID}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('consultarRecebimento: GET no recebimento', () => {
    service.consultarRecebimento(RECEBIMENTO_CONCILIADO_ID).subscribe();

    const req = httpMock.expectOne(`${base}/pix/recebimentos/${RECEBIMENTO_CONCILIADO_ID}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('listarChavesPix: GET sem Idempotency-Key, sem step-up e sem TRATA_403_LOCALMENTE', () => {
    service.listarChavesPix().subscribe();

    const req = httpMock.expectOne(`${base}/pix/chaves`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    // A leitura sem role continua no fluxo global de acesso negado (errorInterceptor).
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBe(false);
    req.flush([]);
  });

  it('listarChavesPix: entrega a lista mascarada como veio do backend', async () => {
    const chaves = awaitObservable(service.listarChavesPix());

    httpMock.expectOne(`${base}/pix/chaves`).flush([CHAVE_ATIVA, CHAVE_INATIVA]);

    await expect(chaves).resolves.toEqual([CHAVE_ATIVA, CHAVE_INATIVA]);
  });

  it('cadastrarChavePix: POST com body, Idempotency-Key, TRATA_403_LOCALMENTE e sem step-up', () => {
    service.cadastrarChavePix(CADASTRO_VALIDO, 'key-chave-1').subscribe();

    const req = httpMock.expectOne(`${base}/pix/chaves`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(CADASTRO_VALIDO);
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-chave-1');
    // O token e do stepUpInterceptor; o service nunca o anexa.
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBe(true);
    req.flush(CHAVE_ATIVA, { status: 201, statusText: 'Created' });
  });

  it('cadastrarChavePix: 200 (replay idempotente) chega pelo canal de sucesso', async () => {
    const chave = awaitObservable(service.cadastrarChavePix(CADASTRO_VALIDO, 'key-chave-replay'));

    httpMock.expectOne(`${base}/pix/chaves`).flush(CHAVE_ATIVA, { status: 200, statusText: 'OK' });

    await expect(chave).resolves.toEqual(CHAVE_ATIVA);
  });

  it('removerChavePix: DELETE sem body, sem Idempotency-Key e com TRATA_403_LOCALMENTE', () => {
    service.removerChavePix(CHAVE_ATIVA.id).subscribe();

    const req = httpMock.expectOne(`${base}/pix/chaves/${CHAVE_ATIVA.id}`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});

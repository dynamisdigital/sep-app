import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AvisoCookiesService } from './aviso-cookies.service';

const AVISO_KEY = 'SEP_AVISO_COOKIES';
const VERSAO_CORRENTE = '1';

/**
 * O valor guardado e a VERSAO do texto, nao um booleano — por isso os testes usam uma versao antiga
 * concreta (`'0'`) em vez de "qualquer valor". Trocar a comparacao por presenca de chave passaria
 * despercebido com booleano; com versao, quebra.
 *
 * Os dois modos de falha de storage sao testados SEPARADOS de proposito: `getItem` lancando e
 * `setItem` lancando tem consequencias diferentes (nascer visivel vs. nao reexibir na sessao), e um
 * teste unico deixaria passar a implementacao que trata so um dos dois.
 *
 * **A falha e injetada por `DOCUMENT` falso, nao por spy no `Storage`.** Medido nesta sprint: no
 * happy-dom o `localStorage` e um Proxy — `Object.getPrototypeOf(ls) === Storage.prototype` da
 * `true` e `getItem` nao e own property, mas `vi.spyOn(Storage.prototype, 'getItem')` **nao**
 * intercepta a chamada. As duas primeiras versoes destes testes usavam esse spy: passavam sem que o
 * `catch` do servico jamais rodasse, e sobreviveram as mutacoes que trocavam o fail-open por
 * fail-closed e removiam o `try` do `setItem`. Passavam provando nada. Injetar o documento nao
 * depende de interno de runtime de teste nenhum.
 */
function instanciar(): AvisoCookiesService {
  return TestBed.inject(AvisoCookiesService);
}

/** Instancia o servico contra um `localStorage` de mentira, com os modos de falha escolhidos. */
function instanciarComStorage(fake: Partial<Storage>): AvisoCookiesService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: DOCUMENT, useValue: { defaultView: { localStorage: fake } } }],
  });
  return TestBed.inject(AvisoCookiesService);
}

function lanca(): never {
  throw new DOMException('storage indisponivel');
}

describe('AvisoCookiesService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('nasce visivel quando o usuario nunca viu o aviso', () => {
    expect(instanciar().avisoVisivel()).toBe(true);
  });

  it('nasce invisivel quando a versao vista e a corrente', () => {
    window.localStorage.setItem(AVISO_KEY, VERSAO_CORRENTE);

    expect(instanciar().avisoVisivel()).toBe(false);
  });

  it('reexibe quando o usuario so viu uma versao anterior do texto', () => {
    window.localStorage.setItem(AVISO_KEY, '0');

    expect(instanciar().avisoVisivel()).toBe(true);
  });

  it('marcarComoVisto esconde o aviso e persiste a versao corrente', () => {
    const service = instanciar();

    service.marcarComoVisto();

    expect(service.avisoVisivel()).toBe(false);
    expect(window.localStorage.getItem(AVISO_KEY)).toBe(VERSAO_CORRENTE);
  });

  it('nasce visivel quando a leitura do storage lanca, sem propagar a excecao', () => {
    let service!: AvisoCookiesService;

    expect(() => {
      service = instanciarComStorage({ getItem: lanca, setItem: () => undefined });
    }).not.toThrow();
    expect(service.avisoVisivel()).toBe(true);
  });

  it('esconde o aviso na sessao mesmo quando a escrita lanca, sem propagar a excecao', () => {
    const service = instanciarComStorage({ getItem: () => null, setItem: lanca });

    expect(() => service.marcarComoVisto()).not.toThrow();
    // Falhar em persistir reexibe na PROXIMA visita — o lado seguro —, mas nao reexibe nesta.
    expect(service.avisoVisivel()).toBe(false);
  });

  it('nasce visivel quando nao ha window (SSR/ambiente sem defaultView)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });

    expect(instanciar().avisoVisivel()).toBe(true);
  });

  it('nao explode ao persistir sem window', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    const service = instanciar();

    expect(() => service.marcarComoVisto()).not.toThrow();
    expect(service.avisoVisivel()).toBe(false);
  });
});

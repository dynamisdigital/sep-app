import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { CorrespondentesRedeService } from '../app/core/correspondentes/correspondentes-rede.service';
import { centavos } from '../app/core/financeiro/calculo-financeiro';
import { ID_CORRESPONDENTE_CARLA, ID_SUB_BRUNO } from './data/correspondentes.store';
import {
  atualizarPercentuaisDoSub,
  carteiraDaRede,
  comissaoDaRede,
  criarSubNaRede,
  minhaPosicao,
  redeDoMajoritario,
  suspenderOuReativarSub,
  tetos,
} from './data/correspondentes-rede.store';

// A rede de sub-correspondentes: o repasse nunca passa do teto do SEP e as contas da rede fecham.

describe('rede de sub-correspondentes (mock)', () => {
  it('o teto de cada produto cabe dentro da comissao cheia do SEP', () => {
    for (const t of tetos()) {
      expect(t.tetoSub, t.produto).toBeGreaterThanOrEqual(0);
      expect(t.tetoSub, t.produto).toBeLessThanOrEqual(t.percentualSep);
    }
  });

  it('cada sub repassa abaixo do teto e a margem do majoritario e o que sobra', () => {
    const rede = redeDoMajoritario(ID_CORRESPONDENTE_CARLA);
    expect(rede.subs.length).toBeGreaterThan(0);
    for (const sub of rede.subs) {
      for (const p of sub.percentuais) {
        expect(p.percentualSub, `${sub.nome} ${p.produto}`).toBeLessThanOrEqual(p.tetoSub);
        expect(p.margemMajoritario).toBeCloseTo(p.percentualSep - p.percentualSub, 3);
      }
    }
  });

  it('o consolidado fecha: clientes, carteira e comissao bruta = repasse + liquida', () => {
    const r = redeDoMajoritario(ID_CORRESPONDENTE_CARLA);
    expect(r.consolidado.clientes).toBe(
      r.consolidado.clientesProprios + r.subs.reduce((s, x) => s + x.clientesNaBase, 0),
    );
    const c = comissaoDaRede(ID_CORRESPONDENTE_CARLA);
    expect(centavos(c.totalRepasse + c.totalLiquida)).toBe(c.totalBruta);
    for (const l of c.porOrigem) expect(centavos(l.repasse + l.liquida)).toBe(l.bruta);
    expect(carteiraDaRede(ID_CORRESPONDENTE_CARLA).some((o) => o.origem === 'SUB')).toBe(true);
  });

  it('recusa repasse acima do teto do SEP com 422, sem criar o sub', () => {
    const t = tetos()[0];
    const antes = redeDoMajoritario(ID_CORRESPONDENTE_CARLA).subs.length;
    const res = criarSubNaRede(ID_CORRESPONDENTE_CARLA, {
      nome: 'Teste Acima',
      cpf: '529.982.247-25',
      email: 'acima@teste.com',
      telefone: '(11) 90000-0000',
      percentuais: tetos().map((x) => ({
        produto: x.produto,
        percentualSub: x.produto === t.produto ? t.tetoSub + 0.5 : 0,
      })),
    });
    expect(res).toMatchObject({ status: 422 });
    expect(redeDoMajoritario(ID_CORRESPONDENTE_CARLA).subs).toHaveLength(antes);
  });

  it('exige justificativa e nao deixa um majoritario mexer no sub de outro', () => {
    const percentuais = tetos().map((x) => ({ produto: x.produto, percentualSub: 0 }));
    expect(
      atualizarPercentuaisDoSub(ID_CORRESPONDENTE_CARLA, ID_SUB_BRUNO, {
        percentuais,
        justificativa: ' ',
      }),
    ).toMatchObject({ status: 400 });
    expect(
      atualizarPercentuaisDoSub('c1000000-0000-4000-8000-000000000002', ID_SUB_BRUNO, {
        percentuais,
        justificativa: 'x',
      }),
    ).toMatchObject({ status: 404 });
    expect(
      suspenderOuReativarSub('c1000000-0000-4000-8000-000000000002', ID_SUB_BRUNO, true),
    ).toMatchObject({ status: 404 });
  });

  it('o sub enxerga so a propria posicao: o majoritario e os percentuais dele', () => {
    const p = minhaPosicao(ID_SUB_BRUNO);
    expect(p.nivel).toBe('SUB');
    expect(p.majoritarioNome).toBeTruthy();
    expect(p.percentuais.length).toBe(tetos().length);
    expect(minhaPosicao(ID_CORRESPONDENTE_CARLA)).toMatchObject({
      nivel: 'MAJORITARIO',
      percentuais: [],
    });
  });

  it('as rotas da rede recusam quem nao e correspondente', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    const service = TestBed.inject(CorrespondentesRedeService);
    await expect(firstValueFrom(service.consultarRede())).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(service.consultarMinhaPosicao())).rejects.toMatchObject({
      status: 403,
    });
  });
});

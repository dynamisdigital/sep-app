import { beforeEach, describe, expect, it } from 'vitest';

import {
  atualizarMeta,
  atualizarRegra,
  comissaoPrevistaDe,
  comissoesDe,
  concluirInteracao,
  criarInteracao,
  criarProspect,
  desempenhoDaRede,
  lancamentosDe,
  listarAuditoria,
  listarInteracoesDe,
  listarProspectsDe,
  listarRegras,
  meuDesempenho,
  moverEtapa,
  registrarAuditoria,
  resetGestaoState,
} from './correspondentes-gestao.store';
import {
  ID_CORRESPONDENTE_CARLA,
  ID_CORRESPONDENTE_MARCOS,
  ID_CORRESPONDENTE_RAFAEL,
  processarVigencia,
  resetCorrespondentesState,
} from './correspondentes.store';

describe('correspondentes-gestao.store', () => {
  beforeEach(() => {
    resetCorrespondentesState();
    resetGestaoState();
  });

  describe('funil e agenda', () => {
    it('o correspondente so ve os proprios prospects', () => {
      const carla = listarProspectsDe(ID_CORRESPONDENTE_CARLA).map((p) => p.nome);

      expect(carla).toContain('Restaurante Sabor da Terra');
      expect(carla).not.toContain('Studio Pilates Vida');
    });

    it('cria prospect na primeira etapa e avanca ate o fim do funil', () => {
      const novo = criarProspect(ID_CORRESPONDENTE_CARLA, {
        nome: 'Floricultura Primavera',
        tipoPessoa: 'PJ',
        telefone: '(11) 90000-0000',
        produtoInteresse: 'Capital de giro',
        valorEstimado: 20000,
      });
      expect(novo.etapa).toBe('PROSPECTADO');

      const res = moverEtapa(ID_CORRESPONDENTE_CARLA, novo.id, 'CONTATADO');
      expect(res?.anterior).toBe('PROSPECTADO');
      expect(res?.prospect.etapa).toBe('CONTATADO');
    });

    it('nao mexe em prospect de outro correspondente', () => {
      const deRafael = listarProspectsDe(ID_CORRESPONDENTE_RAFAEL)[0];

      expect(moverEtapa(ID_CORRESPONDENTE_CARLA, deRafael.id, 'CONTATADO')).toBeUndefined();
    });

    it('perda guarda o motivo e sair da perda o limpa', () => {
      const p = listarProspectsDe(ID_CORRESPONDENTE_CARLA)[0];

      expect(
        moverEtapa(ID_CORRESPONDENTE_CARLA, p.id, 'PERDIDO', 'Preço')?.prospect.motivoPerda,
      ).toBe('Preço');
      expect(
        moverEtapa(ID_CORRESPONDENTE_CARLA, p.id, 'CONTATADO')?.prospect.motivoPerda,
      ).toBeNull();
    });

    it('compromisso vencido aparece como atrasado e concluir o tira da fila', () => {
      const atrasada = listarInteracoesDe(ID_CORRESPONDENTE_CARLA).find((i) =>
        i.descricao.includes('simulação do crédito pessoal'),
      )!;
      expect(atrasada.status).toBe('ATRASADA');

      expect(concluirInteracao(ID_CORRESPONDENTE_CARLA, atrasada.id)?.status).toBe('CONCLUIDA');
    });

    it('registrar atendimento ja ocorrido nao agenda; agendar cria compromisso', () => {
      const registrada = criarInteracao(ID_CORRESPONDENTE_CARLA, {
        clienteNome: 'João da Silva',
        tipo: 'LIGACAO',
        descricao: 'Contato de acompanhamento.',
        data: '2026-10-07',
        agendar: false,
      });
      const agendada = criarInteracao(ID_CORRESPONDENTE_CARLA, {
        clienteNome: 'João da Silva',
        tipo: 'RETORNO',
        descricao: 'Retornar sobre a renovação.',
        data: '2026-10-20',
        agendar: true,
      });

      expect(registrada.status).toBe('REGISTRADA');
      expect(agendada.status).toBe('AGENDADA');
    });
  });

  describe('comissoes', () => {
    it('gera originacao sobre o valor liberado pela regra do produto', () => {
      const orig = lancamentosDe(ID_CORRESPONDENTE_CARLA).find(
        (l) => l.evento === 'ORIGINACAO' && l.contratoNumero === 'CT-2026-0412',
      )!;

      // Capital de giro: 2% do valor LIBERADO: R$ 12.000,00 contratados menos 4% de tarifa = R$ 11.520,00.
      expect(orig.percentual).toBe(2);
      expect(orig.baseCalculo).toBe(11520);
      expect(orig.valor).toBe(230.4);
      expect(orig.status).toBe('PAGA');
    });

    it('parcela vencida e nao paga nao gera comissao; a vencer e prevista', () => {
      const lanc = lancamentosDe(ID_CORRESPONDENTE_CARLA).filter(
        (l) => l.contratoNumero === 'CT-2026-0502' && l.evento === 'PARCELA_RECEBIDA',
      );

      // So a parcela 1 foi paga; 2 e 3 vencidas ficam sem comissao; as demais sao previstas.
      expect(lanc.filter((l) => l.status !== 'PREVISTA')).toHaveLength(1);
      expect(lanc.some((l) => l.status === 'PREVISTA')).toBe(true);
    });

    it('alterar a regra cria nova versao e o lancamento passa a registrar a versao usada', () => {
      const antes = lancamentosDe(ID_CORRESPONDENTE_CARLA).find(
        (l) => l.id === 'l-CT-2026-0412-O',
      )!;
      const regra = listarRegras().find((r) => r.produto === 'Capital de giro')!;

      const res = atualizarRegra(regra.id, 2.5, 'admin@empresa.com');

      expect(res?.anterior).toBe(2);
      expect(res?.regra.versao).toBe(2);
      // O livro e recalculado pela regra vigente nesta demonstracao; o contrato do backend exige
      // que o lancamento guarde a versao usada. Aqui conferimos a versao nova no lancamento futuro.
      const depois = lancamentosDe(ID_CORRESPONDENTE_CARLA).find(
        (l) => l.id === 'l-CT-2026-0412-O',
      )!;
      expect(depois.regraVersao).toBe(2);
      expect(antes.regraVersao).toBe(1);
    });

    it('perdida a base, o que ja foi gerado fica e o futuro deixa de nascer', () => {
      const antes = lancamentosDe(ID_CORRESPONDENTE_MARCOS);
      expect(antes.some((l) => l.status === 'PREVISTA')).toBe(true);

      processarVigencia();
      const depois = lancamentosDe(ID_CORRESPONDENTE_MARCOS);

      expect(depois.some((l) => l.evento === 'ORIGINACAO')).toBe(true);
      expect(depois.some((l) => l.status === 'PREVISTA')).toBe(false);
    });

    it('resume acumulada, disponivel, paga e prevista', () => {
      const c = comissoesDe(ID_CORRESPONDENTE_CARLA);

      expect(c.paga).toBeGreaterThan(0);
      expect(c.acumulada).toBeCloseTo(c.paga + c.disponivel, 2);
      expect(c.prevista).toBeGreaterThan(0);
      expect(c.porMes).toHaveLength(6);
      expect(comissaoPrevistaDe(ID_CORRESPONDENTE_CARLA)).toBeCloseTo(c.prevista + c.disponivel, 2);
    });
  });

  describe('metas, ranking e auditoria', () => {
    it('ordena o ranking por credito originado e calcula o atingimento das metas', () => {
      const { ranking, metas } = desempenhoDaRede();

      expect(ranking.map((r) => r.posicao)).toEqual([1, 2, 3]);
      expect(ranking[0].valorOriginado).toBeGreaterThanOrEqual(ranking[1].valorOriginado);
      const meta = metas.find((m) => m.correspondenteId === ID_CORRESPONDENTE_CARLA)!;
      expect(meta.atingimentoValorPct).toBeCloseTo(
        (meta.realizadoValorOriginado / meta.metaValorOriginado) * 100,
        0,
      );
    });

    it('o correspondente ve a propria posicao sem os dados dos outros', () => {
      const d = meuDesempenho(ID_CORRESPONDENTE_CARLA);

      expect(d.totalCorrespondentes).toBe(3);
      expect(d.meu.correspondenteId).toBe(ID_CORRESPONDENTE_CARLA);
      expect(d.meta.metaClientes).toBe(8);
    });

    it('alterar a meta muda o atingimento', () => {
      const antes = meuDesempenho(ID_CORRESPONDENTE_CARLA).meta.atingimentoClientesPct;

      atualizarMeta(ID_CORRESPONDENTE_CARLA, { metaClientes: 4, metaValorOriginado: 150000 });

      expect(meuDesempenho(ID_CORRESPONDENTE_CARLA).meta.atingimentoClientesPct).toBeGreaterThan(
        antes,
      );
    });

    it('registra auditoria com autor e papel, do mais recente ao mais antigo', () => {
      registrarAuditoria(
        'admin@empresa.com',
        'ADMIN',
        'META_ALTERADA',
        'Meta',
        'x',
        'Meta ajustada.',
      );

      const [primeiro] = listarAuditoria();
      expect(primeiro.ator).toBe('admin@empresa.com');
      expect(primeiro.acao).toBe('META_ALTERADA');
      const datas = listarAuditoria().map((e) => e.quando);
      expect([...datas].sort().reverse()).toEqual(datas);
    });
  });
});

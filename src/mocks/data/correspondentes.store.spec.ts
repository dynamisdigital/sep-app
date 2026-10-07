import { beforeEach, describe, expect, it } from 'vitest';

import {
  consultarCorrespondente,
  consultarRede,
  ID_CORRESPONDENTE_CARLA,
  ID_CORRESPONDENTE_MARCOS,
  ID_CORRESPONDENTE_RAFAEL,
  listarBaseDe,
  listarEnviosDe,
  listarOperacoesDe,
  processarVigencia,
  reatribuirVinculo,
  registrarEnvio,
  renovarCadastro,
  resetCorrespondentesState,
  resumoDe,
  validarEnvio,
} from './correspondentes.store';

describe('correspondentes.store', () => {
  beforeEach(() => resetCorrespondentesState());

  it('deriva o status do cadastro da validade: ativo, a vencer e vencido', () => {
    expect(consultarCorrespondente(ID_CORRESPONDENTE_CARLA)?.status).toBe('ATIVO');
    expect(consultarCorrespondente(ID_CORRESPONDENTE_RAFAEL)?.status).toBe('A_VENCER');
    expect(consultarCorrespondente(ID_CORRESPONDENTE_MARCOS)?.status).toBe('VENCIDO');
  });

  it('a apuracao de vigencia encerra so os vinculos de cadastro vencido', () => {
    const resultado = processarVigencia();

    expect(resultado.vinculosEncerrados).toBe(2);
    expect(resultado.correspondentesAfetados).toEqual(['Marcos Lima']);
    const base = listarBaseDe(ID_CORRESPONDENTE_MARCOS);
    expect(base.every((v) => v.status === 'PERDIDO')).toBe(true);
    expect(base[0].motivoFim).toBe('CADASTRO_VENCIDO');
    expect(listarBaseDe(ID_CORRESPONDENTE_CARLA).every((v) => v.status === 'VIGENTE')).toBe(true);
  });

  it('renovar o cadastro antes da apuracao preserva a base', () => {
    renovarCadastro(ID_CORRESPONDENTE_MARCOS, '2027-10-07');

    expect(consultarCorrespondente(ID_CORRESPONDENTE_MARCOS)?.status).toBe('ATIVO');
    expect(processarVigencia().vinculosEncerrados).toBe(0);
  });

  it('reatribuir para o SEP encerra o vinculo e cria um direto, sem apagar o historico', () => {
    const [primeiro] = listarBaseDe(ID_CORRESPONDENTE_CARLA);

    const novo = reatribuirVinculo(primeiro.id, null);

    expect(novo?.status).toBe('DIRETO_SEP');
    expect(novo?.correspondenteId).toBeNull();
    expect(listarBaseDe(ID_CORRESPONDENTE_CARLA).find((v) => v.id === primeiro.id)?.status).toBe(
      'TRANSFERIDO',
    );
    expect(consultarRede().totalClientesDiretoSep).toBe(1);
  });

  it('reatribuir para outro correspondente move o cliente de base', () => {
    const [primeiro] = listarBaseDe(ID_CORRESPONDENTE_CARLA);

    reatribuirVinculo(primeiro.id, ID_CORRESPONDENTE_RAFAEL);

    expect(consultarCorrespondente(ID_CORRESPONDENTE_CARLA)?.clientesNaBase).toBe(4);
    expect(consultarCorrespondente(ID_CORRESPONDENTE_RAFAEL)?.clientesNaBase).toBe(3);
  });

  it('o envio nasce em validacao e o backoffice valida ou devolve', () => {
    const envio = registrarEnvio(ID_CORRESPONDENTE_CARLA, {
      clienteNome: 'João da Silva',
      documentos: [{ tipo: 'Documento de identidade', nomeArquivo: 'rg.pdf' }],
      atestoConferencia: true,
    });
    expect(envio.status).toBe('EM_VALIDACAO');
    expect(resumoDe(ID_CORRESPONDENTE_CARLA)?.enviosEmValidacao).toBe(2);

    expect(validarEnvio(envio.id, { decisao: 'VALIDAR', observacao: '' })?.status).toBe('VALIDADO');
    const devolvido = validarEnvio(listarEnviosDe(ID_CORRESPONDENTE_CARLA)[1].id, {
      decisao: 'DEVOLVER',
      observacao: 'Ilegível',
    });
    expect(devolvido?.status).toBe('DEVOLVIDO');
    expect(devolvido?.observacaoBackoffice).toBe('Ilegível');
  });

  it('o correspondente ve contratos e parcelas so dos clientes da propria base', () => {
    const ops = listarOperacoesDe(ID_CORRESPONDENTE_CARLA);
    const nomes = new Set(ops.map((o) => o.clienteNome));

    expect(nomes.has('Padaria Estrela Ltda')).toBe(true);
    expect(nomes.has('Clínica Vida Plena')).toBe(false);
    expect(ops.find((o) => o.numero === 'CT-2026-0412')?.situacao).toBe('EM_DIA');
  });

  it('marca contrato em atraso com o valor e os dias da parcela vencida', () => {
    const ana = listarOperacoesDe(ID_CORRESPONDENTE_CARLA).find((o) => o.numero === 'CT-2026-0502');

    expect(ana?.situacao).toBe('EM_ATRASO');
    expect(ana?.parcelasVencidas).toBe(2);
    expect(ana?.valorEmAtraso).toBe(2 * 1190);
    expect(ana?.parcelas.filter((p) => p.status === 'VENCIDA').every((p) => p.diasAtraso > 0)).toBe(
      true,
    );
  });

  it('resume a carteira com inadimplencia e recebimentos futuros', () => {
    const { carteira } = resumoDe(ID_CORRESPONDENTE_CARLA)!;

    expect(carteira.contratosAtivos).toBe(3);
    expect(carteira.parcelasVencidas).toBe(2);
    expect(carteira.inadimplenciaPct).toBeGreaterThan(0);
    expect(carteira.porSituacao.EM_ATRASO).toBe(1);
    expect(carteira.aReceberPorMes).toHaveLength(6);
  });

  it('perdida a base, o correspondente deixa de ver os contratos dos clientes', () => {
    expect(listarOperacoesDe(ID_CORRESPONDENTE_MARCOS)).toHaveLength(2);

    processarVigencia();

    expect(listarOperacoesDe(ID_CORRESPONDENTE_MARCOS)).toHaveLength(0);
    expect(resumoDe(ID_CORRESPONDENTE_MARCOS)?.carteira.valorContratado).toBe(0);
  });
});

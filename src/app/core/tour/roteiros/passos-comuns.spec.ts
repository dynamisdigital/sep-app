import { PassoRoteiro } from '../tour.model';
import { enxugarRepeticoes } from './passos-comuns';

describe('enxugarRepeticoes', () => {
  const passo = (
    titulo: string,
    texto: string,
    extra: Partial<PassoRoteiro> = {},
  ): PassoRoteiro => ({
    titulo,
    texto,
    ...extra,
  });

  it('tira o passo que so observa e repete o texto, e encurta o que age', () => {
    const saida = enxugarRepeticoes([
      passo('Menu', 'No menu lateral fica o módulo.', { secao: 'A', acao: { tipo: 'clicar' } }),
      passo('Aviso', 'Leia o aviso.', { secao: 'A', acao: { tipo: 'observar' } }),
      passo('Menu', 'No menu lateral fica o módulo.', { secao: 'B', acao: { tipo: 'clicar' } }),
      passo('Aviso', 'Leia o aviso.', { secao: 'B', acao: { tipo: 'observar' } }),
      passo('Seguir', 'Outro texto.', { secao: 'B' }),
    ]);
    expect(saida.map((p) => p.titulo)).toEqual(['Menu', 'Aviso', 'Menu', 'Seguir']);
    expect(saida[2].texto).toBe('Menu.');
    expect(saida[2].acao).toEqual({ tipo: 'clicar' });
  });

  it('nunca tira o primeiro passo de uma secao nem passo que espera algo', () => {
    const saida = enxugarRepeticoes([
      passo('Aviso', 'Leia.', { secao: 'A' }),
      passo('Aviso', 'Leia.', { secao: 'B' }),
      passo('Espera', 'Leia.', { secao: 'B', aguardarAlvo: '.x' }),
    ]);
    expect(saida.length).toBe(3);
  });

  it('nao compara texto que depende do que os passos gravam', () => {
    const fn = () => 'igual';
    const saida = enxugarRepeticoes([passo('a', fn as never), passo('b', fn as never)]);
    expect(saida.length).toBe(2);
    expect(saida[1].texto).toBe(fn);
  });
});

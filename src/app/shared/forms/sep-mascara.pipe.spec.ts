import { SepMascaraPipe } from './sep-mascara.pipe';

describe('SepMascaraPipe', () => {
  const pipe = new SepMascaraPipe();

  it('mascara o dado canonico e deixa o ja mascarado como esta', () => {
    expect(pipe.transform('12345678000190', 'cnpj')).toBe('12.345.678/0001-90');
    expect(pipe.transform('12.345.678/0001-90', 'cnpj')).toBe('12.345.678/0001-90');
    expect(pipe.transform('52998224725', 'cpf')).toBe('529.982.247-25');
    expect(pipe.transform('11933334444', 'telefone')).toBe('(11) 93333-4444');
    expect(pipe.transform('01310100', 'cep')).toBe('01310-100');
  });

  it('nao mexe em vazio nem no que o backend ja ocultou', () => {
    expect(pipe.transform(null, 'cpf')).toBe('');
    expect(pipe.transform('', 'cpf')).toBe('');
    expect(pipe.transform('***.982.247-**', 'cpf')).toBe('***.982.247-**');
  });
});

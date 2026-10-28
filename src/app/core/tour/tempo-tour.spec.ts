import { estimarPassos, formatarEstimativa, formatarRelogio } from './tempo-tour';
import { ContextoRoteiro, PassoRoteiro } from './tour.model';

const ctx: ContextoRoteiro = {
  demo: true,
  papel: null,
  mfa: false,
  carimbo: '000000',
  dados: {},
};

describe('tempo do tour', () => {
  it('formata estimativas arredondadas', () => {
    expect(formatarEstimativa(2000)).toBe('≈ 5 s');
    expect(formatarEstimativa(44_000)).toBe('≈ 45 s');
    expect(formatarEstimativa(180_000)).toBe('≈ 3 min');
    expect(formatarEstimativa(380_000)).toBe('≈ 6 min 20 s');
  });

  it('formata o relogio exato', () => {
    expect(formatarRelogio(45_000)).toBe('45 s');
    expect(formatarRelogio(365_000)).toBe('6 min 05 s');
  });

  it('soma so a faixa pedida, ignora os pulados e encurta com a velocidade', () => {
    const passos: PassoRoteiro[] = [
      { titulo: 'a', texto: 'x'.repeat(100) },
      { titulo: 'b', texto: 'x'.repeat(100), pularSe: () => true },
      { titulo: 'c', texto: 'x'.repeat(100), alvo: '#c' },
    ];
    const tudo = estimarPassos(passos, ctx);
    expect(estimarPassos(passos, ctx, 1, 2)).toBeLessThan(tudo);
    expect(estimarPassos(passos, ctx, 1, 1, 2)).toBe(0);
    expect(estimarPassos(passos, ctx, 2)).toBeCloseTo(tudo / 2);
  });
});

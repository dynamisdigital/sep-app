import { expect, test } from '@playwright/test';
import { POSTS } from '../src/app/features/public/shared/site-blog';

type JanelaVoz = Window & {
  __leituraTeste: { agora: number; falas: SpeechSynthesisUtterance[] };
};

for (const post of POSTS) {
  test(`áudio de ${post.slug}: Play retoma o ponto pausado com recuo`, async ({ page }) => {
    await page.addInitScript(() => {
      const janela = window as unknown as JanelaVoz;
      janela.__leituraTeste = { agora: 1000, falas: [] };
      Object.defineProperty(performance, 'now', { value: () => janela.__leituraTeste.agora });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          speak: (fala: SpeechSynthesisUtterance) => janela.__leituraTeste.falas.push(fala),
          cancel: () => undefined,
          getVoices: () => [],
          addEventListener: () => undefined,
        },
      });
    });
    await page.goto(`/blog/${post.slug}`);
    await page.getByRole('button', { name: 'Ouvir', exact: true }).click();
    const original = await page.evaluate(() => {
      const teste = (window as unknown as JanelaVoz).__leituraTeste;
      // Passa pelo título e por eventuais blocos curtos até uma frase com espaço para o recuo.
      for (let i = 0; teste.falas.at(-1)!.text.length < 80 && i < 30; i++) {
        const fala = teste.falas.at(-1)!;
        fala.onend?.(new SpeechSynthesisEvent('end', { utterance: fala }));
      }
      const fala = teste.falas.at(-1)!;
      const caractere = Math.min(120, Math.floor(fala.text.length * 0.7));
      teste.agora = 9000;
      fala.onboundary?.(
        new SpeechSynthesisEvent('boundary', {
          utterance: fala,
          charIndex: caractere,
          elapsedTime: 8,
          name: 'word',
        }),
      );
      return { texto: fala.text, quantidade: teste.falas.length, caractere };
    });
    expect(original.texto.length).toBeGreaterThanOrEqual(80);
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await expect(page.locator('sep-ouvir-texto [role="status"]')).toContainText('2 segundos');
    await page.evaluate(() => {
      const teste = (window as unknown as JanelaVoz).__leituraTeste;
      teste.agora = 69_000;
      const antiga = teste.falas.at(-1)!;
      antiga.onend?.(new SpeechSynthesisEvent('end', { utterance: antiga }));
    });
    expect(
      await page.evaluate(() => (window as unknown as JanelaVoz).__leituraTeste.falas.length),
    ).toBe(original.quantidade);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    const retomada = await page.evaluate(() => {
      const falas = (window as unknown as JanelaVoz).__leituraTeste.falas;
      return { texto: falas.at(-1)!.text, quantidade: falas.length };
    });
    expect(retomada.quantidade).toBe(original.quantidade + 1);
    expect(original.texto.endsWith(retomada.texto)).toBe(true);
    const inicio = original.texto.length - retomada.texto.length;
    expect(inicio).toBeGreaterThan(0);
    expect(original.caractere - inicio).toBeGreaterThanOrEqual(original.caractere / 4);
    expect(original.caractere - inicio).toBeLessThan(90);
    expect(original.texto[inicio - 1]).toMatch(/\s/);
    await page.getByRole('button', { name: 'Parar', exact: true }).click();
  });
}

import { expect, Page, test } from '@playwright/test';
import { POSTS } from '../src/app/features/public/shared/site-blog';

type JanelaLeitura = Window & {
  __destaqueTeste: { agora: number; falas: SpeechSynthesisUtterance[] };
};

async function instalarVoz(page: Page, tema = 'dark') {
  await page.addInitScript((tema) => {
    localStorage.setItem('SEP_THEME', tema);
    const janela = window as JanelaLeitura;
    janela.__destaqueTeste = { agora: 1000, falas: [] };
    Object.defineProperty(performance, 'now', { value: () => janela.__destaqueTeste.agora });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (fala: SpeechSynthesisUtterance) => janela.__destaqueTeste.falas.push(fala),
        cancel: () => undefined,
        getVoices: () => [],
        addEventListener: () => undefined,
      },
    });
  }, tema);
}

for (const post of POSTS) {
  test(`${post.slug}: todas as frases terminam cobertas, sem letras ou pontuação soltas`, async ({
    page,
  }) => {
    await instalarVoz(page);
    await page.goto(`/blog/${post.slug}`);
    await page.getByRole('button', { name: 'Ouvir', exact: true }).click();
    const resultado = await page.evaluate(() => {
      const teste = (window as JanelaLeitura).__destaqueTeste;
      const falhas: string[] = [];
      let verificadas = 0;
      while (verificadas < 500) {
        const fala = teste.falas.at(-1)!;
        teste.agora += (fala.text.length / 15) * 1000;
        fala.onboundary?.(
          new SpeechSynthesisEvent('boundary', {
            utterance: fala,
            name: 'word',
            charIndex: Math.max(0, fala.text.length - 2),
            charLength: 1,
          }),
        );
        const faixa = [...(CSS.highlights.get('sep-lido') ?? [])][0] as Range | undefined;
        if (!faixa) {
          falhas.push(`Sem faixa: ${fala.text}`);
          break;
        }
        const elemento = faixa.startContainer.parentElement!.closest('h1,h2,p,li,blockquote')!;
        const resto = faixa.cloneRange();
        resto.setStart(faixa.endContainer, faixa.endOffset);
        resto.setEnd(elemento, elemento.childNodes.length);
        const descoberto = resto.toString();
        if (descoberto && !/^\s/.test(descoberto))
          falhas.push(`Palavra cortada: ${faixa.toString()} | ${descoberto}`);
        if (descoberto.trim() && !/[.!?,;:]$/.test(faixa.toString().trimEnd()))
          falhas.push(`Frase incompleta: ${faixa.toString()}`);
        verificadas++;
        const quantidade = teste.falas.length;
        fala.onend?.(new SpeechSynthesisEvent('end', { utterance: fala }));
        if (teste.falas.length === quantidade) break;
      }
      return { verificadas, falhas };
    });
    expect(resultado.verificadas).toBeGreaterThan(5);
    expect(resultado.verificadas).toBeLessThan(500);
    expect(resultado.falhas).toEqual([]);
  });
}

for (const tema of ['dark', 'light']) {
  for (const colunas of [1, 2, 3]) {
    test(`imagem relatada: jornada. fica inteira no tema ${tema}, ${colunas} colunas`, async ({
      page,
    }) => {
      await instalarVoz(page, tema);
      await page.setViewportSize({ width: 1706, height: 1258 });
      await page.goto('/blog/demonstracao-cliente');
      await page
        .getByRole('button', {
          name: colunas === 1 ? '1 coluna' : `${colunas} colunas`,
          exact: true,
        })
        .click();
      await page.getByRole('button', { name: 'Ouvir', exact: true }).click();
      const cobertura = await page.evaluate(() => {
        const teste = (window as JanelaLeitura).__destaqueTeste;
        for (let i = 0; i < 150; i++) {
          const fala = teste.falas.at(-1)!;
          const indice = fala.text.indexOf('banner da jornada.');
          if (indice >= 0) {
            teste.agora += 8000;
            fala.onboundary?.(
              new SpeechSynthesisEvent('boundary', {
                utterance: fala,
                name: 'word',
                charIndex: indice + 'banner da jorna'.length,
                charLength: 1,
              }),
            );
            return [...(CSS.highlights.get('sep-lido') ?? [])]
              .map((faixa) => faixa.toString())
              .join('');
          }
          fala.onend?.(new SpeechSynthesisEvent('end', { utterance: fala }));
        }
        return '';
      });
      expect(cobertura).toMatch(/jornada\.$/);
      // Permite que o navegador pinte o destaque e confira que o quadro seguinte não o corta de novo.
      await page.waitForTimeout(100);
      const pintado = await page.evaluate(() =>
        [...(CSS.highlights.get('sep-lido') ?? [])].map((faixa) => faixa.toString()).join(''),
      );
      expect(pintado).toMatch(/jornada\.$/);
      await page.screenshot({ path: `test-results/blog-destaque-${tema}-${colunas}.png` });
    });
  }
}

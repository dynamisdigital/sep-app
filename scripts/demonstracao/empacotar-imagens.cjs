// Otimiza somente as novas versões geradas: PNG e WebP com a proporção da foto original.
// Não altera nenhum arquivo em assets/. As edições fotográficas são feitas pelo image_gen.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve('image/demonstracao');
const versoes = path.join(raiz, 'versoes/telas-escuras');
const manifesto = JSON.parse(fs.readFileSync(path.join(versoes, 'edicoes.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const { key } of manifesto.imagens) {
      const arquivo = path.join(versoes, `${key}.png`);
      const original = fs.readFileSync(path.join(raiz, 'assets', `${key}.png`));
      const gerada = fs.readFileSync(arquivo);
      const resultado = await page.evaluate(
        async ({ original, gerada, banner }) => {
          const ler = async (bytes) => {
            const img = new Image();
            img.src = `data:image/png;base64,${bytes}`;
            await img.decode();
            return img;
          };
          const [base, nova] = await Promise.all([ler(original), ler(gerada)]);
          let y = 0;
          let altura = nova.height;
          // Remove apenas o letterbox branco introduzido pelo gerador no banner panorâmico.
          if (banner && Math.abs(nova.width / nova.height - base.width / base.height) > 0.1) {
            const inspe = document.createElement('canvas');
            inspe.width = nova.width;
            inspe.height = nova.height;
            const g = inspe.getContext('2d');
            g.drawImage(nova, 0, 0);
            const linhaBranca = (linha) => {
              const dados = g.getImageData(0, linha, nova.width, 1).data;
              let brancos = 0;
              for (let x = 0; x < dados.length; x += 4)
                if (dados[x] > 240 && dados[x + 1] > 240 && dados[x + 2] > 240) brancos++;
              return brancos / nova.width > 0.98;
            };
            let fim = nova.height - 1;
            while (y < nova.height / 3 && linhaBranca(y)) y++;
            while (fim > (nova.height * 2) / 3 && linhaBranca(fim)) fim--;
            altura = fim - y + 1;
          }
          const largura = Math.max(base.width, Math.min(960, nova.width));
          const canvas = document.createElement('canvas');
          canvas.width = largura;
          canvas.height = Math.round((largura * base.height) / base.width);
          canvas
            .getContext('2d')
            .drawImage(nova, 0, y, nova.width, altura, 0, 0, canvas.width, canvas.height);
          return {
            png: canvas.toDataURL('image/png').split(',')[1],
            webp: canvas.toDataURL('image/webp', 0.88).split(',')[1],
            largura,
            altura: canvas.height,
          };
        },
        {
          original: original.toString('base64'),
          gerada: gerada.toString('base64'),
          banner: key === 'backoffice/00_backoffice_banner',
        },
      );
      fs.writeFileSync(arquivo, Buffer.from(resultado.png, 'base64'));
      fs.writeFileSync(arquivo.replace(/\.png$/, '.webp'), Buffer.from(resultado.webp, 'base64'));
      console.log(
        'OK',
        key,
        `${resultado.largura}x${resultado.altura}`,
        `${Math.round(Buffer.from(resultado.webp, 'base64').length / 1024)} KiB WebP`,
      );
    }
  } finally {
    await browser.close();
  }
})().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});

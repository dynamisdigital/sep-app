// Gera os artefatos da atualizacao semanal e monta a pasta pronta para publicar no Netlify.
//
// Uso (na raiz do projeto sep-app):
//   node docs/atualizacao-02102026/gerar-publicacao.js
//   node docs/atualizacao-02102026/gerar-publicacao.js https://seu-site.netlify.app
//
// Sem o endereco, a pagina funciona normalmente, mas a previa do WhatsApp pode sair sem imagem:
// o WhatsApp so busca a imagem de previa por link absoluto. Depois de publicar a primeira vez,
// rode de novo com o endereco e publique outra vez (passo 6 do PASSO_A_PASSO_PUBLICACAO.md).

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const PDF_NOME = 'SEP_Atualizacao_Semana_Daniel_Mollmann_01102026_02102026.pdf';

async function gerar() {
  const pasta = path.resolve(__dirname);
  const htmlPath = path.join(pasta, 'apresentacao-atualizacao-sep.html');
  const pdfPath = path.join(pasta, PDF_NOME);
  const bannerPath = path.join(pasta, 'preview-banner.png');
  const mobilePath = path.join(pasta, 'mobile-preview.png');
  const publicar = path.join(pasta, 'publicar');

  const argumento = process.argv[2];
  const site = argumento ? argumento.replace(/\/?$/, '/') : '';
  if (site && !/^https:\/\//.test(site)) {
    throw new Error('O endereco precisa comecar com https:// (ex.: https://seu-site.netlify.app)');
  }

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Iniciando Chromium via Playwright...');
  const browser = await chromium.launch({ headless: true });

  // 1. PDF oficial, desktop em alta resolucao (tema escuro)
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await desktop.newPage();
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.evaluateHandle('document.fonts.ready');
  // As imagens usam loading="lazy": forca o carregamento antes de imprimir.
  await page.evaluate(async () => {
    const imagens = Array.from(document.images);
    imagens.forEach((img) => (img.loading = 'eager'));
    await Promise.all(imagens.map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));
  });
  console.log('1. Renderizando o PDF oficial...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    // Como "ajustar a pagina": cada slide cabe em uma ou duas folhas, sem sobra solta.
    scale: 0.8,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
  });
  console.log(`   OK ${PDF_NOME} (${(fs.statSync(pdfPath).size / 1024).toFixed(0)} KB)`);

  // 2. Banner de previa para WhatsApp e redes (1200x630), so a capa
  console.log('2. Gerando o banner de previa (1200x630)...');
  const previa = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  const previaPage = await previa.newPage();
  await previaPage.goto(fileUrl, { waitUntil: 'networkidle' });
  await previaPage.evaluateHandle('document.fonts.ready');
  await previaPage.evaluate(() => {
    document.querySelector('.top-nav')?.style.setProperty('display', 'none');
    document.getElementById('floatingBar')?.style.setProperty('display', 'none');
  });
  await previaPage.screenshot({ path: bannerPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log('   OK preview-banner.png');

  // 3. Conferencia no celular (390x844)
  console.log('3. Capturando a versao de celular (390x844)...');
  const celular = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const celularPage = await celular.newPage();
  await celularPage.goto(fileUrl, { waitUntil: 'networkidle' });
  await celularPage.evaluateHandle('document.fonts.ready');
  const largura = await celularPage.evaluate(() => document.documentElement.scrollWidth);
  await celularPage.screenshot({ path: mobilePath });
  console.log(`   OK mobile-preview.png (largura da pagina: ${largura}px${largura > 390 ? ' — ATENCAO: rola na horizontal' : ''})`);

  await browser.close();

  // 4. Pasta pronta para o Netlify: index.html, PDF, banner e imagens
  console.log('4. Montando a pasta publicar/ ...');
  fs.rmSync(publicar, { recursive: true, force: true });
  fs.mkdirSync(path.join(publicar, 'imagens'), { recursive: true });
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (site) {
    html = html.replaceAll('__URL_PUBLICADA__', site);
  } else {
    // Sem endereco ainda: previa relativa e sem og:url.
    html = html
      .replace(/\s*<meta property="og:url" content="__URL_PUBLICADA__">/, '')
      .replaceAll('__URL_PUBLICADA__', '');
  }
  fs.writeFileSync(path.join(publicar, 'index.html'), html);
  fs.copyFileSync(pdfPath, path.join(publicar, PDF_NOME));
  fs.copyFileSync(bannerPath, path.join(publicar, 'preview-banner.png'));
  for (const img of fs.readdirSync(path.join(pasta, 'imagens'))) {
    fs.copyFileSync(path.join(pasta, 'imagens', img), path.join(publicar, 'imagens', img));
  }
  const total = fs
    .readdirSync(publicar, { recursive: true })
    .map((f) => path.join(publicar, f))
    .filter((f) => fs.statSync(f).isFile())
    .reduce((s, f) => s + fs.statSync(f).size, 0);
  console.log(`   OK ${publicar} (${(total / 1024 / 1024).toFixed(1)} MB)`);
  console.log(site ? `\nPronto. Previa apontando para ${site}` : '\nPronto. Arraste a pasta "publicar" no Netlify Drop.');
}

gerar().catch((erro) => {
  console.error('Erro ao gerar a publicacao:', erro.message);
  process.exit(1);
});

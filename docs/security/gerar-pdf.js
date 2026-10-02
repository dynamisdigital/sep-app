const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function processarArtefatos() {
  const securityDir = path.resolve(__dirname);
  const htmlPath = path.join(securityDir, 'apresentacao-seguranca-sep.html');
  const pdfPath = path.join(securityDir, 'SEP_Auditoria_Seguranca_Frontend_Diretoria.pdf');
  const previewBannerPath = path.join(securityDir, 'preview-banner.png');
  const mobileScreenshotPath = path.join(securityDir, 'mobile-preview.png');

  // Destino na pasta pública do Angular (para acesso direto via URL no deploy ou dev server)
  const publicDir = path.resolve(__dirname, '../../public/relatorio-seguranca');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Iniciando Chromium via Playwright...');
  const browser = await chromium.launch({ headless: true });

  // 1. Contexto Desktop para PDF de Alta Resolução (Retina 2x)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await desktopContext.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Carregando página:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.evaluateHandle('document.fonts.ready');

  console.log('1. Renderizando PDF oficial em alta resolução (Dark Theme)...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm',
    },
    preferCSSPageSize: false,
  });
  const pdfStats = fs.statSync(pdfPath);
  console.log(`   ✓ PDF gerado: ${pdfPath} (${(pdfStats.size / 1024).toFixed(1)} KB)`);

  // 2. Banner de Preview para WhatsApp / Redes Sociais (1200x630)
  console.log('2. Gerando Banner Oficial para WhatsApp (1200x630)...');
  const previewContext = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  const previewPage = await previewContext.newPage();
  await previewPage.goto(fileUrl, { waitUntil: 'networkidle' });
  await previewPage.evaluateHandle('document.fonts.ready');
  // Oculta navbar e botões para o preview do WhatsApp ser limpo e profissional
  await previewPage.evaluate(() => {
    const nav = document.querySelector('.top-nav');
    const fab = document.getElementById('floatingBar');
    if (nav) nav.style.display = 'none';
    if (fab) fab.style.display = 'none';
  });
  await previewPage.screenshot({
    path: previewBannerPath,
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  console.log(`   ✓ Preview Banner gerado: ${previewBannerPath}`);

  // 3. Teste e Captura de Renderização Mobile (iPhone / Android)
  console.log('3. Validando e capturando renderização Mobile (Smartphone 390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(fileUrl, { waitUntil: 'networkidle' });
  await mobilePage.evaluateHandle('document.fonts.ready');
  await mobilePage.screenshot({
    path: mobileScreenshotPath,
    fullPage: false,
  });
  console.log(`   ✓ Mobile Preview capturado: ${mobileScreenshotPath}`);

  await browser.close();

  // 4. Copiar artefatos para a pasta pública do Angular
  console.log('4. Sincronizando arquivos com a pasta public/relatorio-seguranca/ ...');
  fs.copyFileSync(htmlPath, path.join(publicDir, 'index.html'));
  fs.copyFileSync(pdfPath, path.join(publicDir, 'SEP_Auditoria_Seguranca_Frontend_Diretoria.pdf'));
  fs.copyFileSync(previewBannerPath, path.join(publicDir, 'preview-banner.png'));
  console.log(`   ✓ Arquivos publicados em: ${publicDir}`);
  console.log('\nProcesso concluído com 100% de êxito!');
}

processarArtefatos().catch((err) => {
  console.error('Erro ao processar artefatos:', err);
  process.exit(1);
});

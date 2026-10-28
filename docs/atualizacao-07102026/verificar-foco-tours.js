// Percorre os tours e, em cada passo com destaque, confere se algum texto do alvo ficou parcialmente fora
// da area do foco (a caixa do proprio elemento) ou cortado por um ancestral com overflow / pela janela.
// Pre-requisito: sistema em modo demonstracao na porta 4200. Uso: node docs/atualizacao-07102026/verificar-foco-tours.js [parte do titulo]
// Filtros opcionais: CONTA=... MODULO=...
const { chromium } = require('@playwright/test');
const { CASOS, entrar, comecaCom } = require('./verificar-tours.js');

const COLETOR = () => {
  window.__foco = [];
  const vistos = new Set();
  const conferir = (el) => {
    const r = el.getBoundingClientRect();
    const tol = 1.5;
    const passo = (document.querySelector('.sep-tour-card h3, [class*="tour"] h3') || {}).innerText || '?';
    const problemas = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const ancestraisCortam = [];
    for (let a = el.parentElement; a; a = a.parentElement) {
      const o = getComputedStyle(a);
      if (/(hidden|auto|scroll|clip)/.test(o.overflowX + o.overflowY)) ancestraisCortam.push(a);
    }
    const eo = getComputedStyle(el);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = n.textContent.trim();
      if (!texto) continue;
      const pai = n.parentElement;
      const cs = getComputedStyle(pai);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const t of range.getClientRects()) {
        if (t.width < 1 || t.height < 1) continue;
        const dentro = t.left >= r.left - tol && t.right <= r.right + tol && t.top >= r.top - tol && t.bottom <= r.bottom + tol;
        if (!dentro) problemas.push(`fora da caixa do foco: "${texto.slice(0, 40)}"`);
        else {
          for (const a of ancestraisCortam) {
            const ar = a.getBoundingClientRect();
            if (t.left < ar.left - tol || t.right > ar.right + tol || t.top < ar.top - tol || t.bottom > ar.bottom + tol) {
              problemas.push(`cortado por ancestral <${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]}>: "${texto.slice(0, 40)}"`);
              break;
            }
          }
        }
        if (t.left < -tol || t.right > innerWidth + tol || t.bottom < 0 || t.top > innerHeight) problemas.push(`fora da janela: "${texto.slice(0, 40)}"`);
      }
    }
    if (/(hidden|clip)/.test(eo.overflowX) && el.scrollWidth > el.clientWidth + 1) problemas.push(`texto cortado na largura do proprio alvo (${el.scrollWidth}>${el.clientWidth})`);
    if (/(hidden|clip)/.test(eo.overflowY) && el.scrollHeight > el.clientHeight + 1) problemas.push(`texto cortado na altura do proprio alvo (${el.scrollHeight}>${el.clientHeight})`);
    const chave = passo + '|' + el.tagName + '.' + String(el.className).slice(0, 60);
    if (vistos.has(chave)) return;
    vistos.add(chave);
    window.__foco.push({ passo, alvo: el.tagName.toLowerCase() + '.' + String(el.className).replace('sep-tour-alvo', '').trim().split(/\s+/)[0], problemas: [...new Set(problemas)] });
  };
  const agendar = (el) => setTimeout(() => el.isConnected && el.classList.contains('sep-tour-alvo') && conferir(el), 900);
  new MutationObserver((ms) => {
    for (const m of ms) if (m.type === 'attributes' && m.target.classList.contains('sep-tour-alvo')) agendar(m.target);
  }).observe(document, { attributes: true, attributeFilter: ['class'], subtree: true });
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  let total = 0;
  let comProblema = 0;
  for (const caso of CASOS) {
    if (process.env.CONTA && caso.conta !== process.env.CONTA) continue;
    if (process.env.MODULO && (caso.modulo || 'Correspondentes') !== process.env.MODULO) continue;
    for (const titulo of [...new Set(caso.roteiros)]) {
      if (process.argv[2] && !titulo.includes(process.argv[2])) continue;
      const { ctx, page } = await entrar(browser, caso.conta);
      await page.evaluate(COLETOR);
      try {
        await page.getByRole('button', { name: 'Ajuda' }).first().click();
        const grupo = page.locator('details.op-ajuda-grupo', { hasText: caso.modulo || 'Correspondentes' }).first();
        await grupo.locator('summary').click();
        await grupo.locator('button.op-ajuda-roteiro', { hasText: comecaCom(titulo) }).first().click();
        const velocidade = page.locator('button[aria-label^="Velocidade"]');
        await velocidade.waitFor({ timeout: 15000 });
        for (let i = 0; i < 2; i += 1) await velocidade.click();
        await page.locator('.sep-tour-aviso').waitFor({ timeout: 1500000 });
        const achados = await page.evaluate(() => window.__foco);
        total += achados.length;
        const ruins = achados.filter((a) => a.problemas.length);
        comProblema += ruins.length;
        console.log(`${ruins.length ? 'PROBLEMA' : 'ok      '} [${caso.conta}] ${titulo} (${achados.length} passos com foco)`);
        for (const a of ruins) console.log(`   - "${a.passo}" ${a.alvo}: ${a.problemas.join(' | ')}`);
      } catch (e) {
        console.log(`ERRO     [${caso.conta}] ${titulo} -> ${String(e.message).split('\n')[0]}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\n${total} focos conferidos, ${comProblema} com texto fora da area.`);
})();

// Monta apresentacao-atualizacao-sep.html (relatorio para a Diretoria) e backend.html (apoio tecnico
// ao backend). O cabecalho, o CSS e a barra flutuante vem da edicao de 24/09 (o padrao visual
// aprovado); o conteudo desta edicao vive em conteudo-main.html.
//
// Uso (na raiz do projeto sep-app): node docs/atualizacao-07102026/montar-html.js

const fs = require('fs');
const path = require('path');
const { converter } = require('./md-para-html');

const pasta = __dirname;
const anterior = path.join(pasta, '..', 'atualizacao-24092026', 'apresentacao-atualizacao-sep.html');
const PDF_ANTIGO = 'SEP_Atualizacao_Semana_Daniel_Mollmann_22092026_24092026.pdf';
const PDF_NOVO = 'SEP_Correspondentes_Daniel_Mollmann_07102026.pdf';

const DESCRICAO =
  'Módulo de Correspondentes do SEP, por Daniel Möllmann: pessoas físicas credenciadas captam clientes, enviam documentos com atesto de conferência e acompanham a própria base. Inclui a rede de sub-correspondentes, o Pix Automático e a análise de crédito com bureaus e score explicável. Em teste, com dados fictícios e apoio técnico ao backend.';

let html = fs.readFileSync(anterior, 'utf8');

const inicio = html.indexOf('  <main class="deck-container">');
const fim = html.indexOf('</main>') + '</main>'.length;
if (inicio < 0 || fim < inicio) throw new Error('Marcadores do <main> nao encontrados na edicao anterior.');

const principal = fs.readFileSync(path.join(pasta, 'conteudo-main.html'), 'utf8').trimEnd();
html = html.slice(0, inicio) + principal + html.slice(fim);

const trocas = [
  [/<title>[\s\S]*?<\/title>/, '<title>SEP — Correspondentes, Pix Automático &amp; Análise de Crédito</title>'],
  [/(<meta name="description" content=")[^"]*(">)/, `$1${DESCRICAO}$2`],
  [/(<meta property="og:title" content=")[^"]*(">)/, '$1SEP — Correspondentes, Pix Automático e Análise de Crédito · 7/10/2026$2'],
  [/(<meta property="og:description" content=")[^"]*(">)/, `$1${DESCRICAO}$2`],
  [/(<meta name="twitter:title" content=")[^"]*(">)/, '$1SEP — Correspondentes, Pix Automático e Análise de Crédito · 7/10/2026$2'],
  [/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${DESCRICAO}$2`],
  [/(<meta property="og:image:alt" content=")[^"]*(">)/, '$1SEP — Módulo de Correspondentes, relatório de 7 de outubro$2'],
  [/Atualização do Frontend · 22 a 24 de Setembro de 2026/, 'Módulo de Correspondentes · 7 de Outubro de 2026'],
];
for (const [de, para] of trocas) {
  if (!de.test(html)) throw new Error(`Trecho nao encontrado: ${de}`);
  html = html.replace(de, para);
}
html = html.replaceAll(PDF_ANTIGO, PDF_NOVO);

const CSS_EXTRA = `
    .shot-grid-3 {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media screen and (max-width: 992px) {
      .shot-grid-3 {
        grid-template-columns: 1fr;
      }
    }
`;
html = html.replace('  </style>', CSS_EXTRA + '  </style>');

// Texto do botao de WhatsApp.
const inicioTexto = html.indexOf('const texto = "*SEP');
const fimTexto = html.indexOf('urlAtual;', inicioTexto) + 'urlAtual;'.length;
if (inicioTexto < 0 || fimTexto < inicioTexto) throw new Error('Texto do WhatsApp nao encontrado.');
const novoTexto =
  'const texto = "*SEP — Módulo de Correspondentes · 7/10/2026*\\n\\n" +\n' +
  '        "Relatório de *Daniel Möllmann* para a Diretoria:\\n" +\n' +
  '        "• Correspondente: pessoa física credenciada que capta clientes\\n" +\n' +
  '        "• Documentos enviados com atesto de conferência; o backoffice valida\\n" +\n' +
  '        "• Base com validade: cadastro vencido ou proposta sem citação encerra o vínculo\\n" +\n' +
  '        "• Comissão via Pix, sujeita a normativa e legislação\\n" +\n' +
  '        "• Rede de sub-correspondentes, Pix Automático e análise de crédito\\n" +\n' +
  '        "• Em teste, com dados fictícios e ponto de retorno\\n\\n" +\n' +
  '        "Acesse o relatório completo:\\n" + urlAtual;';
html = html.slice(0, inicioTexto) + novoTexto + html.slice(fimTexto);

fs.writeFileSync(path.join(pasta, 'apresentacao-atualizacao-sep.html'), html);
console.log('OK apresentacao-atualizacao-sep.html', (html.length / 1024).toFixed(0) + ' KB');

// Pagina do backend: o mesmo documento Markdown, em uma pagina simples de ler e imprimir.
const md = fs.readFileSync(path.join(pasta, 'CONTRATO_BACKEND_CORRESPONDENTES.md'), 'utf8');
const corpo = converter(md);
const paginaBackend = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEP — Módulo de Correspondentes: apoio técnico ao backend</title>
  <meta name="description" content="Contrato, regras e justificativas do módulo de Correspondentes, para o backend do SEP.">
  <meta name="robots" content="noindex">
  <style>
    :root { --bg:#0b1220; --card:#121b2e; --texto:#e6edf7; --muda:#93a4bf; --linha:#26344f; --acento:#38bdf8; --codigo:#0a1020; }
    @media (prefers-color-scheme: light) {
      :root { --bg:#f5f7fb; --card:#fff; --texto:#142033; --muda:#51607a; --linha:#d7deea; --acento:#0369a1; --codigo:#eef2f8; }
    }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--texto); font:15px/1.65 Inter,"Segoe UI",system-ui,sans-serif; }
    main { max-width:980px; margin:0 auto; padding:32px 20px 80px; }
    .topo { display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center; margin-bottom:18px; }
    .topo a { color:var(--acento); font-size:13px; text-decoration:none; font-weight:600; }
    h1 { font-size:28px; margin:8px 0 6px; line-height:1.25; }
    h2 { font-size:20px; margin:38px 0 8px; padding-top:10px; border-top:1px solid var(--linha); }
    h3 { font-size:16px; margin:24px 0 6px; }
    p, li { color:var(--texto); }
    ul, ol { padding-left:22px; }
    li { margin:4px 0; }
    code { background:var(--codigo); padding:1px 6px; border-radius:4px; font:13px ui-monospace,Consolas,monospace; }
    pre { background:var(--codigo); border:1px solid var(--linha); border-radius:8px; padding:14px 16px; overflow-x:auto; }
    pre code { background:none; padding:0; font-size:12.5px; line-height:1.5; }
    blockquote { margin:16px 0; padding:12px 16px; border-left:4px solid var(--acento); background:var(--card); border-radius:0 8px 8px 0; font-size:16px; }
    hr { border:0; border-top:1px solid var(--linha); margin:26px 0; }
    .tabela { overflow-x:auto; margin:14px 0; border:1px solid var(--linha); border-radius:8px; background:var(--card); }
    table { width:100%; border-collapse:collapse; font-size:13.5px; }
    th { text-align:left; padding:9px 12px; color:var(--muda); font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--linha); white-space:nowrap; }
    td { padding:9px 12px; border-bottom:1px solid var(--linha); vertical-align:top; }
    tr:last-child td { border-bottom:0; }
    @media print { :root { --bg:#fff; --card:#fff; --texto:#111; --muda:#444; --linha:#ccc; --acento:#036; --codigo:#f2f2f2; } .topo { display:none; } }
  </style>
</head>
<body>
  <main>
    <div class="topo">
      <a href="index.html">← Relatório para a Diretoria</a>
      <a href="CONTRATO_BACKEND_CORRESPONDENTES.md" download>Baixar em Markdown</a>
    </div>
${corpo}
  </main>
</body>
</html>
`;
fs.writeFileSync(path.join(pasta, 'backend.html'), paginaBackend);
console.log('OK backend.html', (paginaBackend.length / 1024).toFixed(0) + ' KB');

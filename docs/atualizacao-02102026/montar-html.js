// Monta apresentacao-atualizacao-sep.html: o cabecalho, o CSS e a barra flutuante da edicao de 24/09
// (o padrao visual aprovado) com o conteudo desta edicao, que vive em conteudo-main.html.
//
// Uso (na raiz do projeto sep-app): node docs/atualizacao-02102026/montar-html.js

const fs = require('fs');
const path = require('path');

const pasta = __dirname;
const anterior = path.join(pasta, '..', 'atualizacao-24092026', 'apresentacao-atualizacao-sep.html');
const PDF_ANTIGO = 'SEP_Atualizacao_Semana_Daniel_Mollmann_22092026_24092026.pdf';
const PDF_NOVO = 'SEP_Atualizacao_Semana_Daniel_Mollmann_01102026_02102026.pdf';

const DESCRICAO =
  'Entrega de 1 e 2/10/2026 por Daniel Möllmann: tour assistido nos 10 módulos do SEP (52 roteiros), operações sensíveis demonstradas com TOTP, indicadores de Crédito calculados dos dados e 10 telas sem conteúdo cortado. 710 testes aprovados.';

let html = fs.readFileSync(anterior, 'utf8');

const inicio = html.indexOf('  <main class="deck-container">');
const fim = html.indexOf('</main>') + '</main>'.length;
if (inicio < 0 || fim < inicio) throw new Error('Marcadores do <main> nao encontrados na edicao anterior.');

const principal = fs.readFileSync(path.join(pasta, 'conteudo-main.html'), 'utf8').trimEnd();
html = html.slice(0, inicio) + principal + html.slice(fim);

// Titulos, descricoes e textos de compartilhamento.
const trocas = [
  [/<title>[\s\S]*?<\/title>/, '<title>SEP — Atualização do Frontend: Tours Assistidos em Todo o Sistema, Números que Fecham &amp; Telas sem Corte</title>'],
  [/(<meta name="description" content=")[^"]*(">)/, `$1${DESCRICAO}$2`],
  [/(<meta property="og:title" content=")[^"]*(">)/, '$1SEP — Atualização do Frontend · 1 e 2/10/2026$2'],
  [/(<meta property="og:description" content=")[^"]*(">)/, `$1${DESCRICAO}$2`],
  [/(<meta name="twitter:title" content=")[^"]*(">)/, '$1SEP — Atualização do Frontend · 1 e 2/10/2026$2'],
  [/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${DESCRICAO}$2`],
  [/(<meta property="og:image:alt" content=")[^"]*(">)/, '$1SEP — Atualização do Frontend de 1 e 2 de outubro$2'],
  [/Atualização do Frontend · 22 a 24 de Setembro de 2026/, 'Atualização do Frontend · 1 e 2 de Outubro de 2026'],
];
for (const [de, para] of trocas) {
  if (!de.test(html)) throw new Error(`Trecho nao encontrado: ${de}`);
  html = html.replace(de, para);
}
html = html.replaceAll(PDF_ANTIGO, PDF_NOVO);

// Galeria com tres capturas por linha: seis telas cabem numa pagina do PDF.
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
  'const texto = "*SEP — Atualização do Frontend · 1 e 2/10/2026*\\n\\n" +\n' +
  '        "Entrega de *Daniel Möllmann*, verificada no navegador:\\n" +\n' +
  '        "• Tour assistido nos 10 módulos do sistema (52 roteiros)\\n" +\n' +
  '        "• Operações sensíveis demonstradas com confirmação por TOTP\\n" +\n' +
  '        "• Indicadores de Crédito calculados dos dados\\n" +\n' +
  '        "• 10 telas sem conteúdo cortado atrás do rodapé\\n" +\n' +
  '        "• 710 testes automatizados aprovados\\n\\n" +\n' +
  '        "Acesse a apresentação completa:\\n" + urlAtual;';
html = html.slice(0, inicioTexto) + novoTexto + html.slice(fimTexto);

fs.writeFileSync(path.join(pasta, 'apresentacao-atualizacao-sep.html'), html);
console.log('OK apresentacao-atualizacao-sep.html', (html.length / 1024).toFixed(0) + ' KB');

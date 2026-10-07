// Conversor minimo de Markdown para HTML, so com o que o CONTRATO_BACKEND_CORRESPONDENTES.md usa:
// titulos, paragrafos, listas, tabelas, bloco de codigo, citacao, linha horizontal, negrito e
// codigo em linha. Existe para publicar o documento do backend sem acrescentar dependencia.

function escapar(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function emLinha(texto) {
  return escapar(texto)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function celulas(linha) {
  return linha
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function converter(markdown) {
  const linhas = markdown.replace(/\r\n/g, '\n').split('\n');
  const saida = [];
  let i = 0;

  const ehTabela = (n) => /^\s*\|/.test(linhas[n] ?? '') && /^\s*\|[\s:|-]+\|\s*$/.test(linhas[n + 1] ?? '');

  while (i < linhas.length) {
    const linha = linhas[i];

    if (/^```/.test(linha)) {
      const bloco = [];
      i += 1;
      while (i < linhas.length && !/^```/.test(linhas[i])) bloco.push(linhas[i++]);
      i += 1;
      saida.push(`<pre><code>${escapar(bloco.join('\n'))}</code></pre>`);
      continue;
    }

    const titulo = /^(#{1,4})\s+(.*)$/.exec(linha);
    if (titulo) {
      const nivel = titulo[1].length;
      const texto = titulo[2];
      const id = texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      saida.push(`<h${nivel} id="${id}">${emLinha(texto)}</h${nivel}>`);
      i += 1;
      continue;
    }

    if (/^---+\s*$/.test(linha)) {
      saida.push('<hr>');
      i += 1;
      continue;
    }

    if (ehTabela(i)) {
      const cab = celulas(linhas[i]);
      i += 2;
      const corpo = [];
      while (i < linhas.length && /^\s*\|/.test(linhas[i])) corpo.push(celulas(linhas[i++]));
      saida.push(
        '<div class="tabela"><table><thead><tr>' +
          cab.map((c) => `<th>${emLinha(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          corpo.map((l) => `<tr>${l.map((c) => `<td>${emLinha(c)}</td>`).join('')}</tr>`).join('') +
          '</tbody></table></div>',
      );
      continue;
    }

    if (/^>\s?/.test(linha)) {
      const bloco = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) bloco.push(linhas[i++].replace(/^>\s?/, ''));
      saida.push(`<blockquote>${emLinha(bloco.join(' '))}</blockquote>`);
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(linha)) {
      const ordenada = /^\s*\d+\./.test(linha);
      const itens = [];
      while (i < linhas.length && /^\s*([-*]|\d+\.)\s+/.test(linhas[i])) {
        let item = linhas[i++].replace(/^\s*([-*]|\d+\.)\s+/, '');
        while (i < linhas.length && /^\s{2,}\S/.test(linhas[i]) && !/^\s*([-*]|\d+\.)\s+/.test(linhas[i])) {
          item += ' ' + linhas[i++].trim();
        }
        itens.push(item);
      }
      const tag = ordenada ? 'ol' : 'ul';
      saida.push(`<${tag}>${itens.map((t) => `<li>${emLinha(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (linha.trim() === '') {
      i += 1;
      continue;
    }

    const paragrafo = [];
    while (
      i < linhas.length &&
      linhas[i].trim() !== '' &&
      !/^(#{1,4}\s|```|>|---+\s*$|\s*([-*]|\d+\.)\s+)/.test(linhas[i]) &&
      !ehTabela(i)
    ) {
      paragrafo.push(linhas[i++].trim());
    }
    saida.push(`<p>${emLinha(paragrafo.join(' '))}</p>`);
  }

  return saida.join('\n');
}

module.exports = { converter };

import { describe, expect, it } from 'vitest';

import { __internos, qrDataUrl, qrMatriz } from './qr';

// Sequências de formato publicadas na ISO/IEC 18004 para o nível de correção L, máscaras
// 0 a 7. Conferir contra elas prova que o BCH e a máscara final estão certos — é o que um
// leitor consulta primeiro para saber como decodificar o resto.
const FORMATOS_NIVEL_L = [
  '111011111000100',
  '111001011110011',
  '111110110101010',
  '111100010011101',
  '110011000101111',
  '110001100011000',
  '110110001000001',
  '110100101110110',
];

describe('gerador de QR do dev-offline', () => {
  it.each(FORMATOS_NIVEL_L.map((esperado, mascara) => [mascara, esperado]))(
    'produz a sequência de formato do padrão para a máscara %i',
    (mascara, esperado) => {
      const bits = __internos
        .formatoDeMascara(mascara as number)
        .toString(2)
        .padStart(15, '0');
      expect(bits).toBe(esperado);
    },
  );

  // Exemplo trabalhado do próprio padrão: bloco de dados da versão 1-M e os 10 codewords
  // de correção que ele deve gerar. Valida a aritmética em GF(256) e o polinômio gerador.
  it('reproduz os codewords de correção do exemplo do padrão', () => {
    const dados = [
      0x40, 0xd2, 0x75, 0x47, 0x76, 0x17, 0x32, 0x06, 0x27, 0x26, 0x96, 0xc6, 0xc6, 0x96, 0x70,
      0xec,
    ];
    expect(__internos.correcao(dados, 10)).toEqual([
      0xbc, 0x2a, 0x90, 0x13, 0x6b, 0xaf, 0xef, 0xfd, 0x4b, 0xe0,
    ]);
  });

  it('escolhe a menor versão que comporta o conteúdo', () => {
    // lado = versão * 4 + 17
    expect(qrMatriz('SEP').length).toBe(21); // versão 1
    expect(qrMatriz('x'.repeat(60)).length).toBe(21 + 4 * 3); // versão 4
  });

  it('desenha os três localizadores, as linhas de tempo e o módulo escuro', () => {
    const m = qrMatriz('otpauth://totp/SEP:teste?secret=JBSWY3DPK5Q6V7HZ&issuer=SEP');
    const lado = m.length;

    // Olho do localizador: anel escuro de 7x7 com miolo 3x3.
    for (const [ox, oy] of [
      [0, 0],
      [lado - 7, 0],
      [0, lado - 7],
    ]) {
      expect(m[oy][ox]).toBe(1);
      expect(m[oy + 1][ox + 1]).toBe(0);
      expect(m[oy + 3][ox + 3]).toBe(1);
    }

    // Linhas de tempo alternando a partir da coluna/linha 6.
    for (let i = 8; i < lado - 8; i += 1) {
      expect(m[6][i]).toBe(i % 2 === 0 ? 1 : 0);
      expect(m[i][6]).toBe(i % 2 === 0 ? 1 : 0);
    }

    expect(m[lado - 8][8]).toBe(1);
  });

  it('devolve uma data URL de SVG utilizável em <img>', () => {
    const url = qrDataUrl('otpauth://totp/SEP:dev@sep.local?secret=JBSWY3DPK5Q6V7HZ&issuer=SEP');
    expect(url.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    const svg = decodeURIComponent(url.slice('data:image/svg+xml;utf8,'.length));
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain('fill="#0b1a2b"');
  });

  // Volta da matriz para o texto, seguindo o padrão do lado do leitor: lê a máscara na
  // área de formato, desfaz a máscara, percorre os módulos em ziguezague e interpreta o
  // cabeçalho de modo byte. É o que prova que a colocação dos bits está certa.
  it('a matriz volta a ser o texto original quando lida como um leitor leria', () => {
    const conteudo =
      'otpauth://totp/SEP:dev@sep.local?secret=JBSWY3DPK5Q6V7HZM4PLR2NXW7T3Y6DF&issuer=SEP&algorithm=SHA1&digits=6&period=30';
    const m = qrMatriz(conteudo);
    const lado = m.length;
    const versao = (lado - 17) / 4;

    // Máscara: bits 2..0 da sequência de formato, desfazendo a máscara final 0x5412.
    let formatoLido = 0;
    for (let i = 0; i <= 5; i += 1) formatoLido |= m[8][i] << i;
    formatoLido |= m[8][7] << 6;
    formatoLido |= m[8][8] << 7;
    formatoLido |= m[7][8] << 8;
    for (let i = 9; i <= 14; i += 1) formatoLido |= m[14 - i][8] << i;
    const mascara = ((formatoLido ^ 0x5412) >> 10) & 0b111;

    // Mapa de módulos reservados: vem do próprio esqueleto, que é estrutura fixa da versão
    // e já é conferida pelo teste dos localizadores, linhas de tempo e módulo escuro.
    const { reservado } = __internos.esqueleto(versao);

    const mascaras: ((x: number, y: number) => boolean)[] = [
      (x, y) => (x + y) % 2 === 0,
      (_x, y) => y % 2 === 0,
      (x) => x % 3 === 0,
      (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
      (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
      (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ];

    const bits: number[] = [];
    let subindo = true;
    for (let coluna = lado - 1; coluna > 0; coluna -= 2) {
      const c = coluna === 6 ? coluna - 1 : coluna;
      for (let passo = 0; passo < lado; passo += 1) {
        const y = subindo ? lado - 1 - passo : passo;
        for (const x of [c, c - 1]) {
          if (reservado[y][x]) continue;
          bits.push(m[y][x] ^ (mascaras[mascara](x, y) ? 1 : 0));
        }
      }
      subindo = !subindo;
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j += 1) b = (b << 1) | bits[i + j];
      bytes.push(b);
    }

    // Desfaz a intercalação: com um único grupo, os blocos de dados se alternam byte a byte.
    const blocosL: Record<number, [number, number, number]> = {
      1: [7, 1, 19],
      2: [10, 1, 34],
      3: [15, 1, 55],
      4: [20, 1, 80],
      5: [26, 1, 108],
      6: [18, 2, 68],
      7: [20, 2, 78],
    };
    const [, blocos, porBloco] = blocosL[versao];
    const dados: number[] = [];
    for (let b = 0; b < blocos; b += 1) {
      for (let i = 0; i < porBloco; i += 1) dados.push(bytes[i * blocos + b]);
    }

    expect((dados[0] >> 4) & 0xf).toBe(0b0100); // modo byte
    const tamanho = ((dados[0] & 0xf) << 4) | ((dados[1] >> 4) & 0xf);
    const conteudoBytes: number[] = [];
    for (let i = 0; i < tamanho; i += 1) {
      conteudoBytes.push(((dados[1 + i] & 0xf) << 4) | ((dados[2 + i] >> 4) & 0xf));
    }
    expect(new TextDecoder().decode(new Uint8Array(conteudoBytes))).toBe(conteudo);
  });

  it('recusa conteúdo maior do que o limite do gerador', () => {
    expect(() => qrDataUrl('x'.repeat(400))).toThrow(/grande demais/);
  });
});

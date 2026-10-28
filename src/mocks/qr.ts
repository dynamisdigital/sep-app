// Gerador de QR code do dev-offline (Mockup 34).
//
// Existe porque o mock precisa devolver um QR **legivel de verdade**: sem ele nao da para
// conferir o fluxo com um aplicativo autenticador real. Cobre o que o caso de uso exige e
// nada alem disso — modo byte, nivel de correcao L, versoes 1 a 10 (ate 271 bytes), que
// acomoda com folga uma URI `otpauth://`. Em producao o QR vem pronto do backend.
//
// Referencia: ISO/IEC 18004. As tabelas abaixo sao as do padrao para o nivel L.

// [codewords totais, codewords de correcao por bloco, blocos do grupo 1, dados por bloco
//  do grupo 1, blocos do grupo 2, dados por bloco do grupo 2]
const BLOCOS_L: Record<number, [number, number, number, number, number, number]> = {
  1: [26, 7, 1, 19, 0, 0],
  2: [44, 10, 1, 34, 0, 0],
  3: [70, 15, 1, 55, 0, 0],
  4: [100, 20, 1, 80, 0, 0],
  5: [134, 26, 1, 108, 0, 0],
  6: [172, 18, 2, 68, 0, 0],
  7: [196, 20, 2, 78, 0, 0],
  8: [242, 24, 2, 97, 0, 0],
  9: [292, 30, 2, 116, 0, 0],
  10: [346, 18, 2, 68, 2, 69],
};

// Centros dos padroes de alinhamento por versao (a versao 1 nao tem).
const ALINHAMENTO: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// ===== aritmetica em GF(256), para Reed-Solomon =====

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Polinomio gerador de grau `grau`.
function gerador(grau: number): number[] {
  let poli = [1];
  for (let i = 0; i < grau; i += 1) {
    const proximo = new Array<number>(poli.length + 1).fill(0);
    for (let j = 0; j < poli.length; j += 1) {
      proximo[j] ^= poli[j];
      proximo[j + 1] ^= mul(poli[j], EXP[i]);
    }
    poli = proximo;
  }
  return poli;
}

function correcao(dados: number[], quantidade: number): number[] {
  const g = gerador(quantidade);
  const resto = new Array<number>(quantidade).fill(0);
  for (const byte of dados) {
    const fator = byte ^ resto[0];
    resto.shift();
    resto.push(0);
    if (fator !== 0) {
      for (let i = 0; i < g.length - 1; i += 1) {
        resto[i] ^= mul(g[i + 1], fator);
      }
    }
  }
  return resto;
}

// ===== BCH das areas de formato e versao =====

function bch(dado: number, gerador: number, bitsTotais: number, bitsDado: number): number {
  let valor = dado << (bitsTotais - bitsDado);
  const grauGerador = 32 - Math.clz32(gerador);
  while (32 - Math.clz32(valor) >= grauGerador) {
    valor ^= gerador << (32 - Math.clz32(valor) - grauGerador);
  }
  return (dado << (bitsTotais - bitsDado)) | valor;
}

// ===== montagem =====

function menorVersao(tamanho: number): number {
  for (let v = 1; v <= 10; v += 1) {
    const [, , g1, d1, g2, d2] = BLOCOS_L[v];
    const capacidade = g1 * d1 + g2 * d2;
    const cabecalho = v >= 10 ? 2 : 1; // bytes do modo + contador
    if (tamanho + cabecalho + 1 <= capacidade) return v;
  }
  throw new Error('Conteudo grande demais para o QR do mock (limite: versao 10, nivel L)');
}

function bitsDeDados(texto: string, versao: number): number[] {
  const bytes = Array.from(new TextEncoder().encode(texto));
  const [, , g1, d1, g2, d2] = BLOCOS_L[versao];
  const capacidade = g1 * d1 + g2 * d2;
  const bits: number[] = [];
  const empilhar = (valor: number, quantidade: number) => {
    for (let i = quantidade - 1; i >= 0; i -= 1) bits.push((valor >> i) & 1);
  };

  empilhar(0b0100, 4); // modo byte
  empilhar(bytes.length, versao >= 10 ? 16 : 8);
  for (const b of bytes) empilhar(b, 8);

  const maximoBits = capacidade * 8;
  empilhar(0, Math.min(4, maximoBits - bits.length)); // terminador
  while (bits.length % 8 !== 0) bits.push(0);

  const preenchimento = [0xec, 0x11];
  let i = 0;
  while (bits.length < maximoBits) {
    empilhar(preenchimento[i % 2], 8);
    i += 1;
  }
  return bits;
}

function codewordsFinais(texto: string, versao: number): number[] {
  const bits = bitsDeDados(texto, versao);
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    bytes.push(byte);
  }

  const [, ecPorBloco, g1, d1, g2, d2] = BLOCOS_L[versao];
  const blocosDados: number[][] = [];
  const blocosEc: number[][] = [];
  let cursor = 0;
  for (let b = 0; b < g1; b += 1) {
    const bloco = bytes.slice(cursor, cursor + d1);
    cursor += d1;
    blocosDados.push(bloco);
    blocosEc.push(correcao(bloco, ecPorBloco));
  }
  for (let b = 0; b < g2; b += 1) {
    const bloco = bytes.slice(cursor, cursor + d2);
    cursor += d2;
    blocosDados.push(bloco);
    blocosEc.push(correcao(bloco, ecPorBloco));
  }

  // Intercalacao: byte a byte entre os blocos, dados primeiro, depois a correcao.
  const saida: number[] = [];
  const maiorDados = Math.max(...blocosDados.map((b) => b.length));
  for (let i = 0; i < maiorDados; i += 1) {
    for (const bloco of blocosDados) if (i < bloco.length) saida.push(bloco[i]);
  }
  for (let i = 0; i < ecPorBloco; i += 1) {
    for (const bloco of blocosEc) saida.push(bloco[i]);
  }
  return saida;
}

type Matriz = (0 | 1 | null)[][];

function esqueleto(versao: number): { matriz: Matriz; reservado: boolean[][] } {
  const lado = versao * 4 + 17;
  const matriz: Matriz = Array.from({ length: lado }, () => new Array(lado).fill(null));
  const reservado: boolean[][] = Array.from({ length: lado }, () => new Array(lado).fill(false));

  const marcar = (x: number, y: number, valor: 0 | 1) => {
    matriz[y][x] = valor;
    reservado[y][x] = true;
  };

  // Localizadores e separadores.
  const localizador = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const px = ox + x;
        const py = oy + y;
        if (px < 0 || py < 0 || px >= lado || py >= lado) continue;
        const borda = x >= 0 && x <= 6 && (y === 0 || y === 6);
        const lateral = y >= 0 && y <= 6 && (x === 0 || x === 6);
        const miolo = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        marcar(px, py, borda || lateral || miolo ? 1 : 0);
      }
    }
  };
  localizador(0, 0);
  localizador(lado - 7, 0);
  localizador(0, lado - 7);

  // Padroes de alinhamento, exceto onde colidem com os localizadores.
  const centros = ALINHAMENTO[versao];
  for (const cy of centros) {
    for (const cx of centros) {
      const perto =
        (cx <= 8 && cy <= 8) || (cx >= lado - 9 && cy <= 8) || (cx <= 8 && cy >= lado - 9);
      if (perto) continue;
      for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) {
          const anel = Math.max(Math.abs(x), Math.abs(y));
          marcar(cx + x, cy + y, anel === 1 ? 0 : 1);
        }
      }
    }
  }

  // Linhas de tempo.
  for (let i = 8; i < lado - 8; i += 1) {
    const valor: 0 | 1 = i % 2 === 0 ? 1 : 0;
    marcar(i, 6, valor);
    marcar(6, i, valor);
  }

  // Modulo escuro fixo.
  marcar(8, lado - 8, 1);

  // Areas reservadas de formato e versao (preenchidas depois).
  for (let i = 0; i < 9; i += 1) {
    if (!reservado[8][i]) reservado[8][i] = true;
    if (!reservado[i][8]) reservado[i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    reservado[8][lado - 1 - i] = true;
    reservado[lado - 1 - i][8] = true;
  }
  if (versao >= 7) {
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        reservado[y][lado - 11 + x] = true;
        reservado[lado - 11 + x][y] = true;
      }
    }
  }

  return { matriz, reservado };
}

function preencherDados(matriz: Matriz, reservado: boolean[][], codewords: number[]): void {
  const lado = matriz.length;
  let bit = 0;
  const proximoBit = (): 0 | 1 => {
    const indice = bit >> 3;
    const deslocamento = 7 - (bit % 8);
    bit += 1;
    if (indice >= codewords.length) return 0;
    return ((codewords[indice] >> deslocamento) & 1) as 0 | 1;
  };

  let subindo = true;
  for (let coluna = lado - 1; coluna > 0; coluna -= 2) {
    const c = coluna === 6 ? coluna - 1 : coluna; // a coluna 6 é linha de tempo
    for (let passo = 0; passo < lado; passo += 1) {
      const y = subindo ? lado - 1 - passo : passo;
      for (const x of [c, c - 1]) {
        if (reservado[y][x]) continue;
        matriz[y][x] = proximoBit();
      }
    }
    subindo = !subindo;
  }
}

const MASCARAS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function penalidade(m: number[][]): number {
  const lado = m.length;
  let total = 0;

  // Regra 1: sequencias de 5 ou mais.
  const linha = (get: (i: number, j: number) => number) => {
    for (let i = 0; i < lado; i += 1) {
      let corrente = get(i, 0);
      let repeticoes = 1;
      for (let j = 1; j < lado; j += 1) {
        const valor = get(i, j);
        if (valor === corrente) {
          repeticoes += 1;
        } else {
          if (repeticoes >= 5) total += 3 + (repeticoes - 5);
          corrente = valor;
          repeticoes = 1;
        }
      }
      if (repeticoes >= 5) total += 3 + (repeticoes - 5);
    }
  };
  linha((i, j) => m[i][j]);
  linha((i, j) => m[j][i]);

  // Regra 2: blocos 2x2 da mesma cor.
  for (let y = 0; y < lado - 1; y += 1) {
    for (let x = 0; x < lado - 1; x += 1) {
      const v = m[y][x];
      if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) total += 3;
    }
  }

  // Regra 3: ocorrencias do padrao 1011101, que o leitor confunde com um localizador.
  // A verificacao dos quatro modulos claros ao lado fica de fora: a penalidade so escolhe
  // entre mascaras, e qualquer uma delas produz um QR valido.
  const alvo = [1, 0, 1, 1, 1, 0, 1];
  const combina = (seq: number[]) => alvo.every((v, i) => seq[i] === v);
  for (let i = 0; i < lado; i += 1) {
    for (let j = 0; j < lado - 6; j += 1) {
      if (combina(m[i].slice(j, j + 7))) total += 40;
      if (combina(Array.from({ length: 7 }, (_, k) => m[j + k][i]))) total += 40;
    }
  }

  // Regra 4: desvio da proporcao de modulos escuros.
  let escuros = 0;
  for (const l of m) for (const v of l) escuros += v;
  const proporcao = (escuros * 100) / (lado * lado);
  total += Math.floor(Math.abs(proporcao - 50) / 5) * 10;

  return total;
}

// Nivel L = 01; BCH(15,5) com gerador 0x537 e mascara final 0x5412.
function formatoDeMascara(mascara: number): number {
  return (bch((0b01 << 3) | mascara, 0x537, 15, 5) ^ 0x5412) & 0x7fff;
}

function aplicarFormato(m: number[][], mascara: number): void {
  const lado = m.length;
  const formato = formatoDeMascara(mascara);
  const bit = (i: number) => (formato >> i) & 1;

  for (let i = 0; i <= 5; i += 1) m[8][i] = bit(i);
  m[8][7] = bit(6);
  m[8][8] = bit(7);
  m[7][8] = bit(8);
  for (let i = 9; i <= 14; i += 1) m[14 - i][8] = bit(i);

  for (let i = 0; i <= 7; i += 1) m[lado - 1 - i][8] = bit(i);
  for (let i = 8; i <= 14; i += 1) m[8][lado - 15 + i] = bit(i);
}

function aplicarVersao(m: number[][], versao: number): void {
  if (versao < 7) return;
  const lado = m.length;
  const info = bch(versao, 0x1f25, 18, 6);
  for (let i = 0; i < 18; i += 1) {
    const b = (info >> i) & 1;
    const x = Math.floor(i / 3);
    const y = (i % 3) + lado - 11;
    m[x][y] = b;
    m[y][x] = b;
  }
}

/** Matriz final do QR (1 = modulo escuro), ja mascarada e com formato e versao. */
export function qrMatriz(conteudo: string): number[][] {
  return montar(conteudo).matriz;
}

/** Peças internas expostas só para os testes conferirem contra o padrão. */
export const __internos = { correcao, formatoDeMascara, esqueleto };

/**
 * Gera o QR do conteudo e devolve uma data URL de SVG, pronta para `<img src>`.
 * Nivel de correcao L, modo byte, versoes 1 a 10.
 */
function montar(conteudo: string): { matriz: number[][]; versao: number } {
  const versao = menorVersao(new TextEncoder().encode(conteudo).length);
  const codewords = codewordsFinais(conteudo, versao);
  const { matriz, reservado } = esqueleto(versao);
  preencherDados(matriz, reservado, codewords);

  let melhor: number[][] | null = null;
  let melhorNota = Infinity;
  for (let mascara = 0; mascara < 8; mascara += 1) {
    const candidato = matriz.map((linha, y) =>
      linha.map((valor, x) => {
        const base = (valor ?? 0) as number;
        return reservado[y][x] ? base : base ^ (MASCARAS[mascara](x, y) ? 1 : 0);
      }),
    );
    aplicarFormato(candidato, mascara);
    aplicarVersao(candidato, versao);
    const nota = penalidade(candidato);
    if (nota < melhorNota) {
      melhorNota = nota;
      melhor = candidato;
    }
  }
  return { matriz: melhor as number[][], versao };
}

export function qrDataUrl(conteudo: string): string {
  const m = montar(conteudo).matriz;
  const lado = m.length;
  const margem = 4;
  const total = lado + margem * 2;
  let caminho = '';
  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      if (m[y][x]) caminho += `M${x + margem} ${y + margem}h1v1h-1z`;
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#fff"/>` +
    `<path d="${caminho}" fill="#0b1a2b"/>` +
    '</svg>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

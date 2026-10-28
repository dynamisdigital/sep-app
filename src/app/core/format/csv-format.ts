/**
 * SEP — Frontend
 *
 * Frontend Security Architecture: CSV Sanitization & Hardening
 * Mitigacao contra CSV / Formula Injection (CWE-1236 / OWASP)
 *
 * Aplicacoes financeiras exportam relatorios operacionais em formato CSV para analise
 * em planilhas eletronicas (Microsoft Excel, LibreOffice Calc, Google Sheets).
 *
 * Se uma celula comecar com '=', '+', '-', '@', '\t' ou '\r', programas de planilha
 * interpretam o conteudo como comando ou formula dinamica (ex: DDE, HYPERLINK, cmd|' /C...').
 *
 * Para neutralizar a execucao maliciosa sem corromper a legibilidade dos dados:
 * 1. Celulas que comecem com esses caracteres recebem o prefixo de apostrofo `'`, que forca
 *    a planilha a tratar o valor como texto literal seguro.
 * 2. Aspas duplas `"` internas sao escapadas como `""`.
 * 3. A celula e envolvida por aspas duplas `"..."`.
 */

export function formatarCelulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '""';
  }

  let texto = String(valor);

  // Sanitizacao contra CSV / Formula Injection (CWE-1236)
  if (/^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

export function gerarLinhaCsv(colunas: unknown[], delimitador = ';'): string {
  return colunas.map((coluna) => formatarCelulaCsv(coluna)).join(delimitador);
}

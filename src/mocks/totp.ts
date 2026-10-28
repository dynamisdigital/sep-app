// TOTP (RFC 6238) do dev-offline, para o Mockup 34 poder ser testado com um aplicativo
// autenticador de verdade. Em producao quem gera e valida o codigo e o backend; aqui o
// mock so precisa aceitar o mesmo numero que o celular mostra.
//
// SHA-1, 6 digitos, janela de 30 segundos — os parametros que a URI `otpauth://` declara
// e que Google Authenticator, Authy e 1Password usam por padrao.

const ALFABETO_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const TOTP_DIGITOS = 6;
export const TOTP_PERIODO_SEGUNDOS = 30;

function base32ParaBytes(base32: string): Uint8Array {
  const limpo = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let acumulado = 0;
  const saida: number[] = [];
  for (const caractere of limpo) {
    const valor = ALFABETO_BASE32.indexOf(caractere);
    if (valor < 0) throw new Error(`Caractere fora do alfabeto Base32: ${caractere}`);
    acumulado = (acumulado << 5) | valor;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      saida.push((acumulado >> bits) & 0xff);
    }
  }
  return new Uint8Array(saida);
}

// Contador de 8 bytes, big-endian, como o RFC pede.
function contadorParaBytes(contador: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let restante = contador;
  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = restante & 0xff;
    restante = Math.floor(restante / 256);
  }
  return bytes;
}

/** Gera o codigo TOTP de um segredo Base32 para um instante (em milissegundos). */
export async function gerarCodigoTotp(
  segredoBase32: string,
  agoraMs = Date.now(),
): Promise<string> {
  const contador = Math.floor(agoraMs / 1000 / TOTP_PERIODO_SEGUNDOS);
  const chave = await crypto.subtle.importKey(
    'raw',
    base32ParaBytes(segredoBase32) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign('HMAC', chave, contadorParaBytes(contador) as unknown as BufferSource),
  );
  // Truncamento dinamico: os 4 bits finais apontam onde comeca o numero.
  const deslocamento = assinatura[assinatura.length - 1] & 0x0f;
  const binario =
    ((assinatura[deslocamento] & 0x7f) << 24) |
    (assinatura[deslocamento + 1] << 16) |
    (assinatura[deslocamento + 2] << 8) |
    assinatura[deslocamento + 3];
  return String(binario % 10 ** TOTP_DIGITOS).padStart(TOTP_DIGITOS, '0');
}

/**
 * Confere um codigo aceitando a janela atual e uma para cada lado, que e a tolerancia
 * usual para relogios levemente fora de sincronia.
 */
export async function codigoTotpValido(
  segredoBase32: string,
  codigo: string,
  agoraMs = Date.now(),
): Promise<boolean> {
  const informado = codigo.trim();
  if (!/^\d{6}$/.test(informado)) return false;
  for (const passo of [-1, 0, 1]) {
    const esperado = await gerarCodigoTotp(
      segredoBase32,
      agoraMs + passo * TOTP_PERIODO_SEGUNDOS * 1000,
    );
    if (esperado === informado) return true;
  }
  return false;
}

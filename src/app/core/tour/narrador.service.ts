import { Injectable, signal } from '@angular/core';

const CHAVE_VOZ = 'SEP_TOUR_NARRACAO';

/**
 * Narracao dos tours assistidos pela sintese de voz do proprio navegador (Web Speech API).
 *
 * Nao depende de servico externo nem de arquivo de audio: a voz e a do sistema operacional
 * (no Windows, "Microsoft Maria" ou "Francisca"; no Chrome, "Google portugues do Brasil"). A
 * qualidade varia por maquina — por isso a narracao e opcional e o texto sempre aparece no cartao.
 */
@Injectable({ providedIn: 'root' })
export class NarradorService {
  readonly disponivel = typeof window !== 'undefined' && 'speechSynthesis' in window;
  readonly ativo = signal(this.disponivel && lerPreferencia());
  readonly falando = signal(false);

  private voz: SpeechSynthesisVoice | null = null;

  constructor() {
    if (!this.disponivel) return;
    this.escolherVoz();
    // As vozes chegam depois do primeiro acesso em Chrome e Edge.
    window.speechSynthesis.addEventListener?.('voiceschanged', () => this.escolherVoz());
  }

  alternar(): void {
    const proximo = !this.ativo();
    this.ativo.set(proximo);
    try {
      window.localStorage.setItem(CHAVE_VOZ, String(proximo));
    } catch {
      // Preferencia de conveniencia: sem storage, vale so nesta sessao.
    }
    if (!proximo) this.parar();
  }

  /** Fala o texto e resolve quando termina. Com a narracao desligada, resolve na hora. */
  falar(texto: string, velocidade = 1): Promise<void> {
    if (!this.disponivel || !this.ativo()) return Promise.resolve();
    this.parar();
    return new Promise((resolve) => {
      const fala = new SpeechSynthesisUtterance(texto);
      fala.lang = 'pt-BR';
      fala.rate = Math.min(1.8, 1.02 * velocidade);
      if (this.voz) fala.voice = this.voz;
      // Sem voz instalada (ou com o motor travado) o `onend` nunca chega: o prazo evita que o
      // roteiro fique esperando uma fala que nao vai terminar.
      let terminou = false;
      let prazo = 0;
      const fim = () => {
        if (terminou) return;
        terminou = true;
        window.clearTimeout(prazo);
        this.falando.set(false);
        resolve();
      };
      prazo = window.setTimeout(fim, 1500 + (texto.length * 90) / fala.rate);
      fala.onend = fim;
      fala.onerror = fim;
      this.falando.set(true);
      window.speechSynthesis.speak(fala);
    });
  }

  parar(): void {
    if (!this.disponivel) return;
    window.speechSynthesis.cancel();
    this.falando.set(false);
  }

  private escolherVoz(): void {
    const vozes = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('pt'));
    const preferida = vozes.find((v) => /pt-BR/i.test(v.lang) && /natural|online/i.test(v.name));
    this.voz = preferida ?? vozes.find((v) => /pt-BR/i.test(v.lang)) ?? vozes[0] ?? null;
  }
}

function lerPreferencia(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_VOZ) !== 'false';
  } catch {
    return true;
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

type Estado = 'parado' | 'falando' | 'pausado';

const VELOCIDADES = [0.9, 1, 1.15, 1.3] as const;

/**
 * Leitura em áudio de um texto do blog, pela voz do próprio navegador (Web Speech API): não depende de
 * serviço externo nem de arquivo de áudio, e nada do que o leitor ouve sai do aparelho dele. A qualidade da
 * voz varia por aparelho; por isso o texto continua inteiro na tela e o recurso some, com uma explicação,
 * onde o navegador não tem voz. Nunca começa sozinho: só depois do clique em "Ouvir".
 */
@Component({
  selector: 'sep-ouvir-texto',
  imports: [LucideAngularModule],
  templateUrl: './ouvir-texto.component.html',
  styleUrl: './ouvir-texto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OuvirTextoComponent {
  /** Segmentos curtos, na ordem em que serão lidos (ver `textoParaLeitura`). */
  readonly segmentos = input.required<string[]>();

  protected readonly disponivel =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  protected readonly estado = signal<Estado>('parado');
  protected readonly indice = signal(0);
  protected readonly velocidades = VELOCIDADES;
  protected readonly velocidade = signal<number>(1);

  protected readonly progresso = computed(() => {
    const total = this.segmentos().length;
    return total ? Math.min(100, Math.round((this.indice() / total) * 100)) : 0;
  });

  /** Incrementa a cada início de leitura; descarta eventos de uma fala que já foi cancelada. */
  private geracao = 0;
  private voz: SpeechSynthesisVoice | null = null;

  constructor() {
    if (this.disponivel) {
      this.escolherVoz();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.escolherVoz());
    }
    // Outro texto (ou a saída da página) interrompe a leitura: nunca fica voz falando por cima de nada.
    effect(() => {
      this.segmentos();
      this.parar();
    });
    inject(DestroyRef).onDestroy(() => this.parar());
  }

  protected ouvir(): void {
    if (!this.disponivel) return;
    this.cancelar();
    this.indice.set(0);
    this.estado.set('falando');
    this.falarDe(this.indice(), ++this.geracao);
  }

  protected pausar(): void {
    if (this.estado() !== 'falando') return;
    window.speechSynthesis.pause();
    this.estado.set('pausado');
  }

  protected continuar(): void {
    if (this.estado() !== 'pausado') return;
    window.speechSynthesis.resume();
    this.estado.set('falando');
  }

  protected parar(): void {
    this.geracao++;
    this.cancelar();
    this.estado.set('parado');
    this.indice.set(0);
  }

  protected mudarVelocidade(valor: string): void {
    this.velocidade.set(Number(valor));
    // A nova velocidade vale já: relê o trecho atual nela.
    if (this.estado() === 'falando') {
      this.cancelar();
      this.falarDe(this.indice(), ++this.geracao);
    }
  }

  private cancelar(): void {
    // O navegador pode perder a voz entre uma chamada e outra (aba em segundo plano, teste): não quebra.
    if (this.disponivel) window.speechSynthesis?.cancel?.();
  }

  private falarDe(posicao: number, geracao: number): void {
    const lista = this.segmentos();
    if (geracao !== this.geracao) return;
    if (posicao >= lista.length) {
      this.estado.set('parado');
      this.indice.set(0);
      return;
    }
    this.indice.set(posicao);
    const fala = new SpeechSynthesisUtterance(lista[posicao]);
    fala.lang = 'pt-BR';
    fala.rate = this.velocidade();
    if (this.voz) fala.voice = this.voz;
    const proximo = () => this.falarDe(posicao + 1, geracao);
    fala.onend = proximo;
    // Um erro de voz pula o trecho, mas um cancelamento proposital (pausa, parar) não deve avançar.
    fala.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      proximo();
    };
    window.speechSynthesis.speak(fala);
  }

  private escolherVoz(): void {
    const vozes = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('pt'));
    const preferida = vozes.find((v) => /pt-BR/i.test(v.lang) && /natural|online/i.test(v.name));
    this.voz = preferida ?? vozes.find((v) => /pt-BR/i.test(v.lang)) ?? vozes[0] ?? null;
  }
}

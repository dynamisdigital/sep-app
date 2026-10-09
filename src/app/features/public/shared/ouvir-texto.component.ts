import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import {
  caracteresLidos,
  extrairItens,
  faixaLida,
  mapearTexto,
  ParteLeitura,
  partesDe,
} from './leitura-sincronizada';
import { escolherVoz, VozEscolhida } from './voz-pt-br';

type Estado = 'parado' | 'falando' | 'pausado';

const VELOCIDADES = [0.9, 1, 1.15, 1.3] as const;
const NOME_DESTAQUE = 'sep-lido';
/** Caracteres por segundo da voz a 1x, antes de os eventos da própria voz calibrarem o ritmo. */
const RITMO_INICIAL = 14.5;

/**
 * Leitura em áudio sincronizada de um texto do blog. A voz é a do próprio navegador (Web Speech API), e a
 * parte já lida fica destacada na própria página, no ritmo da fala, com uma tarja sobre o bloco em leitura e a
 * rolagem acompanhando. Como no leitor do projeto Ponte de Liquidez, o ritmo vem dos eventos de fronteira da
 * voz; sem eles (vozes online), vale uma estimativa que se recalibra a cada evento.
 *
 * O destaque usa a API de destaque de texto do navegador, que não mexe no DOM do Angular; onde ela não existe,
 * fica só a tarja. Nada começa sozinho: a leitura só inicia depois do clique em "Ouvir".
 */
@Component({
  selector: 'sep-ouvir-texto',
  imports: [LucideAngularModule],
  templateUrl: './ouvir-texto.component.html',
  styleUrl: './ouvir-texto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OuvirTextoComponent {
  /** Elemento que contém o texto a ser lido (o texto vem da própria página, não de uma cópia). */
  readonly escopo = input.required<HTMLElement | null>();
  /** Quais elementos do escopo são lidos, na ordem em que aparecem. */
  readonly seletor = input.required<string>();
  /** Identifica o texto; quando muda, a leitura em andamento é interrompida. */
  readonly chave = input<string>('');

  protected readonly disponivel =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  protected readonly estado = signal<Estado>('parado');
  protected readonly indice = signal(0);
  protected readonly total = signal(0);
  protected readonly velocidades = VELOCIDADES;
  protected readonly velocidade = signal<number>(1);
  protected readonly progresso = computed(() =>
    this.total() ? Math.min(100, Math.round((this.indice() / this.total()) * 100)) : 0,
  );

  private readonly tarja = viewChild<ElementRef<HTMLElement>>('tarja');

  private partes: ParteLeitura[] = [];
  /** Incrementa a cada início de leitura; descarta eventos de uma fala que já foi cancelada. */
  private geracao = 0;
  private voz: VozEscolhida = { voz: null, feminina: false };
  private quadroId = 0;
  private foco: HTMLElement | null = null;
  private lidoAte = -1;
  private destaque: Highlight | null = null;

  /** Andamento do trecho em fala: posição conhecida (`base`, em caracteres) e o instante em que foi medida. */
  private ritmo = {
    parte: null as ParteLeitura | null,
    inicio: 0,
    base: 0,
    medidoEm: 0,
    vel: RITMO_INICIAL,
    tamanho: 1,
  };

  private readonly suportaDestaque =
    typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

  constructor() {
    if (this.disponivel) {
      this.carregarVoz();
      window.speechSynthesis.addEventListener?.('voiceschanged', () => this.carregarVoz());
    }
    // Outro texto (ou a saída da página) interrompe a leitura: nunca fica voz falando por cima de nada.
    effect(() => {
      this.chave();
      this.parar();
    });
    inject(DestroyRef).onDestroy(() => this.parar());
  }

  protected ouvir(): void {
    const escopo = this.escopo();
    if (!this.disponivel || !escopo) return;
    this.partes = partesDe(extrairItens(escopo, this.seletor()));
    if (!this.partes.length) return;
    this.cancelarVoz();
    this.limparMarcas();
    this.total.set(this.partes.length);
    this.indice.set(0);
    this.estado.set('falando');
    this.iniciarQuadro();
    this.falarDe(0, ++this.geracao);
  }

  protected pausar(): void {
    if (this.estado() !== 'falando') return;
    // Congela a posição estimada: ao continuar, a contagem parte dela.
    this.ritmo.base = this.posicaoEstimada();
    window.speechSynthesis.pause();
    this.estado.set('pausado');
  }

  protected continuar(): void {
    if (this.estado() !== 'pausado') return;
    this.ritmo.medidoEm = performance.now();
    window.speechSynthesis.resume();
    this.estado.set('falando');
  }

  protected parar(): void {
    this.geracao++;
    this.cancelarVoz();
    this.cancelarQuadro();
    this.limparMarcas();
    this.estado.set('parado');
    this.indice.set(0);
  }

  protected mudarVelocidade(valor: string): void {
    this.velocidade.set(Number(valor));
    // A nova velocidade vale já: relê o trecho atual nela.
    if (this.estado() === 'falando') {
      this.cancelarVoz();
      this.falarDe(this.indice(), ++this.geracao);
    }
  }

  private falarDe(posicao: number, geracao: number): void {
    if (geracao !== this.geracao) return;
    if (posicao >= this.partes.length) {
      this.concluir();
      return;
    }
    const parte = this.partes[posicao];
    this.indice.set(posicao);
    if (parte.el !== this.foco) this.focar(parte.el);

    const agora = performance.now();
    this.ritmo = {
      parte,
      inicio: agora,
      base: 0,
      medidoEm: agora,
      vel: RITMO_INICIAL * 1.02 * this.velocidade(),
      tamanho: Math.max(1, parte.texto.length),
    };
    this.marcar(parte, 0);

    const fala = new SpeechSynthesisUtterance(parte.texto);
    fala.lang = 'pt-BR';
    fala.rate = Math.min(1.8, 1.02 * this.velocidade());
    if (this.voz.voz) {
      fala.voice = this.voz.voz;
      fala.lang = this.voz.voz.lang;
    }
    if (!this.voz.feminina) fala.pitch = 1.25;
    // O ritmo vem das fronteiras de palavra: cada uma diz onde a voz está e recalibra a estimativa.
    fala.onboundary = (e) => {
      if (geracao !== this.geracao) return;
      const t = performance.now();
      const ci = e.charIndex || 0;
      if (ci > 8 && t > this.ritmo.inicio) {
        this.ritmo.vel = Math.max(6, Math.min(40, ci / ((t - this.ritmo.inicio) / 1000)));
      }
      this.ritmo.base = ci;
      this.ritmo.medidoEm = t;
    };
    fala.onend = () => {
      if (geracao !== this.geracao) return;
      this.marcar(parte, parte.texto.length);
      this.falarDe(posicao + 1, geracao);
    };
    // Um erro de voz pula o trecho, mas um cancelamento proposital (pausa, parar) não deve avançar.
    fala.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      this.falarDe(posicao + 1, geracao);
    };
    window.speechSynthesis.speak(fala);
  }

  private concluir(): void {
    this.cancelarQuadro();
    this.limparMarcas();
    this.estado.set('parado');
    this.indice.set(0);
  }

  // ============ Marcação na página ============

  /** O bloco em leitura recebe a tarja, e a página rola para mantê-lo à vista. */
  private focar(el: HTMLElement): void {
    this.foco = el;
    this.lidoAte = -1;
    this.manterAVista(el);
  }

  private manterAVista(el: HTMLElement): void {
    const q = el.getBoundingClientRect();
    const altura = document.documentElement.clientHeight;
    if (q.top >= 90 && q.bottom <= altura - 24) return;
    const semMovimento =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const alvo = q.top + window.scrollY - (q.height < altura - 220 ? (altura - q.height) / 2 : 100);
    window.scrollTo({ top: Math.max(0, alvo), behavior: semMovimento ? 'auto' : 'smooth' });
  }

  /** Destaca, dentro do bloco do trecho, o que a voz já leu: `falados` caracteres do texto falado do trecho. */
  private marcar(parte: ParteLeitura, falados: number): void {
    const total = mapearTexto(parte.el).texto.length;
    const n = caracteresLidos(parte, falados, total);
    if (n === this.lidoAte) return;
    this.lidoAte = n;
    if (!this.suportaDestaque) return;
    if (!this.destaque) {
      this.destaque = new Highlight();
      CSS.highlights.set(NOME_DESTAQUE, this.destaque);
    }
    this.destaque.clear();
    const faixa = faixaLida(parte.el, n);
    if (faixa) this.destaque.add(faixa);
  }

  private posicaoEstimada(): number {
    const r = this.ritmo;
    const decorrido = (performance.now() - r.medidoEm) / 1000;
    return Math.min(r.tamanho * 0.985, r.base + decorrido * r.vel);
  }

  private iniciarQuadro(): void {
    this.cancelarQuadro();
    const quadro = () => {
      if (this.estado() === 'parado') return;
      this.posicionarTarja();
      if (this.estado() === 'falando' && this.ritmo.parte) {
        this.marcar(this.ritmo.parte, this.posicaoEstimada());
      }
      this.quadroId = requestAnimationFrame(quadro);
    };
    this.quadroId = requestAnimationFrame(quadro);
  }

  private cancelarQuadro(): void {
    cancelAnimationFrame(this.quadroId);
    this.quadroId = 0;
  }

  /** A tarja acompanha o bloco lido, inclusive enquanto a página rola. */
  private posicionarTarja(): void {
    const tarja = this.tarja()?.nativeElement;
    if (!tarja) return;
    const q = this.foco?.getBoundingClientRect();
    if (!q || !q.width || !q.height) {
      tarja.hidden = true;
      return;
    }
    const lado = q.height > 90 ? 2 : 8;
    const topo = q.top - 5;
    const esquerda = q.left - lado;
    tarja.style.top = `${topo}px`;
    tarja.style.left = `${esquerda}px`;
    tarja.style.width = `${q.width + 2 * lado}px`;
    tarja.style.height = `${q.height + 10}px`;
    tarja.hidden = false;
    // O contêiner do conteúdo do site usa contenção de layout, e com ela `position: fixed` deixa de ser
    // relativo à janela. Mede onde a tarja foi parar e corrige a diferença, para ela cobrir o bloco lido.
    const onde = tarja.getBoundingClientRect();
    const dy = topo - onde.top;
    const dx = esquerda - onde.left;
    if (Math.abs(dy) > 0.5 || Math.abs(dx) > 0.5) {
      tarja.style.top = `${topo + dy}px`;
      tarja.style.left = `${esquerda + dx}px`;
    }
  }

  private limparMarcas(): void {
    this.foco = null;
    this.lidoAte = -1;
    this.ritmo.parte = null;
    if (this.suportaDestaque) CSS.highlights.delete(NOME_DESTAQUE);
    this.destaque = null;
    const tarja = this.tarja()?.nativeElement;
    if (tarja) tarja.hidden = true;
  }

  private cancelarVoz(): void {
    // O navegador pode perder a voz entre uma chamada e outra (aba em segundo plano, teste): não quebra.
    if (this.disponivel) window.speechSynthesis?.cancel?.();
  }

  private carregarVoz(): void {
    this.voz = escolherVoz(window.speechSynthesis.getVoices());
  }
}

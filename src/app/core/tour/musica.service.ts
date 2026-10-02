import { Injectable, effect, inject, signal } from '@angular/core';

import { NarradorService } from './narrador.service';

const CHAVE_MUSICA = 'SEP_TOUR_MUSICA';
/** Faixa opcional: se existir, toca no lugar do piano sintetizado (precisa ser licenciada). */
const ARQUIVO_FAIXA = '/audio/tour-fundo.mp3';

// Volumes do barramento principal, medidos na saida: ~-31 dBFS sem fala (trilha de fundo, abaixo
// da voz) e ~-41 dBFS durante a narracao. Em 0.2 ficava em -50 dBFS, quase inaudivel; em 1.1, o
// usuario pediu um pouco mais.
const NIVEL_NORMAL = 1.7;
const NIVEL_NA_FALA = 0.55;

// ============ ARRANJO ============
// Oito compassos em Do maior, andamento de balada (76 bpm) com colcheias em swing:
// Dm9 | G13 | Cmaj9 | Am9 | Dm9 | G13 | Fmaj7 | E7(b9) — um ii-V-I com retorno pelo relativo.

interface Acorde {
  baixo: number;
  /** Notas da mao esquerda (voicing sem fundamental, como no piano de jazz). */
  voicing: number[];
  terca: number;
}

const ACORDES: Acorde[] = [
  { baixo: 38, voicing: [53, 57, 60, 64], terca: 3 },
  { baixo: 43, voicing: [53, 59, 64], terca: 4 },
  { baixo: 36, voicing: [52, 55, 59, 62], terca: 4 },
  { baixo: 45, voicing: [55, 59, 60, 64], terca: 3 },
  { baixo: 38, voicing: [53, 57, 60, 64], terca: 3 },
  { baixo: 43, voicing: [53, 59, 64], terca: 4 },
  { baixo: 41, voicing: [57, 60, 64], terca: 4 },
  { baixo: 40, voicing: [56, 62, 65], terca: 4 },
];

const BPM = 76;
const SWING = 0.64;
const ANTECEDENCIA_S = 0.35;

function frequencia(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Musica de fundo dos tours: jazz ao piano, instrumental, gerado na hora pela Web Audio API
 * (sem faixa de terceiros, sem licenca). Abaixa sozinha enquanto a narracao fala e volta devagar
 * quando ela termina.
 */
@Injectable({ providedIn: 'root' })
export class MusicaService {
  private readonly narrador = inject(NarradorService);

  readonly disponivel = typeof window !== 'undefined' && 'AudioContext' in window;
  readonly ativa = signal(this.disponivel && lerPreferencia());
  readonly tocando = signal(false);
  /** Nivel-alvo do barramento, exposto para a tela e para os testes. */
  readonly nivel = signal(0);

  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private seco: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private faixa: HTMLAudioElement | null = null;
  private relogio = 0;
  private proximoCompasso = 0;
  private compasso = 0;

  constructor() {
    // Ducking: cada fala abaixa a musica; o silencio a traz de volta, mais devagar.
    effect(() => {
      const falando = this.narrador.falando();
      if (this.tocando()) this.rampa(falando ? NIVEL_NA_FALA : NIVEL_NORMAL, falando ? 0.35 : 1.4);
    });
  }

  alternar(): void {
    const proximo = !this.ativa();
    this.ativa.set(proximo);
    try {
      window.localStorage.setItem(CHAVE_MUSICA, String(proximo));
    } catch {
      // Preferencia de conveniencia.
    }
    if (proximo) this.tocar();
    else this.parar();
  }

  /** Precisa ser chamado a partir de um clique: o navegador so libera audio apos um gesto. */
  tocar(): void {
    if (!this.disponivel || !this.ativa() || this.tocando()) return;
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    this.montarBarramento();
    this.tocando.set(true);
    this.rampa(this.narrador.falando() ? NIVEL_NA_FALA : NIVEL_NORMAL, 2.2);
    void this.escolherFonte();
  }

  /** Esmaece e para. */
  parar(): void {
    if (!this.tocando() || !this.ctx) return;
    this.tocando.set(false);
    this.rampa(0, 1.2);
    window.clearInterval(this.relogio);
    const faixa = this.faixa;
    window.setTimeout(() => faixa?.pause(), 1300);
  }

  // ============ BARRAMENTO ============

  private montarBarramento(): void {
    if (this.mestre || !this.ctx) return;
    const ctx = this.ctx;
    this.mestre = ctx.createGain();
    this.mestre.gain.value = 0;
    // Grave e agudo aparados: som macio, que fica atras da voz.
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 3200;
    this.mestre.connect(filtro).connect(ctx.destination);

    this.seco = ctx.createGain();
    this.seco.gain.value = 0.8;
    this.seco.connect(this.mestre);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = respostaDeSala(ctx, 2.6);
    const molhado = ctx.createGain();
    molhado.gain.value = 0.32;
    this.reverb.connect(molhado).connect(this.mestre);
  }

  private rampa(alvo: number, segundos: number): void {
    this.nivel.set(alvo);
    if (!this.ctx || !this.mestre) return;
    const agora = this.ctx.currentTime;
    const g = this.mestre.gain;
    g.cancelScheduledValues(agora);
    g.setValueAtTime(g.value, agora);
    g.linearRampToValueAtTime(alvo, agora + segundos);
  }

  private async escolherFonte(): Promise<void> {
    if (await existeFaixa()) {
      this.tocarFaixa();
      return;
    }
    this.proximoCompasso = (this.ctx?.currentTime ?? 0) + 0.15;
    this.compasso = 0;
    window.clearInterval(this.relogio);
    this.relogio = window.setInterval(() => this.agendar(), 100);
  }

  private tocarFaixa(): void {
    if (!this.ctx || !this.mestre) return;
    if (!this.faixa) {
      this.faixa = new Audio(ARQUIVO_FAIXA);
      this.faixa.loop = true;
      this.ctx.createMediaElementSource(this.faixa).connect(this.mestre);
    }
    void this.faixa.play();
  }

  // ============ PIANO SINTETIZADO ============

  /** Agenda os compassos que caem na janela de antecedencia (padrao de relogio da Web Audio). */
  private agendar(): void {
    if (!this.ctx || !this.tocando()) return;
    const duracao = (60 / BPM) * 4;
    while (this.proximoCompasso < this.ctx.currentTime + ANTECEDENCIA_S) {
      this.compassoEm(this.proximoCompasso, this.compasso);
      this.proximoCompasso += duracao;
      this.compasso = (this.compasso + 1) % ACORDES.length;
    }
  }

  private compassoEm(inicio: number, indice: number): void {
    const acorde = ACORDES[indice];
    const seguinte = ACORDES[(indice + 1) % ACORDES.length];
    const tempo = 60 / BPM;
    const colcheia = (n: number) =>
      inicio + Math.floor(n / 2) * tempo + (n % 2 ? SWING * tempo : 0);

    // Mao esquerda: ataque no 1 e antecipacao no "e" do 2, como no comping de balada.
    for (const nota of acorde.voicing) {
      this.piano(nota, colcheia(0) + Math.random() * 0.02, 2.6, 0.05);
      if (Math.random() < 0.7) this.piano(nota, colcheia(3), 1.6, 0.032);
    }

    // Baixo caminhando: fundamental, terca, quinta e aproximacao cromatica ao proximo acorde.
    const aproximacao = seguinte.baixo + (Math.random() < 0.5 ? -1 : 1);
    [acorde.baixo, acorde.baixo + acorde.terca, acorde.baixo + 7, aproximacao].forEach((nota, i) =>
      this.baixo(nota, inicio + i * tempo, tempo * 0.95),
    );

    // Melodia rarefeita: poucas notas do acorde uma oitava acima, para nao chamar atencao.
    for (let n = 2; n < 8; n += 1) {
      if (Math.random() < 0.22) {
        const nota = acorde.voicing[Math.floor(Math.random() * acorde.voicing.length)] + 12;
        this.piano(nota, colcheia(n), 1.4, 0.03);
      }
    }

    // Escovinha no 2 e no 4.
    this.escova(inicio + tempo);
    this.escova(inicio + tempo * 3);
  }

  /** Piano eletrico macio: fundamental, oitava fraca e harmonico de sino, com decaimento longo. */
  private piano(midi: number, quando: number, decaimento: number, ganho: number): void {
    if (!this.ctx || !this.seco || !this.reverb) return;
    const ctx = this.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, quando);
    env.gain.linearRampToValueAtTime(ganho, quando + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, quando + decaimento);
    env.connect(this.seco);
    env.connect(this.reverb);
    const f = frequencia(midi);
    for (const [mult, peso, tipo] of [
      [1, 1, 'sine'],
      [2, 0.28, 'sine'],
      [3.01, 0.06, 'triangle'],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = tipo;
      osc.frequency.value = f * mult;
      osc.detune.value = (Math.random() - 0.5) * 6;
      const g = ctx.createGain();
      g.gain.value = peso;
      osc.connect(g).connect(env);
      osc.start(quando);
      osc.stop(quando + decaimento + 0.05);
    }
  }

  private baixo(midi: number, quando: number, duracao: number): void {
    if (!this.ctx || !this.seco) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequencia(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, quando);
    env.gain.linearRampToValueAtTime(0.11, quando + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
    osc.connect(env).connect(this.seco);
    osc.start(quando);
    osc.stop(quando + duracao + 0.05);
  }

  private escova(quando: number): void {
    if (!this.ctx || !this.seco) return;
    const ctx = this.ctx;
    const ruido = ctx.createBufferSource();
    ruido.buffer = ruidoBranco(ctx, 0.25);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 5200;
    filtro.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, quando);
    env.gain.linearRampToValueAtTime(0.018, quando + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, quando + 0.22);
    ruido.connect(filtro).connect(env).connect(this.seco);
    ruido.start(quando);
    ruido.stop(quando + 0.25);
  }
}

// ============ UTILITARIOS DE AUDIO ============

const cacheRuido = new WeakMap<BaseAudioContext, AudioBuffer>();

function ruidoBranco(ctx: BaseAudioContext, segundos: number): AudioBuffer {
  const pronto = cacheRuido.get(ctx);
  if (pronto) return pronto;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * segundos), ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < dados.length; i += 1) dados[i] = Math.random() * 2 - 1;
  cacheRuido.set(ctx, buffer);
  return buffer;
}

/** Resposta de sala sintetica (ruido com decaimento exponencial): reverb sem arquivo. */
function respostaDeSala(ctx: BaseAudioContext, segundos: number): AudioBuffer {
  const tamanho = Math.ceil(ctx.sampleRate * segundos);
  const buffer = ctx.createBuffer(2, tamanho, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal += 1) {
    const dados = buffer.getChannelData(canal);
    for (let i = 0; i < tamanho; i += 1) {
      dados[i] = (Math.random() * 2 - 1) * (1 - i / tamanho) ** 3.2;
    }
  }
  return buffer;
}

async function existeFaixa(): Promise<boolean> {
  try {
    const resposta = await fetch(ARQUIVO_FAIXA, { method: 'HEAD' });
    const tipo = resposta.headers.get('content-type') ?? '';
    // O dev server devolve o index.html para caminho inexistente: so vale se for audio.
    return resposta.ok && tipo.startsWith('audio');
  } catch {
    return false;
  }
}

function lerPreferencia(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_MUSICA) !== 'false';
  } catch {
    return true;
  }
}

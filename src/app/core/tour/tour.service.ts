import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { ehAmbienteDemo } from '../env/ambiente';
import { MusicaService } from './musica.service';
import { NarradorService } from './narrador.service';
import { MODULOS_TOUR, MODULO_PADRAO, ROTEIROS } from './roteiros';
import { AlvoPasso, ContextoRoteiro, PassoRoteiro, Roteiro } from './tour.model';

export type EstadoTour = 'parado' | 'rodando' | 'pausado' | 'concluido' | 'interrompido';

export interface PosicaoCursor {
  x: number;
  y: number;
}

const CLASSE_ALVO = 'sep-tour-alvo';
const ESPERA_MAXIMA_MS = 12_000;

/**
 * Motor dos tours assistidos. Vive na raiz da aplicacao (o shell e recriado a cada tela), entao
 * o roteiro atravessa navegacoes sem perder o passo. Nao conhece nenhuma tela: so executa o que o
 * roteiro descreve — achar o alvo, rolar ate ele, mover o cursor, digitar, clicar e esperar.
 */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly narrador = inject(NarradorService);
  private readonly musica = inject(MusicaService);

  readonly roteiro = signal<Roteiro | null>(null);
  readonly passos = signal<PassoRoteiro[]>([]);
  readonly indice = signal(0);
  readonly estado = signal<EstadoTour>('parado');
  readonly mensagem = signal<string | null>(null);
  readonly elemento = signal<HTMLElement | null>(null);
  /**
   * Caixa do proximo alvo, publicada antes do destaque: o cartao de controle sai da frente
   * primeiro, e so depois a area acende.
   */
  readonly areaAlvo = signal<DOMRect | null>(null);
  readonly cursor = signal<PosicaoCursor | null>(null);
  readonly clicando = signal(false);
  /**
   * Escurecimento do fundo. So acende com o cursor ja no alvo; no comeco de cada passo apaga, para
   * a tela aparecer na luminosidade real enquanto o foco se desloca ou uma tela nova abre.
   */
  readonly focoAceso = signal(false);
  readonly digitando = signal(false);
  readonly velocidade = signal<1 | 1.5 | 2>(1);

  readonly ativo = computed(() => this.estado() !== 'parado');
  readonly passoAtual = computed(() => this.passos()[this.indice()] ?? null);
  readonly textoAtual = computed(() => {
    const passo = this.passoAtual();
    if (!passo) return '';
    return typeof passo.texto === 'function' ? passo.texto(this.contexto) : passo.texto;
  });

  private contexto: ContextoRoteiro = novoContexto(false, null, false, null);
  private execucao = 0;
  private retomar: (() => void) | null = null;
  private pularEspera: (() => void) | null = null;

  /** Roteiros que o papel corrente alcanca, agrupados por modulo, para o painel de Ajuda. */
  readonly catalogo = computed(() => {
    const papel = this.auth.currentUser()?.role ?? null;
    const visiveis = ROTEIROS.filter((r) => !papel || r.papeis.includes(papel));
    const grupos = new Map<string, Roteiro[]>();
    for (const roteiro of visiveis) {
      grupos.set(roteiro.modulo, [...(grupos.get(roteiro.modulo) ?? []), roteiro]);
    }
    return [...grupos.entries()].map(([modulo, roteiros]) => ({
      modulo,
      ...(MODULOS_TOUR[modulo] ?? MODULO_PADRAO),
      roteiros,
    }));
  });

  /** Motivo de um roteiro nao poder rodar agora (papel, MFA), ou null. */
  impedimento(roteiro: Roteiro): string | null {
    return roteiro.impedimento?.(this.contextoDaSessao()) ?? null;
  }

  iniciar(id: string): void {
    const roteiro = ROTEIROS.find((r) => r.id === id);
    if (!roteiro || this.impedimento(roteiro)) return;
    this.encerrar();
    this.contexto = this.contextoDaSessao();
    this.roteiro.set(roteiro);
    this.passos.set(roteiro.passos(this.contexto));
    this.indice.set(0);
    this.mensagem.set(null);
    this.estado.set('rodando');
    // Chamado dentro do clique que abriu o tour: e o gesto que o navegador exige para ter audio.
    this.musica.tocar();
    void this.executar(++this.execucao);
  }

  pausar(): void {
    if (this.estado() === 'rodando') {
      this.estado.set('pausado');
      this.narrador.parar();
    }
  }

  continuar(): void {
    if (this.estado() !== 'pausado') return;
    this.estado.set('rodando');
    this.retomar?.();
    this.retomar = null;
  }

  /** Encurta a leitura do passo atual; com o roteiro pausado, executa um passo e pausa de novo. */
  avancar(): void {
    this.narrador.parar();
    if (this.estado() === 'pausado') {
      this.passoUnico = true;
      this.continuar();
      return;
    }
    this.pularEspera?.();
  }

  repetir(): void {
    const roteiro = this.roteiro();
    if (roteiro) this.iniciar(roteiro.id);
  }

  alternarVelocidade(): void {
    this.velocidade.update((v) => (v === 1 ? 1.5 : v === 1.5 ? 2 : 1));
  }

  /** Sai do roteiro e devolve a tela como estava, sem destaque. */
  encerrar(): void {
    this.execucao += 1;
    this.narrador.parar();
    this.musica.parar();
    this.destacar(null);
    this.focoAceso.set(false);
    this.areaAlvo.set(null);
    this.cursor.set(null);
    this.retomar?.();
    this.retomar = null;
    this.pularEspera?.();
    this.estado.set('parado');
    this.roteiro.set(null);
    this.passos.set([]);
    this.mensagem.set(null);
  }

  // ============ EXECUCAO ============

  private passoUnico = false;

  private async executar(execucao: number): Promise<void> {
    const vivo = () => execucao === this.execucao;
    const roteiro = this.roteiro();
    if (roteiro?.id && this.router.url.split('?')[0] !== '/app/dashboard') {
      // Todo roteiro parte do Dashboard, como quem acabou de entrar no sistema.
      await this.router.navigateByUrl('/app/dashboard').catch(() => false);
      await this.esperar(400);
    }

    for (let i = 0; vivo() && i < this.passos().length; i += 1) {
      const passo = this.passos()[i];
      if (passo.pularSe?.(this.contexto)) continue;

      try {
        const parar = await this.executarPasso(passo, i, vivo);
        if (parar) return;
      } catch (erro) {
        if (!vivo()) return;
        this.destacar(null);
        this.estado.set('interrompido');
        this.musica.parar();
        this.mensagem.set(
          erro instanceof Error ? erro.message : 'O roteiro parou num passo que não respondeu.',
        );
        return;
      }

      if (this.passoUnico) {
        this.passoUnico = false;
        this.estado.set('pausado');
      }
      await this.aguardarSePausado(vivo);
    }

    if (!vivo()) return;
    this.destacar(null);
    this.cursor.set(null);
    this.estado.set('concluido');
    // A musica sai depois da frase final; se o tour foi reiniciado nesse meio-tempo, fica.
    window.setTimeout(() => {
      if (this.estado() === 'concluido') this.musica.parar();
    }, 2500);
    this.mensagem.set('Roteiro concluído. Você pode repetir ou escolher outro no painel de Ajuda.');
    void this.narrador.falar('Roteiro concluído.', this.velocidade());
  }

  /** Executa um passo. Devolve true quando o roteiro precisa parar ali. */
  private async executarPasso(
    passo: PassoRoteiro,
    indice: number,
    vivo: () => boolean,
  ): Promise<boolean> {
    const texto = typeof passo.texto === 'function' ? passo.texto(this.contexto) : passo.texto;
    this.focoAceso.set(false);
    // Passo so de leitura cujo alvo nao apareceu (a tela mudou de estado): segue sem destaque, em vez de
    // parar o roteiro inteiro. Passo que age (clicar, digitar) continua parando, para nao agir no escuro.
    const alvo = passo.alvo
      ? await this.localizar(passo.alvo, vivo).catch((erro: unknown) => {
          if (passo.acao?.tipo === 'observar' || !passo.acao) return null;
          throw erro;
        })
      : null;
    if (!vivo()) return true;

    if (alvo) {
      this.rolarAte(alvo);
      await this.esperar(160);
      this.areaAlvo.set(alvo.getBoundingClientRect());
      // Tempo da transicao do cartao (300ms), fixo: em 2x a espera nao pode ficar menor que ela.
      await new Promise((resolve) => window.setTimeout(resolve, 320));
      // Cartao e destaque trocam juntos: antes o texto do passo seguinte aparecia com o foco
      // ainda no campo anterior.
      this.indice.set(indice);
      this.destacar(alvo);
      await this.moverCursor(alvo);
      this.focoAceso.set(true);
    } else {
      this.indice.set(indice);
      this.destacar(null);
    }

    // A narracao corre junto com a acao: o operador ouve "agora o e-mail" enquanto ele e digitado.
    const narracao = this.narrador.falar(texto, this.velocidade());
    const acao = passo.acao;

    if (acao?.tipo === 'clicar' && acao.efeito && !this.contexto.demo) {
      // Fora do ambiente de demonstracao o clique gravaria dado real: aponta e para.
      await narracao;
      this.estado.set('interrompido');
      this.mensagem.set(
        'Fora do ambiente de demonstração o roteiro não envia dados. Ele parou antes deste clique.',
      );
      return true;
    }

    if (acao?.tipo === 'digitar' && alvo) {
      await this.digitar(alvo, acao.texto(this.contexto), acao.limpar ?? true, vivo);
    }
    if (acao?.tipo === 'selecionar' && alvo) {
      await this.selecionar(alvo, acao.opcao, vivo);
    }
    if (acao?.tipo === 'anexar' && alvo) {
      await this.anexar(alvo, acao.nome, acao.tipoMime, vivo);
    }

    await Promise.all([narracao, this.lerSemPressa(texto, acao?.tipo === 'observar' || !acao)]);
    if (!vivo()) return true;

    if (acao?.tipo === 'clicar' && alvo) {
      this.clicando.set(true);
      await this.esperar(220);
      this.clicando.set(false);
      if (acao.efeito) this.esconderSenhasDoNavegador(alvo);
      alvo.click();
    }

    if (passo.aguardarRota) {
      const padrao = passo.aguardarRota;
      await this.esperarAte(() => padrao.test(this.router.url), vivo, `a tela ${padrao}`);
      await this.esperar(350);
    }
    if (passo.aguardarAlvo) {
      await this.localizar(passo.aguardarAlvo, vivo);
    }
    return false;
  }

  // ============ DOM ============

  /**
   * O navegador oferece "salvar senha" quando um formulario com senha e enviado, e essa janela
   * cobre a apresentacao sem que a pagina possa fecha-la. Antes do envio o campo de senha e
   * esvaziado so no DOM, sem evento: o Angular continua com o valor no modelo e envia normalmente,
   * e o navegador nao encontra senha para guardar. Vale so durante o tour.
   */
  private esconderSenhasDoNavegador(alvo: HTMLElement): void {
    const escopo = alvo.closest('form') ?? document;
    for (const campo of Array.from(
      escopo.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    )) {
      campo.value = '';
    }
  }

  private async localizar(alvo: AlvoPasso, vivo: () => boolean): Promise<HTMLElement> {
    let achado: HTMLElement | null = null;
    await this.esperarAte(
      () => (achado = encontrar(alvo)) !== null,
      vivo,
      typeof alvo === 'string' ? alvo : `"${alvo.texto}"`,
    );
    return achado as unknown as HTMLElement;
  }

  private destacar(elemento: HTMLElement | null): void {
    this.elemento()?.classList.remove(CLASSE_ALVO);
    elemento?.classList.add(CLASSE_ALVO);
    this.elemento.set(elemento);
  }

  private async moverCursor(elemento: HTMLElement): Promise<void> {
    const r = elemento.getBoundingClientRect();
    const campo = elemento.matches('input, textarea, select');
    // Em campo o cursor para no inicio do texto; no resto, no centro do alvo.
    this.cursor.set({
      x: campo ? r.left + Math.min(28, r.width / 2) : r.left + r.width / 2,
      y: r.top + r.height / 2,
    });
    await this.esperar(620);
  }

  private async digitar(
    campo: HTMLElement,
    texto: string,
    limpar: boolean,
    vivo: () => boolean,
  ): Promise<void> {
    const entrada = campo as HTMLInputElement;
    entrada.focus();
    // `<input type="date">` so aceita o valor completo (aaaa-mm-dd): uma letra de cada vez deixaria
    // o campo vazio a cada tecla. O valor entra de uma vez, depois de uma pausa com o campo em foco.
    if (entrada.type === 'date' || entrada.type === 'datetime-local') {
      await this.esperar(450);
      if (!vivo()) return;
      entrada.value = texto;
      entrada.dispatchEvent(new Event('input', { bubbles: true }));
      entrada.dispatchEvent(new Event('change', { bubbles: true }));
      entrada.dispatchEvent(new FocusEvent('blur'));
      return;
    }
    if (limpar) {
      entrada.value = '';
      entrada.dispatchEvent(new Event('input', { bubbles: true }));
    }
    this.digitando.set(true);
    for (const letra of texto) {
      if (!vivo()) break;
      entrada.value += letra;
      entrada.dispatchEvent(new Event('input', { bubbles: true }));
      await this.esperar(70);
    }
    this.digitando.set(false);
    entrada.dispatchEvent(new Event('change', { bubbles: true }));
    entrada.dispatchEvent(new FocusEvent('blur'));
  }

  /**
   * Anexa o arquivo de demonstracao ao campo de arquivo e avisa a pagina como o navegador avisaria.
   * A validacao de formato e tamanho e a da propria tela: um `.exe` anexado aqui e recusado por ela.
   */
  private async anexar(
    campo: HTMLElement,
    nome: string,
    tipoMime: string,
    vivo: () => boolean,
  ): Promise<void> {
    const entrada = campo as HTMLInputElement;
    if (entrada.type !== 'file') {
      throw new Error(`O roteiro esperava um campo de arquivo para "${nome}" e achou outro campo.`);
    }
    entrada.focus();
    await this.esperar(600);
    if (!vivo()) return;
    const lista = new DataTransfer();
    lista.items.add(criarArquivoDemo(nome, tipoMime));
    entrada.files = lista.files;
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    entrada.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Escolhe uma opcao de `<select>`. O Angular escuta `change` (o seletor nativo e desenhado pelo
   * navegador e nao da para clicar nele de dentro da pagina), entao o valor e trocado e o evento
   * disparado, depois de uma pausa com o campo em foco para o espectador ver onde esta.
   */
  private async selecionar(campo: HTMLElement, opcao: string, vivo: () => boolean): Promise<void> {
    const lista = campo as HTMLSelectElement;
    if (!lista.options)
      throw new Error(`O roteiro esperava uma lista em "${opcao}" e achou outro campo.`);
    const escolhida = escolherOpcao(lista, opcao);
    if (!escolhida) throw new Error(`O roteiro não achou a opção "${opcao}" nesta lista.`);
    lista.focus();
    await this.esperar(450);
    if (!vivo()) return;
    lista.value = escolhida.value;
    lista.dispatchEvent(new Event('input', { bubbles: true }));
    lista.dispatchEvent(new Event('change', { bubbles: true }));
    lista.dispatchEvent(new FocusEvent('blur'));
  }

  /**
   * Rola so o primeiro ancestral que rola de verdade. `scrollIntoView` moveria tambem os
   * containers `overflow: hidden` do shell, e o cabecalho sairia da tela.
   */
  private rolarAte(elemento: HTMLElement): void {
    let rolavel = elemento.parentElement;
    while (rolavel) {
      const { overflowY } = getComputedStyle(rolavel);
      if (/(auto|scroll)/.test(overflowY) && rolavel.scrollHeight > rolavel.clientHeight) break;
      rolavel = rolavel.parentElement;
    }
    if (!rolavel) return;
    const caixa = rolavel.getBoundingClientRect();
    const r = elemento.getBoundingClientRect();
    if (r.top >= caixa.top + 40 && r.bottom <= caixa.bottom - 40) return;
    rolavel.scrollTo({ top: rolavel.scrollTop + r.top - caixa.top - caixa.height / 3 });
  }

  // ============ TEMPO ============

  /** Tempo de leitura do cartao; so conta quando a narracao esta desligada ou foi mais curta. */
  private lerSemPressa(texto: string, soObservar: boolean): Promise<void> {
    const base = Math.max(1600, texto.length * (soObservar ? 42 : 30));
    return this.esperarPulavel(base / this.velocidade());
  }

  private esperarPulavel(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const id = window.setTimeout(fim, ms);
      function fim() {
        window.clearTimeout(id);
        resolve();
      }
      this.pularEspera = () => {
        this.pularEspera = null;
        fim();
      };
    });
  }

  private esperar(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms / this.velocidade()));
  }

  private async esperarAte(
    condicao: () => boolean,
    vivo: () => boolean,
    descricao: string,
  ): Promise<void> {
    const limite = Date.now() + ESPERA_MAXIMA_MS;
    while (vivo()) {
      if (condicao()) return;
      if (Date.now() > limite) {
        throw new Error(`O roteiro esperou ${descricao} e não encontrou. Ele parou aqui.`);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  }

  private async aguardarSePausado(vivo: () => boolean): Promise<void> {
    if (this.estado() !== 'pausado' || !vivo()) return;
    await new Promise<void>((resolve) => (this.retomar = resolve));
  }

  private contextoDaSessao(): ContextoRoteiro {
    const usuario = this.auth.currentUser();
    return novoContexto(
      ehAmbienteDemo(),
      usuario?.role ?? null,
      !!usuario?.mfaHabilitado,
      usuario?.username ?? null,
    );
  }
}

function novoContexto(
  demo: boolean,
  papel: ContextoRoteiro['papel'],
  mfa: boolean,
  usuario: string | null,
): ContextoRoteiro {
  const agora = new Date();
  const carimbo = [agora.getHours(), agora.getMinutes(), agora.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join('');
  return { demo, papel, mfa, usuario, carimbo, dados: {} };
}

/** Primeiro elemento visivel que casa com o alvo. */
export function encontrar(alvo: AlvoPasso): HTMLElement | null {
  const css = typeof alvo === 'string' ? alvo : alvo.css;
  const texto = typeof alvo === 'string' ? null : normalizar(alvo.texto);
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(css))) {
    if (!el.getClientRects().length) continue;
    if (texto && !normalizar(el.textContent ?? '').includes(texto)) continue;
    return el;
  }
  return null;
}

/** Arquivo minusculo e sem dado real, para o roteiro anexar a um campo de arquivo. */
export function criarArquivoDemo(nome: string, tipoMime: string): File {
  return new File([`Arquivo de demonstração do tour assistido: ${nome}`], nome, { type: tipoMime });
}

/** A opcao de um `<select>` pelo texto exibido (sem acento nem caixa) ou pelo `value`. */
export function escolherOpcao(lista: HTMLSelectElement, opcao: string): HTMLOptionElement | null {
  const desejada = normalizar(opcao);
  return (
    Array.from(lista.options).find(
      (o) => normalizar(o.textContent ?? '') === desejada || o.value === opcao,
    ) ?? null
  );
}

/** Caixa baixa, sem acento e com espacos colapsados: "Em análise" casa com "em analise". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

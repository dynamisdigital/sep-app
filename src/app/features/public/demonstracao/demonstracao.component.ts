import {
  afterNextRender,
  afterRenderEffect,
  ElementRef,
  viewChild,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ehAmbienteDemo } from '../../../core/env/ambiente';
import { TourService } from '../../../core/tour/tour.service';
import { PublicShellComponent } from '../shared/public-shell.component';
import { DemonstracaoFotosService } from './demonstracao-fotos.service';
import { LucideAngularModule } from 'lucide-angular';
import { INTERVALO_BANNER_MS } from '../landing/banners-hero';
import { DemonstracaoGaleriaService } from './demonstracao-galeria.service';
import { TOUR_POR_CENARIO } from '../../../core/tour/roteiros/cenarios.roteiro';
import { roteiroDaEtapa } from './demonstracao-etapas';

export const SECOES_DEMO: Record<string, string | undefined> = {
  operacao_completa: undefined,
  correspondente: 'Correspondente',
  subcorrespondente: 'Sub-correspondente',
  cliente: 'Tomador',
  backoffice: 'Backoffice',
  financiador: 'Credor',
};

@Component({
  selector: 'sep-demonstracao',
  imports: [PublicShellComponent, RouterLink, LucideAngularModule],
  templateUrl: './demonstracao.component.html',
  styleUrl: './demonstracao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemonstracaoComponent {
  private readonly tour = inject(TourService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly memoriaGaleria = inject(DemonstracaoGaleriaService);
  protected readonly fotos = inject(DemonstracaoFotosService);
  protected get experiencias() {
    return this.fotos.experiencias();
  }
  protected get painel() {
    return this.fotos.painel();
  }
  protected readonly visiveis = signal(2);
  protected readonly deslocamentoPainel = signal(2);
  private readonly janelaPainel = viewChild<ElementRef<HTMLElement>>('janelaPainel');
  protected readonly posicaoPainel = signal(this.memoriaGaleria.estado.posicao);
  protected readonly painelMovendo = signal(false);
  private readonly movimentoManual = signal(false);
  protected readonly reproducaoSolicitada = signal(true);
  protected readonly pausaMovimento = computed(
    () =>
      this.oculto() ||
      this.reduzido() ||
      (this.tour.ativo() && !this.movimentoManual()) ||
      this.pausado() ||
      (!this.movimentoManual() && !this.reproducaoSolicitada() && (this.hover() || this.foco())),
  );
  protected readonly galeria = computed(
    () => !this.detalhe() && this.experiencias[this.ativo()].id === 'operacao_completa',
  );
  protected readonly progressoPainel = computed(
    () => `${this.posicaoPainel()}-${this.painelMovendo()}`,
  );

  protected indicadorAtivo(indice: number): boolean {
    if (!this.galeria()) return indice === this.ativo();
    return Array.from(
      { length: this.visiveis() },
      (_, i) => (this.posicaoPainel() + i) % 6,
    ).includes(indice);
  }

  protected navegarBanner(delta: number): void {
    if (this.galeria()) this.moverPainel(delta * this.visiveis());
    else {
      this.reproducaoSolicitada.set(true);
      this.selecionar(this.ativo() + delta);
    }
  }

  protected mostrarBanner(indice: number): void {
    this.reproducaoSolicitada.set(true);
    if (indice === 0) {
      this.painelMovendo.set(false);
      this.posicaoPainel.set(6);
    }
    this.selecionar(indice);
  }
  protected readonly base = '/image/demonstracao/';
  protected readonly demo = ehAmbienteDemo();
  protected readonly ativo = signal(0);
  protected readonly perfil = signal<string | null>(null);
  protected readonly detalhe = computed(() =>
    this.experiencias.find((e) => e.id === this.perfil()),
  );
  protected readonly anterior = signal<number | null>(null);
  protected readonly hover = signal(false);
  protected readonly foco = signal(false);
  protected readonly oculto = signal(true);
  protected readonly reduzido = signal(true);
  protected readonly pausado = signal(this.memoriaGaleria.estado.pausado);
  protected readonly reinicio = signal(0);
  protected readonly intervaloMs = INTERVALO_BANNER_MS;
  protected readonly cenas = computed(() => {
    const detalhe = this.detalhe();
    return detalhe
      ? [detalhe]
      : this.experiencias.filter((_, i) => i === this.ativo() || i === this.anterior());
  });
  protected readonly parado = computed(
    () =>
      (!this.reproducaoSolicitada() && (this.hover() || this.foco())) ||
      this.oculto() ||
      this.reduzido() ||
      this.pausado() ||
      this.tour.ativo(),
  );
  private troca: ReturnType<typeof setTimeout> | undefined;
  private toqueX = 0;
  private ultimoPerfilFocado: string | null | undefined = undefined;
  private readonly titulo = viewChild<ElementRef<HTMLHeadingElement>>('titulo');

  constructor() {
    effect(() => {
      if (this.perfil() || !this.galeria()) return;
      this.memoriaGaleria.estado = { posicao: this.posicaoPainel(), pausado: this.pausado() };
    });
    afterRenderEffect((cleanup) => {
      const janela = this.janelaPainel()?.nativeElement;
      if (!janela) return;
      const observer = new ResizeObserver(([entry]) =>
        this.visiveis.set(entry.contentRect.width < 600 ? 1 : 2),
      );
      observer.observe(janela);
      cleanup(() => observer.disconnect());
    });
    afterRenderEffect(() => {
      const perfil = this.perfil();
      const titulo = this.titulo();
      if (perfil && titulo && this.ultimoPerfilFocado !== perfil) {
        this.ultimoPerfilFocado = perfil;
        titulo.nativeElement.focus({ preventScroll: true });
      }
    });
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.perfil.set(params.get('perfil'));
    });
    afterNextRender(() => {
      const media = matchMedia('(prefers-reduced-motion: reduce)');
      const movimento = () => this.reduzido.set(media.matches);
      const visibilidade = () => this.oculto.set(document.hidden);
      movimento();
      visibilidade();
      media.addEventListener('change', movimento);
      document.addEventListener('visibilitychange', visibilidade);
      this.destroyRef.onDestroy(() => {
        media.removeEventListener('change', movimento);
        document.removeEventListener('visibilitychange', visibilidade);
      });
    });
    effect((cleanup) => {
      this.reinicio();
      if (this.detalhe() || this.galeria() || this.parado()) return;
      const timer = setInterval(() => this.selecionar(this.ativo() + 1), INTERVALO_BANNER_MS);
      cleanup(() => clearInterval(timer));
    });
    effect((cleanup) => {
      if (!this.galeria() || this.parado() || this.painelMovendo()) return;
      const timer = setTimeout(() => this.moverPainel(this.visiveis(), false), 4000);
      cleanup(() => clearTimeout(timer));
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.troca));
  }

  protected arco(indice: number): string {
    const distancia = indice - (this.visiveis() - 1) / 2;
    const afastamento = Math.max(0, Math.abs(distancia) - (this.visiveis() === 2 ? 0.5 : 0));
    const curva = Math.sign(distancia) * afastamento;
    return `perspective(1200px) translateY(${Math.min(afastamento, 3) * 28}px) rotateY(${Math.max(-42, Math.min(42, -curva * 26))}deg) scale(${Math.max(0.58, 1 - afastamento * 0.22)})`;
  }

  protected alternarReproducao(): void {
    const retomar = this.pausado();
    this.pausado.set(!retomar);
    this.reproducaoSolicitada.set(retomar);
    if (!retomar) return;
    if (this.galeria()) {
      this.movimentoManual.set(true);
      if (!this.painelMovendo()) this.moverPainel(this.visiveis());
    } else if (!this.detalhe()) this.selecionar(this.ativo() + 1);
  }

  protected moverPainel(delta: number, manual = true): void {
    if (this.painelMovendo()) return;
    this.movimentoManual.set(manual);
    this.deslocamentoPainel.set(delta);
    if (this.reduzido() || (manual && this.pausado())) this.avancarPainel(delta);
    else this.painelMovendo.set(true);
  }

  private avancarPainel(delta: number): void {
    this.posicaoPainel.update((n) => 6 + ((((n - 6 + delta) % 6) + 6) % 6));
    this.painelMovendo.set(false);
  }

  protected fimPainel(event: AnimationEvent): void {
    if (event.animationName.endsWith('painel-deslocar'))
      this.avancarPainel(this.deslocamentoPainel());
  }

  protected selecionar(indice: number): void {
    const proximo = (indice + this.experiencias.length) % this.experiencias.length;
    if (proximo !== this.ativo()) {
      this.anterior.set(this.ativo());
      this.ativo.set(proximo);
      clearTimeout(this.troca);
      this.troca = setTimeout(() => this.anterior.set(null), 550);
    }
    this.reinicio.update((n) => n + 1);
  }

  protected sairDoFoco(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
      this.foco.set(false);
  }

  protected teclado(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      if (this.galeria())
        this.moverPainel(event.key === 'ArrowRight' ? this.visiveis() : -this.visiveis());
      else this.selecionar(this.ativo() + (event.key === 'ArrowRight' ? 1 : -1));
    }
  }

  protected iniciar(id: string): void {
    if (this.demo && Object.hasOwn(TOUR_POR_CENARIO, id)) this.tour.iniciar(TOUR_POR_CENARIO[id]);
  }

  protected iniciarEtapa(id: string, indice: number): void {
    if (!this.demo) return;
    const roteiro = roteiroDaEtapa(id, indice);
    if (roteiro) this.tour.iniciarRoteiro(roteiro);
  }

  protected inicioToque(event: TouchEvent): void {
    this.toqueX = event.changedTouches[0].clientX;
  }
  protected fimToque(event: TouchEvent): void {
    const delta = this.toqueX - event.changedTouches[0].clientX;
    if (Math.abs(delta) > 60) {
      if (this.galeria()) this.moverPainel(delta > 0 ? this.visiveis() : -this.visiveis());
      else this.selecionar(this.ativo() + (delta > 0 ? 1 : -1));
    }
  }
}

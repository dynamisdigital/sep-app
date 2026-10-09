import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { EntradaDirective } from '../shared/entrada.directive';
import { PublicShellComponent } from '../shared/public-shell.component';
import { ImagemPostComponent } from '../shared/imagem-post.component';
import {
  AVISO_DO_BLOG,
  CATEGORIAS,
  CategoriaBlog,
  minutosDeLeitura,
  PostBlog,
  postPorSlug,
  POSTS,
} from '../shared/site-blog';

type Filtro = 'Todos' | CategoriaBlog;

// Lista do blog do Dynamis SEP: todos os textos tratam da sociedade de empréstimo entre pessoas. O
// primeiro texto da lista vira destaque, e os demais entram em grade, com filtro por categoria.
@Component({
  selector: 'sep-blog-page',
  imports: [
    RouterLink,
    DatePipe,
    LucideAngularModule,
    PublicShellComponent,
    ImagemPostComponent,
    EntradaDirective,
  ],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogComponent {
  protected readonly aviso = AVISO_DO_BLOG;
  protected readonly filtros: Filtro[] = ['Todos', ...CATEGORIAS];
  protected readonly filtro = signal<Filtro>('Todos');

  protected readonly visiveis = computed<PostBlog[]>(() => {
    const f = this.filtro();
    return f === 'Todos' ? POSTS : POSTS.filter((p) => p.categoria === f);
  });
  protected readonly destaque = computed(() => this.visiveis()[0] ?? null);
  protected readonly demais = computed(() => this.visiveis().slice(1));

  protected readonly minutos = minutosDeLeitura;

  /** Texto que acabou de ser lido em áudio: a borda pisca em branco quatro vezes. */
  protected readonly lido = signal<string | null>(null);
  /** Texto seguinte: borda azul fina, piscando quatro vezes, e a página posiciona nele. */
  protected readonly proximo = signal<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private timers: number[] = [];
  private readonly eventosDoUsuario = ['click', 'wheel', 'touchstart', 'keydown'] as const;

  constructor() {
    // Quem chega daqui depois de ouvir um texto até o fim volta ao ponto onde estava (ver BlogArtigo).
    const estado = inject(Router).getCurrentNavigation()?.extras.state as
      | { lido?: string }
      | undefined;
    const slug = estado?.lido;
    if (slug && postPorSlug(slug)) afterNextRender(() => this.retomar(slug));
    inject(DestroyRef).onDestroy(() => this.encerrar());
  }

  /**
   * Mostra onde o leitor estava: posiciona no texto lido e pisca a borda em branco (4x), marca o seguinte com
   * borda azul (4x) e posiciona nele; se em 10 segundos ninguém interagir, a página sobe ao cabeçalho.
   */
  private retomar(slug: string): void {
    const semMovimento =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const comportamento: ScrollBehavior = semMovimento ? 'auto' : 'smooth';
    const seguinte = POSTS[POSTS.findIndex((p) => p.slug === slug) + 1]?.slug ?? null;

    this.mostrar(slug, 'auto');
    this.agendar(() => this.lido.set(slug), 500);
    this.agendar(() => {
      this.lido.set(null);
      if (seguinte) {
        this.proximo.set(seguinte);
        this.mostrar(seguinte, comportamento);
      }
      this.agendar(() => {
        this.proximo.set(null);
        window.scrollTo({ top: 0, behavior: comportamento });
      }, 10000);
    }, 500 + 2800);

    const interrompe = () => {
      this.encerrar();
      this.eventosDoUsuario.forEach((e) => document.removeEventListener(e, interrompe));
    };
    this.eventosDoUsuario.forEach((e) =>
      document.addEventListener(e, interrompe, { passive: true }),
    );
  }

  private mostrar(slug: string, comportamento: ScrollBehavior): void {
    this.host.nativeElement
      .querySelector(`[data-slug="${slug}"]`)
      ?.scrollIntoView({ block: 'center', behavior: comportamento });
  }

  private agendar(fn: () => void, ms: number): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private encerrar(): void {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }

  protected escolher(filtro: Filtro): void {
    this.filtro.set(filtro);
  }

  protected contagem(filtro: Filtro): number {
    return filtro === 'Todos' ? POSTS.length : POSTS.filter((p) => p.categoria === filtro).length;
  }
}

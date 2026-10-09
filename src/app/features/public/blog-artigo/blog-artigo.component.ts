import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { map } from 'rxjs';

import { EntradaDirective } from '../shared/entrada.directive';
import { OuvirTextoComponent } from '../shared/ouvir-texto.component';
import { PublicShellComponent } from '../shared/public-shell.component';
import { ImagemPostComponent } from '../shared/imagem-post.component';
import { AVISO_DO_BLOG, minutosDeLeitura, postPorSlug, PostBlog } from '../shared/site-blog';

// Um texto do blog. O endereço é /blog/<slug>: o componente acompanha o parâmetro, e não só o valor do
// momento em que foi criado, para a navegação entre textos relacionados trocar o conteúdo na mesma tela.
@Component({
  selector: 'sep-blog-artigo-page',
  imports: [
    RouterLink,
    DatePipe,
    LucideAngularModule,
    PublicShellComponent,
    ImagemPostComponent,
    EntradaDirective,
    OuvirTextoComponent,
  ],
  templateUrl: './blog-artigo.component.html',
  styleUrl: './blog-artigo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogArtigoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly titulo = inject(Title);
  private voltaParaOBlog = 0;

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('slug') ?? '',
  });

  protected readonly post = computed<PostBlog | undefined>(() => postPorSlug(this.slug()));
  protected readonly relacionados = computed(() =>
    (this.post()?.relacionados ?? []).map((s) => postPorSlug(s)).filter((p): p is PostBlog => !!p),
  );
  /** O que a voz lê, na ordem da página: título, abertura, corpo, "em resumo" e o aviso. */
  protected readonly seletorLeitura = [
    '.px65-heading h1',
    '.px65-heading .px65-lead',
    '.px65-corpo h2',
    '.px65-corpo p',
    '.px65-corpo li',
    '.px65-corpo blockquote',
    '.px65-resumo h2',
    '.px65-resumo li',
    '.px65-aviso span',
  ].join(', ');
  protected readonly minutos = minutosDeLeitura;
  protected readonly aviso = AVISO_DO_BLOG;

  /** Terminada a leitura, a página espera 3 segundos e volta para a lista do blog. */
  protected leituraConcluida(): void {
    this.cancelarVolta();
    this.voltaParaOBlog = window.setTimeout(() => void this.router.navigateByUrl('/blog'), 3000);
  }

  protected cancelarVolta(): void {
    window.clearTimeout(this.voltaParaOBlog);
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelarVolta());
    effect(() => {
      const p = this.post();
      this.titulo.setTitle(
        p ? `${p.titulo} — Blog Dynamis SEP` : 'Texto não encontrado — Dynamis SEP',
      );
    });
  }
}

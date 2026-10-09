import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { map } from 'rxjs';

import { EntradaDirective } from '../shared/entrada.directive';
import { textoParaLeitura } from '../shared/leitura-audio';
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
  private readonly titulo = inject(Title);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('slug') ?? '',
  });

  protected readonly post = computed<PostBlog | undefined>(() => postPorSlug(this.slug()));
  protected readonly relacionados = computed(() =>
    (this.post()?.relacionados ?? []).map((s) => postPorSlug(s)).filter((p): p is PostBlog => !!p),
  );
  /** O texto como a voz vai lê-lo, em trechos curtos. */
  protected readonly leitura = computed(() => {
    const p = this.post();
    return p ? textoParaLeitura(p, AVISO_DO_BLOG) : [];
  });
  protected readonly minutos = minutosDeLeitura;
  protected readonly aviso = AVISO_DO_BLOG;

  constructor() {
    effect(() => {
      const p = this.post();
      this.titulo.setTitle(
        p ? `${p.titulo} — Blog Dynamis SEP` : 'Texto não encontrado — Dynamis SEP',
      );
    });
  }
}

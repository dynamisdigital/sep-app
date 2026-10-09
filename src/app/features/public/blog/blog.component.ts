import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  protected escolher(filtro: Filtro): void {
    this.filtro.set(filtro);
  }

  protected contagem(filtro: Filtro): number {
    return filtro === 'Todos' ? POSTS.length : POSTS.filter((p) => p.categoria === filtro).length;
  }
}

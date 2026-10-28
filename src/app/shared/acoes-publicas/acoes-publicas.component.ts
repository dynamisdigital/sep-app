import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ViewEncapsulation,
  inject,
  input,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { LarguraTelaService } from '../../core/layout/largura-tela.service';
import { TourService } from '../../core/tour/tour.service';

/**
 * Botoes do cabecalho do site institucional: a largura da tela (so em janela maximizada) e a ajuda,
 * que lista os tours das paginas publicas. Os do sistema logado ficam na ajuda do shell operacional.
 */
@Component({
  selector: 'sep-acoes-publicas',
  imports: [LucideAngularModule],
  templateUrl: './acoes-publicas.component.html',
  styleUrl: './acoes-publicas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '(document:keydown.escape)': 'fechar()' },
})
export class AcoesPublicasComponent {
  protected readonly tour = inject(TourService);
  protected readonly largura = inject(LarguraTelaService);

  /** `coluna` empilha os botoes: e como ficam na tela de login, que nao tem cabecalho. */
  readonly direcao = input<'linha' | 'coluna'>('linha');

  /** Quando informada, a ajuda lista so os roteiros dessa tela (a de login mostra so o dela). */
  readonly tela = input<string | null>(null);

  protected readonly aberta = signal(false);

  protected readonly grupos = computed(() => {
    const tela = this.tela();
    const grupos = this.tour.catalogoPublico();
    if (!tela) return grupos;
    return grupos
      .map((g) => ({ ...g, roteiros: g.roteiros.filter((r) => r.tela === tela) }))
      .filter((g) => g.roteiros.length);
  });

  protected alternar(): void {
    this.aberta.update((v) => !v);
  }

  protected fechar(): void {
    this.aberta.set(false);
  }

  protected iniciar(id: string): void {
    this.aberta.set(false);
    this.tour.iniciar(id);
  }
}

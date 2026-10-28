import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { EntradaDirective } from '../shared/entrada.directive';
import { PublicShellComponent } from '../shared/public-shell.component';
import { FAQ, GrupoFaq, totalDePerguntas } from '../shared/site-faq';

// Página de perguntas frequentes sobre a SEP, em quatro grupos (a SEP, empresas, investidores e segurança),
// com busca. A busca ignora acentos e maiúsculas; sem resultado, a página diz isso e leva ao contato.
@Component({
  selector: 'sep-faq-page',
  imports: [RouterLink, LucideAngularModule, PublicShellComponent, EntradaDirective],
  templateUrl: './perguntas-frequentes.component.html',
  styleUrl: './perguntas-frequentes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerguntasFrequentesComponent {
  protected readonly total = totalDePerguntas();
  protected readonly busca = signal('');

  protected readonly grupos = computed<GrupoFaq[]>(() => {
    const termo = normalizar(this.busca());
    if (!termo) return FAQ;
    return FAQ.map((g) => ({
      ...g,
      itens: g.itens.filter((i) => normalizar(`${i.pergunta} ${i.resposta}`).includes(termo)),
    })).filter((g) => g.itens.length > 0);
  });

  protected readonly encontradas = computed(() =>
    this.grupos().reduce((n, g) => n + g.itens.length, 0),
  );

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected limpar(): void {
    this.busca.set('');
  }
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

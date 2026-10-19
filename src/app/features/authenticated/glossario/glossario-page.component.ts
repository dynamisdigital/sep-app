import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  GLOSSARIO,
  MODULOS_GLOSSARIO,
  ModuloGlossario,
  Verbete,
} from '../../../core/glossario/glossario.data';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';

type Ordem = 'asc' | 'desc';

interface GrupoLetra {
  letra: string;
  verbetes: Verbete[];
}

/** Minúsculas e sem acento: a busca e a ordem tratam "Conciliação" e "conciliacao" como iguais. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function letraDe(termo: string): string {
  return normalizar(termo).charAt(0).toUpperCase();
}

// Cor de cada módulo: a mesma do item correspondente no menu principal (`tom` em operational-shell).
// "Site público" não tem item no menu e usa o laranja, que nenhum item ocupa.
const TOM_DO_MODULO: Record<ModuloGlossario, string> = {
  Plataforma: 'var(--sep-tint-sky)',
  Onboarding: 'var(--sep-tint-cyan)',
  Crédito: 'var(--sep-tint-violet)',
  Formalização: 'var(--sep-tint-pink)',
  Cobrança: 'var(--sep-tint-amber)',
  Pix: 'var(--sep-tint-teal)',
  Backoffice: 'var(--sep-tint-sky)',
  'Meu Back Office': 'var(--sep-tint-lime)',
  Correspondentes: 'var(--sep-tint-lime)',
  Credora: 'var(--sep-tint-emerald)',
  Administração: 'var(--sep-tint-red)',
  'Perfil e segurança': 'var(--sep-tint-slate)',
  'Site público': 'var(--sep-tint-orange)',
};

// Glossário técnico, aberto pelo menu Ajuda. A lista vem de `GLOSSARIO`; busca, módulo, letra e ordem
// trabalham sobre ela, e a letra só oferece as iniciais que existem no resultado da busca e do módulo.
@Component({
  selector: 'sep-glossario-page',
  imports: [LucideAngularModule, OperationalShellComponent, RouterLink],
  templateUrl: './glossario-page.component.html',
  styleUrl: './glossario-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlossarioPageComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected readonly modulos = MODULOS_GLOSSARIO;
  protected readonly tomDe = (modulo: ModuloGlossario): string => TOM_DO_MODULO[modulo];
  protected readonly total = GLOSSARIO.length;

  protected readonly busca = signal('');
  protected readonly modulo = signal<ModuloGlossario | ''>('');
  protected readonly letra = signal('');
  protected readonly ordem = signal<Ordem>('asc');

  /** Resultado da busca e do módulo, antes do filtro de letra: é dele que saem as letras disponíveis. */
  private readonly filtrados = computed(() => {
    const termoBusca = normalizar(this.busca().trim());
    const modulo = this.modulo();
    return GLOSSARIO.filter((v) => {
      if (modulo && !v.modulos.includes(modulo)) return false;
      if (!termoBusca) return true;
      const alvo = normalizar(`${v.termo} ${v.resumo} ${v.usadoEm} ${v.modulos.join(' ')}`);
      return alvo.includes(termoBusca);
    });
  });

  protected readonly letrasDisponiveis = computed(
    () => new Set(this.filtrados().map((v) => letraDe(v.termo))),
  );

  protected readonly alfabeto = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  protected readonly resultado = computed(() => {
    const letra = this.letra();
    const fator = this.ordem() === 'asc' ? 1 : -1;
    return this.filtrados()
      .filter((v) => !letra || letraDe(v.termo) === letra)
      .sort((a, b) => fator * normalizar(a.termo).localeCompare(normalizar(b.termo), 'pt-BR'));
  });

  protected readonly grupos = computed<GrupoLetra[]>(() => {
    const grupos: GrupoLetra[] = [];
    for (const verbete of this.resultado()) {
      const letra = letraDe(verbete.termo);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.letra === letra) ultimo.verbetes.push(verbete);
      else grupos.push({ letra, verbetes: [verbete] });
    }
    return grupos;
  });

  protected readonly filtrando = computed(
    () => !!(this.busca().trim() || this.modulo() || this.letra()),
  );

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.letra.set('');
  }

  protected escolherModulo(evento: Event): void {
    this.modulo.set((evento.target as HTMLSelectElement).value as ModuloGlossario | '');
    this.letra.set('');
  }

  /** O selo de módulo de um verbete filtra por esse módulo; clicar de novo desfaz o filtro. */
  protected filtrarPorSelo(modulo: ModuloGlossario): void {
    this.modulo.update((atual) => (atual === modulo ? '' : modulo));
    this.letra.set('');
  }

  protected escolherLetra(letra: string): void {
    this.letra.update((atual) => (atual === letra ? '' : letra));
  }

  protected alternarOrdem(): void {
    this.ordem.update((o) => (o === 'asc' ? 'desc' : 'asc'));
  }

  protected limpar(): void {
    this.busca.set('');
    this.modulo.set('');
    this.letra.set('');
  }

  /** Volta para a tela de onde o glossário foi aberto; sem histórico (acesso direto), vai ao Dashboard. */
  protected voltar(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigateByUrl('/app/dashboard');
  }
}

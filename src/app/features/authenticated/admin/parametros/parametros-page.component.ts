import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';

import {
  ApiErrorResponse,
  ParametroOperacional,
  TipoParametro,
} from '../../../../core/api/api.models';
import { formatarValorParametro } from '../../../../core/format/br-format';
import { GovernancaService } from '../../../../core/governanca/governanca.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

// Tipos do contrato (TipoParametroOperacional no backend). O filtro trabalha sobre este conjunto
// fechado, e nao sobre o que por acaso apareceu na lista devolvida.
const TIPOS: TipoParametro[] = ['INTEGER', 'DECIMAL', 'BOOLEAN', 'STRING'];

const TOM_POR_TIPO: Record<TipoParametro, string> = {
  INTEGER: 'green',
  DECIMAL: 'blue',
  BOOLEAN: 'purple',
  STRING: 'amber',
};

type Coluna = 'chave' | 'tipo' | 'valor' | 'versao' | 'dataModificacao';

// Catalogo de parametros operacionais (ADMIN-only; guard herdado da rota pai). A tela apresenta a
// lista devolvida pelo backend: filtro por texto e por tipo, ordenacao e paginacao acontecem sobre
// ela, e os agregados do topo saem da mesma lista, para os numeros fecharem com a tabela.
@Component({
  selector: 'sep-parametros-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './parametros-page.component.html',
  styleUrl: './parametros-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrosPageComponent implements OnInit {
  private readonly governanca = inject(GovernancaService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly parametros = signal<ParametroOperacional[]>([]);

  protected readonly tipos = TIPOS;
  protected readonly buscaControl = new FormControl<string>('', { nonNullable: true });
  private readonly busca = toSignal(this.buscaControl.valueChanges, { initialValue: '' });
  protected readonly tipoFiltro = signal<TipoParametro | 'TODOS'>('TODOS');
  protected readonly filtrosAbertos = signal(false);

  protected readonly ordem = signal<{ coluna: Coluna; desc: boolean }>({
    coluna: 'chave',
    desc: false,
  });
  protected readonly porPagina = signal(10);
  protected readonly pagina = signal(1);

  protected readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const tipo = this.tipoFiltro();
    return this.parametros().filter((p) => {
      const casaTipo = tipo === 'TODOS' || p.tipo === tipo;
      const casaTexto =
        !termo ||
        p.chave.toLowerCase().includes(termo) ||
        p.descricao.toLowerCase().includes(termo);
      return casaTipo && casaTexto;
    });
  });

  protected readonly ordenados = computed(() => {
    const { coluna, desc } = this.ordem();
    return [...this.filtrados()].sort((a, b) => {
      const comparacao =
        coluna === 'versao'
          ? a.versao - b.versao
          : String(a[coluna]).localeCompare(String(b[coluna]), 'pt-BR', { numeric: true });
      return desc ? -comparacao : comparacao;
    });
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.ordenados().length / this.porPagina())),
  );

  protected readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  protected readonly naPagina = computed(() => {
    const inicio = (this.paginaAtual() - 1) * this.porPagina();
    return this.ordenados().slice(inicio, inicio + this.porPagina());
  });

  protected readonly paginas = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1),
  );

  protected readonly primeiroDaPagina = computed(() =>
    this.ordenados().length === 0 ? 0 : (this.paginaAtual() - 1) * this.porPagina() + 1,
  );

  protected readonly ultimoDaPagina = computed(() =>
    Math.min(this.paginaAtual() * this.porPagina(), this.ordenados().length),
  );

  // ============ AGREGADOS ============

  protected readonly total = computed(() => this.parametros().length);
  protected readonly ativos = computed(() => this.parametros().filter((p) => p.ativo).length);

  /** Cada parametro na versao N acumulou N-1 alteracoes registradas na trilha auditavel. */
  protected readonly alteracoes = computed(() =>
    this.parametros().reduce((soma, p) => soma + Math.max(0, p.versao - 1), 0),
  );

  /** A publicacao mais recente do catalogo, tirada da propria lista. */
  protected readonly ultimaAlteracao = computed(() => {
    const datas = this.parametros()
      .map((p) => p.dataModificacao)
      .sort();
    return datas.length ? datas[datas.length - 1] : null;
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.governanca.listarParametros().subscribe({
      next: (lista) => {
        this.parametros.set(lista);
        this.pagina.set(1);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Não foi possível carregar os parâmetros.');
        this.loading.set(false);
      },
    });
  }

  ordenarPor(coluna: Coluna): void {
    this.ordem.update((atual) =>
      atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false },
    );
    this.pagina.set(1);
  }

  filtrarPorTipo(tipo: TipoParametro | 'TODOS'): void {
    this.tipoFiltro.set(tipo);
    this.pagina.set(1);
  }

  alternarFiltros(): void {
    this.filtrosAbertos.update((aberto) => !aberto);
  }

  irParaPagina(numero: number): void {
    this.pagina.set(Math.min(Math.max(1, numero), this.totalPaginas()));
  }

  mudarPorPagina(valor: string): void {
    this.porPagina.set(Number(valor));
    this.pagina.set(1);
  }

  protected readonly formatarValorParametro = formatarValorParametro;

  tomDoTipo(tipo: TipoParametro): string {
    return TOM_POR_TIPO[tipo];
  }

  formatarDataHora(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  }
}

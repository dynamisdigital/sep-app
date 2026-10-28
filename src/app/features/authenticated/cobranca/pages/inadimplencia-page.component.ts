import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { InadimplenciaResponse, StatusParcela } from '../../../../core/api/api.models';
import {
  CobrancaService,
  ListarInadimplenciaParams,
} from '../../../../core/cobranca/cobranca.service';
import { gerarLinhaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import {
  formatarDataLocal,
  formatarMoeda,
  idCurto,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

const STATUS_FILTRAVEIS: StatusParcela[] = ['ATRASADA', 'INADIMPLENTE'];

type ChaveFaixa = 'ATE_15' | 'DE_16_A_30' | 'DE_31_A_60' | 'ACIMA_60';

interface Faixa {
  chave: ChaveFaixa;
  rotulo: string;
  valor: number;
  quantidade: number;
  percentual: number;
  tom: 'orange' | 'amber' | 'red' | 'vermelho-forte';
  cor: string;
}

interface ExposicaoContrato {
  contrato: string;
  tipo: string;
  valor: number;
  parcelas: number;
  proporcao: number;
}

// Faixas de atraso do Mockup 30. Os limites vêm do desenho; a tela apenas agrupa o
// `diasAtraso` que o backend devolveu — não recalcula atraso nem status.
const FAIXAS: { chave: ChaveFaixa; rotulo: string; min: number; max: number; cor: string }[] = [
  { chave: 'ATE_15', rotulo: 'Até 15 dias', min: 0, max: 15, cor: 'var(--sep-warning)' },
  { chave: 'DE_16_A_30', rotulo: '16 a 30 dias', min: 16, max: 30, cor: 'var(--sep-tint-orange)' },
  { chave: 'DE_31_A_60', rotulo: '31 a 60 dias', min: 31, max: 60, cor: 'var(--sep-tint-coral)' },
  {
    chave: 'ACIMA_60',
    rotulo: 'Acima de 60 dias',
    min: 61,
    max: Infinity,
    cor: 'var(--sep-danger)',
  },
];

const TOM_FAIXA: Record<ChaveFaixa, Faixa['tom']> = {
  ATE_15: 'orange',
  DE_16_A_30: 'amber',
  DE_31_A_60: 'red',
  ACIMA_60: 'vermelho-forte',
};

const POR_PAGINA = 8;

// Triagem de inadimplência (Mockup 30) para FINANCEIRO/ADMIN, sobre GET
// /cobranca/inadimplencia. Filtros por dias de atraso e status vão para o backend; os
// agregados da tela — total em atraso, as quatro faixas, a rosca e a exposição por
// contrato — são somados a partir da própria lista devolvida, o que mantém os números
// coerentes entre si. A tela não calcula atraso, status nem valor.
@Component({
  selector: 'sep-inadimplencia-page',
  imports: [RouterLink, ReactiveFormsModule, LucideAngularModule, OperationalShellComponent],
  templateUrl: './inadimplencia-page.component.html',
  styleUrl: './inadimplencia-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InadimplenciaPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cobranca = inject(CobrancaService);
  private readonly router = inject(Router);

  protected readonly statusFiltraveis = STATUS_FILTRAVEIS;
  protected readonly porPagina = POR_PAGINA;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly linhas = signal<InadimplenciaResponse[]>([]);
  protected readonly pagina = signal(1);
  protected readonly copiado = signal<string | null>(null);
  protected readonly menuLinha = signal<string | null>(null);

  protected readonly formatarDataLocal = formatarDataLocal;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  protected readonly filtros = this.fb.group({
    diasAtrasoMin: this.fb.control<number | null>(null, [Validators.min(0)]),
    diasAtrasoMax: this.fb.control<number | null>(null, [Validators.min(0)]),
    status: this.fb.nonNullable.control<StatusParcela | ''>(''),
  });

  // ===== agregados, todos somados da lista =====

  protected readonly totalEmAtraso = computed(() =>
    this.linhas().reduce((soma, l) => soma + l.valorOriginal, 0),
  );

  protected readonly faixas = computed<Faixa[]>(() => {
    const total = this.totalEmAtraso();
    return FAIXAS.map((f) => {
      const linhas = this.linhas().filter((l) => l.diasAtraso >= f.min && l.diasAtraso <= f.max);
      const valor = linhas.reduce((soma, l) => soma + l.valorOriginal, 0);
      return {
        chave: f.chave,
        rotulo: f.rotulo,
        valor,
        quantidade: linhas.length,
        percentual: total > 0 ? Math.round((valor / total) * 1000) / 10 : 0,
        tom: TOM_FAIXA[f.chave],
        cor: f.cor,
      };
    });
  });

  // Rosca em conic-gradient: cada faixa recebe o ângulo do seu percentual, começando em
  // 12 horas e sem sobreposição.
  protected readonly anelGradiente = computed(() => {
    const faixas = this.faixas().filter((f) => f.valor > 0);
    const total = faixas.reduce((s, f) => s + f.valor, 0);
    if (!total) return 'conic-gradient(rgb(20 51 82 / 90%) 0deg 360deg)';
    let acumulado = 0;
    const partes = faixas.map((f) => {
      const inicio = acumulado;
      acumulado += (f.valor / total) * 360;
      return `${f.cor} ${inicio.toFixed(2)}deg ${acumulado.toFixed(2)}deg`;
    });
    return `conic-gradient(from 0deg, ${partes.join(', ')})`;
  });

  // Exposição por contrato: as cinco maiores somas de valor em atraso.
  protected readonly exposicao = computed<ExposicaoContrato[]>(() => {
    const mapa = new Map<string, { tipo: string; valor: number; parcelas: number }>();
    for (const l of this.linhas()) {
      const chave = l.contratoCurto ?? idCurto(l.contratoId);
      const atual = mapa.get(chave) ?? { tipo: l.contratoTipo ?? '—', valor: 0, parcelas: 0 };
      atual.valor += l.valorOriginal;
      atual.parcelas += 1;
      mapa.set(chave, atual);
    }
    const lista = [...mapa.entries()]
      .map(([contrato, d]) => ({ contrato, ...d }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
    const maior = Math.max(...lista.map((l) => l.valor), 1);
    return lista.map((l) => ({ ...l, proporcao: Math.round((l.valor / maior) * 100) }));
  });

  // ===== tabela paginada =====

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.linhas().length / POR_PAGINA)),
  );

  protected readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  protected readonly pagina1Base = computed(() => (this.paginaAtual() - 1) * POR_PAGINA + 1);

  protected readonly linhasVisiveis = computed(() => {
    const inicio = (this.paginaAtual() - 1) * POR_PAGINA;
    return this.linhas().slice(inicio, inicio + POR_PAGINA);
  });

  protected readonly ultimaVisivel = computed(() =>
    Math.min(this.paginaAtual() * POR_PAGINA, this.linhas().length),
  );

  protected readonly paginas = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1),
  );

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    if (this.filtros.invalid) {
      this.filtros.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const { diasAtrasoMin, diasAtrasoMax, status } = this.filtros.getRawValue();
    const params: ListarInadimplenciaParams = {
      diasAtrasoMin: diasAtrasoMin ?? undefined,
      diasAtrasoMax: diasAtrasoMax ?? undefined,
      status: status || undefined,
    };
    this.cobranca.listarInadimplencia(params).subscribe({
      next: (linhas) => {
        this.linhas.set(linhas);
        this.pagina.set(1);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          mensagemCobrancaErro(err, 'Não foi possível carregar a inadimplência.'),
        );
      },
    });
  }

  limparFiltros(): void {
    this.filtros.reset({ diasAtrasoMin: null, diasAtrasoMax: null, status: '' });
    this.carregar();
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.pagina.set(pagina);
  }

  abrirParcela(parcelaId: string): void {
    void this.router.navigate(['/app/cobranca/financeiro/parcelas', parcelaId]);
  }

  alternarMenuLinha(parcelaId: string): void {
    this.menuLinha.update((atual) => (atual === parcelaId ? null : parcelaId));
  }

  copiar(valor: string | undefined | null, chave: string): void {
    if (!valor) return;
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  // Exportação em CSV com as linhas que a tela mostra: não há endpoint de relatório.
  exportar(): void {
    const cabecalho = gerarLinhaCsv([
      'parcela',
      'codigo',
      'contrato',
      'tipo',
      'tomador',
      'documento',
      'vencimento',
      'diasAtraso',
      'valor',
      'status',
    ]);
    const linhas = this.linhas().map((l) =>
      gerarLinhaCsv([
        `${l.numeroParcela}/${l.totalParcelas ?? ''}`,
        l.codigoParcela ?? '',
        l.contratoCurto ?? idCurto(l.contratoId),
        l.contratoTipo ?? '',
        l.tomadorNome ?? '',
        l.tomadorDocumento ?? '',
        l.dataVencimento,
        String(l.diasAtraso),
        String(l.valorOriginal).replace('.', ','),
        l.status,
      ]),
    );
    const blob = new Blob([`\uFEFF${[cabecalho, ...linhas].join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'inadimplencia.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  statusRotulo(status: StatusParcela): string {
    return status === 'INADIMPLENTE' ? 'Inadimplente' : 'Atrasada';
  }

  statusTom(status: StatusParcela): 'red' | 'orange' {
    return status === 'INADIMPLENTE' ? 'red' : 'orange';
  }

  texto(valor: string | undefined | null): string {
    if (!valor) return '—';
    return valor;
  }

  moeda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return '—';
    return formatarMoeda(valor);
  }

  parcelaRotulo(l: InadimplenciaResponse): string {
    return l.totalParcelas
      ? `Parcela ${l.numeroParcela}/${l.totalParcelas}`
      : `Parcela ${l.numeroParcela}`;
  }
}

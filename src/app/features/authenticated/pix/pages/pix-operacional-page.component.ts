import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { formatarCelulaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import {
  AtividadePix,
  DIAS_TRANSFERENCIAS,
  ESCALA_TRANSFERENCIAS,
  SERIES_TRANSFERENCIAS,
  SEVERIDADE_ALERTA_LABEL,
  SeveridadeAlerta,
  TipoAtividade,
  TomPix,
  carregarPainelPix,
} from '../shared/pix-operacional-dados';
import { SepArteComponent } from '../../../../shared/arte/sep-arte.component';

// Geometria do grafico de transferencias: eixo y de 0 a 400, como no mockup.
const GRAFICO = { largura: 420, base: 128, topo: 10, maximo: 400 } as const;

const TONS: Record<TomPix, string> = {
  blue: 'var(--sep-accent)',
  cyan: 'var(--sep-tint-cyan)',
  green: 'var(--sep-success)',
  orange: 'var(--sep-warning)',
  red: 'var(--sep-danger)',
  purple: 'var(--sep-purple)',
};

@Component({
  selector: 'sep-pix-operacional-page',
  imports: [SepArteComponent, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './pix-operacional-page.component.html',
  styleUrl: './pix-operacional-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixOperacionalPageComponent {
  private readonly router = inject(Router);

  protected readonly assetBase = '/image/sep_mockup_20_assets';
  protected readonly severidadeLabel = SEVERIDADE_ALERTA_LABEL;
  protected readonly dias = DIAS_TRANSFERENCIAS;
  protected readonly escala = ESCALA_TRANSFERENCIAS;

  private readonly painel = signal(carregarPainelPix());

  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly diaSelecionado = signal<number | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly provider = computed(() => this.painel().provider);
  protected readonly metricas = computed(() => this.painel().metricas);
  protected readonly conciliacao = computed(() => this.painel().conciliacao);
  protected readonly alertas = computed(() => this.painel().alertas);
  protected readonly atividades = computed(() => this.painel().atividades);
  protected readonly integracoes = computed(() => this.painel().integracoes);

  // ---- Volume 24h -------------------------------------------------------------------------
  protected readonly totalVolume = computed(() =>
    this.painel().volume24h.reduce((soma, faixa) => soma + faixa.valor, 0),
  );

  protected readonly volume = computed(() =>
    this.painel().volume24h.map((faixa) => ({
      ...faixa,
      percentual: this.percentual(faixa.valor, this.totalVolume()),
    })),
  );

  // `from 0deg` faz a primeira fatia comecar as 12 horas, como no mockup.
  protected readonly donutVolume = computed(() => {
    const total = this.totalVolume() || 1;
    const meiaSeparacao = 1.75;
    let inicio = 0;
    const partes = this.painel().volume24h.map((faixa) => {
      const fim = inicio + (faixa.valor / total) * 360;
      // Uma abertura de 3,5 graus na cor do nucleo separa visualmente cada fatia, como no mockup.
      const trecho = [
        `var(--sep-surface-sunken) ${inicio.toFixed(2)}deg ${(inicio + meiaSeparacao).toFixed(2)}deg`,
        `${TONS[faixa.tom]} ${(inicio + meiaSeparacao).toFixed(2)}deg ${(fim - meiaSeparacao).toFixed(2)}deg`,
        `var(--sep-surface-sunken) ${(fim - meiaSeparacao).toFixed(2)}deg ${fim.toFixed(2)}deg`,
      ].join(', ');
      inicio = fim;
      return trecho;
    });
    return `conic-gradient(from 0deg, ${partes.join(', ')})`;
  });

  // ---- Grafico de transferencias ------------------------------------------------------------
  protected readonly series = computed(() => [
    {
      chave: 'desembolsos',
      rotulo: 'Desembolsos',
      tom: 'blue' as TomPix,
      valores: SERIES_TRANSFERENCIAS.desembolsos,
    },
    {
      chave: 'recebimentos',
      rotulo: 'Recebimentos',
      tom: 'green' as TomPix,
      valores: SERIES_TRANSFERENCIAS.recebimentos,
    },
    {
      chave: 'divergencias',
      rotulo: 'Divergências',
      tom: 'orange' as TomPix,
      valores: SERIES_TRANSFERENCIAS.divergencias,
    },
  ]);

  // Linhas (desembolsos e recebimentos) e barras (divergencias), como no mockup.
  protected readonly linhas = computed(() =>
    this.series()
      .filter((serie) => serie.chave !== 'divergencias')
      .map((serie) => ({
        ...serie,
        pontos: this.pontos(serie.valores),
        marcas: this.coordenadas(serie.valores),
      })),
  );

  protected readonly barras = computed(() => {
    const passo = GRAFICO.largura / (this.dias.length - 1);
    const largura = 11;
    return SERIES_TRANSFERENCIAS.divergencias.map((valor, indice) => {
      // As barras usam escala propria de 0 a 100, como no mockup; compartilhar o teto 400 das
      // curvas transformava divergencias de 11 a 18 em riscos quase invisiveis.
      const alturaPlot = GRAFICO.base - GRAFICO.topo;
      const y = Number((GRAFICO.base - (valor / 100) * alturaPlot).toFixed(2));
      return {
        indice,
        x: Number((indice * passo - largura / 2).toFixed(2)),
        y,
        largura,
        altura: Number((GRAFICO.base - y).toFixed(2)),
      };
    });
  });

  protected readonly linhasGrade = computed(() =>
    this.escala.map((_, indice) => {
      const y = GRAFICO.topo + (indice * (GRAFICO.base - GRAFICO.topo)) / (this.escala.length - 1);
      return { y };
    }),
  );

  // Balao do dia sob o cursor, com os tres valores daquele ponto.
  protected readonly detalheDia = computed(() => {
    const indice = this.diaSelecionado();
    if (indice === null) return null;
    return {
      dia: this.dias[indice],
      // Posicao relativa no eixo x, para o balao acompanhar o ponto.
      posicao: (indice / (this.dias.length - 1)) * 100,
      valores: this.series().map((serie) => ({
        rotulo: serie.rotulo,
        tom: serie.tom,
        valor: serie.valores[indice],
      })),
    };
  });

  protected destacarDia(indice: number): void {
    this.diaSelecionado.set(indice);
  }

  protected limparDia(): void {
    this.diaSelecionado.set(null);
  }

  // ---- Acoes --------------------------------------------------------------------------------
  protected novoDesembolso(): void {
    void this.router.navigate(['/app/pix/desembolsos'], { queryParams: { novo: 1 } });
  }

  protected exportarRelatorio(): void {
    const cabecalho = ['Dia', 'Desembolsos', 'Recebimentos', 'Divergências'];
    const linhas = this.dias.map((dia, indice) => [
      dia,
      String(SERIES_TRANSFERENCIAS.desembolsos[indice]),
      String(SERIES_TRANSFERENCIAS.recebimentos[indice]),
      String(SERIES_TRANSFERENCIAS.divergencias[indice]),
    ]);
    const csv = [cabecalho, ...linhas]
      .map((colunas) => colunas.map((valor) => formatarCelulaCsv(valor)).join(';'))
      .join('\r\n');
    // BOM para o Excel em pt-BR reconhecer os acentos.

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pix-transferencias-7-dias.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.anunciar(`Relatório dos últimos ${this.dias.length} dias exportado.`);
  }

  private anunciar(mensagem: string): void {
    this.aviso.set(mensagem);
    window.setTimeout(
      () => this.aviso.update((atual) => (atual === mensagem ? null : atual)),
      5200,
    );
  }

  // ---- Apresentacao -------------------------------------------------------------------------
  protected moeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  protected numero(valor: number): string {
    return new Intl.NumberFormat('pt-BR').format(valor);
  }

  protected cor(tom: TomPix): string {
    return TONS[tom];
  }

  protected tomSeveridade(severidade: SeveridadeAlerta): TomPix {
    const tons: Record<SeveridadeAlerta, TomPix> = {
      CRITICA: 'red',
      ALTA: 'orange',
      MEDIA: 'blue',
    };
    return tons[severidade];
  }

  protected iconeAlerta(severidade: SeveridadeAlerta): string {
    const nomes: Record<SeveridadeAlerta, string> = {
      CRITICA: 'circle-alert',
      ALTA: 'triangle-alert',
      MEDIA: 'clock-alert',
    };
    return nomes[severidade];
  }

  protected iconeAtividade(tipo: TipoAtividade): string {
    const nomes: Record<TipoAtividade, string> = {
      RECEBIMENTO_CONCILIADO: 'circle-check',
      DESEMBOLSO_REALIZADO: 'send',
      DIVERGENCIA: 'triangle-alert',
    };
    return nomes[tipo];
  }

  protected tomAtividade(atividade: AtividadePix): TomPix {
    if (atividade.tipo === 'DIVERGENCIA') return 'orange';
    return atividade.tipo === 'DESEMBOLSO_REALIZADO' ? 'blue' : 'green';
  }

  // Sparkline do cartao do provider: normalizada na caixa, do menor ao maior tempo medido.
  protected sparkline(valores: readonly number[]): string {
    const maximo = Math.max(...valores, 1);
    const minimo = Math.min(...valores);
    const faixa = Math.max(maximo - minimo, 1);
    const passo = 120 / (valores.length - 1);
    return valores
      .map(
        (valor, indice) =>
          `${(indice * passo).toFixed(2)},${(26 - ((valor - minimo) / faixa) * 22).toFixed(2)}`,
      )
      .join(' ');
  }

  // Medidor em arco de 180 graus dos indicadores de conciliacao. O trecho desenhado nunca passa
  // de meia volta, entao `large-arc-flag` e sempre 0: com 1 acima de 50% o navegador desenhava o
  // caminho longo e o arco aparecia partido em dois pedacos.
  protected arco(percentual: number): string {
    const raio = 34;
    const fracao = Math.min(Math.max(percentual, 0), 100) / 100;
    const angulo = Math.PI * (1 - fracao);
    const x = 40 + raio * Math.cos(angulo);
    const y = 40 - raio * Math.sin(angulo);
    return `M 6 40 A ${raio} ${raio} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  }

  private percentual(valor: number, total: number): string {
    if (total === 0) return '0,0%';
    return `${((valor / total) * 100).toFixed(1).replace('.', ',')}%`;
  }

  private alturaDe(valor: number): number {
    const altura = GRAFICO.base - GRAFICO.topo;
    return Number((GRAFICO.base - (valor / GRAFICO.maximo) * altura).toFixed(2));
  }

  private coordenadas(valores: readonly number[]): { x: number; y: number }[] {
    const passo = GRAFICO.largura / (valores.length - 1);
    return valores.map((valor, indice) => ({
      x: Number((indice * passo).toFixed(2)),
      y: this.alturaDe(valor),
    }));
  }

  private pontos(valores: readonly number[]): string {
    return this.coordenadas(valores)
      .map((ponto) => `${ponto.x},${ponto.y}`)
      .join(' ');
  }
}

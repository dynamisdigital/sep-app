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

import { RecebimentoResponse, StatusParcela } from '../../../../core/api/api.models';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { gerarLinhaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import {
  formatarData,
  formatarMoeda,
  idCurto,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

type Situacao = 'PAGO' | 'A_VENCER' | 'ATRASADO';

interface FatiaStatus {
  chave: Situacao;
  rotulo: string;
  valor: number;
  quantidade: number;
  percentual: number;
  tom: 'green' | 'blue' | 'red';
}

interface FatiaMetodo {
  metodo: string;
  valor: number;
  percentual: number;
}

interface PontoEvolucao {
  dia: string;
  valor: number;
  x: number;
  y: number;
}

const ROTULO_SITUACAO: Record<Situacao, string> = {
  PAGO: 'Pago',
  A_VENCER: 'A vencer',
  ATRASADO: 'Em atraso',
};

const TOM_SITUACAO: Record<Situacao, 'green' | 'blue' | 'red'> = {
  PAGO: 'green',
  A_VENCER: 'blue',
  ATRASADO: 'red',
};

// Status de parcela que contam como pagos ou atrasados na visão financeira. A tela não
// decide status: apenas agrupa o que o backend devolveu em cada recebimento.
const PAGOS = new Set<StatusParcela>(['PAGA', 'PARCIALMENTE_PAGA']);
const ATRASADOS = new Set<StatusParcela>(['ATRASADA', 'INADIMPLENTE']);

// Cinco linhas por pagina: e o que o desenho mostra na tabela, e o que mantem a tela
// inteira dentro da area util do shell homologado.
const POR_PAGINA = 5;
const DIAS_EVOLUCAO = 7;

// Agenda financeira (Mockup 29): recebimentos registrados, agregados da carteira e acesso
// a uma parcela por id. O backend não expõe lista global de agendas nem endpoint de
// agregados nesta fase, então todo número da tela — métricas, roscas, barras, evolução e
// próximos vencimentos — é somado a partir da própria lista de recebimentos, o que mantém
// os totais coerentes entre si. Status e valores pertencem ao backend.
@Component({
  selector: 'sep-agenda-financeira-page',
  imports: [RouterLink, ReactiveFormsModule, LucideAngularModule, OperationalShellComponent],
  templateUrl: './agenda-financeira-page.component.html',
  styleUrl: './agenda-financeira-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaFinanceiraPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cobranca = inject(CobrancaService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly recebimentos = signal<RecebimentoResponse[]>([]);
  protected readonly pagina = signal(1);
  protected readonly copiado = signal<string | null>(null);

  protected readonly formatarData = formatarData;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  protected readonly lookupForm = this.fb.group({
    parcelaId: this.fb.nonNullable.control('', [Validators.required]),
  });

  // ===== agregados, todos somados da lista =====

  private readonly comSituacao = computed(() =>
    this.recebimentos().map((r) => ({ r, situacao: this.situacaoDe(r) })),
  );

  protected readonly totalCarteira = computed(() =>
    this.comSituacao().reduce((soma, { r }) => soma + this.valorDe(r), 0),
  );

  protected readonly fatias = computed<FatiaStatus[]>(() => {
    const total = this.totalCarteira();
    const chaves: Situacao[] = ['PAGO', 'A_VENCER', 'ATRASADO'];
    return chaves.map((chave) => {
      const linhas = this.comSituacao().filter((l) => l.situacao === chave);
      const valor = linhas.reduce((soma, { r }) => soma + this.valorDe(r), 0);
      return {
        chave,
        rotulo: ROTULO_SITUACAO[chave],
        valor,
        quantidade: linhas.length,
        percentual: total > 0 ? Math.round((valor / total) * 1000) / 10 : 0,
        tom: TOM_SITUACAO[chave],
      };
    });
  });

  // Rosca em conic-gradient: cada fatia recebe o ângulo do seu percentual, começando
  // em 12 horas e sem sobreposição.
  protected readonly anelGradiente = computed(() => {
    const fatias = this.fatias().filter((f) => f.valor > 0);
    const total = fatias.reduce((s, f) => s + f.valor, 0);
    if (!total) return 'conic-gradient(rgb(20 51 82 / 90%) 0deg 360deg)';
    const cores: Record<'green' | 'blue' | 'red', string> = {
      green: 'var(--sep-success)',
      blue: 'var(--sep-accent)',
      red: 'var(--sep-danger)',
    };
    let acumulado = 0;
    const partes = fatias.map((f) => {
      const inicio = acumulado;
      acumulado += (f.valor / total) * 360;
      return `${cores[f.tom]} ${inicio.toFixed(2)}deg ${acumulado.toFixed(2)}deg`;
    });
    return `conic-gradient(from 0deg, ${partes.join(', ')})`;
  });

  protected readonly recebidoHoje = computed(() => {
    const hoje = this.hojeReferencia();
    return this.comSituacao()
      .filter(
        (l) =>
          l.situacao === 'PAGO' && this.mesmoDia(l.r.dataPagamento ?? l.r.dataRecebimento, hoje),
      )
      .reduce((soma, { r }) => soma + this.valorDe(r), 0);
  });

  // Recebimentos dos ultimos 30 dias contados da referencia da propria lista. Somar todos
  // os pagos daria o recebido historico, nao o do mes — o rotulo da metrica seria falso.
  private readonly pagosDoMes = computed(() => {
    const hoje = this.hojeReferencia().getTime();
    const janela = 30 * 24 * 60 * 60 * 1000;
    return this.comSituacao().filter((l) => {
      if (l.situacao !== 'PAGO') return false;
      const quando = this.tempo(l.r.dataPagamento ?? l.r.dataRecebimento);
      return !isNaN(quando) && hoje - quando <= janela && quando <= hoje;
    });
  });

  protected readonly recebidoMes = computed(() =>
    this.pagosDoMes().reduce((soma, { r }) => soma + this.valorDe(r), 0),
  );

  protected readonly parcelasPagasMes = computed(() => this.pagosDoMes().length);

  protected readonly aVencer = computed(() => this.fatias().find((f) => f.chave === 'A_VENCER'));
  protected readonly emAtraso = computed(() => this.fatias().find((f) => f.chave === 'ATRASADO'));

  protected readonly porMetodo = computed<FatiaMetodo[]>(() => {
    const mapa = new Map<string, number>();
    for (const { r } of this.comSituacao()) {
      const metodo = (r.meioPagamento || 'OUTROS').toUpperCase();
      mapa.set(metodo, (mapa.get(metodo) ?? 0) + this.valorDe(r));
    }
    const total = [...mapa.values()].reduce((s, v) => s + v, 0);
    return [...mapa.entries()]
      .map(([metodo, valor]) => ({
        metodo,
        valor,
        percentual: total > 0 ? Math.round((valor / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  });

  // Série dos últimos sete dias com os recebimentos efetivamente pagos.
  protected readonly evolucao = computed<PontoEvolucao[]>(() => {
    const hoje = this.hojeReferencia();
    const dias: { dia: Date; valor: number }[] = [];
    for (let i = DIAS_EVOLUCAO - 1; i >= 0; i -= 1) {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - i);
      const valor = this.comSituacao()
        .filter(
          (l) =>
            l.situacao === 'PAGO' && this.mesmoDia(l.r.dataPagamento ?? l.r.dataRecebimento, dia),
        )
        .reduce((soma, { r }) => soma + this.valorDe(r), 0);
      dias.push({ dia, valor });
    }
    const maior = Math.max(...dias.map((d) => d.valor), 1);
    const topo = Math.ceil(maior / 1000) * 1000 || 1000;
    return dias.map((d, i) => ({
      dia: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d.dia),
      valor: d.valor,
      x: (i / (DIAS_EVOLUCAO - 1)) * 100,
      y: 100 - (d.valor / topo) * 100,
    }));
  });

  protected readonly evolucaoMaximo = computed(() =>
    Math.max(...this.evolucao().map((p) => p.valor), 1),
  );

  // Escala Y do gráfico: quatro marcas do zero ao pico, arredondadas para o milhar mais
  // próximo, com as linhas de grade nas mesmas alturas.
  protected readonly escalaY = computed(() => {
    const maximo = this.evolucaoMaximo();
    const topo = Math.ceil(maximo / 1000) * 1000 || 1000;
    return [3, 2, 1, 0].map((i) => {
      const valor = (topo / 3) * i;
      return {
        valor,
        rotulo:
          valor >= 1000
            ? `R$ ${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
            : `R$ ${Math.round(valor)}`,
        y: 100 - (valor / topo) * 100,
      };
    });
  });

  protected readonly evolucaoTopo = computed(
    () => Math.ceil(this.evolucaoMaximo() / 1000) * 1000 || 1000,
  );

  protected readonly evolucaoLinha = computed(() =>
    this.evolucao()
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' '),
  );

  protected readonly evolucaoArea = computed(() => {
    const pontos = this.evolucao();
    if (!pontos.length) return '';
    return `0,100 ${this.evolucaoLinha()} 100,100`;
  });

  protected readonly proximosVencimentos = computed(() =>
    this.comSituacao()
      .filter((l) => l.situacao === 'A_VENCER')
      .sort((a, b) => this.tempo(a.r.vencimento) - this.tempo(b.r.vencimento))
      .slice(0, 3)
      .map(({ r }) => ({
        parcelaId: r.parcelaId,
        vencimento: r.vencimento,
        valor: this.valorDe(r),
        dias: this.diasAte(r.vencimento),
      })),
  );

  // ===== tabela paginada =====

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.recebimentos().length / POR_PAGINA)),
  );

  protected readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  protected readonly linhas = computed(() => {
    const inicio = (this.paginaAtual() - 1) * POR_PAGINA;
    return this.recebimentos()
      .slice(inicio, inicio + POR_PAGINA)
      .map((r) => ({ r, situacao: this.situacaoDe(r) }));
  });

  protected readonly paginas = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1),
  );

  protected readonly exibindo = computed(() => this.linhas().length);
  protected readonly porPagina = POR_PAGINA;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cobranca.listarRecebimentos().subscribe({
      next: (recebimentos) => {
        this.recebimentos.set(recebimentos);
        this.pagina.set(1);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          mensagemCobrancaErro(err, 'Não foi possível carregar os recebimentos.'),
        );
      },
    });
  }

  abrirParcela(): void {
    // required aceita string só com espaços; valida o id já sem espaços pra não
    // navegar para uma rota com segmento vazio.
    const parcelaId = this.lookupForm.getRawValue().parcelaId.trim();
    if (!parcelaId) {
      this.lookupForm.markAllAsTouched();
      return;
    }
    void this.router.navigate(['/app/cobranca/financeiro/parcelas', parcelaId]);
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.pagina.set(pagina);
  }

  // Exportação em CSV com as linhas que a tela mostra: não há endpoint de relatório.
  exportar(): void {
    const cabecalho = gerarLinhaCsv([
      'parcelaId',
      'contrato',
      'recebedor',
      'vencimento',
      'valor',
      'pagamento',
      'status',
      'metodo',
    ]);
    const linhas = this.recebimentos().map((r) =>
      gerarLinhaCsv([
        r.parcelaId,
        r.contrato ?? '',
        r.recebedor ?? '',
        r.vencimento ?? '',
        String(this.valorDe(r)).replace('.', ','),
        r.dataPagamento ?? '',
        r.statusParcela,
        r.meioPagamento,
      ]),
    );
    const blob = new Blob([`\uFEFF${[cabecalho, ...linhas].join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'agenda-financeira.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  copiar(valor: string | undefined | null, chave: string): void {
    if (!valor) return;
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  abrirLinha(parcelaId: string): void {
    void this.router.navigate(['/app/cobranca/financeiro/parcelas', parcelaId]);
  }

  situacaoRotulo(situacao: Situacao): string {
    return situacao === 'A_VENCER' ? 'A VENCER' : situacao === 'PAGO' ? 'PAGO' : 'ATRASADO';
  }

  situacaoTom(situacao: Situacao): 'green' | 'blue' | 'red' {
    return TOM_SITUACAO[situacao];
  }

  texto(valor: string | undefined | null): string {
    if (!valor) return '—';
    return valor;
  }

  data(iso: string | undefined | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return iso;
    }
  }

  dataHora(iso: string | undefined | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  }

  moeda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return '—';
    return formatarMoeda(valor);
  }

  // ===== auxiliares =====

  private situacaoDe(r: RecebimentoResponse): Situacao {
    if (PAGOS.has(r.statusParcela)) return 'PAGO';
    if (ATRASADOS.has(r.statusParcela)) return 'ATRASADO';
    return 'A_VENCER';
  }

  // Pago usa o valor recebido; em aberto usa o valor da parcela, quando o backend o envia.
  private valorDe(r: RecebimentoResponse): number {
    if (PAGOS.has(r.statusParcela)) return r.valorRecebido;
    return r.valorParcela ?? r.valorRecebido;
  }

  // Referência de "hoje" tirada do dado, não do relógio: mantém a tela estável. Só as
  // datas de pagamento entram — usar qualquer data jogava a referência para um vencimento
  // futuro e zerava a evolução, a métrica do dia e os prazos dos próximos vencimentos.
  private hojeReferencia(): Date {
    const pagamentos = this.recebimentos()
      .filter((r) => PAGOS.has(r.statusParcela))
      .map((r) => this.tempo(r.dataPagamento ?? r.dataRecebimento))
      .filter((t) => !isNaN(t));
    if (pagamentos.length) return new Date(Math.max(...pagamentos));
    const todas = this.recebimentos()
      .map((r) => this.tempo(r.dataRecebimento))
      .filter((t) => !isNaN(t));
    return todas.length ? new Date(Math.min(...todas)) : new Date();
  }

  private tempo(iso: string | undefined | null): number {
    if (!iso) return NaN;
    return new Date(iso).getTime();
  }

  private mesmoDia(iso: string | undefined | null, dia: Date): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    return (
      d.getFullYear() === dia.getFullYear() &&
      d.getMonth() === dia.getMonth() &&
      d.getDate() === dia.getDate()
    );
  }

  private diasAte(iso: string | undefined | null): number {
    if (!iso) return 0;
    const alvo = new Date(iso);
    const hoje = this.hojeReferencia();
    return Math.max(0, Math.round((alvo.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000)));
  }
}

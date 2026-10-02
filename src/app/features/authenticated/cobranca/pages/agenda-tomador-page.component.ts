import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  AgendaPagamentoResponse,
  ParcelaResponse,
  StatusParcela,
} from '../../../../core/api/api.models';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { gerarLinhaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import {
  STATUS_PARCELA_LABEL,
  formatarData,
  formatarDataLocal,
  formatarMoeda,
  idCurto,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

type Aba = 'TODAS' | 'EM_DIA' | 'A_VENCER' | 'ATRASADAS' | 'PAGAS';

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'TODAS', rotulo: 'Todas' },
  { chave: 'EM_DIA', rotulo: 'Em dia' },
  { chave: 'A_VENCER', rotulo: 'A vencer' },
  { chave: 'ATRASADAS', rotulo: 'Atrasadas' },
  { chave: 'PAGAS', rotulo: 'Pagas' },
];

const POR_PAGINA = 10;

// Tom semantico por status, no mesmo vocabulario de cor do restante da Cobranca.
const TOM: Record<StatusParcela, 'green' | 'blue' | 'orange' | 'red' | 'purple'> = {
  PAGA: 'green',
  PENDENTE: 'blue',
  ATRASADA: 'orange',
  INADIMPLENTE: 'red',
  PARCIALMENTE_PAGA: 'blue',
  EM_NEGOCIACAO: 'purple',
  RENEGOCIADA: 'blue',
};

// Agenda de pagamento do contrato (Mockup 32). O backend devolve a agenda pronta — status,
// dias de atraso e composicao de cada parcela vem dele. A tela apenas agrupa: as metricas,
// a liquidez, as proximas parcelas e as parcelas em atraso sao somadas da propria lista
// devolvida, o que mantem os numeros coerentes entre si e com a Cobranca. 404 vira estado
// de agenda indisponivel; 403 e tratado pelo errorInterceptor global.
@Component({
  selector: 'sep-agenda-tomador-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './agenda-tomador-page.component.html',
  styleUrl: './agenda-tomador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaTomadorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cobranca = inject(CobrancaService);
  private readonly router = inject(Router);

  protected contratoId = '';

  protected readonly abas = ABAS;
  protected readonly porPagina = POR_PAGINA;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly indisponivel = signal(false);
  protected readonly agenda = signal<AgendaPagamentoResponse | null>(null);
  protected readonly aba = signal<Aba>('TODAS');
  protected readonly pagina = signal(1);
  protected readonly copiado = signal<string | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarDataLocal = formatarDataLocal;
  protected readonly idCurto = idCurto;

  protected readonly parcelas = computed<ParcelaResponse[]>(() => this.agenda()?.parcelas ?? []);

  protected readonly contratoCurto = computed(() => {
    const a = this.agenda();
    if (!a) return '';
    return a.contratoCurto ?? idCurto(a.contratoId);
  });

  // ===== agregados, todos somados da própria lista =====

  private soma(filtro: (p: ParcelaResponse) => boolean): number {
    return (
      Math.round(
        this.parcelas()
          .filter(filtro)
          .reduce((s, p) => s + p.total, 0) * 100,
      ) / 100
    );
  }

  private quantidade(filtro: (p: ParcelaResponse) => boolean): number {
    return this.parcelas().filter(filtro).length;
  }

  protected readonly paga = (p: ParcelaResponse) => p.status === 'PAGA';
  protected readonly emAtraso = (p: ParcelaResponse) => (p.diasAtraso ?? 0) > 0;
  protected readonly aVencer = (p: ParcelaResponse) =>
    p.status !== 'PAGA' && (p.diasAtraso ?? 0) === 0;

  protected readonly totalRecebido = computed(() => this.soma(this.paga));
  protected readonly totalEmAberto = computed(() => this.soma((p) => !this.paga(p)));
  protected readonly totalAtrasado = computed(() => this.soma(this.emAtraso));
  protected readonly totalAVencer = computed(() => this.soma(this.aVencer));

  protected readonly qtdEmAberto = computed(() => this.quantidade((p) => !this.paga(p)));
  protected readonly qtdAtrasado = computed(() => this.quantidade(this.emAtraso));
  protected readonly qtdAVencer = computed(() => this.quantidade(this.aVencer));

  protected readonly valorContratado = computed(
    () => this.agenda()?.valorContratado ?? this.agenda()?.valorTotal ?? 0,
  );

  protected readonly percentualRecebido = computed(() => {
    const contratado = this.valorContratado();
    if (!contratado) return 0;
    return Math.round((this.totalRecebido() / contratado) * 1000) / 10;
  });

  // Liquidez do contrato: proporção já liquidada da agenda. O rótulo é apenas leitura
  // dessa proporção — nenhum julgamento de risco é feito aqui.
  protected readonly liquidez = computed(() => {
    const total = this.parcelas().length;
    if (!total) return 0;
    return Math.round((this.quantidade(this.paga) / total) * 100);
  });

  protected readonly liquidezRotulo = computed(() => {
    const valor = this.liquidez();
    if (valor >= 70) return 'Boa';
    if (valor >= 40) return 'Regular';
    return 'Baixa';
  });

  protected readonly liquidezTom = computed<'green' | 'orange' | 'red'>(() => {
    const valor = this.liquidez();
    if (valor >= 70) return 'green';
    if (valor >= 40) return 'orange';
    return 'red';
  });

  protected readonly anelLiquidez = computed(() => {
    const grau = (this.liquidez() / 100) * 360;
    const cor =
      this.liquidezTom() === 'green'
        ? 'var(--sep-success)'
        : this.liquidezTom() === 'orange'
          ? 'var(--sep-warning)'
          : 'var(--sep-danger)';
    return `conic-gradient(from 0deg, ${cor} 0deg ${grau.toFixed(2)}deg, rgb(20 51 82 / 85%) ${grau.toFixed(2)}deg 360deg)`;
  });

  // ===== listas laterais =====

  protected readonly proximasParcelas = computed(() =>
    this.parcelas()
      .filter(this.aVencer)
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      .slice(0, 2),
  );

  protected readonly parcelasEmAtraso = computed(() =>
    this.parcelas()
      .filter(this.emAtraso)
      .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0))
      .slice(0, 2),
  );

  // Dias até o vencimento de uma parcela ainda não vencida, medidos da própria agenda:
  // a referência é a maior data já paga ou vencida da lista, nunca o relógio do browser.
  protected readonly referencia = computed(() => {
    const vencidas = this.parcelas()
      .filter((p) => this.paga(p) || this.emAtraso(p))
      .map((p) => p.dataVencimento)
      .sort();
    return vencidas.length ? vencidas[vencidas.length - 1] : null;
  });

  protected diasAte(parcela: ParcelaResponse): number | null {
    const base = this.referencia();
    if (!base) return null;
    const dia = 24 * 60 * 60 * 1000;
    const diff = Math.round(
      (new Date(`${parcela.dataVencimento}T00:00:00-03:00`).getTime() -
        new Date(`${base}T00:00:00-03:00`).getTime()) /
        dia,
    );
    return diff > 0 ? diff : null;
  }

  // ===== tabela com abas e paginação =====

  protected readonly filtradas = computed(() => {
    const aba = this.aba();
    return this.parcelas().filter((p) => {
      if (aba === 'PAGAS') return this.paga(p);
      if (aba === 'ATRASADAS') return this.emAtraso(p);
      if (aba === 'A_VENCER') return this.aVencer(p);
      if (aba === 'EM_DIA') return this.paga(p) || this.aVencer(p);
      return true;
    });
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtradas().length / POR_PAGINA)),
  );

  protected readonly paginaAtual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  protected readonly visiveis = computed(() => {
    const inicio = (this.paginaAtual() - 1) * POR_PAGINA;
    return this.filtradas().slice(inicio, inicio + POR_PAGINA);
  });

  protected readonly primeiraVisivel = computed(() =>
    this.filtradas().length ? (this.paginaAtual() - 1) * POR_PAGINA + 1 : 0,
  );

  protected readonly ultimaVisivel = computed(() =>
    Math.min(this.paginaAtual() * POR_PAGINA, this.filtradas().length),
  );

  protected readonly paginas = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1),
  );

  ngOnInit(): void {
    this.contratoId = this.route.snapshot.paramMap.get('contratoId') ?? '';
    if (this.contratoId) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.indisponivel.set(false);
    this.cobranca.consultarAgendaPorContrato(this.contratoId).subscribe({
      next: (agenda) => {
        this.agenda.set(agenda);
        this.pagina.set(1);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.indisponivel.set(true);
          return;
        }
        this.errorMessage.set(mensagemCobrancaErro(err, 'Não foi possível carregar a agenda.'));
      },
    });
  }

  selecionarAba(aba: Aba): void {
    this.aba.set(aba);
    this.pagina.set(1);
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.pagina.set(pagina);
  }

  abrirParcela(parcelaId: string): void {
    void this.router.navigate(['/app/cobranca/financeiro/parcelas', parcelaId]);
  }

  copiar(valor: string | undefined | null, chave: string): void {
    if (!valor) return;
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  // Exportação em CSV das parcelas que a tela mostra: não há endpoint de relatório.
  exportar(): void {
    const cabecalho = gerarLinhaCsv([
      'parcela',
      'vencimento',
      'valor',
      'status',
      'diasAtraso',
      'recebidoEm',
      'meio',
    ]);
    const linhas = this.filtradas().map((p) =>
      gerarLinhaCsv([
        `${p.numero}/${this.agenda()?.numeroParcelas ?? ''}`,
        p.dataVencimento,
        String(p.total).replace('.', ','),
        p.status,
        String(p.diasAtraso ?? 0),
        p.dataPagamento ?? '',
        p.meioPagamento ?? '',
      ]),
    );
    const blob = new Blob([`\uFEFF${[cabecalho, ...linhas].join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-${this.contratoCurto()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  statusRotulo(status: StatusParcela): string {
    return STATUS_PARCELA_LABEL[status];
  }

  statusTom(parcela: ParcelaResponse): string {
    if (this.aVencer(parcela) && parcela.status !== 'PENDENTE') return 'blue';
    return TOM[parcela.status];
  }

  // Rótulo da coluna Status: "Em aberto" para as ainda não vencidas sem marcação própria.
  statusCelula(parcela: ParcelaResponse): string {
    if (this.paga(parcela)) return 'Paga';
    if (this.emAtraso(parcela)) return this.statusRotulo(parcela.status);
    return this.diasAte(parcela) === null ? 'Em aberto' : 'A vencer';
  }

  texto(valor: string | undefined | null): string {
    return valor ? valor : '—';
  }

  numero(valor: number | undefined | null): string {
    return valor === undefined || valor === null ? '—' : String(valor);
  }
}

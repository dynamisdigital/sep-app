import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  ComissoesResponse,
  StatusComissao,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { FaixaDonut } from '../../../shared/donut';
import {
  baixarCsv,
  formatarMes,
  formatarMoeda,
  formatarPercentual,
  moedaCurta,
  ROTULO_EVENTO_COMISSAO,
  ROTULO_STATUS_COMISSAO,
  TOM_STATUS_COMISSAO,
} from '../correspondentes/correspondentes.format';
import { BarraGrafico, CorBarrasComponent } from '../correspondentes/graficos/cor-barras.component';
import { CorDonutComponent } from '../correspondentes/graficos/cor-donut.component';

type FiltroStatus = 'TODAS' | StatusComissao;
const POR_PAGINA = 12;

// Comissoes (CORRESPONDENTE): acumulada, disponivel, paga e prevista, com o livro de lancamentos.
// Os valores sao calculados pelo backend a partir das regras vigentes; a tela so apresenta. O
// pagamento sera feito pelo Pix do SEP, sujeito a normativa e a legislacao.
@Component({
  selector: 'sep-comissoes-correspondente-page',
  imports: [
    OperationalShellComponent,
    RouterLink,
    LucideAngularModule,
    CorDonutComponent,
    CorBarrasComponent,
  ],
  templateUrl: './comissoes-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComissoesCorrespondentePageComponent implements OnInit {
  private readonly service = inject(CorrespondentesGestaoService);

  protected readonly comissoes = signal<ComissoesResponse | null>(null);
  protected readonly filtro = signal<FiltroStatus>('TODAS');
  protected readonly pagina = signal(1);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly moeda = formatarMoeda;
  protected readonly moedaCurta = moedaCurta;
  protected readonly pct = formatarPercentual;
  protected readonly rotuloStatus = ROTULO_STATUS_COMISSAO;
  protected readonly tomStatus = TOM_STATUS_COMISSAO;
  protected readonly rotuloEvento = ROTULO_EVENTO_COMISSAO;
  protected readonly mes = formatarMes;

  protected readonly filtros: { chave: FiltroStatus; rotulo: string }[] = [
    { chave: 'TODAS', rotulo: 'Todas' },
    { chave: 'PAGA', rotulo: 'Pagas' },
    { chave: 'DISPONIVEL', rotulo: 'Disponíveis' },
    { chave: 'PREVISTA', rotulo: 'Previstas' },
  ];

  protected readonly visiveis = computed(() => {
    const f = this.filtro();
    const filtrados = (this.comissoes()?.lancamentos ?? []).filter(
      (l) => f === 'TODAS' || l.status === f,
    );
    // Primeiro o que ja aconteceu, do mais recente ao mais antigo; as previstas vem depois, em ordem de vencimento.
    const reais = filtrados.filter((l) => l.status !== 'PREVISTA');
    const previstas = filtrados
      .filter((l) => l.status === 'PREVISTA')
      .sort((a, b) => a.competencia.localeCompare(b.competencia));
    return [...reais, ...previstas];
  });
  protected readonly paginas = computed(() =>
    Math.max(1, Math.ceil(this.visiveis().length / POR_PAGINA)),
  );
  protected readonly pagina12 = computed(() =>
    this.visiveis().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA),
  );

  protected readonly faixas = computed<FaixaDonut[]>(() => {
    const c = this.comissoes();
    if (!c) return [];
    return [
      { rotulo: 'Paga', valor: Math.round(c.paga), tom: 'verde' },
      { rotulo: 'Disponível', valor: Math.round(c.disponivel), tom: 'ambar' },
      { rotulo: 'Prevista', valor: Math.round(c.prevista), tom: 'azul' },
    ];
  });

  protected readonly barras = computed<BarraGrafico[]>(() =>
    (this.comissoes()?.porMes ?? []).map((m) => ({
      rotulo: formatarMes(m.mes),
      valor: m.valor,
      tom: 'verde',
    })),
  );

  ngOnInit(): void {
    this.service.consultarMinhasComissoes().subscribe({
      next: (c) => {
        this.comissoes.set(c);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar as comissões.');
        this.carregando.set(false);
      },
    });
  }

  protected filtrar(f: FiltroStatus): void {
    this.filtro.set(f);
    this.pagina.set(1);
  }

  protected exportar(): void {
    baixarCsv(
      'comissoes.csv',
      [
        'Competência',
        'Cliente',
        'Contrato',
        'Evento',
        'Base de cálculo',
        'Percentual',
        'Valor',
        'Situação',
      ],
      this.visiveis().map((l) => [
        l.competencia,
        l.clienteNome,
        l.contratoNumero,
        ROTULO_EVENTO_COMISSAO[l.evento],
        l.baseCalculo,
        l.percentual,
        l.valor,
        ROTULO_STATUS_COMISSAO[l.status],
      ]),
    );
  }
}

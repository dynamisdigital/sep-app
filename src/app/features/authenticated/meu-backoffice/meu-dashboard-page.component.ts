import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import {
  OperacaoClienteResponse,
  ResumoCorrespondenteResponse,
  VinculoResponse,
} from '../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { FaixaDonut } from '../../../shared/donut';
import {
  descreverPrazo,
  formatarData,
  formatarMes,
  formatarMoeda,
  moedaCurta,
  ROTULO_CADASTRO,
  TOM_CADASTRO,
} from '../correspondentes/correspondentes.format';
import { BarraGrafico, CorBarrasComponent } from '../correspondentes/graficos/cor-barras.component';
import { CorDonutComponent } from '../correspondentes/graficos/cor-donut.component';

// Meu Back Office (CORRESPONDENTE): o correspondente ve a propria base, o que ela deve e a validade
// do cadastro. O isolamento vem do backend (identidade da sessao); a tela nao envia identificador
// de carteira.
@Component({
  selector: 'sep-meu-dashboard-page',
  imports: [
    OperationalShellComponent,
    RouterLink,
    LucideAngularModule,
    CorDonutComponent,
    CorBarrasComponent,
  ],
  templateUrl: './meu-dashboard-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeuDashboardPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);

  protected readonly resumo = signal<ResumoCorrespondenteResponse | null>(null);
  protected readonly operacoes = signal<OperacaoClienteResponse[]>([]);
  protected readonly base = signal<VinculoResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly rotulo = ROTULO_CADASTRO;
  protected readonly tom = TOM_CADASTRO;
  protected readonly data = formatarData;
  protected readonly moeda = formatarMoeda;
  protected readonly moedaCurta = moedaCurta;
  protected readonly prazo = descreverPrazo;

  protected readonly situacoes = computed<FaixaDonut[]>(() => {
    const c = this.resumo()?.carteira.porSituacao;
    if (!c) return [];
    return [
      { rotulo: 'Em dia', valor: c.EM_DIA, tom: 'verde' },
      { rotulo: 'Em atraso', valor: c.EM_ATRASO, tom: 'vermelho' },
      { rotulo: 'Quitados', valor: c.QUITADO, tom: 'ciano' },
      { rotulo: 'Em formalização', valor: c.EM_FORMALIZACAO, tom: 'azul' },
      { rotulo: 'Em análise', valor: c.EM_ANALISE, tom: 'ambar' },
      { rotulo: 'Recusadas', valor: c.RECUSADA, tom: 'neutro' },
    ];
  });

  protected readonly parcelas = computed<FaixaDonut[]>(() => {
    const c = this.resumo()?.carteira;
    if (!c) return [];
    return [
      { rotulo: 'Pagas', valor: c.parcelasPagas, tom: 'verde' },
      { rotulo: 'A vencer', valor: c.parcelasEmDia, tom: 'azul' },
      { rotulo: 'Vencidas', valor: c.parcelasVencidas, tom: 'vermelho' },
    ];
  });

  protected readonly aReceber = computed<BarraGrafico[]>(() =>
    (this.resumo()?.carteira.aReceberPorMes ?? []).map((m) => ({
      rotulo: formatarMes(m.mes),
      valor: m.valor,
      tom: 'ciano',
    })),
  );

  protected readonly emAtraso = computed(() =>
    this.operacoes().filter((o) => o.situacao === 'EM_ATRASO'),
  );

  protected readonly vinculosEmRisco = computed(() =>
    this.base().filter(
      (v) => v.status === 'VIGENTE' && v.ultimaPropostaCitaCorrespondente === false,
    ),
  );

  protected readonly pendencias = computed(() => {
    const r = this.resumo();
    return (
      !!r &&
      (r.enviosDevolvidos > 0 || this.emAtraso().length > 0 || this.vinculosEmRisco().length > 0)
    );
  });

  ngOnInit(): void {
    forkJoin({
      resumo: this.service.consultarMeuResumo(),
      operacoes: this.service.listarMinhasOperacoes(),
      base: this.service.listarMinhaBase(),
    }).subscribe({
      next: ({ resumo, operacoes, base }) => {
        this.resumo.set(resumo);
        this.operacoes.set(operacoes);
        this.base.set(base);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar o seu painel.');
        this.carregando.set(false);
      },
    });
  }
}

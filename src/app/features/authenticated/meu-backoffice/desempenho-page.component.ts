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
  ETAPAS_FUNIL,
  MeuDesempenhoResponse,
  ProspectResponse,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  formatarMoeda,
  formatarPercentual,
  moedaCurta,
  ROTULO_ETAPA,
} from '../correspondentes/correspondentes.format';
import { BarraGrafico, CorBarrasComponent } from '../correspondentes/graficos/cor-barras.component';

// Meu desempenho (CORRESPONDENTE): metas e atingimento, posicao na rede e conversao do funil. A
// posicao mostra so a colocacao propria e o total: o nome e os numeros dos demais nao aparecem.
@Component({
  selector: 'sep-desempenho-correspondente-page',
  imports: [OperationalShellComponent, RouterLink, LucideAngularModule, CorBarrasComponent],
  templateUrl: './desempenho-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesempenhoCorrespondentePageComponent implements OnInit {
  private readonly service = inject(CorrespondentesGestaoService);

  protected readonly desempenho = signal<MeuDesempenhoResponse | null>(null);
  protected readonly prospects = signal<ProspectResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly moeda = formatarMoeda;
  protected readonly moedaCurta = moedaCurta;
  protected readonly pct = formatarPercentual;

  protected readonly funil = computed<BarraGrafico[]>(() =>
    ETAPAS_FUNIL.map((e) => ({
      rotulo: ROTULO_ETAPA[e].split(' ')[0],
      valor: this.prospects().filter((p) => p.etapa === e).length,
      tom: 'ciano' as const,
    })),
  );

  protected largura(pct: number): number {
    return Math.min(100, pct);
  }

  protected tom(pct: number): string {
    return pct >= 100 ? 'green' : pct >= 60 ? 'cyan' : 'red';
  }

  ngOnInit(): void {
    forkJoin({
      desempenho: this.service.consultarMeuDesempenho(),
      prospects: this.service.listarProspects(),
    }).subscribe({
      next: ({ desempenho, prospects }) => {
        this.desempenho.set(desempenho);
        this.prospects.set(prospects);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar o seu desempenho.');
        this.carregando.set(false);
      },
    });
  }
}

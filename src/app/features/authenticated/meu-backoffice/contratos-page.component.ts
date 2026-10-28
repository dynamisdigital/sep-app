import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  OperacaoClienteResponse,
  SituacaoOperacao,
} from '../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  formatarMoeda,
  percentual,
  ROTULO_OPERACAO,
  TOM_OPERACAO,
} from '../correspondentes/correspondentes.format';

type Filtro = 'TODOS' | 'EM_DIA' | 'EM_ATRASO' | 'QUITADO' | 'PROPOSTAS';

// Contratos e propostas dos clientes da base. O correspondente acompanha o que captou: situacao,
// valor da parcela, andamento e atraso. Sem score, renda nem parecer de credito.
@Component({
  selector: 'sep-contratos-correspondente-page',
  imports: [OperationalShellComponent, RouterLink],
  templateUrl: './contratos-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratosPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);

  protected readonly operacoes = signal<OperacaoClienteResponse[]>([]);
  protected readonly filtro = signal<Filtro>('TODOS');
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly rotulo = ROTULO_OPERACAO;
  protected readonly tom = TOM_OPERACAO;
  protected readonly data = formatarData;
  protected readonly moeda = formatarMoeda;
  protected readonly pct = percentual;

  protected readonly filtros: { chave: Filtro; rotulo: string }[] = [
    { chave: 'TODOS', rotulo: 'Todos' },
    { chave: 'EM_DIA', rotulo: 'Em dia' },
    { chave: 'EM_ATRASO', rotulo: 'Em atraso' },
    { chave: 'QUITADO', rotulo: 'Quitados' },
    { chave: 'PROPOSTAS', rotulo: 'Propostas' },
  ];

  protected readonly visiveis = computed(() => {
    const f = this.filtro();
    return this.operacoes().filter((o) =>
      f === 'TODOS' ? true : f === 'PROPOSTAS' ? o.tipo === 'PROPOSTA' : o.situacao === f,
    );
  });

  protected contar(f: Filtro): number {
    return this.operacoes().filter((o) =>
      f === 'TODOS' ? true : f === 'PROPOSTAS' ? o.tipo === 'PROPOSTA' : o.situacao === f,
    ).length;
  }

  protected tomProgresso(situacao: SituacaoOperacao): string {
    return situacao === 'EM_ATRASO' ? 'red' : situacao === 'QUITADO' ? 'cyan' : 'green';
  }

  ngOnInit(): void {
    this.service.listarMinhasOperacoes().subscribe({
      next: (o) => {
        this.operacoes.set(o);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os contratos.');
        this.carregando.set(false);
      },
    });
  }
}

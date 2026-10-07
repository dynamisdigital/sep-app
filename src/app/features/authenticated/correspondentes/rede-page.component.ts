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

import { RedeResumoResponse } from '../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { FaixaDonut } from '../../../shared/donut';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  descreverPrazo,
  formatarData,
  formatarMoeda,
  moedaCurta,
  ROTULO_CADASTRO,
  TOM_CADASTRO,
} from './correspondentes.format';
import { BarraGrafico, CorBarrasComponent } from './graficos/cor-barras.component';
import { CorDonutComponent } from './graficos/cor-donut.component';

// Rede de Correspondentes (ADMIN): visao consolidada da rede, com a situacao do cadastro de cada
// correspondente. A "apuracao de vigencia" e uma simulacao do job do backend, que e quem encerra
// os vinculos de cadastro vencido.
@Component({
  selector: 'sep-rede-correspondentes-page',
  imports: [
    OperationalShellComponent,
    RouterLink,
    LucideAngularModule,
    CorDonutComponent,
    CorBarrasComponent,
  ],
  templateUrl: './rede-page.component.html',
  styleUrl: './correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedePageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);

  protected readonly rede = signal<RedeResumoResponse | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly processando = signal(false);

  protected readonly rotulo = ROTULO_CADASTRO;
  protected readonly tom = TOM_CADASTRO;
  protected readonly data = formatarData;
  protected readonly moeda = formatarMoeda;
  protected readonly prazo = descreverPrazo;
  protected readonly moedaCurta = moedaCurta;

  protected readonly cadastros = computed<FaixaDonut[]>(() => {
    const lista = this.rede()?.correspondentes ?? [];
    const conta = (...s: string[]) => lista.filter((c) => s.includes(c.status)).length;
    return [
      { rotulo: 'Ativos', valor: conta('ATIVO'), tom: 'verde' },
      { rotulo: 'A vencer', valor: conta('A_VENCER'), tom: 'ambar' },
      { rotulo: 'Vencidos', valor: conta('VENCIDO'), tom: 'vermelho' },
      {
        rotulo: 'Suspensos ou inativos',
        valor: conta('SUSPENSO', 'INATIVO', 'PENDENTE'),
        tom: 'neutro',
      },
    ];
  });

  protected readonly carteiras = computed<BarraGrafico[]>(() =>
    (this.rede()?.correspondentes ?? []).map((c) => ({
      rotulo: c.nome.split(' ')[0],
      valor: c.valorCarteira,
      tom: c.inadimplenciaPct > 0 ? 'ambar' : 'verde',
    })),
  );

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.service.consultarRede().subscribe({
      next: (rede) => {
        this.rede.set(rede);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar a rede de correspondentes.');
        this.carregando.set(false);
      },
    });
  }

  protected processarVigencia(): void {
    this.processando.set(true);
    this.aviso.set(null);
    this.service.processarVigencia().subscribe({
      next: (r) => {
        this.processando.set(false);
        this.aviso.set(
          r.vinculosEncerrados === 0
            ? 'Apuração concluída: nenhum vínculo precisou ser encerrado.'
            : `Apuração concluída: ${r.vinculosEncerrados} vínculo(s) encerrado(s) por cadastro vencido (${r.correspondentesAfetados.join(', ')}). Os clientes ficam livres para eleger outro correspondente ou o SEP.`,
        );
        this.carregar();
      },
      error: () => {
        this.processando.set(false);
        this.erro.set('A apuração de vigência falhou.');
      },
    });
  }
}

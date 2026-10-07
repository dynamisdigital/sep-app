import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { OperacaoClienteResponse } from '../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { FaixaDonut } from '../../../shared/donut';
import {
  formatarData,
  formatarMoeda,
  percentual,
  ROTULO_OPERACAO,
  ROTULO_PARCELA,
  TOM_OPERACAO,
  TOM_PARCELA,
} from '../correspondentes/correspondentes.format';
import { CorDonutComponent } from '../correspondentes/graficos/cor-donut.component';

// Detalhe de um contrato da base: valores, andamento e cada parcela com a situacao. O correspondente
// so le; baixa, renegociacao e cobranca sao do SEP.
@Component({
  selector: 'sep-contrato-detail-correspondente-page',
  imports: [OperationalShellComponent, RouterLink, LucideAngularModule, CorDonutComponent],
  templateUrl: './contrato-detail-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratoDetailPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);
  private readonly route = inject(ActivatedRoute);

  protected readonly operacao = signal<OperacaoClienteResponse | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly rotulo = ROTULO_OPERACAO;
  protected readonly tom = TOM_OPERACAO;
  protected readonly rotuloParcela = ROTULO_PARCELA;
  protected readonly tomParcela = TOM_PARCELA;
  protected readonly data = formatarData;
  protected readonly moeda = formatarMoeda;
  protected readonly pct = percentual;

  protected readonly faixas = computed<FaixaDonut[]>(() => {
    const o = this.operacao();
    if (!o) return [];
    const aVencer = o.parcelas.filter((p) => p.status === 'A_VENCER').length;
    return [
      { rotulo: 'Pagas', valor: o.parcelasPagas, tom: 'verde' },
      { rotulo: 'A vencer', valor: aVencer, tom: 'azul' },
      { rotulo: 'Vencidas', valor: o.parcelasVencidas, tom: 'vermelho' },
    ];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.service.listarMinhasOperacoes().subscribe({
      next: (lista) => {
        const achada = lista.find((o) => o.id === id && o.tipo === 'CONTRATO');
        if (achada) this.operacao.set(achada);
        else this.erro.set('Contrato não encontrado na sua base.');
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar o contrato.');
        this.carregando.set(false);
      },
    });
  }
}

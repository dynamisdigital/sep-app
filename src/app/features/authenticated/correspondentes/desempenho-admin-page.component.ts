import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  DesempenhoCorrespondente,
  DesempenhoRedeResponse,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { baixarCsv, formatarMoeda, formatarPercentual, moedaCurta } from './correspondentes.format';
import { BarraGrafico, CorBarrasComponent } from './graficos/cor-barras.component';

type Criterio =
  | 'valorOriginado'
  | 'clientesCaptados'
  | 'contratos'
  | 'taxaConversaoPct'
  | 'comissaoGerada'
  | 'atingimentoMetaPct'
  | 'qualidade';

// Desempenho da rede (ADMIN): ranking por criterio, metas com atingimento e exportacao. As metas sao
// definidas aqui; cada alteracao vai para a auditoria. "Qualidade da carteira" ordena do menos
// inadimplente para o mais.
@Component({
  selector: 'sep-desempenho-admin-page',
  imports: [
    OperationalShellComponent,
    RouterLink,
    FormsModule,
    LucideAngularModule,
    CorBarrasComponent,
  ],
  templateUrl: './desempenho-admin-page.component.html',
  styleUrl: './correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesempenhoAdminPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesGestaoService);

  protected readonly rede = signal<DesempenhoRedeResponse | null>(null);
  protected readonly criterio = signal<Criterio>('valorOriginado');
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly edicao: Record<string, { metaClientes: number; metaValorOriginado: number }> =
    {};

  protected readonly moeda = formatarMoeda;
  protected readonly moedaCurta = moedaCurta;
  protected readonly pct = formatarPercentual;

  protected readonly criterios: { chave: Criterio; rotulo: string }[] = [
    { chave: 'valorOriginado', rotulo: 'Crédito originado' },
    { chave: 'clientesCaptados', rotulo: 'Clientes captados' },
    { chave: 'contratos', rotulo: 'Contratos' },
    { chave: 'taxaConversaoPct', rotulo: 'Conversão' },
    { chave: 'comissaoGerada', rotulo: 'Comissão gerada' },
    { chave: 'atingimentoMetaPct', rotulo: 'Atingimento da meta' },
    { chave: 'qualidade', rotulo: 'Qualidade da carteira' },
  ];

  protected readonly ranking = computed<DesempenhoCorrespondente[]>(() => {
    const lista = [...(this.rede()?.ranking ?? [])];
    const c = this.criterio();
    return lista.sort((a, b) =>
      c === 'qualidade' ? a.inadimplenciaPct - b.inadimplenciaPct : b[c] - a[c],
    );
  });

  protected readonly barras = computed<BarraGrafico[]>(() =>
    this.ranking().map((r) => ({
      rotulo: r.nome.split(' ')[0],
      valor: r.valorOriginado,
      tom: 'azul' as const,
    })),
  );

  protected readonly totais = computed(() => {
    const r = this.rede()?.ranking ?? [];
    return {
      originado: r.reduce((t, x) => t + x.valorOriginado, 0),
      clientes: r.reduce((t, x) => t + x.clientesCaptados, 0),
      comissao: r.reduce((t, x) => t + x.comissaoGerada, 0),
    };
  });

  protected nomeDe(id: string): string {
    return this.rede()?.ranking.find((r) => r.correspondenteId === id)?.nome ?? '';
  }

  protected largura(p: number): number {
    return Math.min(100, p);
  }

  protected tom(p: number): string {
    return p >= 100 ? 'green' : p >= 60 ? 'cyan' : 'red';
  }

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    this.service.consultarDesempenhoDaRede().subscribe({
      next: (rede) => {
        this.rede.set(rede);
        for (const m of rede.metas) {
          this.edicao[m.correspondenteId] = {
            metaClientes: m.metaClientes,
            metaValorOriginado: m.metaValorOriginado,
          };
        }
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar o desempenho da rede.');
        this.carregando.set(false);
      },
    });
  }

  protected salvarMeta(id: string): void {
    const e = this.edicao[id];
    this.erro.set(null);
    this.service.atualizarMeta(id, e).subscribe({
      next: () => {
        this.aviso.set(`Meta de ${this.nomeDe(id)} atualizada e registrada na auditoria.`);
        this.carregar();
      },
      error: (err) => this.erro.set(err.error?.message ?? 'Não foi possível alterar a meta.'),
    });
  }

  protected exportar(): void {
    baixarCsv(
      'desempenho-rede.csv',
      [
        'Posição',
        'Correspondente',
        'Clientes captados',
        'Prospects',
        'Conversão (%)',
        'Crédito originado',
        'Contratos',
        'Carteira ativa',
        'Inadimplência (%)',
        'Comissão gerada',
        'Comissão paga',
        'Atingimento da meta (%)',
      ],
      this.ranking().map((r, i) => [
        i + 1,
        r.nome,
        r.clientesCaptados,
        r.prospects,
        r.taxaConversaoPct,
        r.valorOriginado,
        r.contratos,
        r.carteiraAtiva,
        r.inadimplenciaPct,
        r.comissaoGerada,
        r.comissaoPaga,
        r.atingimentoMetaPct,
      ]),
    );
  }
}

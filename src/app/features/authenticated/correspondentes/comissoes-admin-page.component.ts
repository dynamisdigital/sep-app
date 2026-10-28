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
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import {
  LancamentoComissao,
  RegraComissao,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { CorrespondentesGestaoService } from '../../../core/correspondentes/correspondentes-gestao.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { FaixaDonut } from '../../../shared/donut';
import {
  baixarCsv,
  formatarData,
  formatarMes,
  formatarMoeda,
  formatarPercentual,
  ROTULO_EVENTO_COMISSAO,
  ROTULO_STATUS_COMISSAO,
  TOM_STATUS_COMISSAO,
} from './correspondentes.format';
import { CorDonutComponent } from './graficos/cor-donut.component';

// Comissionamento (ADMIN): regras configuraveis e livro de comissoes da rede. As regras nao ficam no
// codigo: cada alteracao cria uma nova versao, exige justificativa e fica na auditoria. Os
// lancamentos ja gerados guardam a versao da regra usada e nao mudam quando a regra muda.
@Component({
  selector: 'sep-comissoes-admin-page',
  imports: [
    OperationalShellComponent,
    RouterLink,
    FormsModule,
    LucideAngularModule,
    CorDonutComponent,
  ],
  templateUrl: './comissoes-admin-page.component.html',
  styleUrl: './correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComissoesAdminPageComponent implements OnInit {
  private readonly service = inject(CorrespondentesGestaoService);

  protected readonly regras = signal<RegraComissao[]>([]);
  protected readonly lancamentos = signal<LancamentoComissao[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly edicao: Record<
    string,
    { percentual: number; tetoSub: number; justificativa: string }
  > = {};

  protected readonly moeda = formatarMoeda;
  protected readonly pct = formatarPercentual;
  protected readonly data = formatarData;
  protected readonly mes = formatarMes;
  protected readonly rotuloStatus = ROTULO_STATUS_COMISSAO;
  protected readonly tomStatus = TOM_STATUS_COMISSAO;
  protected readonly rotuloEvento = ROTULO_EVENTO_COMISSAO;

  private soma(status: LancamentoComissao['status']): number {
    return (
      Math.round(
        this.lancamentos()
          .filter((l) => l.status === status)
          .reduce((t, l) => t + l.valor, 0) * 100,
      ) / 100
    );
  }

  protected readonly paga = computed(() => this.soma('PAGA'));
  protected readonly disponivel = computed(() => this.soma('DISPONIVEL'));
  protected readonly prevista = computed(() => this.soma('PREVISTA'));

  protected readonly faixas = computed<FaixaDonut[]>(() => {
    const nomes = [...new Set(this.lancamentos().map((l) => l.correspondenteNome))];
    const tons = ['verde', 'azul', 'ambar', 'roxo'] as const;
    return nomes.map((n, i) => ({
      rotulo: n,
      valor: Math.round(
        this.lancamentos()
          .filter((l) => l.correspondenteNome === n && l.status !== 'PREVISTA')
          .reduce((t, l) => t + l.valor, 0),
      ),
      tom: tons[i % tons.length],
    }));
  });

  protected readonly recentes = computed(() =>
    this.lancamentos()
      .filter((l) => l.status !== 'PREVISTA')
      .slice(0, 12),
  );

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    forkJoin({
      regras: this.service.listarRegras(),
      lancamentos: this.service.listarLancamentosDaRede(),
    }).subscribe({
      next: ({ regras, lancamentos }) => {
        this.regras.set(regras);
        this.lancamentos.set(lancamentos);
        for (const r of regras) {
          this.edicao[r.id] ??= {
            percentual: r.percentual,
            tetoSub: r.tetoSub,
            justificativa: '',
          };
        }
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar as comissões da rede.');
        this.carregando.set(false);
      },
    });
  }

  protected podeSalvar(r: RegraComissao): boolean {
    const e = this.edicao[r.id];
    const mudou = e?.percentual !== r.percentual || e?.tetoSub !== r.tetoSub;
    return (
      !!e &&
      e.percentual > 0 &&
      e.tetoSub >= 0 &&
      e.tetoSub <= e.percentual &&
      mudou &&
      !!e.justificativa.trim()
    );
  }

  protected salvar(r: RegraComissao): void {
    if (!this.podeSalvar(r)) return;
    const e = this.edicao[r.id];
    this.erro.set(null);
    this.service
      .atualizarRegra(r.id, {
        percentual: e.percentual,
        tetoSub: e.tetoSub,
        justificativa: e.justificativa,
      })
      .subscribe({
        next: (nova) => {
          this.regras.update((l) => l.map((x) => (x.id === nova.id ? nova : x)));
          this.edicao[r.id] = {
            percentual: nova.percentual,
            tetoSub: nova.tetoSub,
            justificativa: '',
          };
          this.aviso.set(
            `Regra de ${nova.produto} atualizada para ${formatarPercentual(nova.percentual)} (versão ${nova.versao}). A alteração foi registrada na auditoria.`,
          );
        },
        error: (err) => this.erro.set(err.error?.message ?? 'Não foi possível alterar a regra.'),
      });
  }

  protected exportar(): void {
    baixarCsv(
      'comissoes-rede.csv',
      [
        'Competência',
        'Correspondente',
        'Cliente',
        'Contrato',
        'Evento',
        'Base',
        'Percentual',
        'Valor',
        'Situação',
        'Versão da regra',
      ],
      this.lancamentos().map((l) => [
        l.competencia,
        l.correspondenteNome,
        l.clienteNome,
        l.contratoNumero,
        ROTULO_EVENTO_COMISSAO[l.evento],
        l.baseCalculo,
        l.percentual,
        l.valor,
        ROTULO_STATUS_COMISSAO[l.status],
        l.regraVersao,
      ]),
    );
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  OperacaoCarteiraResponse,
  StatusOperacaoFinanciada,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  formatarMoeda,
  formatarTaxaMensal,
  idCurto,
  mensagemCredoraErro,
} from '../shared/credora-format';

// Lista a carteira de operacoes financiadas da credora autenticada. O backend resolve ownership; a
// tela so apresenta o agregado, sem dado sensivel do tomador. A carteira nasce por associacao
// operacional assistida (admin) — manifestar interesse nao gera carteira.
//
// Tela sem arte de designer: construida no padrao visual do tema, na mesma linguagem dos
// Mockups 35 e 36. A referencia em `image/mockups` e captura da implementacao.
@Component({
  selector: 'sep-carteira-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './carteira-page.component.html',
  styleUrl: './carteira-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteiraPageComponent implements OnInit {
  private readonly credora = inject(CredoraService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly operacoes = signal<OperacaoCarteiraResponse[]>([]);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;
  protected readonly idCurto = idCurto;

  // Agregados somados da propria lista devolvida, para os numeros da tela fecharem entre si e com
  // o detalhe de cada operacao. Campos nulos simplesmente nao entram na soma.
  protected readonly ativas = computed(() =>
    this.operacoes().filter((o) => o.status === 'ASSOCIADA'),
  );

  protected readonly valorFinanciado = computed(() => this.soma(this.operacoes(), (o) => o.valor));

  protected readonly totalRecebido = computed(() =>
    this.soma(this.operacoes(), (o) => o.cobranca?.totalRecebido ?? null),
  );

  protected readonly emAberto = computed(
    () =>
      Math.round(
        (this.soma(this.operacoes(), (o) => o.cobranca?.valorTotal ?? null) -
          this.totalRecebido()) *
          100,
      ) / 100,
  );

  protected readonly parcelasAtrasadas = computed(() =>
    this.operacoes().reduce((s, o) => s + (o.cobranca?.parcelasAtrasadas ?? 0), 0),
  );

  private soma(
    lista: OperacaoCarteiraResponse[],
    campo: (o: OperacaoCarteiraResponse) => number | null,
  ): number {
    return Math.round(lista.reduce((s, o) => s + (campo(o) ?? 0), 0) * 100) / 100;
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credora.listarCarteira().subscribe({
      next: (operacoes) => {
        this.operacoes.set(operacoes);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(mensagemCredoraErro(err, 'Não foi possível carregar a carteira.'));
        this.loading.set(false);
      },
    });
  }

  statusTom(status: StatusOperacaoFinanciada): 'green' | 'amber' {
    return status === 'ASSOCIADA' ? 'green' : 'amber';
  }

  statusRotulo(status: StatusOperacaoFinanciada): string {
    return status === 'ASSOCIADA' ? 'Associada' : 'Encerrada';
  }

  // Progresso de cobranca da operacao, so para a barra da linha. Sem cobranca, nao ha progresso.
  progresso(operacao: OperacaoCarteiraResponse): number {
    const c = operacao.cobranca;
    if (!c || !c.numeroParcelas) return 0;
    return Math.round((c.parcelasPagas / c.numeroParcelas) * 100);
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

// Detalhe de uma operacao financiada da carteira da credora. Leitura por ownership no backend (404
// para operacao de outra credora ou inexistente). Apresenta o snapshot da oportunidade de origem, a
// justificativa, o status do contrato e o resumo AGREGADO de cobranca; nunca busca parcelas
// individuais nem dado sensivel do tomador.
//
// Tela sem arte de designer: construida no padrao visual do tema, na mesma linguagem dos
// Mockups 35 e 36. A referencia em `image/mockups` e captura da implementacao.
@Component({
  selector: 'sep-operacao-carteira-detail-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './operacao-carteira-detail-page.component.html',
  styleUrl: './operacao-carteira-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperacaoCarteiraDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly credora = inject(CredoraService);

  private id = '';

  protected readonly loading = signal(true);
  protected readonly naoEncontrada = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly operacao = signal<OperacaoCarteiraResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;
  protected readonly idCurto = idCurto;

  // Derivados do resumo AGREGADO devolvido pelo backend. Nada aqui recalcula regra de cobranca:
  // sao apenas as mesmas parcelas vistas por outro angulo, para os numeros fecharem com a lista.
  protected readonly progresso = computed(() => {
    const c = this.operacao()?.cobranca;
    if (!c?.numeroParcelas) return 0;
    return Math.round((c.parcelasPagas / c.numeroParcelas) * 100);
  });

  protected readonly emAberto = computed(() => {
    const c = this.operacao()?.cobranca;
    if (!c) return 0;
    return Math.round((c.valorTotal - c.totalRecebido) * 100) / 100;
  });

  protected readonly parcelasRestantes = computed(() => {
    const c = this.operacao()?.cobranca;
    if (!c) return 0;
    return c.numeroParcelas - c.parcelasPagas;
  });

  protected readonly tomDoTitulo = computed(() => {
    const op = this.operacao();
    return op ? this.statusTom(op.status) : 'blue';
  });

  ngOnInit(): void {
    // O parametro :id e garantido pela rota; carrega incondicionalmente.
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrada.set(false);
    this.credora.consultarOperacaoCarteira(this.id).subscribe({
      next: (operacao) => {
        this.operacao.set(operacao);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(mensagemCredoraErro(err, 'Não foi possível carregar a operação.'));
      },
    });
  }

  statusTom(status: StatusOperacaoFinanciada): 'green' | 'amber' {
    return status === 'ASSOCIADA' ? 'green' : 'amber';
  }

  statusRotulo(status: StatusOperacaoFinanciada): string {
    return status === 'ASSOCIADA' ? 'Associada' : 'Encerrada';
  }
}

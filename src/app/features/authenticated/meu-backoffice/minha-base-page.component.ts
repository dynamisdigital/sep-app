import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { forkJoin } from 'rxjs';

import {
  OperacaoClienteResponse,
  VinculoResponse,
} from '../../../core/correspondentes/correspondentes.models';
import { CorrespondentesService } from '../../../core/correspondentes/correspondentes.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  formatarMoeda,
  ROTULO_MOTIVO,
  ROTULO_OPERACAO,
  TOM_OPERACAO,
  ROTULO_VINCULO,
  TOM_VINCULO,
} from '../correspondentes/correspondentes.format';

// Minha base (CORRESPONDENTE): lista os clientes vinculados e o historico do que foi perdido. So
// leitura: o correspondente nao altera vinculo, quem encerra e reatribui e o SEP.
@Component({
  selector: 'sep-minha-base-page',
  imports: [OperationalShellComponent, RouterLink],
  templateUrl: './minha-base-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinhaBasePageComponent implements OnInit {
  private readonly service = inject(CorrespondentesService);

  protected readonly base = signal<VinculoResponse[]>([]);
  protected readonly operacoes = signal<OperacaoClienteResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly rotulo = ROTULO_VINCULO;
  protected readonly tom = TOM_VINCULO;
  protected readonly motivo = ROTULO_MOTIVO;
  protected readonly data = formatarData;
  protected readonly moeda = formatarMoeda;
  protected readonly rotuloOperacao = ROTULO_OPERACAO;
  protected readonly tomOperacao = TOM_OPERACAO;

  /** A operacao mais relevante do cliente: o contrato, se houver, senao a proposta. */
  protected operacaoDe(v: VinculoResponse): OperacaoClienteResponse | undefined {
    const doCliente = this.operacoes().filter((o) => o.clienteNome === v.clienteNome);
    return doCliente.find((o) => o.tipo === 'CONTRATO') ?? doCliente[0];
  }

  ngOnInit(): void {
    forkJoin({
      base: this.service.listarMinhaBase(),
      operacoes: this.service.listarMinhasOperacoes(),
    }).subscribe({
      next: ({ base: b, operacoes }) => {
        this.base.set(b);
        this.operacoes.set(operacoes);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar a sua base.');
        this.carregando.set(false);
      },
    });
  }
}

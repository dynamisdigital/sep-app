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
import { forkJoin } from 'rxjs';

import {
  AporteResponse,
  ContaEscrowResponse,
  LancamentoEscrow,
} from '../../../../core/credores/credores-escrow.models';
import { CredoresEscrowService } from '../../../../core/credores/credores-escrow.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { formatarData, formatarMoeda, mensagemCredoraErro } from '../shared/credora-format';
import {
  STATUS_APORTE_LABEL,
  TIPO_LANCAMENTO_LABEL,
  TOM_APORTE,
  novaChaveIdempotencia,
  parseValorMonetario,
  sinalDoLancamento,
} from './escrow-format';

// Conta escrow do credor: saldo por bucket, aporte por Pix e extrato do livro-razao. O saldo e
// sempre o que o backend devolve; a tela nao soma nem deduz nada.
@Component({
  selector: 'sep-conta-escrow-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './conta-escrow-page.component.html',
  styleUrl: './escrow-telas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContaEscrowPageComponent implements OnInit {
  private readonly escrow = inject(CredoresEscrowService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly conta = signal<ContaEscrowResponse | null>(null);
  protected readonly extrato = signal<LancamentoEscrow[]>([]);
  protected readonly aportes = signal<AporteResponse[]>([]);

  protected readonly valorTexto = signal('');
  protected readonly enviando = signal(false);
  protected readonly formErro = signal<string | null>(null);

  protected readonly aguardando = computed(() =>
    this.aportes().filter((a) => a.status === 'AGUARDANDO_PIX'),
  );

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly sinal = sinalDoLancamento;
  protected readonly tipoLabel = TIPO_LANCAMENTO_LABEL;
  protected readonly aporteLabel = STATUS_APORTE_LABEL;
  protected readonly aporteTom = TOM_APORTE;

  // Mesma chave enquanto a tentativa nao for concluida: um clique repetido nao gera aporte duplicado.
  private chaveAporte: string | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      conta: this.escrow.consultarConta(),
      extrato: this.escrow.listarExtrato(),
      aportes: this.escrow.listarAportes(),
    }).subscribe({
      next: ({ conta, extrato, aportes }) => {
        this.conta.set(conta);
        this.extrato.set(extrato);
        this.aportes.set(aportes);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.status === 404
            ? 'Você ainda não tem cadastro de credor com conta escrow.'
            : mensagemCredoraErro(err, 'Não foi possível carregar a conta escrow.'),
        );
        this.loading.set(false);
      },
    });
  }

  digitar(evento: Event): void {
    this.valorTexto.set((evento.target as HTMLInputElement).value);
    this.formErro.set(null);
  }

  aportar(): void {
    const valor = parseValorMonetario(this.valorTexto());
    if (valor === null) {
      this.formErro.set('Informe um valor válido, em reais, com até 2 casas decimais.');
      return;
    }
    this.chaveAporte ??= novaChaveIdempotencia();
    this.enviando.set(true);
    this.formErro.set(null);
    this.escrow.criarAporte(valor, this.chaveAporte).subscribe({
      next: () => {
        this.chaveAporte = null;
        this.valorTexto.set('');
        this.enviando.set(false);
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.formErro.set(mensagemCredoraErro(err, 'Não foi possível gerar o aporte.'));
        this.enviando.set(false);
      },
    });
  }

  // Somente no mock: no ambiente real o deposito e confirmado pelo webhook do parceiro.
  simularPagamento(aporte: AporteResponse): void {
    this.escrow.simularConfirmacaoAporte(aporte.id).subscribe({
      next: () => this.carregar(),
      error: (err: HttpErrorResponse) =>
        this.formErro.set(mensagemCredoraErro(err, 'Não foi possível confirmar o aporte.')),
    });
  }
}

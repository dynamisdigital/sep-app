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
  ContaEscrowResponse,
  DestinatarioResponse,
  SaqueResponse,
  TipoContaBancaria,
} from '../../../../core/credores/credores-escrow.models';
import { CredoresEscrowService } from '../../../../core/credores/credores-escrow.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { formatarData, formatarMoeda, mensagemCredoraErro } from '../shared/credora-format';
import {
  STATUS_SAQUE_LABEL,
  TIPO_CONTA_LABEL,
  TOM_SAQUE,
  novaChaveIdempotencia,
  parseValorMonetario,
} from './escrow-format';

// Saque do saldo disponivel para uma conta de destino pre-cadastrada de mesma titularidade (a
// parceira so paga destino cadastrado). O saque passa por aprovacao de outro operador antes de
// ser executado (maker-checker); a tela so mostra o estado devolvido pelo backend.
@Component({
  selector: 'sep-saques-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './saques-page.component.html',
  styleUrl: './escrow-telas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaquesPageComponent implements OnInit {
  private readonly escrow = inject(CredoresEscrowService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly conta = signal<ContaEscrowResponse | null>(null);
  protected readonly disponivel = computed(() => this.conta()?.saldo.disponivel ?? 0);
  protected readonly destinatarios = signal<DestinatarioResponse[]>([]);
  protected readonly saques = signal<SaqueResponse[]>([]);

  // Formulario de destinatario
  protected readonly banco = signal('');
  protected readonly agencia = signal('');
  protected readonly numeroConta = signal('');
  protected readonly tipoConta = signal<TipoContaBancaria>('PAGAMENTO');
  protected readonly destErro = signal<string | null>(null);
  protected readonly destEnviando = signal(false);

  // Formulario de saque
  protected readonly destinatarioId = signal('');
  protected readonly valorTexto = signal('');
  protected readonly saqueErro = signal<string | null>(null);
  protected readonly saqueMsg = signal<string | null>(null);
  protected readonly saqueEnviando = signal(false);

  protected readonly tiposConta = Object.keys(TIPO_CONTA_LABEL) as TipoContaBancaria[];
  protected readonly tipoContaLabel = TIPO_CONTA_LABEL;
  protected readonly saqueLabel = STATUS_SAQUE_LABEL;
  protected readonly saqueTom = TOM_SAQUE;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;

  private chaveSaque: string | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      conta: this.escrow.consultarConta(),
      destinatarios: this.escrow.listarDestinatarios(),
      saques: this.escrow.listarSaques(),
    }).subscribe({
      next: ({ conta, destinatarios, saques }) => {
        this.conta.set(conta);
        this.destinatarios.set(destinatarios);
        this.saques.set(saques);
        if (!destinatarios.some((d) => d.id === this.destinatarioId())) {
          this.destinatarioId.set(destinatarios[0]?.id ?? '');
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.status === 404
            ? 'Você ainda não tem cadastro de credor com conta escrow.'
            : mensagemCredoraErro(err, 'Não foi possível carregar saques e destinatários.'),
        );
        this.loading.set(false);
      },
    });
  }

  // O mesmo manipulador atende todos os campos de texto do formulario de destinatario.
  digitar(campo: 'banco' | 'agencia' | 'numeroConta' | 'valor', evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    if (campo === 'banco') this.banco.set(texto);
    if (campo === 'agencia') this.agencia.set(texto);
    if (campo === 'numeroConta') this.numeroConta.set(texto);
    if (campo === 'valor') {
      this.valorTexto.set(texto);
      this.saqueErro.set(null);
    } else {
      this.destErro.set(null);
    }
  }

  escolherTipoConta(evento: Event): void {
    this.tipoConta.set((evento.target as HTMLSelectElement).value as TipoContaBancaria);
  }

  escolherDestinatario(evento: Event): void {
    this.destinatarioId.set((evento.target as HTMLSelectElement).value);
    this.chaveSaque = null;
  }

  cadastrarDestinatario(): void {
    if (!this.banco().trim() || !this.agencia().trim() || !this.numeroConta().trim()) {
      this.destErro.set('Informe banco, agência e conta.');
      return;
    }
    this.destEnviando.set(true);
    this.destErro.set(null);
    this.escrow
      .criarDestinatario({
        banco: this.banco().trim(),
        agencia: this.agencia().trim(),
        conta: this.numeroConta().trim(),
        tipoConta: this.tipoConta(),
      })
      .subscribe({
        next: () => {
          this.banco.set('');
          this.agencia.set('');
          this.numeroConta.set('');
          this.destEnviando.set(false);
          this.carregar();
        },
        error: (err: HttpErrorResponse) => {
          this.destErro.set(mensagemCredoraErro(err, 'Não foi possível cadastrar a conta.'));
          this.destEnviando.set(false);
        },
      });
  }

  removerDestinatario(destinatario: DestinatarioResponse): void {
    this.escrow.removerDestinatario(destinatario.id).subscribe({
      next: () => this.carregar(),
      error: (err: HttpErrorResponse) =>
        this.destErro.set(mensagemCredoraErro(err, 'Não foi possível remover a conta.')),
    });
  }

  sacar(): void {
    const valor = parseValorMonetario(this.valorTexto());
    if (!this.destinatarioId()) {
      this.saqueErro.set('Cadastre e escolha uma conta de destino.');
      return;
    }
    if (valor === null) {
      this.saqueErro.set('Informe um valor válido, em reais, com até 2 casas decimais.');
      return;
    }
    this.chaveSaque ??= novaChaveIdempotencia();
    this.saqueEnviando.set(true);
    this.saqueErro.set(null);
    this.saqueMsg.set(null);
    this.escrow
      .solicitarSaque({ destinatarioId: this.destinatarioId(), valor }, this.chaveSaque)
      .subscribe({
        next: () => {
          this.chaveSaque = null;
          this.valorTexto.set('');
          this.saqueMsg.set('Saque solicitado. Ele será executado após a aprovação da tesouraria.');
          this.saqueEnviando.set(false);
          this.carregar();
        },
        error: (err: HttpErrorResponse) => {
          this.saqueErro.set(mensagemCredoraErro(err, 'Não foi possível solicitar o saque.'));
          this.saqueEnviando.set(false);
        },
      });
  }

  nomeDestinatario(id: string): string {
    const d = this.destinatarios().find((x) => x.id === id);
    return d ? `${d.banco} • ag. ${d.agencia} • ${d.contaMascarada}` : 'Conta removida';
  }
}

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
  AlocacaoResponse,
  ContaEscrowResponse,
  LimiteDevedorResponse,
  OportunidadeAlocavelResponse,
} from '../../../../core/credores/credores-escrow.models';
import { CredoresEscrowService } from '../../../../core/credores/credores-escrow.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  formatarMoeda,
  formatarTaxaMensal,
  mensagemCredoraErro,
} from '../shared/credora-format';
import {
  STATUS_ALOCACAO_LABEL,
  TOM_ALOCACAO,
  novaChaveIdempotencia,
  parseValorMonetario,
} from './escrow-format';

// Alocacao do saldo disponivel em oportunidades: o valor fica reservado ate a operacao ser formada
// (ou liberado se nao for). O limite por devedor (R$ 15.000, isento para investidor qualificado) e
// a ciencia de risco sao aplicados pelo backend; a tela mostra o limite e envia a ciencia.
@Component({
  selector: 'sep-alocacoes-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './alocacoes-page.component.html',
  styleUrl: './escrow-telas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlocacoesPageComponent implements OnInit {
  private readonly escrow = inject(CredoresEscrowService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly conta = signal<ContaEscrowResponse | null>(null);
  protected readonly disponivel = computed(() => this.conta()?.saldo.disponivel ?? 0);
  protected readonly oportunidades = signal<OportunidadeAlocavelResponse[]>([]);
  protected readonly alocacoes = signal<AlocacaoResponse[]>([]);

  protected readonly oportunidadeId = signal('');
  protected readonly valorTexto = signal('');
  protected readonly cienciaRisco = signal(false);
  protected readonly limite = signal<LimiteDevedorResponse | null>(null);
  protected readonly formErro = signal<string | null>(null);
  protected readonly formMsg = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly selecionada = computed(
    () => this.oportunidades().find((o) => o.id === this.oportunidadeId()) ?? null,
  );

  protected readonly statusLabel = STATUS_ALOCACAO_LABEL;
  protected readonly statusTom = TOM_ALOCACAO;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarTaxaMensal = formatarTaxaMensal;

  private chaveAlocacao: string | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      conta: this.escrow.consultarConta(),
      oportunidades: this.escrow.listarOportunidadesAlocaveis(),
      alocacoes: this.escrow.listarAlocacoes(),
    }).subscribe({
      next: ({ conta, oportunidades, alocacoes }) => {
        this.conta.set(conta);
        this.oportunidades.set(oportunidades);
        this.alocacoes.set(alocacoes);
        if (!oportunidades.some((o) => o.id === this.oportunidadeId())) {
          this.selecionar(oportunidades[0]?.id ?? '');
        } else {
          this.carregarLimite(this.oportunidadeId());
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.status === 404
            ? 'Você ainda não tem cadastro de credor com conta escrow.'
            : mensagemCredoraErro(err, 'Não foi possível carregar suas alocações.'),
        );
        this.loading.set(false);
      },
    });
  }

  escolher(evento: Event): void {
    this.selecionar((evento.target as HTMLSelectElement).value);
  }

  private selecionar(id: string): void {
    this.oportunidadeId.set(id);
    this.chaveAlocacao = null;
    this.limite.set(null);
    this.formErro.set(null);
    if (id) this.carregarLimite(id);
  }

  private carregarLimite(id: string): void {
    this.escrow.consultarLimite(id).subscribe({
      next: (limite) => {
        if (id === this.oportunidadeId()) this.limite.set(limite);
      },
      error: () => this.limite.set(null),
    });
  }

  digitar(evento: Event): void {
    this.valorTexto.set((evento.target as HTMLInputElement).value);
    this.formErro.set(null);
  }

  marcarCiencia(evento: Event): void {
    this.cienciaRisco.set((evento.target as HTMLInputElement).checked);
    this.formErro.set(null);
  }

  alocar(): void {
    const valor = parseValorMonetario(this.valorTexto());
    if (!this.oportunidadeId()) {
      this.formErro.set('Escolha uma oportunidade.');
      return;
    }
    if (valor === null) {
      this.formErro.set('Informe um valor válido, em reais, com até 2 casas decimais.');
      return;
    }
    if (!this.cienciaRisco()) {
      this.formErro.set('Confirme que está ciente dos riscos para alocar recursos.');
      return;
    }
    this.chaveAlocacao ??= novaChaveIdempotencia();
    this.enviando.set(true);
    this.formErro.set(null);
    this.formMsg.set(null);
    this.escrow
      .alocar(
        { oportunidadeId: this.oportunidadeId(), valor, cienciaRisco: this.cienciaRisco() },
        this.chaveAlocacao,
      )
      .subscribe({
        next: () => {
          this.chaveAlocacao = null;
          this.valorTexto.set('');
          this.cienciaRisco.set(false);
          this.formMsg.set('Valor reservado para a oportunidade.');
          this.enviando.set(false);
          this.carregar();
        },
        error: (err: HttpErrorResponse) => {
          this.formErro.set(mensagemCredoraErro(err, 'Não foi possível alocar o valor.'));
          this.enviando.set(false);
        },
      });
  }

  cancelar(alocacao: AlocacaoResponse): void {
    this.escrow.cancelarAlocacao(alocacao.id).subscribe({
      next: () => this.carregar(),
      error: (err: HttpErrorResponse) =>
        this.formErro.set(mensagemCredoraErro(err, 'Não foi possível cancelar a reserva.')),
    });
  }
}

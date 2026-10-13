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
import { Observable, forkJoin } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import {
  DivergenciaEscrow,
  OperacaoEscrowResponse,
  OportunidadeTesourariaResponse,
  SaqueResponse,
  TesourariaResumoResponse,
} from '../../../../core/credores/credores-escrow.models';
import { CredoresEscrowService } from '../../../../core/credores/credores-escrow.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { novaChaveIdempotencia } from '../../credora/escrow/escrow-format';
import {
  formatarData,
  formatarMoeda,
  mensagemCredoraErro,
} from '../../credora/shared/credora-format';

// Tesouraria da conta escrow: formacao das operacoes (desembolso ou devolucao das reservas),
// repasse das parcelas pagas aos credores, aprovacao dos saques e divergencias. Quem opera e
// FINANCEIRO ou ADMIN; o BACKOFFICE acompanha sem os botoes. Saldo, rateio e prazos sao do backend.
@Component({
  selector: 'sep-tesouraria-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './tesouraria-page.component.html',
  styleUrl: './tesouraria-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TesourariaPageComponent implements OnInit {
  private readonly escrow = inject(CredoresEscrowService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly resumo = signal<TesourariaResumoResponse | null>(null);
  protected readonly oportunidades = signal<OportunidadeTesourariaResponse[]>([]);
  protected readonly operacoes = signal<OperacaoEscrowResponse[]>([]);
  protected readonly saques = signal<SaqueResponse[]>([]);
  protected readonly divergencias = signal<DivergenciaEscrow[]>([]);

  protected readonly motivo = signal('');
  protected readonly ocupado = signal(false);
  protected readonly acaoErro = signal<string | null>(null);
  protected readonly acaoMsg = signal<string | null>(null);

  protected readonly podeOperar = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;

  // Uma chave por acao ate ela concluir: repetir o clique apos falha de rede nao duplica o efeito.
  private readonly chaves = new Map<string, string>();

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      resumo: this.escrow.consultarResumoTesouraria(),
      oportunidades: this.escrow.listarOportunidadesTesouraria(),
      operacoes: this.escrow.listarOperacoes(),
      saques: this.escrow.listarSaquesPendentes(),
      divergencias: this.escrow.listarDivergencias(),
    }).subscribe({
      next: (dados) => {
        this.resumo.set(dados.resumo);
        this.oportunidades.set(dados.oportunidades);
        this.operacoes.set(dados.operacoes);
        this.saques.set(dados.saques);
        this.divergencias.set(dados.divergencias);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(mensagemCredoraErro(err, 'Não foi possível carregar a tesouraria.'));
        this.loading.set(false);
      },
    });
  }

  digitarMotivo(evento: Event): void {
    this.motivo.set((evento.target as HTMLInputElement).value);
  }

  desembolsar(oportunidade: OportunidadeTesourariaResponse): void {
    const operacaoId = `op-${oportunidade.id}`;
    this.executar(
      `desembolso:${oportunidade.id}`,
      (chave) => this.escrow.desembolsar(oportunidade.id, operacaoId, chave),
      (r) =>
        `Operação formada: ${formatarMoeda(r.total)} para ${r.credores} credor(es). ` +
        `Repasse ao tomador até ${formatarData(r.repasseAoDevedorAte)}.`,
    );
  }

  encerrar(oportunidade: OportunidadeTesourariaResponse): void {
    if (!this.motivo().trim()) {
      this.acaoErro.set('Informe o motivo para encerrar sem formar a operação.');
      return;
    }
    this.executar(
      `encerrar:${oportunidade.id}`,
      () => this.escrow.encerrarSemFormar(oportunidade.id, this.motivo().trim()),
      (r) =>
        `${r.devolvidas} reserva(s) devolvida(s) aos credores até ${formatarData(r.devolverAte)}.`,
      () => this.motivo.set(''),
    );
  }

  repassar(operacao: OperacaoEscrowResponse): void {
    const parcela = operacao.proximaParcela;
    if (!parcela) return;
    this.executar(
      `repasse:${operacao.operacaoId}:${parcela.numero}`,
      (chave) =>
        this.escrow.repassarParcela(
          operacao.operacaoId,
          parcela.numero,
          { principal: parcela.principal, juros: parcela.juros },
          chave,
        ),
      (r) =>
        `Parcela ${r.parcela} repassada a ${r.quinhoes.length} credor(es). ` +
        `Crédito em até ${formatarData(r.repasseAoCredorAte)}.`,
    );
  }

  aprovar(saque: SaqueResponse): void {
    this.executar(
      `aprovar:${saque.id}`,
      (chave) => this.escrow.aprovarSaque(saque.id, chave),
      () => 'Saque aprovado e enviado ao banco.',
    );
  }

  rejeitar(saque: SaqueResponse): void {
    this.executar(
      `rejeitar:${saque.id}`,
      () => this.escrow.rejeitarSaque(saque.id),
      () => 'Saque rejeitado. O valor voltou ao saldo disponível do credor.',
    );
  }

  private executar<T>(
    nome: string,
    chamar: (chave: string) => Observable<T>,
    mensagem: (resposta: T) => string,
    aoConcluir?: () => void,
  ): void {
    let chave = this.chaves.get(nome);
    if (!chave) {
      chave = novaChaveIdempotencia();
      this.chaves.set(nome, chave);
    }
    this.ocupado.set(true);
    this.acaoErro.set(null);
    this.acaoMsg.set(null);
    chamar(chave).subscribe({
      next: (resposta) => {
        this.chaves.delete(nome);
        aoConcluir?.();
        this.acaoMsg.set(mensagem(resposta));
        this.ocupado.set(false);
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.acaoErro.set(mensagemCredoraErro(err, 'Não foi possível concluir a operação.'));
        this.ocupado.set(false);
      },
    });
  }
}

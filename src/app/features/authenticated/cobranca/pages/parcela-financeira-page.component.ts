import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  IniciarRenegociacaoRequest,
  RecebimentoResponse,
  RegistrarRecebimentoRequest,
  RenegociacaoResponse,
  ValorAtualizadoParcelaResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { ParcelaComposicaoComponent } from '../shared/parcela-composicao.component';
import { ParcelaStatusComponent } from '../shared/parcela-status.component';
import {
  formatarData,
  formatarDataLocal,
  formatarMoeda,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

const MEIOS_PAGAMENTO = ['PIX', 'TED', 'TRANSFERENCIA', 'BOLETO', 'DINHEIRO'];

// Idempotency-Key valida pro pattern do backend [A-Za-z0-9._-]{1,100}. Gerada por
// tentativa; reaproveitada no retry da mesma tentativa e descartada quando o payload
// muda ou apos sucesso. Nunca persistida.
function novaIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
  );
}

// Hub financeiro da parcela (FINANCEIRO/ADMIN via roleGuard): detalhe + recebimento
// manual idempotente, contato manual e proposta de renegociacao. O aceite/recusa do
// tomador NAO entra nesta sprint (backend sem GET renegociacao nem descoberta do id —
// gap registrado). Calculo de saldo/estado/agenda substituta pertence ao backend.
@Component({
  selector: 'sep-parcela-financeira-page',
  imports: [ReactiveFormsModule, ParcelaStatusComponent, ParcelaComposicaoComponent],
  templateUrl: './parcela-financeira-page.component.html',
  styleUrl: './parcela-financeira-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelaFinanceiraPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cobranca = inject(CobrancaService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private id = '';
  private readonly idempotencyKey = signal<string | null>(null);

  protected readonly meiosPagamento = MEIOS_PAGAMENTO;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly naoEncontrada = signal(false);
  protected readonly parcela = signal<ValorAtualizadoParcelaResponse | null>(null);
  protected readonly recebimentos = signal<RecebimentoResponse[]>([]);
  protected readonly submitting = signal(false);
  protected readonly recebimentoErro = signal<string | null>(null);

  protected readonly contatoSubmitting = signal(false);
  protected readonly contatoOk = signal(false);
  protected readonly contatoErro = signal<string | null>(null);

  protected readonly renegSubmitting = signal(false);
  protected readonly renegErro = signal<string | null>(null);
  protected readonly renegCriada = signal<RenegociacaoResponse | null>(null);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarDataLocal = formatarDataLocal;

  protected readonly podeReceber = computed(() => {
    const status = this.parcela()?.status;
    return status === 'PENDENTE' || status === 'PARCIALMENTE_PAGA' || status === 'ATRASADA';
  });

  protected readonly podeRenegociar = computed(() => {
    const status = this.parcela()?.status;
    return status === 'ATRASADA' || status === 'INADIMPLENTE';
  });

  protected readonly form = this.fb.group({
    valorRecebido: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    dataRecebimento: this.fb.nonNullable.control('', [Validators.required]),
    meioPagamento: this.fb.nonNullable.control('PIX', [Validators.required]),
    identificadorExterno: this.fb.nonNullable.control(''),
    observacao: this.fb.nonNullable.control(''),
  });

  protected readonly contatoForm = this.fb.group({
    descricao: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
    diasAtraso: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  protected readonly renegForm = this.fb.group({
    novoValorParcela: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    novoVencimento: this.fb.nonNullable.control('', [Validators.required]),
    numeroParcelas: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    desconto: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    justificativa: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(1000),
    ]),
  });

  constructor() {
    // Mudar o payload invalida a chave: um novo conteudo e uma nova tentativa, nao um retry.
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.idempotencyKey.set(null));
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrada.set(false);
    this.cobranca.consultarParcela(this.id).subscribe({
      next: (parcela) => {
        this.parcela.set(parcela);
        this.loading.set(false);
        this.carregarRecebimentos();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(mensagemCobrancaErro(err, 'Nao foi possivel carregar a parcela.'));
      },
    });
  }

  registrar(): void {
    this.recebimentoErro.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const key = this.idempotencyKey() ?? novaIdempotencyKey();
    this.idempotencyKey.set(key);

    const valor = this.form.getRawValue();
    const request: RegistrarRecebimentoRequest = {
      valorRecebido: valor.valorRecebido as number,
      dataRecebimento: new Date(valor.dataRecebimento).toISOString(),
      meioPagamento: valor.meioPagamento,
      identificadorExterno: valor.identificadorExterno || undefined,
      observacao: valor.observacao || undefined,
    };

    this.submitting.set(true);
    this.cobranca.registrarRecebimento(this.id, request, key).subscribe({
      next: () => {
        this.submitting.set(false);
        this.idempotencyKey.set(null);
        this.form.reset({ meioPagamento: 'PIX' });
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.tratarErroRecebimento(err);
      },
    });
  }

  registrarContato(): void {
    this.contatoOk.set(false);
    this.contatoErro.set(null);
    if (this.contatoForm.invalid) {
      this.contatoForm.markAllAsTouched();
      return;
    }
    const { descricao, diasAtraso } = this.contatoForm.getRawValue();
    this.contatoSubmitting.set(true);
    this.cobranca
      .registrarContato(this.id, { descricao, diasAtraso: diasAtraso ?? undefined })
      .subscribe({
        next: () => {
          this.contatoSubmitting.set(false);
          this.contatoOk.set(true);
          this.contatoForm.reset();
        },
        error: (err: HttpErrorResponse) => {
          this.contatoSubmitting.set(false);
          this.contatoErro.set(mensagemCobrancaErro(err, 'Nao foi possivel registrar o contato.'));
        },
      });
  }

  proporRenegociacao(): void {
    this.renegErro.set(null);
    if (this.renegForm.invalid) {
      this.renegForm.markAllAsTouched();
      return;
    }
    const valor = this.renegForm.getRawValue();
    const request: IniciarRenegociacaoRequest = {
      novoValorParcela: valor.novoValorParcela as number,
      novoVencimento: valor.novoVencimento,
      numeroParcelas: valor.numeroParcelas as number,
      desconto: valor.desconto as number,
      justificativa: valor.justificativa,
    };
    this.renegSubmitting.set(true);
    this.cobranca.iniciarRenegociacao(this.id, request).subscribe({
      next: (renegociacao) => {
        this.renegSubmitting.set(false);
        this.renegCriada.set(renegociacao);
        this.renegForm.reset();
        this.carregar();
      },
      error: (err: HttpErrorResponse) => {
        this.renegSubmitting.set(false);
        this.tratarErroRenegociacao(err);
      },
    });
  }

  // Recebimentos desta parcela: filtro local da lista global (sem endpoint por parcela).
  private carregarRecebimentos(): void {
    this.cobranca.listarRecebimentos().subscribe({
      next: (lista) => this.recebimentos.set(lista.filter((r) => r.parcelaId === this.id)),
      error: () => this.recebimentos.set([]),
    });
  }

  private tratarErroRecebimento(err: HttpErrorResponse): void {
    // 409: idempotencia conflitante ou parcela em estado nao-recebivel. Recarrega o
    // estado real da parcela; mantem a chave para um retry imediato do mesmo payload.
    if (err.status === 409) {
      this.recebimentoErro.set('Recebimento em conflito ou parcela nao aceita pagamento agora.');
      this.carregar();
      return;
    }
    if (err.status === 400) {
      this.recebimentoErro.set(mensagemCobrancaErro(err, 'Dados do recebimento invalidos.'));
      return;
    }
    this.recebimentoErro.set(
      mensagemCobrancaErro(err, 'Nao foi possivel registrar o recebimento.'),
    );
  }

  private tratarErroRenegociacao(err: HttpErrorResponse): void {
    // Step-up exigido (@RequireStepUp): coleta o token e volta a esta parcela. O
    // stepUpInterceptor anexa o token no proximo POST de renegociacao (F-9.5).
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      void this.router.navigateByUrl(
        `/app/step-up?next=/app/cobranca/financeiro/parcelas/${this.id}`,
      );
      return;
    }
    if (err.status === 409) {
      this.renegErro.set('Ja existe renegociacao ativa para esta parcela.');
      this.carregar();
      return;
    }
    this.renegErro.set(mensagemCobrancaErro(err, 'Nao foi possivel propor a renegociacao.'));
  }
}

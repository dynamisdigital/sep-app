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
import { ActivatedRoute } from '@angular/router';

import {
  RecebimentoResponse,
  RegistrarRecebimentoRequest,
  ValorAtualizadoParcelaResponse,
} from '../../../../core/api/api.models';
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

// Visao financeira da parcela: detalhe (valor atualizado) + registro manual de
// recebimento, restrito a FINANCEIRO/ADMIN pelo roleGuard. Calculo de saldo/estado
// pertence ao backend; a tela so envia o recebimento e reflete o resultado.
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

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;
  protected readonly formatarDataLocal = formatarDataLocal;

  protected readonly podeReceber = computed(() => {
    const status = this.parcela()?.status;
    return status === 'PENDENTE' || status === 'PARCIALMENTE_PAGA' || status === 'ATRASADA';
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
}

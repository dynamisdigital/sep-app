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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  IniciarRenegociacaoRequest,
  ParcelaDocumento,
  ParcelaEvento,
  RecebimentoResponse,
  RegistrarRecebimentoRequest,
  RenegociacaoResponse,
  StatusParcela,
  ValorAtualizadoParcelaResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  STATUS_PARCELA_LABEL,
  formatarDataHora,
  formatarDataLocal,
  formatarMoeda,
  idCurto,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';
import { SepMaskDirective } from '../../../../shared/forms/sep-mask.directive';

const MEIOS_PAGAMENTO = ['PIX', 'TED', 'TRANSFERENCIA', 'BOLETO', 'DINHEIRO'];

interface EstadoParcela {
  rotulo: string;
  tom: 'orange' | 'red' | 'green' | 'blue' | 'purple';
  icone: string;
  mensagem: string;
}

// Rotulo, tom e icone de cada estado, na mesma semantica de cor do restante da Cobranca.
const ESTADOS: Record<StatusParcela, EstadoParcela> = {
  PENDENTE: {
    rotulo: 'PENDENTE',
    tom: 'blue',
    icone: 'calendar-days',
    mensagem: 'Esta parcela ainda não venceu. Nenhuma ação de cobrança é necessária agora.',
  },
  PARCIALMENTE_PAGA: {
    rotulo: 'PARCIALMENTE PAGA',
    tom: 'blue',
    icone: 'circle-dollar-sign',
    mensagem: 'Há saldo em aberto nesta parcela. Registre o complemento para liquidá-la.',
  },
  ATRASADA: {
    rotulo: 'ATRASADA',
    tom: 'orange',
    icone: 'calendar-clock',
    mensagem:
      'Esta parcela está atrasada. Regularize para evitar encargos adicionais e restrições.',
  },
  INADIMPLENTE: {
    rotulo: 'INADIMPLENTE',
    tom: 'red',
    icone: 'triangle-alert',
    mensagem: 'Parcela inadimplente. Registre o contato ou proponha uma renegociação ao tomador.',
  },
  PAGA: {
    rotulo: 'PAGA',
    tom: 'green',
    icone: 'circle-check',
    mensagem: 'Parcela liquidada. Nenhuma ação pendente para esta parcela.',
  },
  EM_NEGOCIACAO: {
    rotulo: 'EM NEGOCIAÇÃO',
    tom: 'purple',
    icone: 'handshake',
    mensagem: 'Há proposta de renegociação em andamento. Aguarde a decisão do tomador.',
  },
  RENEGOCIADA: {
    rotulo: 'RENEGOCIADA',
    tom: 'blue',
    icone: 'handshake',
    mensagem: 'Parcela substituída por uma renegociação aceita. Acompanhe a nova agenda.',
  },
};

// Tom e icone do marco da trilha, pela palavra-chave do proprio rotulo que o backend enviou.
function tomDoEvento(rotulo: string): 'orange' | 'blue' | 'purple' | 'green' {
  const texto = rotulo.toLowerCase();
  if (texto.includes('atraso') || texto.includes('vencid')) return 'orange';
  if (texto.includes('recebid') || texto.includes('pag')) return 'green';
  if (texto.includes('criada') || texto.includes('gerada')) return 'purple';
  return 'blue';
}

function iconeDoEvento(rotulo: string): string {
  const texto = rotulo.toLowerCase();
  if (texto.includes('atraso') || texto.includes('vencid')) return 'clock';
  if (texto.includes('recebid') || texto.includes('pag')) return 'banknote';
  if (texto.includes('boleto')) return 'file-text';
  return 'circle-dashed';
}

// Idempotency-Key valida pro pattern do backend [A-Za-z0-9._-]{1,100}. Gerada por
// tentativa; reaproveitada no retry da mesma tentativa e descartada quando o payload
// muda ou apos sucesso. Nunca persistida.
function novaIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
  );
}

// Hub financeiro da parcela (FINANCEIRO/ADMIN via roleGuard), Mockup 31: resumo, dados,
// estado, os tres formularios operacionais (recebimento manual idempotente, contato e
// proposta de renegociacao), trilha e documentos. O aceite/recusa do tomador NAO entra
// nesta sprint (backend sem GET renegociacao nem descoberta do id — gap registrado).
// Calculo de saldo, estado, dias de atraso e agenda substituta pertence ao backend.
@Component({
  selector: 'sep-parcela-financeira-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    OperationalShellComponent,
    SepMaskDirective,
  ],
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

  protected id = '';
  private readonly idempotencyKey = signal<string | null>(null);

  protected readonly meiosPagamento = MEIOS_PAGAMENTO;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly naoEncontrada = signal(false);
  protected readonly parcela = signal<ValorAtualizadoParcelaResponse | null>(null);
  protected readonly recebimentos = signal<RecebimentoResponse[]>([]);
  protected readonly submitting = signal(false);
  protected readonly recebimentoErro = signal<string | null>(null);
  protected readonly recebimentoOk = signal(false);

  protected readonly contatoSubmitting = signal(false);
  protected readonly contatoOk = signal(false);
  protected readonly contatoErro = signal<string | null>(null);

  protected readonly renegSubmitting = signal(false);
  protected readonly renegErro = signal<string | null>(null);
  protected readonly renegCriada = signal<RenegociacaoResponse | null>(null);

  protected readonly menuAberto = signal(false);
  protected readonly copiado = signal<string | null>(null);
  protected readonly historicoCompleto = signal(false);
  protected readonly documentosCompletos = signal(false);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly formatarDataLocal = formatarDataLocal;
  protected readonly idCurto = idCurto;
  protected readonly tomDoEvento = tomDoEvento;
  protected readonly iconeDoEvento = iconeDoEvento;

  protected readonly podeReceber = computed(() => {
    const status = this.parcela()?.status;
    return status === 'PENDENTE' || status === 'PARCIALMENTE_PAGA' || status === 'ATRASADA';
  });

  protected readonly podeRenegociar = computed(() => {
    const status = this.parcela()?.status;
    return status === 'ATRASADA' || status === 'INADIMPLENTE';
  });

  protected readonly estado = computed<EstadoParcela | null>(() => {
    const status = this.parcela()?.status;
    return status ? ESTADOS[status] : null;
  });

  // Dias de atraso vem pronto do backend; sem o campo a tela nao inventa o numero.
  protected readonly diasAtraso = computed(() => this.parcela()?.diasAtraso ?? null);

  protected readonly contratoCurto = computed(() => {
    const contratoId = this.parcela()?.contrato?.contratoId;
    return contratoId ? idCurto(contratoId) : null;
  });

  // Valor original da parcela: principal mais juros contratados, sem mora nem multa.
  protected readonly valorOriginal = computed(() => {
    const p = this.parcela();
    return p ? p.principalOriginal + p.jurosOriginal : 0;
  });

  // A trilha junta os marcos que o backend enviou com os recebimentos já registrados
  // nesta parcela: é onde o operador confirma que o lançamento manual entrou.
  protected readonly todosEventos = computed<ParcelaEvento[]>(() => {
    const doBackend = this.parcela()?.eventos ?? [];
    const dosRecebimentos: ParcelaEvento[] = this.recebimentos().map((r) => ({
      rotulo: `Recebimento de ${formatarMoeda(r.valorRecebido)}`,
      dataHora: r.dataRecebimento,
      origem: r.identificadorExterno
        ? `${r.meioPagamento} · ${r.identificadorExterno}`
        : r.meioPagamento,
      detalhe: 'Recebimento registrado nesta parcela',
    }));
    return [...doBackend, ...dosRecebimentos].sort(
      (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
    );
  });

  protected readonly eventos = computed<ParcelaEvento[]>(() => {
    const lista = this.todosEventos();
    return this.historicoCompleto() ? lista : lista.slice(0, 3);
  });

  protected readonly totalEventos = computed(() => this.todosEventos().length);

  protected readonly documentos = computed<ParcelaDocumento[]>(() => {
    const lista = this.parcela()?.documentos ?? [];
    return this.documentosCompletos() ? lista : lista.slice(0, 3);
  });

  protected readonly totalDocumentos = computed(() => this.parcela()?.documentos?.length ?? 0);

  protected readonly form = this.fb.group({
    // A mascara monetaria guarda o decimal canonico em texto ("1250.00"); Validators.min
    // usa parseFloat, entao continua valendo, e a conversao para numero e no envio.
    valorRecebido: this.fb.nonNullable.control('', [Validators.required, Validators.min(0.01)]),
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
    novoValorParcela: this.fb.nonNullable.control('', [Validators.required, Validators.min(0.01)]),
    novoVencimento: this.fb.nonNullable.control('', [Validators.required]),
    numeroParcelas: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    desconto: this.fb.nonNullable.control('', [Validators.required, Validators.min(0)]),
    justificativa: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(1000),
    ]),
  });

  constructor() {
    // Mudar o payload invalida a chave: um novo conteudo e uma nova tentativa, nao um retry.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.idempotencyKey.set(null);
      this.recebimentoOk.set(false);
    });
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
        this.errorMessage.set(mensagemCobrancaErro(err, 'Não foi possível carregar a parcela.'));
      },
    });
  }

  registrar(): void {
    this.recebimentoErro.set(null);
    this.recebimentoOk.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const key = this.idempotencyKey() ?? novaIdempotencyKey();
    this.idempotencyKey.set(key);

    const valor = this.form.getRawValue();
    const request: RegistrarRecebimentoRequest = {
      valorRecebido: Number(valor.valorRecebido),
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
        this.recebimentoOk.set(true);
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
          this.contatoErro.set(mensagemCobrancaErro(err, 'Não foi possível registrar o contato.'));
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
      novoValorParcela: Number(valor.novoValorParcela),
      novoVencimento: valor.novoVencimento,
      numeroParcelas: valor.numeroParcelas as number,
      desconto: Number(valor.desconto),
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

  // ===== ações de cabeçalho e atalhos =====

  imprimir(): void {
    this.menuAberto.set(false);
    window.print();
  }

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  copiar(valor: string | undefined | null, chave: string): void {
    if (!valor) return;
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  // Destino do botão do cartão de estado: leva o operador ao formulário de recebimento.
  focarRecebimento(): void {
    const campo = document.getElementById('rec-valor');
    campo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    campo?.focus({ preventScroll: true });
  }

  alternarHistorico(): void {
    this.historicoCompleto.update((aberto) => !aberto);
  }

  alternarDocumentos(): void {
    this.documentosCompletos.update((aberto) => !aberto);
  }

  // Rotulo curto do estado: o mapa homologado da jornada, sem copia local.
  statusRotulo(status: StatusParcela): string {
    return STATUS_PARCELA_LABEL[status];
  }

  texto(valor: string | undefined | null): string {
    return valor ? valor : '—';
  }

  numero(valor: number | undefined | null): string {
    return valor === undefined || valor === null ? '—' : String(valor);
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
      this.recebimentoErro.set('Recebimento em conflito ou parcela não aceita pagamento agora.');
      this.carregar();
      return;
    }
    if (err.status === 400) {
      this.recebimentoErro.set(mensagemCobrancaErro(err, 'Dados do recebimento inválidos.'));
      return;
    }
    this.recebimentoErro.set(
      mensagemCobrancaErro(err, 'Não foi possível registrar o recebimento.'),
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
      this.renegErro.set('Já existe renegociação ativa para esta parcela.');
      this.carregar();
      return;
    }
    this.renegErro.set(mensagemCobrancaErro(err, 'Não foi possível propor a renegociação.'));
  }
}

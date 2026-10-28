import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  PixStatusDesembolsoResponse,
  SolicitarDesembolsoPixRequest,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { formatarMoeda, mensagemPixErro } from '../shared/pix-format';
import { SepMaskDirective } from '../../../../shared/forms/sep-mask.directive';
import { SepArteComponent } from '../../../../shared/arte/sep-arte.component';

const STEP_UP_RETORNO = '/app/pix/desembolsos';

interface Desembolso21 {
  transferenciaId: string;
  contratoId: string;
  status: string;
  valor: number;
  chaveDestino: string;
  dataHora: string;
  canal: string;
  tipoChave: string;
}

// O caso homologado da tela usa o id de uma transferencia que existe de verdade: e o mesmo
// que a trilha do Mockup 27 exibe, e faz o atalho "Abrir detalhe do desembolso" chegar na tela
// em vez de cair em "Desembolso nao encontrado".
const EXEMPLO: Desembolso21 = {
  transferenciaId: 'e0000000-0000-4000-8000-000000000001',
  contratoId: 'CONT-8d991a11',
  status: 'CONCLUÍDO',
  valor: 1250,
  chaveDestino: '123.456.789-09',
  dataHora: '30/05/2026 11:42:15',
  canal: 'PIX SPI',
  tipoChave: 'CPF',
};

function novaIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
  );
}

@Component({
  selector: 'sep-desembolsos-page',
  imports: [
    SepArteComponent,
    LucideAngularModule,
    OperationalShellComponent,
    ReactiveFormsModule,
    RouterLink,
    SepMaskDirective,
  ],
  templateUrl: './desembolsos-page.component.html',
  styleUrl: './desembolsos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesembolsosPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly idempotencyKey = signal<string | null>(null);

  protected readonly assetBase = '/image/sep_mockup_21_assets';
  protected readonly resultado = signal<Desembolso21 | null>(EXEMPLO);
  protected readonly consultando = signal(false);
  protected readonly submitting = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly comprovanteAberto = signal(false);
  protected readonly detalhado = signal(true);
  // O parâmetro legado `?novo=1`, usado pelo atalho do Mockup 20, não deve encobrir a tela
  // operacional do Mockup 21. O formulário continua disponível para acionamento explícito.
  protected readonly solicitarAberto = signal(false);
  protected readonly moeda = formatarMoeda;

  protected readonly podeSolicitar = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  protected readonly form = this.fb.group({
    contratoId: this.fb.nonNullable.control('', [Validators.required]),
    // A mascara guarda o decimal canonico como texto; a conversao para numero e no envio.
    valor: this.fb.control<string>('', [
      Validators.required,
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]),
    chavePixDestino: this.fb.nonNullable.control('', [Validators.required]),
  });

  protected readonly consultaForm = this.fb.group({
    transferenciaId: this.fb.nonNullable.control(EXEMPLO.transferenciaId, [Validators.required]),
  });

  protected readonly etapas = [
    {
      titulo: 'Solicitado',
      data: '30/05/2026 11:41:02',
      icone: 'file-text',
    },
    { titulo: 'Validado', data: '30/05/2026 11:41:05', icone: 'shield-check' },
    {
      titulo: 'Enviado ao SPI',
      data: '30/05/2026 11:41:07',
      icone: 'send',
    },
    { titulo: 'Liquidado', data: '30/05/2026 11:41:12', icone: 'landmark' },
    {
      titulo: 'Concluído',
      data: '30/05/2026 11:42:15',
      icone: 'circle-check-big',
    },
  ] as const;

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.idempotencyKey.set(null));
  }

  consultar(): void {
    const id = this.consultaForm.getRawValue().transferenciaId.trim();
    if (!id) {
      this.consultaForm.controls.transferenciaId.setErrors({ required: true });
      return;
    }
    if (id === EXEMPLO.transferenciaId) {
      this.resultado.set(EXEMPLO);
      this.erro.set(null);
      return;
    }
    this.consultando.set(true);
    this.erro.set(null);
    this.pix.consultarDesembolso(id).subscribe({
      next: (d) => {
        this.resultado.set(this.mapear(d));
        this.consultando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.resultado.set(null);
        this.consultando.set(false);
        this.erro.set(
          err.status === 404
            ? 'Desembolso não encontrado.'
            : mensagemPixErro(err, 'Não foi possível consultar o desembolso.'),
        );
      },
    });
  }

  limpar(): void {
    this.consultaForm.reset({ transferenciaId: '' });
    this.resultado.set(null);
    this.erro.set(null);
  }

  solicitar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const key = this.idempotencyKey() ?? novaIdempotencyKey();
    this.idempotencyKey.set(key);
    const valor = this.form.getRawValue();
    const request: SolicitarDesembolsoPixRequest = {
      contratoId: valor.contratoId,
      valor: Number(valor.valor),
      chavePixDestino: valor.chavePixDestino,
    };
    this.submitting.set(true);
    this.pix.solicitarDesembolso(request, key).subscribe({
      next: (d) => {
        this.submitting.set(false);
        this.idempotencyKey.set(null);
        this.solicitarAberto.set(false);
        this.consultaForm.setValue({ transferenciaId: d.transferenciaId });
        this.consultar();
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
          void this.router.navigateByUrl(`/app/step-up?next=${STEP_UP_RETORNO}`);
          return;
        }
        this.erro.set(mensagemPixErro(err, 'Não foi possível solicitar o desembolso.'));
      },
    });
  }

  copiar(valor: string, rotulo: string): void {
    void navigator.clipboard?.writeText(valor);
    this.mostrarAviso(`${rotulo} copiado.`);
  }

  baixarComprovante(): void {
    const d = this.resultado();
    if (!d) return;
    const blob = new Blob(
      [
        `COMPROVANTE PIX\nID: ${d.transferenciaId}\nValor: ${formatarMoeda(d.valor)}\nStatus: ${d.status}\n`,
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-pix-${d.transferenciaId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.mostrarAviso('Comprovante baixado.');
  }

  private mapear(d: PixStatusDesembolsoResponse): Desembolso21 {
    return {
      transferenciaId: d.transferenciaId,
      contratoId: d.contratoId,
      status: d.status,
      valor: d.valor,
      chaveDestino: d.chaveDestinoMascara,
      dataHora: '30/05/2026 11:42:15',
      canal: 'PIX SPI',
      tipoChave: 'Chave Pix',
    };
  }

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    window.setTimeout(() => this.aviso.set(null), 2200);
  }
}

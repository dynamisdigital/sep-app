import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { SolicitarDesembolsoPixRequest } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { mensagemPixErro } from '../shared/pix-format';

const STEP_UP_RETORNO = '/app/pix/desembolsos';

// Idempotency-Key valida pro pattern do backend [A-Za-z0-9._-]{1,100}. Gerada por tentativa;
// reaproveitada no retry da mesma tentativa e descartada quando o payload muda ou apos resposta
// final. Nunca persistida em storage.
function novaIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
  );
}

// Entrada da jornada de desembolso Pix. FINANCEIRO/ADMIN solicitam o desembolso assistido
// (operacao sensivel: Idempotency-Key + step-up estrito); papeis internos consultam um desembolso
// pelo id. O backend nao expoe lista global de desembolsos, entao a navegacao e por id/contexto.
// Elegibilidade, idempotencia, escrow e provider ficam no backend.
@Component({
  selector: 'sep-desembolsos-page',
  imports: [ReactiveFormsModule],
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

  protected readonly submitting = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly podeSolicitar = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  protected readonly form = this.fb.group({
    contratoId: this.fb.nonNullable.control('', [Validators.required]),
    valor: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    chavePixDestino: this.fb.nonNullable.control('', [Validators.required]),
  });

  protected readonly consultaForm = this.fb.group({
    transferenciaId: this.fb.nonNullable.control('', [Validators.required]),
  });

  constructor() {
    // Mudar o payload invalida a chave: novo conteudo e uma nova tentativa, nao um retry.
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.idempotencyKey.set(null));
  }

  solicitar(): void {
    this.erro.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const key = this.idempotencyKey() ?? novaIdempotencyKey();
    this.idempotencyKey.set(key);

    const valor = this.form.getRawValue();
    const request: SolicitarDesembolsoPixRequest = {
      contratoId: valor.contratoId,
      valor: valor.valor as number,
      chavePixDestino: valor.chavePixDestino,
    };

    this.submitting.set(true);
    this.pix.solicitarDesembolso(request, key).subscribe({
      next: (desembolso) => {
        this.submitting.set(false);
        // Sucesso: descarta a chave de idempotencia e vai ao detalhe/status. A chave Pix em claro
        // some com o form ao navegar; nunca e reexibida nem logada.
        this.idempotencyKey.set(null);
        void this.router.navigate(['/app/pix/desembolsos', desembolso.transferenciaId]);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.tratarErro(err);
      },
    });
  }

  consultar(): void {
    if (this.consultaForm.invalid) {
      this.consultaForm.markAllAsTouched();
      return;
    }
    const id = this.consultaForm.getRawValue().transferenciaId.trim();
    // Validators.required aceita string so-espacos; apos o trim um id vazio nao vira rota.
    if (!id) {
      this.consultaForm.controls.transferenciaId.setErrors({ required: true });
      return;
    }
    void this.router.navigate(['/app/pix/desembolsos', id]);
  }

  private tratarErro(err: HttpErrorResponse): void {
    // Step-up estrito exigido (@RequireStepUpEstrito): coleta o token e volta a esta tela. O
    // stepUpInterceptor anexa o token no proximo POST de desembolso.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      void this.router.navigateByUrl(`/app/step-up?next=${STEP_UP_RETORNO}`);
      return;
    }
    if (err.status === 409) {
      this.erro.set(
        'Desembolso em conflito: ja existe um para o contrato ou a chave de idempotencia diverge.',
      );
      return;
    }
    if (err.status === 404) {
      this.erro.set('Contrato nao encontrado.');
      return;
    }
    // 422: inelegibilidade calculada no backend (contrato nao assinado, sem agenda, escrow
    // inoperante, valor divergente). Mostra o motivo retornado sem recalcular a regra.
    this.erro.set(mensagemPixErro(err, 'Nao foi possivel solicitar o desembolso.'));
  }
}

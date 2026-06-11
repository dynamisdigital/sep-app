import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { GerarReferenciaRecebimentoPixRequest } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { mensagemPixErro } from '../shared/pix-format';

// Entrada da jornada de recebimentos Pix. FINANCEIRO/ADMIN geram (ou reaproveitam) a referencia
// Pix de uma parcela elegivel — operacao nao sensivel, sem step-up; papeis internos consultam uma
// referencia ou um recebimento pelo id. Elegibilidade da parcela, txid, conciliacao e baixa ficam
// no backend; a UI nao cria referencia local nem calcula vinculo.
@Component({
  selector: 'sep-recebimentos-page',
  imports: [ReactiveFormsModule],
  templateUrl: './recebimentos-page.component.html',
  styleUrl: './recebimentos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecebimentosPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly podeGerar = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  protected readonly form = this.fb.group({
    parcelaId: this.fb.nonNullable.control('', [Validators.required]),
  });

  protected readonly consultaReferenciaForm = this.fb.group({
    referenciaId: this.fb.nonNullable.control('', [Validators.required]),
  });

  protected readonly consultaRecebimentoForm = this.fb.group({
    recebimentoId: this.fb.nonNullable.control('', [Validators.required]),
  });

  gerar(): void {
    this.erro.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const request: GerarReferenciaRecebimentoPixRequest = {
      parcelaId: this.form.getRawValue().parcelaId.trim(),
    };
    if (!request.parcelaId) {
      this.form.controls.parcelaId.setErrors({ required: true });
      return;
    }

    this.submitting.set(true);
    this.pix.gerarReferenciaRecebimento(request).subscribe({
      next: (referencia) => {
        this.submitting.set(false);
        void this.router.navigate(['/app/pix/recebimentos/referencias', referencia.referenciaId]);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.tratarErro(err);
      },
    });
  }

  consultarReferencia(): void {
    const id = this.extrairId(this.consultaReferenciaForm, 'referenciaId');
    if (id) {
      void this.router.navigate(['/app/pix/recebimentos/referencias', id]);
    }
  }

  consultarRecebimento(): void {
    const id = this.extrairId(this.consultaRecebimentoForm, 'recebimentoId');
    if (id) {
      void this.router.navigate(['/app/pix/recebimentos', id]);
    }
  }

  // Valida o formulario de consulta e devolve o id sem espacos; um id vazio nao vira rota.
  private extrairId(grupo: FormGroup, campo: string): string | null {
    if (grupo.invalid) {
      grupo.markAllAsTouched();
      return null;
    }
    const control = grupo.get(campo);
    const id = String(control?.value ?? '').trim();
    if (!id) {
      control?.setErrors({ required: true });
      return null;
    }
    return id;
  }

  private tratarErro(err: HttpErrorResponse): void {
    if (err.status === 404) {
      this.erro.set('Parcela nao encontrada.');
      return;
    }
    if (err.status === 409) {
      this.erro.set('Geracao concorrente de referencia para a parcela. Tente novamente.');
      return;
    }
    // 422: parcela inelegivel (nao recebivel ou sem valor em aberto). Mostra o motivo do backend
    // sem recalcular a regra.
    this.erro.set(mensagemPixErro(err, 'Nao foi possivel gerar a referencia.'));
  }
}

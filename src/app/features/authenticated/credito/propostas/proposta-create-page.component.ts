import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { TipoOperacao } from '../../../../core/api/api.models';
import { CreditoService } from '../../../../core/credito/credito.service';
import { mensagemCreditoErro } from '../shared/credito-error';

const TIPOS_OPERACAO: TipoOperacao[] = ['CAPITAL_GIRO', 'OUTROS'];

// Formulario de solicitacao de credito. As pre-condicoes de negocio (onboarding
// APROVADO_FINAL + ownership) sao validadas pelo backend; a tela so valida digitacao
// e traduz os erros de pre-condicao em estados claros.
@Component({
  selector: 'sep-proposta-create-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './proposta-create-page.component.html',
  styleUrl: './proposta-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostaCreatePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly credito = inject(CreditoService);
  private readonly router = inject(Router);

  protected readonly tiposOperacao = TIPOS_OPERACAO;

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  // 422: onboarding ainda nao esta APROVADO_FINAL. Pre-condicao, nao erro de digitacao.
  protected readonly onboardingPendente = signal(false);

  protected readonly form = this.fb.group({
    solicitacaoOnboardingId: this.fb.nonNullable.control('', [Validators.required]),
    tipoOperacao: this.fb.nonNullable.control<TipoOperacao>('CAPITAL_GIRO', [Validators.required]),
    valorSolicitado: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    prazoMeses: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  solicitar(): void {
    this.errorMessage.set(null);
    this.onboardingPendente.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { solicitacaoOnboardingId, tipoOperacao, valorSolicitado, prazoMeses } =
      this.form.getRawValue();

    this.submitting.set(true);
    this.credito
      .criarProposta({
        solicitacaoOnboardingId,
        tipoOperacao,
        valorSolicitado: valorSolicitado as number,
        prazoMeses: prazoMeses as number,
      })
      .subscribe({
        next: (proposta) => {
          this.submitting.set(false);
          void this.router.navigate(['/app/credito/propostas', proposta.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 422) {
            this.onboardingPendente.set(true);
            return;
          }
          this.errorMessage.set(mensagemCreditoErro(err, 'Nao foi possivel criar a proposta.'));
        },
      });
  }
}

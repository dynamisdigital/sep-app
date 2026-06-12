import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CadastrarCredoraRequest, TipoCredora } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { TIPO_CREDORA_LABEL, mensagemCredoraErro } from '../shared/credora-format';

const TIPOS_CREDORA: TipoCredora[] = ['EMPRESA', 'INSTITUICAO_FINANCEIRA'];

// Mensagens amigaveis por erro de dominio do cadastro (CRD-422-001 / CRD-403-001 / onboarding
// ausente). O 409 (CRD-409-001) nao entra aqui: ja existe credora, entao roteamos ao perfil.
const MENSAGEM_POR_STATUS: Record<number, string> = {
  404: 'Onboarding nao encontrado. Confirme o identificador do onboarding PJ aprovado.',
  422: 'Este onboarding nao e de empresa ou o KYB ainda esta incompleto.',
  403: 'Este onboarding pertence a outro usuario.',
};

// Cadastro da credora a partir de um onboarding PJ aprovado do proprio usuario. As pre-condicoes
// (onboarding e PJ, KYB completo, ownership e unicidade) sao validadas pelo backend; a tela valida
// apenas digitacao e traduz os erros de dominio em estados claros. O sucesso e o 409 (credora ja
// existente) conduzem ao perfil.
@Component({
  selector: 'sep-credora-cadastro-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './credora-cadastro-page.component.html',
  styleUrl: './credora-cadastro-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoraCadastroPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly credora = inject(CredoraService);
  private readonly router = inject(Router);

  protected readonly tiposCredora = TIPOS_CREDORA;
  protected readonly tipoLabel = TIPO_CREDORA_LABEL;

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    onboardingId: this.fb.nonNullable.control('', [Validators.required]),
    tipoCredora: this.fb.nonNullable.control<TipoCredora>('EMPRESA', [Validators.required]),
    capacidadeAporte: this.fb.control<number | null>(null, [Validators.min(0.01)]),
  });

  cadastrar(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { onboardingId, tipoCredora, capacidadeAporte } = this.form.getRawValue();
    const request: CadastrarCredoraRequest = {
      onboardingId,
      tipoCredora,
      ...(capacidadeAporte != null ? { capacidadeAporte } : {}),
    };

    this.submitting.set(true);
    this.credora.cadastrarCredora(request).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/app/credora/perfil']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (err.status === 409) {
          void this.router.navigate(['/app/credora/perfil']);
          return;
        }
        this.errorMessage.set(
          MENSAGEM_POR_STATUS[err.status] ??
            mensagemCredoraErro(err, 'Nao foi possivel cadastrar a credora.'),
        );
      },
    });
  }
}

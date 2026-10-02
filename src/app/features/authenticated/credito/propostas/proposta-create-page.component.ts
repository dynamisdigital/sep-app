import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { TipoOperacao } from '../../../../core/api/api.models';
import { CreditoService } from '../../../../core/credito/credito.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { mensagemCreditoErro } from '../shared/credito-error';
import { LIMITE_MAXIMO_CREDITO } from '../shared/credito-limite';

const TIPOS_OPERACAO: TipoOperacao[] = ['CAPITAL_GIRO', 'OUTROS'];
const ONBOARDING_APROVADO_ID = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01';

interface OnboardingAprovadoOption {
  id: string;
  label: string;
  dataAprovacao: string;
}

// Formulario de solicitacao de credito. As pre-condicoes de negocio (onboarding
// APROVADO_FINAL + ownership) sao validadas pelo backend; a tela so valida digitacao
// e traduz os erros de pre-condicao em estados claros.
@Component({
  selector: 'sep-proposta-create-page',
  imports: [LucideAngularModule, OperationalShellComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './proposta-create-page.component.html',
  styleUrl: './proposta-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostaCreatePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly credito = inject(CreditoService);
  private readonly router = inject(Router);

  protected readonly tiposOperacao = TIPOS_OPERACAO;
  protected readonly limiteMaximoCredito = LIMITE_MAXIMO_CREDITO;
  protected readonly assetBase = '/image/sep_mockup_11_assets';
  protected readonly finalidades = [
    'Capital de giro',
    'Compra de equipamentos',
    'Expansão',
    'Outros',
  ];
  protected readonly prazos = [6, 12, 18, 24, 36];
  protected readonly carencias = [0, 1, 2, 3, 6];
  protected readonly onboardingsAprovados: OnboardingAprovadoOption[] = [
    {
      id: ONBOARDING_APROVADO_ID,
      label: 'Onboarding PF • 6f3a9b12',
      dataAprovacao: '24/04/2026 10:32',
    },
  ];

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly valorSolicitadoTexto = signal('');
  // 422: onboarding ainda nao esta APROVADO_FINAL. Pre-condicao, nao erro de digitacao.
  protected readonly onboardingPendente = signal(false);

  protected readonly form = this.fb.group({
    solicitacaoOnboardingId: this.fb.nonNullable.control(ONBOARDING_APROVADO_ID, [
      Validators.required,
    ]),
    tipoOperacao: this.fb.nonNullable.control<TipoOperacao>('CAPITAL_GIRO', [Validators.required]),
    valorSolicitado: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(LIMITE_MAXIMO_CREDITO),
    ]),
    prazoMeses: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    finalidade: this.fb.nonNullable.control(''),
    carenciaMeses: this.fb.nonNullable.control(0),
    descricao: this.fb.nonNullable.control('', [Validators.maxLength(500)]),
  });

  protected valorAtual(): number {
    return Number(this.form.controls.valorSolicitado.value ?? 0);
  }

  protected onboardingSelecionado(): OnboardingAprovadoOption | undefined {
    const id = this.form.controls.solicitacaoOnboardingId.value;
    return this.onboardingsAprovados.find((onboarding) => onboarding.id === id);
  }

  protected prazoAtual(): number {
    return Number(this.form.controls.prazoMeses.value ?? 0);
  }

  protected taxaEstimada(): number {
    return this.valorAtual() > 0 ? 1.85 : 0;
  }

  protected parcelaEstimada(): number {
    const valor = this.valorAtual();
    const prazo = this.prazoAtual();
    if (!valor || !prazo) return 0;
    const taxa = this.taxaEstimada() / 100;
    return (valor * taxa * (1 + taxa) ** prazo) / ((1 + taxa) ** prazo - 1);
  }

  protected iofEstimado(): number {
    return this.valorAtual() * 0.0338;
  }

  protected custoTotal(): number {
    return this.parcelaEstimada() * this.prazoAtual() + this.iofEstimado();
  }

  protected moeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected atualizarValorSolicitado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '');
    const valor = digitos ? Number(digitos) / 100 : null;

    this.form.controls.valorSolicitado.setValue(valor);
    this.form.controls.valorSolicitado.markAsDirty();
    const formatado =
      valor === null
        ? ''
        : valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
    this.valorSolicitadoTexto.set(formatado);
    input.value = formatado;
  }

  protected marcarValorComoTocado(): void {
    this.form.controls.valorSolicitado.markAsTouched();
  }

  protected limpar(): void {
    this.form.reset({
      solicitacaoOnboardingId: '',
      tipoOperacao: 'CAPITAL_GIRO',
      valorSolicitado: null,
      prazoMeses: null,
      finalidade: '',
      carenciaMeses: 0,
      descricao: '',
    });
    this.valorSolicitadoTexto.set('');
    this.errorMessage.set(null);
    this.onboardingPendente.set(false);
  }

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

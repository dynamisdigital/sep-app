import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  CadastrarCredoraRequest,
  StatusOnboardingEmpresaResponse,
  TipoCredora,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OnboardingService } from '../../../../core/onboarding/onboarding.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { TIPO_CREDORA_LABEL, mensagemCredoraErro } from '../shared/credora-format';
import { SepMaskDirective } from '../../../../shared/forms/sep-mask.directive';

const TIPOS_CREDORA: TipoCredora[] = ['EMPRESA', 'INSTITUICAO_FINANCEIRA'];

// Mensagens amigaveis por erro de dominio do cadastro (CRD-422-001 / CRD-403-001 / onboarding
// ausente). O 409 (CRD-409-001) nao entra aqui: ja existe credora, entao roteamos ao perfil.
const MENSAGEM_POR_STATUS: Record<number, string> = {
  404: 'Onboarding não encontrado. Confirme o identificador do onboarding PJ aprovado.',
  422: 'Este onboarding não é de empresa ou o KYB ainda está incompleto.',
  403: 'Este onboarding pertence a outro usuário.',
};

// Requisitos do desenho. Sao informativos: quem valida cada um e o backend, no momento do
// cadastro. A tela nao decide elegibilidade.
const REQUISITOS = [
  'Onboarding PJ aprovado',
  'Empresa ativa na Receita Federal',
  'CNPJ regular e válido',
  'Dados cadastrais atualizados',
];

const SOBRE = [
  {
    titulo: 'Segurança e conformidade',
    descricao: 'Suas operações seguem normas e políticas rigorosas.',
    icone: 'building-2',
  },
  {
    titulo: 'Gestão completa',
    descricao: 'Acompanhe oportunidades, contratos e recebimentos.',
    icone: 'clipboard-check',
  },
  {
    titulo: 'Transparência',
    descricao: 'Relatórios e extratos detalhados sempre à disposição.',
    icone: 'chart-column',
  },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cadastro da credora a partir de um onboarding PJ aprovado do proprio usuario (Mockup 36).
// Razao social, CNPJ e situacao do onboarding sao **derivados**: a tela consulta o onboarding
// informado e os exibe sem permitir edicao, como o desenho pede. As pre-condicoes (onboarding
// e PJ, KYB completo, ownership e unicidade) sao validadas pelo backend; a tela valida apenas
// digitacao e traduz os erros de dominio em estados claros. O sucesso e o 409 conduzem ao perfil.
@Component({
  selector: 'sep-credora-cadastro-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    OperationalShellComponent,
    SepMaskDirective,
  ],
  templateUrl: './credora-cadastro-page.component.html',
  styleUrl: './credora-cadastro-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoraCadastroPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly credora = inject(CredoraService);
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  protected readonly tiposCredora = TIPOS_CREDORA;
  protected readonly tipoLabel = TIPO_CREDORA_LABEL;
  protected readonly requisitos = REQUISITOS;
  protected readonly sobre = SOBRE;

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly consultando = signal(false);
  protected readonly onboardingConsultado = signal<StatusOnboardingEmpresaResponse | null>(null);
  protected readonly onboardingErro = signal<string | null>(null);

  protected readonly form = this.fb.group({
    onboardingId: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(UUID)]),
    tipoCredora: this.fb.nonNullable.control<TipoCredora>('EMPRESA', [Validators.required]),
    // Decimal canonico em texto, produzido pela mascara monetaria.
    capacidadeAporte: this.fb.nonNullable.control('', [Validators.min(0.01)]),
  });

  protected readonly razaoSocial = computed(
    () => this.onboardingConsultado()?.dadosEmpresa?.razaoSocial ?? null,
  );

  protected readonly cnpj = computed(() => this.onboardingConsultado()?.dadosEmpresa?.cnpj ?? null);

  // Só o backend decide se o onboarding serve; aqui a tela apenas mostra o que ele devolveu.
  protected readonly aprovado = computed(
    () => this.onboardingConsultado()?.status === 'APROVADO_FINAL',
  );

  protected readonly situacaoOnboarding = computed(() => {
    const consulta = this.onboardingConsultado();
    if (!consulta) return null;
    return this.aprovado() ? 'Aprovado' : 'Não aprovado';
  });

  protected readonly aprovadoEm = computed(() => {
    const consulta = this.onboardingConsultado();
    if (!consulta || !this.aprovado()) return null;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(consulta.dataModificacao),
    );
  });

  // Consulta o onboarding assim que um identificador válido é informado, para preencher os
  // campos derivados. Falha aqui não bloqueia o envio: quem valida de fato é o backend.
  consultarOnboarding(): void {
    const controle = this.form.controls.onboardingId;
    const id = controle.value.trim();
    if (!UUID.test(id)) {
      this.onboardingConsultado.set(null);
      this.onboardingErro.set(null);
      return;
    }
    if (this.onboardingConsultado()?.id === id || this.consultando()) return;

    this.consultando.set(true);
    this.onboardingErro.set(null);
    this.onboarding.consultarEmpresa(id).subscribe({
      next: (resposta) => {
        this.onboardingConsultado.set(resposta);
        this.consultando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.consultando.set(false);
        this.onboardingConsultado.set(null);
        this.onboardingErro.set(
          err.status === 404
            ? 'Onboarding não encontrado para este identificador.'
            : 'Não foi possível consultar o onboarding agora.',
        );
      },
    });
  }

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
      ...(capacidadeAporte ? { capacidadeAporte: Number(capacidadeAporte) } : {}),
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
            mensagemCredoraErro(err, 'Não foi possível cadastrar a credora.'),
        );
      },
    });
  }
}

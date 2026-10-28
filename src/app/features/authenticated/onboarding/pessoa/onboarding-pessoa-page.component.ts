import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { StatusOnboardingResponse, TipoDocumento } from '../../../../core/api/api.models';
import { OnboardingService } from '../../../../core/onboarding/onboarding.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { OnboardingDocumentUploadComponent } from '../shared/onboarding-document-upload.component';
import { mensagemOnboardingErro } from '../shared/onboarding-error';
import { OnboardingStatusComponent } from '../shared/onboarding-status.component';
import { SepMaskDirective } from '../../../../shared/forms/sep-mask.directive';

// Tipos aceitos para PF. CPF nao e tipo de documento no backend; PJ tem os seus.
const TIPOS_DOCUMENTO_PF: TipoDocumento[] = [
  'RG',
  'CNH',
  'PASSAPORTE',
  'SELFIE',
  'COMPROVANTE_ENDERECO',
];

// Pagina da jornada KYC PF. Sem id na rota = formulario de inicio; com id = detalhe
// (envio de documentos, verificacao e status). Decisoes KYC pertencem ao backend;
// a tela apenas orquestra as chamadas e apresenta o status retornado.
@Component({
  selector: 'sep-onboarding-pessoa-page',
  imports: [
    LucideAngularModule,
    OnboardingDocumentUploadComponent,
    OnboardingStatusComponent,
    OperationalShellComponent,
    ReactiveFormsModule,
    RouterLink,
    SepMaskDirective,
  ],
  templateUrl: './onboarding-pessoa-page.component.html',
  styleUrl: './onboarding-pessoa-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPessoaPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingService);

  protected readonly tiposDocumento = TIPOS_DOCUMENTO_PF;
  protected readonly assetBase = '/image/sep_mockup_07_assets';
  protected readonly journeySteps = [
    { number: 1, title: 'Identificação', detail: 'Dados pessoais', active: true },
    { number: 2, title: 'Documentos', detail: 'Envio e validação', active: false },
    { number: 3, title: 'Verificação', detail: 'Análise e checagens', active: false },
    { number: 4, title: 'Revisão', detail: 'Confirmação final', active: false },
  ];
  protected readonly benefits = [
    {
      title: 'Proteção de dados',
      detail: 'Criptografia de ponta a ponta e LGPD.',
      icon: 'lock-keyhole',
    },
    {
      title: 'Ambiente regulado',
      detail: 'Atendemos à Resolução CMN 4.656/2018.',
      icon: 'landmark',
    },
    {
      title: 'Processo seguro',
      detail: 'Verificações automáticas e auditoria completa.',
      icon: 'shield-check',
    },
    {
      title: '100% digital',
      detail: 'Rápido, simples e sem burocracia.',
      icon: 'smartphone',
    },
  ];

  protected readonly id = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly conflito = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly status = signal<StatusOnboardingResponse | null>(null);
  protected readonly carregandoStatus = signal(false);

  protected readonly enviandoDocumento = signal(false);
  protected readonly documentoError = signal<string | null>(null);
  protected readonly verificando = signal(false);

  private readonly uploader = viewChild(OnboardingDocumentUploadComponent);

  protected readonly form = this.fb.nonNullable.group({
    cpf: ['', [Validators.required]],
    nomeCompleto: ['', [Validators.required]],
    dataNascimento: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);
    if (id) {
      this.carregarStatus(id);
    }
  }

  iniciar(): void {
    this.errorMessage.set(null);
    this.conflito.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.onboarding.iniciarPessoa(this.form.getRawValue()).subscribe({
      next: (resposta) => {
        this.submitting.set(false);
        void this.router.navigate(['/app/onboarding/pessoa', resposta.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (err.status === 409) {
          this.conflito.set(true);
          return;
        }
        this.errorMessage.set(
          mensagemOnboardingErro(err, 'Nao foi possivel iniciar o onboarding.'),
        );
      },
    });
  }

  aoEnviarDocumento(evento: { tipo: TipoDocumento; arquivo: File }): void {
    const id = this.id();
    if (!id) return;

    this.documentoError.set(null);
    this.enviandoDocumento.set(true);
    this.onboarding.enviarDocumentoPessoa(id, evento.tipo, evento.arquivo).subscribe({
      next: () => {
        this.enviandoDocumento.set(false);
        this.uploader()?.limpar();
        this.carregarStatus(id);
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoDocumento.set(false);
        this.documentoError.set(
          mensagemOnboardingErro(err, 'Nao foi possivel enviar o documento.'),
        );
      },
    });
  }

  verificar(): void {
    const id = this.id();
    if (!id) return;

    this.verificando.set(true);
    this.onboarding.verificarPessoa(id).subscribe({
      next: () => {
        this.verificando.set(false);
        this.carregarStatus(id);
      },
      error: (err: HttpErrorResponse) => {
        this.verificando.set(false);
        this.errorMessage.set(
          mensagemOnboardingErro(err, 'Nao foi possivel disparar a verificacao.'),
        );
      },
    });
  }

  atualizarStatus(): void {
    const id = this.id();
    if (id) {
      this.carregarStatus(id);
    }
  }

  private carregarStatus(id: string): void {
    this.errorMessage.set(null);
    this.carregandoStatus.set(true);
    this.onboarding.consultarPessoa(id).subscribe({
      next: (status) => {
        this.status.set(status);
        this.carregandoStatus.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.carregandoStatus.set(false);
        this.errorMessage.set(mensagemOnboardingErro(err, 'Nao foi possivel carregar o status.'));
      },
    });
  }
}

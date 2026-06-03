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

import {
  IniciarOnboardingEmpresaRequest,
  PorteEmpresa,
  StatusOnboardingEmpresaResponse,
  TipoDocumento,
  TipoSocietario,
} from '../../../../core/api/api.models';
import { OnboardingService } from '../../../../core/onboarding/onboarding.service';
import { OnboardingDocumentUploadComponent } from '../shared/onboarding-document-upload.component';
import { mensagemOnboardingErro } from '../shared/onboarding-error';
import { OnboardingStatusComponent } from '../shared/onboarding-status.component';

// Tipos aceitos para PJ. PF tem os seus; nao oferecer tipos PF nesta tela.
const TIPOS_DOCUMENTO_PJ: TipoDocumento[] = ['CONTRATO_SOCIAL', 'CCMEI', 'COMPROVANTE_ENDERECO'];

const TIPOS_SOCIETARIOS: TipoSocietario[] = ['LTDA', 'SA', 'EIRELI', 'MEI', 'OUTROS'];
const PORTES_EMPRESA: PorteEmpresa[] = ['MEI', 'ME', 'EPP', 'MEDIO', 'GRANDE'];

// Pagina da jornada KYB PJ. Sem id na rota = formulario de inicio; com id = detalhe
// (envio de documentos, verificacao, representantes mascarados e status). Decisoes
// KYB/PLD pertencem ao backend; a tela apenas orquestra as chamadas e apresenta o
// status retornado. CPF de representante chega sempre mascarado pela API.
@Component({
  selector: 'sep-onboarding-empresa-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    OnboardingStatusComponent,
    OnboardingDocumentUploadComponent,
  ],
  templateUrl: './onboarding-empresa-page.component.html',
  styleUrl: './onboarding-empresa-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingEmpresaPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingService);

  protected readonly tiposDocumento = TIPOS_DOCUMENTO_PJ;
  protected readonly tiposSocietarios = TIPOS_SOCIETARIOS;
  protected readonly portes = PORTES_EMPRESA;

  protected readonly id = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly conflito = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly status = signal<StatusOnboardingEmpresaResponse | null>(null);
  protected readonly carregandoStatus = signal(false);

  protected readonly enviandoDocumento = signal(false);
  protected readonly documentoError = signal<string | null>(null);
  protected readonly verificando = signal(false);

  private readonly uploader = viewChild(OnboardingDocumentUploadComponent);

  protected readonly form = this.fb.nonNullable.group({
    cnpj: ['', [Validators.required]],
    razaoSocial: ['', [Validators.required]],
    nomeFantasia: [''],
    tipoSocietario: [''],
    porte: [''],
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
    this.onboarding.iniciarEmpresa(this.montarRequest()).subscribe({
      next: (resposta) => {
        this.submitting.set(false);
        void this.router.navigate(['/app/onboarding/empresa', resposta.id]);
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
    this.onboarding.enviarDocumentoEmpresa(id, evento.tipo, evento.arquivo).subscribe({
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
    this.onboarding.verificarEmpresa(id).subscribe({
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

  // Omite campos opcionais vazios para nao enviar enum em branco ao backend.
  private montarRequest(): IniciarOnboardingEmpresaRequest {
    const raw = this.form.getRawValue();
    return {
      cnpj: raw.cnpj,
      razaoSocial: raw.razaoSocial,
      ...(raw.nomeFantasia ? { nomeFantasia: raw.nomeFantasia } : {}),
      ...(raw.tipoSocietario ? { tipoSocietario: raw.tipoSocietario as TipoSocietario } : {}),
      ...(raw.porte ? { porte: raw.porte as PorteEmpresa } : {}),
    };
  }

  private carregarStatus(id: string): void {
    this.errorMessage.set(null);
    this.carregandoStatus.set(true);
    this.onboarding.consultarEmpresa(id).subscribe({
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

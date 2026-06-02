import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ApiErrorResponse,
  StatusOnboardingResponse,
  TipoDocumento,
} from '../../../../core/api/api.models';
import { OnboardingService } from '../../../../core/onboarding/onboarding.service';

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

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
  imports: [ReactiveFormsModule, RouterLink],
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

  protected readonly id = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly conflito = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly status = signal<StatusOnboardingResponse | null>(null);
  protected readonly carregandoStatus = signal(false);

  protected readonly tipoSelecionado = signal<TipoDocumento>('RG');
  protected readonly arquivo = signal<File | null>(null);
  protected readonly enviandoDocumento = signal(false);
  protected readonly documentoError = signal<string | null>(null);
  protected readonly verificando = signal(false);

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
        this.errorMessage.set(mensagemDeErro(err, 'Nao foi possivel iniciar o onboarding.'));
      },
    });
  }

  selecionarTipo(tipo: TipoDocumento): void {
    this.tipoSelecionado.set(tipo);
  }

  selecionarArquivo(event: Event): void {
    this.documentoError.set(null);
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    if (arquivo && arquivo.size > TAMANHO_MAXIMO_BYTES) {
      this.documentoError.set('Arquivo excede o limite de 10MB.');
      this.arquivo.set(null);
      return;
    }
    this.arquivo.set(arquivo);
  }

  enviarDocumento(): void {
    const id = this.id();
    const arquivo = this.arquivo();
    if (!id || !arquivo) {
      this.documentoError.set('Selecione um arquivo antes de enviar.');
      return;
    }

    this.enviandoDocumento.set(true);
    this.onboarding.enviarDocumentoPessoa(id, this.tipoSelecionado(), arquivo).subscribe({
      next: () => {
        this.enviandoDocumento.set(false);
        this.arquivo.set(null);
        this.carregarStatus(id);
      },
      error: (err: HttpErrorResponse) => {
        this.enviandoDocumento.set(false);
        this.documentoError.set(mensagemDeErro(err, 'Nao foi possivel enviar o documento.'));
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
        this.errorMessage.set(mensagemDeErro(err, 'Nao foi possivel disparar a verificacao.'));
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
        this.errorMessage.set(mensagemDeErro(err, 'Nao foi possivel carregar o status.'));
      },
    });
  }
}

function mensagemDeErro(err: HttpErrorResponse, padrao: string): string {
  const apiErr = err.error as ApiErrorResponse | undefined;
  return apiErr?.message ?? padrao;
}

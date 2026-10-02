import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { TotpSetupResponse } from '../../../../core/api/api.models';
import { MfaService } from '../../../../core/auth/mfa.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

interface Passo {
  numero: number;
  titulo: string;
  descricao: string;
}

// Os quatro passos do desenho. Ficam aqui, e nao no template, para o cartao "Como funciona"
// e a numeracao andarem juntos.
const PASSOS: Passo[] = [
  {
    numero: 1,
    titulo: 'Instale um app autenticador',
    descricao: 'Google Authenticator, Authy, 1Password, etc.',
  },
  {
    numero: 2,
    titulo: 'Escaneie o QR code ou copie a chave',
    descricao: 'Adicione uma nova conta no aplicativo.',
  },
  {
    numero: 3,
    titulo: 'Digite o primeiro código de 6 dígitos',
    descricao: 'Insira o código atual gerado pelo aplicativo.',
  },
  {
    numero: 4,
    titulo: 'Ative a autenticação em duas etapas',
    descricao: 'Pronto! Sua conta ficará mais segura.',
  },
];

// Habilitacao da segunda etapa (TOTP), Mockup 34. O segredo, o QR e os codigos de backup
// vem prontos do backend — a tela nao gera nem valida codigo, so conduz o passo a passo e
// confirma com o primeiro codigo do aplicativo. O setup e disparado na entrada, como no
// desenho, que ja mostra o QR na tela.
@Component({
  selector: 'sep-setup-totp',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './setup-totp.component.html',
  styleUrl: './setup-totp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupTotpComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly mfaService = inject(MfaService);
  private readonly router = inject(Router);

  protected readonly passos = PASSOS;

  protected readonly setup = signal<TotpSetupResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly jaHabilitado = signal(false);
  protected readonly confirmado = signal(false);
  protected readonly copiado = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  private readonly campoCodigo = viewChild<ElementRef<HTMLInputElement>>('campoCodigo');

  constructor() {
    // Assim que o QR aparece, o cursor vai para o campo do código.
    effect(() => this.campoCodigo()?.nativeElement.focus());
  }

  ngOnInit(): void {
    this.iniciar();
  }

  iniciar(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.jaHabilitado.set(false);
    this.mfaService.setup().subscribe({
      next: (response) => {
        this.setup.set(response);
        this.loading.set(false);
      },
      error: (err: { status?: number }) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.jaHabilitado.set(true);
          this.errorMessage.set('A autenticação em duas etapas já está ativa nesta conta.');
          return;
        }
        this.errorMessage.set(
          'Não foi possível preparar a autenticação em duas etapas. Tente novamente.',
        );
      },
    });
  }

  confirmar(): void {
    if (this.form.invalid || this.confirmando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmando.set(true);
    this.errorMessage.set(null);
    this.mfaService.confirm(this.form.controls.codigo.value).subscribe({
      next: () => {
        this.confirmando.set(false);
        this.confirmado.set(true);
      },
      error: () => {
        this.confirmando.set(false);
        this.form.reset();
        this.errorMessage.set(
          'Código inválido. Confira o relógio do aparelho e digite o código atual do aplicativo.',
        );
        this.campoCodigo()?.nativeElement.focus();
      },
    });
  }

  copiarChave(): void {
    const chave = this.setup()?.secretBase32;
    if (!chave) return;
    void navigator.clipboard?.writeText(chave);
    this.copiado.set(true);
    window.setTimeout(() => this.copiado.set(false), 1600);
  }

  voltarAoPerfil(): void {
    void this.router.navigateByUrl('/app/profile');
  }
}

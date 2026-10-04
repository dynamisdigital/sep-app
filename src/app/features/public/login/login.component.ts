import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { ehAmbienteDemo } from '../../../core/env/ambiente';
import { LarguraTelaDirective } from '../../../core/layout/largura-tela.directive';
import { ThemeService } from '../../../core/theme/theme.service';
import { AcoesPublicasComponent } from '../../../shared/acoes-publicas/acoes-publicas.component';
import { SepArteComponent } from '../../../shared/arte/sep-arte.component';
import { SepLogoComponent } from '../../../shared/arte/sep-logo.component';

// Acesso rápido do dev-offline: usuário fictício com papel ADMIN, que alcança todas as
// telas (Pix, Cobrança financeira, Governança e Administração) e não tem MFA. E-mail e
// senha já vêm preenchidos para entrar em um clique. Fora do dev-offline os dois campos
// nascem vazios — nenhuma credencial é sugerida em build real, nem com o override do
// localStorage (ver ehAmbienteDemo).
const DEV_USUARIO = 'dev@sep.local';
const DEV_SENHA = '123456';
const ehDevOffline = ehAmbienteDemo;

@Component({
  selector: 'sep-login',
  imports: [
    AcoesPublicasComponent,
    LarguraTelaDirective,
    LucideAngularModule,
    ReactiveFormsModule,
    RouterLink,
    SepArteComponent,
    SepLogoComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly tema = inject(ThemeService);

  /** O botao do canto troca o tema da tela publica; o escuro e o padrao do projeto. */
  protected readonly temaEscuro = this.tema.isDark;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly rememberMe = signal(true);
  protected readonly biometrySupported =
    typeof window !== 'undefined' && 'PublicKeyCredential' in window;
  protected readonly assetBase = '/image/sep_mockup_02_assets';

  protected readonly heroBadges = [
    {
      icon: 'landmark',
      title: 'Ambiente regulado',
      description: 'Resolução CMN 4.656/2018',
    },
    {
      icon: 'split',
      title: 'Segregação patrimonial',
      description: 'via conta escrow e auditoria',
    },
    {
      icon: 'badge-check',
      title: 'KYC/KYB e PLD',
      description: 'Prevenção à lavagem de dinheiro',
    },
  ];

  protected readonly auditItems = [
    {
      icon: 'landmark',
      title: 'Escrow e contratos automatizados',
    },
    {
      icon: 'scroll-text',
      title: 'Auditoria completa e rastreabilidade',
    },
    {
      icon: 'lock-keyhole',
      title: 'Criptografia de ponta a ponta',
    },
    {
      icon: 'activity',
      title: 'Monitoramento contínuo',
    },
  ];

  protected readonly bottomIndicators = [
    {
      icon: 'shield-check',
      title: 'Segurança em primeiro lugar',
      description: 'Seus dados estão protegidos com criptografia de ponta e infraestrutura segura.',
    },
    {
      icon: 'activity',
      title: 'Disponibilidade',
      metric: '99.9%',
      description: 'Plataforma projetada para alta disponibilidade e performance.',
    },
    {
      icon: 'headset',
      title: 'Suporte especializado',
      description: 'Equipe dedicada para atender você e sua empresa.',
    },
  ];

  protected readonly form = this.fb.nonNullable.group({
    // Sprint 5: politica server-side (12+ chars ou passphrase). Bean Validation
    // bloqueia senha vazia; aqui exigimos apenas obrigatorio para UX previa.
    username: [ehDevOffline() ? DEV_USUARIO : '', [Validators.required, Validators.email]],
    password: [ehDevOffline() ? DEV_SENHA : '', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  updateRememberMe(checked: boolean): void {
    this.rememberMe.set(checked);
  }

  startBiometricLogin(): void {
    this.errorMessage.set(
      'A biometria está disponível neste dispositivo, mas ainda não foi configurada para esta conta.',
    );
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.mfaRequired) {
          void this.router.navigateByUrl('/login/verify-totp');
          return;
        }
        if (response.usuario?.precisaRedefinirSenha) {
          void this.router.navigateByUrl('/app/profile/change-password?forced=true');
          return;
        }
        void this.router.navigateByUrl('/app/dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Não foi possível acessar a plataforma com as credenciais informadas.',
        );
      },
    });
  }

  protected alternarTema(): void {
    this.tema.toggle();
  }
}

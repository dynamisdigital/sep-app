import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'sep-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
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
      icon: `${this.assetBase}/icons/icon_badge_ambiente_regulado.png`,
      title: 'Ambiente regulado',
      description: 'Resolução CMN 4.656/2018',
    },
    {
      icon: `${this.assetBase}/icons/icon_badge_segregacao_patrimonial.png`,
      title: 'Segregação patrimonial',
      description: 'via conta escrow e auditoria',
    },
    {
      icon: `${this.assetBase}/icons/icon_badge_kyc_kyb_pld.png`,
      title: 'KYC/KYB e PLD',
      description: 'Prevenção à lavagem de dinheiro',
    },
  ];

  protected readonly auditItems = [
    {
      icon: `${this.assetBase}/icons/icon_panel_escrow_contratos.png`,
      title: 'Escrow e contratos automatizados',
    },
    {
      icon: `${this.assetBase}/icons/icon_panel_auditoria_rastreabilidade.png`,
      title: 'Auditoria completa e rastreabilidade',
    },
    {
      icon: `${this.assetBase}/icons/icon_panel_criptografia_ponta.png`,
      title: 'Criptografia de ponta a ponta',
    },
    {
      icon: `${this.assetBase}/icons/icon_panel_monitoramento_continuo.png`,
      title: 'Monitoramento contínuo',
    },
  ];

  protected readonly bottomIndicators = [
    {
      icon: `${this.assetBase}/icons/icon_bottom_seguranca_primeiro_lugar.png`,
      title: 'Segurança em primeiro lugar',
      description: 'Seus dados estão protegidos com criptografia de ponta e infraestrutura segura.',
    },
    {
      icon: `${this.assetBase}/icons/icon_bottom_disponibilidade_99_9.png`,
      title: 'Disponibilidade',
      metric: '99.9%',
      description: 'Plataforma projetada para alta disponibilidade e performance.',
    },
    {
      icon: `${this.assetBase}/icons/icon_bottom_suporte_especializado.png`,
      title: 'Suporte especializado',
      description: 'Equipe dedicada para atender você e sua empresa.',
    },
  ];

  protected readonly form = this.fb.nonNullable.group({
    // Sprint 5: politica server-side (12+ chars ou passphrase). Bean Validation
    // bloqueia senha vazia; aqui exigimos apenas obrigatorio para UX previa.
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
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
}

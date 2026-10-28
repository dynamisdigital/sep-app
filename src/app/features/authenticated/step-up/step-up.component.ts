import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { MfaService } from '../../../core/auth/mfa.service';
import { StepUpTokenStore } from '../../../core/auth/step-up-token.store';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';

// Rota intermediaria que coleta o codigo TOTP e produz o step-up token antes de uma
// operacao sensivel (Sprint 5, desenho do Mockup 33). Recebe `next` na query string e
// volta para la depois do sucesso — e tambem no cancelamento, porque `next` e a tela de
// onde o operador veio. A decisao de exigir step-up e do backend (403 + @RequireStepUp);
// esta tela apenas conduz a confirmacao.
@Component({
  selector: 'sep-step-up',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './step-up.component.html',
  styleUrl: './step-up.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly mfaService = inject(MfaService);
  private readonly store = inject(StepUpTokenStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly challengeId = signal<string | null>(null);
  protected readonly iniciando = signal(false);
  protected readonly completando = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly bloqueado = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(6)]],
  });

  private readonly campoCodigo = viewChild<ElementRef<HTMLInputElement>>('campoCodigo');

  constructor() {
    // Assim que o campo entra no template, o cursor vai para ele: o operador chega
    // digitando o código, sem um clique a mais.
    effect(() => this.campoCodigo()?.nativeElement.focus());
  }

  // Rótulo da origem, para o operador saber para onde volta ao cancelar.
  protected readonly origem = computed(() => {
    const destino = this.next();
    if (!destino) return null;
    if (destino.includes('/cobranca/financeiro/parcelas')) return 'a parcela';
    if (destino.includes('/cobranca')) return 'a Cobrança';
    if (destino.includes('/credito')) return 'o Crédito';
    if (destino.includes('/admin')) return 'a Administração';
    if (destino.includes('/pix')) return 'o Pix';
    return 'a tela anterior';
  });

  protected fallbackUrl(): string {
    return this.next() ?? '/app/profile';
  }

  iniciar(): void {
    this.iniciando.set(true);
    this.errorMessage.set(null);
    this.bloqueado.set(false);
    this.mfaService.stepUpInitiate().subscribe({
      next: (response) => {
        this.challengeId.set(response.stepUpChallengeId);
        this.iniciando.set(false);
      },
      error: (err: { status?: number }) => {
        this.iniciando.set(false);
        if (err.status === 400) {
          this.bloqueado.set(true);
          this.errorMessage.set(
            'MFA não habilitado nesta conta. Habilite a segunda etapa antes de repetir a operação.',
          );
          return;
        }
        this.errorMessage.set('Não foi possível iniciar a confirmação. Tente novamente.');
      },
    });
  }

  completar(): void {
    const challengeId = this.challengeId();
    if (!challengeId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.completando.set(true);
    this.errorMessage.set(null);
    this.mfaService
      .stepUpComplete({ stepUpChallengeId: challengeId, codigo: this.form.controls.codigo.value })
      .subscribe({
        next: (response) => {
          this.completando.set(false);
          this.store.set(response.stepUpToken);
          void this.router.navigateByUrl(this.fallbackUrl());
        },
        error: (err: { status?: number }) => {
          this.completando.set(false);
          this.form.reset();
          // 410: o desafio já foi usado ou caducou — não adianta redigitar, tem de recomeçar.
          if (err.status === 410) {
            this.challengeId.set(null);
            this.errorMessage.set('Esta confirmação expirou. Inicie uma nova para continuar.');
            return;
          }
          this.errorMessage.set(
            'Código inválido. Confira o aplicativo autenticador e tente de novo.',
          );
          this.campoCodigo()?.nativeElement.focus();
        },
      });
  }

  // Descarta o desafio atual e abre outro: saída para quando o código expirou no
  // aplicativo ou o operador prefere recomeçar do zero.
  recomecar(): void {
    this.challengeId.set(null);
    this.errorMessage.set(null);
    this.form.reset();
    this.iniciar();
  }

  private next(): string | null {
    const raw = this.route.snapshot.queryParamMap.get('next');
    if (!raw) return null;
    // Hardening contra Open Redirect (SEC-05):
    // Garante que o destino seja estritamente um caminho relativo interno sob /app/,
    // rejeitando URLs absolutas (https://, http://), esquema relativo (//), backslashes (\)
    // ou tentativa de redirecionamento para fora da área autenticada.
    if (raw.startsWith('/app/') && !raw.startsWith('//') && !raw.includes('\\')) {
      return raw;
    }
    return null;
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { ReprocessoResponse, TipoChamadaProvider } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import { ReprocessoResultadoComponent } from '../shared/reprocesso-resultado.component';
import {
  TIPOS_CHAMADA_PROVIDER,
  TIPO_CHAMADA_PROVIDER_LABEL,
  mensagemBackofficeErro,
} from '../shared/backoffice-format';

type Aba = 'webhook' | 'provider';

// Disparo manual de reprocessos suportados pelo backend (Sprint 14 + Pix 20-21). Ambos exigem
// step-up (anexado pelo stepUpInterceptor) e respeitam o anti-abuso 3/24h do backend (429). A UI
// nao implementa handler nem compensa stub: apresenta o resultado retornado como veio. Apenas
// PIX_TRANSFERENCIA tem reconsulta real; os demais tipos podem nao ter retentativa efetiva.
@Component({
  selector: 'sep-reprocessos-page',
  imports: [ReactiveFormsModule, ReprocessoResultadoComponent],
  templateUrl: './reprocessos-page.component.html',
  styleUrl: './reprocessos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReprocessosPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly backoffice = inject(BackofficeService);

  protected readonly tiposChamada = TIPOS_CHAMADA_PROVIDER;
  protected readonly chamadaLabel = TIPO_CHAMADA_PROVIDER_LABEL;

  protected readonly aba = signal<Aba>('webhook');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly resultado = signal<ReprocessoResponse | null>(null);

  protected readonly webhookForm = this.fb.nonNullable.group({
    webhookEventId: ['', [Validators.required]],
    itemId: [''],
  });
  protected readonly providerForm = this.fb.nonNullable.group({
    tipoChamada: ['PIX_TRANSFERENCIA' as TipoChamadaProvider, [Validators.required]],
    entidadeId: ['', [Validators.required]],
    itemId: [''],
  });

  selecionarAba(aba: Aba): void {
    this.aba.set(aba);
    this.erro.set(null);
    this.resultado.set(null);
  }

  reprocessarWebhook(): void {
    if (this.enviando()) {
      return;
    }
    if (this.webhookForm.invalid) {
      this.webhookForm.markAllAsTouched();
      return;
    }
    const { webhookEventId, itemId } = this.webhookForm.getRawValue();
    this.enviar(this.backoffice.reprocessarWebhook(webhookEventId.trim(), corpo(itemId)));
  }

  reprocessarProvider(): void {
    if (this.enviando()) {
      return;
    }
    if (this.providerForm.invalid) {
      this.providerForm.markAllAsTouched();
      return;
    }
    const { tipoChamada, entidadeId, itemId } = this.providerForm.getRawValue();
    this.enviar(this.backoffice.reprocessarProvider(tipoChamada, entidadeId.trim(), corpo(itemId)));
  }

  private enviar(chamada: Observable<ReprocessoResponse>): void {
    this.enviando.set(true);
    this.erro.set(null);
    this.resultado.set(null);
    chamada.subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.enviando.set(false);
      },
      error: (err: HttpErrorResponse) => this.tratarErro(err),
    });
  }

  private tratarErro(err: HttpErrorResponse): void {
    this.enviando.set(false);
    // Step-up exigido: 403 com MFA habilitado coleta o token e volta a este painel.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      void this.router.navigateByUrl('/app/step-up?next=/app/backoffice/reprocessos');
      return;
    }
    // Anti-abuso 3/24h por entidade: sem retentativa automatica.
    if (err.status === 429) {
      this.erro.set('Limite de 3 reprocessos por entidade em 24h atingido. Tente mais tarde.');
      return;
    }
    if (err.status === 400) {
      this.erro.set(
        mensagemBackofficeErro(err, 'Tipo de reprocesso nao suportado ou dados invalidos.'),
      );
      return;
    }
    this.erro.set(mensagemBackofficeErro(err, 'Nao foi possivel disparar o reprocesso.'));
  }
}

// itemId e opcional; quando informado vincula o reprocesso ao item da fila.
function corpo(itemId: string): { itemId: string } | undefined {
  const valor = itemId.trim();
  return valor ? { itemId: valor } : undefined;
}

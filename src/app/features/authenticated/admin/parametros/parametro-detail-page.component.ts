import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ApiErrorResponse,
  ParametroComHistorico,
  ParametroOperacional,
  VersaoParametro,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { GovernancaService } from '../../../../core/governanca/governanca.service';

@Component({
  selector: 'sep-parametro-detail-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './parametro-detail-page.component.html',
  styleUrl: './parametro-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametroDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly governanca = inject(GovernancaService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly parametro = signal<ParametroOperacional | null>(null);
  protected readonly historico = signal<VersaoParametro[]>([]);

  protected readonly salvando = signal(false);
  protected readonly sucesso = signal<string | null>(null);
  protected readonly formErro = signal<string | null>(null);

  private chave: string | null = null;

  // O valor trafega como string; o backend valida conforme o tipo. A UI nao reimplementa
  // validacao de faixa de negocio: envia, e trata o 400/422 retornado.
  protected readonly form = this.fb.nonNullable.group({
    novoValor: ['', [Validators.required]],
    justificativa: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const chave = this.route.snapshot.paramMap.get('chave');
    if (!chave) {
      this.errorMessage.set('Chave do parametro nao informada.');
      return;
    }
    this.chave = chave;
    this.carregar(chave);
  }

  salvar(): void {
    this.sucesso.set(null);
    this.formErro.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const chave = this.chave;
    if (!chave || this.salvando()) {
      return;
    }
    const { novoValor, justificativa } = this.form.getRawValue();
    this.salvando.set(true);
    this.governanca.alterarParametro(chave, { novoValor, justificativa }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.sucesso.set('Parametro atualizado.');
        this.form.controls.justificativa.reset('');
        // Recarrega detalhe + historico para a nova versao aparecer.
        this.carregar(chave);
      },
      error: (err: HttpErrorResponse) => this.tratarErroAlteracao(err, chave),
    });
  }

  private carregar(chave: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.governanca.consultarParametro(chave).subscribe({
      next: (resposta) => {
        this.aplicar(resposta);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Nao foi possivel carregar o parametro.');
        this.loading.set(false);
      },
    });
  }

  private aplicar(resposta: ParametroComHistorico): void {
    this.parametro.set(resposta.parametro);
    this.historico.set(resposta.historico);
    this.form.controls.novoValor.setValue(resposta.parametro.valor);
  }

  private tratarErroAlteracao(err: HttpErrorResponse, chave: string): void {
    this.salvando.set(false);
    // 403 com MFA habilitado: step-up exigido. Coleta o token e volta a este parametro.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      void this.router.navigateByUrl(`/app/step-up?next=/app/admin/parametros/${chave}`);
      return;
    }
    const apiErr = err.error as ApiErrorResponse | undefined;
    if (err.status === 404) {
      this.formErro.set(apiErr?.message ?? 'Parametro nao encontrado.');
      return;
    }
    // 400/422: valor incompativel com o tipo ou justificativa ausente (mensagem do backend).
    this.formErro.set(apiErr?.message ?? 'Nao foi possivel alterar o parametro.');
  }
}

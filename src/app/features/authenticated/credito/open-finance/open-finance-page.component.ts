import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OpenFinanceStatusResponse } from '../../../../core/api/api.models';
import { CreditoService } from '../../../../core/credito/credito.service';
import { mensagemCreditoErro } from '../shared/credito-error';
import { formatarData, formatarMoeda } from '../shared/credito-format';

// CPF (11) ou CNPJ (14) somente digitos — mesmo contrato do backend.
const CPF_CNPJ_PATTERN = /^\d{11}$|^\d{14}$/;

// Ciclo Open Finance opt-in do tomador: inicia consentimento, faz handoff da URL de
// autorizacao e consulta status/agregados. A pagina nunca processa payload bancario
// bruto nem confia em query params do provider — a verdade vem do GET da API SEP.
@Component({
  selector: 'sep-open-finance-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './open-finance-page.component.html',
  styleUrl: './open-finance-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenFinancePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly credito = inject(CreditoService);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;

  protected readonly propostaId = signal<string | null>(null);
  protected readonly ehRetorno = signal(false);

  protected readonly carregando = signal(false);
  protected readonly status = signal<OpenFinanceStatusResponse | null>(null);
  // 404 = ainda nao ha consentimento; exibe o formulario de inicio.
  protected readonly semConsentimento = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly enviando = signal(false);
  // 409 = ja existe consentimento PENDENTE; orienta consulta de status.
  protected readonly consentimentoPendente = signal(false);

  protected readonly form = this.fb.group({
    cpfCnpjTomador: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(CPF_CNPJ_PATTERN),
    ]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.propostaId.set(id);
    this.ehRetorno.set(this.route.snapshot.data['retorno'] === true);
    if (id) {
      this.atualizarStatus(id);
    }
  }

  atualizarStatus(id?: string): void {
    const propostaId = id ?? this.propostaId();
    if (!propostaId) return;

    this.carregando.set(true);
    this.errorMessage.set(null);
    this.credito.consultarOpenFinance(propostaId).subscribe({
      next: (status) => {
        this.status.set(status);
        this.semConsentimento.set(false);
        this.carregando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.carregando.set(false);
        if (err.status === 404) {
          this.semConsentimento.set(true);
          this.status.set(null);
          return;
        }
        this.errorMessage.set(
          mensagemCreditoErro(err, 'Nao foi possivel consultar o Open Finance.'),
        );
      },
    });
  }

  iniciar(): void {
    const id = this.propostaId();
    if (!id) return;

    this.errorMessage.set(null);
    this.consentimentoPendente.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.credito
      .iniciarConsentimentoOpenFinance(id, {
        cpfCnpjTomador: this.form.getRawValue().cpfCnpjTomador,
        redirectUri: this.redirectUri(id),
      })
      .subscribe({
        next: (resposta) => {
          this.enviando.set(false);
          this.abrirAutorizacao(resposta.urlAutorizacao);
          this.atualizarStatus(id);
        },
        error: (err: HttpErrorResponse) => {
          this.enviando.set(false);
          if (err.status === 409) {
            this.consentimentoPendente.set(true);
            this.atualizarStatus(id);
            return;
          }
          this.errorMessage.set(
            mensagemCreditoErro(err, 'Nao foi possivel iniciar o consentimento.'),
          );
        },
      });
  }

  // Handoff externo: o provider abre numa nova aba e devolve para a rota de retorno.
  protected abrirAutorizacao(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  // redirectUri e sempre controlado pela aplicacao (rota de retorno do proprio web).
  private redirectUri(id: string): string {
    return `${window.location.origin}/app/credito/propostas/${id}/open-finance/retorno`;
  }
}

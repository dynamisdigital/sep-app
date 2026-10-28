import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { OpenFinanceStatusResponse, StatusConsentimento } from '../../../../core/api/api.models';
import { CreditoService } from '../../../../core/credito/credito.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { SepMaskDirective } from '../../../../shared/forms/sep-mask.directive';
import { formatarDataHora, mascararCpfCnpj } from '../../../../core/format/br-format';
import { mensagemCreditoErro } from '../shared/credito-error';
import { formatarData, formatarMoeda } from '../shared/credito-format';

// CPF (11) ou CNPJ (14) somente digitos — mesmo contrato do backend. A mascara guarda o valor
// canonico no controle, entao o padrao continua valendo sobre o que sai daqui.
const CPF_CNPJ_PATTERN = /^\d{11}$|^\d{14}$/;

const ROTULO_CONSENTIMENTO: Record<StatusConsentimento, string> = {
  PENDENTE: 'Aguardando autorização',
  AUTORIZADO: 'Autorizado',
  NEGADO: 'Negado',
  EXPIRADO: 'Expirado',
};

const TOM_CONSENTIMENTO: Record<StatusConsentimento, string> = {
  PENDENTE: 'amber',
  AUTORIZADO: 'green',
  NEGADO: 'red',
  EXPIRADO: 'purple',
};

const ICONE_CONSENTIMENTO: Record<StatusConsentimento, string> = {
  PENDENTE: 'clock',
  AUTORIZADO: 'circle-check',
  NEGADO: 'circle-x',
  EXPIRADO: 'circle-dashed',
};

/**
 * Ciclo Open Finance opt-in do tomador: inicia o consentimento, faz o handoff da URL de
 * autorização e consulta status e agregados. A página nunca processa extrato bruto nem confia em
 * query params do provedor — a verdade vem sempre do GET da API SEP.
 *
 * A rota de retorno reusa este componente porque os dados são os mesmos; o que muda é o estado de
 * entrada: quem volta da autorização não deve precisar clicar em "Atualizar" para descobrir se o
 * banco confirmou.
 */
@Component({
  selector: 'sep-open-finance-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    OperationalShellComponent,
    SepMaskDirective,
  ],
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
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly mascararCpfCnpj = mascararCpfCnpj;

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
  /** URL devolvida pelo provedor, guardada para quem fechou a aba sem autorizar. */
  protected readonly urlAutorizacao = signal<string | null>(null);

  protected readonly rotulo = computed(() => {
    const atual = this.status()?.statusConsentimento;
    return atual ? ROTULO_CONSENTIMENTO[atual] : null;
  });

  protected readonly tom = computed(() => {
    const atual = this.status()?.statusConsentimento;
    return atual ? TOM_CONSENTIMENTO[atual] : 'blue';
  });

  protected readonly icone = computed(() => {
    const atual = this.status()?.statusConsentimento;
    return atual ? ICONE_CONSENTIMENTO[atual] : 'share-2';
  });

  /** Autorizado, mas o provedor ainda não devolveu a consolidação. */
  protected readonly aguardandoDados = computed(() => {
    const atual = this.status();
    return atual?.statusConsentimento === 'AUTORIZADO' && !atual.ultimaMovimentacao;
  });

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
          mensagemCreditoErro(err, 'Não foi possível consultar o Open Finance.'),
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
          this.urlAutorizacao.set(resposta.urlAutorizacao);
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
            mensagemCreditoErro(err, 'Não foi possível iniciar o consentimento.'),
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

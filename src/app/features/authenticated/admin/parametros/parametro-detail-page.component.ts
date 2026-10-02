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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  ApiErrorResponse,
  ParametroComHistorico,
  ParametroOperacional,
  TipoParametro,
  VersaoParametro,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { formatarValorParametro } from '../../../../core/format/br-format';
import { GovernancaService } from '../../../../core/governanca/governanca.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { SepMaskDirective } from '../../../../shared/forms/sep-mask.directive';

const TOM_POR_TIPO: Record<TipoParametro, string> = {
  INTEGER: 'green',
  DECIMAL: 'blue',
  BOOLEAN: 'purple',
  STRING: 'amber',
};

// Intencao de alteracao guardada antes do step-up: sem isso o administrador confirma a identidade
// por TOTP, volta e descobre que precisa digitar valor e justificativa de novo.
const CHAVE_ALTERACAO_PENDENTE = 'SEP_PARAMETRO_PENDENTE';

interface AlteracaoPendente {
  chave: string;
  novoValor: string;
  justificativa: string;
}

function lerAlteracaoPendente(): AlteracaoPendente | null {
  const bruto = window.sessionStorage.getItem(CHAVE_ALTERACAO_PENDENTE);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as AlteracaoPendente;
  } catch {
    return null;
  }
}

@Component({
  selector: 'sep-parametro-detail-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    OperationalShellComponent,
    SepMaskDirective,
  ],
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

  /** Quem assinou a última alteração. O parâmetro não traz ator; o histórico traz. */
  protected readonly ultimoAtor = computed(() => this.historico()[0]?.atorId ?? 'system');

  /** Alterações já registradas na trilha: a versão atual menos a inicial. */
  protected readonly alteracoes = computed(() => Math.max(0, (this.parametro()?.versao ?? 1) - 1));

  protected readonly valorMudou = computed(
    () => this.form.controls.novoValor.value.trim() !== (this.parametro()?.valor ?? ''),
  );

  // O valor trafega como string; o backend valida conforme o tipo. A UI nao reimplementa
  // validacao de faixa de negocio: envia, e trata o 400/422 retornado.
  protected readonly form = this.fb.nonNullable.group({
    novoValor: ['', [Validators.required]],
    justificativa: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const chave = this.route.snapshot.paramMap.get('chave');
    if (!chave) {
      this.errorMessage.set('Chave do parâmetro não informada.');
      return;
    }
    this.chave = chave;
    this.carregar(chave);
  }

  /**
   * Retoma a alteracao autorizada no step-up. A intencao fica em `sessionStorage` porque a ida ao
   * step-up recarrega o componente; sem isso o administrador confirmaria a identidade para nada.
   */
  private retomarAlteracaoAutorizada(chave: string): void {
    const pendente = lerAlteracaoPendente();
    if (!pendente || pendente.chave !== chave) {
      return;
    }
    window.sessionStorage.removeItem(CHAVE_ALTERACAO_PENDENTE);
    this.form.patchValue({
      novoValor: pendente.novoValor,
      justificativa: pendente.justificativa,
    });
    this.enviar(chave, pendente.novoValor, pendente.justificativa);
  }

  /** O ator vem como UUID; a tela mostra o sufixo, com o valor completo no title. */
  protected atorCurto(atorId: string): string {
    return atorId.length > 12 ? atorId.slice(-8) : atorId;
  }

  protected tomDoTipo(tipo: TipoParametro): string {
    return TOM_POR_TIPO[tipo];
  }

  protected readonly formatarValorParametro = formatarValorParametro;

  protected formatarDataHora(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso));
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
    this.enviar(chave, novoValor, justificativa);
  }

  private enviar(chave: string, novoValor: string, justificativa: string): void {
    this.salvando.set(true);
    this.sucesso.set(null);
    this.formErro.set(null);
    this.governanca.alterarParametro(chave, { novoValor, justificativa }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.sucesso.set('Parâmetro atualizado.');
        this.form.controls.justificativa.reset('');
        // Recarrega detalhe + historico para a nova versao aparecer.
        this.carregar(chave);
      },
      error: (err: HttpErrorResponse) =>
        this.tratarErroAlteracao(err, chave, novoValor, justificativa),
    });
  }

  private carregar(chave: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.governanca.consultarParametro(chave).subscribe({
      next: (resposta) => {
        this.aplicar(resposta);
        this.loading.set(false);
        this.retomarAlteracaoAutorizada(chave);
      },
      error: (err: HttpErrorResponse) => {
        const apiErr = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(apiErr?.message ?? 'Não foi possível carregar o parâmetro.');
        this.loading.set(false);
      },
    });
  }

  private aplicar(resposta: ParametroComHistorico): void {
    this.parametro.set(resposta.parametro);
    this.historico.set(resposta.historico);
    this.form.controls.novoValor.setValue(resposta.parametro.valor);
  }

  private tratarErroAlteracao(
    err: HttpErrorResponse,
    chave: string,
    novoValor = '',
    justificativa = '',
  ): void {
    this.salvando.set(false);
    // 403 com MFA habilitado: step-up exigido. Guarda a intencao, coleta o token e volta a este
    // parametro, onde a alteracao e reenviada sozinha.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      if (novoValor) {
        window.sessionStorage.setItem(
          CHAVE_ALTERACAO_PENDENTE,
          JSON.stringify({ chave, novoValor, justificativa } satisfies AlteracaoPendente),
        );
      }
      void this.router.navigateByUrl(`/app/step-up?next=/app/admin/parametros/${chave}`);
      return;
    }
    const apiErr = err.error as ApiErrorResponse | undefined;
    if (err.status === 404) {
      this.formErro.set(apiErr?.message ?? 'Parâmetro não encontrado.');
      return;
    }
    // 400/422: valor incompativel com o tipo ou justificativa ausente (mensagem do backend).
    this.formErro.set(apiErr?.message ?? 'Não foi possível alterar o parâmetro.');
  }
}

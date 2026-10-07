import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PropostaResponse } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  AnaliseCreditoResponse,
  DecisaoSugerida,
  FonteBureau,
  ParametrosAnalise,
  ParecerAnalista,
  SentidoFator,
  StatusConsultaBureau,
} from '../../../../core/credito/analise-credito.models';
import { AnaliseCreditoService } from '../../../../core/credito/analise-credito.service';
import { CreditoService } from '../../../../core/credito/credito.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from '../../correspondentes/correspondentes.format';

const ROTULO_FONTE: Record<FonteBureau, string> = {
  SERASA: 'Serasa',
  SPC_BOA_VISTA: 'SPC / Boa Vista',
  SCR_BACEN: 'SCR (Banco Central)',
};
const ROTULO_CONSULTA: Record<StatusConsultaBureau, string> = {
  OK: 'Consultada',
  INDISPONIVEL: 'Indisponível',
  NAO_CONSULTADA: 'Não consultada',
};
const TOM_CONSULTA: Record<StatusConsultaBureau, string> = {
  OK: 'green',
  INDISPONIVEL: 'red',
  NAO_CONSULTADA: 'blue',
};
const ROTULO_DECISAO: Record<DecisaoSugerida, string> = {
  APROVAR: 'Aprovar',
  ANALISE_MANUAL: 'Análise manual',
  RECUSAR: 'Recusar',
};
const TOM_DECISAO: Record<DecisaoSugerida, string> = {
  APROVAR: 'green',
  ANALISE_MANUAL: 'amber',
  RECUSAR: 'red',
};
const TOM_SENTIDO: Record<SentidoFator, string> = {
  POSITIVO: 'green',
  NEUTRO: 'amber',
  NEGATIVO: 'red',
};
const ROTULO_PARECER: Record<ParecerAnalista['decisao'], string> = {
  APROVAR: 'Aprovar',
  REJEITAR: 'Rejeitar',
  PENDENCIA: 'Pedir pendência',
};

// Analise de credito da proposta: consulta aos bureaus (Serasa, SPC/Boa Vista, SCR do BACEN), score interno
// explicavel e a sugestao do motor. Quem decide e o analista, com justificativa. O front nunca calcula o
// score: apresenta o que o motor devolveu. A consulta exige o consentimento do titular (LGPD).
@Component({
  selector: 'sep-analise-credito-page',
  imports: [OperationalShellComponent, RouterLink, LucideAngularModule, FormsModule],
  templateUrl: './analise-credito-page.component.html',
  styleUrl: '../../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnaliseCreditoPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly analiseService = inject(AnaliseCreditoService);
  private readonly creditoService = inject(CreditoService);
  private readonly auth = inject(AuthService);

  protected readonly propostaId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly proposta = signal<PropostaResponse | null>(null);
  protected readonly analise = signal<AnaliseCreditoResponse | null>(null);
  protected readonly parametros = signal<ParametrosAnalise | null>(null);
  protected readonly carregando = signal(true);
  protected readonly executando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly editandoParametros = signal(false);

  protected readonly moeda = formatarMoeda;
  protected readonly pct = formatarPercentual;
  protected readonly data = formatarData;
  protected readonly rotuloFonte = ROTULO_FONTE;
  protected readonly rotuloConsulta = ROTULO_CONSULTA;
  protected readonly tomConsulta = TOM_CONSULTA;
  protected readonly rotuloDecisao = ROTULO_DECISAO;
  protected readonly tomDecisao = TOM_DECISAO;
  protected readonly tomSentido = TOM_SENTIDO;
  protected readonly rotuloParecer = ROTULO_PARECER;
  protected readonly fontes: FonteBureau[] = ['SERASA', 'SPC_BOA_VISTA', 'SCR_BACEN'];

  protected readonly ehAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');
  /** `decisao` e do formulario (ngModel), nao um signal: por isso um metodo, e nao um computed. */
  protected diverge(): boolean {
    const a = this.analise();
    if (!a) return false;
    return (
      (a.decisaoSugerida === 'APROVAR' && this.decisao !== 'APROVAR') ||
      (a.decisaoSugerida === 'RECUSAR' && this.decisao !== 'REJEITAR')
    );
  }

  protected consentimento = false;
  protected decisao: ParecerAnalista['decisao'] = 'PENDENCIA';
  protected justificativa = '';
  protected edicao = {
    bureausHabilitados: { SERASA: true, SPC_BOA_VISTA: true, SCR_BACEN: true } as Record<
      FonteBureau,
      boolean
    >,
    validadeConsultaDias: 30,
    corteAprovacao: 700,
    corteRecusa: 500,
    comprometimentoMaximoPct: 30,
    justificativa: '',
  };

  ngOnInit(): void {
    this.creditoService.consultarProposta(this.propostaId).subscribe({
      next: (p) => this.proposta.set(p),
      error: () => this.erro.set('Não foi possível carregar a proposta.'),
    });
    this.analiseService.consultarParametros().subscribe({
      next: (p) => {
        this.parametros.set(p);
        this.edicao = { ...this.edicao, ...p, justificativa: '' };
      },
    });
    this.analiseService.consultarAnalise(this.propostaId).subscribe({
      next: (a) => {
        this.analise.set(a);
        this.sugerirDecisao(a);
        this.carregando.set(false);
      },
      // 404 = ainda nao analisada; qualquer outro erro tambem deixa o botao de executar disponivel.
      error: () => this.carregando.set(false),
    });
  }

  private sugerirDecisao(a: AnaliseCreditoResponse): void {
    this.decisao =
      a.parecer?.decisao ??
      (a.decisaoSugerida === 'APROVAR'
        ? 'APROVAR'
        : a.decisaoSugerida === 'RECUSAR'
          ? 'REJEITAR'
          : 'PENDENCIA');
  }

  private mensagemDe(e: unknown, padrao: string): string {
    return (e instanceof HttpErrorResponse && e.error?.message) || padrao;
  }

  protected executar(forcar: boolean): void {
    if (!this.consentimento || this.executando()) return;
    this.executando.set(true);
    this.erro.set(null);
    this.aviso.set(null);
    this.analiseService
      .executarAnalise(this.propostaId, { consentimentoTitular: true, forcar })
      .subscribe({
        next: (a) => {
          this.executando.set(false);
          this.analise.set(a);
          this.sugerirDecisao(a);
          this.aviso.set(
            'Análise concluída. Confira as fontes, o score e as regras antes do parecer.',
          );
        },
        error: (e) => {
          this.executando.set(false);
          this.erro.set(this.mensagemDe(e, 'Não foi possível executar a análise.'));
        },
      });
  }

  protected parecerValido(): boolean {
    const j = this.justificativa.trim();
    return !!j && (!this.diverge() || j.length >= 20);
  }

  protected registrar(): void {
    if (!this.parecerValido() || this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.analiseService
      .registrarParecer(this.propostaId, {
        decisao: this.decisao,
        justificativa: this.justificativa.trim(),
      })
      .subscribe({
        next: (a) => {
          this.salvando.set(false);
          this.analise.set({ ...a });
          this.aviso.set('Parecer registrado e vinculado a esta análise.');
        },
        error: (e) => {
          this.salvando.set(false);
          this.erro.set(this.mensagemDe(e, 'Não foi possível registrar o parecer.'));
        },
      });
  }

  protected edicaoValida(): boolean {
    const e = this.edicao;
    return !!e.justificativa.trim() && e.corteRecusa < e.corteAprovacao;
  }

  protected salvarParametros(): void {
    if (!this.edicaoValida() || this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.analiseService.atualizarParametros({ ...this.edicao }).subscribe({
      next: (p) => {
        this.salvando.set(false);
        this.parametros.set(p);
        this.editandoParametros.set(false);
        this.aviso.set('Parâmetros da análise atualizados e registrados na auditoria.');
      },
      error: (e) => {
        this.salvando.set(false);
        this.erro.set(this.mensagemDe(e, 'Não foi possível salvar os parâmetros.'));
      },
    });
  }
}

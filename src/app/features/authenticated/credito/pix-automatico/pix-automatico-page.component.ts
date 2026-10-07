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
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { centavos } from '../../../../core/financeiro/calculo-financeiro';
import {
  AutorizacaoPixResponse,
  DebitoPixResponse,
  PagadorPix,
  ParametrosPixAutomatico,
  ResumoPixAutomatico,
  StatusAutorizacaoPix,
  StatusDebitoPix,
} from '../../../../core/pix-automatico/pix-automatico.models';
import { PixAutomaticoService } from '../../../../core/pix-automatico/pix-automatico.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { formatarData, formatarMoeda } from '../../correspondentes/correspondentes.format';

interface ContratoPix {
  agendaId: string;
  id: string;
  produto: string;
  emAberto: number;
  parcelasEmAberto: number;
  maiorParcela: number;
  autorizacao: AutorizacaoPixResponse | null;
}

const ROTULO_STATUS: Record<StatusAutorizacaoPix, string> = {
  PENDENTE_PAGADOR: 'Aguardando o banco do tomador',
  ATIVA: 'Ativa',
  REJEITADA: 'Recusada pelo tomador',
  REVOGADA: 'Revogada',
};
const TOM_STATUS: Record<StatusAutorizacaoPix, string> = {
  PENDENTE_PAGADOR: 'amber',
  ATIVA: 'green',
  REJEITADA: 'red',
  REVOGADA: 'red',
};
const ROTULO_DEBITO: Record<StatusDebitoPix, string> = {
  AGENDADO: 'Agendado',
  NOTIFICADO: 'Tomador avisado',
  LIQUIDADO: 'Liquidado',
  FALHOU: 'Falhou',
  CANCELADO: 'Cancelado',
};
const TOM_DEBITO: Record<StatusDebitoPix, string> = {
  AGENDADO: 'blue',
  NOTIFICADO: 'amber',
  LIQUIDADO: 'green',
  FALHOU: 'red',
  CANCELADO: 'red',
};

// A carteira canonica da base ficticia: o mesmo universo que a Cobranca consulta. Nao ha endpoint que
// liste as agendas; cada uma e lida em GET /cobranca/contratos/{id}/agenda.
const CONTRATOS_DA_CARTEIRA = [
  { id: '5b771c03', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c03' },
  { id: '5b771c05', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03' },
  { id: '5b771c06', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c06' },
  { id: '5b771c08', agendaId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c08' },
] as const;

// Pix Automatico (Credito): o tomador autoriza no banco dele o debito recorrente das parcelas. Aqui o
// operador habilita o contrato, registra os dados do pagador e acompanha as cobrancas; o aceite e a
// liquidacao sao da instituicao participante. Nada de senha, token ou saldo passa por esta tela.
@Component({
  selector: 'sep-pix-automatico-page',
  imports: [OperationalShellComponent, RouterLink, LucideAngularModule, FormsModule],
  templateUrl: './pix-automatico-page.component.html',
  styleUrl: '../../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixAutomaticoPageComponent implements OnInit {
  private readonly service = inject(PixAutomaticoService);
  private readonly cobranca = inject(CobrancaService);
  private readonly auth = inject(AuthService);

  protected readonly parametros = signal<ParametrosPixAutomatico | null>(null);
  protected readonly resumo = signal<ResumoPixAutomatico | null>(null);
  protected readonly contratos = signal<ContratoPix[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly salvando = signal(false);

  protected readonly habilitando = signal<string | null>(null);
  protected readonly revogando = signal<string | null>(null);
  protected readonly vendo = signal<AutorizacaoPixResponse | null>(null);
  protected readonly debitos = signal<DebitoPixResponse[]>([]);
  protected readonly editandoParametros = signal(false);

  protected readonly moeda = formatarMoeda;
  protected readonly data = formatarData;
  protected readonly rotuloStatus = ROTULO_STATUS;
  protected readonly tomStatus = TOM_STATUS;
  protected readonly rotuloDebito = ROTULO_DEBITO;
  protected readonly tomDebito = TOM_DEBITO;

  protected readonly ehAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');
  protected readonly habilitado = computed(() => this.parametros()?.habilitado ?? false);

  protected pagador: PagadorPix = this.pagadorVazio();
  protected consentimento = false;
  protected motivoRevogacao = '';
  protected edicao = {
    habilitado: true,
    antecedenciaNotificacaoDias: 5,
    maxTentativas: 3,
    justificativa: '',
  };

  ngOnInit(): void {
    this.carregar();
  }

  private pagadorVazio(): PagadorPix {
    return {
      nome: '',
      documento: '',
      ispb: '',
      banco: '',
      agencia: '',
      conta: '',
      tipoConta: 'CORRENTE',
    };
  }

  private carregar(): void {
    forkJoin({
      parametros: this.service.consultarParametros(),
      resumo: this.service.consultarResumo(),
      autorizacoes: this.service.listarAutorizacoes(),
      agendas: forkJoin(
        CONTRATOS_DA_CARTEIRA.map((c) => this.cobranca.consultarAgendaPorContrato(c.agendaId)),
      ),
    }).subscribe({
      next: ({ parametros, resumo, autorizacoes, agendas }) => {
        this.parametros.set(parametros);
        this.resumo.set(resumo);
        this.edicao = { ...this.edicao, ...parametros, justificativa: '' };
        this.contratos.set(
          agendas.map((a, i) => {
            const abertas = a.parcelas.filter((p) => p.status !== 'PAGA');
            const doContrato = autorizacoes
              .filter((x) => x.contratoId === a.contratoId)
              .sort((x, y) => y.criadaEm.localeCompare(x.criadaEm))[0];
            return {
              agendaId: CONTRATOS_DA_CARTEIRA[i].agendaId,
              id: CONTRATOS_DA_CARTEIRA[i].id,
              produto: a.produto ?? '—',
              emAberto: centavos(abertas.reduce((s, p) => s + p.total, 0)),
              parcelasEmAberto: abertas.length,
              maiorParcela: Math.max(0, ...abertas.map((p) => p.total)),
              autorizacao: doContrato ?? null,
            };
          }),
        );
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar o Pix Automático.');
        this.carregando.set(false);
      },
    });
  }

  private mensagemDe(e: unknown, padrao: string): string {
    return (e instanceof HttpErrorResponse && e.error?.message) || padrao;
  }

  protected podeHabilitar(c: ContratoPix): boolean {
    const a = c.autorizacao;
    return (
      this.habilitado() &&
      c.parcelasEmAberto > 0 &&
      (!a || a.status === 'REVOGADA' || a.status === 'REJEITADA')
    );
  }

  protected abrirHabilitar(c: ContratoPix): void {
    this.habilitando.set(c.agendaId);
    this.pagador = this.pagadorVazio();
    this.consentimento = false;
    this.erro.set(null);
    this.aviso.set(null);
  }

  protected pagadorValido(): boolean {
    const p = this.pagador;
    const doc = p.documento.replace(/\D/g, '');
    return (
      this.consentimento &&
      !!p.nome.trim() &&
      [11, 14].includes(doc.length) &&
      /^\d{8}$/.test(p.ispb) &&
      !!p.banco.trim() &&
      !!p.agencia.trim() &&
      !!p.conta.replace(/\D/g, '')
    );
  }

  protected habilitar(c: ContratoPix): void {
    if (!this.pagadorValido() || this.salvando()) return;
    this.salvando.set(true);
    this.service
      .criarAutorizacao({
        contratoId: c.agendaId,
        pagador: this.pagador,
        consentimento: this.consentimento,
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.habilitando.set(null);
          this.aviso.set(
            `Pedido de recorrência enviado ao banco do tomador para o contrato ${c.id}. As cobranças só começam depois do aceite dele.`,
          );
          this.carregar();
        },
        error: (e) => {
          this.salvando.set(false);
          this.erro.set(this.mensagemDe(e, 'Não foi possível habilitar o Pix Automático.'));
        },
      });
  }

  protected responder(c: ContratoPix, aceitou: boolean): void {
    const a = c.autorizacao;
    if (!a) return;
    this.service.simularAceiteDoPagador(a.id, aceitou).subscribe({
      next: () => {
        this.aviso.set(
          aceitou
            ? `O tomador aceitou a recorrência do contrato ${c.id} (demonstração).`
            : `O tomador recusou a recorrência do contrato ${c.id} (demonstração).`,
        );
        this.carregar();
      },
      error: (e) => this.erro.set(this.mensagemDe(e, 'Não foi possível registrar a resposta.')),
    });
  }

  protected verCobrancas(c: ContratoPix): void {
    const a = c.autorizacao;
    if (!a) return;
    this.vendo.set(a);
    this.debitos.set([]);
    this.service.listarDebitos(a.id).subscribe({
      next: (d) => this.debitos.set(d),
      error: () => this.erro.set('Não foi possível carregar as cobranças.'),
    });
  }

  protected abrirRevogar(c: ContratoPix): void {
    this.revogando.set(c.autorizacao?.id ?? null);
    this.motivoRevogacao = '';
    this.erro.set(null);
    this.aviso.set(null);
  }

  protected revogar(c: ContratoPix): void {
    const a = c.autorizacao;
    if (!a || !this.motivoRevogacao.trim() || this.salvando()) return;
    this.salvando.set(true);
    this.service.revogar(a.id, this.motivoRevogacao).subscribe({
      next: () => {
        this.salvando.set(false);
        this.revogando.set(null);
        this.vendo.set(null);
        this.aviso.set(
          `Pix Automático do contrato ${c.id} revogado. As cobranças futuras foram canceladas.`,
        );
        this.carregar();
      },
      error: (e) => {
        this.salvando.set(false);
        this.erro.set(this.mensagemDe(e, 'Não foi possível revogar.'));
      },
    });
  }

  protected edicaoValida(): boolean {
    const e = this.edicao;
    return (
      !!e.justificativa.trim() &&
      e.antecedenciaNotificacaoDias >= 2 &&
      e.antecedenciaNotificacaoDias <= 10 &&
      e.maxTentativas >= 1 &&
      e.maxTentativas <= 3
    );
  }

  protected salvarParametros(): void {
    if (!this.edicaoValida() || this.salvando()) return;
    this.salvando.set(true);
    this.service
      .atualizarParametros({
        habilitado: this.edicao.habilitado,
        antecedenciaNotificacaoDias: this.edicao.antecedenciaNotificacaoDias,
        maxTentativas: this.edicao.maxTentativas,
        justificativa: this.edicao.justificativa,
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.editandoParametros.set(false);
          this.aviso.set('Parâmetros do Pix Automático atualizados e registrados na auditoria.');
          this.carregar();
        },
        error: (e) => {
          this.salvando.set(false);
          this.erro.set(this.mensagemDe(e, 'Não foi possível salvar os parâmetros.'));
        },
      });
  }
}

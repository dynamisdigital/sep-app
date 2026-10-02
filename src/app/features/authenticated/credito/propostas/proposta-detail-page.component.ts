import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  PropostaDocumento,
  PropostaEtapa,
  PropostaEvento,
  PropostaResponse,
  StatusProposta,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { CreditoService } from '../../../../core/credito/credito.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { mensagemCreditoErro } from '../shared/credito-error';
import { formatarData, formatarMoeda } from '../shared/credito-format';

type TomStatus = 'green' | 'blue' | 'orange' | 'red';

// Status finais nao permitem novo ciclo Open Finance (backend rejeita com 422).
const STATUS_FINAIS = new Set<StatusProposta>(['APROVADA', 'REJEITADA']);

const TOM_PROPOSTA: Record<StatusProposta, TomStatus> = {
  EM_ANALISE: 'blue',
  PRE_APROVADA: 'orange',
  APROVADA: 'green',
  REJEITADA: 'red',
  PENDENCIA: 'orange',
};

const ROTULO_PROPOSTA: Record<StatusProposta, string> = {
  EM_ANALISE: 'Em análise',
  PRE_APROVADA: 'Pré-aprovada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  PENDENCIA: 'Pendência',
};

const FRASE_ANALISE: Record<StatusProposta, string> = {
  EM_ANALISE: 'Sua proposta está sendo avaliada pela nossa equipe de crédito.',
  PRE_APROVADA: 'Pré-aprovada: aguardando a oferta final de crédito.',
  APROVADA: 'Proposta aprovada. Siga para a formalização do contrato.',
  REJEITADA: 'Proposta rejeitada pela análise de crédito.',
  PENDENCIA: 'Há pendências a resolver antes de seguir com a análise.',
};

const ROTULO_OPERACAO: Record<string, string> = {
  CAPITAL_GIRO: 'Capital de Giro',
  OUTROS: 'Outros',
};

const ROTULO_ETAPA: Record<string, string> = {
  CONCLUIDO: 'Concluído',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO: 'Aguardando...',
};

// Detalhe consolidado da proposta (Mockup 28): dados, trilha, documentos, histórico e
// resumo da análise. A tela não decide aprovação nem recalcula score — apenas reflete o
// estado retornado pelo backend. Os campos de apresentação são opcionais no contrato e
// viram travessão quando ausentes.
@Component({
  selector: 'sep-proposta-detail-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './proposta-detail-page.component.html',
  styleUrl: './proposta-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly credito = inject(CreditoService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly proposta = signal<PropostaResponse | null>(null);
  protected readonly copiado = signal<string | null>(null);
  protected readonly menuAberto = signal(false);
  // As três seções recolhíveis do desenho abrem uma de cada vez e nascem fechadas, como
  // no mockup — é o que mantém a tela inteira dentro da área útil de referência.
  protected readonly secaoAberta = signal<'complementares' | 'documentos' | 'historico' | null>(
    null,
  );

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly formatarData = formatarData;

  protected readonly statusTom = computed<TomStatus>(() => {
    const p = this.proposta();
    return p ? (TOM_PROPOSTA[p.status] ?? 'blue') : 'blue';
  });

  protected readonly statusRotulo = computed(() => {
    const p = this.proposta();
    return p ? (ROTULO_PROPOSTA[p.status] ?? p.status) : '';
  });

  protected readonly analiseFrase = computed(() => {
    const p = this.proposta();
    return p ? (FRASE_ANALISE[p.status] ?? '') : '';
  });

  protected readonly operacaoRotulo = computed(() => {
    const p = this.proposta();
    if (!p) return '—';
    return ROTULO_OPERACAO[p.tipoOperacao] ?? p.tipoOperacao;
  });

  protected readonly etapas = computed<PropostaEtapa[]>(() => this.proposta()?.etapas ?? []);
  protected readonly documentos = computed<PropostaDocumento[]>(
    () => this.proposta()?.documentos ?? [],
  );
  protected readonly historico = computed<PropostaEvento[]>(() => this.proposta()?.historico ?? []);

  // O anel de análise usa o percentual do backend; sem ele, o anel não é desenhado.
  protected readonly percentual = computed(() => this.proposta()?.percentualAnalise ?? null);

  protected readonly anelGrau = computed(() => {
    const p = this.percentual();
    return p === null ? 0 : Math.round((p / 100) * 360);
  });

  // Open Finance é opt-in do tomador dono enquanto a proposta não está finalizada.
  protected readonly podeIniciarOpenFinance = computed(() => {
    const proposta = this.proposta();
    const usuario = this.auth.currentUser();
    if (!proposta || !usuario) return false;
    return proposta.tomadorId === usuario.id && !STATUS_FINAIS.has(proposta.status);
  });

  // Formalização abre quando a proposta está APROVADA. A existência do contrato é
  // resolvida na jornada de formalização (por proposta); aqui apenas oferecemos o CTA.
  protected readonly podeFormalizar = computed(() => {
    const proposta = this.proposta();
    const usuario = this.auth.currentUser();
    if (!proposta || !usuario) return false;
    return proposta.tomadorId === usuario.id && proposta.status === 'APROVADA';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Proposta não informada.');
      return;
    }
    this.carregar(id);
  }

  carregar(id?: string): void {
    const alvo = id ?? this.route.snapshot.paramMap.get('id') ?? '';
    if (!alvo) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credito.consultarProposta(alvo).subscribe({
      next: (proposta) => {
        this.proposta.set(proposta);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(mensagemCreditoErro(err, 'Não foi possível carregar a proposta.'));
      },
    });
  }

  alternarSecao(secao: 'complementares' | 'documentos' | 'historico'): void {
    this.secaoAberta.update((atual) => (atual === secao ? null : secao));
  }

  alternarMenu(): void {
    this.menuAberto.update((v) => !v);
  }

  irPara(rota: string): void {
    this.menuAberto.set(false);
    void this.router.navigateByUrl(rota);
  }

  copiar(valor: string | undefined | null, chave: string): void {
    if (!valor) return;
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  etapaRotulo(situacao: string): string {
    return ROTULO_ETAPA[situacao] ?? situacao;
  }

  texto(valor: string | undefined | null): string {
    if (!valor) return '—';
    return valor;
  }

  meses(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return '—';
    return `${valor} ${valor === 1 ? 'mês' : 'meses'}`;
  }

  moeda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return '—';
    return formatarMoeda(valor, 'BRL');
  }

  dataHora(iso: string | undefined | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  }

  data(iso: string | undefined | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return iso;
    }
  }

  hora(iso: string | undefined | null): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  }

  idCurto(id: string | undefined | null): string {
    if (!id) return '—';
    return id.slice(-8);
  }
}

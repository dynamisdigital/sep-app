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
  ParcelaEvento,
  StatusParcela,
  ValorAtualizadoParcelaResponse,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { environment } from '../../../../../environments/environment';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import {
  STATUS_PARCELA_LABEL,
  formatarDataLocal,
  mensagemCobrancaErro,
} from '../shared/cobranca-format';

type TomStatus = 'green' | 'orange' | 'red' | 'blue';

interface EtapaParcela {
  rotulo: string;
  hora: string | null;
  origem: string | null;
  concluida: boolean;
  tom: TomStatus;
}

// Tom semantico por status, no mesmo vocabulario de cores das demais telas da jornada.
const TOM_STATUS: Record<StatusParcela, TomStatus> = {
  PENDENTE: 'orange',
  PARCIALMENTE_PAGA: 'blue',
  PAGA: 'green',
  ATRASADA: 'orange',
  INADIMPLENTE: 'red',
  EM_NEGOCIACAO: 'blue',
  RENEGOCIADA: 'blue',
};

// Frase da faixa de aviso, derivada do status. O mockup traz a do caso PENDENTE.
const AVISO_STATUS: Record<StatusParcela, { titulo: string; texto: string }> = {
  PENDENTE: {
    titulo: 'Parcela ainda não recebida',
    texto: 'Esta parcela está pendente de pagamento.',
  },
  PARCIALMENTE_PAGA: {
    titulo: 'Recebimento parcial registrado',
    texto: 'Ainda há saldo em aberto nesta parcela.',
  },
  PAGA: { titulo: 'Parcela liquidada', texto: 'O recebimento foi registrado integralmente.' },
  ATRASADA: {
    titulo: 'Parcela em atraso',
    texto: 'Regularize para evitar encargos adicionais e restrições.',
  },
  INADIMPLENTE: {
    titulo: 'Parcela inadimplente',
    texto: 'O atraso ultrapassou o limite operacional definido.',
  },
  EM_NEGOCIACAO: {
    titulo: 'Parcela em negociação',
    texto: 'Há uma proposta de renegociação em andamento.',
  },
  RENEGOCIADA: {
    titulo: 'Parcela renegociada',
    texto: 'Esta parcela foi substituída por um novo plano de pagamento.',
  },
};

// Quantas etapas o status garante como concluidas. A regua e do backend: a tela nunca
// adianta um recebimento que o status ainda nao afirma.
const ETAPAS_CONCLUIDAS: Record<StatusParcela, number> = {
  PENDENTE: 3,
  PARCIALMENTE_PAGA: 3,
  PAGA: 4,
  ATRASADA: 3,
  INADIMPLENTE: 3,
  EM_NEGOCIACAO: 3,
  RENEGOCIADA: 4,
};

// Detalhe da parcela (Mockup 24) com o valor atualizado contra 'agora' calculado no backend.
// Leitura apenas; nada e recalculado no frontend. 404 vira estado de parcela nao encontrada;
// 403 e tratado pelo errorInterceptor global.
//
// O mockup desenha cerca de trinta campos e o DTO entrega onze: contrato, proposta, tomador,
// dados de boleto, periodicidade, datas de emissao/criacao e os cartoes Resumo do contrato e
// Informacoes complementares nao existem no contrato de `ValorAtualizadoParcelaResponse`.
// Esses campos aparecem como travessao, e as pendencias estao registradas nas checklists.
@Component({
  selector: 'sep-parcela-detail-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './parcela-detail-page.component.html',
  styleUrl: './parcela-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelaDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cobranca = inject(CobrancaService);
  private readonly auth = inject(AuthService);

  private id = '';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly naoEncontrada = signal(false);
  protected readonly parcela = signal<ValorAtualizadoParcelaResponse | null>(null);
  protected readonly copiado = signal<string | null>(null);
  protected readonly menuAberto = signal(false);

  protected readonly formatarDataLocal = formatarDataLocal;

  protected readonly statusRotulo = computed(() => {
    const p = this.parcela();
    return p ? STATUS_PARCELA_LABEL[p.status] : '—';
  });

  protected readonly statusTom = computed<TomStatus>(() => {
    const p = this.parcela();
    return p ? TOM_STATUS[p.status] : 'blue';
  });

  protected readonly aviso = computed(() => {
    const p = this.parcela();
    return p ? AVISO_STATUS[p.status] : null;
  });

  // Dias entre hoje e o vencimento, positivo antes de vencer e negativo depois. A data vem
  // como LocalDate; comparo no fuso local para nao deslocar um dia.
  protected readonly diasAteVencimento = computed(() => {
    const p = this.parcela();
    if (!p) return null;
    const [ano, mes, dia] = p.dataVencimento.split('-').map(Number);
    const vencimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    const zero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return Math.round((vencimento.getTime() - zero.getTime()) / 86_400_000);
  });

  protected readonly diasParaVencer = computed(() => {
    const dias = this.diasAteVencimento();
    return dias === null ? null : Math.max(dias, 0);
  });

  protected readonly diasEmAtraso = computed(() => {
    const dias = this.diasAteVencimento();
    return dias === null ? null : Math.max(-dias, 0);
  });

  protected readonly prazoLegenda = computed(() => {
    const dias = this.diasAteVencimento();
    if (dias === null) return '—';
    if (dias > 0) return `Em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    if (dias === 0) return 'Vence hoje';
    return `Há ${-dias} ${dias === -1 ? 'dia' : 'dias'} em atraso`;
  });

  // Linha do tempo: usa os eventos enviados pelo backend quando existirem; sem eles, mantém os
  // quatro marcos do mockup, marcando apenas o que o status garante e deixando a hora em aberto.
  protected readonly etapas = computed<EtapaParcela[]>(() => {
    const p = this.parcela();
    const rotulos = [
      'Parcela criada',
      'Boleto gerado',
      'Aguardando pagamento',
      'Pagamento recebido',
    ];
    const tons: TomStatus[] = ['orange', 'blue', 'blue', 'green'];
    const concluidas = p ? ETAPAS_CONCLUIDAS[p.status] : 0;
    const eventos = p?.eventos ?? [];
    return rotulos.map((rotulo, indice) => {
      const evento = eventos.find((item: ParcelaEvento) => item.rotulo === rotulo);
      return {
        rotulo,
        hora: evento ? this.dataHora(evento.dataHora) : null,
        origem: evento?.origem ?? null,
        concluida: evento ? true : indice < concluidas,
        tom: tons[indice],
      };
    });
  });

  // Ambiente derivado da API em uso, como no Mockup 19: em desenvolvimento a tela mostra
  // "Homologação", e não a "Produção" desenhada no mockup.
  protected readonly ambiente = computed(() => {
    const url = environment.apiBaseUrl;
    const local = /localhost|127\.0\.0\.1|^\/|^https?:\/\/(?:dev|hml|homolog)/i.test(url);
    return local ? 'HOMOLOGAÇÃO' : 'REGULADO';
  });

  protected readonly perfil = computed(() => this.auth.currentUser()?.role ?? '—');

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrada.set(false);
    this.cobranca.consultarParcela(this.id).subscribe({
      next: (parcela) => {
        this.parcela.set(parcela);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrada.set(true);
          return;
        }
        this.errorMessage.set(mensagemCobrancaErro(err, 'Não foi possível carregar a parcela.'));
      },
    });
  }

  copiar(valor: string, chave: string): void {
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  // Registrar recebimento e renegociar têm formulário próprio na tela financeira da parcela.
  irParaFinanceiro(): void {
    this.menuAberto.set(false);
    void this.router.navigate(['/app/cobranca/financeiro/parcelas', this.id]);
  }

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  // O contrato vinculado abre na tela de contrato da Formalização (Mockup 13).
  abrirContrato(): void {
    const contratoId = this.parcela()?.contrato?.contratoId;
    if (!contratoId) return;
    void this.router.navigate(['/app/formalizacao/contratos', contratoId]);
  }

  irPara(rota: string): void {
    this.menuAberto.set(false);
    void this.router.navigate([rota]);
  }

  copiarIdentificador(): void {
    this.menuAberto.set(false);
    const p = this.parcela();
    if (p) this.copiar(p.parcelaId, 'id');
  }

  baixarDemonstrativo(): void {
    const p = this.parcela();
    if (!p) return;
    const linhas = [
      'DEMONSTRATIVO DA PARCELA',
      `Parcela: ${p.numero}`,
      `Situação: ${STATUS_PARCELA_LABEL[p.status]}`,
      `Vencimento: ${formatarDataLocal(p.dataVencimento)}`,
      `Principal: ${this.moeda(p.principalOriginal)}`,
      `Juros: ${this.moeda(p.jurosOriginal)}`,
      `Juros de mora: ${this.moeda(p.jurosMora)}`,
      `Multa: ${this.moeda(p.multa)}`,
      `Total recebido: ${this.moeda(p.totalRecebido)}`,
      `Valor devido atualizado: ${this.moeda(p.valorDevidoAtualizado)}`,
      `Valor em aberto: ${this.moeda(p.valorEmAberto)}`,
    ];
    const url = URL.createObjectURL(
      new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `parcela-${p.numero}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Data e hora do backend (OffsetDateTime ISO). Montada peça a peça porque o `Intl` insere
  // vírgula entre data e hora, e a trilha do mockup usa "15/06/2026 10:32:11".
  dataHora(valor: string | null | undefined): string {
    if (!valor) return '—';
    const d = new Date(valor);
    const p2 = (n: number) => String(n).padStart(2, '0');
    const data = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
    return `${data} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  }

  data(valor: string | null | undefined): string {
    if (!valor) return '—';
    return formatarDataLocal(valor);
  }

  moeda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  texto(valor: string | null | undefined): string {
    return valor ?? '—';
  }

  numero(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '—' : String(valor);
  }
}

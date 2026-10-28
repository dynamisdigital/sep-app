import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PropostaResponse, StatusProposta } from '../../../core/api/api.models';
import { CreditoService } from '../../../core/credito/credito.service';
import { formatarDataHora, formatarMoeda, formatarNumero } from '../../../core/format/br-format';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  FatiaDonut,
  corDoTom,
  fatiasDonut,
  gradienteDonut,
  haloDonut,
} from '../../../shared/donut';
import { SepArteComponent } from '../../../shared/arte/sep-arte.component';

// Teto do regimento SEP; e o mesmo numero que a tela de proposta usa como limite.
const LIMITE_PRE_APROVADO = 15000;

interface CreditMetric {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: 'green' | 'blue' | 'amber';
}

@Component({
  selector: 'sep-credito-home',
  imports: [SepArteComponent, LucideAngularModule, OperationalShellComponent, RouterLink],
  templateUrl: './credito-home.component.html',
  styleUrl: './credito-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditoHomeComponent implements OnInit {
  private readonly credito = inject(CreditoService);

  protected readonly assetBase = '/image/sep_mockup_09_assets';

  // A tela conta as propostas do proprio tomador: o donut, a legenda e os quatro cartoes saem
  // todos desta lista, entao nao ha como um discordar do outro.
  private readonly propostas = signal<readonly PropostaResponse[]>([]);

  private soma(status: readonly StatusProposta[]): { qtd: number; valor: number } {
    const alvo = this.propostas().filter((p) => status.includes(p.status));
    return { qtd: alvo.length, valor: alvo.reduce((t, p) => t + (p.valorSolicitado ?? 0), 0) };
  }

  protected readonly fatiasPropostas = computed<FatiaDonut[]>(() => {
    const conta = (s: StatusProposta) => this.propostas().filter((p) => p.status === s).length;
    return fatiasDonut([
      { rotulo: 'Em análise', valor: conta('EM_ANALISE'), tom: 'azul' },
      { rotulo: 'Pré-aprovadas', valor: conta('PRE_APROVADA'), tom: 'ciano' },
      { rotulo: 'Aprovadas', valor: conta('APROVADA'), tom: 'verde' },
      { rotulo: 'Pendentes', valor: conta('PENDENCIA'), tom: 'ambar' },
      { rotulo: 'Reprovadas', valor: conta('REJEITADA'), tom: 'neutro' },
    ]);
  });

  protected readonly totalPropostas = computed(() => this.propostas().length);
  protected readonly corDoTom = corDoTom;
  protected readonly gradiente = gradienteDonut;
  protected readonly halo = haloDonut;

  ngOnInit(): void {
    this.credito.listarPropostas({ size: 500 }).subscribe({
      next: (page) => this.propostas.set(page.content),
      error: () => this.propostas.set([]),
    });
  }

  protected readonly metrics = computed<CreditMetric[]>(() => {
    const analise = this.soma(['EM_ANALISE']);
    // So APROVADA: pre-aprovada ainda depende de conferencia (a Ajuda diz isso) e o grafico logo
    // abaixo as separa. Somar as duas fazia o cartao dizer 2 enquanto a legenda dizia 1.
    const aprovadas = this.soma(['APROVADA']);
    const pendentes = this.soma(['PENDENCIA']);
    return [
      {
        label: 'Limite pré-aprovado',
        value: formatarMoeda(LIMITE_PRE_APROVADO),
        detail: 'Sujeito a análise final',
        icon: 'wallet',
        tone: 'green',
      },
      {
        label: 'Propostas em análise',
        value: String(analise.qtd),
        detail: `Valor total: ${formatarMoeda(analise.valor)}`,
        icon: 'file-search',
        tone: 'blue',
      },
      {
        label: 'Propostas aprovadas',
        value: String(aprovadas.qtd),
        detail: `Valor total: ${formatarMoeda(aprovadas.valor)}`,
        icon: 'file-check',
        tone: 'green',
      },
      {
        label: 'Propostas pendentes',
        value: String(pendentes.qtd),
        detail: `Valor total: ${formatarMoeda(pendentes.valor)}`,
        icon: 'file-clock',
        tone: 'amber',
      },
    ];
  });

  // "Resumo geral do crédito" também sai das propostas: eram cinco valores escritos no template
  // (R$ 10.000,00, R$ 3.750,00, 1,85%, 12 meses e uma data fixa), sem relação com a lista.
  protected readonly resumo = computed(() => {
    const todas = this.propostas();
    const vazio = '—';
    const media = (n: number[]) => n.reduce((t, v) => t + v, 0) / n.length;
    const taxas = todas
      .filter((p) => p.status === 'PRE_APROVADA')
      .map((p) => Number((p.taxaEstimada ?? '').replace(',', '.').match(/\d+(\.\d+)?/)?.[0]))
      .filter((n) => Number.isFinite(n));
    const prazos = todas.map((p) => p.prazoMeses).filter((n) => n > 0);
    const alteracoes = todas
      .map((p) => Date.parse(p.dataModificacao))
      .filter((n) => !Number.isNaN(n));
    return {
      totalSolicitado: formatarMoeda(todas.reduce((t, p) => t + (p.valorSolicitado ?? 0), 0)),
      totalAprovado: formatarMoeda(this.soma(['APROVADA']).valor),
      taxaMedia: taxas.length ? `${formatarNumero(media(taxas))}% a.m.` : vazio,
      prazoMedio: prazos.length
        ? `${formatarNumero(Math.round(media(prazos) * 10) / 10)} meses`
        : vazio,
      ultimaAtualizacao: alteracoes.length
        ? formatarDataHora(new Date(Math.max(...alteracoes)).toISOString())
        : vazio,
    };
  });

  protected readonly howItWorks = [
    'Solicite seu crédito em poucos minutos',
    'Análise automatizada e segura',
    'Contrato digital e liberação rápida',
    'Acompanhamento em tempo real',
  ];

  protected readonly compliance = [
    'Ambiente 100% regulado',
    'Conformidade CMN 4.656/2018',
    'Dados criptografados',
    'Auditoria e rastreabilidade',
  ];
}

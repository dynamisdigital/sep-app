import { HttpErrorResponse } from '@angular/common/http';
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

import { PropostaResponse } from '../../../core/api/api.models';
import { CreditoService } from '../../../core/credito/credito.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import { formatarMoeda, idCurto, mensagemFormalizacaoErro } from './shared/formalizacao-format';
import { SepArteComponent } from '../../../shared/arte/sep-arte.component';

interface FormalizacaoMetric {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: 'purple' | 'blue' | 'green' | 'amber';
}

interface SummaryItem {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'sep-formalizacao-home',
  imports: [SepArteComponent, LucideAngularModule, OperationalShellComponent, RouterLink],
  templateUrl: './formalizacao-home.component.html',
  styleUrl: './formalizacao-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormalizacaoHomeComponent implements OnInit {
  private readonly credito = inject(CreditoService);

  protected readonly assetBase = '/image/sep_mockup_12_assets';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly propostas = signal<PropostaResponse[]>([]);

  protected readonly metrics: FormalizacaoMetric[] = [
    {
      label: 'Contratos disponíveis',
      value: '5',
      detail: 'Aguardando assinatura',
      icon: 'file-text',
      tone: 'purple',
    },
    {
      label: 'Em assinatura',
      value: '2',
      detail: 'Em andamento',
      icon: 'file-pen',
      tone: 'blue',
    },
    {
      label: 'Formalizados',
      value: '12',
      detail: 'Últimos 30 dias',
      icon: 'file-check',
      tone: 'green',
    },
    {
      label: 'Pendências',
      value: '1',
      detail: 'Documentos faltantes',
      icon: 'circle-alert',
      tone: 'amber',
    },
  ];

  protected readonly summaryItems = computed<SummaryItem[]>(() => {
    const propostas = this.propostas();
    const total = propostas.reduce((soma, proposta) => soma + proposta.valorSolicitado, 0);
    return [
      {
        label: 'Contratos ativos',
        value: String(propostas.length),
        icon: 'file-check',
      },
      {
        label: 'Valor total contratado',
        value: formatarMoeda(total, 'BRL'),
        icon: 'banknote',
      },
      {
        label: 'Valor em formalização',
        value: formatarMoeda(total, 'BRL'),
        icon: 'banknote',
      },
      {
        label: 'Pendente assinatura',
        value: String(propostas.length),
        icon: 'file-pen',
      },
      {
        label: 'Documentos pendentes',
        value: propostas.length ? '1' : '0',
        icon: 'file-clock',
      },
    ];
  });

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.credito.listarPropostas({ status: 'APROVADA' }).subscribe({
      next: (page) => {
        this.propostas.set(page.content.slice(0, 5));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemFormalizacaoErro(err, 'Não foi possível carregar os contratos.'),
        );
        this.loading.set(false);
      },
    });
  }

  protected formatarData(data: string): string {
    const valor = new Date(data);
    if (Number.isNaN(valor.getTime())) return '—';
    return valor.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected tipoLabel(tipo: PropostaResponse['tipoOperacao']): string {
    return tipo.replaceAll('_', ' ');
  }
}

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
import { forkJoin } from 'rxjs';

import { ItemFilaResponse, PrioridadeItem } from '../../../../core/api/api.models';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import {
  PRIORIDADE_ITEM_LABEL,
  STATUS_ITEM_FILA_LABEL,
} from '../../backoffice/shared/backoffice-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { formatarDataHora, mensagemPixErro } from '../shared/pix-format';
import { SepArteComponent } from '../../../../shared/arte/sep-arte.component';

// Painel de divergencias Pix (Mockup 23). Exibe o estado de erro do provider com tratamento
// visual completo e, quando os dados carregam, lista os itens divergentes no painel central.
// Nao duplica o tratamento da fila: leva cada item ao backoffice.
@Component({
  selector: 'sep-divergencias-page',
  imports: [SepArteComponent, LucideAngularModule, OperationalShellComponent, RouterLink],
  templateUrl: './divergencias-page.component.html',
  styleUrl: './divergencias-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DivergenciasPageComponent implements OnInit {
  private readonly backoffice = inject(BackofficeService);

  protected readonly assetBase = '/image/sep_mockup_23_assets';
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly prioridadeLabel = PRIORIDADE_ITEM_LABEL;
  protected readonly statusLabel = STATUS_ITEM_FILA_LABEL;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly recebimentosDivergentes = signal<ItemFilaResponse[]>([]);
  protected readonly desembolsosFalhos = signal<ItemFilaResponse[]>([]);
  protected readonly copiado = signal<string | null>(null);

  // Dados fixos do mockup para o cartão de status do provider: a tela não consulta o provider,
  // apenas a fila do backoffice.
  protected readonly providerOnline = signal(true);
  protected readonly providerTempoResposta = signal('186 ms');
  protected readonly ultimaVerificacao = signal('30/05/2026 11:58:30');
  // Série do mockup, usada só para desenhar a sparkline do tempo de resposta.
  private readonly serieTempoResposta = [
    182, 191, 178, 199, 184, 205, 176, 193, 186, 201, 179, 196, 188, 203, 181,
  ];

  // O cartão "Última tentativa de consulta" reflete a última chamada real à fila. O protocolo
  // segue como valor do mockup porque o endpoint não devolve identificador de consulta.
  protected readonly ultimaTentativaData = signal('30/05/2026 11:56:12');
  protected readonly ultimaTentativaProtocolo = signal('DIV-0f8a7c2e-9a1b-4f7e-bc21-3d8f5a9e7c10');
  protected readonly ultimaTentativaMensagem = signal(
    'Erro ao obter dados do provider Pix. Timeout excedido.',
  );
  protected readonly tentativaFalhou = signal(true);

  protected readonly sparklinePontos = computed(() => {
    const valores = this.serieTempoResposta;
    const maximo = Math.max(...valores);
    const minimo = Math.min(...valores);
    const faixa = Math.max(maximo - minimo, 1);
    const passo = 120 / (valores.length - 1);
    return valores
      .map(
        (valor, indice) =>
          `${(indice * passo).toFixed(2)},${(23 - ((valor - minimo) / faixa) * 19).toFixed(2)}`,
      )
      .join(' ');
  });

  protected readonly causas = [
    {
      icon: 'equal-not',
      tom: 'red',
      titulo: 'Valor diferente do registrado',
      descricao: 'Diferença entre valor no sistema e no provider.',
    },
    {
      icon: 'unlink',
      tom: 'orange',
      titulo: 'Recebimento não vinculado',
      descricao: 'Item sem parcela ou contrato associado.',
    },
    {
      icon: 'clock-alert',
      tom: 'purple',
      titulo: 'Timeout na consulta de status',
      descricao: 'Falha ao obter status atualizado do provider.',
    },
    {
      icon: 'refresh-cw',
      tom: 'blue',
      titulo: 'Reprocessamento pendente',
      descricao: 'Item aguardando nova tentativa de conciliação.',
    },
  ];

  protected readonly possiveisCausasErro = [
    {
      icon: 'cloud-lightning',
      tom: 'red',
      titulo: 'Instabilidade',
      subtitulo: 'do provider Pix',
    },
    {
      icon: 'wifi-off',
      tom: 'red',
      titulo: 'Falha na conexão',
      subtitulo: 'com o sistema',
    },
    {
      icon: 'shield-off',
      tom: 'purple',
      titulo: 'Permissão insuficiente',
      subtitulo: 'para consultar',
    },
    {
      icon: 'wrench',
      tom: 'purple',
      titulo: 'Manutenção programada',
      subtitulo: 'em andamento',
    },
  ];

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      recebimentos: this.backoffice.listarFila({ tipo: 'RECEBIMENTO_PIX_DIVERGENTE', size: 50 }),
      desembolsos: this.backoffice.listarFila({ tipo: 'DESEMBOLSO_PIX_FALHOU', size: 50 }),
    }).subscribe({
      next: ({ recebimentos, desembolsos }) => {
        this.recebimentosDivergentes.set(recebimentos.content);
        this.desembolsosFalhos.set(desembolsos.content);
        this.loading.set(false);
        this.registrarTentativa(false, 'Consulta à fila de divergências concluída com sucesso.');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const mensagem = mensagemPixErro(err, 'Não foi possível carregar as divergências');
        this.errorMessage.set(mensagem);
        this.registrarTentativa(true, mensagem);
      },
    });
  }

  copiar(valor: string, chave: string): void {
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  // Tom do selo de prioridade do item, no mesmo vocabulário de cores das demais telas Pix.
  protected tomPrioridade(prioridade: PrioridadeItem): string {
    if (prioridade === 'CRITICA') return 'red';
    if (prioridade === 'ALTA') return 'orange';
    return prioridade === 'MEDIA' ? 'blue' : 'green';
  }

  private registrarTentativa(falhou: boolean, mensagem: string): void {
    this.tentativaFalhou.set(falhou);
    this.ultimaTentativaMensagem.set(mensagem);
    this.ultimaTentativaData.set(formatarDataHora(new Date().toISOString()));
  }
}

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
  PixEtapaDesembolso,
  PixStatusDesembolsoResponse,
  StatusPixTransferencia,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';
import { formatarMoeda, idCurto, mensagemPixErro } from '../shared/pix-format';

type TomStatus = 'green' | 'orange' | 'red';

const TOM_TRANSFERENCIA: Record<string, TomStatus> = {
  CONCLUIDA: 'green',
  PROCESSANDO: 'orange',
  SOLICITADA: 'orange',
  CRIADA: 'orange',
  FALHOU: 'red',
  CANCELADA: 'red',
};

const ROTULO_TRANSFERENCIA: Record<string, string> = {
  CONCLUIDA: 'Concluída',
  PROCESSANDO: 'Processando',
  SOLICITADA: 'Solicitada',
  CRIADA: 'Criada',
  FALHOU: 'Falhou',
  CANCELADA: 'Cancelada',
};

const FRASE_TRANSFERENCIA: Record<string, string> = {
  CONCLUIDA: 'Transferência realizada com sucesso.',
  PROCESSANDO: 'Em processamento no provider.',
  SOLICITADA: 'Enviada, aguardando o provider.',
  CRIADA: 'Criada, ainda não enviada.',
  FALHOU: 'Recusada pelo provedor.',
  CANCELADA: 'Cancelada antes da liquidação.',
};

// Detalhe e status de um desembolso Pix (Mockup 27), para papéis internos. A leitura (GET) é
// local — não chama o provider. A reconsulta (POST /status) reconcilia no provider e exige
// step-up; provider indisponível volta como estado rastreável, nunca como sucesso falso.
// Status, conciliação e transições pertencem ao backend; os campos de apresentação da tela são
// opcionais no contrato e viram travessão quando ausentes.
@Component({
  selector: 'sep-desembolso-detail-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './desembolso-detail-page.component.html',
  styleUrl: './desembolso-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesembolsoDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);

  private id = '';

  protected readonly loading = signal(false);
  protected readonly naoEncontrado = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly desembolso = signal<PixStatusDesembolsoResponse | null>(null);
  protected readonly reconsultando = signal(false);
  protected readonly reconsultaErro = signal<string | null>(null);
  protected readonly copiado = signal<string | null>(null);
  protected readonly menuAberto = signal(false);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  protected readonly statusTom = computed<TomStatus>(() => {
    const d = this.desembolso();
    return d ? (TOM_TRANSFERENCIA[d.status] ?? 'orange') : 'orange';
  });

  protected readonly statusRotulo = computed(() => {
    const d = this.desembolso();
    return d ? (ROTULO_TRANSFERENCIA[d.status] ?? d.status) : '';
  });

  protected readonly statusFrase = computed(() => {
    const d = this.desembolso();
    if (!d) return '';
    if (d.providerIndisponivel) {
      return 'Provider indisponível: status é o último conhecido localmente.';
    }
    return FRASE_TRANSFERENCIA[d.status] ?? '';
  });

  // A linha do tempo só carimba o que o status garante; sem etapas no DTO, a tela não inventa.
  protected readonly etapas = computed<PixEtapaDesembolso[]>(() => this.desembolso()?.etapas ?? []);

  // Reconsultar e enviar comprovante mexem no provider: FINANCEIRO/ADMIN apenas.
  protected readonly podeOperar = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) {
      this.carregar();
    }
  }

  carregar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.naoEncontrado.set(false);
    this.pix.consultarDesembolso(this.id).subscribe({
      next: (desembolso) => {
        this.desembolso.set(desembolso);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrado.set(true);
          return;
        }
        this.errorMessage.set(mensagemPixErro(err, 'Não foi possível carregar o desembolso.'));
      },
    });
  }

  reconsultar(): void {
    this.reconsultando.set(true);
    this.reconsultaErro.set(null);
    this.pix.consultarStatusDesembolso(this.id).subscribe({
      next: (desembolso) => {
        this.desembolso.set(desembolso);
        this.reconsultando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.reconsultando.set(false);
        // 403 aqui é step-up pendente, não falta de permissão: leva ao desafio e volta.
        if (err.status === 403) {
          void this.router.navigateByUrl(`/app/step-up?next=/app/pix/desembolsos/${this.id}`);
          return;
        }
        this.reconsultaErro.set(
          mensagemPixErro(err, 'Não foi possível reconsultar o status no provider.'),
        );
      },
    });
  }

  copiar(valor: string | undefined | null, chave: string): void {
    if (!valor) return;
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  alternarMenu(): void {
    this.menuAberto.update((v) => !v);
  }

  irPara(rota: string): void {
    this.menuAberto.set(false);
    void this.router.navigateByUrl(rota);
  }

  // Comprovante gerado com os dados reais da transferência: não há endpoint de emissão.
  baixarComprovante(): void {
    const d = this.desembolso();
    if (!d) return;
    const linhas = [
      'COMPROVANTE DE DESEMBOLSO PIX',
      '',
      `ID da transferência: ${d.transferenciaId}`,
      `Status: ${this.statusRotulo()}`,
      `Valor: ${formatarMoeda(d.valor)}`,
      `Tarifa: ${this.moeda(d.tarifa)}`,
      `Valor líquido: ${this.moeda(d.valorLiquido ?? d.valor)}`,
      `Data e hora: ${this.dataHora(d.criadoEm)}`,
      `Contrato: ${this.texto(d.contratoId)}`,
      `Proposta: ${this.texto(d.propostaId)}`,
      `Recebedor: ${this.texto(d.nomeRecebedor)}`,
      `Chave Pix destino: ${this.texto(d.chaveDestinoMascara)}`,
      `Banco / Instituição: ${this.texto(d.bancoRecebedor)}`,
      `NSU: ${this.texto(d.nsu)}`,
      `End-to-end ID: ${this.texto(d.endToEndId)}`,
      `Provedor: ${this.texto(d.provedor)}`,
    ];
    const blob = new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-desembolso-${idCurto(d.transferenciaId)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  texto(valor: string | undefined | null): string {
    if (!valor) return '—';
    return valor;
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

  moeda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return '—';
    return formatarMoeda(valor);
  }

  statusPixTransferencia(): StatusPixTransferencia | undefined {
    return this.desembolso()?.status;
  }
}

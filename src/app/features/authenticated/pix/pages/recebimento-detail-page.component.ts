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
  PixRecebimentoResponse,
  StatusPixRecebimento,
} from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { PixService } from '../../../../core/pix/pix.service';
import { environment } from '../../../../../environments/environment';
import { gerarLinhaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import { STATUS_RECEBIMENTO_LABEL, idCurto, mensagemPixErro } from '../shared/pix-format';

type TomStatus = 'green' | 'orange' | 'red';

interface MarcoRecebimento {
  rotulo: string;
  data: string | null;
  hora: string | null;
  origem: string | null;
  concluido: boolean;
}

const TOM_STATUS: Record<StatusPixRecebimento, TomStatus> = {
  RECEBIDO: 'orange',
  EM_PROCESSAMENTO: 'orange',
  CONCILIADO: 'green',
  NAO_IDENTIFICADO: 'red',
  FALHOU: 'red',
};

// Frase do painel de conciliação, derivada do status. O mockup traz a do caso CONCILIADO.
const RESUMO_STATUS: Record<StatusPixRecebimento, string> = {
  RECEBIDO: 'Recebimento identificado, aguardando conciliação.',
  EM_PROCESSAMENTO: 'Recebimento em processamento no provider.',
  CONCILIADO: 'Recebimento vinculado à parcela com sucesso.',
  NAO_IDENTIFICADO: 'Recebimento sem vínculo com referência ou parcela.',
  FALHOU: 'Recebimento não concluído pelo provider.',
};

// Marcos do mockup. Quantos o status garante como concluídos é régua do backend: a tela nunca
// adianta uma conciliação que o status ainda não afirma.
const MARCOS = [
  'Recebimento Pix iniciado',
  'Pagamento recebido no SPI',
  'Validação de dados e chave',
  'Conciliação com parcela',
  'Recebimento conciliado',
];

const MARCOS_CONCLUIDOS: Record<StatusPixRecebimento, number> = {
  RECEBIDO: 2,
  EM_PROCESSAMENTO: 3,
  CONCILIADO: 5,
  NAO_IDENTIFICADO: 2,
  FALHOU: 1,
};

// Detalhe de um recebimento Pix (Mockup 25), para papéis internos. Leitura apenas: conciliação e
// tratamento de divergência pertencem ao backend/backoffice. Um recebimento sem vínculo
// (NAO_IDENTIFICADO) é estado operacional rastreável, não erro de tela — os blocos de conciliação,
// parcela e comprovante aparecem como travessão em vez de sumirem.
//
// O mockup desenha campos que o evento do provider nem sempre traz; os que faltam ficam `null` e
// são exibidos como travessão, nunca herdados de outro registro.
@Component({
  selector: 'sep-recebimento-detail-page',
  imports: [RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './recebimento-detail-page.component.html',
  styleUrl: './recebimento-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecebimentoDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pix = inject(PixService);
  private readonly auth = inject(AuthService);

  private id = '';

  // Só os dois visuais do pacote entram: o restante dos ícones é lucide, como nas demais telas
  // Pix, e menu, cabeçalho e rodapé vêm do shell homologado.
  protected readonly assetBase = '/image/sep_mockup_25_assets';

  protected readonly loading = signal(false);
  protected readonly naoEncontrado = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly recebimento = signal<PixRecebimentoResponse | null>(null);
  protected readonly copiado = signal<string | null>(null);
  protected readonly menuAberto = signal(false);
  protected readonly documentoAberto = signal(false);

  protected readonly idCurto = idCurto;

  protected readonly podeVerParcela = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  protected readonly statusRotulo = computed(() => {
    const r = this.recebimento();
    return r ? STATUS_RECEBIMENTO_LABEL[r.status] : '—';
  });

  protected readonly statusTom = computed<TomStatus>(() => {
    const r = this.recebimento();
    return r ? TOM_STATUS[r.status] : 'orange';
  });

  protected readonly statusResumo = computed(() => {
    const r = this.recebimento();
    return r ? RESUMO_STATUS[r.status] : '—';
  });

  protected readonly conciliado = computed(() => this.recebimento()?.status === 'CONCILIADO');

  // Linha do tempo: usa os eventos do backend quando existirem; sem eles, mantém os cinco marcos
  // do mockup, marcando apenas o que o status garante e deixando o carimbo em aberto.
  protected readonly marcos = computed<MarcoRecebimento[]>(() => {
    const r = this.recebimento();
    const concluidos = r ? MARCOS_CONCLUIDOS[r.status] : 0;
    const eventos = r?.eventos ?? [];
    return MARCOS.map((rotulo, indice) => {
      const evento = eventos.find((item: ParcelaEvento) => this.mesmoMarco(item.rotulo, rotulo));
      return {
        rotulo,
        data: evento ? this.data(evento.dataHora) : null,
        hora: evento ? this.hora(evento.dataHora) : null,
        origem: evento?.origem ?? null,
        concluido: evento ? true : indice < concluidos,
      };
    });
  });

  protected readonly ambiente = computed(() => {
    const url = environment.apiBaseUrl;
    const local = /localhost|127\.0\.0\.1|^\/|^https?:\/\/(?:dev|hml|homolog)/i.test(url);
    return local ? 'HOMOLOGAÇÃO' : 'REGULADO';
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
    this.pix.consultarRecebimento(this.id).subscribe({
      next: (recebimento) => {
        this.recebimento.set(recebimento);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.naoEncontrado.set(true);
          return;
        }
        this.errorMessage.set(mensagemPixErro(err, 'Não foi possível carregar o recebimento.'));
      },
    });
  }

  copiar(valor: string, chave: string): void {
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  irPara(rota: string): void {
    this.menuAberto.set(false);
    void this.router.navigate([rota]);
  }

  abrirParcela(): void {
    const parcelaId = this.recebimento()?.parcelaId;
    if (!parcelaId) return;
    void this.router.navigate(['/app/cobranca/parcelas', parcelaId]);
  }

  abrirFilaOperacional(): void {
    void this.router.navigate(['/app/backoffice/fila']);
  }

  // Fecha ao clicar no fundo, sem `stopPropagation` no diálogo: o listener no conteúdo exigiria
  // um equivalente de teclado só para cancelar a propagação.
  fecharComprovante(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.documentoAberto.set(false);
    }
  }

  baixarComprovante(): void {
    const r = this.recebimento();
    if (!r) return;
    const linhas = [
      'COMPROVANTE PIX — RECEBIMENTO',
      `Recebimento: ${r.recebimentoId}`,
      `Situação: ${STATUS_RECEBIMENTO_LABEL[r.status]}`,
      `Valor recebido: ${this.moeda(r.valor)}`,
      `Recebido em: ${this.dataHora(r.recebidoEm)}`,
      `End-to-end ID: ${this.texto(r.endToEndId)}`,
      `Referência: ${this.texto(r.referenciaId)}`,
      `Instituição: ${this.texto(r.instituicaoRecebedora)}`,
      `Canal: ${this.texto(r.canal)}`,
      `NSU: ${this.texto(r.nsu)}`,
    ];
    this.baixar(`comprovante-${idCurto(r.recebimentoId)}.txt`, linhas.join('\n'));
  }

  exportarDados(): void {
    const r = this.recebimento();
    if (!r) return;
    const csv = [
      gerarLinhaCsv([
        'Recebimento',
        'Status',
        'Valor',
        'RecebidoEm',
        'Referencia',
        'Parcela',
        'EndToEnd',
        'NSU',
      ]),
      gerarLinhaCsv([
        r.recebimentoId,
        r.status,
        r.valor.toFixed(2),
        r.recebidoEm,
        r.referenciaId ?? '',
        r.parcelaId ?? '',
        r.endToEndId ?? '',
        r.nsu ?? '',
      ]),
    ].join('\n');
    this.baixar(`recebimento-${idCurto(r.recebimentoId)}.csv`, csv);
  }

  moeda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  texto(valor: string | null | undefined): string {
    return valor ?? '—';
  }

  // Data e hora montadas peça a peça: o `Intl` insere vírgula entre as duas, e o mockup usa
  // "24/04/2026, 18:30:45" em uma linha e o carimbo da trilha em duas.
  data(valor: string | null | undefined): string {
    if (!valor) return '—';
    const d = new Date(valor);
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  hora(valor: string | null | undefined): string {
    if (!valor) return '—';
    const d = new Date(valor);
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  }

  dataHora(valor: string | null | undefined): string {
    if (!valor) return '—';
    return `${this.data(valor)}, ${this.hora(valor)}`;
  }

  dataCurta(valor: string | null | undefined): string {
    if (!valor) return '—';
    const [ano, mes, dia] = valor.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Os rótulos chegam do backend sem acento; `sensitivity: 'base'` casa "Validacao" com
  // "Validação" sem precisar normalizar à mão.
  private mesmoMarco(a: string, b: string): boolean {
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;
  }

  private baixar(nome: string, conteudo: string): void {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  }
}

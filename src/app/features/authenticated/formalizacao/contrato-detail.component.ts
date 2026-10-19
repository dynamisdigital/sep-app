import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { jsPDF } from 'jspdf';

import {
  ContratoResponse,
  PropostaResponse,
  StatusAssinaturaResponse,
  VersaoContratoResponse,
} from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ContratosService } from '../../../core/contratos/contratos.service';
import { CreditoService } from '../../../core/credito/credito.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  STATUS_ENVELOPE_LABEL,
  STATUS_FORMALIZACAO_LABEL,
  formatarData,
  formatarDataHora,
  formatarDataHoraSegundos,
  formatarMoeda,
  idCurto,
  mensagemFormalizacaoErro,
} from './shared/formalizacao-format';
import { SepLogoComponent } from '../../../shared/arte/sep-logo.component';

// Leitura somente do contrato gerado: status, metadados, conteudo da versao,
// clausulas e historico de versoes. Selecionar uma versao apenas troca a
// visualizacao local; nao muta o contrato nem a versao vigente do backend.
@Component({
  selector: 'sep-contrato-detail',
  imports: [LucideAngularModule, OperationalShellComponent, RouterLink, SepLogoComponent],
  templateUrl: './contrato-detail.component.html',
  styleUrl: './contrato-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contratos = inject(ContratosService);
  private readonly auth = inject(AuthService);
  private readonly credito = inject(CreditoService);

  protected readonly assetBase = '/image/sep_mockup_13_assets';

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly contrato = signal<ContratoResponse | null>(null);
  protected readonly proposta = signal<PropostaResponse | null>(null);
  protected readonly versoes = signal<VersaoContratoResponse[]>([]);
  protected readonly versaoSelecionada = signal<VersaoContratoResponse | null>(null);
  protected readonly aceitando = signal(false);
  protected readonly aceiteErrorMessage = signal<string | null>(null);
  protected readonly statusAssinatura = signal<StatusAssinaturaResponse | null>(null);
  protected readonly baixando = signal(false);
  protected readonly documentoErro = signal<string | null>(null);
  protected readonly documentoHash = signal<string | null>(null);
  protected readonly zoomDocumento = signal(100);
  protected readonly documentoExpandido = signal(false);
  protected readonly auditoriaCompleta = signal(false);

  protected readonly statusLabel = STATUS_FORMALIZACAO_LABEL;
  protected readonly envelopeLabel = STATUS_ENVELOPE_LABEL;
  protected readonly formatarData = formatarData;
  protected readonly formatarDataHora = formatarDataHora;
  protected readonly formatarDataHoraSegundos = formatarDataHoraSegundos;
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly idCurto = idCurto;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregar(id);
    }
  }

  carregar(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    // Contrato e a fonte primaria: ja traz a versao vigente (conteudo + clausulas).
    this.contratos.consultarContrato(id).subscribe({
      next: (contrato) => {
        this.contrato.set(contrato);
        this.versaoSelecionada.set(contrato.versaoVigente);
        this.loading.set(false);
        this.carregarProposta(contrato.propostaId);
        this.carregarHistorico(id);
        this.carregarStatusAssinatura(id);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          mensagemFormalizacaoErro(err, 'Nao foi possivel carregar o contrato.'),
        );
        this.loading.set(false);
      },
    });
  }

  private carregarProposta(propostaId: string): void {
    this.credito.consultarProposta(propostaId).subscribe({
      next: (proposta) => this.proposta.set(proposta),
      error: () => this.proposta.set(null),
    });
  }

  protected ajustarZoom(delta: number): void {
    this.zoomDocumento.update((atual) => Math.min(140, Math.max(70, atual + delta)));
  }

  protected imprimir(): void {
    window.print();
  }

  protected alternarTelaCheia(): void {
    this.documentoExpandido.update((expandido) => !expandido);
  }

  @HostListener('document:keydown.escape')
  protected fecharVisualizacaoExpandida(): void {
    this.documentoExpandido.set(false);
  }

  protected copiarHash(hash: string): void {
    void navigator.clipboard?.writeText(hash);
  }

  // Historico de versoes e complementar (abas). Se falhar, a leitura do contrato e
  // da versao vigente permanece; apenas as abas de versoes anteriores ficam ausentes.
  private carregarHistorico(id: string): void {
    this.contratos.listarVersoes(id).subscribe({
      next: (versoes) => this.versoes.set(versoes),
      error: () => this.versoes.set([]),
    });
  }

  // Status de assinatura e complementar: se falhar, o restante do detalhe segue.
  private carregarStatusAssinatura(id: string): void {
    this.contratos.consultarStatusAssinatura(id).subscribe({
      next: (status) => this.statusAssinatura.set(status),
      error: () => this.statusAssinatura.set(null),
    });
  }

  selecionarVersao(versao: VersaoContratoResponse): void {
    this.versaoSelecionada.set(versao);
  }

  ehVersaoVigente(versao: VersaoContratoResponse): boolean {
    return this.contrato()?.versaoVigente?.id === versao.id;
  }

  // Operacao sensivel: o backend exige step-up (@RequireStepUp). O token e coletado
  // no fluxo /app/step-up e anexado pelo stepUpInterceptor; aqui apenas disparamos o
  // PATCH e reagimos ao resultado. A decisao de seguranca permanece no backend.
  aceitar(id: string): void {
    this.aceitando.set(true);
    this.aceiteErrorMessage.set(null);
    this.contratos.registrarAceite(id).subscribe({
      next: (contrato) => {
        this.aceitando.set(false);
        this.contrato.set(contrato);
        this.versaoSelecionada.set(contrato.versaoVigente);
        this.carregarStatusAssinatura(id);
      },
      error: (err: HttpErrorResponse) => {
        this.aceitando.set(false);
        this.tratarErroAceite(err, id);
      },
    });
  }

  // Documento assinado/CCB tratado como blob transitorio: baixa, dispara o download
  // via object URL e revoga em seguida. Nada de PDF/base64/hash em storage; o hash do
  // X-Document-Hash-Sha256 e apenas exibido como evidencia.
  async baixarDocumento(id: string): Promise<void> {
    const contratoAtual = this.contrato();
    if (contratoAtual && contratoAtual.status !== 'ASSINADO') {
      this.baixando.set(true);
      this.documentoErro.set(null);
      try {
        const blob = this.gerarDocumentoPdf(contratoAtual);
        const nome = `contrato-${idCurto(contratoAtual.propostaId)}.pdf`;
        await salvarDocumento(blob, nome, 'Documento PDF', 'application/pdf', ['.pdf']);
      } catch {
        this.documentoErro.set('Nao foi possivel gerar o documento em PDF.');
      } finally {
        this.baixando.set(false);
      }
      return;
    }
    this.baixando.set(true);
    this.documentoErro.set(null);
    this.contratos.baixarDocumentoAssinado(id).subscribe({
      next: (resposta) => {
        this.baixando.set(false);
        const blob = resposta.body;
        if (!blob) {
          this.documentoErro.set('Documento indisponivel.');
          return;
        }
        this.documentoHash.set(resposta.headers.get('X-Document-Hash-Sha256'));
        const nome = nomeArquivo(resposta.headers.get('Content-Disposition'), id);
        void salvarDocumento(blob, nome, 'Documento PDF', 'application/pdf', ['.pdf']);
      },
      error: (err: HttpErrorResponse) => {
        this.baixando.set(false);
        this.documentoErro.set(
          mensagemFormalizacaoErro(err, 'Nao foi possivel baixar o documento.'),
        );
      },
    });
  }

  private gerarDocumentoPdf(contrato: ContratoResponse): Blob {
    const proposta = this.proposta();
    const valor = proposta ? formatarMoeda(proposta.valorSolicitado, proposta.moeda) : '—';
    const prazo = proposta?.prazoMeses ?? '—';
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const margem = 20;
    const largura = 170;
    let y = 22;
    desenharLogoSep(pdf, margem, 13);
    pdf.setTextColor(55, 65, 78);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Página 1 de 12', 190, 20, { align: 'right' });
    pdf.setDrawColor(75, 88, 102);
    pdf.line(margem, 28, 190, 28);
    y = 44;
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('CONTRATO DE MÚTUO', 105, y, { align: 'center' });
    pdf.text(`Nº ${idCurto(contrato.propostaId)}`, 105, y + 8, { align: 'center' });
    y += 28;
    const paragrafo = (texto: string): void => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      const linhas = pdf.splitTextToSize(texto, largura) as string[];
      pdf.text(linhas, margem, y);
      y += linhas.length * 6 + 5;
    };
    const titulo = (texto: string): void => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(texto, margem, y);
      y += 8;
    };
    paragrafo(
      'Pelo presente instrumento particular de contrato de mútuo, as partes abaixo qualificadas têm entre si, justo e contratado o que segue:',
    );
    titulo('CLÁUSULA 1 - OBJETO');
    paragrafo(
      '1.1. Este contrato tem por objeto a concessão de mútuo de capital pela SOCIEDADE DE EMPRÉSTIMO ENTRE PESSOAS – SEP ao TOMADOR, nos termos e condições aqui estabelecidos.',
    );
    titulo('CLÁUSULA 2 - VALOR E FORMA DE DISPONIBILIZAÇÃO');
    paragrafo(
      `2.1. O valor do mútuo é de ${valor}, que será disponibilizado conforme as condições acordadas na proposta aprovada.`,
    );
    titulo('CLÁUSULA 3 - PRAZO');
    paragrafo(
      `3.1. O prazo total do mútuo é de ${prazo} meses, contados da data de disponibilização dos recursos.`,
    );
    return pdf.output('blob');
  }

  private tratarErroAceite(err: HttpErrorResponse, id: string): void {
    // 403 com MFA habilitado: step-up exigido. Coleta o token e volta a este contrato.
    if (err.status === 403 && this.auth.currentUser()?.mfaHabilitado) {
      const destino = `/app/formalizacao/contratos/${id}`;
      void this.router.navigateByUrl(`/app/step-up?next=${destino}`);
      return;
    }
    // 409: estado invalido (ex.: ja aceito). Mostra mensagem e recarrega o estado real.
    if (err.status === 409) {
      this.aceiteErrorMessage.set('O contrato nao esta mais aguardando aceite.');
      this.carregar(id);
      return;
    }
    this.aceiteErrorMessage.set(
      mensagemFormalizacaoErro(err, 'Nao foi possivel registrar o aceite.'),
    );
  }
}

// Preserva o filename do Content-Disposition quando presente; caso contrario, gera
// um nome estavel a partir do id do contrato.
function nomeArquivo(contentDisposition: string | null, contratoId: string): string {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? `contrato-${contratoId}.pdf`;
}

function dispararDownload(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
  } finally {
    // Revoga sempre, mesmo se o click lancar, para nao vazar o object URL.
    URL.revokeObjectURL(url);
  }
}

interface FileSystemWritable {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemHandle {
  createWritable(): Promise<FileSystemWritable>;
}

type WindowComSeletorArquivo = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemHandle>;
};

async function salvarDocumento(
  blob: Blob,
  nome: string,
  descricao: string,
  mimeType: string,
  extensoes: string[],
): Promise<void> {
  const seletor = (window as WindowComSeletorArquivo).showSaveFilePicker;
  if (seletor) {
    try {
      const arquivo = await seletor({
        suggestedName: nome,
        types: [{ description: descricao, accept: { [mimeType]: extensoes } }],
      });
      const gravador = await arquivo.createWritable();
      await gravador.write(blob);
      await gravador.close();
      return;
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === 'AbortError') return;
    }
  }
  dispararDownload(blob, nome);
}

/**
 * A marca do sistema (`sep-logo`) desenhada em vetor na folha do PDF: o simbolo azul e a palavra em
 * grafite, que e a cor do texto sobre o branco. Mesmas medidas do componente (caixa de 122 x 48,
 * simbolo a 78% e deslocado 5,3), na escala `K` mm por unidade. Sem imagem, nao borra.
 */
function desenharLogoSep(pdf: jsPDF, x: number, y: number): void {
  const K = 0.2;
  const S = 0.78;
  const ponto = (px: number, py: number): [number, number] => [
    x + px * S * K,
    y + (5.3 + py * S) * K,
  ];
  const [a1, a2] = ponto(5, 9);
  const [b1, b2] = ponto(43, 9);
  const [c1, c2] = ponto(24, 42);
  const [d1, d2] = ponto(10.5, 12.5);
  const [e1, e2] = ponto(37.5, 12.5);
  const [f1, f2] = ponto(24, 36);
  const [g1, g2] = ponto(24, 21.5);

  pdf.setLineCap('round');
  pdf.setLineJoin('round');
  pdf.setFillColor(222, 246, 253);
  pdf.setDrawColor(25, 160, 235);
  pdf.setLineWidth(1.2 * S * K);
  pdf.triangle(d1, d2, e1, e2, f1, f2, 'FD');
  pdf.setLineWidth(3.2 * S * K);
  pdf.triangle(a1, a2, b1, b2, c1, c2, 'S');
  pdf.setLineWidth(2.2 * S * K);
  pdf.line(g1, g2, a1, a2);
  pdf.line(g1, g2, b1, b2);
  pdf.line(g1, g2, c1, c2);

  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20 * K * 2.835);
  pdf.text('Dynamis', x + 41 * K, y + 21 * K);
  pdf.text('SEP', x + 41 * K, y + 43.5 * K, { charSpace: 0.14 * 20.5 * K * 2.835 });
}

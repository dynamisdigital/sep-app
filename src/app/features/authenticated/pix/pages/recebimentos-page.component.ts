import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  PixRecebimentoResponse,
  PixReferenciaRecebimentoResponse,
  StatusPixRecebimento,
  StatusPixReferenciaRecebimento,
} from '../../../../core/api/api.models';
import { PixService } from '../../../../core/pix/pix.service';
import { gerarLinhaCsv } from '../../../../core/format/csv-format';
import { OperationalShellComponent } from '../../../../layout/operational-shell/operational-shell.component';

import { corDoTom, fatiasDonut, gradienteDonut } from '../../../../shared/donut';
import {
  STATUS_RECEBIMENTO_LABEL,
  STATUS_REFERENCIA_LABEL,
  mensagemPixErro,
} from '../shared/pix-format';

type PainelConsulta = 'referencia' | 'recebimento';

interface ConsultaRecente {
  id: string;
  data: string;
  tipo: PainelConsulta;
}

const HISTORICO_MAXIMO = 10;
type TomStatus = 'green' | 'orange' | 'red';

interface EtapaRecebimento {
  rotulo: string;
  hora: string | null;
  concluida: boolean;
}

// A tela mostra bem mais campos do que os dois endpoints devolvem. O que a API não informa fica
// `null` e é exibido como "—": herdar o valor da consulta anterior (ou do exemplo) faria a tela
// atribuir pagador, contrato e protocolo de um recebimento a outro.
interface RecebimentoView {
  referenciaId: string | null;
  recebimentoId: string | null;
  statusRotulo: string;
  statusTom: TomStatus;
  statusResumo: string;
  valor: number;
  taxa: number | null;
  recebidoEm: string | null;
  pagador: string | null;
  instituicao: string | null;
  contrato: string | null;
  parcela: string | null;
  parcelaId: string | null;
  // Id navegável do recebimento: o rótulo exibido nem sempre é o identificador da rota.
  detalheId: string | null;
  vencimento: string | null;
  situacaoParcela: string | null;
  chavePix: string | null;
  endToEndId: string | null;
  etapas: EtapaRecebimento[];
  conciliadoEm: string | null;
  responsavel: string | null;
  metodo: string | null;
  protocolo: string | null;
  pspId: string | null;
  situacaoSpi: string | null;
  codigoErro: string | null;
  comprovanteArquivo: string | null;
  comprovanteGeradoEm: string | null;
  canal: string | null;
  tipoOperacao: string | null;
  descricao: string | null;
  autenticacao: string | null;
  autorizacao: string | null;
}

const ETAPAS = ['Pagamento', 'Processamento', 'Confirmação SPI', 'Conciliação', 'Liquidado'];

// Quantas etapas cada status garante como concluídas. A régua é do backend: a tela só marca o que
// o status já afirma, nunca adianta a conciliação de um recebimento apenas recebido.
const ETAPAS_POR_RECEBIMENTO: Record<StatusPixRecebimento, number> = {
  RECEBIDO: 1,
  EM_PROCESSAMENTO: 2,
  CONCILIADO: 5,
  NAO_IDENTIFICADO: 1,
  FALHOU: 1,
};

const ETAPAS_POR_REFERENCIA: Record<StatusPixReferenciaRecebimento, number> = {
  ATIVA: 0,
  PAGA: 3,
  EXPIRADA: 0,
  CANCELADA: 0,
  DIVERGENTE: 2,
};

const TOM_RECEBIMENTO: Record<StatusPixRecebimento, TomStatus> = {
  RECEBIDO: 'orange',
  EM_PROCESSAMENTO: 'orange',
  CONCILIADO: 'green',
  NAO_IDENTIFICADO: 'red',
  FALHOU: 'red',
};

const TOM_REFERENCIA: Record<StatusPixReferenciaRecebimento, TomStatus> = {
  ATIVA: 'orange',
  PAGA: 'green',
  EXPIRADA: 'red',
  CANCELADA: 'red',
  DIVERGENTE: 'red',
};

const RESUMO_RECEBIMENTO: Record<StatusPixRecebimento, string> = {
  RECEBIDO: 'Recebimento identificado, aguardando conciliação.',
  EM_PROCESSAMENTO: 'Recebimento em processamento no provider.',
  CONCILIADO: 'Recebimento identificado e conciliado com sucesso.',
  NAO_IDENTIFICADO: 'Recebimento sem vínculo com referência ou parcela.',
  FALHOU: 'Recebimento não concluído pelo provider.',
};

const RESUMO_REFERENCIA: Record<StatusPixReferenciaRecebimento, string> = {
  ATIVA: 'Referência ativa, aguardando o pagamento da parcela.',
  PAGA: 'Referência paga: recebimento identificado.',
  EXPIRADA: 'Referência expirada sem pagamento.',
  CANCELADA: 'Referência cancelada.',
  DIVERGENTE: 'Referência com divergência apurada pelo backoffice.',
};

// Base de uma consulta real: só os campos vindos do DTO são preenchidos por cima desta.
const VAZIO: RecebimentoView = {
  referenciaId: null,
  recebimentoId: null,
  statusRotulo: '—',
  statusTom: 'orange',
  statusResumo: 'Consulta concluída.',
  valor: 0,
  taxa: null,
  recebidoEm: null,
  pagador: null,
  instituicao: null,
  contrato: null,
  parcela: null,
  parcelaId: null,
  detalheId: null,
  vencimento: null,
  situacaoParcela: null,
  chavePix: null,
  endToEndId: null,
  etapas: [],
  conciliadoEm: null,
  responsavel: null,
  metodo: null,
  protocolo: null,
  pspId: null,
  situacaoSpi: null,
  codigoErro: null,
  comprovanteArquivo: null,
  comprovanteGeradoEm: null,
  canal: null,
  tipoOperacao: null,
  descricao: null,
  autenticacao: null,
  autorizacao: null,
};

// Caso homologado do mockup: o único com a tela inteira preenchida, porque também é o único cujos
// dados de pagador, conciliação e comprovante existem fora dos DTOs.
const EXEMPLO: RecebimentoView = {
  ...VAZIO,
  referenciaId: 'REF-20250530-ABC123',
  recebimentoId: 'E6074694820250530114258s1000uLZQ',
  statusRotulo: 'CONCILIADO',
  statusTom: 'green',
  statusResumo: RESUMO_RECEBIMENTO.CONCILIADO,
  valor: 1250,
  taxa: 0,
  recebidoEm: '2026-05-30T11:47:18-03:00',
  pagador: 'João da Silva',
  instituicao: 'Banco ABCD S.A.',
  contrato: 'CONT-8d9991a11',
  parcela: 'Parcela 4/24',
  // Parcela do caso homologado: o atalho "Ir para a parcela" precisa de um id que exista.
  parcelaId: 'a0000000-0000-4000-8000-000000000001',
  // Recebimento do caso homologado: o atalho para o detalhe precisa de um id que exista.
  detalheId: 'e2000000-0000-4000-8000-000000000001',
  vencimento: '20/07/2026',
  situacaoParcela: 'Liquidada',
  chavePix:
    '00020126580014BR.GOV.BCB.PIX013658a7f903-4d9f-4c2a-95b2-2c7b3f4d9a8d52040000530398654051.005802BR5913JOAO DA SILVA6009SAO PAULO62070503***6304A1B2',
  endToEndId: 'E2E-3f87b9da1e24c5aa2e0b3a4d5f6g7h8',
  etapas: [
    { rotulo: 'Pagamento', hora: '30/05 11:46:58', concluida: true },
    { rotulo: 'Processamento', hora: '30/05 11:47:02', concluida: true },
    { rotulo: 'Confirmação SPI', hora: '30/05 11:47:06', concluida: true },
    { rotulo: 'Conciliação', hora: '30/05 11:47:15', concluida: true },
    { rotulo: 'Liquidado', hora: '30/05 11:47:18', concluida: true },
  ],
  conciliadoEm: '30/05/2026 11:47:15',
  responsavel: 'Ana Martins',
  metodo: 'Automático',
  protocolo: 'CONC-20250530-114715',
  pspId: 'PSP-987654321',
  situacaoSpi: 'LIQUIDADO',
  codigoErro: null,
  comprovanteArquivo: 'PDF • 132 KB',
  comprovanteGeradoEm: 'Gerado em 30/05/2026 11:47:18',
  canal: 'PIX SPI',
  tipoOperacao: 'Recebimento de parcela',
  descricao: 'Recebimento Parcela 4/24',
  autenticacao: 'Autenticado',
  autorizacao: 'Autorizado',
};

@Component({
  selector: 'sep-recebimentos-page',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, OperationalShellComponent],
  templateUrl: './recebimentos-page.component.html',
  styleUrl: './recebimentos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecebimentosPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly pix = inject(PixService);
  private readonly router = inject(Router);

  // Só o preview do comprovante vem do pacote do mockup: os demais recortes trazem texto e
  // bordas do mockup embutidos, então os ícones desta tela são lucide e os gráficos, desenhados.
  protected readonly assetBase = '/image/sep_mockup_22_assets';
  // A aba é a seleção da tela: destaca o cartão de consulta correspondente, leva o foco para o
  // campo dele e acompanha a origem do resultado exibido abaixo.
  protected readonly aba = signal<PainelConsulta>('referencia');
  protected readonly origem = signal<PainelConsulta>('referencia');
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly resultado = signal<RecebimentoView>(EXEMPLO);
  protected readonly copiado = signal<string | null>(null);
  protected readonly documentoAberto = signal(false);
  // Historico da sessao. O cartao mostra as tres ultimas; "Ver todas" abre a lista inteira, e
  // qualquer item repete a consulta (antes o link apontava para esta mesma tela).
  protected readonly consultas = signal<ConsultaRecente[]>([
    { id: 'REF-20250530-ABC123', data: '30/05/2026 11:47:18', tipo: 'referencia' },
    { id: 'REF-20250530-XYZ789', data: '30/05/2026 11:32:05', tipo: 'referencia' },
    { id: 'E6074694820250530114258s1000uLZQ', data: '30/05/2026 11:15:42', tipo: 'recebimento' },
  ]);
  protected readonly consultasRecentes = computed(() => this.consultas().slice(0, 3));
  protected readonly historicoAberto = signal(false);

  // Painel agregado da carteira, nao do id consultado: conta `GET /pix/recebimentos`. Antes o
  // numero era digitado aqui (1.573 conciliados, 100%), porque so existia a consulta por id.
  // O percentual, o anel e o nucleo saem todos desta contagem, entao nao ha como um discordar
  // do outro. Os cinco status do contrato entram em tres faixas: pendente e o que ainda esta em
  // transito (RECEBIDO, EM_PROCESSAMENTO) e divergente e o que exige tratamento humano
  // (NAO_IDENTIFICADO, FALHOU).
  private readonly carteira = signal<readonly PixRecebimentoResponse[]>([]);
  protected readonly carteiraIndisponivel = signal(false);

  private readonly FAIXAS_CONCILIACAO: {
    rotulo: string;
    tom: 'verde' | 'ambar' | 'vermelho';
    status: StatusPixRecebimento[];
  }[] = [
    { rotulo: 'Conciliados', tom: 'verde', status: ['CONCILIADO'] },
    { rotulo: 'Pendentes', tom: 'ambar', status: ['RECEBIDO', 'EM_PROCESSAMENTO'] },
    { rotulo: 'Divergentes', tom: 'vermelho', status: ['NAO_IDENTIFICADO', 'FALHOU'] },
  ];

  protected readonly conciliacao = computed(() => {
    const lista = this.carteira();
    return fatiasDonut(
      this.FAIXAS_CONCILIACAO.map((faixa) => ({
        rotulo: faixa.rotulo,
        valor: lista.filter((r) => faixa.status.includes(r.status)).length,
        tom: faixa.tom,
      })),
    );
  });

  protected readonly carteiraTotal = computed(() => this.carteira().length);

  ngOnInit(): void {
    this.pix.listarRecebimentos().subscribe({
      next: (lista) => {
        this.carteira.set(lista);
        this.carteiraIndisponivel.set(false);
      },
      error: () => {
        this.carteira.set([]);
        this.carteiraIndisponivel.set(true);
      },
    });
  }

  protected readonly conciliados = computed(
    () => this.conciliacao().find((f) => f.rotulo === 'Conciliados')?.percentual ?? '0,0%',
  );

  protected readonly corDoTom = corDoTom;

  // Anel do status da conciliacao, na mesma tecnica dos demais donuts (conic-gradient por faixa).
  protected readonly donut = computed(() => gradienteDonut(this.conciliacao()));

  // Série do mockup, só para desenhar a sparkline do tempo de resposta.
  private readonly serieTempoResposta = [
    182, 191, 178, 199, 184, 205, 176, 193, 186, 201, 179, 196, 188, 203, 181,
  ];

  protected readonly sparklinePontos = computed(() => {
    const valores = this.serieTempoResposta;
    const maximo = Math.max(...valores);
    const minimo = Math.min(...valores);
    const faixa = Math.max(maximo - minimo, 1);
    const passo = 120 / (valores.length - 1);
    return valores
      .map(
        (valor, indice) =>
          `${(indice * passo).toFixed(2)},${(21 - ((valor - minimo) / faixa) * 18).toFixed(2)}`,
      )
      .join(' ');
  });

  protected readonly valorLiquido = computed(() => {
    const { valor, taxa } = this.resultado();
    return taxa === null ? null : valor - taxa;
  });

  protected readonly referenciaForm = this.fb.group({
    referenciaId: this.fb.nonNullable.control(EXEMPLO.referenciaId ?? '', Validators.required),
  });
  protected readonly recebimentoForm = this.fb.group({
    recebimentoId: this.fb.nonNullable.control(EXEMPLO.recebimentoId ?? '', Validators.required),
  });

  private readonly abaReferencia = viewChild<ElementRef<HTMLButtonElement>>('abaReferencia');
  private readonly abaRecebimento = viewChild<ElementRef<HTMLButtonElement>>('abaRecebimento');
  private readonly campoReferencia = viewChild<ElementRef<HTMLInputElement>>('campoReferencia');
  private readonly campoRecebimento = viewChild<ElementRef<HTMLInputElement>>('campoRecebimento');

  selecionarAba(painel: PainelConsulta): void {
    this.aba.set(painel);
    this.campo(painel)?.nativeElement.focus();
  }

  // Setas alternam as abas mantendo o foco na própria faixa, como pede o padrão ARIA de tablist.
  alternarAba(): void {
    const proxima: PainelConsulta = this.aba() === 'referencia' ? 'recebimento' : 'referencia';
    this.aba.set(proxima);
    const botao = proxima === 'referencia' ? this.abaReferencia() : this.abaRecebimento();
    botao?.nativeElement.focus();
  }

  consultarReferencia(): void {
    this.aba.set('referencia');
    const id = this.referenciaForm.controls.referenciaId.value.trim();
    if (!id) return this.referenciaForm.controls.referenciaId.markAsTouched();
    if (id === EXEMPLO.referenciaId) return this.usarExemplo(id, 'referencia');
    this.iniciarConsulta();
    this.pix.consultarReferenciaRecebimento(id).subscribe({
      next: (referencia) => this.receberReferencia(referencia),
      error: (erro: HttpErrorResponse) => this.falhar(erro),
    });
  }

  consultarRecebimento(): void {
    this.aba.set('recebimento');
    const id = this.recebimentoForm.controls.recebimentoId.value.trim();
    if (!id) return this.recebimentoForm.controls.recebimentoId.markAsTouched();
    if (id === EXEMPLO.recebimentoId) return this.usarExemplo(id, 'recebimento');
    this.iniciarConsulta();
    this.pix.consultarRecebimento(id).subscribe({
      next: (recebimento) => this.receberRecebimento(recebimento),
      error: (erro: HttpErrorResponse) => this.falhar(erro),
    });
  }

  limpar(tipo: PainelConsulta): void {
    if (tipo === 'referencia') {
      this.referenciaForm.controls.referenciaId.setValue('');
    } else {
      this.recebimentoForm.controls.recebimentoId.setValue('');
    }
    this.erro.set(null);
  }

  copiar(valor: string, chave: string): void {
    void navigator.clipboard?.writeText(valor);
    this.copiado.set(chave);
    window.setTimeout(() => this.copiado.set(null), 1600);
  }

  // Fecha ao clicar no fundo, sem `stopPropagation` no diálogo: o listener no conteúdo exigiria
  // um equivalente de teclado só para cancelar a propagação.
  /** Refaz uma consulta do historico no painel do tipo dela. */
  repetirConsulta(item: ConsultaRecente): void {
    this.historicoAberto.set(false);
    if (item.tipo === 'referencia') {
      this.referenciaForm.controls.referenciaId.setValue(item.id);
      this.consultarReferencia();
    } else {
      this.recebimentoForm.controls.recebimentoId.setValue(item.id);
      this.consultarRecebimento();
    }
  }

  fecharHistorico(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.historicoAberto.set(false);
    }
  }

  fecharComprovante(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.documentoAberto.set(false);
    }
  }

  exportar(): void {
    const r = this.resultado();
    const cabecalho = gerarLinhaCsv(['Referência', 'Recebimento', 'Valor', 'Status']);
    const linha = gerarLinhaCsv([
      this.texto(r.referenciaId),
      this.texto(r.recebimentoId),
      r.valor.toFixed(2),
      r.statusRotulo,
    ]);
    this.baixar('recebimento-pix.csv', `${cabecalho}\n${linha}`, 'text/csv;charset=utf-8');
  }

  baixarComprovante(): void {
    const r = this.resultado();
    this.baixar(
      `comprovante-${r.referenciaId ?? r.recebimentoId ?? 'pix'}.txt`,
      `COMPROVANTE PIX\nStatus: ${r.statusRotulo}\nValor: ${this.moeda(r.valor)}\nReferência: ${this.texto(r.referenciaId)}\nRecebimento: ${this.texto(r.recebimentoId)}\nPagador: ${this.texto(r.pagador)}`,
      'text/plain;charset=utf-8',
    );
  }

  // Segue a parcela vinculada ao resultado em tela. Sem vínculo não há destino, e o atalho
  // aparece desabilitado em vez de levar a um 404.
  abrirParcela(): void {
    const id = this.resultado().parcelaId;
    if (!id) return;
    void this.router.navigate(['/app/cobranca/parcelas', id]);
  }

  // Abre o detalhe do recebimento consultado (Mockup 25). A consulta por referência não
  // devolve recebimento, então lá o atalho não tem destino.
  abrirDetalhe(): void {
    const id = this.resultado().detalheId;
    if (!id) return;
    void this.router.navigate(['/app/pix/recebimentos', id]);
  }

  abrirOcorrencia(): void {
    void this.router.navigate(['/app/pix/divergencias']);
  }

  // Campo sem correspondente nos DTOs de referência/recebimento aparece como traço, não em branco.
  texto(valor: string | null): string {
    return valor ?? '—';
  }

  iniciais(nome: string): string {
    return nome
      .split(' ')
      .map((parte) => parte.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  moeda(valor: number | null): string {
    if (valor === null) return '—';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  data(valor: string | null): string {
    if (!valor) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(valor));
  }

  private campo(painel: PainelConsulta): ElementRef<HTMLInputElement> | undefined {
    return painel === 'referencia' ? this.campoReferencia() : this.campoRecebimento();
  }

  private iniciarConsulta(): void {
    this.carregando.set(true);
    this.erro.set(null);
  }

  private usarExemplo(id: string, painel: PainelConsulta): void {
    this.resultado.set(EXEMPLO);
    this.origem.set(painel);
    this.erro.set(null);
    this.registrarConsulta(id, painel);
  }

  private receberReferencia(referencia: PixReferenciaRecebimentoResponse): void {
    this.carregando.set(false);
    this.origem.set('referencia');
    this.resultado.set({
      ...VAZIO,
      referenciaId: referencia.referenciaId,
      parcela: referencia.parcelaId,
      parcelaId: referencia.parcelaId,
      valor: referencia.valorEsperado,
      chavePix: referencia.codigoCopiaCola,
      statusRotulo: STATUS_REFERENCIA_LABEL[referencia.status],
      statusTom: TOM_REFERENCIA[referencia.status],
      statusResumo: RESUMO_REFERENCIA[referencia.status],
      etapas: this.montarEtapas(ETAPAS_POR_REFERENCIA[referencia.status], null),
      canal: 'PIX SPI',
      tipoOperacao: 'Referência de recebimento',
      descricao: `TXID ${referencia.txid}`,
    });
    this.registrarConsulta(referencia.referenciaId, 'referencia');
  }

  private receberRecebimento(recebimento: PixRecebimentoResponse): void {
    this.carregando.set(false);
    this.origem.set('recebimento');
    this.resultado.set({
      ...VAZIO,
      recebimentoId: recebimento.recebimentoId,
      referenciaId: recebimento.referenciaId,
      parcela: recebimento.parcelaId,
      parcelaId: recebimento.parcelaId,
      detalheId: recebimento.recebimentoId,
      valor: recebimento.valor,
      recebidoEm: recebimento.recebidoEm,
      endToEndId: recebimento.endToEndId,
      codigoErro: recebimento.motivoDivergencia,
      statusRotulo: STATUS_RECEBIMENTO_LABEL[recebimento.status],
      statusTom: TOM_RECEBIMENTO[recebimento.status],
      statusResumo: RESUMO_RECEBIMENTO[recebimento.status],
      etapas: this.montarEtapas(
        ETAPAS_POR_RECEBIMENTO[recebimento.status],
        this.hora(recebimento.recebidoEm),
      ),
      canal: 'PIX SPI',
      tipoOperacao: recebimento.parcelaId
        ? 'Recebimento de parcela'
        : 'Recebimento sem parcela vinculada',
    });
    this.registrarConsulta(recebimento.recebimentoId, 'recebimento');
  }

  // Só o pagamento tem hora conhecida (`recebidoEm`); as demais etapas ficam sem carimbo até o
  // backend expor a trilha do provider.
  private montarEtapas(concluidas: number, horaPagamento: string | null): EtapaRecebimento[] {
    return ETAPAS.map((rotulo, indice) => ({
      rotulo,
      hora: indice === 0 ? horaPagamento : null,
      concluida: indice < concluidas,
    }));
  }

  private hora(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  private falhar(erro: HttpErrorResponse): void {
    this.carregando.set(false);
    this.erro.set(mensagemPixErro(erro, 'Não foi possível consultar o recebimento.'));
  }

  private registrarConsulta(id: string, tipo: PainelConsulta): void {
    const data = new Date().toLocaleString('pt-BR');
    this.consultas.update((lista) =>
      [{ id, data, tipo }, ...lista.filter((item) => item.id !== id)].slice(0, HISTORICO_MAXIMO),
    );
  }

  private baixar(nome: string, conteudo: string, tipo: string): void {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  }
}

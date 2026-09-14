import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import { mensagemDeErroDaApi } from '../../../core/api/api-error';
import { NotificacaoResponse, PageResponse } from '../../../core/api/api.models';
import { NotificacaoService } from '../../../core/notificacoes/notificacao.service';
import { NotificacoesNaoLidasStore } from '../../../core/notificacoes/notificacoes-nao-lidas.store';

const TAMANHO_PAGINA = 10;
const ERRO_PADRAO = 'Nao foi possivel carregar suas notificacoes.';
const ERRO_LEITURA = 'Nao foi possivel marcar o aviso como lido. Tente novamente.';
// Mesmo texto para aviso inexistente, de outra conta ou de e-mail: o 404 do backend e neutro, e a
// tela nao pode ser mais especifica que ele.
const AVISO_NAO_ENCONTRADO =
  'Este aviso nao foi encontrado. Atualize a lista para ver seus avisos.';

interface FalhaDeLeitura {
  mensagem: string;
  naoEncontrada: boolean;
}

type Consulta =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronta'; itens: NotificacaoResponse[]; total: number };

// Resposta sem `content` em lista ou sem `totalElements` numerico e erro, e nao central vazia:
// confundir as duas esconderia uma falha atras da superficie mais comum em producao.
function ehPaginaValida(corpo: unknown): corpo is PageResponse<NotificacaoResponse> {
  const pagina = corpo as Partial<PageResponse<NotificacaoResponse>> | null;
  return Array.isArray(pagina?.content) && typeof pagina?.totalElements === 'number';
}

function idDoTitulo(id: string): string {
  return `notificacao-${id}`;
}

// Copias sem o id, para manter os signals imutaveis.
function semId(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const copia = new Set(ids);
  copia.delete(id);
  return copia;
}

function semFalha(
  falhas: ReadonlyMap<string, FalhaDeLeitura>,
  id: string,
): ReadonlyMap<string, FalhaDeLeitura> {
  const copia = new Map(falhas);
  copia.delete(id);
  return copia;
}

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

// Central de notificacoes do usuario autenticado (F-Sprint 27, spec 127). Lista paginada na ordem
// do servidor (`criadaEm` desc, `id` desc) com quatro superficies distintas: carregando, lista,
// vazio e erro. So o canal IN_APP chega aqui; ownership e recorte sao do backend. A referencia do
// item nao vira link: nenhuma navegacao por notificacao faz parte desta spec.
@Component({
  selector: 'sep-notificacoes-page',
  templateUrl: './notificacoes-page.component.html',
  styleUrl: './notificacoes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificacoesPageComponent implements OnInit, AfterViewInit {
  private readonly notificacoes = inject(NotificacaoService);
  private readonly naoLidas = inject(NotificacoesNaoLidasStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly titulo = viewChild.required<ElementRef<HTMLHeadingElement>>('titulo');

  protected readonly formatarDataHora = formatarDataHora;
  protected readonly pagina = signal(0);
  protected readonly consulta = signal<Consulta>({ situacao: 'carregando' });
  protected readonly marcando = signal<ReadonlySet<string>>(new Set());
  protected readonly falhas = signal<ReadonlyMap<string, FalhaDeLeitura>>(new Map());
  protected readonly anuncio = signal('');
  // Leituras confirmadas pelo servidor, sobrepostas a qualquer lista: uma resposta de lista pedida
  // antes da confirmacao ainda traz o aviso como nao lido, e nao pode ressuscita-lo.
  private readonly lidasConfirmadas = signal<ReadonlyMap<string, NotificacaoResponse>>(new Map());
  protected readonly itens = computed(() => {
    const consulta = this.consulta();
    if (consulta.situacao !== 'pronta') {
      return [];
    }
    const confirmadas = this.lidasConfirmadas();
    return consulta.itens.map((item) => (item.lidaEm ? item : (confirmadas.get(item.id) ?? item)));
  });
  protected readonly total = computed(() => {
    const consulta = this.consulta();
    return consulta.situacao === 'pronta' ? consulta.total : 0;
  });
  protected readonly mensagemErro = computed(() => {
    const consulta = this.consulta();
    return consulta.situacao === 'erro' ? consulta.mensagem : '';
  });
  protected readonly totalPaginas = computed(() => Math.ceil(this.total() / TAMANHO_PAGINA));

  private consultaEmVoo?: Subscription;

  constructor() {
    this.destroyRef.onDestroy(() => this.consultaEmVoo?.unsubscribe());
  }

  ngOnInit(): void {
    this.naoLidas.carregar();
    this.buscar(false);
  }

  ngAfterViewInit(): void {
    // O Angular nao move foco na navegacao: sem isto quem chega pelo sino fica com o foco no link.
    this.titulo().nativeElement.focus();
  }

  irParaPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.buscar(true);
  }

  tentarNovamente(): void {
    this.buscar(true);
  }

  // Gesto explicito por aviso; abrir a central nao marca nada. Aviso ja lido ou com leitura em voo
  // nao gera outro POST, nem por clique repetido nem por chamada direta. So a confirmacao do servidor
  // baixa o contador, e uma vez: falha libera o retry com o mesmo id, que o POST idempotente absorve
  // mesmo que a tentativa anterior tenha gravado antes de cair.
  marcarComoLida(id: string): void {
    const aviso = this.itens().find((item) => item.id === id);
    if (!aviso || aviso.lidaEm || this.marcando().has(id)) {
      return;
    }
    this.marcando.update((ids) => new Set(ids).add(id));
    this.falhas.update((falhas) => semFalha(falhas, id));
    this.anuncio.set('');

    this.notificacoes
      .marcarComoLida(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.marcando.update((ids) => semId(ids, id))),
      )
      .subscribe({
        next: (lida) => {
          this.lidasConfirmadas.update((lidas) => new Map(lidas).set(id, lida));
          this.naoLidas.registrarLeitura();
          this.anuncio.set('Aviso marcado como lido.');
          // O botao some com a leitura: o foco vai ao titulo do aviso em vez de cair no <body>.
          this.host.nativeElement.querySelector<HTMLElement>(`#${idDoTitulo(id)}`)?.focus();
        },
        error: (err: HttpErrorResponse) => {
          const naoEncontrada = err.status === 404;
          const mensagem = naoEncontrada ? AVISO_NAO_ENCONTRADO : ERRO_LEITURA;
          this.falhas.update((falhas) => new Map(falhas).set(id, { mensagem, naoEncontrada }));
        },
      });
  }

  protected idDoTitulo(id: string): string {
    return idDoTitulo(id);
  }

  // Trocar de pagina ou repetir cancela a consulta anterior, entao uma resposta velha nunca
  // sobrescreve a pagina pedida por ultimo. Depois de um gesto, o conteudo foi substituido: o foco
  // volta ao titulo para nao cair no <body>.
  private buscar(porGesto: boolean): void {
    this.consultaEmVoo?.unsubscribe();
    this.falhas.set(new Map());
    this.anuncio.set('');
    this.consulta.set({ situacao: 'carregando' });
    this.consultaEmVoo = this.notificacoes.listar(this.pagina(), TAMANHO_PAGINA).subscribe({
      next: (corpo) => {
        this.consulta.set(
          ehPaginaValida(corpo)
            ? { situacao: 'pronta', itens: corpo.content, total: corpo.totalElements }
            : { situacao: 'erro', mensagem: ERRO_PADRAO },
        );
        this.focarTituloSe(porGesto);
      },
      error: (err: HttpErrorResponse) => {
        this.consulta.set({ situacao: 'erro', mensagem: mensagemDeErroDaApi(err, ERRO_PADRAO) });
        this.focarTituloSe(porGesto);
      },
    });
  }

  private focarTituloSe(porGesto: boolean): void {
    if (porGesto) {
      this.titulo().nativeElement.focus();
    }
  }
}

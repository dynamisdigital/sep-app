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
import { Subscription } from 'rxjs';

import { mensagemDeErroDaApi } from '../../../core/api/api-error';
import { NotificacaoResponse, PageResponse } from '../../../core/api/api.models';
import { NotificacaoService } from '../../../core/notificacoes/notificacao.service';
import { NotificacoesNaoLidasStore } from '../../../core/notificacoes/notificacoes-nao-lidas.store';

const TAMANHO_PAGINA = 10;
const ERRO_PADRAO = 'Nao foi possivel carregar suas notificacoes.';

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
  private readonly titulo = viewChild.required<ElementRef<HTMLHeadingElement>>('titulo');

  protected readonly formatarDataHora = formatarDataHora;
  protected readonly pagina = signal(0);
  protected readonly consulta = signal<Consulta>({ situacao: 'carregando' });
  protected readonly itens = computed(() => {
    const consulta = this.consulta();
    return consulta.situacao === 'pronta' ? consulta.itens : [];
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

  // Trocar de pagina ou repetir cancela a consulta anterior, entao uma resposta velha nunca
  // sobrescreve a pagina pedida por ultimo. Depois de um gesto, o conteudo foi substituido: o foco
  // volta ao titulo para nao cair no <body>.
  private buscar(porGesto: boolean): void {
    this.consultaEmVoo?.unsubscribe();
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

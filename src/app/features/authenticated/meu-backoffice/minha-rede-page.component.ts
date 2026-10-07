import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import {
  ComissaoDaRedeResponse,
  MinhaPosicaoNaRedeResponse,
  OperacaoDaRedeResponse,
  RedeDoMajoritarioResponse,
  StatusSub,
  SubCorrespondenteResponse,
} from '../../../core/correspondentes/correspondentes-rede.models';
import { CorrespondentesRedeService } from '../../../core/correspondentes/correspondentes-rede.service';
import { OperationalShellComponent } from '../../../layout/operational-shell/operational-shell.component';
import {
  formatarMoeda,
  formatarPercentual,
  ROTULO_OPERACAO,
  TOM_OPERACAO,
} from '../correspondentes/correspondentes.format';

const ROTULO_STATUS_SUB: Record<StatusSub, string> = {
  ATIVO: 'Ativo',
  PENDENTE: 'Aguardando validação',
  SUSPENSO: 'Suspenso',
};
const TOM_STATUS_SUB: Record<StatusSub, string> = {
  ATIVO: 'green',
  PENDENTE: 'amber',
  SUSPENSO: 'red',
};

// Minha rede (CORRESPONDENTE). O majoritario credencia sub-correspondentes, define o repasse de cada um
// por produto (sempre abaixo do teto que o SEP fixou) e acompanha a carteira e a comissao da rede inteira.
// O sub abre a mesma rota e ve so a propria posicao: quem e o majoritario e quanto recebe por produto.
@Component({
  selector: 'sep-minha-rede-page',
  imports: [OperationalShellComponent, RouterLink, LucideAngularModule, FormsModule],
  templateUrl: './minha-rede-page.component.html',
  styleUrl: '../correspondentes/correspondentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinhaRedePageComponent implements OnInit {
  private readonly service = inject(CorrespondentesRedeService);

  protected readonly posicao = signal<MinhaPosicaoNaRedeResponse | null>(null);
  protected readonly rede = signal<RedeDoMajoritarioResponse | null>(null);
  protected readonly carteira = signal<OperacaoDaRedeResponse[]>([]);
  protected readonly comissoes = signal<ComissaoDaRedeResponse | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly criando = signal(false);
  protected readonly editando = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly filtroOrigem = signal<string>('TODAS');

  protected readonly moeda = formatarMoeda;
  protected readonly pct = formatarPercentual;
  protected readonly rotuloStatus = ROTULO_STATUS_SUB;
  protected readonly tomStatus = TOM_STATUS_SUB;
  protected readonly rotuloOperacao = ROTULO_OPERACAO;
  protected readonly tomOperacao = TOM_OPERACAO;

  protected novo = { nome: '', cpf: '', email: '', telefone: '' };
  protected percentuaisNovo: Record<string, number> = {};
  protected percentuaisEdicao: Record<string, number> = {};
  protected justificativa = '';

  protected readonly ehMajoritario = computed(() => this.posicao()?.nivel === 'MAJORITARIO');

  protected readonly carteiraVisivel = computed(() => {
    const f = this.filtroOrigem();
    return this.carteira().filter(
      (o) => f === 'TODAS' || (f === 'PROPRIA' ? o.origem === 'PROPRIA' : o.subId === f),
    );
  });

  ngOnInit(): void {
    this.service.consultarMinhaPosicao().subscribe({
      next: (p) => {
        this.posicao.set(p);
        if (p.nivel === 'MAJORITARIO') this.carregarRede();
        else this.carregando.set(false);
      },
      error: () => this.falhar('Não foi possível carregar a sua posição na rede.'),
    });
  }

  private carregarRede(): void {
    this.service.consultarRede().subscribe({
      next: (r) => {
        this.rede.set(r);
        this.percentuaisNovo = Object.fromEntries(r.tetos.map((t) => [t.produto, 0]));
        this.carregando.set(false);
      },
      error: () => this.falhar('Não foi possível carregar a rede.'),
    });
    this.service.consultarCarteira().subscribe({ next: (c) => this.carteira.set(c) });
    this.service.consultarComissoes().subscribe({ next: (c) => this.comissoes.set(c) });
  }

  private falhar(mensagem: string): void {
    this.erro.set(mensagem);
    this.carregando.set(false);
  }

  private mensagemDe(e: unknown, padrao: string): string {
    return (e instanceof HttpErrorResponse && e.error?.message) || padrao;
  }

  protected abrirCriacao(): void {
    this.criando.set(true);
    this.aviso.set(null);
    this.erro.set(null);
  }

  protected cancelarCriacao(): void {
    this.criando.set(false);
    this.novo = { nome: '', cpf: '', email: '', telefone: '' };
    this.percentuaisNovo = Object.fromEntries(
      (this.rede()?.tetos ?? []).map((t) => [t.produto, 0]),
    );
  }

  /** Recusa de cara o que passa do teto do SEP; o backend decide de novo, e a palavra final e dele. */
  protected acimaDoTeto(produto: string, valor: number): boolean {
    const teto = this.rede()?.tetos.find((t) => t.produto === produto)?.tetoSub ?? 0;
    return valor > teto || valor < 0;
  }

  protected novoValido(): boolean {
    const n = this.novo;
    return (
      !!n.nome.trim() &&
      !!n.cpf.trim() &&
      !!n.email.trim() &&
      !!n.telefone.trim() &&
      (this.rede()?.tetos ?? []).every(
        (t) => !this.acimaDoTeto(t.produto, this.percentuaisNovo[t.produto] ?? 0),
      )
    );
  }

  protected criar(): void {
    if (!this.novoValido() || this.salvando()) return;
    this.salvando.set(true);
    this.service
      .criarSub({
        ...this.novo,
        percentuais: Object.entries(this.percentuaisNovo).map(([produto, percentualSub]) => ({
          produto,
          percentualSub,
        })),
      })
      .subscribe({
        next: (sub) => {
          this.salvando.set(false);
          this.cancelarCriacao();
          this.criando.set(false);
          this.aviso.set(`${sub.nome} foi credenciado e aguarda a validação do cadastro pelo SEP.`);
          this.carregarRede();
        },
        error: (e) => {
          this.salvando.set(false);
          this.erro.set(this.mensagemDe(e, 'Não foi possível credenciar o sub-correspondente.'));
        },
      });
  }

  protected editar(sub: SubCorrespondenteResponse): void {
    this.editando.set(sub.id);
    this.justificativa = '';
    this.percentuaisEdicao = Object.fromEntries(
      sub.percentuais.map((p) => [p.produto, p.percentualSub]),
    );
    this.aviso.set(null);
    this.erro.set(null);
  }

  protected edicaoValida(sub: SubCorrespondenteResponse): boolean {
    return (
      !!this.justificativa.trim() &&
      sub.percentuais.every(
        (p) =>
          !(this.percentuaisEdicao[p.produto] > p.tetoSub || this.percentuaisEdicao[p.produto] < 0),
      )
    );
  }

  protected salvarPercentuais(sub: SubCorrespondenteResponse): void {
    if (!this.edicaoValida(sub) || this.salvando()) return;
    this.salvando.set(true);
    this.service
      .atualizarPercentuais(sub.id, {
        justificativa: this.justificativa.trim(),
        percentuais: Object.entries(this.percentuaisEdicao).map(([produto, percentualSub]) => ({
          produto,
          percentualSub,
        })),
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.editando.set(null);
          this.aviso.set(`Percentuais de ${sub.nome} atualizados e registrados na auditoria.`);
          this.carregarRede();
        },
        error: (e) => {
          this.salvando.set(false);
          this.erro.set(this.mensagemDe(e, 'Não foi possível salvar os percentuais.'));
        },
      });
  }

  protected alternarSuspensao(sub: SubCorrespondenteResponse): void {
    const chamada =
      sub.status === 'SUSPENSO' ? this.service.reativar(sub.id) : this.service.suspender(sub.id);
    chamada.subscribe({
      next: () => {
        this.aviso.set(
          sub.status === 'SUSPENSO' ? `${sub.nome} reativado.` : `${sub.nome} suspenso.`,
        );
        this.carregarRede();
      },
      error: (e) => this.erro.set(this.mensagemDe(e, 'Não foi possível alterar a situação.')),
    });
  }
}

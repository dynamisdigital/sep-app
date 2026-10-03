/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  NgZone,
  OnDestroy,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, filter } from 'rxjs';

import { UsuarioResponse, UsuarioRole } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { ehAmbienteDemo } from '../../core/env/ambiente';
import { NotificacoesService } from '../../core/notificacoes/notificacoes.service';
import { PROJECT_INFO, RESPONSAVEIS_TECNICOS } from '../../core/project-info';
import { ThemeService } from '../../core/theme/theme.service';
import { TourService } from '../../core/tour/tour.service';
import { SepArteComponent } from '../../shared/arte/sep-arte.component';
import { SepLogoComponent } from '../../shared/arte/sep-logo.component';

// A arvore do menu e recursiva: um no pode ter filhos e netos. O menu desce ate a ultima rota
// navegavel de cada modulo — o que ficasse de fora so seria alcancavel por link interno.
interface OperationalNavNode {
  label: string;
  route: string;
  /** PNG do pacote 03 quando existe; senao o nome do icone lucide. */
  icon?: string;
  lucide?: string;
  /** Cor do glow no hover, herdada do proprio icone. */
  tom?: string;
  badge?: string;
  roles?: UsuarioRole[];
  /** Rota que tambem e prefixo de irmas: so fica ativa na correspondencia exata. */
  exact?: boolean;
  children?: OperationalNavNode[];
}

interface OperationalNavItem extends OperationalNavNode {
  section: 'jornadas' | 'operacao' | 'conta' | 'primary';
}

// Contas do dev-offline (senha unica 123456), para trocar de papel sem sair da tela. Existe apenas
// enquanto o ambiente e de desenvolvimento; em producao a troca e um novo login.
interface ContaDemo {
  username: string;
  rotulo: string;
  papel: string;
}

const CHAVE_MENU_COLAPSADO = 'SEP_MENU_COLAPSADO';
const CHAVE_LARGURA_CONTEUDO = 'SEP_LARGURA_CONTEUDO';
/** Largura de CSS de uma meia tela num monitor de 2559px com zoom de 75%; espelha o shell SCSS. */
const JANELA_MEIA_TELA_PX = 1716;

/**
 * Largura do conteudo em janela maximizada (acima de 1440px). `ajustada` mantem os widgets no tamanho
 * que tem em meia tela; `expandida` deixa a area de conteudo ocupar toda a janela.
 */
export type LarguraConteudo = 'ajustada' | 'expandida';

/** Um verbete de ajuda: o que a tela faz e o que dá para fazer nela. */
interface AjudaContexto {
  rota: string;
  titulo: string;
  descricao: string;
  dicas: string[];
}

const AJUDA_PADRAO: AjudaContexto = {
  rota: '',
  titulo: 'Plataforma SEP',
  descricao:
    'Ambiente operacional do SEP. O menu à esquerda mostra apenas os módulos que o seu papel alcança.',
  dicas: [
    'O hambúrguer recolhe o menu para uma barra de ícones.',
    'O cartão do usuário, no rodapé do menu, leva ao seu perfil.',
    'Operações sensíveis pedem confirmação adicional de identidade.',
  ],
};

// A ordem importa: a primeira rota que casar por prefixo vence, então as mais específicas vêm
// antes das genéricas.
const AJUDA_POR_ROTA: AjudaContexto[] = [
  {
    rota: '/app/admin/parametros',
    titulo: 'Parâmetros operacionais',
    descricao:
      'Catálogo de parâmetros do sistema. Alterar um valor cria uma nova versão na trilha auditável.',
    dicas: [
      'A alteração exige justificativa e confirmação adicional por TOTP.',
      'O histórico guarda valor anterior, valor novo, autor e motivo.',
      'O teto de crédito do regimento é um parâmetro, e não uma constante do código.',
    ],
  },
  {
    rota: '/app/admin/users',
    titulo: 'Administração de usuários',
    descricao: 'Contas da plataforma, com papel, situação e trilha de alterações.',
    dicas: [
      'Papéis são cumulativos e a alteração passa por confirmação adicional.',
      'Você não consegue remover o próprio acesso de administrador.',
    ],
  },
  {
    rota: '/app/admin',
    titulo: 'Administração',
    descricao: 'Módulos de governança: usuários, papéis e parâmetros operacionais.',
    dicas: ['Tudo aqui é restrito ao papel ADMIN.'],
  },
  {
    rota: '/app/backoffice/reprocessos',
    titulo: 'Reprocessos',
    descricao: 'Reenvio manual de chamadas ao provider e de webhooks que falharam.',
    dicas: [
      'Só Transferência Pix tem reconsulta real de status; os demais tipos podem não retornar.',
      'Cada reprocesso fica registrado com autor, horário e resultado.',
    ],
  },
  {
    rota: '/app/backoffice/fila',
    titulo: 'Fila operacional',
    descricao: 'Pendências abertas da operação, por tipo, prioridade e situação.',
    dicas: [
      'Assumir um item o tira da fila de ninguém e passa a responder por ele.',
      'Comentários internos ficam na trilha e não são vistos pelo cliente.',
    ],
  },
  {
    rota: '/app/backoffice',
    titulo: 'Backoffice',
    descricao: 'Painel da operação: fila, reprocessos e indicadores do dia.',
    dicas: ['Os números do painel são recortes das mesmas listas das telas de detalhe.'],
  },
  {
    rota: '/app/cobranca',
    titulo: 'Cobrança',
    descricao: 'Agenda de parcelas, recebimentos, inadimplência e renegociação.',
    dicas: [
      'O recebimento manual é operação sensível e fica registrado com quem lançou.',
      'A régua de inadimplência é somada das parcelas, e não de um contador à parte.',
    ],
  },
  {
    rota: '/app/pix',
    titulo: 'Pix',
    descricao: 'Desembolsos, recebimentos, referências e divergências de conciliação.',
    dicas: [
      'Todo desembolso tem identificador próprio e comprovante.',
      'Divergência é diferença entre o valor recebido e a referência gerada.',
    ],
  },
  {
    rota: '/app/credito',
    titulo: 'Crédito',
    descricao: 'Propostas na esteira, com parecer, score e decisão.',
    dicas: [
      'Pré-aprovada não é aprovada: ainda depende de conferência.',
      'O teto por proposta é o do regimento e vale para todas as operações.',
    ],
  },
  {
    rota: '/app/formalizacao',
    titulo: 'Formalização',
    descricao: 'Aceite das condições, assinatura digital e versões do contrato.',
    dicas: ['Cada versão do documento tem hash SHA-256 para conferência posterior.'],
  },
  {
    rota: '/app/onboarding',
    titulo: 'Onboarding',
    descricao: 'Verificação de pessoas (KYC) e empresas (KYB), com documentos e PLD.',
    dicas: ['Documentos de terceiros aparecem mascarados nas telas, por LGPD.'],
  },
  {
    rota: '/app/credora',
    titulo: 'Jornada da credora',
    descricao: 'Perfil, oportunidades disponíveis e carteira financiada.',
    dicas: ['A carteira mostra apenas as operações em que você aportou.'],
  },
  {
    rota: '/app/profile',
    titulo: 'Meu perfil',
    descricao: 'Dados da sua conta, troca de senha e segunda etapa de autenticação.',
    dicas: [
      'Habilitar TOTP é o que libera as operações que pedem confirmação adicional.',
      'A senha exige 12+ caracteres, com maiúscula, minúscula, número e símbolo.',
    ],
  },
  {
    rota: '/app/dashboard',
    titulo: 'Dashboard',
    descricao: 'Ponto de partida, com os atalhos dos módulos que o seu papel alcança.',
    dicas: ['O que não aparece aqui é porque o seu papel não tem acesso.'],
  },
];

/** Minusculas e sem acento: "credito" acha "Crédito". */
function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

interface OperationalFooterItem {
  label: string;
  detail: string;
  /** Nome do icone lucide. */
  icon: string;
  /** Classe de tom, para o selo manter a cor que o PNG trazia gravada. */
  tom: string;
}

@Component({
  selector: 'sep-operational-shell',
  imports: [SepLogoComponent, SepArteComponent, RouterLink, LucideAngularModule],
  templateUrl: './operational-shell.component.html',
  // Sem folha propria: a moldura operacional vive em `styles/_shell-operacional.scss`, carregada
  // globalmente porque tambem serve a pagina do Mockup 03, que replica esta marcacao.
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class OperationalShellComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  protected readonly notificacoes = inject(NotificacoesService);
  protected readonly tour = inject(TourService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly sessionStartedAt = new Date();
  private readonly currentDateTime = signal(new Date());
  // O relógio não deve manter a zona Angular instável indefinidamente em testes ou navegação.
  private readonly clockInterval = this.ngZone.runOutsideAngular(() =>
    window.setInterval(() => this.currentDateTime.set(new Date()), 1000),
  );

  // O shell operacional foi homologado visualmente no mockup 03. As telas
  // seguintes reutilizam estes mesmos assets e medidas; apenas o conteúdo
  // projetado por ng-content pode usar o pacote específico de cada mockup.
  protected readonly assetBase = '/image/sep_mockup_03_assets';

  // O logotipo tem a palavra em branco, desenhada para a barra escura do mockup: no tema claro ela
  // desaparece contra a superficie. A variante `_claro` e o mesmo arquivo com os pixels acromaticos
  // recoloridos para a tinta do tema (o simbolo, que e saturado, fica intacto). Nao ha SVG da marca.
  protected readonly projeto = PROJECT_INFO;
  protected readonly responsaveis = RESPONSAVEIS_TECNICOS;
  protected readonly currentUser = computed<UsuarioResponse>(() => {
    const user = this.auth.currentUser();
    if (user) return user;
    return {
      id: 'mockup-operational-user',
      username: 'backoffice@empresa.com',
      role: 'BACKOFFICE',
      dataCriacao: '2026-04-24T18:30:00-03:00',
      dataModificacao: '2026-04-24T18:30:00-03:00',
      criadoPor: 'system',
      modificadoPor: 'system',
      precisaRedefinirSenha: false,
      mfaHabilitado: true,
    };
  });
  protected readonly systemTime = computed(() =>
    this.currentDateTime().toLocaleTimeString('pt-BR', { hour12: false }),
  );
  protected readonly systemDate = computed(() =>
    this.currentDateTime().toLocaleDateString('pt-BR'),
  );
  protected readonly lastAccess = `${this.sessionStartedAt.toLocaleDateString(
    'pt-BR',
  )} ${this.sessionStartedAt.toLocaleTimeString('pt-BR', { hour12: false })}`;

  // Menu completo da plataforma: mesma fonte de verdade do menu anterior, agora com papeis,
  // submenus e os itens que faltavam (Credora e Administracao). Cada item so aparece para quem
  // tem o papel; os submenus apontam para rotas que existem de fato.
  private readonly navigation: OperationalNavItem[] = [
    {
      label: 'Dashboard',
      route: '/app/dashboard',
      lucide: 'layout-dashboard',
      tom: 'var(--sep-tint-sky)',
      section: 'primary',
      exact: true,
    },
    {
      label: 'Onboarding',
      route: '/app/onboarding',
      lucide: 'user-plus',
      tom: 'var(--sep-tint-cyan)',
      section: 'jornadas',
      badge: '2',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
      children: [
        {
          label: 'Pessoa física',
          route: '/app/onboarding/pessoa',
          lucide: 'user-check',
          tom: 'var(--sep-tint-cyan)',
        },
        {
          label: 'Empresa',
          route: '/app/onboarding/empresa',
          lucide: 'building-2',
          tom: 'var(--sep-tint-cyan)',
        },
      ],
    },
    {
      label: 'Crédito',
      route: '/app/credito',
      lucide: 'credit-card',
      tom: 'var(--sep-tint-violet)',
      section: 'jornadas',
      badge: '3',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
      children: [
        {
          label: 'Propostas',
          route: '/app/credito/propostas',
          lucide: 'list',
          tom: 'var(--sep-tint-violet)',
          exact: true,
        },
        {
          label: 'Nova proposta',
          route: '/app/credito/propostas/nova',
          lucide: 'plus',
          tom: 'var(--sep-tint-violet)',
        },
      ],
    },
    {
      label: 'Formalização',
      route: '/app/formalizacao',
      lucide: 'file-check',
      tom: 'var(--sep-tint-pink)',
      section: 'jornadas',
      badge: '1',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
    },
    {
      label: 'Cobrança',
      route: '/app/cobranca',
      lucide: 'banknote',
      tom: 'var(--sep-tint-amber)',
      section: 'jornadas',
      badge: '4',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
      children: [
        {
          label: 'Agenda financeira',
          route: '/app/cobranca/financeiro/agenda',
          lucide: 'calendar-days',
          tom: 'var(--sep-tint-amber)',
          roles: ['FINANCEIRO', 'ADMIN'],
        },
        {
          label: 'Inadimplência',
          route: '/app/cobranca/financeiro/inadimplencia',
          lucide: 'triangle-alert',
          tom: 'var(--sep-tint-amber)',
          roles: ['FINANCEIRO', 'ADMIN'],
        },
      ],
    },
    {
      label: 'Credora',
      route: '/app/credora',
      lucide: 'briefcase',
      tom: 'var(--sep-tint-emerald)',
      section: 'jornadas',
      roles: ['CLIENTE'],
      children: [
        {
          label: 'Cadastro',
          route: '/app/credora/cadastro',
          lucide: 'file-plus',
          tom: 'var(--sep-tint-emerald)',
        },
        {
          label: 'Perfil',
          route: '/app/credora/perfil',
          lucide: 'building-2',
          tom: 'var(--sep-tint-emerald)',
        },
        {
          label: 'Oportunidades',
          route: '/app/credora/oportunidades',
          lucide: 'chart-column',
          tom: 'var(--sep-tint-emerald)',
          exact: true,
        },
        {
          label: 'Carteira',
          route: '/app/credora/carteira',
          lucide: 'wallet',
          tom: 'var(--sep-tint-emerald)',
          exact: true,
        },
      ],
    },
    {
      label: 'Backoffice',
      route: '/app/backoffice',
      lucide: 'briefcase',
      tom: 'var(--sep-tint-sky)',
      section: 'operacao',
      roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
      children: [
        {
          label: 'Dashboard',
          route: '/app/backoffice/dashboard',
          lucide: 'layout-dashboard',
          tom: 'var(--sep-tint-sky)',
        },
        {
          label: 'Fila operacional',
          route: '/app/backoffice/fila',
          lucide: 'inbox',
          tom: 'var(--sep-tint-sky)',
          exact: true,
        },
        {
          label: 'Reprocessos',
          route: '/app/backoffice/reprocessos',
          lucide: 'refresh-cw',
          tom: 'var(--sep-tint-sky)',
          exact: true,
          children: [
            {
              label: 'Provider',
              route: '/app/backoffice/reprocessos/provider',
              lucide: 'plug-zap',
              tom: 'var(--sep-tint-sky)',
            },
            {
              label: 'Webhook',
              route: '/app/backoffice/reprocessos/webhook',
              lucide: 'webhook',
              tom: 'var(--sep-tint-sky)',
            },
          ],
        },
      ],
    },
    {
      label: 'Pix',
      route: '/app/pix',
      icon: 'icons/icon_sidebar_pix.png',
      tom: 'var(--sep-tint-teal)',
      section: 'operacao',
      badge: '1',
      roles: ['FINANCEIRO', 'ADMIN', 'BACKOFFICE'],
      children: [
        {
          label: 'Desembolsos',
          route: '/app/pix/desembolsos',
          lucide: 'send',
          tom: 'var(--sep-tint-teal)',
          exact: true,
        },
        {
          label: 'Recebimentos',
          route: '/app/pix/recebimentos',
          lucide: 'banknote',
          tom: 'var(--sep-tint-teal)',
          exact: true,
        },
        {
          label: 'Divergências',
          route: '/app/pix/divergencias',
          lucide: 'circle-alert',
          tom: 'var(--sep-tint-teal)',
        },
      ],
    },
    {
      label: 'Meu perfil',
      route: '/app/profile',
      lucide: 'user-round',
      tom: 'var(--sep-tint-slate)',
      section: 'conta',
      exact: true,
      children: [
        {
          label: 'Alterar senha',
          route: '/app/profile/change-password',
          lucide: 'key-round',
          tom: 'var(--sep-tint-slate)',
        },
        {
          label: 'Configurar TOTP',
          route: '/app/profile/setup-totp',
          lucide: 'shield-check',
          tom: 'var(--sep-tint-slate)',
        },
      ],
    },
    {
      label: 'Administração',
      route: '/app/admin',
      lucide: 'shield-check',
      tom: 'var(--sep-tint-red)',
      section: 'conta',
      roles: ['ADMIN'],
      exact: true,
      children: [
        {
          label: 'Usuários',
          route: '/app/admin/users',
          lucide: 'users',
          tom: 'var(--sep-tint-red)',
          exact: true,
        },
        {
          label: 'Parâmetros',
          route: '/app/admin/parametros',
          lucide: 'settings',
          tom: 'var(--sep-tint-red)',
          exact: true,
        },
      ],
    },
  ];

  // A troca de usuario so aparece no ambiente de demonstracao. Antes ela era oferecida em qualquer
  // build: um usuario autenticado de producao via e-mails reais de contas privilegiadas e o atalho
  // tentava login com a senha fixa do mock contra o backend verdadeiro. (SEC-01)
  protected readonly trocaDeUsuarioDisponivel = ehAmbienteDemo();

  protected readonly contasDemo: ContaDemo[] = [
    { username: 'admin@empresa.com', rotulo: 'Administração', papel: 'ADMIN' },
    { username: 'financeiro@empresa.com', rotulo: 'Financeiro', papel: 'FINANCEIRO' },
    { username: 'backoffice@empresa.com', rotulo: 'Backoffice', papel: 'BACKOFFICE' },
    { username: 'credora@empresa.com', rotulo: 'Credora ativa', papel: 'CLIENTE' },
    { username: 'credora-novo@empresa.com', rotulo: 'Credora sem cadastro', papel: 'CLIENTE' },
    { username: 'credora-inelegivel@empresa.com', rotulo: 'Credora inelegível', papel: 'CLIENTE' },
    { username: 'cliente@empresa.com', rotulo: 'Cliente', papel: 'CLIENTE' },
    { username: 'multirole@empresa.com', rotulo: 'Financeiro + Backoffice', papel: 'FINANCEIRO' },
    { username: 'dev@sep.local', rotulo: 'Desenvolvimento', papel: 'ADMIN' },
  ];

  protected readonly footerItems: OperationalFooterItem[] = [
    {
      label: 'Ambiente regulado',
      detail: 'Resolução CMN 4.656/2018',
      icon: 'landmark',
      tom: 'ic-ciano',
    },
    {
      label: 'Segregação patrimonial',
      detail: 'Conta escrow ativa',
      icon: 'split',
      tom: 'ic-verde',
    },
    {
      label: 'Segurança',
      detail: 'Dados criptografados',
      icon: 'shield-check',
      tom: 'ic-verde',
    },
    {
      label: 'Rastreabilidade',
      detail: 'Auditoria completa',
      icon: 'history',
      tom: 'ic-verde',
    },
  ];

  // ============ MENU ============

  protected readonly colapsado = signal(
    window.localStorage.getItem(CHAVE_MENU_COLAPSADO) === 'true',
  );
  protected readonly urlAtual = signal(this.router.url);
  private readonly abertosManualmente = signal<Record<string, boolean>>({});
  private readonly inscricaoRota: Subscription = this.router.events
    .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
    .subscribe((e) => {
      this.urlAtual.set(e.urlAfterRedirects);
      this.contaAberta.set(false);
      this.alertasAberto.set(false);
      this.ajudaAberta.set(false);
      this.pesquisaAberta.set(false);
    });

  private visivelPara(roles: UsuarioRole[] | undefined): boolean {
    if (!roles) return true;
    return roles.includes(this.currentUser().role);
  }

  /**
   * Poda a arvore no papel corrente, em qualquer profundidade. Um no some quando o papel nao
   * o alcanca; os filhos que sobram sobem intactos, entao o menu nunca oferece uma rota que o
   * roleGuard recusaria em seguida.
   */
  private podar(nos: OperationalNavNode[]): OperationalNavNode[] {
    return nos
      .filter((no) => this.visivelPara(no.roles))
      .map((no) => (no.children ? { ...no, children: this.podar(no.children) } : no));
  }

  /** Itens da secao que o papel atual enxerga, com a arvore inteira ja filtrada. */
  protected itemsBySection(section: OperationalNavItem['section']): OperationalNavItem[] {
    return this.podar(
      this.navigation.filter((item) => item.section === section),
    ) as OperationalNavItem[];
  }

  protected readonly temItens = computed(() => ({
    jornadas: this.itemsBySection('jornadas').length > 0,
    operacao: this.itemsBySection('operacao').length > 0,
    conta: this.itemsBySection('conta').length > 0,
  }));

  /** Um item esta na rota corrente quando a URL comeca pela rota dele. */
  protected naRota(rota: string): boolean {
    const url = this.urlAtual().split('?')[0];
    return url === rota || url.startsWith(`${rota}/`);
  }

  /** O proprio no esta selecionado (respeitando `exact` de rotas que sao prefixo de irmas). */
  protected ativo(no: OperationalNavNode): boolean {
    const url = this.urlAtual().split('?')[0];
    return no.exact ? url === no.route : this.naRota(no.route);
  }

  /**
   * O ramo esta selecionado quando o proprio no ou qualquer descendente esta. E o que faz o pai
   * continuar destacado enquanto se navega em um neto.
   */
  protected ramoAtivo(no: OperationalNavNode): boolean {
    if (this.ativo(no)) return true;
    return (no.children ?? []).some((filho) => this.ramoAtivo(filho));
  }

  /**
   * A tela em que se esta e uma so: o destaque forte fica no no mais profundo que casa com a
   * URL. Sem isso `Backoffice` e `Reprocessar provider` apareciam igualmente selecionados e o
   * menu deixava de responder "onde eu estou".
   */
  protected selecionado(no: OperationalNavNode): boolean {
    if (!this.ativo(no)) return false;
    return !(no.children ?? []).some((filho) => this.ramoAtivo(filho));
  }

  /** O submenu abre sozinho no ramo corrente e responde ao clique nos demais. */
  protected expandido(no: OperationalNavNode): boolean {
    if (this.colapsado()) return false;
    const manual = this.abertosManualmente()[no.route];
    return manual ?? this.ramoAtivo(no);
  }

  protected alternarSubmenu(no: OperationalNavNode, evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.abertosManualmente.update((atual) => ({
      ...atual,
      [no.route]: !this.expandido(no),
    }));
  }

  protected alternarMenu(): void {
    const proximo = !this.colapsado();
    this.colapsado.set(proximo);
    window.localStorage.setItem(CHAVE_MENU_COLAPSADO, String(proximo));
  }

  // ============ ALERTAS E AJUDA ============

  protected readonly alertasAberto = signal(false);
  protected readonly ajudaAberta = signal(false);

  protected alternarAlertas(): void {
    const proximo = !this.alertasAberto();
    this.alertasAberto.set(proximo);
    this.ajudaAberta.set(false);
    this.contaAberta.set(false);
    this.pesquisaAberta.set(false);
    if (proximo) {
      // Só busca quando o painel abre pela primeira vez: o shell está em todas as telas, e uma
      // requisição por navegação seria desperdício.
      this.notificacoes.carregar();
    }
  }

  protected fecharAlertas(): void {
    this.alertasAberto.set(false);
  }

  protected alternarAjuda(): void {
    this.ajudaAberta.update((aberta) => !aberta);
    this.alertasAberto.set(false);
    this.contaAberta.set(false);
    this.pesquisaAberta.set(false);
  }

  protected fecharAjuda(): void {
    this.ajudaAberta.set(false);
  }

  /** Fecha o painel e entrega a tela ao roteiro: o tour assistido opera como um usuario. */
  protected iniciarRoteiro(id: string): void {
    this.fecharAjuda();
    this.tour.iniciar(id);
  }

  /**
   * Ajuda contextual: o primeiro bloco do painel fala da tela em que o operador está. Uma ajuda
   * que só lista links genéricos não responde a pergunta que levou o operador a clicar.
   */
  protected readonly ajudaDaTela = computed(() => {
    const url = this.urlAtual().split('?')[0];
    const achado = AJUDA_POR_ROTA.find((item) => url.startsWith(item.rota));
    return achado ?? AJUDA_PADRAO;
  });

  // ============ PESQUISA ============
  // A lupa era decorativa. Ela procura entre as telas que o menu ja oferece ao papel corrente:
  // nao existe endpoint de busca global, e prometer busca de registros seria inventar resultado.

  protected readonly pesquisaAberta = signal(false);
  protected readonly termoPesquisa = signal('');

  /** Todas as telas do menu podado, com o caminho no menu para desambiguar rotulos iguais. */
  private readonly telasPesquisaveis = computed(() => {
    const telas: {
      label: string;
      caminho: string;
      route: string;
      lucide: string;
      chave: string;
    }[] = [];
    const visitar = (nos: OperationalNavNode[], pais: string[]) => {
      for (const no of nos) {
        const caminho = [...pais, no.label];
        telas.push({
          label: no.label,
          caminho: pais.join(' › '),
          route: no.route,
          lucide: no.lucide ?? 'arrow-right',
          chave: normalizarBusca(`${caminho.join(' ')} ${no.route}`),
        });
        if (no.children) visitar(no.children, caminho);
      }
    };
    visitar(this.podar(this.navigation), []);
    return telas;
  });

  protected readonly resultadosPesquisa = computed(() => {
    const termos = normalizarBusca(this.termoPesquisa()).split(/\s+/).filter(Boolean);
    const telas = this.telasPesquisaveis();
    if (!termos.length) return telas;
    return telas.filter((tela) => termos.every((termo) => tela.chave.includes(termo)));
  });

  protected alternarPesquisa(): void {
    const proximo = !this.pesquisaAberta();
    this.pesquisaAberta.set(proximo);
    this.alertasAberto.set(false);
    this.ajudaAberta.set(false);
    this.contaAberta.set(false);
    if (proximo) {
      this.termoPesquisa.set('');
      setTimeout(() => document.querySelector<HTMLInputElement>('.op-pesquisa-campo')?.focus());
    }
  }

  protected fecharPesquisa(): void {
    this.pesquisaAberta.set(false);
  }

  /** Enter leva ao primeiro resultado, como numa paleta de comandos. */
  protected abrirPrimeiroResultado(): void {
    const primeiro = this.resultadosPesquisa()[0];
    if (!primeiro) return;
    this.fecharPesquisa();
    void this.router.navigateByUrl(primeiro.route);
  }

  // ============ CONTA ============

  protected readonly contaAberta = signal(false);
  protected readonly trocandoConta = signal<string | null>(null);

  protected readonly iniciais = computed(() => {
    const nome = this.currentUser().username;
    return nome.charAt(0).toUpperCase();
  });

  protected readonly larguraConteudo = signal<LarguraConteudo>(lerLarguraConteudo());

  /**
   * Janela acima da largura de uma meia tela (1716px de CSS, a mesma de `_shell-operacional.scss`).
   * So nela o botao de largura aparece: abaixo disso a escolha nao muda nada.
   */
  private readonly consultaMaximizada =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(`(width > ${JANELA_MEIA_TELA_PX}px)`)
      : null;
  protected readonly janelaMaximizada = signal(this.consultaMaximizada?.matches ?? false);
  private readonly aoMudarJanela = (e: MediaQueryListEvent): void =>
    this.janelaMaximizada.set(e.matches);

  protected alternarLargura(): void {
    const proxima: LarguraConteudo =
      this.larguraConteudo() === 'ajustada' ? 'expandida' : 'ajustada';
    this.larguraConteudo.set(proxima);
    try {
      window.localStorage.setItem(CHAVE_LARGURA_CONTEUDO, proxima);
    } catch {
      // Armazenamento bloqueado: a escolha vale so ate recarregar a pagina.
    }
  }

  protected alternarConta(): void {
    this.contaAberta.update((aberto) => !aberto);
  }

  protected fecharConta(): void {
    this.contaAberta.set(false);
  }

  protected fecharTudo(): void {
    this.contaAberta.set(false);
    this.alertasAberto.set(false);
    this.ajudaAberta.set(false);
    this.pesquisaAberta.set(false);
  }

  /**
   * Troca de usuário no dev-offline: encerra a sessão atual e entra com a conta escolhida, para
   * exercitar as telas por papel sem passar pela tela de login a cada vez. Em produção o backend
   * exige o fluxo de login completo, e este atalho não é oferecido.
   */
  protected trocarUsuario(conta: ContaDemo): void {
    if (!this.trocaDeUsuarioDisponivel) return;
    if (conta.username === this.currentUser().username) {
      this.fecharConta();
      return;
    }
    this.trocandoConta.set(conta.username);
    this.auth.login({ username: conta.username, password: '123456' }).subscribe({
      next: () => {
        this.auth.loadCurrentUser().subscribe({
          next: () => {
            this.trocandoConta.set(null);
            this.fecharConta();
            void this.router.navigateByUrl('/app/dashboard');
          },
          error: () => this.trocandoConta.set(null),
        });
      },
      error: () => this.trocandoConta.set(null),
    });
  }

  protected sair(): void {
    this.fecharConta();
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected goBack(): void {
    if (this.router.url.startsWith('/app/formalizacao/contratos/')) {
      void this.router.navigateByUrl('/app/formalizacao');
      return;
    }
    this.location.back();
  }

  constructor() {
    this.consultaMaximizada?.addEventListener('change', this.aoMudarJanela);
  }

  ngOnDestroy(): void {
    this.consultaMaximizada?.removeEventListener('change', this.aoMudarJanela);
    window.clearInterval(this.clockInterval);
    this.inscricaoRota.unsubscribe();
  }
}

/** Preferencia salva da largura do conteudo; sem ela, ajustada. */
function lerLarguraConteudo(): LarguraConteudo {
  try {
    return window.localStorage.getItem(CHAVE_LARGURA_CONTEUDO) === 'expandida'
      ? 'expandida'
      : 'ajustada';
  } catch {
    return 'ajustada';
  }
}

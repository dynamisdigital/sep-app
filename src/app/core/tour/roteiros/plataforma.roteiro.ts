import { PassoRoteiro, Roteiro } from '../tour.model';
import { emSecao } from './passos-comuns';

// Tours assistidos dos recursos da propria moldura do sistema: o menu lateral (e como recolhe-lo), a
// barra superior (pesquisa, alertas, ajuda, tema, largura) e o menu da conta (trocar de usuario e
// sair). Servem a todos os papeis e nao gravam nada. Trocar de usuario e sair mudam a sessao e
// tirariam o operador da tela, entao o roteiro os mostra e explica, mas nao os aciona.

const MODULO = 'Plataforma';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE', 'CLIENTE'];

const MENU_COLAPSADO = '.op-sidebar-colapsada';

function ler(titulo: string, texto: string, alvo: PassoRoteiro['alvo']): PassoRoteiro {
  return { titulo, texto, alvo, acao: { tipo: 'observar' } };
}

/** Abre um painel da barra superior e, depois, o fecha: o roteiro deixa a tela como encontrou. */
function painel(opcoes: {
  botao: string;
  titulo: string;
  abrir: string;
  ler: string;
  fechar: string;
  conteudo: string;
}): PassoRoteiro[] {
  return [
    {
      titulo: opcoes.titulo,
      texto: opcoes.abrir,
      alvo: opcoes.botao,
      acao: { tipo: 'clicar' },
      aguardarAlvo: opcoes.conteudo,
    },
    ler(`${opcoes.titulo}: o painel`, opcoes.ler, opcoes.conteudo),
    {
      titulo: `Fechar: ${opcoes.titulo.toLowerCase()}`,
      texto: opcoes.fechar,
      alvo: opcoes.botao,
      acao: { tipo: 'clicar' },
    },
  ];
}

// ============ ROTEIROS ============

const dashboard: Roteiro = {
  id: 'plataforma-dashboard',
  modulo: MODULO,
  titulo: 'Dashboard',
  icone: 'house',
  descricao:
    'A tela inicial depois do login: os atalhos do seu papel, os totais e o aviso regulatório.',
  duracao: '≈ 1 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'A tela inicial',
      texto:
        'O Dashboard é a primeira tela depois do login. Ele reúne, num só lugar, os acessos que o seu papel alcança.',
    },
    ler(
      'Quem está logado',
      'No alto, a saudação com o nome da conta e o selo do papel. É o papel que decide tudo o que aparece abaixo.',
      '.px48-heading',
    ),
    ler(
      'Jornadas',
      'À esquerda ficam as jornadas liberadas ao seu papel. Clicar em um cartão abre a tela inicial daquele módulo.',
      '.px48-lado-esq',
    ),
    {
      ...ler(
        'Operação',
        'À direita, as áreas de operação, para os papéis que trabalham com elas. Quem não tem acesso a nenhuma não vê este grupo.',
        '.px48-lado-dir',
      ),
      pularSe: () =>
        !Array.from(document.querySelectorAll('.px48-lado-titulo')).some(
          (t) => t.textContent?.trim() === 'Operação',
        ),
    },
    ler('Conta', 'O grupo Conta traz o seu perfil e a troca de senha, que todo papel alcança.', {
      css: '.px48-no',
      texto: 'Meu perfil',
    }),
    ler(
      'Os totais',
      'No centro, a marca e dois totais: quantos acessos estão liberados e quantas jornadas. Os números mudam de um papel para outro.',
      '.px48-nucleo-rodape',
    ),
    ler(
      'O mesmo caminho no menu',
      'Cada atalho do Dashboard também está no menu lateral. O Dashboard é o ponto de partida; o menu é o caminho de volta de qualquer tela.',
      '.op-sidebar',
    ),
    ler(
      'Ambiente regulado',
      'Por fim, o aviso: o ambiente segue a Resolução 4.656 do Conselho Monetário, todas as ações ficam registradas na trilha de auditoria, e o acesso depende do papel da conta.',
      '.px48-aviso',
    ),
  ],
};

const menu: Roteiro = {
  id: 'plataforma-menu',
  modulo: MODULO,
  titulo: 'Menu lateral',
  icone: 'menu',
  descricao: 'Os grupos de telas, os submenus e como recolher e expandir o menu vertical.',
  duracao: '≈ 1,5 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra o menu lateral do sistema e como recolhê-lo. Tudo começa no Dashboard, logo depois do login.',
    },
    ler(
      'O menu lateral',
      'À esquerda fica o menu do sistema. Ele agrupa as telas em Jornadas, Operação e Conta, e mostra só o que o papel da conta alcança.',
      '.op-sidebar',
    ),
    ler(
      'Grupos e submenus',
      'Os grupos com uma seta abrem submenus. O número ao lado indica quantas telas o grupo tem.',
      '.op-nav-link',
    ),
    {
      titulo: 'Recolher o menu',
      texto:
        'O botão de três linhas recolhe o menu, deixando só os ícones e devolvendo espaço para a tela.',
      alvo: '.op-menu-button',
      acao: { tipo: 'clicar' },
      pularSe: () => !!document.querySelector(MENU_COLAPSADO),
    },
    ler(
      'Menu recolhido',
      'Recolhido, o menu mostra só os ícones, e o nome de cada item aparece ao passar o mouse. A escolha fica guardada no navegador.',
      '.op-sidebar',
    ),
    {
      titulo: 'Expandir o menu',
      texto: 'Clicando de novo no mesmo botão, o menu volta a mostrar os nomes das telas.',
      alvo: '.op-menu-button',
      acao: { tipo: 'clicar' },
      pularSe: () => !document.querySelector(MENU_COLAPSADO),
    },
  ],
};

const topo: Roteiro = {
  id: 'plataforma-topo',
  modulo: MODULO,
  titulo: 'Barra superior',
  icone: 'panel-top',
  descricao: 'Ambiente, horário, pesquisa de telas, alertas, ajuda, largura da tela e tema.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto: 'Este roteiro percorre a barra superior do sistema. Nada é alterado durante o tour.',
    },
    ler(
      'Ambiente regulado',
      'O selo lembra que a plataforma opera sob a Resolução CMN 4.656/2018. Clicando nele, abre-se a página Segurança, com as garantias do produto.',
      '.op-regulated',
    ),
    ler(
      'Horário do sistema',
      'O relógio mostra o horário e a data do sistema. É por ele que ficam registradas as ações na trilha de auditoria.',
      '.op-clock',
    ),
    ...painel({
      botao: 'button[aria-label="Pesquisar telas"]',
      titulo: 'Pesquisa de telas',
      abrir: 'A lupa abre a pesquisa. Ela serve para ir direto a uma tela sem navegar pelo menu.',
      ler: 'Basta digitar parte do nome da tela. O Enter abre o primeiro resultado.',
      fechar: 'Clicando de novo na lupa, a pesquisa se fecha.',
      conteudo: '.op-painel-pesquisa',
    }),
    ...painel({
      botao: 'button[aria-haspopup="dialog"][aria-label*="lerta"]',
      titulo: 'Alertas',
      abrir: 'O sino abre os alertas. O número vermelho indica quantos há para o papel da conta.',
      ler: 'Cada alerta aponta a origem do número e leva à tela onde ele pode ser tratado. O botão de atualizar recarrega a lista.',
      fechar: 'Clicando de novo no sino, o painel se fecha.',
      conteudo: '.op-painel[aria-label="Alertas"]',
    }),
    ...painel({
      botao: 'button[aria-label="Ajuda"]',
      titulo: 'Ajuda',
      abrir:
        'O ponto de interrogação abre a ajuda: o que a tela atual faz e a lista dos tours assistidos.',
      ler: 'Aqui estão a explicação da tela em que você está e os tours por módulo, como este. Os módulos começam recolhidos.',
      fechar: 'Clicando de novo no botão, a ajuda se fecha.',
      conteudo: '.op-painel-ajuda',
    }),
    ler(
      'Largura da tela',
      'Em janela maximizada, este botão alterna entre a tela no tamanho de meia tela e a tela ocupando toda a largura. A escolha fica guardada.',
      'button[aria-label*="Expandir a tela"], button[aria-label*="Voltar a tela ao tamanho"]',
    ),
    ler(
      'Tema claro ou escuro',
      'O botão com o sol alterna entre o tema escuro e o claro. O roteiro apenas aponta o botão, sem trocar o tema.',
      'button[aria-label="Alternar tema"]',
    ),
    ler('Voltar', 'A seta redonda, no centro, volta para a tela anterior.', '.op-back-link'),
  ],
};

const conta: Roteiro = {
  id: 'plataforma-conta',
  modulo: MODULO,
  titulo: 'Conta e sessão',
  icone: 'user-round-cog',
  descricao: 'O menu da conta: perfil, troca de usuário e saída do sistema.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra o menu da conta, no canto superior direito. A troca de usuário e a saída são explicadas, mas não são acionadas, porque encerrariam o tour.',
    },
    {
      titulo: 'Abrir o menu da conta',
      texto: 'Clicando no nome do usuário, abre-se o menu da conta.',
      alvo: 'button[aria-label="Menu da conta"]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.op-conta-menu',
      pularSe: () => !!document.querySelector('.op-conta-menu'),
    },
    ler(
      'Quem está logado',
      'O topo do menu mostra o e-mail da conta e o papel da sessão: administração, financeiro, backoffice ou cliente.',
      '.op-conta-menu > header',
    ),
    ler('Meu perfil e senha', 'Aqui ficam os atalhos para o Meu perfil e para a troca de senha.', {
      css: '.op-conta-item',
      texto: 'Alterar senha',
    }),
    ler(
      'Trocar de usuário',
      'No ambiente de demonstração, esta lista deixa trocar de conta sem sair da tela, para ver o sistema com outro papel: administração, financeiro, backoffice, credora e cliente. Fora da demonstração a troca não existe: é um novo login.',
      { css: '.op-conta-secao', texto: 'Trocar de usuário' },
    ),
    ler(
      'Sair da conta',
      'Sair da conta encerra a sessão e volta para o login. O roteiro não aciona este botão.',
      '.op-conta-sair',
    ),
    {
      titulo: 'Fechar o menu da conta',
      texto: 'Clicando de novo no nome do usuário, o menu se fecha.',
      alvo: 'button[aria-label="Menu da conta"]',
      acao: { tipo: 'clicar' },
      pularSe: () => !document.querySelector('.op-conta-menu'),
    },
  ],
};

const completo: Roteiro = {
  id: 'plataforma-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os quatro roteiros em sequência: dashboard, menu lateral, barra superior e conta.',
  duracao: '≈ 7 min',
  papeis: PAPEIS,
  passos: (ctx) => [
    ...emSecao(dashboard, ctx, { primeira: true }),
    ...emSecao(menu, ctx),
    ...emSecao(topo, ctx),
    ...emSecao(conta, ctx),
  ],
};

export const ROTEIROS_PLATAFORMA: Roteiro[] = [completo, dashboard, menu, topo, conta];

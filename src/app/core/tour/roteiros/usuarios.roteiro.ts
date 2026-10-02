import { ContextoRoteiro, PassoRoteiro, Roteiro } from '../tour.model';
import { MENU_ADMINISTRACAO } from './menus';
import { ROTA_STEP_UP, confirmarComTotp, peloMenu } from './passos-comuns';

// Piloto dos tours assistidos: modulo de Usuarios (Administracao). Cada roteiro parte do menu,
// como faria um operador, e usa so o que a tela oferece de verdade. Serve de molde para os
// demais modulos: passos curtos, alvo por seletor estavel, texto que se le em voz alta.

const MODULO = 'Usuários';
const SENHA_DEMO = 'SepDemo#2026x';

const ROTA_DETALHE = /^\/app\/admin\/users\/(?!novo)[^/?]+(\?.*)?$/;

function emailDemo(ctx: ContextoRoteiro): string {
  ctx.dados['email'] ??= `maria.souza.${ctx.carimbo}@empresa.com`;
  return ctx.dados['email'];
}

/** Do ponto em que estiver ate a lista de usuarios, pelo menu lateral. */
function peloMenuAteUsuarios(): PassoRoteiro[] {
  return peloMenu(MENU_ADMINISTRACAO, {
    rota: '/app/admin/users',
    titulo: 'Submenu Usuários',
    texto: 'Dentro da Administração, o submenu Usuários abre a lista de contas da plataforma.',
    aguardarAlvo: '.px38-tabela-card',
  });
}

/** Confirmacao por TOTP de uma alteracao de papeis, e a mensagem que a prova. */
function confirmarPapeis(): PassoRoteiro[] {
  return [
    ...confirmarComTotp({
      motivo:
        'Alterar papéis é operação sensível. O sistema pede uma segunda confirmação de identidade antes de gravar.',
      aoConfirmar: 'Confirmado o código, o sistema volta ao usuário e reenvia a alteração sozinho.',
      destino: ROTA_DETALHE,
    }),
    {
      titulo: 'Papéis gravados',
      texto:
        'A mensagem confirma que os papéis foram atualizados. A alteração fica na trilha auditável.',
      alvo: { css: '.px39-nota-ok', texto: 'Roles atualizadas' },
      acao: { tipo: 'observar' },
    },
  ];
}

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'usuarios-visao-geral',
  modulo: MODULO,
  titulo: 'Visão geral da lista',
  icone: 'list',
  descricao: 'Onde fica, o que os números dizem, como filtrar e o que cada linha oferece.',
  duracao: '≈ 1 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra a administração de usuários. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenuAteUsuarios(),
    {
      titulo: 'Indicadores',
      texto:
        'No topo, os indicadores: usuários ativos, perfis, permissões e quantos têm a segunda etapa de autenticação ativa.',
      alvo: '.px38-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Usuários cadastrados',
      texto: 'A tabela lista as contas, com perfil, datas de criação e alteração, e situação.',
      alvo: '.px38-tabela-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Filtrar por e-mail',
      texto: 'Para achar alguém, basta digitar parte do e-mail. A lista filtra enquanto se digita.',
      alvo: '#filtro-email',
      acao: { tipo: 'digitar', texto: () => 'financeiro' },
      aguardarAlvo: { css: '.px38-usuario-texto strong', texto: 'financeiro@empresa.com' },
    },
    {
      titulo: 'Ver detalhe',
      texto:
        'Cada linha tem o atalho Ver detalhe, que abre os dados, os papéis e o histórico da conta.',
      alvo: 'a[aria-label="Ver detalhe de financeiro@empresa.com"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Limpar o filtro',
      texto: 'Apagando o filtro, a lista volta completa.',
      alvo: '#filtro-email',
      acao: { tipo: 'digitar', texto: () => '' },
    },
    {
      titulo: 'Novo usuário',
      texto: 'Este botão abre o cadastro de uma nova conta. Ele tem um roteiro próprio.',
      alvo: 'a.px38-btn-primary[href="/app/admin/users/novo"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Boas práticas',
      texto: 'Por fim, o lembrete de revisar periodicamente perfis e permissões.',
      alvo: '.px38-aviso',
      acao: { tipo: 'observar' },
    },
  ],
};

const incluir: Roteiro = {
  id: 'usuarios-incluir',
  modulo: MODULO,
  titulo: 'Incluir novo usuário',
  icone: 'user-plus',
  descricao: 'Cadastro completo: e-mail, senha, papéis e a confirmação por TOTP.',
  duracao: '≈ 2 min',
  papeis: ['ADMIN'],
  passos: (ctx) => {
    const comPapel = ctx.mfa;
    return [
      {
        titulo: 'Incluir usuário',
        texto: comPapel
          ? 'Vamos cadastrar uma nova operadora de backoffice, do menu até a confirmação dos papéis.'
          : 'Vamos cadastrar uma nova conta. Como a sua conta não tem TOTP ativo, o roteiro cria só com o papel CLIENTE.',
      },
      ...peloMenuAteUsuarios(),
      {
        titulo: 'Botão Novo usuário',
        texto: 'Na lista, o botão Novo usuário abre o cadastro.',
        alvo: 'a.px38-btn-primary[href="/app/admin/users/novo"]',
        acao: { tipo: 'clicar' },
        aguardarRota: /^\/app\/admin\/users\/novo$/,
        aguardarAlvo: '#novo-email',
      },
      {
        titulo: 'E-mail',
        texto: 'O e-mail é o login da pessoa. Ele não pode ser alterado depois.',
        alvo: '#novo-email',
        acao: { tipo: 'digitar', texto: emailDemo },
      },
      {
        titulo: 'Senha inicial',
        texto: 'A senha inicial segue a mesma política da troca de senha.',
        alvo: '#nova-senha',
        acao: { tipo: 'digitar', texto: () => SENHA_DEMO },
      },
      {
        titulo: 'Critérios da senha',
        texto:
          'Os quatro critérios ficam verdes conforme são atendidos: tamanho, maiúsculas e minúsculas, número e símbolo.',
        alvo: '.px62-criterios',
        acao: { tipo: 'observar' },
      },
      {
        titulo: 'Confirmar senha',
        texto: 'A senha é repetida, para evitar erro de digitação.',
        alvo: '#nova-senha-confirmacao',
        acao: { tipo: 'digitar', texto: () => SENHA_DEMO },
      },
      ...(comPapel
        ? [
            {
              titulo: 'Papel BACKOFFICE',
              texto:
                'Nos papéis, marcamos BACKOFFICE. Papéis são cumulativos: ela continua com CLIENTE.',
              alvo: { css: '.px62-chip', texto: 'BACKOFFICE' },
              acao: { tipo: 'clicar' },
            } satisfies PassoRoteiro,
          ]
        : []),
      {
        titulo: 'Alcance dos papéis',
        texto: 'Cada papel mostra o que habilita. Os não atribuídos ficam apagados.',
        alvo: '.px62-alcance',
        acao: { tipo: 'observar' },
      },
      {
        titulo: 'Como a conta é criada',
        texto: comPapel
          ? 'A conta nasce como CLIENTE. O papel extra é aplicado em seguida, com confirmação por TOTP.'
          : 'Só com CLIENTE, a conta é criada de uma vez, sem confirmação adicional.',
        alvo: '.px62-passos',
        acao: { tipo: 'observar' },
      },
      {
        titulo: 'Criar usuário',
        texto: 'Tudo preenchido. Clicamos em Criar usuário.',
        alvo: { css: '.px62-btn-primary', texto: 'Criar usuário' },
        acao: { tipo: 'clicar', efeito: true },
        aguardarRota: comPapel ? ROTA_STEP_UP : ROTA_DETALHE,
      },
      ...(comPapel
        ? confirmarPapeis()
        : [
            {
              titulo: 'Usuário criado',
              texto: 'O aviso confirma a criação. A conta já pode entrar com a senha definida.',
              alvo: '.px39-nota-criado',
              acao: { tipo: 'observar' },
            } satisfies PassoRoteiro,
          ]),
      {
        titulo: 'Dados da conta',
        texto: (c) =>
          `Pronto: ${emailDemo(c)} aparece com os dados, o perfil e a situação. Ela já consegue entrar no sistema.`,
        alvo: '.px39-dados',
        acao: { tipo: 'observar' },
      },
    ];
  },
};

const editar: Roteiro = {
  id: 'usuarios-editar',
  modulo: MODULO,
  titulo: 'Editar papéis de um usuário',
  icone: 'user-pen',
  descricao: 'Achar a conta, abrir o detalhe, mudar os papéis e confirmar por TOTP.',
  duracao: '≈ 1,5 min',
  papeis: ['ADMIN'],
  impedimento: (ctx) =>
    ctx.mfa
      ? null
      : 'Requer uma conta com TOTP ativo, porque salvar papéis pede confirmação. Entre como admin@empresa.com.',
  passos: () => [
    {
      titulo: 'Editar usuário',
      texto:
        'Vamos dar o papel FINANCEIRO à conta cliente arroba empresa. O que se edita de um usuário hoje são os papéis.',
    },
    ...peloMenuAteUsuarios(),
    {
      titulo: 'Achar a conta',
      texto: 'Filtramos a lista pelo e-mail.',
      alvo: '#filtro-email',
      acao: { tipo: 'digitar', texto: () => 'cliente@' },
      aguardarAlvo: 'a[aria-label="Ver detalhe de cliente@empresa.com"]',
    },
    {
      titulo: 'Abrir o detalhe',
      texto: 'E abrimos o detalhe da conta.',
      alvo: 'a[aria-label="Ver detalhe de cliente@empresa.com"]',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_DETALHE,
      aguardarAlvo: '.px39-chip',
    },
    {
      titulo: 'Dados do usuário',
      texto: 'Aqui ficam os dados da conta e a auditoria: quem criou, quando e se tem TOTP.',
      alvo: '.px39-dados',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Editar dados',
      texto:
        'O botão Editar usuário está desabilitado: o backend ainda não permite mudar e-mail ou dados cadastrais.',
      alvo: { css: '.px39-btn-primary', texto: 'Editar usuário' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Roles e permissões',
      texto: 'O cartão de roles é onde a edição acontece. O papel principal aparece marcado.',
      alvo: '.px39-roles',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Marcar FINANCEIRO',
      texto: 'Marcamos o papel FINANCEIRO.',
      alvo: { css: '.px39-chip', texto: 'FINANCEIRO' },
      acao: { tipo: 'clicar' },
      pularSe: () =>
        Array.from(document.querySelectorAll('.px39-chip')).some(
          (chip) =>
            chip.textContent?.includes('FINANCEIRO') &&
            chip.getAttribute('aria-pressed') === 'true',
        ),
    },
    {
      titulo: 'Salvar roles',
      texto: 'E salvamos. Como é alteração sensível, o sistema pede a confirmação.',
      alvo: { css: '.px39-btn-primary', texto: 'Salvar roles' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarPapeis(),
    {
      titulo: 'Novo papel principal',
      texto: 'FINANCEIRO passa a ser o papel principal, e o vetor de acesso acompanha.',
      alvo: '.px39-permissoes',
      acao: { tipo: 'observar' },
    },
  ],
};

const excluir: Roteiro = {
  id: 'usuarios-excluir',
  modulo: MODULO,
  titulo: 'Excluir ou suspender usuário',
  icone: 'user-x',
  descricao: 'Onde ficam essas ações, por que ainda estão bloqueadas e o que fazer hoje.',
  duracao: '≈ 1 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'Excluir ou suspender',
      texto:
        'Este roteiro mostra onde ficam a exclusão e a suspensão. O backend ainda não oferece essas operações, então elas aparecem bloqueadas, com o motivo.',
    },
    ...peloMenuAteUsuarios(),
    {
      titulo: 'Mais ações',
      texto:
        'Na lista, o menu de mais ações de cada linha vai reunir desativar, reenviar convite e excluir. Por enquanto está bloqueado.',
      alvo: '.px38-btn-linha',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir um usuário',
      texto: 'No detalhe da conta ficam as ações individuais.',
      alvo: 'a.px38-link',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_DETALHE,
      aguardarAlvo: '.px39-chip',
    },
    {
      titulo: 'Suspender',
      texto:
        'O botão Suspender está aqui, bloqueado até existir o endpoint de suspensão. Passando o mouse, ele diz o motivo.',
      alvo: '.px39-btn-perigo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'O que fazer hoje',
      texto:
        'Enquanto isso, para restringir o acesso de alguém, reduza os papéis da conta a CLIENTE neste cartão. Quando a exclusão existir, este roteiro ganha os passos de ação.',
      alvo: '.px39-roles',
      acao: { tipo: 'observar' },
    },
  ],
};

const completo: Roteiro = {
  id: 'usuarios-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os quatro roteiros em sequência: lista, inclusão, edição e exclusão.',
  duracao: '≈ 5 min',
  papeis: ['ADMIN'],
  impedimento: editar.impedimento,
  passos: (ctx) => [
    ...visaoGeral.passos(ctx),
    ...incluir.passos(ctx).slice(1),
    ...editar.passos(ctx).slice(1),
    ...excluir.passos(ctx).slice(1),
  ],
};

export const ROTEIROS_USUARIOS: Roteiro[] = [completo, visaoGeral, incluir, editar, excluir];

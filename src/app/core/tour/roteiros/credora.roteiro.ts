import { ContextoRoteiro, Roteiro } from '../tour.model';
import { peloMenu, rotaExata, emSecao } from './passos-comuns';

// Tours assistidos da jornada Credora. A credora e um usuario CLIENTE: nao existe papel proprio,
// e o que muda o que a tela mostra e ter ou nao uma credora cadastrada. Por isso cada roteiro diz,
// no ambiente de demonstracao, com qual conta de exemplo ele funciona. Nenhum passo pede TOTP: as
// contas de exemplo da credora nao tem autenticador, e nada aqui mexe em credencial.

const MODULO = 'Credora';
const PAPEIS: Roteiro['papeis'] = ['CLIENTE'];

const CONTA_CREDORA = 'credora@empresa.com';
const CONTA_NOVA = 'credora-novo@empresa.com';
const ID_ONBOARDING_PJ = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a001';

const ROTA_OPORTUNIDADE = /^\/app\/credora\/oportunidades\/[^/?]+(\?.*)?$/;
const ROTA_OPERACAO = /^\/app\/credora\/carteira\/[^/?]+(\?.*)?$/;

/** Em demonstracao, a persona precisa ser a certa; fora dela, o sistema decide por conta propria. */
function soComConta(conta: string, motivo: string): Roteiro['impedimento'] {
  return (ctx: ContextoRoteiro) => (ctx.demo && ctx.usuario !== conta ? motivo : null);
}

const IMPEDIMENTO_CREDORA = soComConta(
  CONTA_CREDORA,
  `Requer uma credora cadastrada e elegível. Entre como ${CONTA_CREDORA}.`,
);

const IMPEDIMENTO_CADASTRO = soComConta(
  CONTA_NOVA,
  `Requer uma conta que ainda não tem credora. Entre como ${CONTA_NOVA}.`,
);

const MENU_CREDORA = {
  rota: '/app/credora',
  titulo: 'Menu Credora',
  texto:
    'No menu lateral, em Jornadas, fica a Credora. Ela aparece só para clientes, que podem investir como credora.',
  aguardarAlvo: '.px35-page',
};

const MENU_PERFIL = {
  rota: '/app/credora/perfil',
  titulo: 'Submenu Perfil',
  texto: 'Dentro da Credora, o submenu Perfil abre os dados da empresa credora e a elegibilidade.',
  aguardarAlvo: '.px43-dados',
};

const MENU_OPORTUNIDADES = {
  rota: '/app/credora/oportunidades',
  titulo: 'Submenu Oportunidades',
  texto: 'O submenu Oportunidades abre as operações publicadas, em busca de credoras.',
  aguardarAlvo: '.px44-tabela-card',
};

const MENU_CARTEIRA = {
  rota: '/app/credora/carteira',
  titulo: 'Submenu Carteira',
  texto: 'E o submenu Carteira abre as operações em que a credora já investiu.',
  aguardarAlvo: '.px46-tabela-card',
};

const MENU_CADASTRO = {
  rota: '/app/credora/cadastro',
  titulo: 'Submenu Cadastro',
  texto: 'O submenu Cadastro abre o formulário para cadastrar a empresa como credora.',
  aguardarAlvo: '.px36-form',
};

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'credora-visao-geral',
  modulo: MODULO,
  titulo: 'Visão geral da jornada',
  icone: 'layout-dashboard',
  descricao: 'A porta de entrada da credora: a empresa cadastrada e os atalhos da jornada.',
  duracao: '≈ 1 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_CREDORA,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra a página inicial da Credora. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_CREDORA),
    {
      titulo: 'Para que serve',
      texto:
        'A Credora é a jornada de quem investe: cadastrar a empresa, ver oportunidades e acompanhar a carteira.',
      alvo: '.px35-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Sua empresa credora',
      texto:
        'O primeiro cartão mostra a empresa credora cadastrada, com a razão social e a situação, que fica ativa depois da aprovação.',
      alvo: '.px35-credora',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Atalhos da jornada',
      texto:
        'Os atalhos levam às etapas seguintes: o perfil com a elegibilidade, as oportunidades e a carteira.',
      alvo: '.px35-atalhos',
      acao: { tipo: 'observar' },
    },
  ],
};

const cadastro: Roteiro = {
  id: 'credora-cadastro',
  modulo: MODULO,
  titulo: 'Cadastrar a empresa credora',
  icone: 'file-plus',
  descricao:
    'Do convite ao cadastro: o onboarding PJ aprovado, o tipo de credora e a capacidade de aporte.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_CADASTRO,
  passos: () => [
    {
      titulo: 'Cadastrar a credora',
      texto:
        'Vamos cadastrar uma empresa como credora, do convite até o perfil criado. É o primeiro passo de quem quer investir.',
    },
    ...peloMenu(MENU_CREDORA),
    {
      titulo: 'Ainda sem credora',
      texto:
        'Quando a conta ainda não tem credora, a tela convida ao cadastro e explica o caminho.',
      alvo: '.px35-vazio',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Por que cadastrar',
      texto:
        'Os cartões abaixo dizem o que a credora ganha: receber propostas, acompanhar oportunidades e ver a carteira de contratos.',
      alvo: '.px35-motivos',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Aviso',
      texto:
        'O aviso lembra que investir é uma atividade regulada e que o cadastro depende de um onboarding de empresa já aprovado.',
      alvo: '.px35-aviso',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Cadastrar minha empresa',
      texto: 'O botão leva ao formulário de cadastro.',
      alvo: '.px35-vazio a.px35-btn-primary',
      acao: { tipo: 'clicar' },
      aguardarRota: rotaExata(MENU_CADASTRO.rota),
      aguardarAlvo: '.px36-form',
    },
    {
      titulo: 'Informações da credora',
      texto:
        'A razão social e o CNPJ não são digitados: vêm do onboarding da empresa e não podem ser alterados.',
      alvo: '.px36-form',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Onboarding PJ',
      texto:
        'Aqui entra o identificador do onboarding da empresa. Ele precisa estar aprovado, com a verificação da empresa completa.',
      alvo: '#onboardingId',
      acao: { tipo: 'digitar', texto: () => ID_ONBOARDING_PJ },
      aguardarAlvo: '.px36-chip[data-tone="green"]',
    },
    {
      titulo: 'Onboarding aprovado',
      texto:
        'O sistema consulta o onboarding sozinho e mostra a situação. Verde significa aprovado, e os dados da empresa aparecem preenchidos.',
      alvo: '.px36-onboarding',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Tipo de credora',
      texto: 'O tipo diz se a credora é uma empresa ou uma instituição financeira.',
      alvo: '#tipoCredora',
      acao: { tipo: 'selecionar', opcao: 'Empresa' },
    },
    {
      titulo: 'Capacidade de aporte',
      texto:
        'A capacidade de aporte é opcional: quanto a empresa pretende investir. Aqui, quinhentos mil reais.',
      alvo: '#capacidadeAporte',
      acao: { tipo: 'digitar', texto: () => '50000000' },
    },
    {
      titulo: 'Sobre a credora e requisitos',
      texto: 'À direita, o que é a credora e os requisitos para se cadastrar.',
      alvo: '.px36-side',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Cadastrar credora',
      texto: 'O botão grava o cadastro. A empresa fica ativa e o sistema avalia a elegibilidade.',
      alvo: '.px36-form button[type="submit"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: rotaExata(MENU_PERFIL.rota),
      aguardarAlvo: '.px43-dados',
    },
    {
      titulo: 'Credora cadastrada',
      texto:
        'Pronto: o sistema leva ao perfil da credora, que mostra a situação e a elegibilidade.',
      alvo: '.px43-heading',
      acao: { tipo: 'observar' },
    },
  ],
};

const perfil: Roteiro = {
  id: 'credora-perfil',
  modulo: MODULO,
  titulo: 'Perfil e elegibilidade',
  icone: 'building-2',
  descricao: 'Os dados cadastrais da credora e o que define se ela pode manifestar interesse.',
  duracao: '≈ 1,5 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_CREDORA,
  passos: () => [
    {
      titulo: 'Perfil da credora',
      texto: 'Este roteiro mostra o perfil da credora e a elegibilidade para investir.',
    },
    ...peloMenu(MENU_CREDORA, MENU_PERFIL),
    {
      titulo: 'Identificação',
      texto:
        'O título traz a razão social e o CNPJ. Os selos ao lado dizem a situação do cadastro e a elegibilidade.',
      alvo: '.px43-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Situação da credora',
      texto:
        'O cartão de situação explica, em uma frase, se a credora pode manifestar interesse. Quando pode, o botão leva às oportunidades.',
      alvo: '.px43-situacao',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px43-situacao'),
    },
    {
      titulo: 'Dados cadastrais',
      texto:
        'Os dados cadastrais reúnem a razão social, o CNPJ, o tipo de credora, a capacidade de aporte e as datas do cadastro.',
      alvo: '.px43-dados',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Jornada credora',
      texto: 'À direita, atalhos para as oportunidades e para a carteira.',
      alvo: '.px43-atalhos',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'O que define a elegibilidade',
      texto:
        'O último cartão explica as regras: cadastro ativo, onboarding aprovado e ausência de impedimentos. Quem não cumpre vê o motivo no perfil.',
      alvo: '.px43-explicacao',
      acao: { tipo: 'observar' },
    },
  ],
};

const oportunidades: Roteiro = {
  id: 'credora-oportunidades',
  modulo: MODULO,
  titulo: 'Oportunidades e interesse',
  icone: 'chart-column',
  descricao:
    'As operações publicadas, o detalhe de uma e a manifestação (e o cancelamento) de interesse.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_CREDORA,
  passos: () => [
    {
      titulo: 'Oportunidades',
      texto: 'Vamos ver as operações publicadas, abrir uma e manifestar interesse nela.',
    },
    ...peloMenu(MENU_CREDORA, MENU_OPORTUNIDADES),
    {
      titulo: 'Para que serve',
      texto:
        'Uma oportunidade é uma operação de crédito já aprovada, publicada para as credoras decidirem se querem financiar.',
      alvo: '.px44-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo',
      texto:
        'Os cartões resumem as oportunidades: quantas há, o valor total, o prazo médio e a taxa média.',
      alvo: '.px44-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Operações publicadas',
      texto:
        'A tabela mostra o valor, o prazo, a taxa mensal, a situação e a data de publicação. Só as disponíveis podem ser abertas.',
      alvo: '.px44-tabela-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Como vira operação de carteira',
      texto:
        'O quadro abaixo conta o caminho completo: a credora manifesta interesse, a operação é associada a ela e entra na carteira.',
      alvo: '.px44-fluxo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir uma oportunidade',
      texto: 'O olho na linha abre o detalhe da oportunidade.',
      alvo: '.px44-btn-linha[aria-label^="Abrir oportunidade"]',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_OPORTUNIDADE,
      aguardarAlvo: '.px45-dados',
    },
    {
      titulo: 'Cabeçalho da oportunidade',
      texto: 'O título traz o identificador e a situação da oportunidade.',
      alvo: '.px45-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Métricas da operação',
      texto: 'Os três cartões mostram o valor, o prazo e a taxa de juros mensal da operação.',
      alvo: '.px45-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Identificação',
      texto: 'A identificação traz o código da operação e as datas.',
      alvo: '.px45-dados',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Sua credora',
      texto:
        'O cartão mostra a credora que vai manifestar interesse, com a situação e a elegibilidade.',
      alvo: '.px45-credora',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Manifestar interesse',
      texto:
        'O botão registra o interesse da credora nesta operação. Ele só aparece quando a credora está ativa e elegível.',
      alvo: { css: '.px45-acao button', texto: 'Manifestar interesse' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.px45-ok',
      pularSe: () => !document.querySelector('.px45-acao .px45-btn-primary'),
    },
    {
      titulo: 'Interesse registrado',
      texto:
        'A mensagem confirma o interesse. A partir daqui, a operação segue para a análise e a associação à credora.',
      alvo: '.px45-ok',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px45-ok'),
    },
    {
      titulo: 'Cancelar interesse',
      texto:
        'Enquanto a operação não for associada, o interesse pode ser cancelado. Vamos cancelar para deixar a tela como estava.',
      alvo: { css: '.px45-acao button', texto: 'Cancelar interesse' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: { css: '.px45-acao button', texto: 'Manifestar interesse' },
      pularSe: () => !document.querySelector('.px45-acao .px45-btn-sec'),
    },
    {
      titulo: 'O que acontece depois',
      texto:
        'Por fim, o quadro explica as próximas etapas, depois do interesse: associação, aceite do tomador e entrada na carteira.',
      alvo: '.px45-fluxo',
      acao: { tipo: 'observar' },
    },
  ],
};

const carteira: Roteiro = {
  id: 'credora-carteira',
  modulo: MODULO,
  titulo: 'Carteira de operações',
  icone: 'wallet',
  descricao: 'As operações associadas à credora, o recebido e o detalhe de uma delas.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_CREDORA,
  passos: () => [
    {
      titulo: 'Carteira',
      texto: 'Este roteiro mostra as operações em que a credora já investiu.',
    },
    ...peloMenu(MENU_CREDORA, MENU_CARTEIRA),
    {
      titulo: 'Para que serve',
      texto:
        'A carteira reúne as operações associadas à credora e acompanha o quanto já foi recebido.',
      alvo: '.px46-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da carteira',
      texto:
        'Os cartões somam o valor investido, o já recebido, o que está a receber e o estado geral da carteira.',
      alvo: '.px46-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Operações associadas',
      texto:
        'A tabela traz cada operação, com valor, prazo, taxa, o progresso do recebimento, o recebido e a situação.',
      alvo: '.px46-tabela-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Como a carteira funciona',
      texto:
        'O quadro abaixo resume o caminho: a associação, os recebimentos das parcelas e a proteção por garantia.',
      alvo: '.px46-fluxo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir uma operação',
      texto: 'O botão na linha abre o detalhe da operação.',
      alvo: '.px46-tabela-card tbody tr:first-child .px46-btn-linha',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_OPERACAO,
      aguardarAlvo: '.px47-dados',
    },
    {
      titulo: 'Cabeçalho da operação',
      texto: 'O título traz o identificador da operação e a situação.',
      alvo: '.px47-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Métricas da operação',
      texto:
        'Os cartões mostram o valor investido, o recebido, o a receber e a situação do recebimento.',
      alvo: '.px47-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Dados da operação',
      texto:
        'Os dados trazem a oportunidade de origem, com atalho para ela, as condições e a justificativa da associação.',
      alvo: '.px47-dados',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo de cobrança',
      texto:
        'O resumo de cobrança mostra o progresso do pagamento das parcelas pelo tomador e o que já foi repassado à credora.',
      alvo: '.px47-cobranca',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Trilha da operação',
      texto:
        'A trilha conta a história da operação: a oportunidade, a associação, o primeiro recebimento e o vencimento seguinte.',
      alvo: '.px47-trilha',
      acao: { tipo: 'observar' },
    },
  ],
};

const completo: Roteiro = {
  id: 'credora-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'A jornada de uma credora ativa: visão geral, perfil, oportunidades e carteira.',
  duracao: '≈ 9 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_CREDORA,
  passos: (ctx) => {
    return [
      ...emSecao(visaoGeral, ctx, { primeira: true }),
      ...emSecao(perfil, ctx),
      ...emSecao(oportunidades, ctx),
      ...emSecao(carteira, ctx),
    ];
  },
};

// O cadastro fica de fora do completo: ele so existe para quem ainda nao tem credora.
export const ROTEIROS_CREDORA: Roteiro[] = [
  completo,
  visaoGeral,
  cadastro,
  perfil,
  oportunidades,
  carteira,
];

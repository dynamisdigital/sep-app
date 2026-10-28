import { ContextoRoteiro, PassoRoteiro, Roteiro } from '../tour.model';
import { MENU_ADMINISTRACAO } from './menus';
import { ROTA_STEP_UP, confirmarComTotp, peloMenu, emSecao } from './passos-comuns';

// Tours assistidos dos Parametros operacionais (Administracao). So o papel ADMIN alcanca a area.
// O roteiro que grava um valor pede conta com TOTP, porque o sistema exige a segunda confirmacao.

const MODULO = 'Parâmetros';
const ROTA_DETALHE = /^\/app\/admin\/parametros\/[^/?]+(\?.*)?$/;

// Parametros usados na demonstracao. `score` tem historico (versao 3) e serve para consultar;
// `proposta.pendente.horas` e um limite de alerta do backoffice, inofensivo para alterar.
const CHAVE_CONSULTA = 'credito.score.pre-aprovacao';
const CHAVE_ALTERACAO = 'backoffice.proposta.pendente.horas';

const MENU_PARAMETROS = {
  rota: '/app/admin/parametros',
  titulo: 'Submenu Parâmetros',
  texto:
    'Dentro da Administração, o submenu Parâmetros abre o catálogo de parâmetros operacionais.',
  aguardarAlvo: '.px40-tabela-card',
};

const IMPEDIMENTO_TOTP: Roteiro['impedimento'] = (ctx) =>
  ctx.mfa
    ? null
    : 'Requer uma conta com TOTP ativo, porque salvar um parâmetro pede confirmação. Entre como admin@empresa.com.';

/** Busca a chave no catalogo e abre o detalhe dela. */
function abrirParametro(chave: string, busca: string): PassoRoteiro[] {
  return [
    {
      titulo: 'Buscar o parâmetro',
      texto:
        'Para achar um parâmetro, basta digitar parte da chave ou da descrição. A tabela filtra enquanto se digita.',
      alvo: '#busca-parametro',
      acao: { tipo: 'digitar', texto: () => busca },
      aguardarAlvo: `a[aria-label="Ver detalhe de ${chave}"]`,
    },
    {
      titulo: 'Abrir o detalhe',
      texto:
        'Cada linha tem o atalho Ver detalhe, que abre o parâmetro com a trilha de alterações.',
      alvo: `a[aria-label="Ver detalhe de ${chave}"]`,
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_DETALHE,
      aguardarAlvo: '.px41-alterar',
    },
  ];
}

// ============ ROTEIROS ============

const catalogo: Roteiro = {
  id: 'parametros-catalogo',
  modulo: MODULO,
  titulo: 'Visão geral do catálogo',
  icone: 'database',
  descricao: 'Onde ficam os parâmetros, como buscar, filtrar por tipo e ordenar.',
  duracao: '≈ 1,5 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra o catálogo de parâmetros operacionais. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_ADMINISTRACAO, MENU_PARAMETROS),
    {
      titulo: 'Resumo e controles',
      texto:
        'No alto, o total de parâmetros, quantos estão ativos e quando foi a última alteração. Ao lado ficam a busca e os filtros.',
      alvo: '.px40-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Os parâmetros',
      texto:
        'A tabela lista cada parâmetro com chave, tipo, valor e versão. O teto de crédito do regimento, por exemplo, é um deles: credito ponto valor ponto máximo.',
      alvo: '.px40-tabela-wrap',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Buscar',
      texto:
        'A busca acha pela chave ou pela descrição. Digitando score, sobram só os parâmetros do motor de crédito.',
      alvo: '#busca-parametro',
      acao: { tipo: 'digitar', texto: () => 'score' },
    },
    {
      titulo: 'Limpar a busca',
      texto: 'Apagando o texto, o catálogo volta completo.',
      alvo: '#busca-parametro',
      acao: { tipo: 'digitar', texto: () => '' },
    },
    {
      titulo: 'Filtros',
      texto: 'O botão Filtros abre a escolha por tipo de valor.',
      alvo: '.px40-btn-filtros',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px40-filtros',
    },
    {
      titulo: 'Filtrar por tipo',
      texto:
        'Cada parâmetro tem um tipo: inteiro, decimal, booleano ou texto. Escolhendo inteiro, aparecem só os valores inteiros, como prazos e limites em horas.',
      alvo: { css: '.px40-chip', texto: 'INTEGER' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Voltar a todos',
      texto: 'E o chip Todos desfaz o filtro.',
      alvo: { css: '.px40-chip', texto: 'Todos' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Ordenar',
      texto:
        'Os títulos da tabela ordenam. Ordenando por versão, a lista vai da menor para a maior, e um segundo clique inverte.',
      alvo: { css: '.px40-ordenar', texto: 'Versão' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Sobre os parâmetros',
      texto:
        'Por fim, o aviso: alterar um parâmetro pode mudar regras de negócio e cálculos. Toda alteração é versionada, auditada e pede confirmação por TOTP.',
      alvo: '.px40-aviso',
      acao: { tipo: 'observar' },
    },
  ],
};

const consultar: Roteiro = {
  id: 'parametros-consultar',
  modulo: MODULO,
  titulo: 'Consultar um parâmetro',
  icone: 'file-search',
  descricao: 'O detalhe: identidade, informações técnicas e a trilha de versões.',
  duracao: '≈ 1,5 min',
  papeis: ['ADMIN'],
  passos: () => [
    {
      titulo: 'Consultar um parâmetro',
      texto:
        'Vamos abrir o score mínimo de pré-aprovação, que já foi alterado duas vezes, e ler a trilha de alterações.',
    },
    ...peloMenu(MENU_ADMINISTRACAO, MENU_PARAMETROS),
    ...abrirParametro(CHAVE_CONSULTA, 'pre-aprovacao'),
    {
      titulo: 'Identidade',
      texto:
        'A chave identifica o parâmetro. Ao lado, o tipo, a versão atual e quantas alterações existem na trilha.',
      alvo: '.px41-identidade',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações técnicas',
      texto:
        'O valor atual, as datas de criação e de modificação e quem fez a última alteração, que é o identificador do autor.',
      alvo: '.px41-tecnicas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Alterar valor',
      texto:
        'Aqui se altera o valor. A mudança exige justificativa e confirmação por TOTP. Há um roteiro só para isso.',
      alvo: '.px41-alterar',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Histórico de versões',
      texto:
        'A trilha registra cada versão: data e hora, valor anterior, valor novo, quem alterou e a justificativa dada.',
      alvo: '.px41-historico',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Histórico completo',
      texto:
        'O botão de histórico completo está desabilitado porque a consulta já devolve a trilha inteira do parâmetro.',
      alvo: { css: '.px41-historico button', texto: 'Ver histórico completo' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Voltar ao catálogo',
      texto: 'A seta no alto volta para a lista de parâmetros.',
      alvo: '.px41-voltar-circulo',
      acao: { tipo: 'clicar' },
      aguardarRota: /^\/app\/admin\/parametros(\?.*)?$/,
      aguardarAlvo: '.px40-tabela-card',
    },
  ],
};

const alterar: Roteiro = {
  id: 'parametros-alterar',
  modulo: MODULO,
  titulo: 'Alterar um parâmetro',
  icone: 'pencil',
  descricao: 'Novo valor, justificativa, confirmação por TOTP e a nova versão na trilha.',
  duracao: '≈ 2,5 min',
  papeis: ['ADMIN'],
  impedimento: IMPEDIMENTO_TOTP,
  passos: () => [
    {
      titulo: 'Alterar um parâmetro',
      texto:
        'Vamos aumentar em uma hora o limite para uma proposta em análise virar pendência, do menu até a nova versão na trilha.',
    },
    ...peloMenu(MENU_ADMINISTRACAO, MENU_PARAMETROS),
    ...abrirParametro(CHAVE_ALTERACAO, 'backoffice.proposta.pendente'),
    {
      titulo: 'Valor atual',
      texto:
        'Antes de alterar, o valor atual. Este parâmetro é um limite em horas usado pelo backoffice para sinalizar propostas paradas.',
      alvo: '.px41-tecnicas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Novo valor',
      texto:
        'O campo já vem com o valor atual. Digitamos o novo valor, uma hora a mais. O campo respeita o tipo do parâmetro: aqui, um número inteiro.',
      alvo: '#novo-valor',
      acao: {
        tipo: 'digitar',
        texto: (ctx: ContextoRoteiro) => {
          const campo = document.querySelector<HTMLInputElement>('#novo-valor');
          const atual = Number.parseInt(campo?.value ?? '', 10);
          const base = Number.isNaN(atual) ? 24 : atual;
          ctx.dados['antigo'] = String(base);
          ctx.dados['novo'] = String(base + 1);
          return ctx.dados['novo'];
        },
      },
    },
    {
      titulo: 'Justificativa',
      texto: (ctx) =>
        `Toda alteração exige uma justificativa, que fica na trilha. Aqui, o valor muda de ${ctx.dados['antigo']} para ${ctx.dados['novo']} horas.`,
      alvo: '#justificativa',
      acao: { tipo: 'digitar', texto: () => 'Ajuste de demonstração (tour assistido).' },
    },
    {
      titulo: 'Salvar valor',
      texto: 'Com valor e justificativa, clicamos em Salvar valor.',
      alvo: '.px41-btn-primary',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarComTotp({
      motivo:
        'Alterar um parâmetro é operação sensível: ele muda regras de negócio. O sistema pede uma segunda confirmação de identidade antes de gravar.',
      aoConfirmar:
        'Confirmado o código, o sistema volta ao parâmetro e envia a alteração sozinho, com o valor e a justificativa que já estavam preenchidos.',
      destino: ROTA_DETALHE,
    }),
    {
      titulo: 'Parâmetro atualizado',
      texto: 'A mensagem confirma que o parâmetro foi atualizado.',
      alvo: { css: '.px41-nota-ok', texto: 'Parâmetro atualizado' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Nova versão na trilha',
      texto: (ctx) => {
        // A versao nova e a primeira linha da trilha; lida da tela porque numa segunda execucao
        // na mesma sessao ela ja nao e a dois.
        const versao =
          document
            .querySelector('.px41-historico tbody tr .px41-versao')
            ?.textContent?.trim()
            .replace(/^v/i, '') ?? '';
        return `O histórico ganhou a versão ${versao}: valor anterior ${ctx.dados['antigo']}, valor novo ${ctx.dados['novo']}, com o autor e a justificativa. É a trilha que a auditoria consulta.`;
      },
      alvo: '.px41-historico',
      acao: { tipo: 'observar' },
    },
  ],
};

const completo: Roteiro = {
  id: 'parametros-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os três roteiros em sequência: catálogo, consulta e alteração.',
  duracao: '≈ 5 min',
  papeis: ['ADMIN'],
  impedimento: IMPEDIMENTO_TOTP,
  passos: (ctx) => [
    ...emSecao(catalogo, ctx, { primeira: true }),
    ...emSecao(consultar, ctx),
    ...emSecao(alterar, ctx),
  ],
};

export const ROTEIROS_PARAMETROS: Roteiro[] = [completo, catalogo, consultar, alterar];

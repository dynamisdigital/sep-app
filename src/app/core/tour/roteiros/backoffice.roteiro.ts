import { PassoRoteiro, Roteiro } from '../tour.model';
import { ROTA_STEP_UP, confirmarComTotp, peloMenu, rotaExata, emSecao } from './passos-comuns';

// Tours assistidos do Backoffice. Os tres papeis operacionais alcancam o modulo. Ler dashboards,
// fila e reprocessos nao grava nada. Tratar uma ocorrencia (assumir, comentar) grava, e resolve-la
// ainda pede TOTP; disparar um reprocesso tambem. Os cliques que gravam so executam em demonstracao.

const MODULO = 'Backoffice';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE'];

const ROTA_ITEM = /^\/app\/backoffice\/fila\/[^/?]+(\?.*)?$/;
const ROTA_PROVIDER = rotaExata('/app/backoffice/reprocessos/provider');

const MENU_BACKOFFICE = {
  rota: '/app/backoffice',
  titulo: 'Menu Backoffice',
  texto:
    'No menu lateral, em Operação, fica o Backoffice. Ele aparece para backoffice, financeiro e administração.',
  aguardarAlvo: '.bo15-metrics',
};

const MENU_DASHBOARD = {
  rota: '/app/backoffice/dashboard',
  titulo: 'Submenu Dashboard',
  texto: 'Dentro do Backoffice, o submenu Dashboard abre os indicadores da plataforma.',
  aguardarAlvo: '.op-metrics',
};

const MENU_FILA = {
  rota: '/app/backoffice/fila',
  titulo: 'Submenu Fila operacional',
  texto: 'O submenu Fila operacional abre as ocorrências que a operação precisa tratar.',
  aguardarAlvo: '.bo16-row',
};

const MENU_REPROCESSOS = {
  rota: '/app/backoffice/reprocessos',
  titulo: 'Submenu Reprocessos',
  texto: 'E o submenu Reprocessos abre o histórico de reenvios e reexecuções.',
  aguardarAlvo: '.bo18-row',
};

const IMPEDIMENTO_TOTP: Roteiro['impedimento'] = (ctx) =>
  ctx.mfa
    ? null
    : 'Requer uma conta com TOTP ativo, porque resolver uma ocorrência e disparar um reprocesso pedem confirmação. Entre como admin@empresa.com.';

/** Da fila ate o primeiro item sem responsavel aberto, filtrando pelo atalho Sem atribuicao. */
function abrirItemSemResponsavel(): PassoRoteiro[] {
  return [
    {
      titulo: 'Itens sem responsável',
      texto:
        'O quarto atalho filtra os itens que ninguém assumiu ainda. É por eles que o atendimento começa.',
      alvo: '.bo16-quick button:nth-of-type(4)',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.bo16-row',
    },
    {
      // Passo de pausa: a tabela e refeita depois do clique, e o proximo alvo e uma linha dela.
      titulo: 'Só os itens sem responsável',
      texto: 'A tabela agora mostra apenas esses itens.',
      alvo: '.bo16-table-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir o item',
      texto: 'O botão de ver, no fim da linha, abre o item para tratamento.',
      alvo: '.bo16-row:first-child .bo16-view',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_ITEM,
      aguardarAlvo: '.bo17-summary',
    },
  ];
}

/** Justificativa e acao do formulario de resolver; usado duas vezes, porque o TOTP esvazia o formulario. */
function preencherResolucao(retomada: boolean): PassoRoteiro[] {
  return [
    {
      titulo: retomada ? 'Justificativa, de novo' : 'Justificativa',
      texto: retomada
        ? 'Ao voltar da confirmação, o formulário recomeça vazio. A justificativa entra outra vez.'
        : 'Toda resolução leva uma justificativa de pelo menos vinte caracteres, que fica registrada na auditoria.',
      alvo: '#bo17-justificativa-resolver',
      acao: {
        tipo: 'digitar',
        texto: () => 'Ocorrência tratada na demonstração do tour assistido.',
      },
    },
    {
      titulo: 'Ação realizada',
      texto: 'E a ação realizada diz o que foi feito para resolver o caso.',
      alvo: '.bo17-acoes section:first-child select',
      acao: { tipo: 'selecionar', opcao: 'Contato realizado com o tomador' },
    },
  ];
}

/** Identificador de entidade unico por execucao: o reprocesso e limitado a tres por entidade em 24h. */
function entidadeDaExecucao(carimbo: string): string {
  return `e0000000-0000-4000-8000-${carimbo.replace(/\D/g, '').padStart(12, '0').slice(-12)}`;
}

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'backoffice-visao-geral',
  modulo: MODULO,
  titulo: 'Dashboard operacional',
  icone: 'layout-dashboard',
  descricao:
    'Métricas, distribuições por status, prioridade e tipo, evolução e ocorrências críticas.',
  duracao: '≈ 2,5 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra o dashboard operacional do Backoffice. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_BACKOFFICE),
    {
      titulo: 'Para que serve',
      texto: 'O dashboard mostra, em um lugar só, o estado da fila de ocorrências e da operação.',
      alvo: '.bo15-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Período do relatório',
      texto:
        'O seletor escolhe o período do relatório que o botão Exportar gera. Os cartões mostram a situação atual.',
      alvo: '.bo15-actions select',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Métricas',
      texto:
        'Os cartões do alto resumem a fila: quantos itens há, quantos estão abertos, em tratamento e fora do prazo. O traço de cada cartão mostra a tendência.',
      alvo: '.bo15-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Itens por status',
      texto:
        'O primeiro círculo divide os itens por situação: aberto, em tratamento, resolvido e ignorado.',
      alvo: { css: '.bo15-card', texto: 'Itens por status' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Itens por prioridade',
      texto:
        'O segundo divide por prioridade, da baixa à crítica, a que tem prazo de atendimento mais curto.',
      alvo: { css: '.bo15-card', texto: 'Itens por prioridade' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Itens por tipo',
      texto:
        'O terceiro divide por tipo de ocorrência, como webhook que falhou, desembolso Pix com falha e recebimento divergente.',
      alvo: { css: '.bo15-card', texto: 'Itens por tipo' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Tipos mais frequentes',
      texto: 'A lista dos cinco tipos mais frequentes mostra onde a operação mais trabalha.',
      alvo: '.top-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Evolução de ocorrências',
      texto:
        'O gráfico compara, ao longo dos dias, as ocorrências abertas com as resolvidas. Quando a linha das resolvidas fica por cima, a fila está encolhendo.',
      alvo: '.evolution',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Propostas por status',
      texto:
        'Este círculo mostra as propostas de crédito por situação. O link abre a lista completa.',
      alvo: '.proposal',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ranking de ocorrências',
      texto: 'O ranking mostra, nos últimos trinta dias, quais tipos geraram mais ocorrências.',
      alvo: '.ranking',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ocorrências críticas recentes',
      texto:
        'A lista de críticas traz os casos mais urgentes. Clicando em um, o item abre para tratamento.',
      alvo: '.critical',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Indicadores operacionais',
      texto:
        'Por fim, os indicadores operacionais, como o tempo médio de resolução e o cumprimento de prazos.',
      alvo: '.indicators',
      acao: { tipo: 'observar' },
    },
  ],
};

const indicadores: Roteiro = {
  id: 'backoffice-indicadores',
  modulo: MODULO,
  titulo: 'Indicadores da plataforma',
  icone: 'chart-column',
  descricao: 'Métricas, próximas jornadas, resumo, desempenho, saúde da plataforma e atividades.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Indicadores da plataforma',
      texto:
        'Este roteiro mostra o segundo dashboard do Backoffice, com a visão geral da plataforma.',
    },
    ...peloMenu(MENU_BACKOFFICE, MENU_DASHBOARD),
    {
      titulo: 'Boas-vindas',
      texto: 'O alto da tela saúda quem está logado. O botão ao lado personaliza a tela.',
      alvo: '.op-welcome',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Métricas operacionais',
      texto:
        'Os cartões resumem a operação, como o volume operacional, com a tendência no traço de cada um.',
      alvo: '.op-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Próximas jornadas',
      texto:
        'Aqui ficam as jornadas do sistema, com o andamento de cada uma. O link Acessar jornada abre o módulo.',
      alvo: '.op-journeys-panel',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo operacional',
      texto: 'O resumo lista o que aconteceu hoje. Os itens em vermelho pedem atenção.',
      alvo: '.op-summary',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Indicadores de performance',
      texto:
        'Os anéis mostram a performance dos últimos sete dias, com a tendência de cada indicador.',
      alvo: '.op-performance',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Saúde da plataforma',
      texto: 'A saúde da plataforma mostra a situação dos serviços de que o sistema depende.',
      alvo: '.op-health',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Atividades recentes',
      texto:
        'As atividades recentes contam, em ordem, o que acabou de acontecer. O link abre a fila.',
      alvo: '.op-activity',
      acao: { tipo: 'observar' },
    },
  ],
};

const fila: Roteiro = {
  id: 'backoffice-fila',
  modulo: MODULO,
  titulo: 'Fila operacional',
  icone: 'list',
  descricao: 'Resumo, busca e filtros, atalhos rápidos, tabela de ocorrências e distribuições.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Fila operacional',
      texto: 'Este roteiro percorre a fila de ocorrências: resumo, filtros, tabela e atalhos.',
    },
    ...peloMenu(MENU_BACKOFFICE, MENU_FILA),
    {
      titulo: 'Resumo da fila',
      texto: 'Os cartões do alto contam os itens da fila por situação e o que está fora do prazo.',
      alvo: '.bo16-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Busca e filtros',
      texto:
        'A faixa de filtros recorta a fila por texto, tipo, prioridade, situação, responsável e período de abertura.',
      alvo: '.bo16-filters',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Filtrar por prioridade',
      texto: 'Escolhendo Alta, a fila mostra só as ocorrências de prioridade alta.',
      alvo: '.bo16-filters select[formcontrolname="prioridade"]',
      acao: { tipo: 'selecionar', opcao: 'ALTA' },
    },
    {
      titulo: 'Filtrar por situação',
      texto: 'E a situação Aberto tira da lista o que já foi resolvido ou ignorado.',
      alvo: '.bo16-filters select[formcontrolname="status"]',
      acao: { tipo: 'selecionar', opcao: 'ABERTO' },
    },
    {
      titulo: 'Limpar os filtros',
      texto: 'Limpar filtros devolve a fila completa.',
      alvo: '.bo16-clear',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Buscar por texto',
      texto:
        'A busca encontra ocorrências por palavra. Digitando webhook, sobram só as relacionadas a webhook.',
      alvo: '.bo16-search input',
      acao: { tipo: 'digitar', texto: () => 'webhook' },
    },
    {
      titulo: 'Executar a busca',
      texto: 'A lupa dispara a busca.',
      alvo: 'button[aria-label="Buscar na fila"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Limpar a busca',
      texto: 'Limpando de novo, a fila volta ao normal.',
      alvo: '.bo16-clear',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Tabela de ocorrências',
      texto:
        'A tabela mostra cada ocorrência: identificador, tipo, descrição, prioridade, situação, responsável, data de abertura e prazo. A cor do prazo avisa quando o limite se aproxima.',
      alvo: '.bo16-table-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações da linha',
      texto: 'No fim de cada linha, o botão de ver abre a ocorrência completa.',
      alvo: '.bo16-row:first-child .bo16-view',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Paginação',
      texto: 'O rodapé folheia a fila e permite escolher quantos itens aparecem por página.',
      alvo: '.bo16-pagination',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Filtros rápidos',
      texto:
        'À direita, atalhos para os recortes mais usados: o que é meu, o que está perto de estourar o prazo, o que já atrasou e o que está sem responsável. O número mostra quantos itens cada um tem.',
      alvo: '.bo16-quick',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Itens atrasados',
      texto: 'O terceiro atalho filtra os itens que já passaram do prazo.',
      alvo: '.bo16-quick button:nth-of-type(3)',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Limpar o atalho',
      texto: 'Limpar filtros tira o atalho e devolve a fila inteira.',
      alvo: '.bo16-clear',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Distribuição por prioridade',
      texto: 'O círculo da direita mostra como a fila se divide por prioridade.',
      alvo: '.bo16-distribution.priority',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Distribuição por status',
      texto: 'Este mostra a divisão por situação.',
      alvo: '.bo16-distribution.status',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Distribuição por tipo',
      texto: 'E este, a divisão por tipo de ocorrência.',
      alvo: '.bo16-distribution.type',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Atalhos',
      texto: 'Por fim, os atalhos levam aos reprocessos e ao Pix.',
      alvo: '.bo16-shortcuts',
      acao: { tipo: 'observar' },
    },
  ],
};

const tratar: Roteiro = {
  id: 'backoffice-tratar',
  modulo: MODULO,
  titulo: 'Tratar uma ocorrência',
  icone: 'clipboard-check',
  descricao: 'Abrir um item, assumir, comentar e resolver, com a confirmação por TOTP.',
  duracao: '≈ 5 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: () => [
    {
      titulo: 'Tratar uma ocorrência',
      texto:
        'Vamos pegar uma ocorrência sem responsável, assumir, comentar e resolver, do menu até o encerramento.',
    },
    ...peloMenu(MENU_BACKOFFICE, MENU_FILA),
    ...abrirItemSemResponsavel(),
    {
      titulo: 'Cabeçalho do item',
      texto:
        'O título mostra o assunto da ocorrência, o tipo e o identificador. À direita, os botões de ação: assumir, ou marcar como resolvido, e um menu com atalhos.',
      alvo: '.bo17-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo do item',
      texto:
        'O resumo traz a data de abertura, a prioridade, a situação, o responsável e o prazo de atendimento.',
      alvo: '.bo17-summary',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Descrição e objeto',
      texto:
        'A descrição conta o que aconteceu. O cartão Objeto mostra o registro de origem, como a transferência ou o evento, sem expor dados sensíveis.',
      alvo: '.bo17-cards',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Assumir o item',
      texto:
        'Assumir coloca o item em seu nome e o move para Em tratamento. A partir daí, os outros operadores sabem que ele está sendo cuidado.',
      alvo: { css: '.bo17-primary', texto: 'Assumir' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.bo17-assigned',
    },
    {
      titulo: 'Item assumido',
      texto: 'O resumo agora mostra o responsável, e a situação mudou para Em tratamento.',
      alvo: '.bo17-summary',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Comentários internos',
      texto:
        'O espaço de comentários guarda o histórico da conversa sobre o caso. As abas separam os comentários das anotações privadas.',
      alvo: '.bo17-comentarios',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Novo comentário',
      texto: 'Um comentário registra o que foi feito ou combinado, para quem pegar o caso depois.',
      alvo: '.bo17-novo textarea',
      acao: {
        tipo: 'digitar',
        texto: () => 'Caso analisado durante a demonstração do tour assistido.',
      },
    },
    {
      titulo: 'Enviar o comentário',
      texto: 'O botão publica o comentário na lista.',
      alvo: '.bo17-novo button[type="submit"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.bo17-lista li',
    },
    {
      // Tambem da tempo para a tela se refazer depois do envio, antes do proximo destaque.
      titulo: 'Comentário publicado',
      texto: 'O comentário entrou na lista, com o autor e a hora.',
      alvo: '.bo17-comentarios',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações do item',
      texto:
        'O cartão de ações oferece dois caminhos: resolver a ocorrência ou ignorá-la, quando for falso positivo. Os dois pedem justificativa.',
      alvo: '.bo17-acoes-grid',
      acao: { tipo: 'observar' },
    },
    ...preencherResolucao(false),
    {
      titulo: 'Resolver a ocorrência',
      texto:
        'O botão encerra o caso. Como a decisão fica na auditoria, o sistema pede a segunda confirmação de identidade.',
      alvo: '.bo17-resolver',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarComTotp({
      motivo:
        'Resolver uma ocorrência é decisão registrada na auditoria. O sistema pede o código do autenticador antes de gravar.',
      aoConfirmar:
        'Confirmado o código, o sistema volta ao item. O formulário recomeça vazio, então a justificativa entra outra vez.',
      destino: ROTA_ITEM,
    }),
    ...preencherResolucao(true),
    {
      titulo: 'Resolver de novo',
      texto: 'Agora, com a confirmação válida, a ocorrência é resolvida.',
      alvo: '.bo17-resolver',
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '[data-field="status"][data-status="RESOLVIDO"]',
    },
    {
      titulo: 'Ocorrência resolvida',
      texto: 'A situação do item mudou para Resolvido, e as ações de tratamento saíram da tela.',
      alvo: '.bo17-summary',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo do item',
      texto:
        'À direita, a linha do tempo registra cada passo: abertura, assunção, comentário e resolução, com data e hora.',
      alvo: { css: '.bo17-side-card', texto: 'Linha do tempo do item' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações adicionais',
      texto:
        'E as informações adicionais trazem os identificadores do item, com botão para copiar cada um.',
      alvo: { css: '.bo17-side-card', texto: 'Informações adicionais' },
      acao: { tipo: 'observar' },
    },
  ],
};

const reprocessos: Roteiro = {
  id: 'backoffice-reprocessos',
  modulo: MODULO,
  titulo: 'Histórico de reprocessos',
  icone: 'history',
  descricao:
    'Filtros, tabela de reprocessos, detalhe de um deles, histórico e execuções em andamento.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Histórico de reprocessos',
      texto: 'Este roteiro mostra o histórico de reenvios e reexecuções do sistema.',
    },
    ...peloMenu(MENU_BACKOFFICE, MENU_REPROCESSOS),
    {
      titulo: 'Para que serve',
      texto:
        'Reprocessar é pedir ao sistema que refaça uma operação que falhou, como reenviar um webhook ou reconsultar o provedor.',
      alvo: '.bo18-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo dos reprocessos',
      texto:
        'Os cartões contam os reprocessos por situação: concluídos, em execução, aguardando e com falha.',
      alvo: '.bo18-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Filtros',
      texto:
        'Os filtros recortam por busca, situação, tipo, período de criação e origem. O botão Novo reprocesso abre o formulário de disparo.',
      alvo: '.bo18-filters',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Filtrar por situação',
      texto: 'Escolhendo Falha, a tabela mostra só os reprocessos que não deram certo.',
      alvo: '.bo18-filters select[formcontrolname="status"]',
      acao: { tipo: 'selecionar', opcao: 'FALHA' },
    },
    {
      titulo: 'Voltar a todos',
      texto: 'Voltando para Todos, a lista completa reaparece.',
      alvo: '.bo18-filters select[formcontrolname="status"]',
      acao: { tipo: 'selecionar', opcao: 'Todos' },
    },
    {
      titulo: 'Solicitações de reprocessamento',
      texto:
        'A tabela traz o identificador, o tipo, a origem, a referência, a situação, as datas e quem solicitou.',
      alvo: '.bo18-table-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir os detalhes',
      texto: 'O olho na linha abre os detalhes do reprocesso.',
      alvo: '.bo18-row:first-child .bo18-view',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.bo18-dialog',
    },
    {
      titulo: 'Detalhes do reprocesso',
      texto:
        'O painel mostra o tipo, a origem, a referência, a situação, as datas e o solicitante, e o que foi tentado.',
      alvo: '.bo18-dialog',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Fechar os detalhes',
      texto: 'O botão de fechar volta à lista.',
      alvo: '.bo18-dialog header button',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Histórico de reprocessos',
      texto: 'O gráfico mostra, dia a dia, quantos reprocessos terminaram em cada situação.',
      alvo: '.bo18-history',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Distribuições',
      texto: 'À direita, dois círculos dividem os reprocessos por situação e por tipo.',
      alvo: '.bo18-distribution',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Execuções em andamento',
      texto: 'O cartão mostra o que está rodando agora. Quando nada roda, ele avisa.',
      alvo: '.bo18-running',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas abrem um novo reprocesso, reexecutam as falhas, mostram os agendados e exportam o relatório.',
      alvo: '.bo18-quick',
      acao: { tipo: 'observar' },
    },
  ],
};

const reprocessar: Roteiro = {
  id: 'backoffice-reprocessar',
  modulo: MODULO,
  titulo: 'Disparar um reprocesso',
  icone: 'refresh-cw',
  descricao: 'O formulário de reprocessamento, com a confirmação por TOTP e o resultado.',
  duracao: '≈ 4 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: () => [
    {
      titulo: 'Disparar um reprocesso',
      texto:
        'Vamos reconsultar uma transferência no provedor, do histórico até o resultado. É uma operação sensível.',
    },
    ...peloMenu(MENU_BACKOFFICE, MENU_REPROCESSOS),
    {
      titulo: 'Novo reprocesso',
      texto: 'O botão Novo reprocesso abre o formulário de disparo.',
      alvo: '.bo18-new',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_PROVIDER,
      aguardarAlvo: '.bo19-form',
    },
    {
      titulo: 'Dois canais',
      texto:
        'O reprocesso pode ser de dois canais: o webhook, que reenvia um evento, e o provider, que refaz uma chamada ao provedor. As abas escolhem.',
      alvo: '.bo19-tabs',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Tipo de chamada',
      texto:
        'No canal provider, o tipo de chamada diz o que será refeito, como reconsultar o status de uma transferência Pix. Cada tipo mostra uma dica.',
      alvo: '#bo19-tipo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Entidade',
      texto:
        'A entidade é o registro a reprocessar. O sistema limita a três reprocessos por entidade em vinte e quatro horas, para evitar abuso.',
      alvo: '#bo19-entidade',
      acao: { tipo: 'digitar', texto: (ctx) => entidadeDaExecucao(ctx.carimbo) },
    },
    {
      titulo: 'Item da fila',
      texto: 'O item da fila é opcional, e liga o reprocesso à ocorrência que o motivou.',
      alvo: '#bo19-item',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Aviso',
      texto:
        'O aviso lembra que o reprocesso é auditado e que repeti-lo sem necessidade pode gerar duplicidade.',
      alvo: '.bo19-warning',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Disparar',
      texto:
        'O botão dispara o reprocesso. Como altera o estado de uma operação financeira, pede a segunda confirmação.',
      alvo: '.bo19-submit',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarComTotp({
      motivo:
        'Reprocessar refaz uma operação financeira. O sistema pede o código do autenticador antes de executar.',
      aoConfirmar:
        'Confirmado o código, o sistema volta ao formulário vazio. A entidade entra outra vez.',
      destino: ROTA_PROVIDER,
    }),
    {
      titulo: 'Entidade, de novo',
      texto: 'A mesma entidade é informada outra vez.',
      alvo: '#bo19-entidade',
      acao: { tipo: 'digitar', texto: (ctx) => entidadeDaExecucao(ctx.carimbo) },
    },
    {
      titulo: 'Disparar de novo',
      texto: 'Agora, com a confirmação válida, o reprocesso é executado.',
      alvo: '.bo19-submit',
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.bo19-resultado',
    },
    {
      titulo: 'Resultado',
      texto: 'O resultado mostra o protocolo, a situação e a mensagem retornada.',
      alvo: '.bo19-resultado',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Histórico recente',
      texto:
        'O histórico dos disparos recentes registra quando, o canal, a entidade, o item, quem disparou, o resultado e o tempo.',
      alvo: '.bo19-history',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Reprocessamento manual',
      texto: 'À direita, o cartão explica o que é o reprocessamento manual.',
      alvo: '.bo19-manual',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto:
        'O cartão de segurança traz o identificador da sessão e abre as regras e boas práticas.',
      alvo: '.bo19-security',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Risco operacional',
      texto: 'O medidor de risco avisa o quanto o reprocesso manual exige cuidado.',
      alvo: '.bo19-risk',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Suporte técnico',
      texto: 'Por fim, o atalho para abrir um chamado de suporte técnico.',
      alvo: '.bo19-support',
      acao: { tipo: 'observar' },
    },
  ],
};

const completo: Roteiro = {
  id: 'backoffice-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os seis roteiros em sequência, dos dashboards ao reprocesso.',
  duracao: '≈ 20 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: (ctx) => {
    return [
      ...emSecao(visaoGeral, ctx, { primeira: true }),
      ...emSecao(indicadores, ctx),
      ...emSecao(fila, ctx),
      ...emSecao(tratar, ctx),
      ...emSecao(reprocessos, ctx),
      ...emSecao(reprocessar, ctx),
    ];
  },
};

export const ROTEIROS_BACKOFFICE: Roteiro[] = [
  completo,
  visaoGeral,
  indicadores,
  fila,
  tratar,
  reprocessos,
  reprocessar,
];

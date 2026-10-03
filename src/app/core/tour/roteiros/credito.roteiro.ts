import { Roteiro } from '../tour.model';
import { peloMenu, emSecao } from './passos-comuns';

// Tours assistidos do modulo de Credito. Roda para qualquer papel que alcance o modulo (backoffice,
// financeiro e administracao) e nao pede TOTP: nenhum passo mexe em papel ou em credencial.

const MODULO = 'Crédito';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE'];

const ROTA_DETALHE = /^\/app\/credito\/propostas\/(?!nova)[^/?]+(\?.*)?$/;

const MENU_CREDITO = {
  rota: '/app/credito',
  titulo: 'Menu Crédito',
  texto:
    'No menu lateral, em Jornadas, fica o Crédito. Ele aparece para backoffice, financeiro e administração.',
  aguardarAlvo: '.credit-metrics',
};

const MENU_PROPOSTAS = {
  rota: '/app/credito/propostas',
  titulo: 'Submenu Propostas',
  texto: 'Dentro do Crédito, o submenu Propostas abre a lista de todas as propostas.',
  aguardarAlvo: '.proposals-table-card tbody tr',
};

const MENU_NOVA = {
  rota: '/app/credito/propostas/nova',
  titulo: 'Submenu Nova proposta',
  texto: 'E o submenu Nova proposta abre o formulário para solicitar crédito.',
  aguardarAlvo: '.proposal-create-page form',
};

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'credito-visao-geral',
  modulo: MODULO,
  titulo: 'Visão geral do módulo',
  icone: 'layout-dashboard',
  descricao: 'A porta de entrada do Crédito: elegibilidade, resumo das propostas e atalhos.',
  duracao: '≈ 1 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra a página inicial do Crédito. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_CREDITO),
    {
      titulo: 'Elegibilidade',
      texto:
        'No alto, o cartão confirma que o onboarding foi aprovado. É isso que libera pedir crédito.',
      alvo: '.approval-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo das propostas',
      texto: 'Os indicadores mostram quantas propostas existem e em que situação cada uma está.',
      alvo: '.credit-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Minhas propostas',
      texto: 'O gráfico divide as propostas por situação. O botão abaixo abre a lista completa.',
      alvo: '.proposal-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Nova proposta',
      texto: 'Aqui começa uma nova solicitação. Ela tem um roteiro próprio, passo a passo.',
      alvo: '.new-proposal-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Simule seu crédito',
      texto: 'A simulação mostra parcela e custo estimados antes de enviar a proposta.',
      alvo: '.small-card.simulate',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto:
        'E o lembrete de que a operação segue as regras de segurança e de conformidade do SEP.',
      alvo: '.small-card.security',
      acao: { tipo: 'observar' },
    },
  ],
};

const propostas: Roteiro = {
  id: 'credito-propostas',
  modulo: MODULO,
  titulo: 'Minhas propostas',
  icone: 'folder-open',
  descricao: 'Cartões que filtram, teto do regimento, busca e a tabela de propostas.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Minhas propostas',
      texto: 'Vamos percorrer a lista de propostas: os cartões, o limite, a busca e a tabela.',
    },
    ...peloMenu(MENU_CREDITO, MENU_PROPOSTAS),
    {
      titulo: 'Resumo por situação',
      texto:
        'Os quatro cartões resumem o limite e as propostas em análise, aprovadas e pendentes. Os números saem das propostas carregadas.',
      alvo: '.proposal-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ver aprovadas',
      texto: 'Cada cartão é um atalho: este filtra a tabela só pelas propostas aprovadas.',
      alvo: { css: '.metric-action', texto: 'Ver aprovadas' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Acompanhar',
      texto: 'E este mostra as que ainda estão em análise. O cartão escolhido fica destacado.',
      alvo: { css: '.metric-action', texto: 'Acompanhar' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Detalhes do limite',
      texto: 'O primeiro cartão abre os detalhes do limite de crédito.',
      alvo: { css: '.metric-action', texto: 'Ver detalhes do limite' },
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.limit-dialog',
    },
    {
      titulo: 'Teto do regimento',
      texto:
        'O teto por proposta é de quinze mil reais, definido pelo regimento do SEP. Abaixo dele, o painel mostra o que já está em análise e aprovado.',
      alvo: '.limit-dialog',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Fechar o painel',
      texto: 'O painel se fecha por este botão, ou pela tecla Esc.',
      alvo: '.limit-close',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Voltar a todas',
      texto: 'Na tabela, o filtro de status volta para Todos e a lista mostra tudo de novo.',
      alvo: '.proposal-filters select',
      acao: { tipo: 'selecionar', opcao: 'Todos' },
    },
    {
      titulo: 'Buscar uma proposta',
      texto:
        'A busca aceita parte do identificador, do tipo ou do valor, e filtra enquanto se digita.',
      alvo: '.search-field input',
      acao: { tipo: 'digitar', texto: () => '5b771c03' },
    },
    {
      titulo: 'Ocultar o valor',
      texto:
        'O olho esconde o valor solicitado, útil quando a tela está sendo mostrada a outras pessoas.',
      alvo: '.actions button[aria-label="Ocultar valor solicitado"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Mostrar o valor',
      texto: 'Clicando de novo, o valor volta a aparecer.',
      alvo: '.actions button[aria-label="Mostrar valor solicitado"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Abrir o detalhe',
      texto:
        'O número da proposta é um link: ele abre o detalhe completo. Há um roteiro só para isso.',
      alvo: '.proposals-table-card tbody a',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Limpar a busca',
      texto: 'Apagando a busca, a tabela volta completa.',
      alvo: '.search-field input',
      acao: { tipo: 'digitar', texto: () => '' },
    },
    {
      titulo: 'Nova proposta',
      texto: 'E, ao lado dos filtros, o botão Nova proposta abre o formulário de solicitação.',
      alvo: 'a.new-proposal',
      acao: { tipo: 'observar' },
    },
  ],
};

const nova: Roteiro = {
  id: 'credito-nova',
  modulo: MODULO,
  titulo: 'Solicitar nova proposta',
  icone: 'file-plus',
  descricao: 'O formulário completo, o teto de R$ 15.000, a simulação e o envio.',
  duracao: '≈ 2,5 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Solicitar crédito',
      texto:
        'Vamos preencher uma proposta de seis mil reais em doze meses, do menu até a tela de acompanhamento.',
    },
    ...peloMenu(MENU_CREDITO, MENU_NOVA),
    {
      titulo: 'Origem da proposta',
      texto:
        'A proposta nasce de um onboarding aprovado, que já vem selecionado. Quem não passou pelo onboarding não consegue pedir crédito.',
      alvo: 'select[formControlName="solicitacaoOnboardingId"]',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Finalidade',
      texto: 'Em detalhes da operação, a finalidade diz para que o recurso será usado.',
      alvo: 'select[formControlName="finalidade"]',
      acao: { tipo: 'selecionar', opcao: 'Capital de giro' },
    },
    {
      titulo: 'Valor acima do teto',
      texto:
        'Primeiro, um valor acima do permitido: vinte mil reais. O limite de uma proposta é de quinze mil.',
      alvo: '.money-control input',
      acao: { tipo: 'digitar', texto: () => '2000000' },
      aguardarAlvo: '.field-error',
    },
    {
      titulo: 'A trava do teto',
      texto:
        'O formulário recusa na hora e explica o motivo. O teto vale para todas as propostas, pessoa física ou jurídica.',
      alvo: '.field-error',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Valor dentro do limite',
      texto: 'Corrigimos para seis mil reais. O campo formata sozinho, e o erro some.',
      alvo: '.money-control input',
      acao: { tipo: 'digitar', texto: () => '600000' },
    },
    {
      titulo: 'Prazo',
      texto: 'O prazo, em meses, define o número de parcelas. Escolhemos doze.',
      alvo: 'select[formControlName="prazoMeses"]',
      acao: { tipo: 'selecionar', opcao: '12' },
    },
    {
      titulo: 'Observações',
      texto: 'O campo de observações é opcional, e aceita até quinhentos caracteres.',
      alvo: 'textarea[formControlName="descricao"]',
      acao: { tipo: 'digitar', texto: () => 'Compra de estoque para a alta temporada.' },
    },
    {
      titulo: 'Simulação',
      texto:
        'Com valor e prazo, a simulação calcula parcela, taxa, imposto e custo total estimados. As condições finais só saem depois da análise.',
      alvo: '.simulation-section',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da solicitação',
      texto: 'Ao lado, o resumo acompanha o que está sendo preenchido.',
      alvo: '.summary-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Enviar proposta',
      texto: 'Tudo preenchido. Clicamos em Enviar proposta.',
      alvo: '.submit-button',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_DETALHE,
      aguardarAlvo: '.px28-metricas',
    },
    {
      titulo: 'Proposta criada',
      texto:
        'O sistema abre o detalhe da nova proposta. Ela nasce em análise, e a equipe de crédito passa a acompanhá-la.',
      alvo: '.px28-heading',
      acao: { tipo: 'observar' },
    },
  ],
};

const acompanhar: Roteiro = {
  id: 'credito-acompanhar',
  modulo: MODULO,
  titulo: 'Acompanhar uma proposta',
  icone: 'activity',
  descricao: 'O detalhe: valores, linha do tempo, as três seções, análise, resumo e ações.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Acompanhar uma proposta',
      texto: 'Vamos abrir uma proposta e ver o que o detalhe mostra sobre a análise.',
    },
    ...peloMenu(MENU_CREDITO, MENU_PROPOSTAS),
    {
      titulo: 'Abrir a proposta',
      texto: 'Na tabela, o número da proposta abre o detalhe.',
      alvo: '.proposals-table-card tbody a',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_DETALHE,
      aguardarAlvo: '.px28-metricas',
    },
    {
      titulo: 'Valores da proposta',
      texto: 'No alto, o valor solicitado, o prazo, a parcela estimada e a taxa.',
      alvo: '.px28-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Dados da proposta',
      texto: 'Aqui ficam a empresa, o tipo de operação, a finalidade e as datas.',
      alvo: '.px28-dados',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo',
      texto: 'A linha do tempo mostra em que etapa a análise está e o que já foi concluído.',
      alvo: '.px28-timeline',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações complementares',
      texto:
        'Abaixo da linha do tempo ficam três seções que se abrem, uma de cada vez. A primeira é a de informações complementares.',
      alvo: { css: '.px28-secao-cabecalho', texto: 'Informações complementares' },
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px28-secao-conteudo',
    },
    {
      titulo: 'O que traz a seção',
      texto:
        'Taxa estimada, parcela estimada, garantia, canal de origem, o responsável pela análise e as observações da proposta.',
      alvo: '.px28-secao.aberta',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Documentos anexados',
      texto: 'A segunda seção é a dos documentos anexados. Abrir uma fecha a anterior.',
      alvo: { css: '.px28-secao-cabecalho', texto: 'Documentos anexados' },
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px28-docs',
    },
    {
      titulo: 'Os documentos da proposta',
      texto:
        'Cada documento aparece com o nome, o tipo, o tamanho e a data em que foi enviado. Sem nenhum anexo, a seção avisa que não há documentos.',
      alvo: '.px28-secao.aberta',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Acompanhar análise',
      texto:
        'A terceira seção é a do histórico, e o botão Acompanhar análise, no alto, abre direto nela. Ela traz cada evento e quem o registrou.',
      alvo: { css: '.px28-heading-acoes .px28-btn-primary', texto: 'Acompanhar análise' },
      acao: { tipo: 'clicar' },
      // O conteudo do historico, e nao "alguma secao aberta": a dos documentos ja esta aberta e
      // satisfaria a espera na hora, deixando o destaque na secao errada.
      aguardarAlvo: '.px28-historico',
    },
    {
      titulo: 'Histórico',
      texto: 'O histórico registra cada passo, em ordem, com autor e horário.',
      alvo: '.px28-secao.aberta',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Análise e aprovação',
      texto:
        'À direita, o andamento da análise, o score do motor de crédito e o parecer, quando já existem.',
      alvo: '.px28-analise',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da proposta',
      texto:
        'Ainda à direita, o resumo: valor solicitado, prazo, valor estimado das parcelas, tipo, situação e a data de criação.',
      alvo: '.px28-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto:
        'E o cartão de conformidade: ambiente regulado, dados protegidos pela LGPD, processo auditado, rastreabilidade e segregação patrimonial por conta escrow.',
      alvo: '.px28-seguranca',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'Embaixo, as ações disponíveis. Ir para formalização só habilita quando a proposta é aprovada.',
      alvo: '.px28-actions',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Mais ações',
      texto: 'O menu de três pontos copia o identificador e leva de volta à lista.',
      alvo: 'button[aria-label="Mais ações da proposta"]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px28-menu',
    },
    {
      titulo: 'Fechar o menu',
      texto: 'Clicando de novo no mesmo botão, o menu se fecha.',
      alvo: 'button[aria-label="Mais ações da proposta"]',
      acao: { tipo: 'clicar' },
    },
  ],
};

const completo: Roteiro = {
  id: 'credito-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os quatro roteiros em sequência: visão geral, propostas, nova proposta e detalhe.',
  duracao: '≈ 9 min',
  papeis: PAPEIS,
  passos: (ctx) => {
    return [
      ...emSecao(visaoGeral, ctx, { primeira: true }),
      ...emSecao(propostas, ctx),
      ...emSecao(nova, ctx),
      ...emSecao(acompanhar, ctx),
    ];
  },
};

export const ROTEIROS_CREDITO: Roteiro[] = [completo, visaoGeral, propostas, nova, acompanhar];

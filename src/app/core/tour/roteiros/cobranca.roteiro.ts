import { PassoRoteiro, Roteiro } from '../tour.model';
import { ROTA_STEP_UP, confirmarComTotp, peloMenu, emSecao } from './passos-comuns';

// Tours assistidos da Cobranca. A tela inicial e dos tres papeis operacionais; a agenda financeira,
// a inadimplencia e a parcela sao do financeiro e da administracao (o roteiro nao aparece para o
// backoffice). Registrar contato e recebimento grava dados e so executa em demonstracao; propor
// renegociacao ainda pede TOTP, como o sistema pede.

const MODULO = 'Cobrança';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE'];
const PAPEIS_FINANCEIROS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO'];

const ROTA_AGENDA_CONTRATO = /^\/app\/cobranca\/contratos\/[^/?]+\/agenda(\?.*)?$/;
const ROTA_PARCELA = /^\/app\/cobranca\/financeiro\/parcelas\/[^/?]+(\?.*)?$/;

const MENU_COBRANCA = {
  rota: '/app/cobranca',
  titulo: 'Menu Cobrança',
  texto:
    'No menu lateral, em Jornadas, fica a Cobrança. Ela aparece para backoffice, financeiro e administração.',
  aguardarAlvo: '.metric-grid',
};

const MENU_AGENDA = {
  rota: '/app/cobranca/financeiro/agenda',
  titulo: 'Submenu Agenda financeira',
  texto: 'Dentro da Cobrança, o submenu Agenda financeira abre os recebimentos registrados.',
  aguardarAlvo: '.px29-tabela-card',
};

const MENU_INADIMPLENCIA = {
  rota: '/app/cobranca/financeiro/inadimplencia',
  titulo: 'Submenu Inadimplência',
  texto: 'E o submenu Inadimplência abre as parcelas atrasadas, para triagem.',
  aguardarAlvo: '.px30-tabela-card',
};

const IMPEDIMENTO_TOTP: Roteiro['impedimento'] = (ctx) =>
  ctx.mfa
    ? null
    : 'Requer uma conta com TOTP ativo, porque propor uma renegociação pede confirmação. Entre como admin@empresa.com.';

/** Da inadimplencia ate a primeira parcela aberta, como faria um operador. */
function abrirPrimeiraParcela(): PassoRoteiro[] {
  return [
    {
      titulo: 'Abrir a parcela',
      texto:
        'O olho na linha abre o detalhe da parcela. Clicando no código da parcela, o resultado é o mesmo.',
      alvo: '.px30-tabela-card tbody tr:first-child button[title="Abrir detalhe da parcela"]',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_PARCELA,
      aguardarAlvo: '.px31-resumo',
    },
  ];
}

/** Os cinco campos da renegociacao, na ordem em que o formulario os pede. */
function preencherRenegociacao(ctx: { retomada: boolean }): PassoRoteiro[] {
  const retomada = ctx.retomada;
  return [
    {
      titulo: retomada ? 'Novo valor, de novo' : 'Novo valor por parcela',
      texto: retomada
        ? 'Ao voltar da confirmação, o formulário recomeça vazio. Os mesmos dados entram outra vez.'
        : 'A renegociação propõe um valor menor por parcela. Aqui, novecentos e cinquenta reais.',
      alvo: '#reneg-valor',
      acao: { tipo: 'digitar', texto: () => '95000' },
    },
    {
      titulo: 'Primeiro vencimento',
      texto: 'O vencimento inicial é a data da primeira parcela do acordo.',
      alvo: '#reneg-venc',
      acao: { tipo: 'digitar', texto: () => '2026-12-10' },
    },
    {
      titulo: 'Número de parcelas',
      texto: 'E o número de parcelas define em quantas vezes o acordo será pago.',
      alvo: '#reneg-num',
      acao: { tipo: 'digitar', texto: () => '6' },
    },
    {
      titulo: 'Desconto',
      texto: 'O desconto é o abatimento concedido sobre o valor devido, que pode ser zero.',
      alvo: '#reneg-desc',
      acao: { tipo: 'digitar', texto: () => '5000' },
    },
    {
      titulo: 'Justificativa',
      texto: 'Toda proposta leva uma justificativa, que fica registrada.',
      alvo: '#reneg-just',
      acao: { tipo: 'digitar', texto: () => 'Proposta de demonstração (tour assistido).' },
    },
  ];
}

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'cobranca-visao-geral',
  modulo: MODULO,
  titulo: 'Visão geral da cobrança',
  icone: 'layout-dashboard',
  descricao:
    'Indicadores, filtros, contratos ativos, parcelas, inadimplência e os painéis laterais.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra a página inicial da Cobrança. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_COBRANCA),
    {
      titulo: 'Para que serve',
      texto:
        'A Cobrança acompanha as parcelas, os recebimentos e as renegociações dos contratos ativos.',
      alvo: '.billing-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Indicadores',
      texto:
        'Quatro cartões resumem a carteira: valor total contratado, valor em aberto, atraso de mais de quinze dias e o próximo vencimento.',
      alvo: '.metric-grid',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Filtros',
      texto:
        'A faixa de filtros recorta a tela por situação do contrato, situação da parcela e período de vencimento.',
      alvo: '.filters',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Contratos atrasados',
      texto:
        'Escolhendo Atrasado no status do contrato, a lista mostra só os contratos com atraso.',
      alvo: '.filters label:nth-of-type(1) select',
      acao: { tipo: 'selecionar', opcao: 'Atrasado' },
    },
    {
      titulo: 'Voltar a todos',
      texto: 'Voltando para Todos, a carteira reaparece inteira.',
      alvo: '.filters label:nth-of-type(1) select',
      acao: { tipo: 'selecionar', opcao: 'Todos' },
    },
    {
      titulo: 'Situação da parcela',
      texto:
        'O filtro de parcela separa pagas, pendentes, atrasadas e agendadas. Escolhendo Atrasada, a tabela mostra só elas.',
      alvo: '.filters label:nth-of-type(2) select',
      acao: { tipo: 'selecionar', opcao: 'Atrasada' },
    },
    {
      titulo: 'Limpar o filtro',
      texto: 'E Todas devolve a lista completa.',
      alvo: '.filters label:nth-of-type(2) select',
      acao: { tipo: 'selecionar', opcao: 'Todas' },
    },
    {
      titulo: 'Período de vencimento',
      texto:
        'Os dois campos de data limitam os vencimentos que aparecem, de uma data inicial até uma final.',
      alvo: '.filters label:nth-of-type(3)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Mais filtros',
      texto:
        'O botão Mais filtros abre uma faixa extra, com a opção de ocultar os valores da tela.',
      alvo: '.more-filters',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.advanced-filters',
      // Se a faixa ja estiver aberta, clicar a fecharia: o passo so segue.
      pularSe: () => !!document.querySelector('.advanced-filters'),
    },
    {
      titulo: 'Ocultar valores',
      texto:
        'Ocultar valores troca todos os números por pontinhos. É útil quando a tela vai ser vista por outras pessoas.',
      alvo: '.advanced-filters button',
      acao: { tipo: 'clicar' },
      pularSe: () => !document.querySelector('.advanced-filters'),
    },
    {
      titulo: 'Mostrar de novo',
      texto: 'Um novo clique mostra os valores outra vez.',
      alvo: '.advanced-filters button',
      acao: { tipo: 'clicar' },
      pularSe: () => !document.querySelector('.advanced-filters'),
    },
    {
      titulo: 'Fechar os filtros extras',
      texto: 'E clicar em Mais filtros recolhe a faixa.',
      alvo: '.more-filters',
      acao: { tipo: 'clicar' },
      pularSe: () => !document.querySelector('.advanced-filters'),
    },
    {
      titulo: 'Exportar relatório',
      texto:
        'Exportar relatório baixa em planilha as parcelas que estão na tela, já com os filtros. Aqui só mostramos o botão, para não abrir a janela de download.',
      alvo: '.export-button',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Contratos ativos',
      texto:
        'À esquerda, os contratos ativos. Cada um mostra o número, o tipo de operação, a situação, o valor contratado e o valor em aberto.',
      alvo: '.contracts-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Escolher um contrato',
      texto: 'Clicando em um contrato, a tabela ao lado passa a mostrar as parcelas dele.',
      alvo: '.contract-list button:nth-child(2)',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Parcelas do contrato',
      texto:
        'A tabela traz número, vencimento, valor, situação, dias em atraso e as ações de cada parcela.',
      alvo: '.installments-card .table-wrap',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ocultar o valor de uma parcela',
      texto: 'O olho na linha oculta só o valor daquela parcela.',
      alvo: '.installments-card tbody tr:first-child button[aria-label="Ocultar valor da parcela"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Mostrar o valor',
      texto: 'E um novo clique mostra o valor de volta.',
      alvo: '.installments-card tbody tr:first-child button[aria-label="Mostrar valor da parcela"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Legenda das situações',
      texto:
        'No rodapé da tabela, a legenda das quatro situações: paga, pendente, atrasada e agendada.',
      alvo: '.installments-card > footer',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo de inadimplência',
      texto:
        'A faixa seguinte divide a carteira por tempo de atraso: em dia, de um a quinze dias, de dezesseis a trinta e acima de trinta. O círculo mostra o índice atual.',
      alvo: '.delinquency',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Acordos ativos',
      texto:
        'O último cartão da faixa lembra os acordos de renegociação em vigor e o valor acordado.',
      alvo: '.delinquency .agreements',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Jornada de cobrança',
      texto:
        'Na coluna da direita, o primeiro cartão trata da jornada de cobrança: lembretes e notificações para acompanhar a carteira. O botão liga e desliga a configuração.',
      alvo: '.journey-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Alertas',
      texto:
        'Os alertas avisam das parcelas em atraso e dos vencimentos do dia seguinte. O link abre a inadimplência.',
      alvo: '.alerts-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Renegociações',
      texto:
        'O círculo mostra quantas renegociações existem e a divisão por situação. Esses números vêm da carteira de renegociações.',
      alvo: '.renegotiations',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Recebimentos',
      texto:
        'Por fim, o gráfico de recebimentos dos últimos trinta dias, com a comparação ao período anterior.',
      alvo: '.receipts',
      acao: { tipo: 'observar' },
    },
  ],
};

const agendaContrato: Roteiro = {
  id: 'cobranca-agenda-contrato',
  modulo: MODULO,
  titulo: 'Agenda de um contrato',
  icone: 'calendar-clock',
  descricao: 'Parcelas de um contrato: liquidez, abas, próximas parcelas, atrasos e documentos.',
  duracao: '≈ 2,5 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Agenda de um contrato',
      texto: 'Vamos abrir a agenda de um contrato, a partir da Cobrança, e percorrer a tela.',
    },
    ...peloMenu(MENU_COBRANCA),
    {
      titulo: 'Ver contrato',
      texto:
        'O link Ver contrato, no alto da tabela de parcelas, abre a agenda do contrato selecionado.',
      alvo: '.installments-card > header a',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_AGENDA_CONTRATO,
      aguardarAlvo: '.px32-tabela-card',
    },
    {
      titulo: 'Cabeçalho',
      texto:
        'O título traz o número do contrato, com um botão para copiar o identificador completo. O botão Exportar relatório baixa a agenda.',
      alvo: '.px32-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Painel do contrato',
      texto:
        'A faixa mostra os dados do contrato: identificação, tomador, valor, prazo, parcelas em aberto e atrasadas.',
      alvo: '.px32-contrato',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Indicadores',
      texto:
        'Quatro cartões acompanham o contrato: o que já foi recebido, o que está em aberto, o que está em atraso e o que vence a seguir. A barra de cada um mostra a proporção do total.',
      alvo: '.px32-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Liquidez do contrato',
      texto:
        'O anel resume a saúde do contrato em um percentual. Quanto mais atraso, menor a liquidez.',
      alvo: '.px32-liquidez',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Agenda de parcelas',
      texto:
        'A tabela lista todas as parcelas do contrato, com vencimento, valor, situação e ações.',
      alvo: '.px32-tabela-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Aba Atrasadas',
      texto: 'As abas filtram a tabela. Em Atrasadas, só as parcelas vencidas e não pagas.',
      alvo: { css: '.px32-abas button', texto: 'Atrasadas' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Aba Pagas',
      texto: 'Em Pagas, o que já foi recebido.',
      alvo: { css: '.px32-abas button', texto: 'Pagas' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Voltar a Todas',
      texto: 'E Todas mostra o contrato inteiro de novo.',
      alvo: { css: '.px32-abas button', texto: 'Todas' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Próximas parcelas',
      texto:
        'À direita, a lista das próximas parcelas a vencer, com a data, o valor e quantos dias faltam.',
      alvo: { css: '.px32-lista', texto: 'Próximas parcelas' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Parcelas em atraso',
      texto: 'Logo abaixo, as parcelas em atraso, com os dias de atraso de cada uma.',
      alvo: { css: '.px32-lista', texto: 'Parcelas em atraso' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas levam à parcela para registrar um recebimento ou negociar. Enviar lembrete ainda não tem serviço por trás, por isso aparece desabilitado.',
      alvo: '.px32-actions',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Documentos do contrato',
      texto: 'Por último, os documentos ligados ao contrato, com atalho para a Formalização.',
      alvo: '.px32-documentos',
      acao: { tipo: 'observar' },
    },
  ],
};

const agendaFinanceira: Roteiro = {
  id: 'cobranca-agenda-financeira',
  modulo: MODULO,
  titulo: 'Agenda financeira',
  icone: 'calendar-days',
  descricao:
    'Recebimentos registrados, totais, gráficos por status e método e próximos vencimentos.',
  duracao: '≈ 2,5 min',
  papeis: PAPEIS_FINANCEIROS,
  passos: () => [
    {
      titulo: 'Agenda financeira',
      texto:
        'Este roteiro mostra a agenda financeira, a visão do financeiro sobre os recebimentos.',
    },
    ...peloMenu(MENU_COBRANCA, MENU_AGENDA),
    {
      titulo: 'Cabeçalho',
      texto:
        'A tela traz os recebimentos registrados. A nota esclarece que os totais são somados a partir deles. Exportar baixa a lista; o botão Filtros ainda não tem serviço por trás.',
      alvo: '.px29-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir parcela por ID',
      texto:
        'Quem já tem o identificador da parcela digita aqui e abre o detalhe direto. Cada parcela é identificada por um UUID.',
      alvo: '.px29-lookup',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Totais',
      texto:
        'Os cartões somam o recebido no dia e no mês e, quando há, o que está a vencer e o que está em atraso.',
      alvo: '.px29-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Recebimentos registrados',
      texto:
        'A tabela traz cada recebimento: parcela, contrato, recebedor, vencimento, valor, pagamento, situação e método.',
      alvo: '.px29-tabela-wrap',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Paginação',
      texto: 'O rodapé mostra quantos recebimentos estão na tela e deixa folhear, dez por página.',
      alvo: '.px29-tabela-rodape',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Por status',
      texto: 'O primeiro gráfico divide os recebimentos do mês por situação.',
      alvo: '.px29-status',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Por método',
      texto: 'O segundo mostra por qual meio o dinheiro chegou: Pix, boleto, transferência.',
      alvo: '.px29-metodo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Evolução',
      texto:
        'O terceiro acompanha os recebimentos dos últimos sete dias e aponta o pico do período.',
      alvo: '.px29-evolucao',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo financeiro',
      texto:
        'Na coluna da direita, o resumo repete a divisão por situação, com o total do mês no centro.',
      alvo: '.px29-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Próximos vencimentos',
      texto:
        'A lista de próximos vencimentos mostra a parcela, a data, o valor e os dias que faltam.',
      alvo: '.px29-proximos',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas abrem uma parcela por ID, exportam o relatório e levam à inadimplência. Gerar boletos ainda não tem serviço por trás.',
      alvo: '.px29-actions',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto:
        'E o último cartão confirma ambiente regulado, auditoria, proteção de dados pela LGPD e integridade do total conferido.',
      alvo: '.px29-seguranca',
      acao: { tipo: 'observar' },
    },
  ],
};

const inadimplencia: Roteiro = {
  id: 'cobranca-inadimplencia',
  modulo: MODULO,
  titulo: 'Inadimplência',
  icone: 'triangle-alert',
  descricao: 'Filtros por atraso e situação, tabela de parcelas, exposição por contrato e ações.',
  duracao: '≈ 3 min',
  papeis: PAPEIS_FINANCEIROS,
  passos: () => [
    {
      titulo: 'Inadimplência',
      texto: 'Este roteiro mostra a triagem das parcelas atrasadas.',
    },
    ...peloMenu(MENU_COBRANCA, MENU_INADIMPLENCIA),
    {
      titulo: 'Para que serve',
      texto:
        'A tela reúne as parcelas atrasadas e inadimplentes, para o financeiro decidir quem contatar primeiro.',
      alvo: '.px30-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Filtros',
      texto: 'Os filtros limitam por faixa de dias de atraso e por situação.',
      alvo: '.px30-filtros',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Dias de atraso',
      texto:
        'O primeiro campo é o atraso mínimo, em dias. Com dez, ficam só as parcelas com dez dias de atraso ou mais.',
      alvo: '.px30-filtros input[formcontrolname="diasAtrasoMin"]',
      acao: { tipo: 'digitar', texto: () => '10' },
    },
    {
      titulo: 'Aplicar filtros',
      texto: 'Aplicar filtros refaz a consulta com os critérios digitados.',
      alvo: '.px30-filtros button[type="submit"]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px30-tabela-card',
    },
    {
      titulo: 'Limpar',
      texto: 'Limpar apaga os critérios e traz todas as parcelas de volta.',
      alvo: '.px30-btn-limpar',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px30-tabela-card',
    },
    {
      titulo: 'Totais por faixa',
      texto:
        'Os cartões somam o total em atraso e dividem por faixa de dias. Cada um mostra o valor e o número de parcelas.',
      alvo: '.px30-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Parcelas inadimplentes',
      texto:
        'A tabela mostra parcela, contrato, tomador, vencimento, dias de atraso, valor e situação.',
      alvo: '.px30-tabela-wrap',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Mais ações',
      texto:
        'Cada linha tem três ações: abrir o detalhe, registrar contato (ainda sem serviço, por isso desabilitado) e um menu com mais opções.',
      alvo: '.px30-tabela-card tbody tr:first-child .px30-acoes',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir o menu da linha',
      texto: 'O menu de três pontos abre as opções da parcela.',
      alvo: '.px30-tabela-card tbody tr:first-child button[aria-expanded]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px30-menu',
    },
    {
      titulo: 'Opções do menu',
      texto: 'Abrir a parcela, copiar o identificador dela ou ver a parcela na agenda financeira.',
      alvo: '.px30-menu',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Fechar o menu',
      texto: 'Clicando de novo no mesmo botão, o menu se fecha.',
      alvo: '.px30-tabela-card tbody tr:first-child button[aria-expanded]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Paginação',
      texto: 'O rodapé informa quantas parcelas estão visíveis e deixa folhear.',
      alvo: '.px30-tabela-rodape',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da inadimplência',
      texto: 'À direita, o círculo mostra o total em atraso e a participação de cada faixa.',
      alvo: '.px30-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Exposição por contrato',
      texto:
        'A exposição lista os cinco contratos com mais valor em atraso, com uma barra proporcional e o número de parcelas.',
      alvo: '.px30-exposicao',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'Exportar inadimplentes baixa a lista. Gerar notificações, enviar cobrança e negociar em lote ainda não têm serviço por trás, e aparecem desabilitados.',
      alvo: '.px30-actions',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto: 'Por fim, o cartão de conformidade, com o total conferido.',
      alvo: '.px30-seguranca',
      acao: { tipo: 'observar' },
    },
  ],
};

const parcela: Roteiro = {
  id: 'cobranca-parcela',
  modulo: MODULO,
  titulo: 'Atender uma parcela',
  icone: 'receipt',
  descricao: 'O detalhe da parcela, o registro de um contato e de um recebimento.',
  duracao: '≈ 4 min',
  papeis: PAPEIS_FINANCEIROS,
  passos: () => [
    {
      titulo: 'Atender uma parcela',
      texto:
        'Vamos abrir uma parcela atrasada, ler o detalhe e registrar um contato e um recebimento.',
    },
    ...peloMenu(MENU_COBRANCA, MENU_INADIMPLENCIA),
    {
      titulo: 'Só as atrasadas',
      texto:
        'Para registrar um recebimento, a parcela precisa estar atrasada ou pendente. Filtrando por Atrasada, a lista traz só as que aceitam o recebimento.',
      alvo: '.px30-filtros select',
      acao: { tipo: 'selecionar', opcao: 'Atrasada' },
    },
    {
      titulo: 'Aplicar o filtro',
      texto: 'Aplicar filtros refaz a lista.',
      alvo: '.px30-filtros button[type="submit"]',
      acao: { tipo: 'clicar' },
      // Com o filtro, sobra uma linha so; a tabela antiga tem varias, entao a espera nao passa antes da recarga.
      aguardarAlvo: '.px30-tabela-card tbody tr:only-child',
    },
    ...abrirPrimeiraParcela(),
    {
      titulo: 'Cabeçalho da parcela',
      texto:
        'O título traz o número da parcela e a situação. Imprimir gera a página para papel, e Mais ações abre atalhos para a agenda, a inadimplência e o contrato.',
      alvo: '.px31-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da parcela',
      texto:
        'O resumo abre a conta: principal, juros, juros de mora, multa e o total já recebido. Embaixo, o valor devido atualizado e o valor em aberto.',
      alvo: '.px31-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações da parcela',
      texto:
        'As informações trazem o contrato, o número da parcela, o vencimento, a situação, os dias em atraso, o meio de pagamento, os valores e a última atualização.',
      alvo: '.px31-informacoes',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Status da parcela',
      texto:
        'O cartão de status explica a situação em uma frase. Registrar recebimento leva ao formulário, e o botão ao lado copia a linha digitável do boleto.',
      alvo: '.px31-status',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Registrar contato',
      texto: 'O primeiro formulário registra um contato feito com o tomador.',
      alvo: '.px31-form-contato',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Descrição do contato',
      texto: 'A descrição conta o que foi tratado na conversa.',
      alvo: '#cont-descricao',
      acao: {
        tipo: 'digitar',
        texto: () => 'Tomador contatado por telefone; combinou pagamento (demonstração).',
      },
    },
    {
      titulo: 'Dias de atraso',
      texto:
        'Os dias de atraso são opcionais. Os campos de tipo e responsável aguardam o serviço correspondente.',
      alvo: '#cont-dias',
      acao: { tipo: 'digitar', texto: () => '15' },
    },
    {
      titulo: 'Registrar o contato',
      texto: 'O botão grava o contato no histórico da parcela.',
      alvo: { css: '.px31-form-contato button[type="submit"]', texto: 'Registrar contato' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.px31-form-contato .px31-form-ok',
    },
    {
      titulo: 'Contato registrado',
      texto: 'A mensagem confirma o registro.',
      alvo: '.px31-form-contato .px31-form-ok',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Registrar recebimento',
      texto: 'O segundo formulário registra um pagamento recebido nesta parcela.',
      alvo: '.px31-form-receb',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Valor recebido',
      texto: 'O valor recebido é o que entrou. Aqui, mil duzentos e cinquenta reais.',
      alvo: '#rec-valor',
      acao: { tipo: 'digitar', texto: () => '125000' },
    },
    {
      titulo: 'Data do recebimento',
      texto: 'E a data e a hora em que o dinheiro chegou.',
      alvo: '#rec-data',
      acao: { tipo: 'digitar', texto: () => '2026-10-02T10:30' },
    },
    {
      titulo: 'Meio de pagamento',
      texto: 'O meio de pagamento já vem com Pix. A lista traz também os outros meios aceitos.',
      alvo: '#rec-meio',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Identificador externo',
      texto: 'O identificador externo, opcional, amarra o registro ao comprovante do banco.',
      alvo: '#rec-ident',
      acao: { tipo: 'digitar', texto: () => 'DEMO-0001' },
    },
    {
      titulo: 'Observação',
      texto: 'E a observação guarda qualquer detalhe que a equipe precise lembrar.',
      alvo: '#rec-obs',
      acao: { tipo: 'digitar', texto: () => 'Recebimento de demonstração (tour assistido).' },
    },
    {
      titulo: 'Registrar o recebimento',
      texto:
        'O botão grava o recebimento. Se o clique se repetir, o sistema reconhece a repetição pela chave de idempotência e não cobra duas vezes.',
      alvo: { css: '.px31-form-receb button[type="submit"]', texto: 'Registrar recebimento' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.px31-form-receb .px31-form-ok',
    },
    {
      titulo: 'Recebimento registrado',
      texto: 'A mensagem confirma o registro, e o recebimento entra no histórico da parcela.',
      alvo: '.px31-form-receb .px31-form-ok',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Propor renegociação',
      texto:
        'O terceiro formulário propõe um acordo para a parcela atrasada. Ele tem um roteiro próprio, porque pede confirmação por TOTP.',
      alvo: '.px31-form-reneg',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Histórico da parcela',
      texto:
        'O histórico lista os eventos da parcela, do mais recente ao mais antigo, com a origem de cada um. O contato e o recebimento que acabamos de registrar aparecem aqui.',
      alvo: '.px31-historico',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Histórico completo',
      texto: 'Quando há mais de três eventos, o botão abre a lista inteira.',
      alvo: '.px31-historico .px31-link-todos',
      acao: { tipo: 'clicar' },
      pularSe: () => !document.querySelector('.px31-historico .px31-link-todos'),
    },
    {
      titulo: 'Documentos relacionados',
      texto:
        'Os documentos relacionados ficam por último. O download ainda não tem serviço por trás.',
      alvo: '.px31-documentos',
      acao: { tipo: 'observar' },
    },
  ],
};

const renegociacao: Roteiro = {
  id: 'cobranca-renegociacao',
  modulo: MODULO,
  titulo: 'Propor uma renegociação',
  icone: 'handshake',
  descricao: 'O acordo para uma parcela atrasada, com a confirmação por TOTP.',
  duracao: '≈ 3 min',
  papeis: PAPEIS_FINANCEIROS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: () => [
    {
      titulo: 'Propor uma renegociação',
      texto:
        'Vamos propor um acordo para uma parcela atrasada, da inadimplência até a proposta registrada.',
    },
    ...peloMenu(MENU_COBRANCA, MENU_INADIMPLENCIA),
    ...abrirPrimeiraParcela(),
    {
      titulo: 'Quando se renegocia',
      texto:
        'A renegociação só é aceita em parcela atrasada ou inadimplente. Em outra situação, o botão fica desabilitado.',
      alvo: '.px31-form-reneg',
      acao: { tipo: 'observar' },
    },
    ...preencherRenegociacao({ retomada: false }),
    {
      titulo: 'Propor renegociação',
      texto:
        'O botão envia a proposta. Como ela altera o que o tomador deve, o sistema pede a segunda confirmação de identidade.',
      alvo: { css: '.px31-form-reneg button[type="submit"]', texto: 'Propor renegociação' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarComTotp({
      motivo:
        'Propor um acordo muda as condições da dívida. O sistema pede o código do autenticador antes de registrar.',
      aoConfirmar:
        'Confirmado o código, o sistema volta à parcela. O formulário recomeça vazio, então os dados entram outra vez.',
      destino: ROTA_PARCELA,
    }),
    ...preencherRenegociacao({ retomada: true }),
    {
      titulo: 'Enviar a proposta',
      texto: 'Agora, com a confirmação válida, a proposta é registrada.',
      alvo: { css: '.px31-form-reneg button[type="submit"]', texto: 'Propor renegociação' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.px31-reneg-criada',
    },
    {
      titulo: 'Proposta registrada',
      texto:
        'O cartão mostra o resumo do acordo: o valor e o número de parcelas, o primeiro vencimento, o desconto e quando a proposta expira, se o tomador não responder.',
      alvo: '.px31-reneg-criada',
      acao: { tipo: 'observar' },
    },
  ],
};

const completo: Roteiro = {
  id: 'cobranca-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os seis roteiros em sequência, da visão geral à renegociação.',
  duracao: '≈ 17 min',
  papeis: PAPEIS_FINANCEIROS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: (ctx) => {
    return [
      ...emSecao(visaoGeral, ctx, { primeira: true }),
      ...emSecao(agendaContrato, ctx),
      ...emSecao(agendaFinanceira, ctx),
      ...emSecao(inadimplencia, ctx),
      ...emSecao(parcela, ctx),
      ...emSecao(renegociacao, ctx),
    ];
  },
};

// O backoffice alcanca so a tela inicial e a agenda de um contrato; o restante e do financeiro.
export const ROTEIROS_COBRANCA: Roteiro[] = [
  completo,
  visaoGeral,
  agendaContrato,
  agendaFinanceira,
  inadimplencia,
  parcela,
  renegociacao,
];

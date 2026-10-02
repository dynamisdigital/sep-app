import { PassoRoteiro, Roteiro } from '../tour.model';
import { ROTA_STEP_UP, confirmarComTotp, peloMenu, rotaExata } from './passos-comuns';

// Tours assistidos do Pix operacional. Os tres papeis operacionais alcancam o modulo; solicitar um
// desembolso e do financeiro e da administracao, e pede TOTP. Consultar e ler detalhes nao grava nada.

const MODULO = 'Pix';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE'];
const PAPEIS_FINANCEIROS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO'];

const ID_DESEMBOLSO = 'e0000000-0000-4000-8000-000000000001';
const ID_RECEBIMENTO = 'e2000000-0000-4000-8000-000000000001';

const ROTA_DESEMBOLSO = /^\/app\/pix\/desembolsos\/[^/?]+(\?.*)?$/;
const ROTA_RECEBIMENTO = /^\/app\/pix\/recebimentos\/(?!referencias)[^/?]+(\?.*)?$/;
const ROTA_REFERENCIA = /^\/app\/pix\/recebimentos\/referencias\/[^/?]+(\?.*)?$/;

const MENU_PIX = {
  rota: '/app/pix',
  titulo: 'Menu Pix',
  texto:
    'No menu lateral, em Operação, fica o Pix. Ele aparece para financeiro, backoffice e administração.',
  aguardarAlvo: '.px20-metrics',
};

const MENU_DESEMBOLSOS = {
  rota: '/app/pix/desembolsos',
  titulo: 'Submenu Desembolsos',
  texto: 'Dentro do Pix, o submenu Desembolsos abre a consulta das transferências enviadas.',
  aguardarAlvo: '.px21-consulta',
};

const MENU_RECEBIMENTOS = {
  rota: '/app/pix/recebimentos',
  titulo: 'Submenu Recebimentos',
  texto: 'E o submenu Recebimentos abre a consulta dos Pix recebidos.',
  aguardarAlvo: '.px22-consultas',
};

const MENU_DIVERGENCIAS = {
  rota: '/app/pix/divergencias',
  titulo: 'Submenu Divergências',
  texto: 'O submenu Divergências reúne o que o Pix não conseguiu conciliar sozinho.',
  aguardarAlvo: '.px23-main',
};

const IMPEDIMENTO_TOTP: Roteiro['impedimento'] = (ctx) =>
  ctx.mfa
    ? null
    : 'Requer uma conta com TOTP ativo, porque solicitar um desembolso pede confirmação. Entre como admin@empresa.com.';

/** Preenche o formulario de novo desembolso; usado duas vezes, porque a confirmacao por TOTP o esvazia. */
function preencherDesembolso(retomada: boolean): PassoRoteiro[] {
  return [
    {
      titulo: retomada ? 'Contrato, de novo' : 'Contrato',
      texto: retomada
        ? 'Ao voltar da confirmação, a tela recomeça. Os mesmos dados entram outra vez, a começar pelo contrato.'
        : 'O desembolso nasce de um contrato. Aqui entra o identificador do contrato que vai receber o dinheiro.',
      alvo: '.px21-novo input[formcontrolname="contratoId"]',
      acao: { tipo: 'digitar', texto: () => '5b771c03' },
    },
    {
      titulo: 'Valor',
      texto: 'O valor a enviar. Aqui, mil duzentos e cinquenta reais.',
      alvo: '.px21-novo input[formcontrolname="valor"]',
      acao: { tipo: 'digitar', texto: () => '125000' },
    },
    {
      titulo: 'Chave Pix',
      texto: 'E a chave Pix do destinatário. Aqui, um CPF de demonstração.',
      alvo: '.px21-novo input[formcontrolname="chavePixDestino"]',
      acao: { tipo: 'digitar', texto: () => '12345678909' },
    },
  ];
}

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'pix-visao-geral',
  modulo: MODULO,
  titulo: 'Visão geral do Pix',
  icone: 'layout-dashboard',
  descricao: 'O painel operacional: saúde do provedor, métricas, conciliação, alertas e atividade.',
  duracao: '≈ 2,5 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra o painel do Pix operacional. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_PIX),
    {
      titulo: 'Para que serve',
      texto:
        'O painel acompanha, em um lugar só, os desembolsos enviados, os recebimentos e o que ficou divergente.',
      alvo: '.px20-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Saúde do provedor',
      texto:
        'O primeiro cartão mostra se o provedor de Pix está no ar e em quanto tempo ele responde. O traço no fundo é o histórico recente desse tempo.',
      alvo: '.px20-provider',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Métricas',
      texto:
        'Três cartões resumem o dia: desembolsos, recebimentos e divergências. Cada um é um atalho para a tela correspondente.',
      alvo: '.px20-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Volume em 24 horas',
      texto:
        'O círculo divide o volume movimentado nas últimas vinte e quatro horas por tipo de operação.',
      alvo: '.px20-volume',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Conciliação operacional',
      texto:
        'Os medidores mostram quanto do que entrou e saiu já foi conciliado com os contratos e as parcelas.',
      alvo: '.px20-conciliacao',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Alertas e divergências',
      texto:
        'Aqui ficam os alertas que pedem atenção, cada um com a gravidade. O link leva à tela de divergências.',
      alvo: '.px20-alertas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Transferências em sete dias',
      texto:
        'O gráfico compara, dia a dia, o que saiu e o que entrou nos últimos sete dias. Passando o mouse sobre um dia, aparecem os valores dele.',
      alvo: '.px20-chart',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Atividade recente',
      texto:
        'A lista de atividade recente traz as últimas movimentações, da mais nova para a mais antiga.',
      alvo: '.px20-atividade',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas levam a um novo desembolso, à consulta de recebimentos e às divergências, e exportam o relatório.',
      alvo: '.px20-quick',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Integrações ativas',
      texto:
        'O último cartão lista as integrações que sustentam o Pix, com a situação de cada uma.',
      alvo: '.px20-integracoes',
      acao: { tipo: 'observar' },
    },
  ],
};

const desembolsos: Roteiro = {
  id: 'pix-desembolsos',
  modulo: MODULO,
  titulo: 'Consultar um desembolso',
  icone: 'send',
  descricao: 'A consulta por ID, o resultado, o comprovante e o detalhe completo do desembolso.',
  duracao: '≈ 4 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Consultar um desembolso',
      texto:
        'Vamos consultar uma transferência enviada, ler o resultado, o comprovante e abrir o detalhe completo.',
    },
    ...peloMenu(MENU_PIX, MENU_DESEMBOLSOS),
    {
      titulo: 'Consultar desembolso',
      texto: 'A consulta pede o identificador da transferência Pix. Primeiro, limpamos o campo.',
      alvo: { css: '.px21-consulta button', texto: 'Limpar' },
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'ID da transferência',
      texto: 'Aqui entra o identificador da transferência. Cada transferência Pix tem um.',
      alvo: '#px21-id',
      acao: { tipo: 'digitar', texto: () => ID_DESEMBOLSO },
    },
    {
      titulo: 'Consultar',
      texto: 'O botão Consultar busca a transferência e mostra o resultado logo abaixo.',
      alvo: { css: '.px21-consulta button[type="submit"]', texto: 'Consultar' },
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px21-resultado',
    },
    {
      titulo: 'Status do desembolso',
      texto:
        'O resultado abre com a situação da transferência e os dados principais: identificador, data e hora, tipo de chave, valor, canal e chave do destinatário.',
      alvo: '.px21-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo',
      texto: 'A linha do tempo mostra o caminho da transferência, da solicitação até a conclusão.',
      alvo: '.px21-timeline',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Dados da transferência',
      texto:
        'Aqui, os dados técnicos: a instituição que recebeu, o código de autenticação, o identificador do Pix, o tempo de vida e a tarifa.',
      alvo: '.px21-detalhes article:nth-child(1)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Conciliação',
      texto:
        'A conciliação diz a que parcela e a que contrato o dinheiro foi ligado, e quem fez o vínculo.',
      alvo: '.px21-detalhes article:nth-child(2)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Comprovante',
      texto: 'O comprovante pode ser visualizado ou baixado em PDF. Vamos abrir a visualização.',
      alvo: { css: '.px21-comprovante button', texto: 'Visualizar' },
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px21-documento',
    },
    {
      titulo: 'Comprovante aberto',
      texto:
        'O comprovante traz o valor, a data, o identificador, o canal, a instituição e o código de autenticação.',
      alvo: '.px21-documento',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Fechar o comprovante',
      texto: 'O botão no canto fecha a visualização.',
      alvo: 'button[aria-label="Fechar comprovante"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Resumido ou detalhado',
      texto:
        'O botão no alto do resultado alterna entre a visão resumida, só com o essencial, e a detalhada.',
      alvo: '.px21-resultado-acoes button[aria-expanded]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Detalhado de novo',
      texto: 'Clicando de novo, o resultado volta ao detalhe completo.',
      alvo: '.px21-resultado-acoes button[aria-expanded]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Segurança Pix',
      texto:
        'À direita, o primeiro cartão confirma a criptografia, a assinatura digital, a verificação antifraude e o registro de auditoria.',
      alvo: '.px21-seguranca',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da operação',
      texto:
        'O resumo mostra o valor original, a taxa, o valor final, o tempo total e se o prazo combinado foi cumprido.',
      alvo: '.px21-op',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações adicionais',
      texto: 'Aqui, a origem da operação, o tipo, a prioridade, o IP de origem e o dispositivo.',
      alvo: '.px21-info',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas reenviam o comprovante, abrem o caso na fila do backoffice e levam às divergências para registrar uma ocorrência.',
      alvo: '.px21-acoes',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir o detalhe',
      texto: 'O link Abrir detalhe do desembolso leva à página completa da transferência.',
      alvo: '.px21-abrir-detalhe',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_DESEMBOLSO,
      aguardarAlvo: '.px27-dados',
    },
    {
      titulo: 'Cabeçalho do desembolso',
      texto:
        'O título traz o número curto da transferência e a situação. O botão Download comprovante baixa o PDF, e Mais ações abre atalhos para copiar os identificadores.',
      alvo: '.px27-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Dados do desembolso',
      texto:
        'Os dados do desembolso reúnem contrato, proposta, identificador, chave de idempotência e o identificador de ponta a ponta do Pix. Cada um tem um botão para copiar.',
      alvo: '.px27-dados',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo do desembolso',
      texto: 'A linha do tempo detalha cada etapa, com data e hora.',
      alvo: '.px27-timeline',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações do contrato',
      texto:
        'Três blocos ligam o desembolso ao resto da operação. O primeiro mostra o contrato de onde o dinheiro saiu, com atalho para ele.',
      alvo: { css: '.px27-card', texto: 'Informações do contrato' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações da proposta',
      texto: 'O segundo mostra a proposta que deu origem ao contrato.',
      alvo: { css: '.px27-card', texto: 'Informações da proposta' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações do recebedor',
      texto: 'E o terceiro mostra quem recebeu o dinheiro: nome, documento e a chave Pix usada.',
      alvo: { css: '.px27-card', texto: 'Informações do recebedor' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da operação',
      texto: 'À direita, o resumo da operação, com valores, tarifa e tempo.',
      alvo: '.px27-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações complementares',
      texto: 'As informações complementares trazem os dados de origem da solicitação.',
      alvo: '.px27-adicionais',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas reconsultam a transferência no provedor, voltam à lista e copiam o identificador.',
      alvo: '.px27-actions',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto: 'Por fim, o cartão de conformidade, com o hash de integridade do registro.',
      alvo: '.px27-seguranca',
      acao: { tipo: 'observar' },
    },
  ],
};

const solicitar: Roteiro = {
  id: 'pix-solicitar-desembolso',
  modulo: MODULO,
  titulo: 'Solicitar um desembolso',
  icone: 'banknote',
  descricao: 'O envio de um Pix a partir de um contrato, com a confirmação por TOTP.',
  duracao: '≈ 3 min',
  papeis: PAPEIS_FINANCEIROS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: () => [
    {
      titulo: 'Solicitar um desembolso',
      texto:
        'Vamos enviar um desembolso Pix de um contrato, do menu até a transferência criada. É a operação mais sensível do módulo.',
    },
    ...peloMenu(MENU_PIX, MENU_DESEMBOLSOS),
    {
      titulo: 'Solicitar desembolso',
      texto:
        'Quem é do financeiro ou da administração vê este botão. Ele abre o formulário de um novo desembolso.',
      alvo: '.px21-novo-cta',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px21-novo',
    },
    ...preencherDesembolso(false),
    {
      titulo: 'Enviar a solicitação',
      texto:
        'O botão envia a solicitação. Como move dinheiro, o sistema pede a segunda confirmação de identidade.',
      alvo: { css: '.px21-novo button[type="submit"]', texto: 'Solicitar desembolso' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarComTotp({
      motivo:
        'Enviar dinheiro é operação sensível. O sistema pede o código do autenticador antes de registrar o desembolso.',
      aoConfirmar:
        'Confirmado o código, o sistema volta à lista de desembolsos. O formulário recomeça fechado, então abrimos e preenchemos de novo.',
      destino: rotaExata('/app/pix/desembolsos'),
    }),
    {
      titulo: 'Abrir o formulário de novo',
      texto: 'O botão abre o formulário outra vez.',
      alvo: '.px21-novo-cta',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px21-novo',
    },
    ...preencherDesembolso(true),
    {
      titulo: 'Enviar de novo',
      texto:
        'Agora, com a confirmação válida, a solicitação é registrada. O sistema reconhece repetições pela chave de idempotência e não envia duas vezes.',
      alvo: { css: '.px21-novo button[type="submit"]', texto: 'Solicitar desembolso' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.px21-resultado',
    },
    {
      titulo: 'Desembolso registrado',
      texto: 'A transferência criada aparece no resultado, e a consulta mostra a situação dela.',
      alvo: '.px21-resultado',
      acao: { tipo: 'observar' },
    },
  ],
};

const recebimentos: Roteiro = {
  id: 'pix-recebimentos',
  modulo: MODULO,
  titulo: 'Consultar um recebimento',
  icone: 'download',
  descricao: 'A consulta por referência ou por recebimento, o resultado e os detalhes completos.',
  duracao: '≈ 4 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Consultar um recebimento',
      texto:
        'Vamos consultar um Pix recebido, ler o resultado e abrir os detalhes do recebimento e da referência.',
    },
    ...peloMenu(MENU_PIX, MENU_RECEBIMENTOS),
    {
      titulo: 'Duas formas de consultar',
      texto:
        'Um recebimento pode ser consultado pela referência, o código gerado para cobrar a parcela, ou pelo próprio recebimento. As abas escolhem o modo.',
      alvo: '.px22-tabs',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Aba Por recebimento',
      texto: 'Vamos usar a consulta pelo identificador do recebimento.',
      alvo: '#px22-aba-rec',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Limpar',
      texto: 'Primeiro, o campo é limpo.',
      alvo: '#px22-painel-rec .px22-btn-sec',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'ID do recebimento',
      texto: 'Aqui entra o identificador do recebimento Pix.',
      alvo: '#px22-rec',
      acao: { tipo: 'digitar', texto: () => ID_RECEBIMENTO },
    },
    {
      titulo: 'Consultar',
      texto: 'O botão Consultar traz o resultado.',
      alvo: '#px22-painel-rec button[type="submit"]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.px22-resultado:not(.loading) .px22-summary',
    },
    {
      titulo: 'Resultado da consulta',
      texto: 'O resultado mostra a situação do recebimento e de qual consulta ele veio.',
      alvo: '.px22-status',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo do recebimento',
      texto: 'Logo abaixo, os identificadores principais, com botão para copiar cada um.',
      alvo: '.px22-summary',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Parcela vinculada',
      texto: 'A parcela vinculada mostra a que contrato e a que parcela o dinheiro foi ligado.',
      alvo: '.px22-parcela',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo e chave',
      texto:
        'A linha do tempo conta o caminho do recebimento, e o cartão ao lado mostra a chave Pix que o recebeu.',
      alvo: '.px22-middle-direita',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Conciliação e dados adicionais',
      texto:
        'Embaixo, a situação da conciliação, com o responsável e o protocolo, e os dados adicionais do Pix: o pagador, o identificador de ponta a ponta e a situação no sistema de pagamentos.',
      alvo: '.px22-bottom',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Comprovante',
      texto: 'O comprovante também pode ser visualizado ou baixado.',
      alvo: '.px22-comprovante',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Saúde do provedor',
      texto: 'À direita, o provedor de Pix, com a situação e o tempo de resposta.',
      alvo: '.px22-provider',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Status da conciliação',
      texto: 'O círculo mostra a divisão dos recebimentos por situação de conciliação.',
      alvo: '.px22-conciliacao',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo do recebimento',
      texto: 'O resumo traz o identificador, o valor, a data e o link para o detalhe completo.',
      alvo: '.px22-resumo',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas abrem a parcela, registram uma ocorrência, baixam o comprovante e exportam os dados.',
      alvo: '.px22-actions',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Consultas recentes',
      texto: 'As consultas recentes ficam guardadas na sessão, e um clique repete qualquer uma.',
      alvo: '.px22-recentes',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir o detalhe',
      texto: 'O identificador no resumo abre a página completa do recebimento.',
      alvo: '.px22-link-detalhe',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_RECEBIMENTO,
      aguardarAlvo: '.px25-dados',
    },
    {
      titulo: 'Cabeçalho do recebimento',
      texto:
        'O título traz a situação do recebimento. Download comprovante baixa o PDF, e Mais ações abre atalhos.',
      alvo: '.px25-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Dados do recebimento',
      texto:
        'Os dados reúnem o valor, o identificador de ponta a ponta, a referência, o identificador interno, a parcela e o NSU do banco.',
      alvo: '.px25-dados',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da conciliação',
      texto:
        'A conciliação diz se o recebimento já está ligado à parcela, com o protocolo e o responsável.',
      alvo: '.px25-conciliacao',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo',
      texto: 'A linha do tempo mostra as etapas do recebimento.',
      alvo: '.px25-timeline',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Parcela vinculada',
      texto: 'Aqui, a parcela ligada, com contrato e proposta. O botão abre a parcela na Cobrança.',
      alvo: '.px25-parcela',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Informações complementares',
      texto: 'As informações complementares guardam observações e etiquetas.',
      alvo: '.px25-complementares',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Dados adicionais do Pix',
      texto: 'Os dados adicionais trazem o que veio do sistema de pagamentos.',
      alvo: '.px25-adicionais',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Comprovante do recebimento',
      texto: 'O comprovante do recebimento, para visualizar ou baixar.',
      alvo: '.px25-comprovante',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ações rápidas',
      texto:
        'As ações rápidas copiam o identificador, abrem a fila operacional, abrem a parcela e exportam os dados.',
      alvo: '.px25-acoes',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto: 'O cartão de conformidade traz o hash de integridade do registro.',
      alvo: '.px25-seguranca',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir a referência',
      texto: 'No campo da referência, o link abre a página da referência de cobrança.',
      alvo: '.px25-dados a[href*="referencias"]',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_REFERENCIA,
      aguardarAlvo: '.px26-dados',
      pularSe: () => !document.querySelector('.px25-dados a[href*="referencias"]'),
    },
    {
      titulo: 'Cabeçalho da referência',
      texto:
        'A referência é o código gerado para cobrar uma parcela por Pix. O título mostra a situação dela, e Mais ações copia o código de copia e cola.',
      alvo: '.px26-heading',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px26-heading'),
    },
    {
      titulo: 'Dados da referência',
      texto:
        'Os dados da referência trazem o identificador da transação, a chave Pix de destino e o identificador interno.',
      alvo: '.px26-dados',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px26-dados'),
    },
    {
      titulo: 'Recebimentos vinculados',
      texto: 'A tabela lista os recebimentos que pagaram essa referência, com atalho para cada um.',
      alvo: '.px26-tabela-card',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px26-tabela-card'),
    },
    {
      titulo: 'Linha do tempo da referência',
      texto: 'A linha do tempo mostra quando a referência foi gerada, exibida e paga.',
      alvo: '.px26-timeline',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px26-timeline'),
    },
    {
      titulo: 'Resumo e suporte',
      texto:
        'À direita, o resumo da referência, as informações adicionais e o atalho para o suporte.',
      alvo: '.px26-resumo',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px26-resumo'),
    },
  ],
};

const divergencias: Roteiro = {
  id: 'pix-divergencias',
  modulo: MODULO,
  titulo: 'Divergências',
  icone: 'circle-alert',
  descricao: 'Recebimentos divergentes e desembolsos com falha, com o caminho para tratar cada um.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Divergências',
      texto: 'Este roteiro mostra o que o Pix não conseguiu conciliar sozinho e como tratar.',
    },
    ...peloMenu(MENU_PIX, MENU_DIVERGENCIAS),
    {
      titulo: 'Para que serve',
      texto:
        'A tela separa os casos que precisam de uma pessoa: recebimentos que não bateram e desembolsos que falharam.',
      alvo: '.px23-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Recebimentos divergentes',
      texto:
        'O primeiro grupo lista os recebimentos Pix divergentes em aberto, com a prioridade, a situação e a data de abertura.',
      alvo: '.px23-grupo:nth-of-type(1)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Desembolsos com falha',
      texto:
        'O segundo grupo lista os desembolsos que falharam. O contador de cada grupo diz quantos casos há.',
      alvo: '.px23-grupo:nth-of-type(2)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Tratar o caso',
      texto:
        'Cada item leva à fila do backoffice, onde o caso é tratado, e ao registro de origem, o recebimento ou o desembolso.',
      alvo: '.px23-item-acoes',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px23-item-acoes'),
    },
    {
      titulo: 'Reprocessar',
      texto:
        'A dica no fim lembra que falhas temporárias podem ser resolvidas reprocessando a integração. O botão leva à tela de reprocessos do backoffice.',
      alvo: '.px23-tip',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Saúde do provedor',
      texto: 'À direita, o provedor de Pix, com a situação e o tempo de resposta.',
      alvo: '.px23-provider',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Causas comuns',
      texto:
        'As causas mais comuns de divergência ficam listadas, para o operador saber onde olhar primeiro.',
      alvo: '.px23-causas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Última tentativa',
      texto:
        'O cartão mostra a última tentativa de processamento, com o protocolo e a mensagem retornada.',
      alvo: '.px23-tentativa',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Atalhos',
      texto: 'Os atalhos levam à fila operacional e aos reprocessos.',
      alvo: '.px23-atalhos',
      acao: { tipo: 'observar' },
    },
  ],
};

const completo: Roteiro = {
  id: 'pix-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os cinco roteiros em sequência, da visão geral às divergências.',
  duracao: '≈ 16 min',
  papeis: PAPEIS_FINANCEIROS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: (ctx) => {
    const sem = (passos: PassoRoteiro[]): PassoRoteiro[] => passos.slice(1);
    return [
      ...visaoGeral.passos(ctx),
      ...sem(desembolsos.passos(ctx)),
      ...sem(solicitar.passos(ctx)),
      ...sem(recebimentos.passos(ctx)),
      ...sem(divergencias.passos(ctx)),
    ];
  },
};

// O backoffice alcanca a consulta, nao a solicitacao de desembolso nem o modulo completo.
export const ROTEIROS_PIX: Roteiro[] = [
  completo,
  visaoGeral,
  desembolsos,
  solicitar,
  recebimentos,
  divergencias,
];

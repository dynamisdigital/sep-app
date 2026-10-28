import { PassoRoteiro, Roteiro } from '../tour.model';
import { ROTA_STEP_UP, confirmarComTotp, peloMenu, emSecao } from './passos-comuns';

// Tours assistidos da Formalizacao. Roda para backoffice, financeiro e administracao, os papeis que
// alcancam o modulo. Ler e percorrer o contrato nao grava nada; so o roteiro de aceite grava, e por
// isso pede conta com TOTP (o aceite e operacao sensivel) e so executa o clique final em demonstracao.

const MODULO = 'Formalização';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE'];

const ROTA_CONTRATO = /^\/app\/formalizacao\/contratos\/[^/?]+(\?.*)?$/;

const MENU_FORMALIZACAO = {
  rota: '/app/formalizacao',
  titulo: 'Menu Formalização',
  texto:
    'No menu lateral, em Jornadas, fica a Formalização. Ela aparece para backoffice, financeiro e administração.',
  aguardarAlvo: '.contract-row',
};

const IMPEDIMENTO_TOTP: Roteiro['impedimento'] = (ctx) =>
  ctx.mfa
    ? null
    : 'Requer uma conta com TOTP ativo, porque aceitar o contrato pede confirmação. Entre como admin@empresa.com.';

/** Da lista de contratos ate o primeiro deles aberto, como faria um operador. */
function abrirPrimeiroContrato(): PassoRoteiro[] {
  return [
    {
      titulo: 'Acessar contrato',
      texto:
        'O botão Acessar contrato abre o documento. O sistema consulta o contrato pela proposta e leva direto para ele.',
      alvo: '.contract-featured .contract-action',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_CONTRATO,
      aguardarAlvo: '.document-sheet',
    },
  ];
}

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'formalizacao-visao-geral',
  modulo: MODULO,
  titulo: 'Visão geral da formalização',
  icone: 'layout-dashboard',
  descricao:
    'A lista de contratos a formalizar, o andamento de cada um e a linha do tempo do fluxo.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra a página inicial da Formalização. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_FORMALIZACAO),
    {
      titulo: 'O que é formalizar',
      texto:
        'Formalizar é transformar uma proposta aprovada em contrato assinado. Esta tela reúne o que está nessa etapa.',
      alvo: '.formalization-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Indicadores',
      texto:
        'Os quatro cartões separam os contratos por momento: disponíveis para aceite, em assinatura, formalizados e com pendência de documentos.',
      alvo: '.formalization-metrics',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Contratos para formalizar',
      texto:
        'A lista traz os contratos que nasceram de propostas aprovadas. O link no canto abre a lista completa de propostas.',
      alvo: '.contracts-card > header',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Um contrato da lista',
      texto:
        'Cada linha mostra a proposta, o tipo de operação, o valor, o prazo, a situação e a data de criação.',
      alvo: '.contract-featured .contract-data',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Progresso do contrato',
      texto:
        'No primeiro contrato aparece o caminho percorrido: proposta aprovada, contrato gerado, assinatura e formalizado. A etapa atual fica em destaque.',
      alvo: '.contract-featured .contract-progress',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo',
      texto:
        'Abaixo, o fluxo completo da formalização em cinco etapas: proposta aprovada, contrato gerado, assinatura, escrow ou garantia e formalizado. As três primeiras ficam acesas.',
      alvo: '.timeline-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Escrow e garantia',
      texto:
        'Escrow é uma conta de custódia: os recursos ficam alocados e segregados até o contrato estar ativo e o crédito liberado.',
      alvo: { css: '.timeline article', texto: 'Escrow / Garantia' },
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Onboarding aprovado',
      texto:
        'Na coluna da direita, o primeiro cartão confirma que o onboarding está aprovado e elegível para crédito. O link leva ao perfil.',
      alvo: '.onboarding-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da formalização',
      texto:
        'O resumo soma o que está em formalização: contratos, valor total contratado, valor em formalização, pendentes de assinatura e documentos pendentes.',
      alvo: '.summary-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Segurança e conformidade',
      texto:
        'Este cartão lembra as garantias do processo: ambiente regulado, conformidade com a resolução do CMN, dados criptografados, assinatura digital ICP-Brasil e escrow com custódia segregada.',
      alvo: '.security-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Precisa de ajuda?',
      texto: 'E o último abre o contato com o suporte, para tirar dúvida em qualquer etapa.',
      alvo: '.help-card',
      acao: { tipo: 'observar' },
    },
  ],
};

const contrato: Roteiro = {
  id: 'formalizacao-contrato',
  modulo: MODULO,
  titulo: 'Ler um contrato',
  icone: 'file-search',
  descricao: 'O documento, o zoom e a tela cheia, o hash de integridade, as partes e a auditoria.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ler um contrato',
      texto:
        'Vamos abrir um contrato e percorrer a tela: o documento, os detalhes de integridade, a linha do tempo e a auditoria. Nada aqui grava dados.',
    },
    ...peloMenu(MENU_FORMALIZACAO),
    ...abrirPrimeiroContrato(),
    {
      titulo: 'Cabeçalho do contrato',
      texto:
        'O título traz o número da proposta e a situação atual do contrato. Logo abaixo, a instrução: revisar e confirmar o aceite digital.',
      alvo: '.contract-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo',
      texto:
        'A faixa de resumo repete o essencial: proposta, tipo de operação, valor contratado, prazo, data de criação e situação.',
      alvo: '.contract-summary',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Versões do contrato',
      texto:
        'Quando o contrato foi renegociado, aparecem abas, uma por versão. A vigente vem marcada. Um contrato novo tem uma versão só, então as abas não aparecem.',
      alvo: '.version-tabs',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.version-tabs'),
    },
    {
      titulo: 'O documento',
      texto:
        'À esquerda, o contrato de mútuo, com as cláusulas de objeto, valor e prazo. Os dados saem da proposta aprovada.',
      alvo: '.document-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Aumentar o zoom',
      texto:
        'Os botões de mais e menos ajustam o tamanho da folha, de setenta a cento e quarenta por cento.',
      alvo: 'button[aria-label="Aumentar zoom"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Reduzir o zoom',
      texto: 'E o de menos devolve o tamanho de leitura.',
      alvo: 'button[aria-label="Reduzir zoom"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Imprimir e baixar',
      texto:
        'A impressora abre a impressão do navegador, e a seta para baixo salva o contrato em PDF. Aqui só mostramos onde ficam, para não abrir janelas do sistema.',
      alvo: '.document-tools',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Tela cheia',
      texto: 'O último botão amplia o documento para leitura em tela cheia.',
      alvo: 'button[aria-pressed="false"][aria-label="Tela cheia"]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.document-card-expanded',
    },
    {
      titulo: 'Documento ampliado',
      texto:
        'Assim o contrato ocupa a tela toda. A tecla Esc, ou o mesmo botão, volta ao tamanho normal.',
      alvo: '.document-card-expanded .document-viewer',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Sair da tela cheia',
      texto: 'Clicamos de novo no botão para voltar.',
      alvo: 'button[aria-pressed="true"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Selo de segurança',
      texto:
        'No rodapé do documento, o selo informa que a visualização é segura e que o documento é assinado digitalmente pela SEP.',
      alvo: '.document-card > footer',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Detalhes do contrato',
      texto:
        'À direita, os detalhes: tipo de contrato, versão, data de geração e quem gerou. O botão no alto baixa o contrato.',
      alvo: '.details-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Hash de integridade',
      texto:
        'O hash SHA-256 é a impressão digital do documento. Qualquer alteração, mesmo de uma vírgula, muda esse código. O botão ao lado copia o valor.',
      alvo: '.hash-box',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Integridade verificada',
      texto: 'O selo confirma que o documento não foi alterado desde que foi gerado.',
      alvo: '.integrity',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Partes do contrato',
      texto: 'As partes são a SEP, como emprestadora, e o tomador do crédito.',
      alvo: '.details-card .party',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Garantias do documento',
      texto:
        'A faixa seguinte resume as proteções: assinatura digital ICP-Brasil, integridade criptográfica, carimbo de tempo e armazenamento seguro.',
      alvo: '.benefits',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Aceite digital',
      texto:
        'Na coluna da direita fica o aceite. Enquanto o contrato aguarda o aceite, o botão Ler e aceitar contrato aparece aqui. Depois do aceite, ele dá lugar à data do registro.',
      alvo: '.accept-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Linha do tempo do contrato',
      texto:
        'A linha do tempo mostra o caminho do contrato: gerado, disponibilizado ao tomador, aceito e formalizado.',
      alvo: '.contract-timeline',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Auditoria do documento',
      texto:
        'A auditoria registra quando o documento foi criado, quando foi enviado para aceite, a última visualização e o IP de acesso.',
      alvo: '.audit-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Auditoria completa',
      texto:
        'O botão no fim abre o detalhe: versão vigente, hash, quantidade de versões e, depois do aceite, o IP e o navegador usados.',
      alvo: '.audit-toggle',
      acao: { tipo: 'clicar' },
      aguardarAlvo: '.audit-extra',
    },
    {
      titulo: 'Detalhe da auditoria',
      texto: 'Aqui está o detalhe. Clicando de novo, ele se recolhe.',
      alvo: '.audit-extra',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Recolher',
      texto: 'Recolhemos a auditoria para deixar a tela como estava.',
      alvo: '.audit-toggle',
      acao: { tipo: 'clicar' },
    },
  ],
};

const aceite: Roteiro = {
  id: 'formalizacao-aceite',
  modulo: MODULO,
  titulo: 'Aceitar o contrato',
  icone: 'file-pen',
  descricao: 'O aceite digital, com a confirmação por TOTP, até o contrato entrar em assinatura.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: () => [
    {
      titulo: 'Aceitar o contrato',
      texto:
        'Vamos registrar o aceite digital de um contrato, do menu até a situação Em assinatura. É a operação mais sensível desta área.',
    },
    ...peloMenu(MENU_FORMALIZACAO),
    ...abrirPrimeiroContrato(),
    {
      titulo: 'Situação atual',
      texto:
        'O cartão de aceite mostra a situação atual do contrato. Para aceitar, ele precisa estar Aguardando aceite.',
      alvo: '.accept-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ler e aceitar',
      texto:
        'Ao aceitar, quem assina confirma que leu e concorda com todas as cláusulas. Por isso o botão pede uma segunda confirmação de identidade.',
      alvo: 'button[aria-label="Aceitar contrato"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarComTotp({
      motivo:
        'Aceitar um contrato tem validade jurídica. O sistema pede o código do autenticador antes de registrar.',
      aoConfirmar:
        'Confirmado o código, o sistema volta ao contrato. O aceite ainda precisa ser enviado, então clicamos no botão mais uma vez.',
      destino: ROTA_CONTRATO,
    }),
    {
      titulo: 'Registrar o aceite',
      texto: 'Agora, com a confirmação válida, o botão registra o aceite.',
      alvo: 'button[aria-label="Aceitar contrato"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.accepted',
    },
    {
      titulo: 'Aceite registrado',
      texto: 'O cartão agora mostra a data do aceite, no lugar do botão.',
      alvo: '.accepted',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Em assinatura',
      texto:
        'O contrato mudou para Em assinatura: o sistema enviou o documento ao provedor de assinatura digital, e a linha do tempo acompanha. Quando a assinatura termina, o contrato fica formalizado.',
      alvo: '.contract-timeline',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Estado da assinatura',
      texto: 'Nos detalhes, uma linha informa em que ponto o envelope de assinatura está.',
      alvo: '.signature-state',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.signature-state'),
    },
  ],
};

const completo: Roteiro = {
  id: 'formalizacao-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os três roteiros em sequência: visão geral, leitura do contrato e aceite.',
  duracao: '≈ 7 min',
  papeis: PAPEIS,
  impedimento: IMPEDIMENTO_TOTP,
  passos: (ctx) => {
    // O contrato ja esta aberto quando o segundo roteiro termina; o aceite parte da lista.
    const jaNaTela = ['Abrir o menu', 'Menu Formalização', 'Acessar contrato'];
    return [
      ...emSecao(visaoGeral, ctx, { primeira: true }),
      ...emSecao(contrato, ctx, {
        manter: (p) => !['Abrir o menu', 'Menu Formalização'].includes(p.titulo),
      }),
      ...emSecao(aceite, ctx, { manter: (p) => !jaNaTela.includes(p.titulo) }),
    ];
  },
};

export const ROTEIROS_FORMALIZACAO: Roteiro[] = [completo, visaoGeral, contrato, aceite];

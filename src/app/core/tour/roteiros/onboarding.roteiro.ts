import { PassoRoteiro, Roteiro } from '../tour.model';
import { peloMenu, emSecao } from './passos-comuns';

// Tours assistidos do Onboarding (KYC de pessoa fisica e KYB de empresa). Rodam para backoffice,
// financeiro e administracao, sem TOTP. Nenhum dado real entra: CPF e CNPJ sao os numeros de teste
// publicos, e o arquivo anexado e gerado na hora, minusculo, so para mostrar o envio.

const MODULO = 'Onboarding';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE'];

const CPF_TESTE = '52998224725';
const CNPJ_TESTE = '11222333000181';

const ROTA_PESSOA_DETALHE = /^\/app\/onboarding\/pessoa\/[^/?]+(\?.*)?$/;
const ROTA_EMPRESA_DETALHE = /^\/app\/onboarding\/empresa\/[^/?]+(\?.*)?$/;

const MENU_ONBOARDING = {
  rota: '/app/onboarding',
  titulo: 'Menu Onboarding',
  texto:
    'No menu lateral, em Jornadas, fica o Onboarding. Ele aparece para backoffice, financeiro e administração.',
  aguardarAlvo: '.onboarding-choice-grid',
};

const MENU_PESSOA = {
  rota: '/app/onboarding/pessoa',
  titulo: 'Submenu Pessoa física',
  texto:
    'Dentro do Onboarding, o submenu Pessoa física abre o cadastro de uma pessoa, a verificação KYC.',
  aguardarAlvo: '.kyc-form-card',
};

const MENU_EMPRESA = {
  rota: '/app/onboarding/empresa',
  titulo: 'Submenu Empresa',
  texto: 'E o submenu Empresa abre o cadastro de uma empresa, a verificação KYB.',
  aguardarAlvo: '.kyb-form-card',
};

/**
 * Envio de documento e disparo da verificacao, igual nas duas jornadas. Primeiro um formato proibido,
 * para mostrar a trava da tela; depois um PDF valido, que e enviado.
 */
function documentoEVerificacao(opcoes: {
  raiz: string;
  tipo: string;
  arquivo: string;
  tipoQuem: string;
}): PassoRoteiro[] {
  return [
    {
      titulo: 'Tipo do documento',
      texto: `A tela de acompanhamento recebe os documentos. Primeiro, o tipo: aqui, ${opcoes.tipoQuem}.`,
      alvo: `${opcoes.raiz} #tipoDocumento`,
      acao: { tipo: 'selecionar', opcao: opcoes.tipo },
    },
    {
      titulo: 'Um formato proibido',
      texto:
        'Para ver a trava, anexamos um arquivo executável. O tour usa um arquivo vazio de demonstração, que nunca é enviado.',
      alvo: `${opcoes.raiz} #arquivo`,
      acao: { tipo: 'anexar', nome: 'documento.exe', tipoMime: 'application/x-msdownload' },
      aguardarAlvo: '.sep-onboarding-upload-error',
    },
    {
      titulo: 'A trava de upload',
      texto:
        'A tela recusa na hora: só PDF, JPEG e PNG, até dez megabytes. Executáveis e arquivos com extensão dupla são barrados antes de qualquer envio.',
      alvo: '.sep-onboarding-upload-error',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Um arquivo válido',
      texto: 'Agora um PDF. O aviso de erro some e o botão de envio é liberado.',
      alvo: `${opcoes.raiz} #arquivo`,
      acao: { tipo: 'anexar', nome: opcoes.arquivo, tipoMime: 'application/pdf' },
    },
    {
      titulo: 'Enviar documento',
      texto: 'Com o arquivo escolhido, clicamos em Enviar documento.',
      alvo: `${opcoes.raiz} .sep-onboarding-upload-submit`,
      acao: { tipo: 'clicar', efeito: true },
    },
    {
      titulo: 'Enviar para verificação',
      texto:
        'Enviados os documentos, o cadastro segue para verificação: o sistema confere os dados e, no caso de pessoas, faz as checagens de prevenção à lavagem de dinheiro.',
      alvo: { css: `${opcoes.raiz} > button`, texto: 'Enviar para verificação' },
      acao: { tipo: 'clicar', efeito: true },
    },
    {
      titulo: 'Situação do cadastro',
      texto:
        'O selo mostra em que ponto o cadastro está: iniciado, documentos recebidos, em verificação, aprovado, reprovado ou com pendência. No ambiente de demonstração ele já aparece aprovado.',
      alvo: `${opcoes.raiz} .sep-onboarding-status-badge`,
      acao: { tipo: 'observar' },
    },
  ];
}

// ============ ROTEIROS ============

const visaoGeral: Roteiro = {
  id: 'onboarding-visao-geral',
  modulo: MODULO,
  titulo: 'Visão geral do módulo',
  icone: 'layout-dashboard',
  descricao: 'Os dois tipos de cadastro e por que passar por eles.',
  duracao: '≈ 1 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra a página inicial do Onboarding. Tudo começa no Dashboard, logo depois do login.',
    },
    ...peloMenu(MENU_ONBOARDING),
    {
      titulo: 'Dois tipos de cadastro',
      texto:
        'O cadastro é a porta de entrada da plataforma. Há dois caminhos, conforme quem vai operar: uma pessoa física ou uma empresa.',
      alvo: '.onboarding-choice-grid',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Pessoa física',
      texto:
        'O cadastro de pessoa física segue o KYC, sigla em inglês para conhecer o cliente: dados pessoais, validação de documentos e verificação de identidade.',
      alvo: '.onboarding-choice-grid > .onboarding-choice-card:first-child',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Empresa',
      texto:
        'O de empresa segue o KYB, conhecer o negócio: identificação da empresa, sócios e representantes, e documentos societários e fiscais.',
      alvo: '.onboarding-choice-grid > .onboarding-choice-card:nth-child(2)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Por que se cadastrar',
      texto: 'Abaixo, os motivos de fazer o cadastro na plataforma.',
      alvo: '.onboarding-reasons',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Ambiente seguro',
      texto: 'E o lembrete de que o ambiente é regulado, seguro e auditável.',
      alvo: '.onboarding-trust',
      acao: { tipo: 'observar' },
    },
  ],
};

const pessoa: Roteiro = {
  id: 'onboarding-pessoa',
  modulo: MODULO,
  titulo: 'Cadastro de pessoa física (KYC)',
  icone: 'id-card',
  descricao: 'Identificação, envio de documento, a trava de upload e a verificação.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Cadastrar uma pessoa física',
      texto:
        'Vamos cadastrar uma pessoa, do menu até o envio para verificação. O CPF é um número de teste público.',
    },
    ...peloMenu(MENU_ONBOARDING, MENU_PESSOA),
    {
      titulo: 'As etapas da jornada',
      texto:
        'O cadastro tem quatro etapas: identificação, documentos, verificação e revisão. Estamos na primeira.',
      alvo: '.kyc-stepper',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'CPF',
      texto: 'Começamos pelo CPF. O campo coloca pontos e traço sozinho enquanto se digita.',
      alvo: '#cpf',
      acao: { tipo: 'digitar', texto: () => CPF_TESTE },
    },
    {
      titulo: 'Nome completo',
      texto: 'O nome completo, como no documento.',
      alvo: '#nomeCompleto',
      acao: { tipo: 'digitar', texto: () => 'Maria Souza Lima' },
    },
    {
      titulo: 'Data de nascimento',
      texto: 'E a data de nascimento.',
      alvo: '#dataNascimento',
      acao: { tipo: 'digitar', texto: () => '1990-05-14' },
    },
    {
      titulo: 'Continuar para documentos',
      texto:
        'Os três campos são obrigatórios. Com eles preenchidos, o botão Continuar para documentos é liberado.',
      alvo: '.kyc-form-card button[type="submit"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_PESSOA_DETALHE,
      aguardarAlvo: '.kyc-detail-legacy',
    },
    {
      titulo: 'Acompanhamento',
      texto:
        'O cadastro foi aberto e a tela passa a ser a de acompanhamento: situação, envio de documentos e verificação.',
      alvo: '.kyc-detail-legacy',
      acao: { tipo: 'observar' },
    },
    ...documentoEVerificacao({
      raiz: '.kyc-detail-legacy',
      tipo: 'RG',
      arquivo: 'rg-demonstracao.pdf',
      tipoQuem: 'o RG. Também existem CNH, passaporte, selfie e comprovante de endereço',
    }),
  ],
};

const empresa: Roteiro = {
  id: 'onboarding-empresa',
  modulo: MODULO,
  titulo: 'Cadastro de empresa (KYB)',
  icone: 'building-2',
  descricao: 'Dados da empresa, documentos societários e a verificação.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Cadastrar uma empresa',
      texto:
        'Vamos cadastrar uma empresa, do menu até o envio para verificação. O CNPJ é um número de teste público.',
    },
    ...peloMenu(MENU_ONBOARDING, MENU_EMPRESA),
    {
      titulo: 'As etapas da jornada',
      texto:
        'A jornada de empresa tem cinco etapas: empresa, sócios, representantes, documentos e revisão. Estamos na primeira.',
      alvo: '.kyb-stepper',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'CNPJ',
      texto: 'Começamos pelo CNPJ, que o campo formata sozinho.',
      alvo: 'input[formControlName="cnpj"]',
      acao: { tipo: 'digitar', texto: () => CNPJ_TESTE },
    },
    {
      titulo: 'Razão social',
      texto: 'A razão social, como no cadastro da Receita.',
      alvo: 'input[formControlName="razaoSocial"]',
      acao: { tipo: 'digitar', texto: () => 'Comercial Exemplo Ltda.' },
    },
    {
      titulo: 'Nome fantasia',
      texto: 'O nome fantasia é opcional.',
      alvo: 'input[formControlName="nomeFantasia"]',
      acao: { tipo: 'digitar', texto: () => 'Exemplo Comercial' },
    },
    {
      titulo: 'Tipo societário',
      texto: 'O tipo societário também é opcional: limitada, sociedade anônima, MEI e outros.',
      alvo: 'select[formControlName="tipoSocietario"]',
      acao: { tipo: 'selecionar', opcao: 'LTDA' },
    },
    {
      titulo: 'Porte da empresa',
      texto: 'E o porte, que classifica a empresa pelo faturamento.',
      alvo: 'select[formControlName="porte"]',
      acao: { tipo: 'selecionar', opcao: 'ME' },
    },
    {
      titulo: 'Continuar para sócios',
      texto:
        'Só o CNPJ e a razão social são obrigatórios. Com eles, o botão Continuar para sócios é liberado.',
      alvo: '.kyb-form-card button[type="submit"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_EMPRESA_DETALHE,
      aguardarAlvo: '.kyb-detail-legacy',
    },
    {
      titulo: 'Acompanhamento',
      texto:
        'A tela passa a ser a de acompanhamento da empresa: a situação, os dados cadastrados e os representantes.',
      alvo: '.kyb-detail-legacy',
      acao: { tipo: 'observar' },
    },
    ...documentoEVerificacao({
      raiz: '.kyb-detail-legacy',
      tipo: 'CONTRATO_SOCIAL',
      arquivo: 'contrato-social-demonstracao.pdf',
      tipoQuem: 'o contrato social. Também existem o CCMEI e o comprovante de endereço',
    }),
  ],
};

const completo: Roteiro = {
  id: 'onboarding-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os três roteiros em sequência: visão geral, pessoa física e empresa.',
  duracao: '≈ 7 min',
  papeis: PAPEIS,
  passos: (ctx) => [
    ...emSecao(visaoGeral, ctx, { primeira: true }),
    ...emSecao(pessoa, ctx),
    ...emSecao(empresa, ctx),
  ],
};

export const ROTEIROS_ONBOARDING: Roteiro[] = [completo, visaoGeral, pessoa, empresa];

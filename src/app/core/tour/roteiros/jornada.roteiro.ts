import { PassoRoteiro, Roteiro } from '../tour.model';
import {
  credorFinancia,
  desembolsoEQuitacao,
  formalizacaoDoContrato,
  retornoAoCredor,
} from './jornada-financiamento.roteiro';
import {
  analiseDeCredito,
  backofficeEnvioECadastro,
  pedidoDoTomador,
} from './jornada-operacao.roteiro';
import { tentativasBloqueadas } from './jornada-recusas.roteiro';
import { comEntrada, entrarComo, peloMenu, rotaExata, trocarDeConta } from './passos-comuns';

// Operação completa nas telas reais do sistema, em modo demonstração: o tour parte da página inicial, entra
// no sistema, troca de perfil como um usuário faria (sair e entrar de novo) e cria registros novos que os
// perfis seguintes enxergam. Nada é simulado à parte: são as mesmas telas, os mesmos formulários e os mesmos
// endpoints do mock que o sistema usa. Os dados nascem a cada execução (`reiniciarDemo`).
//
// Capítulos (um perfil cada): correspondente → sub-correspondente → backoffice → tomador (a operação age em
// nome dele, porque o tomador não tem tela própria) → credor → administração (TOTP) → cobrança e encerramento.

const CORRESPONDENTE = { email: 'correspondente@empresa.com', quem: 'correspondente majoritário' };
const SUB = { email: 'mariana.exemplo@empresa.com', quem: 'sub-correspondente' };
const CLIENTE_DA_REDE = 'Padaria Boa Massa Ltda';

const MENU_MEU_BACKOFFICE = {
  rota: '/app/meu-backoffice',
  titulo: 'Menu Meu Back Office',
  texto:
    'No menu lateral, em Jornadas, fica o Meu Back Office, a área de quem capta clientes para o SEP.',
  aguardarAlvo: '.cor-kpis',
};

function ler(
  titulo: string,
  texto: string,
  alvo: PassoRoteiro['alvo'],
  secao?: string,
): PassoRoteiro {
  return { titulo, texto, alvo, acao: { tipo: 'observar' }, ...(secao ? { secao } : {}) };
}

const NOVO_SUB = 'section[aria-labelledby="cor-novo-sub"]';
const NOVO_PROSPECT = '[data-tour="cor-funil-novo"]';

// ============ CAPÍTULO 0 · ENTRADA ============

function entrada(): PassoRoteiro[] {
  return [
    {
      titulo: 'Uma operação completa, nas telas reais',
      texto:
        'Esta demonstração percorre uma operação de crédito do começo ao fim, nas mesmas telas que o sistema usa. Vamos entrar como cada perfil e criar registros novos, com dados fictícios, que os perfis seguintes vão encontrar. Nada aqui é dinheiro nem pessoa de verdade.',
    },
    ler(
      'A página inicial',
      'Tudo começa na página inicial do Dynamis SEP, aberta a qualquer visitante.',
      '.landing-header',
    ),
    {
      titulo: 'Entrar',
      texto: 'O botão Entrar leva ao login. Quem já tem conta passa por aqui.',
      alvo: '.landing-login',
      acao: { tipo: 'clicar' },
      aguardarRota: rotaExata('/login'),
    },
    ...entrarComo(CORRESPONDENTE.email, CORRESPONDENTE.quem),
  ];
}

// ============ CAPÍTULO 1 · CORRESPONDENTE ============

function correspondente(): PassoRoteiro[] {
  return [
    ler(
      'Perfil: correspondente',
      'Quem entrou é a Carla, correspondente majoritária. Ela capta clientes para o SEP e pode credenciar sub-correspondentes, que também captam clientes na rede dela.',
      '.op-conta-trigger, button[aria-label="Menu da conta"]',
      'Correspondente',
    ),
    ...peloMenu(MENU_MEU_BACKOFFICE, {
      rota: '/app/meu-backoffice/rede',
      titulo: 'Submenu Minha rede',
      texto:
        'O submenu Minha rede reúne os sub-correspondentes, os percentuais e a carteira da rede.',
      aguardarAlvo: '[data-tour="cor-rede-kpis"]',
    }).map((p) => ({ ...p, secao: 'Correspondente' })),
    {
      titulo: 'Novo sub-correspondente',
      texto:
        'Este botão abre o cadastro de um novo sub. É o vínculo que identifica de quem vêm os próximos clientes.',
      alvo: '[data-tour="cor-rede-novo"]',
      acao: { tipo: 'clicar' },
      aguardarAlvo: `${NOVO_SUB} input[name="nome"]`,
      secao: 'Correspondente',
    },
    {
      titulo: 'Nome',
      texto: 'O nome de quem vai captar clientes na rede.',
      alvo: `${NOVO_SUB} input[name="nome"]`,
      acao: { tipo: 'digitar', texto: () => 'Mariana Duarte Correspondências', limpar: true },
      secao: 'Correspondente',
    },
    {
      titulo: 'CPF',
      texto:
        'O CPF identifica o sub no cadastro. O campo coloca pontos e traço sozinho. Aqui, um número de exemplo.',
      alvo: `${NOVO_SUB} input[name="cpf"]`,
      acao: { tipo: 'digitar', texto: () => '000.000.000-00', limpar: true },
      secao: 'Correspondente',
    },
    {
      titulo: 'E-mail',
      texto: 'O e-mail será o login do sub no sistema.',
      alvo: `${NOVO_SUB} input[name="email"]`,
      acao: { tipo: 'digitar', texto: () => SUB.email, limpar: true },
      secao: 'Correspondente',
    },
    {
      titulo: 'Telefone',
      texto: 'O telefone para contato.',
      alvo: `${NOVO_SUB} input[name="telefone"]`,
      acao: { tipo: 'digitar', texto: () => '(11) 90000-0000', limpar: true },
      secao: 'Correspondente',
    },
    {
      titulo: 'Repasse: capital de giro',
      texto:
        'Quanto da comissão o sub recebe neste produto. O SEP fixa um teto por produto, e o formulário recusa qualquer valor acima dele.',
      alvo: `${NOVO_SUB} .cor-form label:nth-of-type(5) input`,
      acao: { tipo: 'digitar', texto: () => '1', limpar: true },
      secao: 'Correspondente',
    },
    {
      titulo: 'Repasse: crédito pessoal',
      texto: 'O crédito pessoal tem o próprio teto.',
      alvo: `${NOVO_SUB} .cor-form label:nth-of-type(6) input`,
      acao: { tipo: 'digitar', texto: () => '1.5', limpar: true },
      secao: 'Correspondente',
    },
    {
      titulo: 'Repasse: comissão recorrente',
      texto:
        'E o percentual sobre as parcelas recebidas. A diferença entre o que o SEP paga à Carla e o que ela repassa é a margem dela.',
      alvo: `${NOVO_SUB} .cor-form label:nth-of-type(7) input`,
      acao: { tipo: 'digitar', texto: () => '0.2', limpar: true },
      secao: 'Correspondente',
    },
    {
      titulo: 'Credenciar',
      texto: 'Credenciar envia o cadastro e cria o vínculo do sub com a rede da Carla.',
      alvo: { css: `${NOVO_SUB} button`, texto: 'Credenciar' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-aviso[role="status"]',
      secao: 'Correspondente',
    },
    ler(
      'Sub na lista',
      'A Mariana aparece na rede da Carla, com a margem que sobra para ela. Na demonstração, o SEP valida o cadastro no primeiro acesso dela.',
      '[data-tour="cor-rede-subs"]',
      'Correspondente',
    ),
  ];
}

// ============ CAPÍTULO 2 · SUB-CORRESPONDENTE ============

function subCorrespondente(): PassoRoteiro[] {
  return [
    ...trocarDeConta(SUB.email, SUB.quem).map((p, i) =>
      i === 0 ? { ...p, secao: 'Sub-correspondente' } : p,
    ),
    ler(
      'Perfil: sub-correspondente',
      'Agora o sistema está com a conta da Mariana, que acabou de ser criada. Ela vê a mesma área de correspondente, mas só com a própria carteira.',
      '.cor-kpis',
    ),
    ...peloMenu(MENU_MEU_BACKOFFICE, {
      rota: '/app/meu-backoffice/prospeccao',
      titulo: 'Submenu Prospecção',
      texto: 'O submenu Prospecção abre o funil, da captação ao cliente ativo.',
      aguardarAlvo: '[data-tour="cor-funil"]',
    }),
    {
      titulo: 'Novo prospect',
      texto:
        'A Mariana conheceu uma padaria que precisa de capital de giro e vai registrá-la no funil.',
      alvo: `${NOVO_PROSPECT} summary`,
      acao: { tipo: 'clicar' },
      aguardarAlvo: `${NOVO_PROSPECT} input[name="nome"]`,
    },
    {
      titulo: 'Nome do prospect',
      texto: 'O nome da empresa que pode virar cliente.',
      alvo: `${NOVO_PROSPECT} input[name="nome"]`,
      acao: { tipo: 'digitar', texto: () => CLIENTE_DA_REDE, limpar: true },
    },
    {
      titulo: 'Tipo',
      texto: 'Pessoa jurídica.',
      alvo: `${NOVO_PROSPECT} select[name="tipoPessoa"]`,
      acao: { tipo: 'selecionar', opcao: 'Pessoa jurídica' },
    },
    {
      titulo: 'Telefone',
      texto: 'O contato do cliente.',
      alvo: `${NOVO_PROSPECT} input[name="telefone"]`,
      acao: { tipo: 'digitar', texto: () => '(11) 98888-7777', limpar: true },
    },
    {
      titulo: 'Produto e valor',
      texto:
        'O produto de interesse é capital de giro, para um valor dentro do limite de quinze mil reais do regimento.',
      alvo: `${NOVO_PROSPECT} select[name="produto"]`,
      acao: { tipo: 'selecionar', opcao: 'Capital de giro' },
    },
    {
      titulo: 'Valor estimado',
      texto: 'Seis mil reais, a estimativa da conversa inicial.',
      alvo: `${NOVO_PROSPECT} input[name="valor"]`,
      acao: { tipo: 'digitar', texto: () => '6000', limpar: true },
    },
    {
      titulo: 'Adicionar ao funil',
      texto: 'O prospect entra na primeira etapa do funil: prospectado.',
      alvo: { css: `${NOVO_PROSPECT} button`, texto: 'Adicionar ao funil' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-coluna[data-etapa="PROSPECTADO"] .cor-prospect',
    },
    {
      titulo: 'Primeiro contato',
      texto: 'Depois da conversa, a Mariana avança o prospect para contatado.',
      alvo: { css: '.cor-prospect button', texto: '▸' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-coluna[data-etapa="CONTATADO"] .cor-prospect',
    },
    {
      titulo: 'Em negociação',
      texto: 'O cliente topou conversar sobre condições, e o prospect passa a em negociação.',
      alvo: { css: '.cor-prospect button', texto: '▸' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-coluna[data-etapa="EM_NEGOCIACAO"] .cor-prospect',
    },
    {
      titulo: 'Documentação',
      texto:
        'Agora é a vez dos documentos. Nesta etapa o prospect já é cliente da base da Mariana, e por isso passa a aparecer no envio de documentos.',
      alvo: { css: '.cor-prospect button', texto: '▸' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-coluna[data-etapa="DOCUMENTACAO"] .cor-prospect',
    },
    ...peloMenu(MENU_MEU_BACKOFFICE, {
      rota: '/app/meu-backoffice/documentos',
      titulo: 'Submenu Envio de documentos',
      texto: 'O submenu Envio de documentos reúne o formulário de envio e a lista dos envios.',
      aguardarAlvo: 'select[name="cliente"]',
    }).filter((_, i) => i !== 1),
    {
      titulo: 'Cliente da base',
      texto:
        'Só aparecem clientes com vínculo vigente. A padaria acabou de entrar na base da Mariana.',
      alvo: 'select[name="cliente"]',
      acao: { tipo: 'selecionar', opcao: CLIENTE_DA_REDE },
    },
    {
      titulo: 'Tipo de documento',
      texto: 'O tipo diz ao backoffice o que está sendo enviado.',
      alvo: 'select[name="tipo"]',
      acao: { tipo: 'selecionar', opcao: 'Documento de identidade' },
    },
    {
      titulo: 'Arquivo',
      texto: 'O arquivo do documento. Na demonstração, um arquivo de exemplo, sem dado real.',
      alvo: 'input[type="file"]',
      acao: { tipo: 'anexar', nome: 'documento-exemplo.pdf', tipoMime: 'application/pdf' },
    },
    {
      titulo: 'Atesto de conferência',
      texto:
        'O atesto é obrigatório: registra que a Mariana conferiu o documento com o original, com data e hora.',
      alvo: 'input[name="atesto"]',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Enviar',
      texto: 'O envio entra na fila do backoffice, que vai validar ou devolver.',
      alvo: { css: 'button', texto: 'Enviar documentos' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-aviso[role="status"]',
    },
    ler(
      'Meus envios',
      'O envio aparece como Em validação. Quem decide agora é o backoffice, no próximo capítulo.',
      { css: '.cor-card', texto: 'Meus envios' },
    ),
  ];
}

export const jornadaReal: Roteiro = {
  id: 'jornada-real',
  modulo: 'Jornadas práticas',
  titulo: 'Operação completa nas telas do sistema',
  icone: 'play',
  descricao:
    'Da página inicial ao sistema: correspondente, sub-correspondente e demais perfis em uma operação nova, com dados fictícios.',
  duracao: '≈ 22 min',
  papeis: [],
  area: 'publica',
  rotaInicial: '/',
  reiniciarDemo: true,
  // Ponto de partida de cada capitulo no mock (`prepararJornada`): o que os anteriores teriam criado.
  prepararSecao: {
    'Sub-correspondente': 'sub',
    Backoffice: 'envio',
    Tomador: 'cadastro',
    Análise: 'proposta',
    Credor: 'aprovada',
    Contrato: 'alocada',
    'Desembolso e parcelas': 'assinado',
    'Retorno ao credor': 'quitada',
    'Acessos bloqueados': 'quitada',
  },
  impedimento: (ctx) =>
    ctx.demo
      ? null
      : 'A operação completa só roda no ambiente de demonstração, com dados fictícios.',
  passos: () => [
    ...entrada(),
    ...comEntrada(correspondente(), trocarDeConta(CORRESPONDENTE.email, CORRESPONDENTE.quem)),
    ...subCorrespondente(),
    ...backofficeEnvioECadastro(),
    ...pedidoDoTomador(),
    ...analiseDeCredito(),
    ...credorFinancia(),
    ...formalizacaoDoContrato(),
    ...desembolsoEQuitacao(),
    ...retornoAoCredor(),
    ...tentativasBloqueadas(),
  ],
};

export const ROTEIROS_JORNADA: Roteiro[] = [jornadaReal];

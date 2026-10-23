import { PassoRoteiro } from '../tour.model';
import { comEntrada, peloMenu, trocarDeConta } from './passos-comuns';

// Capítulos 3 a 5 da jornada completa (`jornada.roteiro.ts`): o backoffice valida o envio e cadastra o
// tomador, a operação registra o pedido de crédito em nome dele e o analista aprova a proposta. Tudo nas
// telas reais, com a conta de backoffice do modo demonstração.

export const CLIENTE_DA_REDE = 'Padaria Boa Massa Ltda';
const BACKOFFICE = { email: 'backoffice@empresa.com', quem: 'backoffice' };
const CNPJ_DO_CLIENTE = '11222333000181';
/** Primeira proposta criada pela jornada no mock: os dados recomecam a cada execucao, entao o id e fixo. */
const PROPOSTA_DA_JORNADA = '3f0799c0-98b9-6d9d-bc4a-7d6f5b772201';
const ROTA_PROPOSTA = /^\/app\/credito\/propostas\/(?!nova)[^/?]+(\?.*)?$/;
const ROTA_EMPRESA_DETALHE = /^\/app\/onboarding\/empresa\/[^/?]+(\?.*)?$/;

function ler(titulo: string, texto: string, alvo: PassoRoteiro['alvo']): PassoRoteiro {
  return { titulo, texto, alvo, acao: { tipo: 'observar' } };
}

/** Marca todos os passos com a seção (capítulo) do cartão do tour. */
function secao(nome: string, passos: PassoRoteiro[]): PassoRoteiro[] {
  return passos.map((p) => ({ ...p, secao: nome }));
}

// ============ CAPÍTULO 3 · BACKOFFICE: ENVIO E CADASTRO ============

export function backofficeEnvioECadastro(): PassoRoteiro[] {
  return secao('Backoffice', [
    ...trocarDeConta(BACKOFFICE.email, BACKOFFICE.quem),
    ler(
      'Perfil: backoffice',
      'Agora entra o backoffice, a equipe do SEP que confere os documentos, cadastra os tomadores e analisa o crédito.',
      '.op-nav',
    ),
    ...peloMenu(
      {
        rota: '/app/backoffice',
        titulo: 'Menu Backoffice',
        texto: 'No menu lateral, em Operação, fica o Backoffice.',
      },
      {
        rota: '/app/backoffice/correspondentes',
        titulo: 'Submenu Envios de correspondentes',
        texto: 'O submenu Envios de correspondentes lista o que está aguardando decisão.',
        aguardarAlvo: '.cor-tabela',
      },
    ),
    ler(
      'O envio da Mariana',
      `O primeiro da lista é o envio que a Mariana acabou de fazer: o documento de ${CLIENTE_DA_REDE}, com o atesto de conferência dela. O atesto não substitui a validação do backoffice.`,
      '.cor-tabela tbody tr:first-child',
    ),
    {
      titulo: 'Validar',
      texto: 'O documento está em ordem, então o backoffice valida o envio.',
      alvo: '.cor-tabela tbody tr:first-child .cor-btn:not(.perigo)',
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.cor-aviso[role="status"]',
    },
    ler(
      'Envio validado',
      'O envio mudou para validado, e a Mariana vê a decisão no painel dela. Com o cliente conferido, falta cadastrá-lo como tomador.',
      '.cor-tabela tbody tr:first-child',
    ),
    ...peloMenu(
      {
        rota: '/app/onboarding',
        titulo: 'Menu Onboarding',
        texto:
          'No menu lateral, em Jornadas, fica o Onboarding, o cadastro de quem vai tomar crédito.',
        aguardarAlvo: '.onboarding-choice-grid',
      },
      {
        rota: '/app/onboarding/empresa',
        titulo: 'Submenu Empresa',
        texto: 'O submenu Empresa abre o cadastro de uma empresa, a verificação KYB.',
        aguardarAlvo: '.kyb-form-card',
      },
    ),
    {
      titulo: 'CNPJ',
      texto: 'O CNPJ da padaria, que o campo formata sozinho. Aqui, um número de teste público.',
      alvo: 'input[formControlName="cnpj"]',
      acao: { tipo: 'digitar', texto: () => CNPJ_DO_CLIENTE },
    },
    {
      titulo: 'Razão social',
      texto: 'A razão social, a mesma do cliente que a Mariana trouxe.',
      alvo: 'input[formControlName="razaoSocial"]',
      acao: { tipo: 'digitar', texto: () => CLIENTE_DA_REDE },
    },
    {
      titulo: 'Nome fantasia',
      texto: 'O nome fantasia é opcional.',
      alvo: 'input[formControlName="nomeFantasia"]',
      acao: { tipo: 'digitar', texto: () => 'Boa Massa' },
    },
    {
      titulo: 'Tipo societário',
      texto: 'Sociedade limitada. Este campo também é opcional.',
      alvo: 'select[formControlName="tipoSocietario"]',
      acao: { tipo: 'selecionar', opcao: 'LTDA' },
    },
    {
      titulo: 'Porte',
      texto: 'O porte classifica a empresa pelo faturamento. Aqui, microempresa.',
      alvo: 'select[formControlName="porte"]',
      acao: { tipo: 'selecionar', opcao: 'ME' },
    },
    {
      titulo: 'Continuar',
      texto:
        'Só o CNPJ e a razão social são obrigatórios. Continuar abre o acompanhamento da empresa.',
      alvo: '.kyb-form-card button[type="submit"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_EMPRESA_DETALHE,
      aguardarAlvo: '.kyb-detail-legacy',
    },
    {
      titulo: 'Tipo do documento',
      texto: 'Na tela de acompanhamento, os documentos da empresa. O primeiro é o contrato social.',
      alvo: '.kyb-detail-legacy #tipoDocumento',
      acao: { tipo: 'selecionar', opcao: 'CONTRATO_SOCIAL' },
    },
    {
      titulo: 'Arquivo',
      texto: 'Um PDF de exemplo. A tela só aceita PDF, JPEG e PNG, até dez megabytes.',
      alvo: '.kyb-detail-legacy #arquivo',
      acao: {
        tipo: 'anexar',
        nome: 'contrato-social-demonstracao.pdf',
        tipoMime: 'application/pdf',
      },
    },
    {
      titulo: 'Enviar documento',
      texto: 'O documento é enviado e guardado com o cálculo de integridade.',
      alvo: '.kyb-detail-legacy .sep-onboarding-upload-submit',
      acao: { tipo: 'clicar', efeito: true },
    },
    {
      titulo: 'Enviar para verificação',
      texto:
        'Com os documentos enviados, o cadastro segue para a verificação: o sistema confere os dados da empresa e faz as checagens de prevenção à lavagem de dinheiro.',
      alvo: { css: '.kyb-detail-legacy > button', texto: 'Enviar para verificação' },
      acao: { tipo: 'clicar', efeito: true },
    },
    ler(
      'Cadastro aprovado',
      'A verificação terminou, e o tomador está aprovado. É isso que libera pedir crédito para ele.',
      '.kyb-detail-legacy .sep-onboarding-status-badge',
    ),
  ]);
}

// ============ CAPÍTULO 4 · TOMADOR: O PEDIDO DE CRÉDITO ============

export function pedidoDoTomador(): PassoRoteiro[] {
  return secao(
    'Tomador',
    comEntrada(
      [
        {
          titulo: 'Perfil: tomador',
          texto:
            'O tomador é a padaria. Ele não tem uma tela própria: quem registra o cadastro e o pedido em nome dele é a equipe de operação. Por isso o pedido de crédito sai desta mesma conta, com os dados que a padaria informou.',
        },
        ...peloMenu(
          {
            rota: '/app/credito',
            titulo: 'Menu Crédito',
            texto: 'No menu lateral, em Jornadas, fica o Crédito.',
            aguardarAlvo: '.credit-metrics',
          },
          {
            rota: '/app/credito/propostas/nova',
            titulo: 'Submenu Nova proposta',
            texto: 'O submenu Nova proposta abre o formulário para solicitar crédito.',
            aguardarAlvo: '.proposal-create-page form',
          },
        ),
        ler(
          'Origem da proposta',
          'A proposta nasce de um onboarding aprovado. Sem o cadastro que acabamos de fazer, o sistema não deixaria pedir crédito.',
          'select[formControlName="solicitacaoOnboardingId"]',
        ),
        {
          titulo: 'Finalidade',
          texto: 'A padaria quer capital de giro, para comprar estoque.',
          alvo: 'select[formControlName="finalidade"]',
          acao: { tipo: 'selecionar', opcao: 'Capital de giro' },
        },
        {
          titulo: 'Um valor acima do teto',
          texto:
            'Primeiro, um teste: vinte mil reais. O regimento do SEP limita cada proposta a quinze mil reais.',
          alvo: '.money-control input',
          acao: { tipo: 'digitar', texto: () => '2000000' },
          aguardarAlvo: '.field-error',
        },
        ler(
          'A trava do teto',
          'O formulário recusa na hora e explica o motivo. O teto vale para toda proposta.',
          '.field-error',
        ),
        {
          titulo: 'Valor dentro do limite',
          texto: 'Corrigido para seis mil reais, o que a padaria precisa. O erro some.',
          alvo: '.money-control input',
          acao: { tipo: 'digitar', texto: () => '600000' },
        },
        {
          titulo: 'Prazo',
          texto: 'Doze meses, o que define o número de parcelas.',
          alvo: 'select[formControlName="prazoMeses"]',
          acao: { tipo: 'selecionar', opcao: '12' },
        },
        {
          titulo: 'Observações',
          texto: 'A justificativa do pedido, que o analista vai ler.',
          alvo: 'textarea[formControlName="descricao"]',
          acao: { tipo: 'digitar', texto: () => 'Compra de estoque para a alta temporada.' },
        },
        ler(
          'Simulação',
          'Com valor e prazo, a simulação calcula parcela, taxa, imposto e custo total estimados. As condições finais só saem depois da análise.',
          '.simulation-section',
        ),
        {
          titulo: 'Enviar proposta',
          texto: 'O pedido é enviado. Ele nasce em análise e vai para a equipe de crédito.',
          alvo: '.submit-button',
          acao: { tipo: 'clicar', efeito: true },
          aguardarRota: ROTA_PROPOSTA,
          aguardarAlvo: '.px28-metricas',
        },
        ler(
          'Proposta criada',
          'A proposta da padaria está criada e em análise de crédito.',
          '.px28-heading',
        ),
      ],
      trocarDeConta(BACKOFFICE.email, BACKOFFICE.quem),
    ),
  );
}

// ============ CAPÍTULO 5 · BACKOFFICE: ANÁLISE DE CRÉDITO ============

export function analiseDeCredito(): PassoRoteiro[] {
  return secao(
    'Análise',
    comEntrada(
      [
        {
          titulo: 'Mais ações',
          texto:
            'De volta ao papel do backoffice: no menu de três pontos da proposta fica o atalho para a análise de crédito.',
          alvo: 'button[aria-label="Mais ações da proposta"]',
          acao: { tipo: 'clicar' },
          aguardarAlvo: '.px28-menu',
        },
        {
          titulo: 'Abrir a análise',
          texto: 'Análise de crédito leva à tela com as fontes de consulta, o score e o parecer.',
          alvo: 'a[role="menuitem"][href$="/analise"]',
          acao: { tipo: 'clicar' },
          aguardarRota: /\/analise(\?.*)?$/,
          aguardarAlvo: '[data-tour="analise-executar"]',
        },
        {
          titulo: 'Consentimento do titular',
          texto:
            'A consulta aos bureaus exige o consentimento do titular, conforme a LGPD. Sem esta confirmação o botão não habilita.',
          alvo: 'input[name="consent"]',
          acao: { tipo: 'clicar' },
        },
        {
          titulo: 'Executar a análise',
          texto:
            'O sistema consulta os bureaus e o SCR do Banco Central e calcula o score interno, que se explica fator por fator.',
          alvo: '[data-tour="analise-executar"] button.cor-btn',
          acao: { tipo: 'clicar', efeito: true },
          aguardarAlvo: '[data-tour="analise-resultado"]',
        },
        ler(
          'Resultado',
          'O motor sugere uma decisão, com o score de zero a mil e a faixa de risco. Quem decide é o analista.',
          '[data-tour="analise-resultado"]',
        ),
        {
          titulo: 'Decisão do analista',
          texto: 'O analista acata o motor e aprova a proposta.',
          alvo: 'select[name="decisao"]',
          acao: { tipo: 'selecionar', opcao: 'Aprovar' },
        },
        {
          titulo: 'Justificativa',
          texto: 'Todo parecer leva a justificativa, que fica registrada na trilha de auditoria.',
          alvo: 'input[name="justificativa"]',
          acao: {
            tipo: 'digitar',
            texto: () =>
              'Cadastro aprovado, documentos conferidos e capacidade de pagamento compatível com o valor.',
          },
        },
        {
          titulo: 'Registrar o parecer',
          texto:
            'O parecer é registrado, e a proposta passa de em análise para aprovada. É o que gera o contrato.',
          alvo: { css: '[data-tour="analise-parecer"] button', texto: 'Registrar parecer' },
          acao: { tipo: 'clicar', efeito: true },
          aguardarAlvo: '[data-tour="analise-parecer"] .cor-selo',
        },
        ler(
          'Parecer registrado',
          'O parecer aparece com o nome de quem decidiu. A proposta está aprovada e segue para a formalização do contrato.',
          '[data-tour="analise-parecer"]',
        ),
      ],
      [
        ...trocarDeConta(BACKOFFICE.email, BACKOFFICE.quem),
        {
          titulo: 'Abrir a proposta',
          texto: 'A proposta da padaria, em análise, é aberta.',
          alvo: '.op-nav',
          acao: { tipo: 'navegar', rota: `/app/credito/propostas/${PROPOSTA_DA_JORNADA}` },
          aguardarAlvo: '.px28-metricas',
        },
      ],
    ),
  );
}

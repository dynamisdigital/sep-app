import { ContextoRoteiro, Roteiro } from '../tour.model';
import { peloMenu } from './passos-comuns';

// Tours assistidos da conta escrow: a face do credor (Credora) e a da operacao (Backoffice). Os
// dados sao ficticios (MSW). Nenhum passo pede TOTP: o mock nao implementa step-up para estas
// telas, e os cliques que gravam (aporte, desembolso, repasse) so executam em demonstracao.
// Ficam fora dos "Modulo completo" de Credora e Backoffice de proposito: os dois modulos tem
// jornadas proprias, e a escrow e um assunto a parte.

const CONTA_CREDOR_ESCROW = 'credora-pf@empresa.com';

function soComConta(conta: string, motivo: string): Roteiro['impedimento'] {
  return (ctx: ContextoRoteiro) => (ctx.demo && ctx.usuario !== conta ? motivo : null);
}

const IMPEDIMENTO_CREDOR = soComConta(
  CONTA_CREDOR_ESCROW,
  `Requer um credor com conta escrow. Entre como ${CONTA_CREDOR_ESCROW}.`,
);

/** O botao pelo texto: o `alvo` com `texto` casa o primeiro botao visivel com esse texto. */
function botaoComTexto(texto: string): boolean {
  return Array.from(document.querySelectorAll('.pxe-btn-mini')).some(
    (b) => (b.textContent ?? '').includes(texto) && !(b as HTMLButtonElement).disabled,
  );
}

// ============ CREDORA ============

const MENU_CREDORA = {
  rota: '/app/credora',
  titulo: 'Menu Credora',
  texto: 'No menu lateral, em Jornadas, fica a Credora. A conta escrow é um submenu dela.',
  chegada: /^\/app\/credora(\/.*)?$/,
};

const PAPEIS_CREDOR: Roteiro['papeis'] = ['CLIENTE'];
const MODULO_CREDORA = 'Credora';

const conta: Roteiro = {
  id: 'credora-escrow-conta',
  modulo: MODULO_CREDORA,
  titulo: 'Conta escrow e extrato',
  icone: 'landmark',
  descricao: 'Os saldos do credor, o aporte por Pix e o extrato de lançamentos.',
  duracao: '≈ 2 min',
  papeis: PAPEIS_CREDOR,
  impedimento: IMPEDIMENTO_CREDOR,
  passos: () => [
    {
      titulo: 'Conta escrow',
      texto:
        'Este roteiro mostra a conta onde ficam os recursos do credor, separada do patrimônio da SEP.',
    },
    ...peloMenu(MENU_CREDORA, {
      rota: '/app/credora/conta',
      titulo: 'Submenu Conta escrow',
      texto: 'O submenu Conta escrow abre os saldos e o extrato.',
      aguardarAlvo: '.pxe-metricas',
    }),
    {
      titulo: 'Os quatro saldos',
      texto:
        'O dinheiro do credor está sempre em um de quatro estados: disponível, reservado para uma operação, em operação, ou a posição total que soma tudo.',
      alvo: '.pxe-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Aportar por Pix',
      texto:
        'O aporte só entra no saldo depois que o parceiro confirma o depósito na conta vinculada. Aqui, quinhentos reais.',
      alvo: '#pxe-aporte-valor',
      acao: { tipo: 'digitar', texto: () => '500,00', limpar: true },
    },
    {
      titulo: 'Gerar o Pix',
      texto: 'O botão gera o Pix copia e cola, que fica aguardando o pagamento.',
      alvo: { css: 'button[type="submit"]', texto: 'Gerar Pix de aporte' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.pxe-pix',
    },
    {
      titulo: 'Aguardando pagamento',
      texto:
        'O aporte aparece como pendente. No ambiente de demonstração há um botão para simular o pagamento, que em produção é um aviso do parceiro.',
      alvo: '.pxe-lista',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.pxe-lista'),
    },
    {
      titulo: 'Extrato',
      texto:
        'O extrato é um livro de lançamentos que não se apaga: um erro é corrigido por um estorno, nunca por uma edição.',
      alvo: '.pxe-tabela-card',
      acao: { tipo: 'observar' },
    },
  ],
};

const alocacoes: Roteiro = {
  id: 'credora-escrow-alocacoes',
  modulo: MODULO_CREDORA,
  titulo: 'Alocar recursos',
  icone: 'trending-up',
  descricao: 'A reserva de saldo em uma oportunidade, o limite por devedor e o cancelamento.',
  duracao: '≈ 2 min',
  papeis: PAPEIS_CREDOR,
  impedimento: IMPEDIMENTO_CREDOR,
  passos: () => [
    {
      titulo: 'Alocações',
      texto: 'Este roteiro mostra como o credor reserva saldo da conta escrow em uma oportunidade.',
    },
    ...peloMenu(MENU_CREDORA, {
      rota: '/app/credora/alocacoes',
      titulo: 'Submenu Alocações',
      texto: 'O submenu Alocações abre a reserva de recursos.',
      aguardarAlvo: '.pxe-tabela-card',
    }),
    {
      titulo: 'Nova alocação',
      texto:
        'Aqui o credor escolhe a oportunidade e o valor. O saldo disponível aparece no topo do cartão.',
      alvo: '.pxe-bloco',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Limite por devedor',
      texto:
        'Credor comum pode ter até quinze mil reais em saldo devedor com cada tomador, e pode emprestar a outros tomadores, cada um com o seu limite. Conforme as parcelas são pagas, o espaço volta. Investidor qualificado é isento.',
      alvo: '.pxe-limite',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.pxe-limite'),
    },
    {
      titulo: 'Ciência do risco',
      texto:
        'Antes de reservar, o credor declara ciência de que o crédito envolve risco de inadimplência e de perda, e de que a SEP não garante o pagamento.',
      alvo: '.pxe-check',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.pxe-check'),
    },
    {
      titulo: 'Como funciona',
      texto:
        'A reserva sai do saldo disponível. Se a operação não se formar, volta sozinha. Formada, o tomador recebe em até cinco dias úteis, e as parcelas voltam em até um dia útil.',
      alvo: '.pxe-grade .pxe-bloco:nth-child(2)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Minhas alocações',
      texto:
        'A tabela mostra cada alocação com a situação. Enquanto está apenas reservada, ela pode ser cancelada.',
      alvo: '.pxe-tabela-card',
      acao: { tipo: 'observar' },
    },
  ],
};

const saques: Roteiro = {
  id: 'credora-escrow-saques',
  modulo: MODULO_CREDORA,
  titulo: 'Sacar saldo',
  icone: 'banknote',
  descricao: 'As contas de destino de mesma titularidade e o pedido de saque.',
  duracao: '≈ 2 min',
  papeis: PAPEIS_CREDOR,
  impedimento: IMPEDIMENTO_CREDOR,
  passos: () => [
    {
      titulo: 'Saques',
      texto: 'Este roteiro mostra como o credor retira saldo disponível da conta escrow.',
    },
    ...peloMenu(MENU_CREDORA, {
      rota: '/app/credora/saques',
      titulo: 'Submenu Saques',
      texto: 'O submenu Saques abre o pedido de saque e as contas de destino.',
      aguardarAlvo: '.pxe-tabela-card',
    }),
    {
      titulo: 'Contas de destino',
      texto:
        'O saque só vai para conta de mesma titularidade e previamente cadastrada. É a trava contra o desvio do dinheiro.',
      alvo: '.pxe-grade .pxe-bloco:nth-child(2)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Solicitar saque',
      texto:
        'O credor escolhe a conta de destino e o valor. O limite é o saldo disponível, mostrado acima do formulário.',
      alvo: '#pxe-saque-destino',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Valor do saque',
      texto: 'Aqui, cem reais.',
      alvo: '#pxe-saque-valor',
      acao: { tipo: 'digitar', texto: () => '100,00', limpar: true },
    },
    {
      titulo: 'Aprovação em dupla',
      texto:
        'O pedido não sai direto: fica aguardando a aprovação da tesouraria. Quem pede não é quem aprova.',
      alvo: { css: 'button[type="submit"]', texto: 'Solicitar saque' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.pxe-ok-form',
    },
    {
      titulo: 'Histórico de saques',
      texto: 'O histórico mostra a situação de cada pedido: aguardando, aprovado ou rejeitado.',
      alvo: '.pxe-tabela-card',
      acao: { tipo: 'observar' },
    },
  ],
};

export const ROTEIROS_ESCROW_CREDOR: Roteiro[] = [conta, alocacoes, saques];

// ============ BACKOFFICE ============

const PAPEIS_OPERACAO: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE'];
const MODULO_BACKOFFICE = 'Backoffice';

const MENU_BACKOFFICE = {
  rota: '/app/backoffice',
  titulo: 'Menu Backoffice',
  texto:
    'No menu lateral, em Operação, fica o Backoffice, com os submenus de Credores e Tesouraria.',
  chegada: /^\/app\/backoffice(\/.*)?$/,
};

/** Detalhe de um credor. */
const ROTA_CREDOR = /^\/app\/backoffice\/credores\/[^/?]+(\?.*)?$/;

const credores: Roteiro = {
  id: 'backoffice-credores',
  modulo: MODULO_BACKOFFICE,
  titulo: 'Credores',
  icone: 'users',
  descricao: 'A fila de cadastros, o detalhe de um credor e as decisões de status.',
  duracao: '≈ 2 min',
  papeis: PAPEIS_OPERACAO,
  passos: () => [
    {
      titulo: 'Credores',
      texto: 'Este roteiro mostra como a operação analisa e administra os credores da escrow.',
    },
    ...peloMenu(MENU_BACKOFFICE, {
      rota: '/app/backoffice/credores',
      titulo: 'Submenu Credores',
      texto: 'O submenu Credores abre a lista de todos os credores.',
      aguardarAlvo: '.pxe-tabela-card',
    }),
    {
      titulo: 'Filtros por situação',
      texto:
        'Os filtros separam os credores por situação e mostram quantos há em cada uma. Os cadastros em análise são a fila de trabalho.',
      alvo: '.pxe-filtros',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Lista de credores',
      texto:
        'A tabela traz o tipo de pessoa, a categoria (comum ou qualificado), o perfil de risco, a situação e a posição total de cada credor.',
      alvo: '.pxe-tabela-card',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Abrir um credor',
      texto: 'O botão Abrir leva ao detalhe do credor.',
      alvo: '.pxe-tabela-card tbody tr:first-child a.pxe-btn-mini',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_CREDOR,
      aguardarAlvo: '.pxe-bloco',
    },
    {
      titulo: 'Gestão do credor',
      texto:
        'Quem decide é o Backoffice ou a Administração: aprovar ou reprovar um cadastro, suspender ou reativar, e ajustar o perfil e a categoria. Toda decisão pede motivo e fica na auditoria.',
      alvo: '.pxe-grade .pxe-bloco:nth-child(2)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Extrato e auditoria',
      texto:
        'Abaixo ficam o extrato da escrow do credor e a trilha de auditoria: quem decidiu o quê, quando e por quê.',
      alvo: '.pxe-tabela-card',
      acao: { tipo: 'observar' },
    },
  ],
};

const tesouraria: Roteiro = {
  id: 'backoffice-tesouraria',
  modulo: MODULO_BACKOFFICE,
  titulo: 'Tesouraria da escrow',
  icone: 'landmark',
  descricao: 'Desembolso das operações, repasse das parcelas aos credores e aprovação de saques.',
  duracao: '≈ 3 min',
  papeis: PAPEIS_OPERACAO,
  passos: () => [
    {
      titulo: 'Tesouraria',
      texto:
        'Este roteiro mostra o trabalho da tesouraria: formar operações, repassar parcelas e aprovar saques.',
    },
    ...peloMenu(MENU_BACKOFFICE, {
      rota: '/app/backoffice/tesouraria',
      titulo: 'Submenu Tesouraria',
      texto: 'O submenu Tesouraria abre a operação financeira da escrow.',
      aguardarAlvo: '.pxe-metricas',
    }),
    {
      titulo: 'Resumo da custódia',
      texto:
        'Os cartões somam o total custodiado, o disponível, o reservado e o que está em operação. Aportes e saques pendentes aparecem logo abaixo.',
      alvo: '.pxe-metricas',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Oportunidades e formação',
      texto:
        'Cada oportunidade mostra quanto já foi reservado. Quando a reserva cobre o valor, ela fica pronta para desembolso. Sem cobrir, a operação pode ser encerrada, com motivo, e as reservas voltam aos credores.',
      alvo: 'article.pxe-tabela-card:nth-of-type(1)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Desembolsar',
      texto:
        'O desembolso forma a operação: o principal sai das reservas dos credores e vai ao devedor, e nasce o cronograma de parcelas.',
      alvo: { css: '.pxe-btn-mini', texto: 'Desembolsar' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.pxe-ok-form',
      pularSe: () => !botaoComTexto('Desembolsar'),
    },
    {
      titulo: 'Operações e repasse',
      texto:
        'Cada operação formada mostra quantas parcelas já foram repassadas, o saldo em operação e a próxima parcela.',
      alvo: 'article.pxe-tabela-card:nth-of-type(2)',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Repassar a parcela',
      texto:
        'Quando o tomador paga, o repasse divide principal e juros entre os credores, na proporção de cada um. O principal reduz o saldo em operação; os juros viram saldo disponível.',
      alvo: { css: '.pxe-btn-mini', texto: 'Repassar parcela' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.pxe-ok-form',
      pularSe: () => !botaoComTexto('Repassar parcela'),
    },
    {
      titulo: 'Saques e divergências',
      texto:
        'Embaixo ficam os saques que aguardam aprovação, sempre por alguém diferente de quem pediu, e as divergências da conciliação com o parceiro.',
      alvo: '.pxe-grade',
      acao: { tipo: 'observar' },
    },
  ],
};

export const ROTEIROS_ESCROW_OPERACAO: Roteiro[] = [credores, tesouraria];

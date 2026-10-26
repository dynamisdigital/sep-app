import { PassoRoteiro } from '../tour.model';
import {
  ROTA_STEP_UP,
  comEntrada,
  confirmarComTotp,
  peloMenu,
  rotaExata,
  trocarDeConta,
} from './passos-comuns';
import { CLIENTE_DA_REDE } from './jornada-operacao.roteiro';

// Capítulos 6 a 9 da jornada completa (`jornada.roteiro.ts`): o credor financia a proposta aprovada, a
// administração formaliza o contrato e desembolsa, as parcelas são pagas e repassadas até a quitação, e o
// credor vê o retorno na própria conta. Tudo nas telas reais, no modo demonstração.

const CREDOR = { email: 'credora-pf@empresa.com', quem: 'credor' };
const ADMIN = { email: 'admin@empresa.com', quem: 'administrador' };
const ROTA_CONTRATO = /^\/app\/formalizacao\/contratos\/[^/?]+(\?.*)?$/;
const PARCELAS = 12;
const LINHA_DA_OPERACAO = `article.pxe-tabela-card:nth-of-type(2) tbody tr[data-devedor="${CLIENTE_DA_REDE}"]`;

/**
 * Id do primeiro contrato criado pela jornada no mock (`criarContratoDaProposta`): como os dados recomeçam
 * a cada execução, o primeiro contrato da demonstração sempre tem este identificador.
 */
const CONTRATO_DA_JORNADA = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772301';

const MENU_CREDORA = {
  rota: '/app/credora',
  titulo: 'Menu Credora',
  texto: 'No menu lateral, em Jornadas, fica a Credora. A conta escrow é um submenu dela.',
  chegada: /^\/app\/credora(\/.*)?$/,
};

const MENU_BACKOFFICE = {
  rota: '/app/backoffice',
  titulo: 'Menu Backoffice',
  texto: 'No menu lateral, em Operação, fica o Backoffice.',
};

function ler(titulo: string, texto: string, alvo: PassoRoteiro['alvo']): PassoRoteiro {
  return { titulo, texto, alvo, acao: { tipo: 'observar' } };
}

function secao(nome: string, passos: PassoRoteiro[]): PassoRoteiro[] {
  return passos.map((p) => ({ ...p, secao: nome }));
}

const BOTAO_DA_PADARIA = (acao: string) =>
  `button[data-acao="${acao}"][data-devedor="${CLIENTE_DA_REDE}"]`;

// ============ CAPÍTULO 6 · CREDOR ============

export function credorFinancia(): PassoRoteiro[] {
  return secao('Credor', [
    ...trocarDeConta(CREDOR.email, CREDOR.quem),
    ler(
      'Perfil: credor',
      'Agora entra o credor, a Helena, quem financia as operações com o próprio dinheiro. O dinheiro dela fica numa conta escrow, separada do patrimônio do SEP.',
      '.op-nav',
    ),
    ...peloMenu(MENU_CREDORA, {
      rota: '/app/credora/conta',
      titulo: 'Submenu Conta escrow',
      texto: 'O submenu Conta escrow abre os saldos e o extrato.',
      aguardarAlvo: '.pxe-metricas',
    }),
    ler(
      'Os saldos',
      'O dinheiro do credor está sempre em um de quatro estados: disponível, reservado para uma operação, em operação, ou a posição total que soma tudo.',
      '.pxe-metricas',
    ),
    {
      titulo: 'Aportar por Pix',
      texto:
        'Para financiar a padaria, a Helena precisa de saldo. O aporte entra por Pix, aqui seis mil reais.',
      alvo: '#pxe-aporte-valor',
      acao: { tipo: 'digitar', texto: () => '6000,00', limpar: true },
    },
    {
      titulo: 'Gerar o Pix',
      texto: 'O botão gera o Pix copia e cola, que fica aguardando o pagamento.',
      alvo: { css: 'button[type="submit"]', texto: 'Gerar Pix de aporte' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.pxe-pix',
    },
    {
      titulo: 'Confirmar o pagamento',
      texto:
        'O aporte só vira saldo quando o parceiro confirma o depósito. Em produção isso é um aviso do banco; na demonstração, este botão simula o pagamento.',
      alvo: { css: '.pxe-btn-mini', texto: 'Simular pagamento' },
      acao: { tipo: 'clicar', efeito: true },
    },
    ler(
      'Saldo disponível',
      'O aporte foi confirmado e o saldo disponível da Helena subiu. Agora ela pode reservar esse valor em uma oportunidade.',
      '.pxe-metricas',
    ),
    ...peloMenu(MENU_CREDORA, {
      rota: '/app/credora/alocacoes',
      titulo: 'Submenu Alocações',
      texto: 'O submenu Alocações abre a reserva de recursos em oportunidades.',
      aguardarAlvo: '.pxe-tabela-card',
    }),
    {
      titulo: 'Escolher a oportunidade',
      texto:
        'A proposta da padaria, aprovada na análise, aparece aqui como oportunidade de financiamento, com o valor e o prazo.',
      alvo: '#pxe-aloc-oportunidade',
      acao: { tipo: 'selecionar', opcao: CLIENTE_DA_REDE },
    },
    ler(
      'Taxa e limite',
      'A tela mostra a taxa, quanto já foi reservado e o limite por devedor. Credor comum pode ter até quinze mil reais com cada tomador.',
      '.pxe-limite',
    ),
    {
      titulo: 'Valor da alocação',
      texto: 'A Helena financia a operação inteira: seis mil reais.',
      alvo: '#pxe-aloc-valor',
      acao: { tipo: 'digitar', texto: () => '6000,00', limpar: true },
    },
    {
      titulo: 'Ciência do risco',
      texto:
        'Antes de reservar, o credor declara ciência de que crédito entre pessoas envolve risco de inadimplência e de perda, e de que o SEP não garante o pagamento.',
      alvo: '.pxe-check input',
      acao: { tipo: 'clicar' },
    },
    {
      titulo: 'Reservar o valor',
      texto: 'O valor sai do saldo disponível e fica reservado para a operação.',
      alvo: { css: 'button[type="submit"]', texto: 'Reservar valor' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.pxe-ok-form',
    },
    ler(
      'Minhas alocações',
      'A reserva aparece como reservada. Enquanto a operação não é formada, a Helena pode cancelá-la e o valor volta ao saldo.',
      '.pxe-tabela-card',
    ),
  ]);
}

// ============ CAPÍTULO 7 · ADMINISTRAÇÃO: FORMALIZAÇÃO ============

export function formalizacaoDoContrato(): PassoRoteiro[] {
  return secao('Contrato', [
    ...trocarDeConta(ADMIN.email, ADMIN.quem),
    ler(
      'Perfil: administração',
      'Com a operação financiada, volta a administração. Aceitar um contrato e enviar dinheiro são operações sensíveis, e só quem tem verificação em duas etapas pode fazê-las.',
      '.op-nav',
    ),
    ...peloMenu({
      rota: '/app/formalizacao',
      titulo: 'Menu Formalização',
      texto: 'No menu lateral, em Jornadas, fica a Formalização: proposta aprovada vira contrato.',
      aguardarAlvo: '.contract-row',
    }),
    {
      titulo: 'Acessar o contrato',
      texto:
        'Aqui está o contrato da padaria, gerado quando a proposta foi aprovada. O botão abre o documento.',
      alvo: '.contract-featured .contract-action',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_CONTRATO,
      aguardarAlvo: '.document-sheet',
    },
    ler(
      'O contrato',
      `O documento traz o tomador, ${CLIENTE_DA_REDE}, o valor de seis mil reais e as doze parcelas. Cada versão tem um cálculo de integridade, para provar que não foi alterado.`,
      '.document-sheet',
    ),
    {
      titulo: 'Aceitar o contrato',
      texto:
        'Ao aceitar, quem assina confirma que leu todas as cláusulas. Por isso o botão pede uma segunda confirmação de identidade.',
      alvo: 'button[aria-label="Aceitar contrato"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: ROTA_STEP_UP,
    },
    ...confirmarComTotp({
      motivo:
        'Aceitar um contrato tem validade jurídica. O sistema pede o código do autenticador antes de registrar.',
      aoConfirmar:
        'Confirmado o código, o sistema volta ao contrato, e o aceite é enviado de novo.',
      destino: ROTA_CONTRATO,
    }),
    {
      titulo: 'Registrar o aceite',
      texto: 'Com a confirmação válida, o botão registra o aceite.',
      alvo: 'button[aria-label="Aceitar contrato"]',
      acao: { tipo: 'clicar', efeito: true },
      aguardarAlvo: '.accepted',
    },
    ler(
      'Em assinatura',
      'O contrato passou para em assinatura: o documento seguiu para o provedor de assinatura digital, e a linha do tempo acompanha.',
      '.contract-timeline',
    ),
    {
      titulo: 'Assinatura concluída',
      texto:
        'Quando todos assinam, o provedor avisa o sistema e o contrato fica assinado. Na demonstração esse aviso é simulado, e a partir daqui o contrato está liberado para desembolso.',
      alvo: '.contract-timeline',
      acao: { tipo: 'demo', caminho: '/__demo/assinatura-concluida' },
    },
  ]);
}

// ============ CAPÍTULO 8 · DESEMBOLSO, PARCELAS E QUITAÇÃO ============

function preencherDesembolso(retomada: boolean): PassoRoteiro[] {
  return [
    {
      titulo: retomada ? 'Contrato, de novo' : 'Contrato',
      texto: retomada
        ? 'Ao voltar da confirmação, a tela recomeça. Os mesmos dados entram outra vez.'
        : 'O desembolso nasce de um contrato assinado. Aqui entra o identificador do contrato da padaria.',
      alvo: '.px21-novo input[formcontrolname="contratoId"]',
      acao: { tipo: 'digitar', texto: () => CONTRATO_DA_JORNADA },
    },
    {
      titulo: 'Valor',
      texto: 'O valor a enviar à padaria: seis mil reais.',
      alvo: '.px21-novo input[formcontrolname="valor"]',
      acao: { tipo: 'digitar', texto: () => '600000' },
    },
    {
      titulo: 'Chave Pix',
      texto: 'E a chave Pix da padaria. Aqui, um CNPJ de demonstração.',
      alvo: '.px21-novo input[formcontrolname="chavePixDestino"]',
      acao: { tipo: 'digitar', texto: () => '11222333000181' },
    },
  ];
}

export function desembolsoEQuitacao(): PassoRoteiro[] {
  // O tour mostra a primeira parcela e a ultima. As do meio seguem o mesmo caminho e sao adiantadas pelo mock;
  // antes da ultima, o credor confere na propria conta a entrada de credito do que ja foi repassado.
  const repasse = (numero: number, texto: string): PassoRoteiro => ({
    titulo: `Parcela ${numero} de ${PARCELAS}`,
    texto,
    alvo: BOTAO_DA_PADARIA('repassar'),
    acao: { tipo: 'clicar', efeito: true },
    // Só segue quando a tabela mostra a parcela repassada e, se houver outra, o botão dela já está habilitado:
    // ele fica desabilitado enquanto o repasse anterior grava, e um clique nele não faria nada.
    aguardarAlvo:
      numero < PARCELAS
        ? `${LINHA_DA_OPERACAO}[data-parcelas="${numero}"] ${BOTAO_DA_PADARIA('repassar')}:not([disabled])`
        : `${LINHA_DA_OPERACAO}[data-parcelas="${PARCELAS}"]`,
  });
  const primeiraParcela = repasse(
    1,
    'O primeiro mês passa e a padaria paga a parcela. A tesouraria repassa aos credores: o principal reduz o saldo em operação, e os juros viram saldo disponível.',
  );
  const ultimaParcela = repasse(
    PARCELAS,
    'A última parcela é paga e repassada. A operação chega ao fim.',
  );
  const parcelasDoMeio: PassoRoteiro = {
    titulo: `Parcelas 2 a ${PARCELAS - 1}`,
    texto: `Os meses seguintes se repetem do mesmo jeito: a padaria paga, a tesouraria repassa. Aqui as parcelas de 2 a ${PARCELAS - 1} são adiantadas, sem repetir cada clique.`,
    alvo: `${LINHA_DA_OPERACAO}`,
    acao: { tipo: 'demo', caminho: `/__demo/repassar-parcelas?ate=${PARCELAS - 1}` },
  };
  const credorConfere: PassoRoteiro[] = [
    ...trocarDeConta(CREDOR.email, CREDOR.quem),
    ...peloMenu(MENU_CREDORA, {
      rota: '/app/credora/conta',
      titulo: 'Submenu Conta escrow',
      texto: 'Antes da última parcela, a Helena confere a própria conta escrow.',
      aguardarAlvo: '.pxe-metricas',
    }),
    ler(
      'Saldo em operação e disponível',
      `Com ${PARCELAS - 1} parcelas repassadas, o principal já voltou quase todo: o saldo em operação encolheu, e os juros recebidos estão no disponível.`,
      '.pxe-metricas',
    ),
    ler(
      'A entrada de crédito de cada parcela',
      'No extrato, cada parcela repassada aparece como duas entradas de crédito: o retorno do principal e o retorno dos juros. É assim que o credor confere que o dinheiro realmente chegou.',
      '.pxe-tabela-card',
    ),
  ];
  const voltaATesouraria: PassoRoteiro[] = [
    ...trocarDeConta(ADMIN.email, ADMIN.quem),
    ...peloMenu(MENU_BACKOFFICE, {
      rota: '/app/backoffice/tesouraria',
      titulo: 'Submenu Tesouraria',
      texto: 'De volta à tesouraria, para repassar a última parcela e encerrar a operação.',
      aguardarAlvo: '.pxe-metricas',
    }),
  ];

  return secao(
    'Desembolso e parcelas',
    comEntrada(
      [
        ...peloMenu(MENU_BACKOFFICE, {
          rota: '/app/backoffice/tesouraria',
          titulo: 'Submenu Tesouraria',
          texto: 'O submenu Tesouraria abre a operação financeira da escrow.',
          aguardarAlvo: '.pxe-metricas',
        }),
        ler(
          'Pronta para desembolso',
          'A reserva da Helena cobre o valor inteiro da oportunidade, e por isso a padaria aparece como pronta para desembolso.',
          '.pxe-tabela-card',
        ),
        {
          titulo: 'Desembolsar',
          texto:
            'O desembolso forma a operação: o principal sai da reserva do credor, e nasce o cronograma de doze parcelas.',
          alvo: BOTAO_DA_PADARIA('desembolsar'),
          acao: { tipo: 'clicar', efeito: true },
          aguardarAlvo: '.pxe-ok-form',
        },
        ler(
          'Operação formada',
          'A operação aparece na tabela de baixo, com zero de doze parcelas repassadas e o saldo em operação.',
          'article.pxe-tabela-card:nth-of-type(2)',
        ),
        ...peloMenu(
          {
            rota: '/app/pix',
            titulo: 'Menu Pix',
            texto: 'No menu lateral, em Operação, fica o Pix.',
            aguardarAlvo: '.px20-metrics',
          },
          {
            rota: '/app/pix/desembolsos',
            titulo: 'Submenu Desembolsos',
            texto: 'O submenu Desembolsos abre as transferências enviadas.',
            aguardarAlvo: '.px21-consulta',
          },
        ),
        {
          titulo: 'Solicitar desembolso',
          texto:
            'Falta o dinheiro chegar à padaria. Este botão abre o formulário de um novo desembolso por Pix.',
          alvo: '.px21-novo-cta',
          acao: { tipo: 'clicar' },
          aguardarAlvo: '.px21-novo',
        },
        ...preencherDesembolso(false),
        {
          titulo: 'Enviar a solicitação',
          texto: 'Como move dinheiro, o sistema pede a segunda confirmação de identidade.',
          alvo: { css: '.px21-novo button[type="submit"]', texto: 'Solicitar desembolso' },
          acao: { tipo: 'clicar', efeito: true },
          aguardarRota: ROTA_STEP_UP,
        },
        ...confirmarComTotp({
          motivo:
            'Enviar dinheiro é operação sensível. O sistema pede o código do autenticador antes de registrar o desembolso.',
          aoConfirmar:
            'Confirmado o código, o sistema volta à lista, e o formulário recomeça fechado.',
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
            'Agora o desembolso é registrado. O sistema reconhece repetições pela chave de idempotência e não envia duas vezes.',
          alvo: { css: '.px21-novo button[type="submit"]', texto: 'Solicitar desembolso' },
          acao: { tipo: 'clicar', efeito: true },
          aguardarAlvo: '.px21-resultado',
        },
        ler(
          'Pix a caminho',
          'A transferência foi criada e segue para o provedor de Pix. Ela só é enviada porque o contrato está assinado: com o contrato em aberto, o sistema recusaria.',
          '.px21-resultado',
        ),
        ...peloMenu(MENU_BACKOFFICE, {
          rota: '/app/backoffice/tesouraria',
          titulo: 'Submenu Tesouraria',
          texto: 'De volta à tesouraria, para acompanhar o pagamento das parcelas.',
          aguardarAlvo: '.pxe-metricas',
        }),
        primeiraParcela,
        parcelasDoMeio,
        ...credorConfere,
        ...voltaATesouraria,
        ultimaParcela,
        ler(
          'Operação liquidada',
          'Doze de doze parcelas repassadas: a operação está liquidada, e o saldo em operação voltou a zero.',
          'article.pxe-tabela-card:nth-of-type(2) .pxe-selo',
        ),
      ],
      trocarDeConta(ADMIN.email, ADMIN.quem),
    ),
  );
}

// ============ CAPÍTULO 9 · CREDOR: O RETORNO ============

export function retornoAoCredor(): PassoRoteiro[] {
  return secao('Retorno ao credor', [
    ...trocarDeConta(CREDOR.email, CREDOR.quem),
    ...peloMenu(MENU_CREDORA, {
      rota: '/app/credora/conta',
      titulo: 'Submenu Conta escrow',
      texto: 'De volta à conta escrow da Helena.',
      aguardarAlvo: '.pxe-metricas',
    }),
    ler(
      'O dinheiro voltou',
      'Os seis mil reais emprestados voltaram à conta, mais os juros das doze parcelas. O saldo em operação é zero, e o disponível já pode ser reaplicado ou sacado.',
      '.pxe-metricas',
    ),
    ler(
      'O extrato conta a história',
      'O extrato guarda cada lançamento: o aporte, a reserva, o desembolso e, mês a mês, o retorno de principal e de juros. Nada é apagado: um erro seria corrigido por um estorno.',
      '.pxe-tabela-card',
    ),
    {
      titulo: 'Fim da operação',
      texto:
        'Do cadastro do sub-correspondente ao retorno do credor, uma operação inteira passou por cinco perfis nas telas do sistema. Os dados são fictícios e voltam ao início na próxima execução.',
    },
  ]);
}

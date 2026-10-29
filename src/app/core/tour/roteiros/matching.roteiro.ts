import { Roteiro } from '../tour.model';
import { emSecao, peloMenu } from './passos-comuns';

// Tour assistido do Matching de credoras. É operação interna de financeiro e administração, e não a
// jornada da credora (papel CLIENTE): por isso tem módulo próprio, e não entra em "Credora".
// É só leitura: decidir uma sugestão pede MFA e confirmação adicional, e o tour não grava nada.

const MODULO = 'Matching de credoras';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO'];

const ROTA_DETALHE = /^\/app\/credora\/matching\/[^/?]+(\?.*)?$/;

const MENU_MATCHING = {
  rota: '/app/credora/matching',
  titulo: 'Menu Matching de credoras',
  texto:
    'No menu lateral, em Operação, fica o Matching de credoras. Ele aparece para financeiro e administração.',
  aguardarAlvo: '.px67-heading',
};

const fila: Roteiro = {
  id: 'matching-fila',
  modulo: MODULO,
  titulo: 'Fila de sugestões',
  icone: 'link-2',
  descricao: 'As sugestões de pareamento entre credoras e operações, com os critérios de cada uma.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Matching de credoras',
      texto:
        'Este roteiro mostra como o SEP sugere o pareamento entre uma credora e uma operação financiada, e onde a decisão é tomada. É só leitura.',
    },
    ...peloMenu(MENU_MATCHING),
    {
      titulo: 'Para que serve',
      texto:
        'O backend gera as sugestões e nada é confirmado sozinho: a decisão é sempre de uma pessoa, no detalhe de cada sugestão.',
      alvo: '.px67-heading',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Resumo da fila',
      texto: 'Os cartões contam as sugestões na fila, as que aguardam decisão e as já decididas.',
      alvo: '.px67-metricas',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px67-metricas'),
    },
    {
      titulo: 'Fila de sugestões',
      texto:
        'Cada cartão traz a operação, a credora, o valor elegível, a situação e a data. O botão Atualizar sugestões consulta o backend de novo.',
      alvo: '.px67-fila',
      acao: { tipo: 'observar' },
    },
    {
      titulo: 'Critérios atendidos',
      texto:
        'Os selos dizem por que a credora serve para a operação: credora ativa e elegível, operação ativa, contrato assinado e capacidade para o valor.',
      alvo: '.px67-item:first-child .px67-criterios',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px67-item .px67-criterios'),
    },
    {
      titulo: 'Regras da tela',
      texto:
        'Os três avisos lembram que nada é automático, que decidir pede confirmação de identidade e que o aporte é outro passo.',
      alvo: '.px67-regras',
      acao: { tipo: 'observar' },
    },
  ],
};

const detalhe: Roteiro = {
  id: 'matching-detalhe',
  modulo: MODULO,
  titulo: 'Detalhe e decisão',
  icone: 'handshake',
  descricao: 'O detalhe de uma sugestão, o que a decisão exige e o que ela não faz.',
  duracao: '≈ 2 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Detalhe do matching',
      texto:
        'Este roteiro abre uma sugestão e mostra onde a decisão é tomada. Nada é confirmado nem rejeitado aqui.',
    },
    ...peloMenu(MENU_MATCHING),
    {
      titulo: 'Ver o detalhe',
      texto: 'O botão Ver detalhe e decidir abre a sugestão para a decisão.',
      alvo: '.px67-item:first-child .px67-item-acao',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_DETALHE,
      aguardarAlvo: '.px68-dados',
      pularSe: () => !document.querySelector('.px67-item .px67-item-acao'),
    },
    {
      titulo: 'Dados da sugestão',
      texto:
        'O detalhe traz a operação, a empresa credora, o valor elegível e as datas, além dos critérios atendidos.',
      alvo: '.px68-dados',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px68-dados'),
    },
    {
      titulo: 'Decisão',
      texto:
        'Confirmar ou rejeitar pede verificação em duas etapas. Antes de abrir a confirmação, o sistema consulta a sugestão de novo, para decidir sobre o estado atual. Aqui não decidimos nada.',
      alvo: '.px68-decisao',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px68-decisao'),
    },
    {
      titulo: 'Regras do detalhe',
      texto:
        'Confirmar só registra a decisão: nenhum recurso é transferido. O aporte é um passo separado, feito em outra tela.',
      alvo: '.px68-regras',
      acao: { tipo: 'observar' },
      pularSe: () => !document.querySelector('.px68-regras'),
    },
  ],
};

const completo: Roteiro = {
  id: 'matching-completo',
  modulo: MODULO,
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os dois roteiros em sequência: a fila de sugestões e o detalhe com a decisão.',
  duracao: '≈ 4 min',
  papeis: PAPEIS,
  passos: (ctx) => [...emSecao(fila, ctx, { primeira: true }), ...emSecao(detalhe, ctx)],
};

export const ROTEIROS_MATCHING: Roteiro[] = [completo, fila, detalhe];

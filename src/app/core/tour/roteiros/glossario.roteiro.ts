import { PassoRoteiro, Roteiro } from '../tour.model';
import { rotaExata } from './passos-comuns';

// Tour assistido do Glossário técnico, que se abre pelo menu Ajuda. Serve a todos os papéis e não grava
// nada: busca, filtros e ordem só mudam o que a tela mostra, e o roteiro devolve tudo ao estado inicial
// (filtros limpos, ordem de A a Z) antes de voltar à tela de onde saiu.

const MODULO = 'Plataforma';
const PAPEIS: Roteiro['papeis'] = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE', 'CLIENTE'];

const PAINEL_AJUDA = '.op-painel-ajuda';
const LINK_GLOSSARIO = `${PAINEL_AJUDA} a[href="/app/glossario"]`;
const CARTAO = '.gl-verbete';

function ler(titulo: string, texto: string, alvo: PassoRoteiro['alvo']): PassoRoteiro {
  return { titulo, texto, alvo, acao: { tipo: 'observar' } };
}

function clicar(
  titulo: string,
  texto: string,
  alvo: PassoRoteiro['alvo'],
  depois: Partial<PassoRoteiro> = {},
): PassoRoteiro {
  return { titulo, texto, alvo, acao: { tipo: 'clicar' }, ...depois };
}

export const glossario: Roteiro = {
  id: 'plataforma-glossario',
  modulo: MODULO,
  titulo: 'Glossário técnico',
  icone: 'book-open',
  descricao: 'Os termos do SEP explicados, com busca, filtro por módulo e por letra, e ordem.',
  duracao: '≈ 3 min',
  papeis: PAPEIS,
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro mostra o glossário técnico: os termos do Dynamis SEP explicados em poucas linhas. Ele se abre pelo menu Ajuda, e nada é gravado durante o tour.',
    },
    clicar(
      'Abrir a ajuda',
      'O ponto de interrogação abre a ajuda. O glossário é um dos itens dela.',
      'button[aria-label="Ajuda"]',
      { aguardarAlvo: PAINEL_AJUDA, pularSe: () => !!document.querySelector(PAINEL_AJUDA) },
    ),
    ler(
      'O item do glossário',
      'Na seção Glossário da ajuda fica o link Glossário técnico, acima dos tours assistidos.',
      LINK_GLOSSARIO,
    ),
    clicar('Abrir o glossário', 'Clicando no link, a tela do glossário se abre.', LINK_GLOSSARIO, {
      aguardarRota: rotaExata('/app/glossario'),
      aguardarAlvo: CARTAO,
    }),
    ler(
      'Para que serve',
      'O glossário reúne os nomes usados na plataforma, como escrow, score, KYC e Pix Automático, cada um com um resumo e o módulo em que aparece.',
      '.gl-heading',
    ),
    ler(
      'Campo de busca',
      'O campo Buscar procura no nome do termo, no resumo e no módulo, sem diferenciar acento nem maiúscula. A lista se atualiza enquanto você digita.',
      '.gl-busca',
    ),
    {
      titulo: 'Buscar um termo',
      texto: 'Como exemplo, a busca por conciliacao, sem acento, encontra o termo Conciliação.',
      alvo: '.gl-busca input',
      acao: { tipo: 'digitar', texto: () => 'conciliacao', limpar: true },
    },
    ler(
      'Resultado da busca',
      'Só os termos que combinam com a busca ficam na tela, e o contador mostra quantos são, entre o total do glossário.',
      '.gl-contagem',
    ),
    clicar(
      'Limpar os filtros',
      'O botão Limpar filtros desfaz a busca e devolve a lista completa.',
      '.gl-limpar',
    ),
    ler(
      'Filtro por módulo',
      'A lista Módulo mostra só os termos ligados a um módulo do sistema, com os mesmos nomes do menu principal.',
      '.gl-campo select',
    ),
    {
      titulo: 'Escolher um módulo',
      texto: 'Escolhendo Cobrança, ficam só os termos que aparecem nesse módulo.',
      alvo: '.gl-campo select',
      acao: { tipo: 'selecionar', opcao: 'Cobrança' },
    },
    ler(
      'Filtro por letra',
      'As letras filtram pela inicial do termo. As que estão apagadas não têm nenhum termo no resultado atual.',
      '.gl-letras',
    ),
    clicar(
      'Escolher uma letra',
      'Clicando em uma letra, a lista mostra só os termos que começam com ela. Clicar de novo na mesma letra desfaz o filtro.',
      '.gl-letra:not([disabled])',
    ),
    clicar(
      'Voltar à lista completa',
      'Limpar filtros tira o módulo e a letra de uma vez.',
      '.gl-limpar',
    ),
    ler(
      'Ordem alfabética',
      'O botão de ordem alterna entre A a Z e Z a A. Os termos aparecem agrupados pela letra inicial.',
      '.gl-ordem',
    ),
    clicar('Inverter a ordem', 'Clicando, a lista passa a ir de Z a A.', '.gl-ordem'),
    clicar(
      'Ordem de A a Z',
      'Um novo clique devolve a ordem de A a Z, que é a inicial.',
      '.gl-ordem',
    ),
    ler(
      'Um verbete',
      'Cada cartão traz o nome do termo, o resumo do que ele significa e a linha Usado em, que diz em que tela do menu ele aparece.',
      CARTAO,
    ),
    ler(
      'Selos de módulo',
      'Os selos coloridos no fim do cartão indicam os módulos do termo, com a mesma cor do módulo no menu principal. Clicar num selo filtra a lista por aquele módulo.',
      `${CARTAO} .gl-modulos`,
    ),
    ler(
      'Botão Voltar',
      'O botão Voltar leva de volta à tela de onde o glossário foi aberto.',
      '.gl-acoes-topo button',
    ),
    clicar(
      'Voltar',
      'Com ele, o tour retorna ao Dashboard, onde começou.',
      '.gl-acoes-topo button',
      {
        aguardarRota: rotaExata('/app/dashboard'),
      },
    ),
  ],
};

export const ROTEIROS_GLOSSARIO: Roteiro[] = [glossario];

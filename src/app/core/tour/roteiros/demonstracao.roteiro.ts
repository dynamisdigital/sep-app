import { PassoRoteiro, Roteiro } from '../tour.model';
import { rotaExata } from './passos-comuns';

const GALERIA = '/demonstracao';
const PAINEL = '.jornadas-trilho';
// O catálogo de ajuda é carregado na inicial. Não importa o manifesto de fotos e textos das prévias.
const CENARIOS = [
  {
    id: 'operacao_completa',
    label: 'Operação completa',
    resumo: 'Conheça o fluxo entre todos os perfis, do cadastro à quitação.',
  },
  {
    id: 'correspondente',
    label: 'Correspondente',
    resumo: 'Conheça o atendimento e o acompanhamento das propostas pelo correspondente.',
  },
  {
    id: 'subcorrespondente',
    label: 'Subcorrespondente',
    resumo: 'Veja a atuação do subcorrespondente na rede de atendimento.',
  },
  {
    id: 'cliente',
    label: 'Cliente',
    resumo: 'Acompanhe cadastro, análise e formalização pela perspectiva do cliente.',
  },
  {
    id: 'backoffice',
    label: 'Backoffice',
    resumo: 'Explore a conferência dos registros e o acompanhamento operacional.',
  },
  {
    id: 'financiador',
    label: 'Financiador',
    resumo: 'Conheça condições, participação e acompanhamento pelo financiador.',
  },
];
const avancar = (posicao: number): PassoRoteiro => ({
  titulo: 'Próximo par de cenários',
  texto:
    'Vamos avançar mais duas opções. As imagens crescem ao chegar ao centro e diminuem ao sair, formando o arco.',
  alvo: '.painel-controles button[aria-label="Próximas jornadas"]',
  acao: { tipo: 'clicar' },
  aguardarAlvo: `${PAINEL}[data-posicao="${posicao}"]`,
});

/** Apresenta as prévias e seus controles; não inicia outro tour nem cria operações. */
export const demonstracaoCenarios: Roteiro = {
  id: 'publico-demonstracao',
  modulo: 'Demonstração',
  titulo: 'Cenários e controles da demonstração',
  descricao: 'Conheça os seis cenários, o painel em arco, a pausa e as prévias antes de assistir.',
  icone: 'monitor-play',
  duracao: '≈ 5 min',
  area: 'publica',
  rotaInicial: GALERIA,
  papeis: [],
  passos: () => {
    const passos: PassoRoteiro[] = [
      {
        titulo: 'Conheça o módulo Demonstração',
        texto:
          'Aqui você escolhe como conhecer o Dynamis SEP: pela operação completa ou pela atuação de cada perfil. São exemplos com dados fictícios.',
        alvo: '.demo-topo',
      },
      {
        titulo: 'Começar pela galeria',
        texto:
          'O primeiro ponto reúne a galeria. Vamos posicionar o primeiro par para conhecer a operação completa e o correspondente.',
        alvo: '.hero-controles button[aria-label="Mostrar Operação completa"]',
        acao: { tipo: 'clicar' },
        aguardarAlvo: `${PAINEL}[data-posicao="6"]`,
      },
      {
        titulo: 'Uma jornada com todos os perfis',
        texto:
          'O selo Todos os perfis e a borda verde identificam Operação completa. Os outros cartões mostram a atuação de um perfil por vez.',
        alvo: '.jornada-card.central.completa .jornada-selo-completa',
      },
      avancar(8),
      {
        titulo: 'O efeito em arco',
        texto:
          'Somente o par central fica em tamanho natural. Nas laterais, os cartões ficam menores e inclinados. A passagem normal espera quatro segundos entre os pares. Com movimento reduzido, a troca é direta.',
        alvo: '.jornadas-janela',
      },
      {
        titulo: 'Pausar a passagem',
        texto: 'Este botão interrompe o painel para você observar as imagens e ler com calma.',
        alvo: '.painel-controles button[aria-label="Pausar painel"]',
        acao: { tipo: 'clicar' },
        pularSe: () =>
          !!document.querySelector('.painel-controles button[aria-label="Retomar painel"]'),
      },
      {
        titulo: 'Retomar pelo Play',
        texto:
          'O Play retoma imediatamente. Não é preciso esperar os quatro segundos da pausa automática. Vamos ver o próximo par.',
        alvo: '.painel-controles button[aria-label="Retomar painel"]',
        acao: { tipo: 'clicar' },
        aguardarAlvo: `${PAINEL}[data-posicao="10"]`,
      },
      {
        titulo: 'Setas e indicadores',
        texto:
          'As setas movimentam o painel. Os pontos destacam o par atual e permitem selecionar uma prévia. A barra acompanha o intervalo e a passagem.',
        alvo: '.hero-controles',
      },
      {
        titulo: 'Abrir a primeira prévia',
        texto:
          'Vamos voltar ao primeiro par e abrir uma imagem. Escolher um cartão abre seu banner antes de iniciar qualquer apresentação.',
        alvo: '.hero-controles button[aria-label="Mostrar Operação completa"]',
        acao: { tipo: 'clicar' },
        aguardarAlvo: `${PAINEL}[data-posicao="6"]`,
      },
    ];
    for (const [indice, experiencia] of CENARIOS.entries()) {
      if (indice === 2) passos.push(avancar(8));
      if (indice === 4) passos.push(avancar(10));
      passos.push(
        {
          titulo: `Cenário: ${experiencia.label}`,
          texto: `${experiencia.resumo} A imagem e a seta abrem a prévia deste cenário.`,
          alvo: `.jornada-card.central .jornada-imagem[href="${GALERIA}/${experiencia.id}"]`,
          acao: { tipo: 'clicar' },
          aguardarRota: rotaExata(`${GALERIA}/${experiencia.id}`),
          aguardarAlvo: '.hero',
        },
        {
          titulo: `Como funciona: ${experiencia.label}`,
          texto:
            'O botão maior apresenta o cenário inteiro. Cada um dos cinco cartões abaixo demonstra somente a etapa escolhida e encerra ali, retornando a esta prévia. Neste tour estamos conhecendo as opções, sem executar uma operação.',
          alvo: '.etapas',
        },
        {
          titulo: 'Voltar ao mesmo ponto',
          texto:
            'Voltar à galeria recupera o par anterior e o estado de pausa. Assim você pode explorar outra opção sem recomeçar a lista.',
          alvo: '.voltar-galeria',
          acao: { tipo: 'clicar' },
          aguardarRota: rotaExata(GALERIA),
          aguardarAlvo: PAINEL,
        },
      );
    }
    passos.push({
      titulo: 'Escolha como continuar',
      texto:
        'Use Operação completa para conhecer o fluxo entre os perfis ou escolha um cenário específico. O selo identifica a jornada completa. Todas as prévias mantêm o mesmo padrão de banner e cinco etapas.',
      alvo: '.jornadas-janela',
    });
    return passos;
  },
};

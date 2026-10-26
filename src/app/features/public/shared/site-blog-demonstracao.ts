import { EXPERIENCIAS_VISUAIS } from '../demonstracao/demonstracao-apresentacao';
import { fotoDaDemonstracao } from '../demonstracao/demonstracao-imagens';
import type { PostBlog } from './site-blog';

type Perfil = (typeof EXPERIENCIAS_VISUAIS)[number]['id'];
interface ArtigoCenario {
  perfil: Perfil;
  titulo: string;
  resumo: string;
  categoria: PostBlog['categoria'];
  cena: PostBlog['cena'];
  abertura: string;
  subtitulo: string;
  explicacao: string;
  observar: string[];
  relacionados: string[];
}

const ARTIGOS: ArtigoCenario[] = [
  {
    perfil: 'operacao_completa',
    titulo: 'Uma operação de crédito completa: conheça os perfis da demonstração SEP',
    resumo:
      'Do primeiro cadastro ao acompanhamento da carteira, veja como os seis cenários da demonstração ajudam a entender uma operação de crédito e a participação de cada perfil.',
    categoria: 'SEP na prática',
    cena: 'fluxo',
    abertura:
      'Uma operação de crédito envolve mais de uma pessoa e mais de uma decisão. O cliente apresenta sua necessidade, a rede acompanha o atendimento, a equipe operacional confere os registros e o financiador conhece as condições da participação. A demonstração de Operação completa reúne essas perspectivas em um mesmo cenário didático.',
    subtitulo: 'Um fluxo conectado, visto por diferentes perfis',
    explicacao:
      'O selo Todos os perfis identifica esse cenário na galeria. Ele permite conhecer a passagem entre as áreas e perceber como um cadastro ou uma proposta passa a fazer parte do acompanhamento das demais equipes. Para estudar uma atuação específica, os outros cartões apresentam correspondente, subcorrespondente, cliente, backoffice e financiador separadamente.',
    observar: [
      'A diferença entre o atendimento inicial e a análise da proposta.',
      'Como a formalização se relaciona com as condições para liberação.',
      'A continuidade entre a participação do financiador, os recebimentos e a quitação.',
    ],
    relacionados: [
      'demonstracao-correspondente',
      'demonstracao-cliente',
      'demonstracao-financiador',
    ],
  },
  {
    perfil: 'correspondente',
    titulo: 'Correspondente na SEP: do cadastro ao acompanhamento da proposta de crédito',
    resumo:
      'Conheça o cenário do correspondente na demonstração e observe como atendimento, documentação, proposta e acompanhamento aparecem nas etapas de uma operação de crédito.',
    categoria: 'SEP na prática',
    cena: 'rede',
    abertura:
      'O correspondente participa da aproximação entre o cliente e a plataforma. Na demonstração, essa atuação começa pelo atendimento e pela organização das informações necessárias ao cadastro. O cenário ajuda a distinguir a apresentação de uma proposta do trabalho de análise e decisão realizado nas etapas seguintes.',
    subtitulo: 'Atendimento com continuidade e registro',
    explicacao:
      'O banner do correspondente apresenta sua jornada e os cinco cartões abaixo detalham o caminho: cadastro, proposta e análise, acompanhamento, formalização e liberação, comissões e resultados. A ideia é observar como o andamento fica registrado e pode ser acompanhado, em vez de tratar o envio da proposta como a conclusão do atendimento.',
    observar: [
      'Quais informações e documentos aparecem no início do cadastro.',
      'Como o status da proposta orienta o acompanhamento do cliente.',
      'A separação entre o trabalho da rede, a decisão sobre o crédito e a formalização.',
    ],
    relacionados: [
      'demonstracao-subcorrespondente',
      'demonstracao-backoffice',
      'demonstracao-operacao_completa',
    ],
  },
  {
    perfil: 'subcorrespondente',
    titulo: 'Subcorrespondente na SEP: atendimento e atuação em rede no crédito',
    resumo:
      'Entenda o cenário do subcorrespondente e acompanhe como o vínculo com a rede, o atendimento do cliente e o envio das informações aparecem na demonstração de crédito.',
    categoria: 'SEP na prática',
    cena: 'pessoas',
    abertura:
      'A atuação em rede exige compreender quem atende o cliente, como esse atendimento é registrado e como as informações seguem para acompanhamento. O cenário do subcorrespondente apresenta essa perspectiva local, conectada ao correspondente, em um exemplo com pessoas e dados fictícios.',
    subtitulo: 'Conheça o vínculo antes de acompanhar as propostas',
    explicacao:
      'A prévia apresenta a ativação na rede e o atendimento como partes de um fluxo maior. Os cartões de Como funciona mostram os registros que dão continuidade à jornada. Ao explorar esse cenário junto com o do correspondente, fica mais fácil perceber a relação entre os perfis e evitar confundir o atendimento inicial com a análise de crédito.',
    observar: [
      'O vínculo do subcorrespondente com a rede de atendimento.',
      'A organização do cadastro e das informações apresentadas pelo cliente.',
      'O encaminhamento e o acompanhamento das propostas dentro do cenário.',
    ],
    relacionados: [
      'demonstracao-correspondente',
      'demonstracao-cliente',
      'demonstracao-operacao_completa',
    ],
  },
  {
    perfil: 'cliente',
    titulo: 'Cliente na demonstração SEP: cadastro, análise e liberação do crédito',
    resumo:
      'Veja a jornada do cliente no cenário de demonstração: o que observar no cadastro, na proposta, na análise e na formalização antes da etapa de liberação do crédito.',
    categoria: 'Para empresas',
    cena: 'documento',
    abertura:
      'Para quem busca crédito, entender o caminho da solicitação ajuda a acompanhar cada etapa com mais clareza. O cenário Cliente apresenta esse percurso em uma situação fictícia, começando pela organização dos dados e seguindo até a formalização e a liberação após as condições previstas.',
    subtitulo: 'Uma proposta passa por etapas distintas',
    explicacao:
      'Cadastrar dados, apresentar a necessidade de crédito e acompanhar a análise são momentos diferentes. A prévia permite conhecer essa sequência antes de assistir à demonstração nas telas do sistema. O cenário não concede crédito nem antecipa uma decisão para uma pessoa ou empresa real: ele serve para reconhecer as etapas e as informações exibidas.',
    observar: [
      'Os dados e documentos apresentados no cadastro do cliente.',
      'As condições da proposta e as informações exibidas durante a análise.',
      'A formalização e o acompanhamento das condições previstas para liberação.',
    ],
    relacionados: [
      'como-preparar-a-empresa-para-pedir-capital-de-giro',
      'demonstracao-backoffice',
      'demonstracao-operacao_completa',
    ],
  },
  {
    perfil: 'backoffice',
    titulo: 'Backoffice da SEP: conferência, acompanhamento e rastreabilidade do crédito',
    resumo:
      'Explore o cenário do backoffice e conheça a conferência cadastral e documental, a gestão das operações, a conciliação e os indicadores apresentados na demonstração de crédito.',
    categoria: 'SEP na prática',
    cena: 'analise',
    abertura:
      'O acompanhamento operacional conecta os registros das diferentes etapas da plataforma. No cenário Backoffice, a demonstração destaca a conferência de cadastros e documentos, o acompanhamento de propostas e as informações que ajudam a entender a situação das operações.',
    subtitulo: 'Do registro inicial aos indicadores',
    explicacao:
      'Os cinco cartões de Como funciona apresentam triagem cadastral, conferência documental, gestão de operações, conciliação e acompanhamento, indicadores e auditoria. Essa organização ajuda a perceber que a atuação administrativa não se resume a uma aprovação: ela também envolve identificar pendências, acompanhar ocorrências e consultar o histórico disponível no exemplo.',
    observar: [
      'A diferença entre conferir dados cadastrais e analisar os documentos recebidos.',
      'Como propostas e operações aparecem em seus respectivos estados.',
      'O papel da conciliação, dos indicadores e do histórico no acompanhamento.',
    ],
    relacionados: [
      'demonstracao-cliente',
      'demonstracao-correspondente',
      'demonstracao-operacao_completa',
    ],
  },
  {
    perfil: 'financiador',
    titulo: 'Financiador na SEP: oportunidades, condições e acompanhamento da carteira',
    resumo:
      'Conheça o cenário do financiador na demonstração, da identificação à seleção de oportunidades, análise das condições, formalização da participação e acompanhamento dos recebimentos.',
    categoria: 'Para financiadores',
    cena: 'grafico',
    abertura:
      'O financiador é o participante que conhece as operações disponíveis e avalia as condições para participar de seu financiamento. Na demonstração, essa perspectiva aparece em uma jornada própria, permitindo distinguir a decisão de participar do acompanhamento posterior da carteira.',
    subtitulo: 'Conhecer as condições antes de decidir',
    explicacao:
      'Os cartões da prévia apresentam cadastro do financiador, seleção de oportunidades, análise de riscos e condições, formalização da participação, carteira e recebimentos. O foco é reconhecer as informações que precisam ser compreendidas em cada etapa. Os números e as situações do cenário são fictícios e não representam uma oferta de participação em uma operação real.',
    observar: [
      'A identificação do financiador e as condições apresentadas para sua participação.',
      'As informações sobre riscos e características da operação antes da decisão.',
      'O acompanhamento da carteira e da situação dos recebimentos, sem promessa de resultado.',
    ],
    relacionados: [
      'quem-pode-financiar-numa-sep-e-o-limite-por-tomador',
      'classificacao-de-risco-a-a-e-como-ler',
      'demonstracao-operacao_completa',
    ],
  },
];

export const POSTS_DEMONSTRACAO: PostBlog[] = ARTIGOS.map((artigo) => {
  const experiencia = EXPERIENCIAS_VISUAIS.find((e) => e.id === artigo.perfil)!;
  return {
    slug: `demonstracao-${artigo.perfil}`.replaceAll('_', '-'),
    titulo: artigo.titulo,
    resumo: artigo.resumo,
    categoria: artigo.categoria,
    publicadoEm: '2026-10-24',
    cena: artigo.cena,
    imagem: `/image/demonstracao/${fotoDaDemonstracao(experiencia.banner.webp, 'telas-escuras')}`,
    imagemAlt: experiencia.banner.alt,
    demonstracao: artigo.perfil,
    blocos: [
      { t: 'p', v: artigo.abertura },
      { t: 'h2', v: artigo.subtitulo },
      { t: 'p', v: artigo.explicacao },
      { t: 'h2', v: 'O que observar neste cenário' },
      { t: 'ul', v: artigo.observar },
      { t: 'h2', v: 'As cinco etapas da prévia' },
      { t: 'ol', v: experiencia.steps.map((etapa) => `${etapa.title}: ${etapa.description}`) },
      { t: 'h2', v: 'Explore a demonstração no seu ritmo' },
      {
        t: 'p',
        v: 'Na galeria, os cenários passam em pares, com efeito em arco. Use as setas, pause para ler ou retome pelo Play. A imagem e a seta de cada cartão abrem primeiro o banner da jornada. O botão de assistir inicia a apresentação guiada nas telas do sistema. O tour de um perfil começa e termina naquele cenário; somente Operação completa percorre o fluxo entre os perfis. Ao voltar à galeria, você retorna ao mesmo par de cartões.',
      },
      {
        t: 'destaque',
        v: 'Este cenário é didático e utiliza dados fictícios. Explorar a prévia não cria uma conta real nem executa uma operação financeira real.',
      },
    ],
    emResumo: [
      artigo.observar[0],
      'O banner e as cinco etapas apresentam a jornada antes do tour.',
      'A demonstração utiliza dados fictícios e pode ser explorada com pausa e navegação manual.',
    ],
    relacionados: artigo.relacionados.map((slug) => slug.replaceAll('_', '-')),
  };
});

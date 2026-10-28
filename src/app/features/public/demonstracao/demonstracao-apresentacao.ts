import { EXPERIENCIAS } from './demonstracao-dados';

import { fotoDaDemonstracao, VersaoFotos } from './demonstracao-imagens';

interface Destaque {
  icone: string;
  titulo: string;
  texto: string;
}
interface Apresentacao {
  titulo: string;
  chamada: string;
  destaque: string;
  descricao: string;
  cta: string;
  painel: string;
  beneficios: Destaque[];
  etapasTitulo: string;
  etapasDescricao: string;
  etapasTextos: string[];
  icone: string;
  resumo: string;
}

const VISUAL: Record<string, Apresentacao> = {
  operacao_completa: {
    titulo: 'Uma operação completa,',
    chamada: '',
    destaque: 'do vínculo à quitação',
    descricao:
      'Veja o correspondente criar sua rede, acompanhe o cliente, a participação do financiador e a gestão do backoffice sobre os mesmos registros.',
    cta: 'Assistir à operação completa',
    painel: 'Perfis conectados',
    beneficios: [
      {
        icone: 'users',
        titulo: 'Originação e atendimento',
        texto: 'Correspondente e subcorrespondente',
      },
      { icone: 'clipboard-check', titulo: 'Proposta e análise', texto: 'Cliente e backoffice' },
      {
        icone: 'wallet',
        titulo: 'Participação do financiador',
        texto: 'Condições e riscos apresentados',
      },
      {
        icone: 'shield-check',
        titulo: 'Acompanhamento até a quitação',
        texto: 'Etapas conectadas no mesmo cenário',
      },
    ],
    etapasTitulo: 'Como funciona uma operação completa',
    etapasDescricao: '5 etapas conectadas · Dados fictícios',
    etapasTextos: [
      'Conheça o atendimento, o cadastro do cliente e a atuação da rede.',
      'Acompanhe a proposta e a análise dos dados e documentos.',
      'Veja a participação do financiador, com condições e riscos apresentados.',
      'Confira a formalização e a liberação após as condições previstas.',
      'Acompanhe a carteira, os recebimentos e a quitação da operação.',
    ],
    icone: 'network',
    resumo: 'Acompanhe o passo a passo de uma operação, do cadastro à quitação.',
  },
  correspondente: {
    titulo: 'Correspondente',
    chamada: 'Conectando pessoas',
    destaque: 'a novas oportunidades.',
    descricao:
      'Veja na prática como o correspondente pode cadastrar clientes, apresentar propostas e acompanhar todo o processo até a liberação do crédito, com segurança e total transparência dentro da Dynamis SEP.',
    cta: 'Assistir cenário do correspondente',
    painel: 'Sua atuação na prática',
    beneficios: [
      { icone: 'users', titulo: 'Mais clientes', texto: 'Expanda sua carteira na sua região' },
      { icone: 'chart-column', titulo: 'Processo simples', texto: 'Do cadastro à liberação' },
      {
        icone: 'shield-check',
        titulo: 'Controles e rastreabilidade',
        texto: 'Regras claras e auditoria',
      },
      {
        icone: 'chart-column',
        titulo: 'Comissão por resultado',
        texto: 'Acompanhe seu desempenho',
      },
    ],
    etapasTitulo: 'Como funciona na prática',
    etapasDescricao:
      'Acompanhe as principais etapas de uma operação realizada pelo correspondente, com dados fictícios.',
    etapasTextos: [
      'O correspondente cadastra o cliente pessoa física ou jurídica, com dados básicos e documentação.',
      'É criada a proposta de crédito com os valores e prazos. O sistema realiza a análise conforme as regras.',
      'O correspondente acompanha o status da proposta, com notificações a cada etapa.',
      'Após a aprovação, o cliente formaliza o contrato e o crédito é liberado pela plataforma.',
      'O correspondente acompanha suas comissões e o desempenho da sua carteira no painel.',
    ],
    icone: 'users',
    resumo: 'Veja como o correspondente cria sua rede e apresenta propostas.',
  },
  subcorrespondente: {
    titulo: 'Subcorrespondente',
    chamada: 'Sua atuação,',
    destaque: 'novas oportunidades.',
    descricao:
      'Conheça a atuação do subcorrespondente na rede, do atendimento ao cliente ao acompanhamento das propostas e resultados de sua carteira.',
    cta: 'Assistir cenário do subcorrespondente',
    painel: 'Atuação dentro da rede',
    beneficios: [
      { icone: 'users', titulo: 'Clientes vinculados à sua carteira', texto: '' },
      { icone: 'file-text', titulo: 'Propostas em andamento', texto: '' },
      { icone: 'handshake', titulo: 'Gestão dos seus atendimentos', texto: '' },
      { icone: 'chart-column', titulo: 'Comissões e desempenho', texto: '' },
    ],
    etapasTitulo: 'A jornada do subcorrespondente',
    etapasDescricao: 'Etapas ilustrativas · Dados fictícios',
    etapasTextos: [
      'Acesso vinculado ao correspondente responsável.',
      'Captação e cadastro de clientes da própria carteira.',
      'Consulta de cada etapa da solicitação de crédito.',
      'Documentos e aprovação seguindo o fluxo previsto.',
      'Visão das propostas, comissões e desempenho.',
    ],
    icone: 'network',
    resumo: 'Entenda a atuação do subcorrespondente na expansão da rede.',
  },
  cliente: {
    titulo: 'Cliente / Solicitante',
    chamada: 'Seu projeto merece',
    destaque: 'novas possibilidades.',
    descricao:
      'Descubra como solicitar crédito na Dynamis SEP, acompanhar a análise e consultar cada etapa, da contratação à quitação do empréstimo.',
    cta: 'Assistir cenário do cliente',
    painel: 'Sua jornada de crédito',
    beneficios: [
      { icone: 'user-check', titulo: 'Cadastro e verificação', texto: '' },
      { icone: 'file-search', titulo: 'Solicitação e análise', texto: '' },
      { icone: 'file-check', titulo: 'Condições transparentes', texto: '' },
      { icone: 'calendar', titulo: 'Parcelas até a quitação', texto: '' },
    ],
    etapasTitulo: 'O cliente na prática',
    etapasDescricao: '5 etapas ilustrativas · Dados fictícios',
    etapasTextos: [
      'Informe seus dados e envie a documentação.',
      'Defina valor, prazo e finalidade da solicitação.',
      'Consulte a avaliação e as condições oferecidas.',
      'Assine após aprovação e acompanhe o crédito.',
      'Acompanhe vencimentos, pagamentos e conclusão.',
    ],
    icone: 'file-text',
    resumo: 'Acompanhe o cadastro, a análise e a liberação do crédito para o cliente.',
  },
  backoffice: {
    titulo: 'Backoffice',
    chamada: 'Controle e inteligência',
    destaque: 'em cada etapa.',
    descricao:
      'Explore como a equipe administrativa valida cadastros, confere documentos, acompanha operações e monitora a carteira com segurança e rastreabilidade.',
    cta: 'Assistir cenário do backoffice',
    painel: 'Gestão operacional',
    beneficios: [
      { icone: 'user-check', titulo: 'Conferência de cadastros', texto: '' },
      { icone: 'file-check', titulo: 'Documentação e controles', texto: '' },
      { icone: 'settings', titulo: 'Operações e conciliação', texto: '' },
      { icone: 'chart-column', titulo: 'Indicadores e auditoria', texto: '' },
    ],
    etapasTitulo: 'Como funciona o backoffice',
    etapasDescricao: '5 etapas ilustrativas · Dados fictícios',
    etapasTextos: [
      'Confira cadastros e dados da carteira operacional.',
      'Valide documentos e identifique pendências.',
      'Acompanhe as propostas e os respectivos status.',
      'Verifique pagamentos, saldos e ocorrências.',
      'Analise desempenho, histórico e rastreabilidade.',
    ],
    icone: 'settings',
    resumo: 'Veja como o backoffice gerencia os registros, acompanhamentos e indicadores.',
  },
  financiador: {
    titulo: 'Financiador',
    chamada: 'Seu capital impulsionando',
    destaque: 'novas histórias.',
    descricao:
      'Conheça a participação em operações de crédito na Dynamis SEP, com informações sobre condições, riscos e acompanhamento da carteira.',
    cta: 'Assistir cenário do financiador',
    painel: 'Acompanhamento da carteira',
    beneficios: [
      { icone: 'shield-check', titulo: 'Segurança', texto: 'Controles em todas as etapas' },
      { icone: 'database', titulo: 'Transparência', texto: 'Nas informações' },
      {
        icone: 'chart-column',
        titulo: 'Gestão da carteira',
        texto: 'Acompanhamento das operações',
      },
      { icone: 'clock', titulo: 'Recebimentos', texto: 'Agenda e situação das parcelas' },
    ],
    etapasTitulo: 'Veja como financiar na Dynamis SEP',
    etapasDescricao: 'Condições e riscos apresentados antes de cada decisão.',
    etapasTextos: [
      'Identifique-se e conheça as condições de participação.',
      'Consulte as operações de crédito disponíveis.',
      'Avalie os riscos e as condições antes de decidir.',
      'Confira os documentos e formalize sua participação.',
      'Acompanhe a carteira e a situação dos recebimentos.',
    ],
    icone: 'database',
    resumo: 'Entenda a participação do financiador e o acompanhamento dos recebimentos.',
  },
};

const ETAPAS_OPERACAO = [
  { ...EXPERIENCIAS[1].steps[0], title: 'Originação e cadastro' },
  { ...EXPERIENCIAS[3].steps[1], title: 'Proposta e análise' },
  { ...EXPERIENCIAS[5].steps[1], title: 'Participação do financiador' },
  { ...EXPERIENCIAS[3].steps[3], title: 'Formalização e liberação' },
  { ...EXPERIENCIAS[5].steps[4], title: 'Acompanhamento e quitação' },
];

const EXPERIENCIAS_ORIGINAIS = EXPERIENCIAS.map((experiencia) => ({
  ...experiencia,
  ...VISUAL[experiencia.id],
  banner:
    experiencia.id === 'operacao_completa'
      ? {
          webp: 'assets/operacao_completa/01_operacao_completa_exclusiva.webp',
          png: 'assets/operacao_completa/01_operacao_completa_exclusiva.png',
          alt: 'Empresário e profissional financeira concluindo uma reunião com um aperto de mãos.',
        }
      : experiencia.banner,
  steps: (experiencia.id === 'operacao_completa' ? ETAPAS_OPERACAO : experiencia.steps).map(
    (etapa, i) => ({
      ...etapa,
      description: VISUAL[experiencia.id].etapasTextos[i],
    }),
  ),
}));

export function experienciasComFotos(versao: VersaoFotos) {
  return EXPERIENCIAS_ORIGINAIS.map((experiencia) => ({
    ...experiencia,
    banner: {
      ...experiencia.banner,
      webp: fotoDaDemonstracao(experiencia.banner.webp, versao),
      png: fotoDaDemonstracao(experiencia.banner.png, versao),
    },
    steps: experiencia.steps.map((etapa) => ({
      ...etapa,
      imageWebp: fotoDaDemonstracao(etapa.imageWebp, versao),
      imagePng: fotoDaDemonstracao(etapa.imagePng, versao),
    })),
  }));
}

export const EXPERIENCIAS_VISUAIS = experienciasComFotos('telas-escuras');

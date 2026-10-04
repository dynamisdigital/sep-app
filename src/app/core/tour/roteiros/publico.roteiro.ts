import { PassoRoteiro, Roteiro } from '../tour.model';
import { emSecao, rotaExata } from './passos-comuns';

// Tours assistidos do site institucional (sem login): pagina inicial, Credito PJ, Seguranca, Como
// funciona, Sobre o SEP, Contato, Politica de privacidade e Termos de uso. Partem da pagina inicial e
// vao de uma pagina a outra pelo menu do cabecalho e pelos links do rodape, como um visitante. Nenhum
// roteiro envia dados: o formulario de contato so e mostrado.

const MODULO = 'Site institucional';

/** Link do menu do cabecalho: a pagina inicial tem cabecalho proprio (`landing-nav`), as demais o do shell. */
function linkMenu(rota: string): string {
  return `.landing-nav a[href="${rota}"], .site-nav a[href="${rota}"]`;
}

/** Link do rodape, que tambem tem duas versoes (a da pagina inicial e a do shell). */
function linkRodape(rota: string): string {
  return `.footer-links a[href="${rota}"], .site-footer-links a[href="${rota}"]`;
}

function irPara(opcoes: {
  rota: string;
  titulo: string;
  texto: string;
  pagina: string;
  rodape?: boolean;
}): PassoRoteiro {
  return {
    titulo: opcoes.titulo,
    texto: opcoes.texto,
    alvo: opcoes.rodape ? linkRodape(opcoes.rota) : linkMenu(opcoes.rota),
    acao: { tipo: 'clicar' },
    aguardarRota: rotaExata(opcoes.rota),
    aguardarAlvo: opcoes.pagina,
  };
}

function ler(titulo: string, texto: string, alvo: PassoRoteiro['alvo']): PassoRoteiro {
  return { titulo, texto, alvo, acao: { tipo: 'observar' } };
}

/** O que todo roteiro publico declara: roda sem login e parte da pagina inicial. */
const BASE = {
  modulo: MODULO,
  papeis: [] as Roteiro['papeis'],
  area: 'publica' as const,
  rotaInicial: '/',
};

// ============ ROTEIROS ============

const inicio: Roteiro = {
  ...BASE,
  id: 'publico-inicio',
  titulo: 'Página inicial',
  icone: 'house',
  descricao: 'O cabeçalho, a proposta do SEP, o passo a passo e os selos de regulação.',
  duracao: '≈ 3 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro apresenta a página inicial do SEP, a Sociedade de Empréstimo entre Pessoas. Não é preciso estar logado.',
    },
    ler(
      'O cabeçalho',
      'No alto ficam a marca do SEP, o menu das páginas do site e os botões de tema, de ajuda e de entrada.',
      '.landing-header',
    ),
    ler(
      'Menu das páginas',
      'O menu leva a Crédito PJ, Segurança, Como funciona, Sobre o SEP e Contato. Cada uma tem um roteiro próprio.',
      '.landing-nav',
    ),
    ler(
      'Tema claro ou escuro',
      'O botão com o sol ou a lua troca entre o tema escuro, que é o padrão, e o tema claro.',
      '.landing-theme',
    ),
    ler(
      'Largura da tela',
      'Em janela maximizada, este botão alterna entre a tela no tamanho de meia tela e a tela ocupando toda a largura.',
      'button[aria-label*="Expandir a tela"], button[aria-label*="Voltar a tela ao tamanho"]',
    ),
    ler(
      'Ajuda',
      'O ponto de interrogação abre a ajuda do site, com a lista dos tours guiados, como este.',
      'button[aria-label="Ajuda e tours do site"]',
    ),
    ler(
      'Entrar',
      'O botão Entrar leva ao login. Quem ainda não tem conta cria uma em Criar conta, logo abaixo.',
      '.landing-login',
    ),
    ler(
      'A proposta',
      'O SEP é uma base digital que conecta empresas que precisam de capital de giro a empresas que querem aportar recursos, com rastreabilidade, segurança e experiência simples.',
      '#hero-title',
    ),
    ler(
      'Por onde começar',
      'Criar conta abre o cadastro. Quem já tem acesso usa Entrar na plataforma.',
      '.hero-actions',
    ),
    ler(
      'Selos de confiança',
      'Os três selos resumem o essencial: regulação pela Resolução CMN 4.656/2018, segregação patrimonial em conta escrow, e verificação de identidade e prevenção à lavagem de dinheiro.',
      '.trust-badges',
    ),
    ler(
      'A plataforma regulada',
      'O cartão ao lado mostra o que a plataforma entrega: escrow seguro, KYC e KYB verificados, prevenção, auditoria completa e rastreabilidade total.',
      '.platform-card',
    ),
    ler(
      'Como funciona',
      'Quatro etapas: cadastro e verificação, proposta e análise, formalização e escrow, e liberação com acompanhamento. A página Como funciona detalha cada uma.',
      '.workflow-section',
    ),
    ler(
      'Indicadores do SEP',
      'Por fim, os indicadores: ambiente regulado, segurança, rastreabilidade, conexão segura e conformidade.',
      '.indicators-section',
    ),
    ler(
      'Rodapé',
      'No rodapé ficam os links institucionais, entre eles a política de privacidade e os termos de uso, e o aviso regulatório.',
      '.landing-footer',
    ),
  ],
};

const login: Roteiro = {
  ...BASE,
  id: 'publico-login',
  titulo: 'Tela de login',
  icone: 'log-in',
  descricao: 'O acesso à plataforma: e-mail e senha, biometria, ajuda e os selos de segurança.',
  duracao: '≈ 2,5 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro percorre a tela de login, a segunda tela do site, a partir da página inicial. Nada é digitado nem enviado durante o tour.',
    },
    {
      titulo: 'Entrar',
      texto: 'Na página inicial, o botão Entrar leva à tela de login.',
      alvo: '.landing-login',
      acao: { tipo: 'clicar' },
      aguardarRota: rotaExata('/login'),
      aguardarAlvo: '.login-card',
    },
    ler(
      'Botões do canto',
      'No canto superior direito ficam três botões: o tema claro ou escuro, a largura da tela, que só aparece em janela maximizada, e a ajuda, com os tours do site.',
      '.login-acoes',
    ),
    ler(
      'Voltar à página inicial',
      'A seta redonda, no alto e ao centro, volta para a página inicial. A marca do SEP faz o mesmo.',
      '.login-home-link',
    ),
    ler(
      'A proposta',
      'À esquerda, a apresentação: capital de giro com rastreabilidade, segurança e experiência simples, conectando empresas que precisam de crédito a empresas que querem aportar recursos.',
      '.login-hero-copy',
    ),
    ler(
      'Selos de confiança',
      'Os três selos resumem o essencial: ambiente regulado pela Resolução CMN 4.656/2018, segregação patrimonial por conta escrow e auditoria, e KYC, KYB e prevenção à lavagem de dinheiro.',
      '.login-hero-badges',
    ),
    ler(
      'Plataforma segura e auditável',
      'O painel lista escrow e contratos automatizados, auditoria completa e rastreabilidade, criptografia de ponta a ponta e monitoramento contínuo.',
      '.audit-panel',
    ),
    ler(
      'Indicadores',
      'Na base, três indicadores: segurança em primeiro lugar, disponibilidade e suporte especializado.',
      '.login-bottom-indicators',
    ),
    ler(
      'Ambiente seguro',
      'À direita, o selo mostra que o ambiente é verificado e protegido.',
      '.safe-status',
    ),
    ler(
      'Acesso à plataforma',
      'Este é o cartão de acesso. A conta é a que o administrador cadastrou para a empresa.',
      '.login-card-header',
    ),
    ler(
      'E-mail',
      'No campo de e-mail entra o endereço da conta. O tour apenas mostra o campo, sem digitar.',
      '#login-username',
    ),
    ler(
      'Senha',
      'Na senha entra a credencial da conta, e o olho ao lado mostra ou oculta o que foi digitado.',
      '#login-password',
    ),
    ler(
      'Lembrar de mim e senha esquecida',
      'Lembrar de mim mantém o acesso neste navegador. Quem esqueceu a senha usa o link ao lado, que leva ao Contato: o administrador redefine a senha e o próximo login exige a troca.',
      '.login-options',
    ),
    ler(
      'Entrar na plataforma',
      'Este botão valida o e-mail e a senha. Se a conta tiver a segunda etapa, o código do autenticador é pedido em seguida. Durante o tour ele não é acionado.',
      '.login-submit',
    ),
    ler(
      'Acesso com biometria',
      'Onde o navegador permite, a biometria é uma alternativa à senha. Quando não há suporte, o botão aparece desabilitado.',
      '.biometry-button',
    ),
    ler(
      'Acesso protegido e monitorado',
      'Todas as operações são registradas e auditadas, desde o login.',
      '.protected-card',
    ),
    ler(
      'Termos e privacidade',
      'No rodapé, o aviso de que o acesso implica concordar com os termos de uso e a política de privacidade.',
      '.login-footer',
    ),
    {
      titulo: 'Voltar ao início',
      texto: 'Para terminar, a seta volta à página inicial.',
      alvo: '.login-home-link',
      acao: { tipo: 'clicar' },
      aguardarRota: rotaExata('/'),
      aguardarAlvo: '.landing-header',
    },
  ],
};

const creditoPj: Roteiro = {
  ...BASE,
  id: 'publico-credito-pj',
  titulo: 'Crédito PJ',
  icone: 'building-2',
  descricao: 'As condições da operação, o que a empresa precisa ter e como a proposta é decidida.',
  duracao: '≈ 2,5 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto: 'Este roteiro percorre a página Crédito PJ, a partir da página inicial.',
    },
    irPara({
      rota: '/credito-pj',
      titulo: 'Menu Crédito PJ',
      texto: 'No menu do cabeçalho, Crédito PJ abre as condições do capital de giro para empresas.',
      pagina: '.px49-heading',
    }),
    ler(
      'Para que serve',
      'A página explica que toda proposta passa pela mesma esteira: cadastro verificado, análise registrada, contrato assinado e desembolso rastreado.',
      '.px49-heading',
    ),
    ler(
      'Condições da operação',
      'Estes são os parâmetros vigentes na plataforma, e não uma estimativa comercial: valor máximo por proposta, prazo máximo, score mínimo, finalidade e desembolso por Pix. Quando um parâmetro muda, a alteração é versionada e auditada.',
      '.px49-condicoes',
    ),
    ler(
      'O teto não se negocia',
      'O teto de R$ 15.000,00 por proposta vem do regimento do SEP. A plataforma não promete aprovação automática, taxa mínima nem prazo de resposta garantido.',
      '.px49-aviso',
    ),
    ler(
      'O que a empresa precisa ter',
      'CNPJ ativo, representante identificado, consulta de prevenção à lavagem de dinheiro e, se a empresa quiser, o Open Finance. Nada é pedido duas vezes.',
      { css: '.px49-secao', texto: 'O que a empresa precisa ter' },
    ),
    ler(
      'Como a proposta é decidida',
      'Uma proposta assume quatro estados: em análise, pré-aprovada, aprovada, e pendência ou rejeitada. Cada transição registra data, responsável e motivo.',
      { css: '.px49-secao', texto: 'Como a proposta é decidida' },
    ),
    ler(
      'Pronto para começar?',
      'No fim, Entrar na plataforma leva ao login, e Ver a jornada completa abre a página Como funciona.',
      '.px49-chamada',
    ),
  ],
};

const seguranca: Roteiro = {
  ...BASE,
  id: 'publico-seguranca',
  titulo: 'Segurança',
  icone: 'shield-check',
  descricao: 'Quem entra e até onde vai, dados e dinheiro, e o que está nas mãos do usuário.',
  duracao: '≈ 2,5 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto: 'Este roteiro percorre a página Segurança, a partir da página inicial.',
    },
    irPara({
      rota: '/seguranca',
      titulo: 'Menu Segurança',
      texto: 'No menu do cabeçalho, Segurança abre a página dos controles do produto.',
      pagina: '.px50-heading',
    }),
    ler(
      'Para que serve',
      'A página descreve controles que existem no produto, e não em promessa. Cada item corresponde a um mecanismo em uso.',
      '.px50-heading',
    ),
    ler(
      'Quem entra, e até onde vai',
      'A identidade é confirmada na entrada e reconfirmada nas operações sensíveis. Há segunda etapa por TOTP, confirmação adicional na operação, perfis com alcance definido e bloqueio por tentativas.',
      { css: '.px50-secao', texto: 'Quem entra, e até onde vai' },
    ),
    ler(
      'Dados e dinheiro',
      'A rastreabilidade nasce junto com cada operação: trilha de auditoria, segregação patrimonial, documentos com impressão digital e dados protegidos em trânsito e em repouso.',
      { css: '.px50-secao', texto: 'Dados e dinheiro' },
    ),
    ler(
      'O que está na sua mão',
      'Aqui, onde ajustar a segurança da própria conta: habilitar a segunda etapa, trocar a senha e conferir o papel da conta.',
      '.px50-conta',
    ),
    ler(
      'Aviso importante',
      'O SEP nunca pede senha, código do autenticador ou dados de cartão por telefone, e-mail ou mensagem.',
      '.px50-aviso',
    ),
    ler(
      'Encontrou uma vulnerabilidade?',
      'Reportes de boa-fé são bem-vindos pelo canal de contato e não geram represália.',
      '.px50-chamada',
    ),
  ],
};

const comoFunciona: Roteiro = {
  ...BASE,
  id: 'publico-como-funciona',
  titulo: 'Como funciona',
  icone: 'list-ordered',
  descricao: 'As seis etapas da jornada, do cadastro à quitação, e quem participa.',
  duracao: '≈ 2 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto: 'Este roteiro percorre a página Como funciona, a partir da página inicial.',
    },
    irPara({
      rota: '/como-funciona',
      titulo: 'Menu Como funciona',
      texto: 'No menu do cabeçalho, Como funciona abre a jornada da plataforma.',
      pagina: '.px51-heading',
    }),
    ler(
      'Para que serve',
      'A página conta a jornada real da plataforma, na ordem em que acontece. Cada etapa deixa registro próprio.',
      '.px51-heading',
    ),
    ler(
      'As seis etapas',
      'Cadastro e verificação, proposta de crédito, análise e decisão, formalização, desembolso por Pix, e cobrança e quitação.',
      '.px51-trilha',
    ),
    ler(
      'Quem participa',
      'Três lados, com telas e permissões próprias: a empresa tomadora, a empresa credora e a operação do SEP. Ninguém enxerga a área do outro.',
      { css: '.px51-secao', texto: 'Quem participa' },
    ),
    ler(
      'Uma etapa não garante a próxima',
      'Cadastro aprovado não é crédito aprovado, e proposta pré-aprovada ainda depende de conferência antes de virar contrato.',
      '.px51-aviso',
    ),
    ler(
      'Quer ver de perto?',
      'Entrar na plataforma acompanha a operação, e Ver as condições do crédito abre a página Crédito PJ.',
      '.px51-chamada',
    ),
  ],
};

const sobre: Roteiro = {
  ...BASE,
  id: 'publico-sobre',
  titulo: 'Sobre o SEP',
  icone: 'info',
  descricao:
    'O que é uma sociedade de empréstimo entre pessoas, como o SEP opera e o que ele não é.',
  duracao: '≈ 2 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto: 'Este roteiro percorre a página Sobre o SEP, a partir da página inicial.',
    },
    irPara({
      rota: '/sobre-o-sep',
      titulo: 'Menu Sobre o SEP',
      texto: 'No menu do cabeçalho, Sobre o SEP explica o que a plataforma é.',
      pagina: '.px52-heading',
    }),
    ler(
      'O que é o SEP',
      'A SEP é a figura criada pela Resolução CMN 4.656/2018 para que empresas emprestem umas às outras em ambiente regulado, com identificação das partes, contrato formal e registro de cada passo. Não é promessa de rendimento, e não é um banco.',
      '.px52-heading',
    ),
    ler(
      'Como operamos',
      'Quatro compromissos que definem o desenho do produto: intermediação, recursos segregados, registro de ponta a ponta e um limite que não se dobra.',
      { css: '.px52-secao', texto: 'Como operamos' },
    ),
    ler(
      'O que a SEP não é',
      'Dizer isto com clareza evita o mal-entendido mais caro do mercado: confundir empréstimo entre empresas com aplicação garantida.',
      '.px52-nao',
    ),
    ler(
      'Identificação',
      'Aqui, quem responde pela plataforma: o regime, o CNPJ, a sede e o canal oficial de contato.',
      '.px52-identificacao',
    ),
    ler(
      'Ainda com dúvida?',
      'Os termos de uso e a política de privacidade detalham direitos, deveres e tratamento de dados. A equipe também responde pelo canal oficial.',
      '.px52-chamada',
    ),
  ],
};

const contato: Roteiro = {
  ...BASE,
  id: 'publico-contato',
  titulo: 'Contato',
  icone: 'mail',
  descricao: 'O formulário de mensagem, os canais oficiais e o mapa.',
  duracao: '≈ 1,5 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro percorre a página Contato. O formulário só é mostrado: nada é enviado durante o tour.',
    },
    irPara({
      rota: '/contato',
      titulo: 'Menu Contato',
      texto: 'No menu do cabeçalho, Contato abre os canais de atendimento.',
      pagina: '.px53-heading',
    }),
    ler(
      'Para que serve',
      'A página reúne o formulário de mensagem e os canais oficiais da equipe do SEP.',
      '.px53-heading',
    ),
    ler(
      'Nome e e-mail',
      'O formulário pede nome e e-mail para a equipe saber a quem responder.',
      '.px53-linha-dupla',
    ),
    ler('Assunto', 'O assunto direciona a mensagem para a área certa.', '#ct-assunto'),
    ler(
      'A mensagem',
      'No campo de mensagem entra a dúvida ou o pedido, com o detalhe que for útil.',
      '#ct-mensagem',
    ),
    ler(
      'Autorização',
      'É preciso autorizar o uso dos dados para a equipe responder. Sem a autorização o envio não segue.',
      '.px53-consent',
    ),
    ler(
      'Enviar mensagem',
      'O botão prepara a mensagem para envio pelo e-mail do usuário. Durante o tour ele não é acionado.',
      { css: 'button[type="submit"]', texto: 'Enviar mensagem' },
    ),
    ler(
      'Canais oficiais',
      'Ao lado, o telefone, o e-mail e o endereço da sede, e abaixo o mapa.',
      '.px53-canais',
    ),
  ],
};

const privacidade: Roteiro = {
  ...BASE,
  id: 'publico-privacidade',
  titulo: 'Política de privacidade',
  icone: 'lock',
  descricao: 'Como os dados pessoais são tratados e quais são os direitos do titular.',
  duracao: '≈ 2 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro percorre a política de privacidade. Ela não está no menu do cabeçalho: o caminho é o rodapé.',
    },
    irPara({
      rota: '/politica-de-privacidade',
      titulo: 'Rodapé: Política de privacidade',
      texto: 'No rodapé de qualquer página, o link Política de privacidade abre o documento.',
      pagina: '.px55-heading',
      rodape: true,
    }),
    ler(
      'O documento',
      'Um documento legal escrito para ser lido, e não apenas aceito: como a SEP coleta, usa, compartilha e protege dados pessoais, segundo a LGPD.',
      '.px55-heading',
    ),
    ler('A data de vigência', 'A vigência mostra desde quando esta versão vale.', '.px55-vigencia'),
    ler(
      'O índice',
      'O índice lista as onze seções e cada link leva direto à cláusula.',
      '.px55-indice',
    ),
    ler(
      'Quem trata os dados',
      'A primeira seção identifica o controlador dos dados, a SEP, e a lei que rege o tratamento, a LGPD.',
      '#quem',
    ),
    ler(
      'Open Finance',
      'Há uma seção própria para o Open Finance. O compartilhamento de dados bancários é opcional, pode ser revogado a qualquer momento, e a recusa não impede o uso da SEP.',
      '#open-finance',
    ),
    ler(
      'Seus direitos',
      'Aqui estão os direitos do titular: acessar e corrigir dados, pedir anonimização, bloqueio ou eliminação, a portabilidade e revogar o consentimento. O pedido é respondido em até quinze dias.',
      '#direitos',
    ),
    ler(
      'Quer exercer um direito?',
      'No fim, o canal para exercer um direito e o atalho para os termos de uso.',
      '.px55-chamada',
    ),
  ],
};

const termos: Roteiro = {
  ...BASE,
  id: 'publico-termos',
  titulo: 'Termos de uso',
  icone: 'file-text',
  descricao: 'As regras de uso da plataforma, da conta às operações de crédito.',
  duracao: '≈ 2 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro percorre os termos de uso. Eles também ficam no rodapé, e não no menu do cabeçalho.',
    },
    irPara({
      rota: '/termos-de-uso',
      titulo: 'Rodapé: Termos de uso',
      texto: 'No rodapé de qualquer página, o link Termos de uso abre o documento.',
      pagina: '.px54-heading',
      rodape: true,
    }),
    ler(
      'O documento',
      'Os termos de uso definem as regras de utilização da plataforma, em linguagem para ser lida.',
      '.px54-heading',
    ),
    ler('A data de vigência', 'A vigência mostra desde quando esta versão vale.', '.px54-vigencia'),
    ler(
      'O índice',
      'O índice lista as doze cláusulas, e cada link leva direto a uma delas.',
      '.px54-indice',
    ),
    ler(
      'Cadastro e verificação',
      'A empresa passa por verificação cadastral, o KYB, e o representante por verificação de identidade, o KYC, além da consulta de prevenção à lavagem de dinheiro.',
      '#cadastro',
    ),
    ler(
      'Operações de crédito',
      'Cada proposta observa os parâmetros vigentes, entre eles o teto de R$ 15.000,00. A pré-aprovação não é crédito concedido: a operação só existe depois de conferência, aceite e assinatura do contrato.',
      '#operacoes',
    ),
    ler(
      'Pagamentos e inadimplência',
      'O desembolso ocorre por Pix, após a assinatura, e a agenda de parcelas fica na conta do tomador. O atraso sujeita o devedor aos encargos do contrato e às medidas de cobrança.',
      '#pagamentos',
    ),
    ler(
      'Leia também a política de privacidade',
      'No fim, o atalho para a política de privacidade e o canal para falar com a equipe.',
      '.px54-chamada',
    ),
  ],
};

const completo: Roteiro = {
  ...BASE,
  id: 'publico-completo',
  titulo: 'Módulo completo',
  icone: 'list-checks',
  descricao: 'Os nove roteiros em sequência: da página inicial aos termos de uso.',
  duracao: '≈ 17 min',
  passos: (ctx) => [
    ...emSecao(inicio, ctx, { primeira: true }),
    ...emSecao(login, ctx),
    ...emSecao(creditoPj, ctx),
    ...emSecao(seguranca, ctx),
    ...emSecao(comoFunciona, ctx),
    ...emSecao(sobre, ctx),
    ...emSecao(contato, ctx),
    ...emSecao(privacidade, ctx),
    ...emSecao(termos, ctx),
  ],
};

export const ROTEIROS_PUBLICO: Roteiro[] = [
  completo,
  inicio,
  login,
  creditoPj,
  seguranca,
  comoFunciona,
  sobre,
  contato,
  privacidade,
  termos,
];

import { PassoRoteiro, Roteiro } from '../tour.model';
import { emSecao, rotaExata } from './passos-comuns';

// Tours assistidos do site institucional (sem login): pagina inicial, login, Empresas, Investidores,
// Seguranca, Como funciona, Transparencia, Blog (lista e texto), Sobre o SEP, Contato, Perguntas
// frequentes, Antifraude, Politica de privacidade e Termos de uso. Partem da pagina inicial e
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

/** Link do aviso antifraude da faixa superior (a pagina inicial e as demais tem faixas proprias). */
const LINK_ANTIFRAUDE = '.landing-topbar a[href="/antifraude"], .site-topbar a[href="/antifraude"]';

const ROTA_TEXTO_DO_BLOG = /^\/blog\/[^/?#]+(\?.*)?$/;

/** Os botoes de colunas somem em tela estreita (abaixo de 760 px); o de tres colunas, abaixo de 1100 px. */
function semBotao(seletor: string): boolean {
  const el = document.querySelector(seletor);
  return !el || getComputedStyle(el).display === 'none';
}

/** O tema escuro e a classe `dark` na raiz do documento. */
function temaEscuroAtivo(): boolean {
  return document.documentElement.classList.contains('dark');
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
      'Faixa superior',
      'Acima do cabeçalho, uma faixa lembra que o Dynamis SEP nunca pede pagamento antecipado para liberar crédito e não liga pedindo depósito, com o link Saiba como se proteger. Do outro lado, a Área do investidor leva ao login de quem financia.',
      '.landing-topbar',
    ),
    ler(
      'O cabeçalho',
      'No alto ficam a marca do SEP, o menu das páginas do site e os botões de tema, de ajuda e de entrada.',
      '.landing-header',
    ),
    ler(
      'Menu das páginas',
      'O menu leva a Empresas, Investidores, Como funciona, Segurança, Transparência, Blog, Sobre e Contato. As páginas principais têm um roteiro próprio.',
      '.landing-nav',
    ),
    {
      titulo: 'Tema claro ou escuro',
      texto: () =>
        temaEscuroAtivo()
          ? 'O botão com o sol ou a lua troca entre o tema escuro, que é o padrão, e o tema claro. Vamos ativar o tema claro.'
          : 'O botão com o sol ou a lua troca entre o tema claro e o escuro, que é o padrão. Vamos ativar o tema escuro.',
      alvo: '.landing-theme',
      acao: { tipo: 'clicar' },
    },
    ler(
      'Tema trocado',
      'Assim fica a página no outro tema. A escolha fica guardada no navegador.',
      '.landing-header',
    ),
    {
      titulo: 'Voltar ao tema original',
      texto:
        'Clicando de novo no mesmo botão, a página volta ao tema em que estava, e o tour continua.',
      alvo: '.landing-theme',
      acao: { tipo: 'clicar' },
    },
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
      'O Dynamis SEP é uma sociedade de empréstimo entre pessoas: reúne empresas que buscam capital de giro e investidores dispostos a financiá-las, com a análise de risco explicada, o dinheiro em conta segregada e cada passo registrado.',
      '#hero-title',
    ),
    ler(
      'Por onde começar',
      'Criar conta abre o cadastro. Quem já tem acesso usa Entrar na plataforma.',
      '.hero-actions',
    ),
    ler(
      'Selos de confiança',
      'Os três selos resumem o essencial de cada banner. No primeiro: regulação pelo Banco Central e pelo CMN, segregação patrimonial em conta escrow, e verificação de identidade e prevenção à lavagem de dinheiro.',
      '.hero-slide.ativo .trust-badges',
    ),
    ler(
      'Os banners',
      'O destaque da página troca sozinho a cada quinze segundos: a plataforma, o investidor que financia as operações, a empresa que busca capital de giro com parcelas no Pix Automático e a pessoa física que também pode pedir crédito. Cada um sai por um lado e o próximo entra pelo outro, no mesmo espaço.',
      '.hero-carrossel',
    ),
    ler(
      'Controles dos banners',
      'As setas e os pontos trocam de banner à mão, e o botão de pausa para a troca automática. A troca também para sozinha enquanto o mouse está sobre o banner.',
      '.hero-controles',
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
  tela: '/login',
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
      titulo: 'Menu Empresas',
      texto: 'No menu do cabeçalho, Empresas abre as condições do capital de giro.',
      pagina: '.px49-heading',
    }),
    ler(
      'Seta de voltar',
      'Nas páginas do site, a seta redonda, no alto e ao centro, volta uma tela. Na página inicial ela não aparece, porque não há para onde voltar. Quem chegou direto por um link vai para a página inicial.',
      '.site-voltar',
    ),
    ler(
      'Para que serve',
      'A página explica que toda proposta passa pela mesma esteira: cadastro verificado, análise registrada, contrato assinado e desembolso rastreado.',
      '.px49-heading',
    ),
    ler(
      'A foto do topo',
      'Ao lado do texto, uma imagem ilustrativa mostra o tipo de empresa que busca capital de giro. Ela ilustra o público do SEP: não é uma pessoa real nem um depoimento.',
      '.px49-hero-arte',
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

const investidores: Roteiro = {
  ...BASE,
  id: 'publico-investidores',
  titulo: 'Investidores',
  icone: 'wallet',
  descricao:
    'Como quem financia escolhe, aporta e acompanha, o que vê antes de decidir e onde fica o dinheiro.',
  duracao: '≈ 3 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro percorre a página Investidores, a partir da página inicial. No sistema, quem financia é o credor; no site, aparece como investidor.',
    },
    irPara({
      rota: '/investidores',
      titulo: 'Menu Investidores',
      texto: 'No menu do cabeçalho, Investidores abre a página de quem financia as operações.',
      pagina: '.px60-heading',
    }),
    ler(
      'Para que serve',
      'A página explica como financiar empresas e acompanhar cada parcela, com o risco à vista. O retorno vem conforme as parcelas são pagas.',
      '.px60-heading',
    ),
    ler(
      'A foto do topo',
      'Uma imagem ilustrativa mostra o perfil de quem financia. Ela ilustra o público do SEP: não é uma pessoa real nem um depoimento.',
      '.px60-hero-arte',
    ),
    ler(
      'Os dois caminhos',
      'Criar conta de investidor abre o cadastro, e Como funciona leva à jornada completa da plataforma.',
      '.px60-hero-acoes',
    ),
    ler(
      'Antes de investir',
      'O aviso vem logo no começo, e não escondido no rodapé: financiar crédito envolve risco, inclusive de inadimplência e de perda do capital. O SEP não garante o pagamento das operações, e o investimento não conta com a cobertura do FGC.',
      '.px60-risco',
    ),
    ler(
      'Como funciona para quem financia',
      'Cinco etapas, da identificação ao retorno de cada parcela: cadastro e perfil, escolha, aporte, acompanhamento e retorno.',
      { css: '.px60-secao', texto: 'Como funciona para quem financia' },
    ),
    ler(
      'O que você vê antes de decidir',
      'Antes de aportar, o investidor vê o score explicado, a faixa de risco de A a E, o prazo e a taxa, e a inadimplência por faixa.',
      { css: '.px60-secao', texto: 'O que você vê antes de decidir' },
    ),
    ler(
      'Quem pode financiar',
      'Pessoas físicas, empresas e investidores qualificados podem financiar, cada um dentro das regras do seu perfil. Há um limite de exposição por tomador para quem não é investidor qualificado.',
      { css: '.px60-secao', texto: 'Quem pode financiar' },
    ),
    ler(
      'Onde fica o seu dinheiro',
      'O dinheiro de quem financia fica separado do caixa da plataforma, tudo é registrado, e não há promessa de ganho. A ilustração ao lado mostra esse caminho.',
      { css: '.px60-secao', texto: 'Onde fica o seu dinheiro' },
    ),
    ler(
      'Pronto para conhecer as oportunidades?',
      'No fim, atalhos para criar a conta, para as perguntas frequentes e para a página de transparência.',
      '.px60-chamada',
    ),
  ],
};

const transparencia: Roteiro = {
  ...BASE,
  id: 'publico-transparencia',
  titulo: 'Transparência',
  icone: 'scale',
  descricao: 'Identificação, tarifas, inadimplência por faixa de risco e os canais oficiais.',
  duracao: '≈ 2,5 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto: 'Este roteiro percorre a página Transparência, a partir da página inicial.',
    },
    irPara({
      rota: '/transparencia',
      titulo: 'Menu Transparência',
      texto:
        'No menu do cabeçalho, Transparência reúne quem somos, quanto cobramos e como estão as operações.',
      pagina: '.px61-heading',
    }),
    ler(
      'Para que serve',
      'Uma sociedade de empréstimo entre pessoas lida com o dinheiro de terceiros, e por isso mostra a própria identificação, as tarifas e o desempenho da carteira em um lugar só.',
      '.px61-heading',
    ),
    ler(
      'Identificação',
      'Os dados que permitem conferir quem responde pela plataforma: nome, CNPJ, sede, regulamentação e canal oficial. A autorização do Banco Central aparece como Em atualização até a referência estar disponível, e o link leva à lista pública do Banco Central.',
      { css: '.px61-secao', texto: 'Identificação' },
    ),
    ler(
      'Tarifas',
      'O que cobramos, em linguagem simples. Itens sem custo aparecem na lista, e não ficam de fora. A recomendação é comparar sempre o Custo Efetivo Total.',
      { css: '.px61-secao', texto: 'Tarifas' },
    ),
    ler(
      'Inadimplência por faixa de risco',
      'A regulamentação obriga a divulgar, todo mês, a inadimplência média dos últimos doze meses por classificação de risco. À direita, o gráfico de barras ilustra as faixas de A a E.',
      '.px61-inad',
    ),
    ler(
      'Por que aparece um traço',
      'Ainda não há carteira com doze meses de histórico, então os indicadores aparecem como traço. A divulgação mensal começa quando houver operações a medir, e cada mês traz a sua data-base.',
      '.px61-risco',
    ),
    ler(
      'Reclamações e canais oficiais',
      'O e-mail oficial, o horário de atendimento e o alerta para desconfiar de outros contatos: o SEP não pede senha, código do autenticador nem pagamento antecipado.',
      { css: '.px61-secao', texto: 'Reclamações e canais oficiais' },
    ),
    ler(
      'Ficou com dúvida?',
      'No fim, atalhos para as perguntas frequentes e para falar com a equipe.',
      '.px61-chamada',
    ),
  ],
};

const blog: Roteiro = {
  ...BASE,
  id: 'publico-blog',
  titulo: 'Blog e leitura em áudio',
  icone: 'book-open',
  descricao: 'A lista de textos, a leitura em áudio acompanhada na tela e as colunas do texto.',
  duracao: '≈ 4 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro percorre o blog, abre um texto e mostra a leitura em áudio e as colunas. A leitura em voz alta não é acionada durante o tour, para não competir com a narração.',
    },
    irPara({
      rota: '/blog',
      titulo: 'Menu Blog',
      texto:
        'No menu do cabeçalho, Blog abre os textos sobre a sociedade de empréstimo entre pessoas.',
      pagina: '.px64-heading',
    }),
    ler(
      'Para que serve',
      'Textos informativos sobre como uma SEP funciona, como o risco é medido, como a empresa se prepara e como quem financia se protege. Sem promessa de ganho.',
      '.px64-heading',
    ),
    ler(
      'Filtros por categoria',
      'Os botões filtram os textos por categoria e mostram quantos há em cada uma.',
      '.px64-filtros',
    ),
    ler(
      'Texto em destaque',
      'O primeiro texto da lista vira destaque, com imagem, resumo, data e tempo de leitura.',
      '.px64-destaque',
    ),
    ler(
      'Os demais textos',
      'Os outros entram em grade, cada um com a sua imagem, categoria e resumo.',
      '.px64-grade',
    ),
    {
      titulo: 'Abrir um texto',
      texto: 'Um clique no texto em destaque abre a leitura.',
      alvo: '.px64-destaque',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_TEXTO_DO_BLOG,
      aguardarAlvo: '.px65-heading',
    },
    ler(
      'O texto',
      'Título, resumo, autoria, data e tempo de leitura. A página sempre abre no topo.',
      '.px65-heading',
    ),
    ler(
      'Seta de voltar',
      'A seta redonda, no alto e ao centro, volta para a lista do blog.',
      '.site-voltar',
    ),
    ler(
      'Ouvir este texto',
      'A leitura usa a voz do aparelho e só começa quando a pessoa pede. O trecho lido fica marcado na própria página: uma tarja sobre o bloco em leitura e um destaque dourado que avança no ritmo da voz, com a página rolando junto. Dá para pausar, parar e escolher a velocidade.',
      'sep-ouvir-texto',
    ),
    ler(
      'Ao terminar a leitura',
      'Quando a leitura termina sozinha, três segundos depois a página volta à lista do blog, no ponto do texto lido: a borda dele pisca em branco quatro vezes, o próximo texto ganha uma borda azul que também pisca quatro vezes, e a página posiciona nele. Se ninguém interagir em dez segundos, ela sobe ao cabeçalho.',
      'sep-ouvir-texto',
    ),
    ler(
      'Diagramação',
      'Cada texto abre com uma diagramação diferente: o primeiro em uma coluna, o segundo em duas, o terceiro em três, e depois a sequência recomeça. Estes botões deixam a pessoa escolher a que prefere para o texto aberto.',
      '.px65-diagramacao',
    ),
    {
      titulo: 'Duas colunas',
      texto: 'Vamos ver o texto em duas colunas.',
      alvo: '.px65-col-2',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_TEXTO_DO_BLOG,
      aguardarAlvo: '.px65-corpo-2',
      pularSe: () => semBotao('.px65-col-2'),
    },
    {
      titulo: 'O texto em duas colunas',
      texto:
        'A página alarga, e só o texto corrido muda. Título, imagem, resumo e aviso ficam como estavam.',
      alvo: '.px65-corpo',
      acao: { tipo: 'observar' },
      pularSe: () => semBotao('.px65-col-2'),
    },
    {
      titulo: 'Três colunas',
      texto:
        'Agora, em três colunas. Em tela estreita, este botão some e o texto passa a duas colunas.',
      alvo: '.px65-col-3',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_TEXTO_DO_BLOG,
      aguardarAlvo: '.px65-corpo-3',
      pularSe: () => semBotao('.px65-col-3'),
    },
    {
      titulo: 'O texto em três colunas',
      texto:
        'Três colunas variam a leitura em telas largas. Em textos longos, uma ou duas costumam cansar menos.',
      alvo: '.px65-corpo',
      acao: { tipo: 'observar' },
      pularSe: () => semBotao('.px65-col-3'),
    },
    {
      titulo: 'Voltar a uma coluna',
      texto: 'Por fim, uma coluna, a diagramação clássica de leitura.',
      alvo: '.px65-col-1',
      acao: { tipo: 'clicar' },
      aguardarRota: ROTA_TEXTO_DO_BLOG,
      aguardarAlvo: '.px65-corpo:not(.px65-corpo-2):not(.px65-corpo-3)',
      pularSe: () => semBotao('.px65-col-1'),
    },
    ler('Em resumo', 'No fim do texto, os pontos principais em poucas linhas.', '.px65-resumo'),
    ler(
      'Aviso do blog',
      'Todo texto termina lembrando que o conteúdo é informativo, não é recomendação de investimento nem promessa de rendimento.',
      '.px65-aviso',
    ),
    ler(
      'Para continuar lendo',
      'Textos relacionados sugerem a próxima leitura.',
      '.px65-relacionados',
    ),
    {
      titulo: 'Voltar à lista',
      texto: 'A seta redonda leva de volta à lista do blog.',
      alvo: '.site-voltar',
      acao: { tipo: 'clicar' },
      aguardarRota: rotaExata('/blog'),
      aguardarAlvo: '.px64-heading',
    },
  ],
};

const perguntas: Roteiro = {
  ...BASE,
  id: 'publico-perguntas',
  titulo: 'Perguntas frequentes',
  icone: 'circle-help',
  descricao: 'A busca, os quatro grupos de perguntas e como abrir uma resposta.',
  duracao: '≈ 2 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto:
        'Este roteiro percorre as perguntas frequentes. Elas não estão no menu do cabeçalho: o caminho é o rodapé. Nada é digitado durante o tour.',
    },
    irPara({
      rota: '/perguntas-frequentes',
      titulo: 'Rodapé: Perguntas frequentes',
      texto: 'No rodapé de qualquer página, o link Perguntas frequentes abre a página.',
      pagina: '.px62-heading',
      rodape: true,
    }),
    ler(
      'Para que serve',
      'As respostas diretas para o que mais perguntam sobre a sociedade de empréstimo entre pessoas, em linguagem simples.',
      '.px62-heading',
    ),
    ler(
      'Busca',
      'A busca filtra as perguntas conforme se digita, por exemplo limite, Pix ou risco. Durante o tour o campo só é mostrado.',
      '.px62-busca',
    ),
    ler('Quantas perguntas', 'Logo abaixo, a contagem de perguntas encontradas.', '.px62-contagem'),
    ler(
      'Os grupos',
      'As perguntas se dividem em quatro grupos: sobre a SEP, para empresas que buscam crédito, para investidores e segurança e proteção de dados.',
      '.px62-grupo',
    ),
    {
      titulo: 'Abrir uma resposta',
      texto: 'Um clique na pergunta abre a resposta, sem sair da página.',
      alvo: '.px62-item summary',
      acao: { tipo: 'clicar' },
      aguardarRota: rotaExata('/perguntas-frequentes'),
      aguardarAlvo: '.px62-item[open]',
    },
    ler('A resposta', 'A resposta aparece logo abaixo da pergunta.', '.px62-item[open]'),
    ler(
      'Ainda com dúvida?',
      'No fim, o canal para falar com a equipe e um atalho para o blog.',
      '.px62-chamada',
    ),
  ],
};

const antifraude: Roteiro = {
  ...BASE,
  id: 'publico-antifraude',
  titulo: 'Antifraude',
  icone: 'shield-alert',
  descricao: 'O que o Dynamis SEP nunca faz, como reconhecer um golpe e o que fazer se acontecer.',
  duracao: '≈ 2 min',
  passos: () => [
    {
      titulo: 'Ponto de partida',
      texto: 'Este roteiro percorre a página Antifraude, a partir da faixa no topo do site.',
    },
    {
      titulo: 'Saiba como se proteger',
      texto: 'Na faixa do topo, o link Saiba como se proteger abre a página Antifraude.',
      alvo: LINK_ANTIFRAUDE,
      acao: { tipo: 'clicar' },
      aguardarRota: rotaExata('/antifraude'),
      aguardarAlvo: '.px63-heading',
    },
    ler(
      'Para que serve',
      'Golpes com o nome de empresas de crédito são comuns. A página explica como o Dynamis SEP se comunica e como reconhecer o que não é dele.',
      '.px63-heading',
    ),
    ler(
      'O que o Dynamis SEP nunca faz',
      'Nunca pede pagamento antecipado, nunca liga pedindo depósito, nunca pede senha ou códigos, e só atende pelos canais oficiais.',
      { css: '.px63-secao', texto: 'O que o Dynamis SEP nunca faz' },
    ),
    ler(
      'Como reconhecer um golpe',
      'Uma lista de sinais de alerta, ao lado dos canais oficiais. Na dúvida sobre um contato, confirme pelo e-mail oficial antes de responder.',
      { css: '.px63-secao', texto: 'Como reconhecer um golpe' },
    ),
    ler(
      'Se aconteceu com você',
      'Pare e não pague, guarde as provas, avise o canal oficial e, se já pagou, procure o banco e registre a ocorrência.',
      { css: '.px63-secao', texto: 'Se aconteceu com você' },
    ),
    ler(
      'Viu algo suspeito?',
      'No fim, o canal para avisar a equipe e o atalho para a página Segurança.',
      '.px63-chamada',
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
      'Entrar na plataforma acompanha a operação, e Para empresas abre as condições do crédito.',
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
      titulo: 'Menu Sobre',
      texto: 'No menu do cabeçalho, Sobre explica o que a plataforma é.',
      pagina: '.px52-heading',
    }),
    ler(
      'O que é o SEP',
      'Uma SEP é a instituição regulada que reúne quem precisa de crédito e quem quer financiá-lo, pessoas físicas ou empresas, em um ambiente com identificação das partes, contrato formal e registro de cada passo. O Dynamis SEP opera nesse modelo. Não é promessa de rendimento, e não é um banco.',
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
  descricao: 'Os quatorze roteiros em sequência: da página inicial aos termos de uso.',
  duracao: '≈ 31 min',
  passos: (ctx) => [
    ...emSecao(inicio, ctx, { primeira: true }),
    ...emSecao(login, ctx),
    ...emSecao(creditoPj, ctx),
    ...emSecao(investidores, ctx),
    ...emSecao(seguranca, ctx),
    ...emSecao(comoFunciona, ctx),
    ...emSecao(transparencia, ctx),
    ...emSecao(blog, ctx),
    ...emSecao(sobre, ctx),
    ...emSecao(contato, ctx),
    ...emSecao(perguntas, ctx),
    ...emSecao(antifraude, ctx),
    ...emSecao(privacidade, ctx),
    ...emSecao(termos, ctx),
  ],
};

export const ROTEIROS_PUBLICO: Roteiro[] = [
  completo,
  inicio,
  login,
  creditoPj,
  investidores,
  seguranca,
  comoFunciona,
  transparencia,
  blog,
  sobre,
  contato,
  perguntas,
  antifraude,
  privacidade,
  termos,
];

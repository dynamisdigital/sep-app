import type { CenaIlustracao } from './sep-ilustracao.component';

// Blog do Dynamis SEP. Todo o conteúdo gira em torno da sociedade de empréstimo entre pessoas (SEP):
// o que é, como funciona para quem toma e para quem financia, como o risco é medido e como se proteger.
//
// Regras editoriais (ver docs/proposta-site):
//  - nenhum texto promete retorno nem compara rentabilidade; fala de como o risco é analisado;
//  - os números são sempre "exemplo ilustrativo" e nunca uma oferta;
//  - o que depende de regra do Banco Central é dito de forma geral ("a regulamentação fixa prazos
//    curtos"), e a revisão do jurídico precede cada publicação;
//  - cada texto traz o aviso de risco quando fala de financiar operações.

export type CategoriaBlog = 'SEP na prática' | 'Para empresas' | 'Para investidores' | 'Segurança';

export type BlocoTexto =
  | { t: 'p'; v: string }
  | { t: 'h2'; v: string }
  | { t: 'ul'; v: string[] }
  | { t: 'ol'; v: string[] }
  | { t: 'destaque'; v: string };

export interface PostBlog {
  slug: string;
  titulo: string;
  resumo: string;
  categoria: CategoriaBlog;
  /** Data de publicação, AAAA-MM-DD. */
  publicadoEm: string;
  cena: CenaIlustracao;
  /** Texto alternativo da imagem, descrevendo o que ela mostra. */
  imagemAlt?: string;
  blocos: BlocoTexto[];
  emResumo: string[];
  relacionados: string[];
}

/**
 * Fotos aprovadas do blog. O arquivo fica em `image/blog/<slug>.jpg` (servido em `/image/blog/`). Um texto só
 * passa a mostrar a foto depois de o slug entrar nesta lista; até lá o blog usa a ilustração da cena e não
 * faz pedido de arquivo que não existe. Os pedidos de imagem estão em `docs/proposta-site/IMAGENS_DO_SITE.md`.
 */
export const FOTOS_DO_BLOG: ReadonlySet<string> = new Set<string>([
  'o-que-e-uma-sep',
  'como-funciona-a-sep-passo-a-passo',
  'sep-nao-e-banco-nem-investimento-garantido',
  'recursos-segregados-onde-fica-o-dinheiro',
  'quem-pode-financiar-numa-sep-e-o-limite-por-tomador',
  'score-explicado-analise-de-credito-em-uma-sep',
  'classificacao-de-risco-a-a-e-como-ler',
  'diversificar-em-emprestimo-entre-pessoas',
  'como-preparar-a-empresa-para-pedir-capital-de-giro',
  'custo-efetivo-total-como-comparar-uma-proposta',
  'pix-automatico-nas-parcelas-o-que-muda',
  'inadimplencia-o-que-e-e-como-a-sep-cobra',
  'kyc-kyb-e-pld-por-que-pedimos-tantos-dados',
  'golpe-do-emprestimo-com-pagamento-antecipado',
  'lgpd-e-credito-seus-direitos',
]);

/** Caminho da foto do texto, ou `null` quando ele ainda usa a ilustração. */
export function fotoDe(post: PostBlog): string | null {
  return FOTOS_DO_BLOG.has(post.slug) ? `/image/blog/${post.slug}.jpg` : null;
}

export const AVISO_DO_BLOG =
  'Conteúdo informativo, que não é recomendação de investimento nem oferta de crédito. Financiar operações de crédito envolve risco, inclusive de inadimplência e de perda do capital, e o Dynamis SEP não garante o pagamento das operações.';

const DATA = '2026-10-09';

export const POSTS: PostBlog[] = [
  {
    slug: 'o-que-e-uma-sep',
    titulo: 'O que é uma SEP, a sociedade de empréstimo entre pessoas',
    resumo:
      'Uma SEP reúne quem precisa de crédito e quem quer financiá-lo, em uma plataforma autorizada e fiscalizada pelo Banco Central. Entenda o papel de cada lado.',
    categoria: 'SEP na prática',
    publicadoEm: DATA,
    cena: 'rede',
    imagemAlt:
      'Duas pessoas conversando diante de uma tela com a plataforma de crédito entre pessoas',
    blocos: [
      {
        t: 'p',
        v: 'Quando uma empresa precisa de capital de giro, o caminho mais conhecido é o banco. Existe outro, regulado: a sociedade de empréstimo entre pessoas, ou SEP.',
      },
      {
        t: 'p',
        v: 'A ideia é simples. Uma plataforma reúne duas pontas. De um lado, quem precisa de crédito, o tomador. Do outro, quem quer financiá-lo e aceita o risco de fazê-lo, o credor, também chamado de investidor. A SEP faz a ponte, analisa o crédito, formaliza o contrato e cobra as parcelas.',
      },
      { t: 'h2', v: 'O que a SEP faz e o que ela não faz' },
      {
        t: 'ul',
        v: [
          'Faz: identifica as partes, analisa o crédito, formaliza o contrato, cobra e repassa o dinheiro.',
          'Não faz: não empresta recursos próprios e não retém o risco de crédito da operação.',
          'Não faz: não garante que o tomador vai pagar.',
        ],
      },
      { t: 'h2', v: 'Por que existe regulação' },
      {
        t: 'p',
        v: 'Intermediar dinheiro de terceiros exige regra. Por isso a SEP precisa de autorização prévia do Banco Central para funcionar, deve manter o dinheiro dos credores separado do seu próprio caixa e precisa explicar de forma visível os riscos de cada operação. A regulamentação também obriga a divulgar, todo mês, a inadimplência por faixa de risco.',
      },
      {
        t: 'destaque',
        v: 'Regulada não é o mesmo que garantida. A regulação existe para que o risco seja visível, e não para eliminá-lo.',
      },
    ],
    emResumo: [
      'A SEP intermedeia: reúne quem toma e quem financia o crédito.',
      'Ela não empresta dinheiro próprio e não garante o pagamento.',
      'Precisa de autorização do Banco Central e deve separar o dinheiro dos credores do seu caixa.',
    ],
    relacionados: [
      'como-funciona-a-sep-passo-a-passo',
      'sep-nao-e-banco-nem-investimento-garantido',
    ],
  },
  {
    slug: 'como-funciona-a-sep-passo-a-passo',
    titulo: 'Como funciona uma SEP, passo a passo, para quem toma e para quem financia',
    resumo:
      'Do cadastro à última parcela: as duas jornadas lado a lado, e o que acontece com o dinheiro em cada etapa.',
    categoria: 'SEP na prática',
    publicadoEm: DATA,
    cena: 'fluxo',
    imagemAlt: 'Empresária acompanhando no computador as parcelas de um crédito de capital de giro',
    blocos: [
      {
        t: 'p',
        v: 'Uma SEP tem duas jornadas que se encontram em uma operação de crédito. Veja cada uma, na ordem em que acontece.',
      },
      { t: 'h2', v: 'A jornada da empresa que busca crédito' },
      {
        t: 'ol',
        v: [
          'Cadastro e verificação: a empresa envia os dados e documentos, e o representante confirma a identidade.',
          'Pedido: informa o valor, o prazo e a finalidade, e vê a parcela e o custo antes de enviar.',
          'Análise: a plataforma consulta fontes de crédito e calcula um score, e uma pessoa revisa a decisão.',
          'Contrato: se aprovado, o contrato é assinado digitalmente.',
          'Recebimento e pagamento: o valor chega à conta da empresa, e as parcelas são pagas até a quitação.',
        ],
      },
      { t: 'h2', v: 'A jornada de quem financia' },
      {
        t: 'ol',
        v: [
          'Cadastro e perfil: o credor se identifica, passa pelas verificações e registra que entendeu os riscos.',
          'Escolha: vê as oportunidades, com o risco explicado, e decide em quais aportar.',
          'Aporte: o dinheiro vai para a conta segregada da operação, e não para o caixa da plataforma.',
          'Acompanhamento: acompanha cada parcela, o que já voltou e o que está em atraso.',
          'Retorno: a cada parcela paga pelo tomador, o valor é repassado ao credor em prazo curto definido pela regulamentação.',
        ],
      },
      {
        t: 'p',
        v: 'Em qualquer etapa, passar por uma não garante a seguinte. Cadastro aprovado não é crédito aprovado, e operação aprovada ainda depende da assinatura e do aporte.',
      },
    ],
    emResumo: [
      'As duas jornadas são independentes até a operação, e depois se encontram no contrato.',
      'O dinheiro do credor fica em conta segregada.',
      'Nenhuma etapa garante a seguinte.',
    ],
    relacionados: ['o-que-e-uma-sep', 'recursos-segregados-onde-fica-o-dinheiro'],
  },
  {
    slug: 'sep-nao-e-banco-nem-investimento-garantido',
    titulo: 'SEP não é banco e não é investimento garantido: as diferenças que importam',
    resumo:
      'Confundir empréstimo entre pessoas com aplicação garantida é o mal-entendido mais caro do mercado. Veja o que muda.',
    categoria: 'Para investidores',
    publicadoEm: DATA,
    cena: 'escudo',
    imagemAlt: 'Investidor lendo com atenção os riscos de uma operação de crédito em um tablet',
    blocos: [
      {
        t: 'p',
        v: 'Uma conta em banco e uma operação financiada por uma SEP podem parecer parecidas na tela do celular. Por baixo, são coisas diferentes.',
      },
      { t: 'h2', v: 'Banco' },
      {
        t: 'p',
        v: 'O banco capta depósitos e empresta, em grande parte, o dinheiro que capta, assumindo o risco de quem não paga. Os depósitos têm proteção própria dentro das regras do sistema bancário.',
      },
      { t: 'h2', v: 'SEP' },
      {
        t: 'p',
        v: 'A SEP não capta depósito. Quem financia a operação escolhe aportar nela, e é esse credor que assume o risco de o tomador não pagar. A plataforma analisa o crédito e cobra, mas não garante o resultado.',
      },
      { t: 'h2', v: 'O que isso significa para quem financia' },
      {
        t: 'ul',
        v: [
          'O retorno vem das parcelas pagas pelo tomador, e não de uma promessa da plataforma.',
          'Se o tomador atrasa ou deixa de pagar, o credor pode ter retorno menor ou perder parte do capital.',
          'O investimento em crédito entre pessoas não conta com a cobertura do FGC.',
          'Diversificar entre várias operações reduz o efeito de uma única falha.',
        ],
      },
      {
        t: 'destaque',
        v: 'Se alguém promete rendimento garantido em empréstimo entre pessoas, desconfie. A regulamentação não permite à SEP assegurar o cumprimento das operações.',
      },
    ],
    emResumo: [
      'O banco capta depósitos; a SEP intermedeia operações escolhidas pelo credor.',
      'O risco de inadimplência é de quem financia.',
      'Não há garantia de retorno nem cobertura do FGC.',
    ],
    relacionados: [
      'diversificar-em-emprestimo-entre-pessoas',
      'classificacao-de-risco-a-a-e-como-ler',
    ],
  },
  {
    slug: 'recursos-segregados-onde-fica-o-dinheiro',
    titulo: 'Onde fica o dinheiro numa SEP: por que a conta segregada importa',
    resumo:
      'O dinheiro de quem financia não pode se misturar com o caixa da plataforma. Veja como isso protege e o que não protege.',
    categoria: 'Para investidores',
    publicadoEm: DATA,
    cena: 'escudo',
    imagemAlt: 'Cofre digital simbolizando conta segregada para o dinheiro das operações',
    blocos: [
      {
        t: 'p',
        v: 'Uma das regras mais importantes da SEP é simples de enunciar: o dinheiro dos credores e dos tomadores não pode ficar misturado com o dinheiro da própria plataforma.',
      },
      { t: 'h2', v: 'Como funciona' },
      {
        t: 'ul',
        v: [
          'Os recursos transitam por contas segregadas, vinculadas às operações.',
          'A SEP não pode usar recursos próprios para emprestar nem manter recursos de credores em conta própria sem vínculo com uma operação.',
          'A regulamentação fixa prazos curtos: o valor aportado deve chegar ao tomador em poucos dias úteis, e cada parcela paga volta ao credor em até um dia útil.',
          'Se a operação não se forma, o dinheiro deve ser devolvido em prazo curto.',
        ],
      },
      { t: 'h2', v: 'O que a segregação protege' },
      {
        t: 'p',
        v: 'Protege o dinheiro contra o uso indevido pela plataforma e contra a confusão com as dívidas dela. Deixa claro, a qualquer momento, de quem é cada real e em qual operação ele está.',
      },
      { t: 'h2', v: 'O que ela não protege' },
      {
        t: 'p',
        v: 'A segregação não protege contra a inadimplência do tomador. Se a empresa financiada deixar de pagar, a conta segregada não cobre a perda. Por isso a análise de risco e a diversificação continuam sendo responsabilidade de quem financia.',
      },
    ],
    emResumo: [
      'O dinheiro das operações fica separado do caixa da plataforma.',
      'Os prazos de repasse são curtos e fixados pela regulamentação.',
      'A conta segregada não cobre o risco de inadimplência.',
    ],
    relacionados: ['sep-nao-e-banco-nem-investimento-garantido', 'o-que-e-uma-sep'],
  },
  {
    slug: 'quem-pode-financiar-numa-sep-e-o-limite-por-tomador',
    titulo: 'Quem pode financiar operações numa SEP, e o limite por tomador',
    resumo:
      'Pessoas físicas e empresas podem ser credores, com regras de perfil e um limite de exposição para quem não é investidor qualificado.',
    categoria: 'Para investidores',
    publicadoEm: DATA,
    cena: 'pessoas',
    imagemAlt:
      'Pessoas de perfis diferentes reunidas em torno de uma mesa de análise de investimentos',
    blocos: [
      {
        t: 'p',
        v: 'A regulamentação da SEP admite diferentes tipos de credor. No Dynamis SEP, podem financiar operações pessoas físicas e empresas, depois de se cadastrarem e passarem pela verificação.',
      },
      { t: 'h2', v: 'Tipos de credor' },
      {
        t: 'ul',
        v: [
          'Pessoas físicas.',
          'Empresas não financeiras.',
          'Instituições financeiras, fundos e securitizadoras, nas condições da regulamentação.',
        ],
      },
      { t: 'h2', v: 'Análise de perfil e ciência de risco' },
      {
        t: 'p',
        v: 'A SEP deve verificar se o perfil de quem financia é compatível com o risco das operações, e registrar que o credor foi informado dos riscos. É por isso que o cadastro do credor não é só preencher um formulário: inclui verificação de identidade, prevenção à lavagem de dinheiro e a manifestação de que os riscos foram compreendidos.',
      },
      { t: 'h2', v: 'O limite por tomador' },
      {
        t: 'p',
        v: 'Para quem não é investidor qualificado, a regulamentação limita o valor que um credor pode emprestar a um mesmo tomador por meio da mesma SEP: R$ 15.000. Investidores qualificados, conforme a definição da Comissão de Valores Mobiliários, não têm esse limite.',
      },
      {
        t: 'destaque',
        v: 'O limite não é um obstáculo: é uma proteção que obriga a diversificar. Uma única operação nunca deveria concentrar todo o capital.',
      },
    ],
    emResumo: [
      'Pessoas físicas e empresas podem ser credores, após cadastro e verificação.',
      'A SEP verifica o perfil e registra a ciência de risco.',
      'Quem não é qualificado tem limite por tomador na mesma SEP.',
    ],
    relacionados: [
      'diversificar-em-emprestimo-entre-pessoas',
      'kyc-kyb-e-pld-por-que-pedimos-tantos-dados',
    ],
  },
  {
    slug: 'score-explicado-analise-de-credito-em-uma-sep',
    titulo: 'Score explicado: o que pesa na análise de crédito de uma empresa',
    resumo:
      'Um bom score não é um número misterioso. Veja os seis fatores do score interno do Dynamis SEP e por que o resultado precisa poder ser explicado.',
    categoria: 'Para empresas',
    publicadoEm: DATA,
    cena: 'analise',
    imagemAlt: 'Analista de crédito revisando indicadores de uma empresa em um painel de dados',
    blocos: [
      {
        t: 'p',
        v: 'Quando uma empresa pede crédito, a pergunta de fundo é uma só: ela consegue pagar? A resposta nunca vem de um único dado. No Dynamis SEP, o score interno vai de 0 a 1.000 e é a soma de seis fatores.',
      },
      {
        t: 'ol',
        v: [
          'Comprometimento da renda (25%): quanto do faturamento mensal a parcela consome. Quanto menor, melhor.',
          'Score dos bureaus (25%): a média das notas de mercado das fontes consultadas.',
          'Restrições ativas (20%): protestos, cheques sem fundo e dívidas vencidas, pelo número e pelo valor.',
          'Endividamento no sistema financeiro (15%): quanto a empresa já deve frente ao que fatura.',
          'Tempo de atividade (10%): empresas mais antigas têm histórico mais previsível.',
          'Tamanho da operação (5%): pedidos perto do limite exigem mais folga.',
        ],
      },
      { t: 'h2', v: 'Dois cuidados que importam' },
      {
        t: 'p',
        v: 'Primeiro, o score explica a si mesmo: cada fator mostra o que foi observado e quanto somou, e a soma é exatamente o número final. Segundo, o sistema sugere, mas quem decide é uma pessoa. Se o analista diverge da sugestão, a justificativa fica registrada.',
      },
      {
        t: 'p',
        v: 'Há ainda um ajuste fora dos seis fatores: quem tem o Pix Automático ativo recebe pontos a mais, porque o pagamento fica previsível. O ajuste aparece em linha própria, com o motivo, e entra na soma do score. Ele não esconde uma regra bloqueante: restrições altas continuam levando à recusa.',
      },
      {
        t: 'p',
        v: 'E se uma das fontes de consulta estiver fora do ar? O sistema não decide sozinho: a proposta vai para análise manual.',
      },
      {
        t: 'destaque',
        v: 'Os pesos e cortes podem mudar ao longo do tempo. Quando mudam, a alteração é versionada e registrada.',
      },
    ],
    emResumo: [
      'O score é a soma de seis fatores explicáveis.',
      'O sistema sugere, e uma pessoa decide, com justificativa registrada.',
      'Sem dado completo, a decisão vai para análise manual.',
    ],
    relacionados: [
      'classificacao-de-risco-a-a-e-como-ler',
      'como-preparar-a-empresa-para-pedir-capital-de-giro',
    ],
  },
  {
    slug: 'classificacao-de-risco-a-a-e-como-ler',
    titulo: 'Classificação de risco de A a E: como ler antes de financiar uma operação',
    resumo:
      'A faixa de risco resume a análise, mas não substitui a leitura dos fatores. Veja como usá-la e por que a inadimplência por faixa é divulgada todo mês.',
    categoria: 'Para investidores',
    publicadoEm: DATA,
    cena: 'grafico',
    imagemAlt: 'Gráfico de barras com a inadimplência por faixa de risco em uma tela de computador',
    blocos: [
      {
        t: 'p',
        v: 'Cada operação publicada recebe uma faixa de risco, de A a E. A faixa nasce do score e serve como primeiro filtro. Ela responde a pergunta "quão arriscada é, em geral?", mas não explica o porquê.',
      },
      { t: 'h2', v: 'Como usar a faixa' },
      {
        t: 'ul',
        v: [
          'Comece pela faixa para reduzir a lista de oportunidades.',
          'Abra os fatores: duas operações da mesma faixa podem ter riscos de natureza diferente.',
          'Compare o prazo: quanto mais longa a operação, mais tempo o risco leva para se resolver.',
          'Olhe a inadimplência histórica da faixa antes de decidir.',
        ],
      },
      { t: 'h2', v: 'Por que a inadimplência é divulgada' },
      {
        t: 'p',
        v: 'A regulamentação obriga a SEP a divulgar, todo mês, a inadimplência média das operações dos últimos 12 meses por classificação de risco. Esse número mostra, na prática, quanto cada faixa realmente atrasou, e não apenas o que a análise esperava.',
      },
      {
        t: 'destaque',
        v: 'A faixa A não é sinônimo de risco zero, e a faixa E não é sinônimo de perda certa. A classificação é uma estimativa, e o resultado real pode ser diferente.',
      },
    ],
    emResumo: [
      'A faixa de A a E é um primeiro filtro, e não o veredito.',
      'Os fatores explicam o porquê da faixa.',
      'A inadimplência por faixa é divulgada todo mês e mostra o resultado real.',
    ],
    relacionados: [
      'score-explicado-analise-de-credito-em-uma-sep',
      'diversificar-em-emprestimo-entre-pessoas',
    ],
  },
  {
    slug: 'diversificar-em-emprestimo-entre-pessoas',
    titulo: 'Diversificar em empréstimo entre pessoas: por que não colocar tudo em uma operação',
    resumo:
      'Uma única operação em atraso pode comprometer boa parte do capital. A diversificação reduz esse efeito, e a conta é simples.',
    categoria: 'Para investidores',
    publicadoEm: DATA,
    cena: 'grafico',
    imagemAlt: 'Mãos separando moedas em diferentes grupos sobre uma mesa',
    blocos: [
      {
        t: 'p',
        v: 'Diversificar significa dividir o capital entre várias operações, em vez de concentrá-lo em uma. Em crédito, isso importa porque a perda, quando acontece, costuma vir de um tomador específico.',
      },
      { t: 'h2', v: 'Um exemplo ilustrativo' },
      {
        t: 'p',
        v: 'Imagine um credor com R$ 10.000 para aportar. Na primeira situação, ele coloca tudo em uma única operação. Se ela atrasar, todo o capital fica parado, e uma perda atinge o total. Na segunda, ele divide em dez operações de R$ 1.000. Se uma atrasar, nove continuam pagando, e a perda possível fica restrita a um décimo do capital.',
      },
      {
        t: 'destaque',
        v: 'Este exemplo é apenas ilustrativo, não é oferta nem promessa de resultado. Diversificar reduz o efeito de uma falha, mas não elimina o risco.',
      },
      { t: 'h2', v: 'Boas práticas' },
      {
        t: 'ul',
        v: [
          'Distribua entre faixas de risco, e não apenas na mais segura.',
          'Misture prazos diferentes, para as parcelas voltarem em momentos variados.',
          'Considere setores diferentes entre as empresas financiadas.',
          'Aporte apenas o que você poderia ter parado ou perdido sem comprometer o seu orçamento.',
        ],
      },
      {
        t: 'p',
        v: 'Para quem não é investidor qualificado, o limite por tomador na mesma SEP já empurra nessa direção: nenhuma operação sozinha pode concentrar tudo.',
      },
    ],
    emResumo: [
      'Dividir o capital em várias operações reduz o efeito de uma falha.',
      'Variar faixa de risco, prazo e setor ajuda.',
      'Diversificar não elimina o risco: aporte só o que puder deixar parado.',
    ],
    relacionados: [
      'quem-pode-financiar-numa-sep-e-o-limite-por-tomador',
      'classificacao-de-risco-a-a-e-como-ler',
    ],
  },
  {
    slug: 'como-preparar-a-empresa-para-pedir-capital-de-giro',
    titulo: 'Como preparar a empresa para pedir capital de giro numa SEP',
    resumo:
      'Documentos, organização financeira e um pedido bem justificado aceleram a análise. Veja o que ter em mãos.',
    categoria: 'Para empresas',
    publicadoEm: DATA,
    cena: 'documento',
    imagemAlt: 'Empresário organizando documentos e planilhas financeiras antes de pedir crédito',
    blocos: [
      {
        t: 'p',
        v: 'Capital de giro é o dinheiro que a empresa usa no dia a dia: pagar fornecedores, comprar estoque, cobrir o intervalo entre pagar e receber. Pedir bem começa antes do pedido.',
      },
      { t: 'h2', v: 'O que ter em mãos' },
      {
        t: 'ul',
        v: [
          'CNPJ ativo e regular, com os dados societários atualizados.',
          'Identificação do representante legal.',
          'Comprovação de faturamento dos últimos meses.',
          'Dados da conta bancária da empresa para recebimento.',
          'Clareza sobre a finalidade: para que serve o dinheiro e como ele volta.',
        ],
      },
      { t: 'h2', v: 'Calcule a parcela antes' },
      {
        t: 'p',
        v: 'A análise olha quanto da renda a parcela consome. Simule o pedido e confira se a parcela cabe com folga no faturamento. Pedir um valor menor, ou um prazo mais longo, pode melhorar a análise.',
      },
      { t: 'h2', v: 'Compartilhar dados com o Open Finance' },
      {
        t: 'p',
        v: 'Compartilhar, com o seu consentimento, dados de movimentação bancária pelo Open Finance ajuda a mostrar a capacidade de pagamento e pode tornar a análise mais completa.',
      },
      {
        t: 'destaque',
        v: 'Nenhuma etapa garante a seguinte: cadastro aprovado não é crédito aprovado. E nunca pague nada para liberar um empréstimo: isso é golpe.',
      },
    ],
    emResumo: [
      'Organize documentos e saiba a finalidade do dinheiro antes de pedir.',
      'Simule: a parcela precisa caber com folga no faturamento.',
      'O Open Finance, com o seu consentimento, pode enriquecer a análise.',
    ],
    relacionados: [
      'score-explicado-analise-de-credito-em-uma-sep',
      'custo-efetivo-total-como-comparar-uma-proposta',
    ],
  },
  {
    slug: 'custo-efetivo-total-como-comparar-uma-proposta',
    titulo: 'Custo Efetivo Total: como comparar uma proposta de crédito além da taxa de juros',
    resumo:
      'A taxa de juros é só uma parte do custo. O Custo Efetivo Total reúne juros, tarifas e encargos, e é o número certo para comparar.',
    categoria: 'Para empresas',
    publicadoEm: DATA,
    cena: 'documento',
    imagemAlt: 'Calculadora e contrato de crédito sobre uma mesa, com foco nos custos da operação',
    blocos: [
      {
        t: 'p',
        v: 'Duas propostas com a mesma taxa de juros podem custar valores diferentes. A diferença está nas tarifas e nos encargos que entram na conta.',
      },
      { t: 'h2', v: 'O que entra no Custo Efetivo Total' },
      {
        t: 'ul',
        v: [
          'Os juros da operação.',
          'As tarifas, como a de originação, cobrada pela plataforma.',
          'Impostos e encargos previstos no contrato.',
        ],
      },
      { t: 'h2', v: 'Um exemplo ilustrativo' },
      {
        t: 'p',
        v: 'Suponha um pedido de R$ 10.000 com tarifa de originação descontada do valor liberado. Se a tarifa for de 4%, a empresa contrata R$ 10.000, mas recebe R$ 9.600, e paga as parcelas sobre os R$ 10.000. O custo real é maior do que a taxa de juros sozinha sugere, porque a empresa paga juros sobre um valor que não chegou integralmente às suas mãos.',
      },
      {
        t: 'destaque',
        v: 'Os números acima são apenas ilustrativos. As condições reais aparecem na simulação, antes do envio do pedido.',
      },
      { t: 'h2', v: 'Como comparar' },
      {
        t: 'ol',
        v: [
          'Peça o Custo Efetivo Total de cada proposta.',
          'Compare o mesmo prazo e o mesmo valor liberado.',
          'Veja quanto a empresa realmente recebe e quanto paga no total.',
        ],
      },
    ],
    emResumo: [
      'A taxa de juros é uma parte do custo, não o custo todo.',
      'O Custo Efetivo Total inclui tarifas e encargos.',
      'Compare propostas pelo mesmo prazo e pelo valor efetivamente liberado.',
    ],
    relacionados: [
      'como-preparar-a-empresa-para-pedir-capital-de-giro',
      'pix-automatico-nas-parcelas-o-que-muda',
    ],
  },
  {
    slug: 'pix-automatico-nas-parcelas-o-que-muda',
    titulo: 'Pix Automático nas parcelas: o que muda para quem paga e para quem financia',
    resumo:
      'O tomador autoriza uma vez, no próprio banco, e cada parcela é debitada no vencimento. Veja os cuidados e os benefícios.',
    categoria: 'SEP na prática',
    publicadoEm: DATA,
    cena: 'pix',
    imagemAlt: 'Pessoa autorizando o débito automático de parcelas pelo celular',
    blocos: [
      {
        t: 'p',
        v: 'O Pix Automático é uma forma de pagamento recorrente: o pagador autoriza, uma única vez, a cobrança de valores de um recebedor, e cada cobrança é debitada na data combinada. É diferente do Pix agendado, que é um pagamento único marcado por quem paga.',
      },
      { t: 'h2', v: 'Como funciona em uma SEP' },
      {
        t: 'ol',
        v: [
          'A empresa que tomou o crédito escolhe habilitar o Pix Automático para o contrato.',
          'Ela registra os dados de pagamento e autoriza a recorrência no aplicativo do próprio banco.',
          'Antes de cada vencimento, é avisada da cobrança.',
          'No vencimento, a parcela é debitada e baixada no contrato.',
        ],
      },
      { t: 'h2', v: 'Benefícios' },
      {
        t: 'ul',
        v: [
          'Para quem paga: menos esquecimento e menos risco de atraso, e mais pontos no score da análise de crédito, porque o pagamento fica previsível.',
          'Para quem financia: parcelas mais previsíveis e, em tese, menos inadimplência por descuido.',
          'Para a plataforma: um fluxo de caixa previsto mais confiável.',
        ],
      },
      { t: 'h2', v: 'Cuidados' },
      {
        t: 'p',
        v: 'A autorização é sempre do pagador, no banco dele, e pode ser cancelada. Se não houver saldo no vencimento, a cobrança falha, e a parcela segue o fluxo normal de cobrança. O Dynamis SEP nunca solicita senha, token ou saldo do pagador.',
      },
    ],
    emResumo: [
      'O Pix Automático é recorrente e autorizado pelo pagador no próprio banco.',
      'Reduz atrasos por descuido, mas não elimina a inadimplência.',
      'A autorização pode ser cancelada pelo pagador a qualquer momento.',
    ],
    relacionados: [
      'custo-efetivo-total-como-comparar-uma-proposta',
      'inadimplencia-o-que-e-e-como-a-sep-cobra',
    ],
  },
  {
    slug: 'inadimplencia-o-que-e-e-como-a-sep-cobra',
    titulo: 'Inadimplência numa SEP: o que é, como é cobrada e por que é divulgada',
    resumo:
      'Atrasos acontecem. O que importa é como são medidos, cobrados e informados a quem financia a operação.',
    categoria: 'Para investidores',
    publicadoEm: DATA,
    cena: 'grafico',
    imagemAlt:
      'Equipe acompanhando em um painel as parcelas pagas e em atraso de uma carteira de crédito',
    blocos: [
      {
        t: 'p',
        v: 'Inadimplência é a falta de pagamento de uma parcela no vencimento. Numa SEP, ela atinge diretamente quem financia a operação, e por isso é tratada com transparência.',
      },
      { t: 'h2', v: 'O caminho de uma parcela em atraso' },
      {
        t: 'ol',
        v: [
          'A parcela vence sem pagamento e passa a ser marcada em atraso.',
          'A plataforma notifica o tomador e tenta a cobrança pelos canais previstos.',
          'O tomador pode procurar uma renegociação, que precisa ser aceita pelas partes.',
          'Persistindo o atraso, a cobrança segue as medidas previstas no contrato e na lei.',
        ],
      },
      { t: 'h2', v: 'O que o credor vê' },
      {
        t: 'p',
        v: 'No painel do credor, cada parcela mostra se está paga, a vencer ou em atraso, e há o histórico das ações de cobrança. Nada fica escondido.',
      },
      { t: 'h2', v: 'Por que a SEP divulga a inadimplência' },
      {
        t: 'p',
        v: 'A divulgação mensal, por faixa de risco, existe para o credor decidir com informação. Ela mostra o desempenho real das operações, e não só a expectativa.',
      },
      {
        t: 'destaque',
        v: 'A cobrança é responsabilidade da plataforma, mas o risco de a parcela não ser recuperada é do credor.',
      },
    ],
    emResumo: [
      'Parcelas em atraso entram em cobrança e podem ser renegociadas.',
      'O credor acompanha cada parcela no painel.',
      'A inadimplência por faixa é divulgada mensalmente.',
    ],
    relacionados: [
      'classificacao-de-risco-a-a-e-como-ler',
      'pix-automatico-nas-parcelas-o-que-muda',
    ],
  },
  {
    slug: 'kyc-kyb-e-pld-por-que-pedimos-tantos-dados',
    titulo: 'KYC, KYB e PLD: por que o cadastro numa SEP pede tantos dados',
    resumo:
      'As verificações de identidade e de origem do dinheiro protegem todos os participantes. Entenda cada sigla.',
    categoria: 'Segurança',
    publicadoEm: DATA,
    cena: 'escudo',
    imagemAlt: 'Pessoa fazendo a verificação de identidade com documento e foto no celular',
    blocos: [
      {
        t: 'p',
        v: 'Quem já abriu uma conta financeira estranhou a quantidade de documentos pedidos. Numa SEP, essas verificações não são burocracia: são exigência de segurança e de lei.',
      },
      { t: 'h2', v: 'As siglas' },
      {
        t: 'ul',
        v: [
          'KYC (conheça seu cliente): confirma quem é a pessoa física, com documento e validação.',
          'KYB (conheça sua empresa): confirma a empresa, os sócios e quem tem poder para assinar.',
          'PLD (prevenção à lavagem de dinheiro): verifica a origem e o destino dos recursos e busca sinais de fraude.',
        ],
      },
      { t: 'h2', v: 'Por que valem para todos' },
      {
        t: 'p',
        v: 'Valem para quem toma e para quem financia. Garantem que as pessoas e empresas são quem dizem ser e que o dinheiro das operações não vem de atividade ilícita. Isso protege o credor, o tomador e a própria plataforma.',
      },
      { t: 'h2', v: 'O que acontece com os seus dados' },
      {
        t: 'p',
        v: 'Os dados são usados para a operação e para cumprir as obrigações legais. Seguem a Lei Geral de Proteção de Dados: você pode pedir acesso, correção e outras providências, pelo canal oficial de contato.',
      },
      {
        t: 'destaque',
        v: 'O Dynamis SEP nunca pede sua senha, o código do autenticador ou dados de cartão por telefone, e-mail ou mensagem.',
      },
    ],
    emResumo: [
      'KYC, KYB e PLD confirmam quem é quem e a origem do dinheiro.',
      'Valem para quem toma e para quem financia.',
      'Os dados seguem a LGPD, e você tem direitos sobre eles.',
    ],
    relacionados: [
      'golpe-do-emprestimo-com-pagamento-antecipado',
      'quem-pode-financiar-numa-sep-e-o-limite-por-tomador',
    ],
  },
  {
    slug: 'golpe-do-emprestimo-com-pagamento-antecipado',
    titulo: 'Golpe do empréstimo com pagamento antecipado: como reconhecer e se proteger',
    resumo:
      'Pedir dinheiro antes de liberar o crédito é o sinal mais claro de golpe. Veja como reconhecer e o que fazer.',
    categoria: 'Segurança',
    publicadoEm: DATA,
    cena: 'alerta',
    imagemAlt: 'Pessoa desconfiada ao receber uma ligação suspeita oferecendo empréstimo',
    blocos: [
      {
        t: 'p',
        v: 'Alguém liga oferecendo um empréstimo com juros baixos, aprova tudo rápido e, no fim, pede um depósito "para liberar o valor". É o golpe mais comum do crédito, e funciona porque a pessoa está com pressa.',
      },
      { t: 'h2', v: 'Como reconhecer' },
      {
        t: 'ul',
        v: [
          'Pede pagamento, taxa ou depósito antes de liberar o dinheiro.',
          'Chega por telefone, mensagem ou rede social, sem que você tenha pedido.',
          'Usa pressa: "só hoje", "última vaga".',
          'Manda boleto em nome de pessoa física ou de favorecido diferente da instituição.',
        ],
      },
      { t: 'h2', v: 'O que o Dynamis SEP faz e não faz' },
      {
        t: 'p',
        v: 'O Dynamis SEP nunca pede pagamento antecipado, nunca liga oferecendo empréstimo e nunca solicita senha, código do autenticador ou dados de cartão. As parcelas podem ser pagas pelo próprio sistema, que mostra o que é devido.',
      },
      { t: 'h2', v: 'Se acontecer com você' },
      {
        t: 'ol',
        v: [
          'Não pague e anote o número e o nome do contato.',
          'Guarde as mensagens e capturas de tela.',
          'Avise a instituição pelo canal oficial.',
          'Se já pagou, registre boletim de ocorrência e acione o seu banco.',
        ],
      },
    ],
    emResumo: [
      'Pagamento antes do crédito é golpe.',
      'Use sempre o canal oficial.',
      'Guarde as provas e avise a instituição.',
    ],
    relacionados: ['kyc-kyb-e-pld-por-que-pedimos-tantos-dados', 'lgpd-e-credito-seus-direitos'],
  },
  {
    slug: 'lgpd-e-credito-seus-direitos',
    titulo: 'LGPD e crédito: o que a plataforma pode fazer com os seus dados',
    resumo:
      'Analisar crédito exige dados pessoais e consulta a bureaus. A Lei Geral de Proteção de Dados define o que pode e o que você pode pedir.',
    categoria: 'Segurança',
    publicadoEm: DATA,
    cena: 'documento',
    imagemAlt: 'Pessoa lendo as configurações de privacidade e consentimento no computador',
    blocos: [
      {
        t: 'p',
        v: 'Uma análise de crédito usa dados pessoais e, muitas vezes, consulta a bureaus como Serasa e SPC. A Lei Geral de Proteção de Dados (LGPD) diz em que condições isso pode acontecer.',
      },
      { t: 'h2', v: 'Quando a consulta é permitida' },
      {
        t: 'ul',
        v: [
          'Com o seu consentimento, registrado antes da consulta.',
          'Por finalidade clara: a análise de crédito da operação que você pediu.',
          'Com o mínimo de dados necessários, e sem uso para outros fins.',
        ],
      },
      { t: 'h2', v: 'O que você pode pedir' },
      {
        t: 'ul',
        v: [
          'Confirmar que os seus dados são tratados e ter acesso a eles.',
          'Corrigir dados incompletos ou desatualizados.',
          'Pedir esclarecimento sobre decisões tomadas de forma automatizada, e solicitar a revisão por uma pessoa.',
          'Revogar o consentimento, quando ele for a base do tratamento.',
        ],
      },
      { t: 'h2', v: 'A decisão não é só da máquina' },
      {
        t: 'p',
        v: 'No Dynamis SEP, o score é sugestão: a decisão final é de uma pessoa, e o resultado pode ser explicado fator a fator. Se você discordar, pode pedir a revisão pelo canal oficial.',
      },
      {
        t: 'destaque',
        v: 'Os dados cadastrais servem à operação e às obrigações legais. Eles não são vendidos a terceiros.',
      },
    ],
    emResumo: [
      'A consulta a bureaus exige consentimento e finalidade clara.',
      'Você pode acessar, corrigir e pedir a revisão de decisões automatizadas.',
      'No Dynamis SEP, a decisão final é de uma pessoa.',
    ],
    relacionados: [
      'score-explicado-analise-de-credito-em-uma-sep',
      'kyc-kyb-e-pld-por-que-pedimos-tantos-dados',
    ],
  },
];

export const CATEGORIAS: CategoriaBlog[] = [
  'SEP na prática',
  'Para empresas',
  'Para investidores',
  'Segurança',
];

export function postPorSlug(slug: string): PostBlog | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Minutos de leitura, a 200 palavras por minuto, a partir do próprio texto do post. */
export function minutosDeLeitura(post: PostBlog): number {
  const texto = [
    post.titulo,
    post.resumo,
    ...post.blocos.flatMap((b) => (Array.isArray(b.v) ? b.v : [b.v])),
    ...post.emResumo,
  ].join(' ');
  return Math.max(1, Math.ceil(texto.split(/\s+/).length / 200));
}

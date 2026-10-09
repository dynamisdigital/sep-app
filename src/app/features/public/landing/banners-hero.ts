import type { CenaIlustracao } from '../shared/sep-ilustracao.component';

// Banners rotativos da página inicial. Os três falam do Dynamis SEP, cada um para um lado do negócio: a
// plataforma, o investidor (credor) e a empresa que busca capital de giro. Toda publicidade de investimento
// leva o aviso de risco no próprio banner, e nenhum fala de rendimento: o que se anuncia é a transparência
// da análise, e não o ganho. A imagem do lado é uma foto de pessoas no trabalho, quando aprovada, ou a
// ilustração da cena enquanto a foto não existe (ver `FOTOS_DOS_BANNERS`).

export interface ItemBanner {
  icon: string;
  title: string;
  description: string;
}

export interface BannerHero {
  id: string;
  kicker: string;
  /** O título é montado em três partes para o trecho do meio ganhar a cor de destaque. */
  titulo: { antes: string; destaque: string; depois: string };
  lead: string;
  acoes: { rotulo: string; rota: string; primaria: boolean }[];
  selos: ItemBanner[];
  /** Aviso curto sob os selos. */
  aviso: string;
  midia: {
    cena: CenaIlustracao;
    /** O que a imagem mostra, para leitor de tela. */
    descricao: string;
  };
}

export const BANNERS_HERO: BannerHero[] = [
  {
    id: 'plataforma',
    kicker: 'Dynamis SEP · Sociedade de Empréstimo entre Pessoas',
    titulo: {
      antes: 'Capital de giro para empresas. ',
      destaque: 'Crédito com regra',
      depois: ' para quem financia.',
    },
    lead: 'O Dynamis SEP é uma sociedade de empréstimo entre pessoas: reunimos empresas que buscam capital de giro e investidores dispostos a financiá-las, com a análise de risco explicada, o dinheiro em conta segregada e cada passo registrado.',
    acoes: [
      { rotulo: 'Criar conta', rota: '/register', primaria: true },
      { rotulo: 'Entrar na plataforma', rota: '/login', primaria: false },
    ],
    selos: [
      { icon: 'landmark', title: 'Regulado pela', description: 'Banco Central e CMN' },
      { icon: 'split', title: 'Segregação', description: 'Patrimonial escrow' },
      { icon: 'shield-alert', title: 'KYC e PLD', description: 'Prevenção' },
    ],
    aviso: 'Esta plataforma não oferece rendimento garantido nem aprovação automática de crédito.',
    midia: {
      cena: 'rede',
      descricao: 'Empreendedores e investidores conectados pela plataforma Dynamis SEP',
    },
  },
  {
    id: 'investidores',
    kicker: 'Dynamis SEP · Para investidores',
    titulo: {
      antes: 'Financie empresas e veja o ',
      destaque: 'risco antes',
      depois: ' de aportar.',
    },
    lead: 'Você escolhe as operações de capital de giro, vê a faixa de risco de A a E com cada fator do score explicado e acompanha as parcelas, com o dinheiro em conta segregada.',
    acoes: [
      { rotulo: 'Quero investir', rota: '/investidores', primaria: true },
      { rotulo: 'Como funciona', rota: '/como-funciona', primaria: false },
    ],
    selos: [
      { icon: 'gauge', title: 'Score explicado', description: 'Seis fatores' },
      { icon: 'chart-column', title: 'Risco de A a E', description: 'Em cada operação' },
      { icon: 'landmark', title: 'Conta segregada', description: 'Dinheiro separado' },
    ],
    aviso:
      'Investir em crédito envolve risco, inclusive de perda do capital. Não há garantia de retorno nem cobertura do FGC.',
    midia: {
      cena: 'grafico',
      descricao: 'Investidora analisando a classificação de risco de uma operação no notebook',
    },
  },
  {
    id: 'empresas',
    kicker: 'Dynamis SEP · Para empresas',
    titulo: {
      antes: 'Capital de giro com parcelas no ',
      destaque: 'Pix Automático',
      depois: '.',
    },
    lead: 'Peça crédito para a sua empresa com valor, prazo e custo à vista antes de enviar. Se quiser, autorize o débito automático das parcelas: além de reduzir o risco de esquecer um vencimento, ele melhora o seu score na análise de crédito.',
    acoes: [
      { rotulo: 'Pedir capital de giro', rota: '/register', primaria: true },
      { rotulo: 'Ver condições', rota: '/credito-pj', primaria: false },
    ],
    selos: [
      { icon: 'calendar-clock', title: 'Débito automático', description: 'Autorizado por você' },
      { icon: 'gauge', title: 'Melhora o score', description: 'Na análise de crédito' },
      { icon: 'shield-alert', title: 'Sem taxa antecipada', description: 'Nunca pedimos' },
    ],
    aviso:
      'Crédito sujeito a análise e aprovação. Um score melhor não garante aprovação, taxa mínima nem prazo de resposta.',
    midia: {
      cena: 'pix',
      descricao: 'Dono de uma padaria de bairro conferindo as parcelas do crédito no celular',
    },
  },
  {
    id: 'pessoas-fisicas',
    kicker: 'Dynamis SEP · Para pessoas físicas',
    titulo: {
      antes: 'Pessoa física também pode ',
      destaque: 'pedir crédito',
      depois: ' no Dynamis SEP.',
    },
    lead: 'Peça um empréstimo em seu nome, com valor, prazo, parcela e custo à vista antes de enviar, e acompanhe cada parcela pela sua conta. O cadastro é verificado, e nunca pedimos pagamento antecipado.',
    acoes: [
      { rotulo: 'Pedir empréstimo', rota: '/register', primaria: true },
      { rotulo: 'Como funciona', rota: '/como-funciona', primaria: false },
    ],
    selos: [
      { icon: 'user-round', title: 'Pessoa física', description: 'Cadastro verificado' },
      { icon: 'banknote', title: 'Custo à vista', description: 'Antes do envio' },
      { icon: 'calendar-clock', title: 'Parcelas claras', description: 'Pela sua conta' },
    ],
    aviso:
      'Crédito sujeito a análise e aprovação. Não prometemos aprovação, taxa mínima nem prazo de resposta. O valor máximo por operação segue o regimento.',
    midia: {
      cena: 'pessoas',
      descricao:
        'Trabalhadora autônoma planejando o pagamento das parcelas do empréstimo no celular',
    },
  },
];

/**
 * Fotos aprovadas dos banners. O arquivo fica em `image/banners/<id>.jpg` (servido em `/image/banners/`).
 * Um banner só passa a mostrar a foto depois de o id entrar nesta lista; até lá usa a ilustração da cena,
 * e o site não faz pedido de arquivo que não existe. Pedidos de imagem: `docs/proposta-site/IMAGENS_DO_SITE.md`.
 * Foto gerada por IA com pessoas deve ir com o rótulo "imagem ilustrativa" (o componente o mostra).
 */
export const FOTOS_DOS_BANNERS: ReadonlySet<string> = new Set<string>([
  'plataforma',
  'investidores',
  'empresas',
  'pessoas-fisicas',
]);

export function fotoDoBanner(id: string): string | null {
  return FOTOS_DOS_BANNERS.has(id) ? `/image/banners/${id}.jpg` : null;
}

/** Tempo que cada banner fica na tela antes de o próximo entrar. */
export const INTERVALO_BANNER_MS = 15_000;
/** Tempo até o banner que saiu deixar a tela (a saída dura 1,1 s; o que entra espera 0,6 s e chega devagar). */
export const DURACAO_TROCA_MS = 1200;

/** Próximo banner do ciclo: depois do último, volta ao primeiro. O ciclo nunca termina. */
export function proximoBanner(atual: number, total: number): number {
  return (atual + 1) % total;
}

export function bannerAnterior(atual: number, total: number): number {
  return (atual - 1 + total) % total;
}

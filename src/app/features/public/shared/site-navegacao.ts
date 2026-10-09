// Navegação do site institucional do Dynamis SEP. Um só lugar para o cabeçalho e o rodapé da página
// inicial e o das demais páginas, para os dois nunca mais divergirem.

export interface SiteNavItem {
  label: string;
  route: string;
}

/** Menu do cabeçalho. Todas as rotas existem; nenhuma é âncora. */
export const NAV_SITE: SiteNavItem[] = [
  { label: 'Empresas', route: '/credito-pj' },
  { label: 'Investidores', route: '/investidores' },
  { label: 'Como funciona', route: '/como-funciona' },
  { label: 'Segurança', route: '/seguranca' },
  { label: 'Transparência', route: '/transparencia' },
  { label: 'Blog', route: '/blog' },
  { label: 'Sobre', route: '/sobre-o-sep' },
  { label: 'Contato', route: '/contato' },
];

/** Links do rodapé: o que o visitante procura antes de confiar numa plataforma de crédito. */
export const NAV_RODAPE: SiteNavItem[] = [
  { label: 'Sobre o Dynamis SEP', route: '/sobre-o-sep' },
  { label: 'Perguntas frequentes', route: '/perguntas-frequentes' },
  { label: 'Antifraude', route: '/antifraude' },
  { label: 'Transparência', route: '/transparencia' },
  { label: 'Blog', route: '/blog' },
  { label: 'Segurança', route: '/seguranca' },
  { label: 'Política de privacidade', route: '/politica-de-privacidade' },
  { label: 'Termos de uso', route: '/termos-de-uso' },
  { label: 'Contato', route: '/contato' },
];

/** Entrada do credor (investidor) no topo do site. Leva ao login; o perfil vem da conta. */
export const AREA_DO_INVESTIDOR = { label: 'Área do investidor', route: '/login' } as const;

/** Texto do rodapé regulatório, igual em todas as páginas. */
export const AVISO_REGULATORIO =
  'O Dynamis SEP é uma sociedade de empréstimo entre pessoas (SEP) e não é banco. Não garantimos o pagamento das operações nem oferecemos rendimento garantido ou aprovação automática de crédito, e o investimento em crédito não conta com a cobertura do FGC. Investir em crédito envolve risco, inclusive de perda do capital.';

/** Faixa fixa do topo: o golpe do pagamento antecipado é o maior risco de reputação do setor. */
export const AVISO_ANTIFRAUDE =
  'O Dynamis SEP nunca pede pagamento antecipado para liberar crédito e não liga pedindo depósito.';

// Tipos de conteúdo das páginas institucionais. Os textos vivem no componente de cada página;
// aqui ficam só as formas, para as sete páginas montarem os mesmos blocos.

export interface SiteCartao {
  titulo: string;
  descricao: string;
  icone: string;
  tom?: 'green' | 'blue' | 'purple' | 'amber';
}

export interface SiteEtapa extends SiteCartao {
  /** Rótulo do passo, ex.: "01". */
  passo: string;
}

export interface SiteLinha {
  rotulo: string;
  valor: string;
  /** De onde o número vem, quando não é institucional. */
  origem?: string;
}

/**
 * Teto de empréstimo do regimento do SEP. Os parâmetros `credito.valor.maximo.pf` e
 * `credito.valor.maximo.pj` valem exatamente isto, e nenhuma página pode anunciar outro número.
 */
export const TETO_EMPRESTIMO = 'R$ 15.000,00';

/** Dados institucionais, os mesmos do rodapé e da página de contato. */
export const CONTATO_SEP = {
  email: 'contato@dynamisbank.com',
  telefone: '(81) 0000-0000',
  telefoneLink: '+558100000000',
  endereco: 'R. Dr. Gonçalves Guerra, 276 — Cajá, Carpina — PE',
  cep: 'CEP 55.810-000',
  cnpj: '12.345.678/0001-99',
  atendimento: 'Segunda a sexta, das 9h às 18h (horário de Brasília)',
} as const;

/** Consulta de mapa por endereço: não depende de chave de API nem de token pré-gerado. */
export const MAPA_EMBED =
  'https://www.google.com/maps?q=R.+Dr.+Gon%C3%A7alves+Guerra,+276+-+Caj%C3%A1,+Carpina+-+PE,+55810-000&output=embed';

export const MAPA_LINK =
  'https://www.google.com/maps/search/?api=1&query=R.+Dr.+Gon%C3%A7alves+Guerra%2C+276+-+Caj%C3%A1%2C+Carpina+-+PE%2C+55810-000';

/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

/** Responsabilidade técnica sobre uma camada do sistema. */
export interface ResponsavelTecnico {
  nome: string;
  papel: string;
  camada: string;
}

/**
 * Identidade técnica do frontend do SEP.
 *
 * Existe para ser consumida: a versão exibida no rodapé do shell e os créditos do painel de Ajuda
 * saem daqui, em vez de ficarem repetidos como literal em cada template. As tecnologias listadas
 * são apenas as efetivamente presentes no `package.json` deste repositório — o ADR 0003 do produto
 * também cita Ionic e Capacitor, mas nenhum dos dois está instalado aqui.
 *
 * Registra **autoria técnica e responsabilidade pelo desenvolvimento**, e não titularidade
 * jurídica sobre o código.
 */
export const PROJECT_INFO = {
  sistema: 'SEP',
  descricao: 'Sociedade de Empréstimo entre Pessoas',
  camada: 'Frontend',
  versao: '0.6.1',
  ano: 2026,
  tecnologias: ['Angular', 'TypeScript', 'SCSS'],
} as const;

/**
 * Divisão de responsabilidades do projeto. O backend e a infraestrutura vivem em repositório
 * próprio; ficam registrados aqui porque o painel de Ajuda apresenta as duas frentes ao operador.
 */
export const RESPONSAVEIS_TECNICOS: readonly ResponsavelTecnico[] = [
  {
    nome: 'Daniel Möllmann',
    papel: 'Desenvolvedor Frontend',
    camada: 'Frontend',
  },
  {
    nome: 'Maurício Chaves',
    papel: 'Backend & Infrastructure',
    camada: 'Backend e infraestrutura',
  },
] as const;

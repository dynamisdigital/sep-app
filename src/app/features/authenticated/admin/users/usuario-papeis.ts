import { UsuarioRole } from '../../../../core/api/api.models';

// Definicoes de papel compartilhadas pelo detalhe e pelo cadastro de usuario. A precedencia (role
// principal) e resolvida pelo backend; a UI so apresenta o conjunto, sem recalcular.

/** Roles atribuiveis, na ordem em que aparecem nos chips. */
export const ROLES_DISPONIVEIS: readonly UsuarioRole[] = [
  'ADMIN',
  'FINANCEIRO',
  'BACKOFFICE',
  'CLIENTE',
  'CORRESPONDENTE',
];

export function selecaoVaziaInicial(): Record<UsuarioRole, boolean> {
  return {
    ADMIN: false,
    FINANCEIRO: false,
    BACKOFFICE: false,
    CLIENTE: false,
    CORRESPONDENTE: false,
  };
}

// Leitura do que cada papel habilita. Nao vem de catalogo — o backend nao expoe permissoes — e
// serve para explicar o alcance do papel em palavras, nao para decidir acesso.
export const PERMISSOES_POR_PAPEL: Record<UsuarioRole, string[]> = {
  ADMIN: ['Gestão de usuários e perfis', 'Acesso ao backoffice', 'Relatórios e auditoria'],
  FINANCEIRO: ['Agenda financeira e inadimplência', 'Operações Pix', 'Fila do backoffice'],
  BACKOFFICE: [
    'Fila operacional e reprocessos',
    'Consulta de operações Pix',
    'Trilha de auditoria',
  ],
  CLIENTE: ['Jornadas próprias de crédito', 'Área da credora', 'Dados da própria conta'],
  CORRESPONDENTE: [
    'Base própria de clientes',
    'Envio de documentos com atesto de conferência',
    'Acompanhamento da validade do cadastro',
  ],
};

export const VETOR_POR_PAPEL: Record<
  UsuarioRole,
  { rotulo: string; descricao: string; tom: string }
> = {
  ADMIN: {
    rotulo: 'Administrador do sistema',
    descricao: 'Acesso total às funcionalidades conforme política de segurança.',
    tom: 'green',
  },
  FINANCEIRO: {
    rotulo: 'Operação financeira',
    descricao: 'Acesso às jornadas de cobrança e aos fluxos de pagamento.',
    tom: 'purple',
  },
  BACKOFFICE: {
    rotulo: 'Operação assistida',
    descricao: 'Acesso à fila operacional e aos reprocessos, sem alterar governança.',
    tom: 'amber',
  },
  CLIENTE: {
    rotulo: 'Acesso do cliente',
    descricao: 'Acesso restrito às próprias jornadas e aos dados da própria conta.',
    tom: 'blue',
  },
  CORRESPONDENTE: {
    rotulo: 'Correspondente',
    descricao: 'Capta clientes e envia documentos; não analisa, aprova nem libera crédito.',
    tom: 'cyan',
  },
};

export const TOM_POR_PAPEL: Record<UsuarioRole, string> = {
  ADMIN: 'blue',
  CLIENTE: 'green',
  FINANCEIRO: 'purple',
  BACKOFFICE: 'amber',
  CORRESPONDENTE: 'cyan',
};

// Intencao de alteracao guardada antes do step-up: sem isso o usuario autoriza a operacao, volta
// para a tela e descobre que precisa refazer a selecao e salvar de novo. O cadastro tambem grava
// aqui: a conta nasce CLIENTE e o detalhe aplica os papeis escolhidos assim que abre.
export const CHAVE_ROLES_PENDENTES = 'SEP_ROLES_PENDENTES';

export interface RolesPendentes {
  usuarioId: string;
  roles: UsuarioRole[];
}

export function lerRolesPendentes(): RolesPendentes | null {
  const bruto = window.sessionStorage.getItem(CHAVE_ROLES_PENDENTES);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as RolesPendentes;
  } catch {
    return null;
  }
}

export function gravarRolesPendentes(pendentes: RolesPendentes): void {
  window.sessionStorage.setItem(CHAVE_ROLES_PENDENTES, JSON.stringify(pendentes));
}

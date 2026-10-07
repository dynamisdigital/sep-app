import { http, HttpResponse } from 'msw';

import { gerarCronograma, parcelaPrice } from '../app/core/financeiro/calculo-financeiro';
import {
  TAXA_MENSAL_PADRAO,
  TARIFA_ORIGINACAO_PCT,
  textoTaxaMensal,
} from '../app/core/financeiro/politica-credito';
import { criarHandlersCorrespondentes } from './correspondentes.handlers';
import { criarHandlersRede } from './correspondentes-rede.handlers';
import type { AgendaPagamentoResponse } from '../app/core/api/api.models';
import { semearPix } from './data/pix-automatico.store';
import { criarHandlersPixAutomatico } from './pix-automatico.handlers';
import { criarHandlersGestao } from './correspondentes-gestao.handlers';
import { qrDataUrl } from './qr';
import { codigoTotpValido } from './totp';

import {
  buildOperationalDashboardSnapshot,
  operationalDashboardStore,
} from './data/operational-dashboard.store';

const baseUrl = 'http://localhost:8080/api/v1';
const now = '2026-04-24T18:30:00-03:00';

const adminUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001',
  username: 'admin@empresa.com',
  role: 'ADMIN',
  // MFA ativo + sem redefinicao pendente: pre-condicao de step-up no dev-offline. As telas
  // sensiveis so redirecionam para /app/step-up quando currentUser().mfaHabilitado e true.
  precisaRedefinirSenha: false,
  mfaHabilitado: true,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

// Usuario ficticio de desenvolvimento: papel ADMIN (alcanca todas as telas), sem MFA e sem
// redefinicao pendente, para o login do dev-offline entrar direto. Some junto com o mock
// quando o sistema for fechado.
const devUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b7710de',
  username: 'dev@sep.local',
  role: 'ADMIN',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const clienteUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771002',
  username: 'cliente@empresa.com',
  role: 'CLIENTE',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const financeiroUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003',
  username: 'financeiro@empresa.com',
  role: 'FINANCEIRO',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const backofficeUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771004',
  username: 'backoffice@empresa.com',
  role: 'BACKOFFICE',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

let perfilOperacionalFake = {
  statusConta: 'ATIVA',
  contaVerificada: true,
  nivelAcesso: 'Administrador',
  ultimoAcesso: '2026-07-17T11:52:31-03:00',
  ultimaAutenticacao: '2026-07-17T11:52:31-03:00',
  tentativasLogin24h: 0,
  dispositivosAutorizados: 3,
  sessoesAtivas: 3,
  senhaForte: true,
  auditoriaAtiva: true,
  armazenamentoSincronizado: true,
  preferencias: {
    idioma: 'Português (Brasil)',
    fusoHorario: '(UTC-03:00) Brasília',
    tema: 'ESCURO',
    notificacoesAtivas: true,
    canalComunicacao: 'E-mail corporativo',
  },
  atualizadoEm: now,
};

// Usuario multi-role (FINANCEIRO + BACKOFFICE) para exercitar a gestao de roles cumulativas
// da governanca (F-Sprint 12). role aqui e a principal denormalizada (FINANCEIRO > BACKOFFICE).
const multiroleUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771005',
  username: 'multirole@empresa.com',
  role: 'FINANCEIRO',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

// Personas da jornada credora (F-Sprint 11): a credora e um usuario CLIENTE — nao existe role
// CREDORA. O gating real e por presenca de credora + elegibilidade no backend, nao por role.
const credoraUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771006',
  username: 'credora@empresa.com',
  role: 'CLIENTE',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const credoraInelegivelUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771007',
  username: 'credora-inelegivel@empresa.com',
  role: 'CLIENTE',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const credoraNovoUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771008',
  username: 'credora-novo@empresa.com',
  role: 'CLIENTE',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

// Personas do modulo de Correspondentes. Ficam fora de `usuariosFake` de proposito: sao contas de
// demonstracao do modulo e nao entram na contagem da governanca de usuarios.
const correspondenteUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771021',
  username: 'correspondente@empresa.com',
  role: 'CORRESPONDENTE',
  precisaRedefinirSenha: false,
  mfaHabilitado: false,
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const correspondenteVencidoUsuario = {
  ...correspondenteUsuario,
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771022',
  username: 'correspondente-vencido@empresa.com',
};

const subCorrespondenteUsuario = {
  ...correspondenteUsuario,
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771023',
  username: 'sub-correspondente@empresa.com',
};

const usuariosFake = [
  devUsuario,
  adminUsuario,
  clienteUsuario,
  financeiroUsuario,
  backofficeUsuario,
  multiroleUsuario,
];

// Credenciais aceitas no dev-offline (senha unica 123456). Permite exercitar as jornadas
// de cobranca (FINANCEIRO) e de backoffice (BACKOFFICE), nao so ADMIN. currentMockUser
// segue o ultimo login pra /auth/me e /auth/refresh refletirem a role correta apos reload.
// Senha vigente de cada conta do dev-offline. Comeca na senha unica e passa a refletir a troca
// feita em `/app/profile/change-password`: sem isso o operador trocava a senha, saia, e so
// conseguia voltar com a senha antiga — o oposto do que a tela acabara de dizer.
const SENHA_PADRAO_DEV = '123456';
const senhasPorUsuario: Record<string, string> = {};

function senhaDe(username: string): string {
  return senhasPorUsuario[username] ?? SENHA_PADRAO_DEV;
}

/** Devolve todas as contas a senha unica. Testes que trocam senha precisam chamar no beforeEach. */
export function resetSenhasDev(): void {
  for (const chave of Object.keys(senhasPorUsuario)) {
    delete senhasPorUsuario[chave];
  }
}

const loginUsuarios: Record<string, typeof adminUsuario> = {
  'dev@sep.local': devUsuario,
  'admin@empresa.com': adminUsuario,
  'financeiro@empresa.com': financeiroUsuario,
  'backoffice@empresa.com': backofficeUsuario,
  // Contas que o menu "Trocar de usuario" oferece: sem entrar aqui, o clique falhava em silencio.
  'cliente@empresa.com': clienteUsuario,
  'multirole@empresa.com': multiroleUsuario,
  'credora@empresa.com': credoraUsuario,
  'credora-inelegivel@empresa.com': credoraInelegivelUsuario,
  'credora-novo@empresa.com': credoraNovoUsuario,
  'correspondente@empresa.com': correspondenteUsuario,
  'correspondente-vencido@empresa.com': correspondenteVencidoUsuario,
  'sub-correspondente@empresa.com': subCorrespondenteUsuario,
};
let currentMockUser = adminUsuario;
// Contas criadas por POST /usuarios nesta sessao do mock; o reset da governanca as remove.
let usuariosCriados = 0;
const QTD_USUARIOS_SEED = usuariosFake.length;

function errorResponse(status: number, error: string, message: string, path: string) {
  return HttpResponse.json(
    {
      timestamp: now,
      status,
      error,
      message,
      path,
    },
    { status },
  );
}

// --- Onboarding KYC PF / KYB PJ (F-Sprint 6) ---
// Identificadores deterministicos para o smoke/dev-offline e os testes:
// - CPF/CNPJ "sentinela" 999... simula solicitacao ativa (409).
// - id "...ff03" simula recurso de outro dono (403 ownership).
const PESSOA_ID = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01';
const EMPRESA_ID = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f02';
const ID_SEM_OWNERSHIP = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const CPF_COM_ONBOARDING_ATIVO = '99999999999';
const CNPJ_COM_ONBOARDING_ATIVO = '99999999999999';
const TIPOS_DOCUMENTO_PF = ['RG', 'CNH', 'PASSAPORTE', 'SELFIE', 'COMPROVANTE_ENDERECO'];
const TIPOS_DOCUMENTO_PJ = ['CONTRATO_SOCIAL', 'CCMEI', 'COMPROVANTE_ENDERECO'];

function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

const representantesFake = [
  {
    id: '4f0799c0-98b9-6d9d-bc4a-7d6f5b771c01',
    nome: 'Joao da Silva',
    cpfMascarado: '529****4725',
    cargo: 'Administrador',
    pld: { statusPld: 'LIMPO', dataConsulta: now },
  },
];

const onboardingHandlers = [
  http.post(`${baseUrl}/onboarding/pessoa`, async ({ request }) => {
    const body = (await request.json()) as { cpf?: string };

    if (apenasDigitos(body.cpf ?? '') === CPF_COM_ONBOARDING_ATIVO) {
      return errorResponse(
        409,
        'Conflict',
        'CPF ja possui onboarding ativo',
        '/api/v1/onboarding/pessoa',
      );
    }

    return HttpResponse.json(
      { id: PESSOA_ID, status: 'INICIADO', dataCriacao: now, dataModificacao: now },
      { status: 201 },
    );
  }),

  http.post(`${baseUrl}/onboarding/pessoa/:id/documentos`, async ({ params, request }) => {
    if (params['id'] === ID_SEM_OWNERSHIP) {
      return errorResponse(
        403,
        'Forbidden',
        'solicitacao pertence a outro usuario',
        `/api/v1/onboarding/pessoa/${params['id']}/documentos`,
      );
    }
    const form = await request.formData();
    const tipo = form.get('tipo') as string | null;
    if (!tipo || !TIPOS_DOCUMENTO_PF.includes(tipo)) {
      return errorResponse(
        400,
        'Bad Request',
        'ONB-400-016: tipo de documento nao aceito para PF',
        `/api/v1/onboarding/pessoa/${params['id']}/documentos`,
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(
    `${baseUrl}/onboarding/pessoa/:id/verificar`,
    () => new HttpResponse(null, { status: 202 }),
  ),

  http.get(`${baseUrl}/onboarding/pessoa/:id`, ({ params }) => {
    const id = params['id'] as string;
    if (id === ID_SEM_OWNERSHIP) {
      return errorResponse(
        403,
        'Forbidden',
        'solicitacao pertence a outro usuario',
        `/api/v1/onboarding/pessoa/${id}`,
      );
    }
    return HttpResponse.json({
      id,
      status: 'APROVADO_FINAL',
      dataCriacao: now,
      dataModificacao: now,
      documentosEnviados: [
        {
          id: '3f0799c0-98b9-6d9d-bc4a-7d6f5b771a01',
          tipo: 'RG',
          dataEnvio: now,
          sha256: 'a1b2c3d4e5f6',
        },
      ],
      resultado: {
        statusFinal: 'APROVADO_FINAL',
        motivo: null,
        dataResultado: now,
      },
    });
  }),

  http.post(`${baseUrl}/onboarding/empresa`, async ({ request }) => {
    const body = (await request.json()) as { cnpj?: string; razaoSocial?: string };

    if (apenasDigitos(body.cnpj ?? '') === CNPJ_COM_ONBOARDING_ATIVO) {
      return errorResponse(
        409,
        'Conflict',
        'CNPJ ja possui onboarding ativo',
        '/api/v1/onboarding/empresa',
      );
    }

    return HttpResponse.json(
      {
        id: EMPRESA_ID,
        status: 'INICIADO',
        cnpj: body.cnpj ?? '',
        razaoSocial: body.razaoSocial ?? '',
        dataCriacao: now,
        dataModificacao: now,
      },
      { status: 201 },
    );
  }),

  http.post(`${baseUrl}/onboarding/empresa/:id/documentos`, async ({ params, request }) => {
    if (params['id'] === ID_SEM_OWNERSHIP) {
      return errorResponse(
        403,
        'Forbidden',
        'solicitacao pertence a outro usuario',
        `/api/v1/onboarding/empresa/${params['id']}/documentos`,
      );
    }
    const form = await request.formData();
    const tipo = form.get('tipo') as string | null;
    if (!tipo || !TIPOS_DOCUMENTO_PJ.includes(tipo)) {
      return errorResponse(
        400,
        'Bad Request',
        'ONB-400-016: tipo de documento nao aceito para PJ',
        `/api/v1/onboarding/empresa/${params['id']}/documentos`,
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(
    `${baseUrl}/onboarding/empresa/:id/verificar`,
    () => new HttpResponse(null, { status: 202 }),
  ),

  http.get(`${baseUrl}/onboarding/empresa/:id`, ({ params }) => {
    const id = params['id'] as string;
    if (id === ID_SEM_OWNERSHIP) {
      return errorResponse(
        403,
        'Forbidden',
        'solicitacao pertence a outro usuario',
        `/api/v1/onboarding/empresa/${id}`,
      );
    }
    return HttpResponse.json({
      id,
      status: 'APROVADO_FINAL',
      dataCriacao: now,
      dataModificacao: now,
      dadosEmpresa: {
        cnpj: '27.865.757/0001-02',
        razaoSocial: 'Acme Comercio LTDA',
        nomeFantasia: 'Acme',
        tipoSocietario: 'LTDA',
        porte: 'ME',
      },
      documentosEnviados: [
        {
          id: '3f0799c0-98b9-6d9d-bc4a-7d6f5b771b01',
          tipo: 'CONTRATO_SOCIAL',
          dataEnvio: now,
          sha256: 'b1c2d3e4f5a6',
        },
      ],
      representantes: representantesFake,
      resultado: {
        statusFinal: 'APROVADO_FINAL',
        motivo: null,
        dataResultado: now,
      },
    });
  }),

  http.get(`${baseUrl}/onboarding/empresa/:id/representantes`, ({ params }) => {
    if (params['id'] === ID_SEM_OWNERSHIP) {
      return errorResponse(
        403,
        'Forbidden',
        'solicitacao pertence a outro usuario',
        `/api/v1/onboarding/empresa/${params['id']}/representantes`,
      );
    }
    return HttpResponse.json(representantesFake);
  }),
];

// --- Credito e Open Finance (F-Sprint 7) ---
// Sentinelas deterministicas para smoke/dev-offline e testes:
// - id "...ff03" simula proposta de outro dono (403 ownership).
// - id "...c05" simula proposta com consentimento Open Finance PENDENTE (409 ao iniciar).
// - id "...c06" simula consentimento AUTORIZADO com agregados sanitizados.
// - solicitacaoOnboardingId "999..." simula onboarding nao APROVADO_FINAL (422 ao criar).
const PROPOSTA_EM_ANALISE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c01';
const PROPOSTA_PRE_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02';
const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';
const PROPOSTA_PENDENCIA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c04';
const PROPOSTA_OF_PENDENTE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c05';
const PROPOSTA_OF_AUTORIZADO_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c06';
const PROPOSTA_CRIADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c07';
const PROPOSTA_REJEITADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c08';
const PROPOSTA_SEM_OWNERSHIP_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const ONBOARDING_NAO_APROVADO = '99999999-9999-9999-9999-999999999999';
const TOMADOR_ID = clienteUsuario.id;

// Etapas da proposta (Mockup 28). Cada status so garante ate um ponto da trilha: o que vem
// depois aparece aguardando, e a etapa corrente aparece em andamento.
const ETAPAS_PROPOSTA = [
  'Proposta criada',
  'Validação cadastral',
  'Em análise de crédito',
  'Oferta de crédito',
  'Formalização',
];

const ETAPA_CORRENTE: Record<string, number> = {
  CRIADA: 0,
  EM_ANALISE: 2,
  PRE_APROVADA: 3,
  PENDENCIA: 2,
  APROVADA: 4,
  REJEITADA: 3,
};

const PERCENTUAL_ANALISE: Record<string, number> = {
  EM_ANALISE: 65,
  PRE_APROVADA: 80,
  PENDENCIA: 45,
  APROVADA: 100,
  REJEITADA: 100,
};

function etapasProposta(status: string, criacao: string, modificacao: string) {
  const corrente = ETAPA_CORRENTE[status] ?? 0;
  return ETAPAS_PROPOSTA.map((titulo, i) => {
    if (i < corrente) {
      return { titulo, em: i === 0 ? criacao : modificacao, situacao: 'CONCLUIDO' };
    }
    if (i === corrente) {
      return { titulo, em: modificacao, situacao: 'EM_ANDAMENTO' };
    }
    return { titulo, situacao: 'AGUARDANDO' };
  });
}

function propostaFake(
  id: string,
  status: string,
  score: unknown = null,
  parecer: unknown = null,
  valorSolicitado = 1250.0,
  prazoMeses = 12,
  tipoOperacao = 'CAPITAL_GIRO',
) {
  const criacao = now;
  // Depois da criacao (18:30:00): uma proposta nao e alterada antes de existir. Antes, 14:20:33 deixava
  // a duracao da analise negativa e a linha do tempo contava o score antes do registro. 2h15min
  // exatos, que e o "tempo medio de analise" que a tela ja mostrava, agora calculado.
  const modificacao = '2026-04-24T20:45:00-03:00';
  return {
    id,
    tomadorId: TOMADOR_ID,
    solicitacaoOnboardingId: '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01',
    tipoOperacao,
    valorSolicitado,
    moeda: 'BRL',
    prazoMeses,
    status,
    dataCriacao: criacao,
    dataModificacao: modificacao,
    score,
    parecer,
    // Apresentacao do Mockup 28: nenhum destes participa de decisao de credito.
    finalidade: 'Compra de estoque',
    carenciaMeses: 0,
    // Parcela da tabela Price na taxa que a propria proposta anuncia (antes: valor / prazo, sem juros).
    valorParcelaEstimado: parcelaPrice(valorSolicitado, TAXA_MENSAL_PADRAO, prazoMeses),
    empresaNome: 'Empresa Exemplo Ltda.',
    cnpj: '11.111.111/0001-91',
    porte: 'Pequeno Porte',
    setor: 'Comércio',
    taxaEstimada: textoTaxaMensal(),
    garantia: 'Conta escrow',
    canalOrigem: 'Portal SEP',
    analista: status === 'EM_ANALISE' ? 'Equipe de crédito' : 'Motor de crédito',
    percentualAnalise: PERCENTUAL_ANALISE[status] ?? 0,
    etapas: etapasProposta(status, criacao, modificacao),
    documentos: [
      { nome: 'Contrato social.pdf', tipo: 'PDF', tamanho: '412 KB', enviadoEm: criacao },
      { nome: 'Faturamento 12 meses.xlsx', tipo: 'XLSX', tamanho: '86 KB', enviadoEm: criacao },
      { nome: 'Comprovante de endereço.pdf', tipo: 'PDF', tamanho: '221 KB', enviadoEm: criacao },
    ],
    historico: [
      { titulo: 'Proposta registrada no portal', em: criacao, autor: 'Tomador' },
      { titulo: 'Validação cadastral concluída', em: criacao, autor: 'Sistema' },
      { titulo: 'Score do motor calculado', em: modificacao, autor: 'Motor de crédito' },
    ],
  };
}

const scoreFake = {
  valor: 720,
  statusSugerido: 'PRE_APROVADA',
  falhas: 0,
  pendencias: 1,
  dataCalculo: now,
};

const parecerFake = {
  id: '5f0799c0-98b9-6d9d-bc4a-7d6f5b771d01',
  propostaId: PROPOSTA_PRE_APROVADA_ID,
  pareceristaId: adminUsuario.id,
  decisao: 'PENDENCIA',
  justificativa: 'Aguardando comprovacao de faturamento via Open Finance.',
  scoreMotorSnapshot: 720,
  versao: 1,
  dataParecer: now,
};

const propostasFake: Record<string, ReturnType<typeof propostaFake>> = {
  [PROPOSTA_EM_ANALISE_ID]: propostaFake(PROPOSTA_EM_ANALISE_ID, 'EM_ANALISE'),
  [PROPOSTA_PRE_APROVADA_ID]: propostaFake(
    PROPOSTA_PRE_APROVADA_ID,
    'PRE_APROVADA',
    scoreFake,
    parecerFake,
  ),
  [PROPOSTA_APROVADA_ID]: propostaFake(PROPOSTA_APROVADA_ID, 'APROVADA'),
  [PROPOSTA_PENDENCIA_ID]: propostaFake(PROPOSTA_PENDENCIA_ID, 'PENDENCIA'),
  [PROPOSTA_OF_PENDENTE_ID]: propostaFake(PROPOSTA_OF_PENDENTE_ID, 'EM_ANALISE'),
  [PROPOSTA_OF_AUTORIZADO_ID]: propostaFake(
    PROPOSTA_OF_AUTORIZADO_ID,
    'EM_ANALISE',
    null,
    null,
    1875,
    18,
    'OUTROS',
  ),
  [PROPOSTA_CRIADA_ID]: propostaFake(
    PROPOSTA_CRIADA_ID,
    'EM_ANALISE',
    null,
    null,
    3125,
    36,
    'OUTROS',
  ),
  [PROPOSTA_REJEITADA_ID]: propostaFake(PROPOSTA_REJEITADA_ID, 'REJEITADA', null, null, 1500),
};

function pageOf<T>(content: T[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

const creditoHandlers = [
  http.post(`${baseUrl}/credito/propostas`, async ({ request }) => {
    const body = (await request.json()) as {
      solicitacaoOnboardingId?: string;
      tipoOperacao?: string;
      valorSolicitado?: number;
      prazoMeses?: number;
    };

    if (body.solicitacaoOnboardingId === ONBOARDING_NAO_APROVADO) {
      return errorResponse(
        422,
        'Unprocessable Entity',
        'Onboarding nao esta APROVADO_FINAL',
        '/api/v1/credito/propostas',
      );
    }

    const propostaCriada = propostaFake(
      PROPOSTA_CRIADA_ID,
      'EM_ANALISE',
      null,
      null,
      Number(body.valorSolicitado ?? 0),
      Number(body.prazoMeses ?? 0),
      body.tipoOperacao ?? 'CAPITAL_GIRO',
    );
    propostaCriada.solicitacaoOnboardingId = body.solicitacaoOnboardingId ?? '';
    propostasFake[PROPOSTA_CRIADA_ID] = propostaCriada;

    return HttpResponse.json(propostaCriada, { status: 201 });
  }),

  http.get(`${baseUrl}/credito/propostas`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const todas = [
      propostasFake[PROPOSTA_CRIADA_ID],
      propostasFake[PROPOSTA_EM_ANALISE_ID],
      propostasFake[PROPOSTA_PRE_APROVADA_ID],
      propostasFake[PROPOSTA_APROVADA_ID],
      propostasFake[PROPOSTA_PENDENCIA_ID],
      propostasFake[PROPOSTA_OF_PENDENTE_ID],
      propostasFake[PROPOSTA_OF_AUTORIZADO_ID],
      propostasFake[PROPOSTA_REJEITADA_ID],
    ];
    const filtradas = status ? todas.filter((p) => p.status === status) : todas;
    return HttpResponse.json(pageOf(filtradas));
  }),

  http.get(`${baseUrl}/credito/propostas/:id`, ({ params }) => {
    const id = params['id'] as string;
    if (id === PROPOSTA_SEM_OWNERSHIP_ID) {
      return errorResponse(
        403,
        'Forbidden',
        'Proposta pertence a outro tomador',
        `/api/v1/credito/propostas/${id}`,
      );
    }
    const proposta = propostasFake[id];
    if (!proposta) {
      return errorResponse(
        404,
        'Not Found',
        'Proposta nao encontrada',
        `/api/v1/credito/propostas/${id}`,
      );
    }
    return HttpResponse.json(proposta);
  }),

  http.post(
    `${baseUrl}/credito/propostas/:id/open-finance/consentimento`,
    async ({ params, request }) => {
      const id = params['id'] as string;
      const body = (await request.json()) as { cpfCnpjTomador?: string; redirectUri?: string };
      const path = `/api/v1/credito/propostas/${id}/open-finance/consentimento`;

      if (id === PROPOSTA_SEM_OWNERSHIP_ID) {
        return errorResponse(403, 'Forbidden', 'Proposta pertence a outro tomador', path);
      }
      if (!/^\d{11}$|^\d{14}$/.test(body.cpfCnpjTomador ?? '')) {
        return errorResponse(400, 'Bad Request', 'cpfCnpjTomador deve ter 11 ou 14 digitos', path);
      }
      if (!/^https?:\/\/[^\s]+$/.test(body.redirectUri ?? '')) {
        return errorResponse(400, 'Bad Request', 'redirectUri deve ser http(s)', path);
      }
      if (id === PROPOSTA_OF_PENDENTE_ID) {
        return errorResponse(409, 'Conflict', 'Ja existe consentimento PENDENTE', path);
      }

      return HttpResponse.json(
        {
          consentimentoId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01',
          status: 'PENDENTE',
          urlAutorizacao: 'https://provider.openfinance.example/authorize?consent=fake',
          dataExpiracao: '2026-04-25T18:30:00-03:00',
        },
        { status: 201 },
      );
    },
  ),

  http.get(`${baseUrl}/credito/propostas/:id/open-finance`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/credito/propostas/${id}/open-finance`;

    if (id === PROPOSTA_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Proposta pertence a outro tomador', path);
    }
    if (id === PROPOSTA_OF_AUTORIZADO_ID) {
      return HttpResponse.json({
        statusConsentimento: 'AUTORIZADO',
        dataInicio: now,
        dataAutorizacao: now,
        dataExpiracao: '2026-04-25T18:30:00-03:00',
        // Coerente com a carteira: o maior contrato e de R$ 6.000,00 em 10x de R$ 600,00.
        // Entradas de 30x a parcela satisfazem o bonus de "entradas >= 3x parcela" sem
        // descrever uma empresa que nunca precisaria de um emprestimo de ate R$ 15.000,00.
        ultimaMovimentacao: {
          mediaEntradasMensal: 18000.0,
          mediaSaidasMensal: 15400.0,
          saldoMedio: 3200.0,
          numeroMesesAvaliados: 6,
          dataRecebimento: now,
        },
      });
    }
    if (id === PROPOSTA_OF_PENDENTE_ID) {
      return HttpResponse.json({
        statusConsentimento: 'PENDENTE',
        dataInicio: now,
        dataAutorizacao: null,
        dataExpiracao: '2026-04-25T18:30:00-03:00',
        ultimaMovimentacao: null,
      });
    }
    return errorResponse(404, 'Not Found', 'Consentimento nao encontrado', path);
  }),
];

// --- Formalizacao contratual (F-Sprint 8) ---
// Identificadores deterministicos para smoke/dev-offline e testes:
// - "...e01" contrato AGUARDANDO_ACEITE (sem aceite, sem envelope), ligado a proposta APROVADA "...c03".
// - "...e02" contrato EM_ASSINATURA (aceite registrado, envelope ENVIADO, 2 versoes).
// - "...e03" contrato ASSINADO (envelope ASSINADO, documento disponivel).
// - "...e04" contrato com envelope RECUSADO.
// - "...ff03" contrato de outro dono (403 ownership).
// - "...dead" contrato inexistente (404).
// - proposta APROVADA "...c03" possui contrato; proposta PRE_APROVADA "...c02" nao (404).
const CONTRATO_AGUARDANDO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01';
const CONTRATO_EM_ASSINATURA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e02';
const CONTRATO_ASSINADO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const CONTRATO_RECUSADO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e04';
const CONTRATO_SEM_OWNERSHIP_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const CONTRATO_SEM_VERSAO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e05';
// Contrato dedicado ao teste de aceite feliz: o handler muta seu estado apos o
// aceite, entao nenhum outro cenario depende dele (isolamento de teste).
const CONTRATO_PARA_ACEITE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e06';
const DOCUMENTO_HASH_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function clausulasFake() {
  return [
    {
      id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b771a01',
      ordem: 1,
      titulo: 'OBJETO',
      texto: 'Mutuo de capital de giro.',
    },
    {
      id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b771a02',
      ordem: 2,
      titulo: 'PRAZO',
      texto: 'Prazo de 12 meses.',
    },
  ];
}

function versaoFake(id: string, numero: number, hash: string) {
  return {
    id,
    numero,
    conteudoTexto: `CONTRATO DE MUTUO\n\nVersao ${numero}.\nClausula 1 - Objeto.\nClausula 2 - Prazo.`,
    hashSha256: hash,
    dataGeracao: now,
    parecerOrigemId: '5f0799c0-98b9-6d9d-bc4a-7d6f5b771d01',
    clausulas: clausulasFake(),
  };
}

const VERSAO_E01 = versaoFake('8f0799c0-98b9-6d9d-bc4a-7d6f5b771b01', 1, DOCUMENTO_HASH_SHA256);
const VERSAO_E02_V1 = versaoFake('8f0799c0-98b9-6d9d-bc4a-7d6f5b771b02', 1, 'aa11');
const VERSAO_E02_V2 = versaoFake('8f0799c0-98b9-6d9d-bc4a-7d6f5b771b03', 2, 'bb22');

function aceiteFake(versaoId: string) {
  return {
    id: '9f0799c0-98b9-6d9d-bc4a-7d6f5b771c01',
    versaoId,
    tomadorId: TOMADOR_ID,
    dataAceite: now,
    ipOrigem: '203.0.113.42',
    userAgentOrigem: 'Mozilla/5.0 (smoke)',
  };
}

function contratoFake(
  id: string,
  propostaId: string,
  status: string,
  versaoVigente: ReturnType<typeof versaoFake> | null,
  aceite: ReturnType<typeof aceiteFake> | null,
) {
  return {
    id,
    propostaId,
    tomadorId: TOMADOR_ID,
    tipo: 'MUTUO',
    status,
    versaoVigente,
    aceite,
    dataCriacao: now,
    dataModificacao: now,
  };
}

const contratosFake: Record<string, ReturnType<typeof contratoFake>> = {
  [CONTRATO_AGUARDANDO_ID]: contratoFake(
    CONTRATO_AGUARDANDO_ID,
    PROPOSTA_APROVADA_ID,
    'AGUARDANDO_ACEITE',
    VERSAO_E01,
    null,
  ),
  [CONTRATO_EM_ASSINATURA_ID]: contratoFake(
    CONTRATO_EM_ASSINATURA_ID,
    PROPOSTA_OF_AUTORIZADO_ID,
    'EM_ASSINATURA',
    VERSAO_E02_V2,
    aceiteFake(VERSAO_E02_V2.id),
  ),
  [CONTRATO_ASSINADO_ID]: contratoFake(
    CONTRATO_ASSINADO_ID,
    PROPOSTA_EM_ANALISE_ID,
    'ASSINADO',
    VERSAO_E01,
    aceiteFake(VERSAO_E01.id),
  ),
  [CONTRATO_RECUSADO_ID]: contratoFake(
    CONTRATO_RECUSADO_ID,
    PROPOSTA_PENDENCIA_ID,
    'RECUSADO',
    VERSAO_E01,
    aceiteFake(VERSAO_E01.id),
  ),
  // Contrato GERADO ainda sem versao vigente (backend retorna versaoVigente null).
  [CONTRATO_SEM_VERSAO_ID]: contratoFake(
    CONTRATO_SEM_VERSAO_ID,
    PROPOSTA_EM_ANALISE_ID,
    'GERADO',
    null,
    null,
  ),
  [CONTRATO_PARA_ACEITE_ID]: contratoFake(
    CONTRATO_PARA_ACEITE_ID,
    PROPOSTA_OF_PENDENTE_ID,
    'AGUARDANDO_ACEITE',
    VERSAO_E01,
    null,
  ),
};

const versoesPorContrato: Record<string, ReturnType<typeof versaoFake>[]> = {
  [CONTRATO_AGUARDANDO_ID]: [VERSAO_E01],
  // Ordem ascendente de numero, como o backend (VersaoContratoRepository
  // findByContratoIdOrdenado: order by numero asc). A UI ordena vigente-first se quiser.
  [CONTRATO_EM_ASSINATURA_ID]: [VERSAO_E02_V1, VERSAO_E02_V2],
  [CONTRATO_ASSINADO_ID]: [VERSAO_E01],
  [CONTRATO_RECUSADO_ID]: [VERSAO_E01],
  [CONTRATO_SEM_VERSAO_ID]: [],
  [CONTRATO_PARA_ACEITE_ID]: [VERSAO_E01],
};

const statusAssinaturaPorContrato: Record<
  string,
  { statusContrato: string; statusEnvelope: string | null; idEnvelopeExterno: string | null }
> = {
  [CONTRATO_AGUARDANDO_ID]: {
    statusContrato: 'AGUARDANDO_ACEITE',
    statusEnvelope: null,
    idEnvelopeExterno: null,
  },
  [CONTRATO_EM_ASSINATURA_ID]: {
    statusContrato: 'EM_ASSINATURA',
    statusEnvelope: 'ENVIADO',
    idEnvelopeExterno: 'env-ext-0002',
  },
  [CONTRATO_ASSINADO_ID]: {
    statusContrato: 'ASSINADO',
    statusEnvelope: 'ASSINADO',
    idEnvelopeExterno: 'env-ext-0003',
  },
  [CONTRATO_RECUSADO_ID]: {
    statusContrato: 'RECUSADO',
    statusEnvelope: 'RECUSADO',
    idEnvelopeExterno: 'env-ext-0004',
  },
};

const formalizacaoHandlers = [
  http.get(`${baseUrl}/contratos/proposta/:propostaId`, ({ params }) => {
    const propostaId = params['propostaId'] as string;
    const path = `/api/v1/contratos/proposta/${propostaId}`;
    if (propostaId === PROPOSTA_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato pertence a outro tomador', path);
    }
    const contrato = Object.values(contratosFake).find((c) => c.propostaId === propostaId);
    if (!contrato) {
      return errorResponse(404, 'Not Found', 'Contrato nao encontrado para a proposta', path);
    }
    return HttpResponse.json(contrato);
  }),

  http.get(`${baseUrl}/contratos/:id/versoes`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/contratos/${id}/versoes`;
    if (id === CONTRATO_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato pertence a outro tomador', path);
    }
    const versoes = versoesPorContrato[id];
    if (!versoes) {
      return errorResponse(404, 'Not Found', 'Contrato nao encontrado', path);
    }
    return HttpResponse.json(versoes);
  }),

  http.patch(`${baseUrl}/contratos/:id/aceite`, ({ request, params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/contratos/${id}/aceite`;
    // @RequireStepUp no backend: sem X-Step-Up-Token o aspecto barra antes da regra.
    if (!request.headers.get('X-Step-Up-Token')) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    if (id === CONTRATO_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato pertence a outro tomador', path);
    }
    const contrato = contratosFake[id];
    if (!contrato) {
      return errorResponse(404, 'Not Found', 'Contrato nao encontrado', path);
    }
    if (contrato.status !== 'AGUARDANDO_ACEITE') {
      return errorResponse(409, 'Conflict', 'Contrato fora de AGUARDANDO_ACEITE', path);
    }
    // Persiste a transicao na sessao dev-offline: apos aceite, GET /contratos/:id e
    // GET /assinatura/status refletem EM_ASSINATURA/ENVIADO (o backend dispara o
    // envelope via ContratoAceitoListener). Estado e por sessao do mock.
    const versao = contrato.versaoVigente!;
    contrato.status = 'EM_ASSINATURA';
    contrato.aceite = aceiteFake(versao.id);
    statusAssinaturaPorContrato[id] = {
      statusContrato: 'EM_ASSINATURA',
      statusEnvelope: 'ENVIADO',
      idEnvelopeExterno: 'env-ext-aceite',
    };
    return HttpResponse.json(contrato);
  }),

  http.get(`${baseUrl}/contratos/:id/assinatura/status`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/contratos/${id}/assinatura/status`;
    if (id === CONTRATO_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato pertence a outro tomador', path);
    }
    const status = statusAssinaturaPorContrato[id];
    if (!status) {
      return errorResponse(404, 'Not Found', 'Contrato nao encontrado', path);
    }
    return HttpResponse.json({ ...status, dataAtualizacaoProvider: now });
  }),

  http.get(`${baseUrl}/contratos/:id/documento-assinado`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/contratos/${id}/documento-assinado`;
    if (id === CONTRATO_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato pertence a outro tomador', path);
    }
    const contrato = contratosFake[id];
    if (!contrato) {
      return errorResponse(404, 'Not Found', 'Contrato nao encontrado', path);
    }
    // Contrato existe mas ainda nao assinado: backend lanca
    // ContratoAssinaturaIndisponivelException (ConflitoException -> 409).
    if (contrato.status !== 'ASSINADO') {
      return errorResponse(409, 'Conflict', 'Contrato ainda nao assinado', path);
    }
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"
    return new HttpResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contrato-${id}.pdf"`,
        'X-Document-Hash-Sha256': DOCUMENTO_HASH_SHA256,
      },
    });
  }),

  // Por id mantido por ultimo: as rotas mais especificas (/versoes, /aceite,
  // /assinatura/status, /documento-assinado) precisam casar antes de /:id.
  http.get(`${baseUrl}/contratos/:id`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/contratos/${id}`;
    if (id === CONTRATO_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato pertence a outro tomador', path);
    }
    const contrato = contratosFake[id];
    if (!contrato) {
      return errorResponse(404, 'Not Found', 'Contrato nao encontrado', path);
    }
    return HttpResponse.json(contrato);
  }),
];

// --- Cobranca (F-Sprint 9 / backend Sprints 12-13) ---
// Sentinelas deterministicas para smoke/dev-offline e testes:
// - agenda ligada ao contrato ASSINADO "...e03" (fluxo contrato assinado -> agenda).
// - contrato "...ff03" simula agenda de outro tomador (403); contrato desconhecido -> 404.
// - parcela "...00ff" simula recurso de outro tomador / role insuficiente (403);
//   parcela desconhecida -> 404; estado nao-recebivel/nao-renegociavel -> 409.
// - recebimento/contato/renegociacao validam existencia da parcela (404) como o backend.
// - recebimento exige Idempotency-Key valida (ausente ou fora do pattern -> 400; key
//   reapresentada com payload divergente -> 409; mesma key + mesmo payload -> replay
//   com novo=false).
// - parcela "...0007" ja tem renegociacao ativa (criar proposta -> 409).
// - renegociacao exige X-Step-Up-Token na criacao e no aceite; a recusa nao exige.
// Estado de recebimentos e de renegociacao e por sessao do mock; ids dedicados isolam testes.
const AGENDA_ID = 'a0000000-0000-4000-8000-000000000a01';
const AGENDA_SUBSTITUTA_ID = 'a0000000-0000-4000-8000-000000000b01';
const COBRANCA_CONTRATO_ID = CONTRATO_ASSINADO_ID;
const PARCELA_PENDENTE_ID = 'a0000000-0000-4000-8000-000000000001';
const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';
const PARCELA_PARCIAL_ID = 'a0000000-0000-4000-8000-000000000003';
const PARCELA_PAGA_ID = 'a0000000-0000-4000-8000-000000000004';
const PARCELA_INADIMPLENTE_ID = 'a0000000-0000-4000-8000-000000000005';
const PARCELA_PARA_RECEBIMENTO_ID = 'a0000000-0000-4000-8000-000000000006';
const PARCELA_RENEG_ATIVA_ID = 'a0000000-0000-4000-8000-000000000007';
const PARCELA_SEM_OWNERSHIP_ID = 'a0000000-0000-4000-8000-0000000000ff';
const RENEG_PARA_ACEITE_ID = 'b0000000-0000-4000-8000-000000000001';
const RENEG_PARA_RECUSA_ID = 'b0000000-0000-4000-8000-000000000002';
const RENEG_DECIDIDA_ID = 'b0000000-0000-4000-8000-000000000003';
const RENEG_CRIADA_ID = 'b0000000-0000-4000-8000-0000000000c1';
const ESCROW_MOV_ID = 'c0000000-0000-4000-8000-0000000000e1';
// Espelham StatusParcela.permiteRecebimento / permiteIniciarRenegociacao do backend.
const STATUS_PERMITEM_RECEBIMENTO = ['PENDENTE', 'PARCIALMENTE_PAGA', 'ATRASADA'];
const STATUS_PERMITEM_RENEGOCIACAO = ['ATRASADA', 'INADIMPLENTE'];
// Mesmo pattern do CobrancaController.validarIdempotencyKey.
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

// Formatacao usada so nos textos de apresentacao do mock (trilha do Mockup 31).
const agoraIso = '2026-05-30T11:58:44-03:00';

function moedaBr(valor: number): string {
  return `R$ ${valor
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d),)/g, '.')}`;
}

function dataBr(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Extras de apresentacao do Mockup 31: quando a parcela pertence a um contrato da
// CARTEIRA, o detalhe precisa mostrar o mesmo contrato, tomador e total de parcelas que a
// triagem de inadimplencia mostrou, e nao o contrato generico do seed antigo.
interface ExtrasParcela {
  diasAtraso?: number;
  contratoCurto?: string;
  contratoTipo?: string;
  tomador?: string;
  parcelasTotais?: number;
  valorTotalContrato?: number;
}

function valorAtualizado(
  parcelaId: string,
  numero: number,
  status: string,
  dataVencimento: string,
  principalOriginal: number,
  jurosOriginal: number,
  jurosMora: number,
  multa: number,
  totalRecebido: number,
  extras: ExtrasParcela = {},
) {
  const valorDevidoAtualizado = principalOriginal + jurosOriginal + jurosMora + multa;
  // Emissao 30 dias antes do vencimento, no mesmo contrato de 12 parcelas mensais de mil reais.
  const emissao = new Date(`${dataVencimento}T00:00:00-03:00`);
  emissao.setDate(emissao.getDate() - 30);
  const dataEmissao = emissao.toISOString().slice(0, 10);
  const criadoEm = `${dataEmissao}T10:32:11-03:00`;
  const liquidada = status === 'PAGA';
  const recebida = liquidada || status === 'PARCIALMENTE_PAGA';
  const eventos: { rotulo: string; dataHora: string; origem: string; detalhe?: string }[] = [
    {
      rotulo: 'Parcela gerada',
      dataHora: criadoEm,
      origem: 'Sistema',
      detalhe: `Valor original: ${moedaBr(principalOriginal + jurosOriginal)}`,
    },
    {
      rotulo: 'Boleto gerado',
      dataHora: `${dataEmissao}T10:32:12-03:00`,
      origem: 'Sistema',
      detalhe: 'Cobranca disponibilizada ao tomador',
    },
    {
      rotulo: 'Aguardando pagamento',
      dataHora: `${dataEmissao}T10:32:12-03:00`,
      origem: 'Sistema',
      detalhe: `Vencimento em ${dataBr(dataVencimento)}`,
    },
  ];
  // Marcos de atraso: a trilha do Mockup 31 mostra o vencimento e o estado atual.
  const dias = extras.diasAtraso ?? 0;
  if (dias > 0) {
    eventos.push({
      rotulo: 'Parcela vencida',
      dataHora: `${dataVencimento}T00:00:00-03:00`,
      origem: 'Sistema',
      detalhe: `Vencimento original: ${dataBr(dataVencimento)}`,
    });
    eventos.push({
      rotulo: `${dias} dias de atraso`,
      dataHora: agoraIso,
      origem: 'Sistema',
      detalhe: 'Parcela em atraso',
    });
  }
  if (recebida) {
    eventos.push({
      rotulo: 'Pagamento recebido',
      dataHora: `${dataVencimento}T14:08:45-03:00`,
      origem: 'Conciliacao Pix',
      detalhe: `Total recebido: ${moedaBr(totalRecebido)}`,
    });
  }
  return {
    parcelaId,
    numero,
    status,
    dataVencimento,
    principalOriginal,
    jurosOriginal,
    jurosMora,
    multa,
    valorDevidoAtualizado,
    totalRecebido,
    valorEmAberto: valorDevidoAtualizado - totalRecebido,
    // --- Campos de apresentacao do Mockup 24 (nao participam de calculo) ---
    desconto: 0,
    propostaNumero: 'PROP-5b771e05',
    tomador: extras.tomador ?? 'Empresa Exemplo Ltda.',
    periodicidade: 'Mensal',
    dataEmissao,
    criadoEm,
    criadoPor: 'Sistema',
    atualizadoEm: recebida ? `${dataVencimento}T14:08:45-03:00` : criadoEm,
    contrato: {
      contratoId: extras.contratoCurto ?? COBRANCA_CONTRATO_ID,
      numero: extras.contratoCurto ? `CONT-${extras.contratoCurto}` : 'CONT-8d991a11',
      status: 'Ativo',
      valorTotal: extras.valorTotalContrato ?? 12000,
      parcelasTotais: extras.parcelasTotais ?? 12,
      parcelasPagas: 1,
      parcelasEmAberto: (extras.parcelasTotais ?? 12) - 1,
      proximoVencimento: '2026-07-15',
    },
    cobranca: {
      tipoCobranca: 'Normal',
      formaPagamento: 'Boleto / Pix',
      bancoRecebedor: 'Banco ABCD S.A.',
      nossoNumero: `0000001234567${8900 + numero}`,
      linhaDigitavel: '12345.67890 12345.678901 12345.678901 1 123456789000',
    },
    complementares: {
      categoria: 'Capital de Giro',
      finalidade: 'Compra de estoque',
      centroCusto: 'Administrativo',
      observacoes: null as string | null,
      tags: ['operacional', 'mensal', 'cliente-pj'],
    },
    eventos,
    // --- Campos de apresentacao do Mockup 31 ---
    diasAtraso: extras.diasAtraso ?? 0,
    documentos: [
      {
        nome: `Contrato ${extras.contratoCurto ?? '5b771e03'}`,
        tipo: 'PDF',
        tamanho: '245 KB',
      },
      { nome: 'Demonstrativo da parcela', tipo: 'PDF', tamanho: '120 KB' },
      { nome: 'Boleto (PIX)', tipo: 'PDF', tamanho: '98 KB' },
    ],
  };
}

const detalheParcela: Record<string, ReturnType<typeof valorAtualizado>> = {
  [PARCELA_PENDENTE_ID]: valorAtualizado(
    PARCELA_PENDENTE_ID,
    1,
    'PENDENTE',
    '2026-07-15',
    1000,
    0,
    0,
    0,
    0,
  ),
  [PARCELA_ATRASADA_ID]: valorAtualizado(
    PARCELA_ATRASADA_ID,
    2,
    'ATRASADA',
    '2026-05-15',
    1000,
    0,
    12.34,
    20,
    0,
  ),
  [PARCELA_PARCIAL_ID]: valorAtualizado(
    PARCELA_PARCIAL_ID,
    3,
    'PARCIALMENTE_PAGA',
    '2026-06-15',
    1000,
    0,
    0,
    0,
    400,
  ),
  [PARCELA_PAGA_ID]: valorAtualizado(PARCELA_PAGA_ID, 4, 'PAGA', '2026-04-15', 1000, 0, 0, 0, 1000),
  [PARCELA_PARA_RECEBIMENTO_ID]: valorAtualizado(
    PARCELA_PARA_RECEBIMENTO_ID,
    5,
    'ATRASADA',
    '2026-05-01',
    1000,
    0,
    30,
    20,
    0,
  ),
  [PARCELA_INADIMPLENTE_ID]: valorAtualizado(
    PARCELA_INADIMPLENTE_ID,
    6,
    'INADIMPLENTE',
    '2026-02-01',
    1000,
    0,
    90,
    20,
    0,
  ),
  // Parcela renegociavel (ATRASADA) que ja tem proposta ativa: criar renegociacao -> 409.
  [PARCELA_RENEG_ATIVA_ID]: valorAtualizado(
    PARCELA_RENEG_ATIVA_ID,
    7,
    'ATRASADA',
    '2026-04-20',
    1000,
    0,
    40,
    20,
    0,
  ),
};

// ============ CARTEIRA UNICA DA BASE FICTICIA ============
//
// Quatro contratos somando R$ 15.000,00 contratados (principal), o teto do regimento SEP. Cada um
// tem prazo e taxa, e a parcela e a da tabela Price (core/financeiro): principal + juros, com a
// ultima parcela fechando o saldo. TODAS as parcelas da base nascem daqui. Inadimplencia (Mockup 30), agenda financeira
// (Mockup 29), detalhe da parcela (Mockup 31), agenda do contrato (Mockup 32) e os
// indicadores da Cobranca (Mockup 14) sao somados dessas parcelas, entao os numeros batem
// entre as telas por construcao, e nao por coincidencia de constantes.
//
// A taxa dos quatro e a anunciada nas propostas, 2,4% a.m.; o que cada tela mostra de parcela, de
// juros e de saldo e somado destas linhas, nunca digitado.
// Taxa mensal unica da base ficticia: a mesma que as propostas anunciam ("2,4% a.m.").
const TAXA_CARTEIRA = TAXA_MENSAL_PADRAO;

const CARTEIRA = {
  '5b771c03': {
    tipo: 'CAPITAL_GIRO',
    tomador: 'Empresa Exemplo Ltda.',
    documento: '11.111.111/0001-91',
    contratado: 1250.0,
    prazo: 10,
    taxaMensal: TAXA_CARTEIRA,
    primeiroVencimento: '2025-10-20',
    pagas: 8,
    meio: 'PIX',
  },
  '5b771c05': {
    tipo: 'INVESTIMENTO',
    tomador: 'Cliente Demonstracao S.A.',
    documento: '33.333.333/0001-33',
    contratado: 3125.0,
    prazo: 10,
    taxaMensal: TAXA_CARTEIRA,
    primeiroVencimento: '2025-09-05',
    pagas: 7,
    meio: 'PIX',
  },
  '5b771c06': {
    tipo: 'REFINANCIAMENTO',
    tomador: 'Industria Alpha Ltda.',
    documento: '22.222.222/0001-22',
    contratado: 4625.0,
    prazo: 10,
    taxaMensal: TAXA_CARTEIRA,
    primeiroVencimento: '2025-09-15',
    pagas: 6,
    meio: 'BOLETO',
  },
  '5b771c08': {
    tipo: 'CAPITAL_GIRO',
    tomador: 'Comercio Beta ME',
    documento: '44.444.444/0001-44',
    contratado: 6000.0,
    prazo: 10,
    taxaMensal: TAXA_CARTEIRA,
    primeiroVencimento: '2025-10-25',
    pagas: 8,
    meio: 'TRANSFERENCIA',
  },
} as const;

type ChaveContrato = keyof typeof CARTEIRA;

const HOJE_BASE = new Date('2026-05-30T00:00:00-03:00');
const DIA_MS = 24 * 60 * 60 * 1000;

interface ParcelaCarteira {
  contrato: ChaveContrato;
  numero: number;
  totalParcelas: number;
  /** Total da parcela: principal + juros. */
  valor: number;
  principal: number;
  juros: number;
  vencimento: string;
  paga: boolean;
  dataPagamento: string | null;
  diasAtraso: number;
  status: 'PAGA' | 'PENDENTE' | 'ATRASADA' | 'INADIMPLENTE';
  parcelaId: string;
}

// Gera todas as parcelas da carteira. Status e dias de atraso saem da comparacao entre o
// vencimento e a data de referencia do mock — e so aqui, para nenhuma tela recalcular.
function carteiraParcelas(): ParcelaCarteira[] {
  const lista: ParcelaCarteira[] = [];
  let seq = 300;
  for (const chave of Object.keys(CARTEIRA) as ChaveContrato[]) {
    const c = CARTEIRA[chave];
    const plano = gerarCronograma({
      principal: c.contratado,
      taxaMensal: c.taxaMensal,
      prazoMeses: c.prazo,
      primeiroVencimento: c.primeiroVencimento,
    });
    for (let i = 0; i < c.prazo; i += 1) {
      const numero = i + 1;
      const linha = plano[i];
      const vencimento = linha.vencimento;
      const paga = numero <= c.pagas;
      const atraso = Math.floor(
        (HOJE_BASE.getTime() - new Date(`${vencimento}T00:00:00-03:00`).getTime()) / DIA_MS,
      );
      const diasAtraso = paga || atraso <= 0 ? 0 : atraso;
      const status: ParcelaCarteira['status'] = paga
        ? 'PAGA'
        : diasAtraso === 0
          ? 'PENDENTE'
          : diasAtraso <= 15
            ? 'ATRASADA'
            : 'INADIMPLENTE';
      seq += 1;
      lista.push({
        contrato: chave,
        numero,
        totalParcelas: c.prazo,
        valor: linha.total,
        principal: linha.principal,
        juros: linha.juros,
        vencimento,
        paga,
        dataPagamento: paga ? vencimento : null,
        diasAtraso,
        status,
        parcelaId: novoId('a0000000', seq),
      });
    }
  }
  return lista;
}

const PARCELAS_CARTEIRA = carteiraParcelas();

// Agregados do painel de backoffice tirados da propria carteira, para nenhum numero do
// dashboard divergir das telas de Cobranca nem estourar o teto de R$ 15.000,00 do regimento.
const INADIMPLENCIA_CARTEIRA = PARCELAS_CARTEIRA.filter((p) => p.diasAtraso > 0).reduce(
  (acc, p) => ({
    valorTotal: Math.round((acc.valorTotal + p.valor) * 100) / 100,
    numeroParcelas: acc.numeroParcelas + 1,
  }),
  { valorTotal: 0, numeroParcelas: 0 },
);

// O ultimo dia com pagamento na carteira (25/05/2026), que e o "dia" do painel enquanto a
// data de referencia do mock e 30/05/2026.
const RECEBIMENTOS_ULTIMO_DIA = (() => {
  const pagas = PARCELAS_CARTEIRA.filter((p) => p.dataPagamento);
  const ultima = pagas
    .map((p) => p.dataPagamento)
    .sort()
    .pop();
  return (
    Math.round(
      pagas.filter((p) => p.dataPagamento === ultima).reduce((soma, p) => soma + p.valor, 0) * 100,
    ) / 100
  );
})();

// ============ INADIMPLENCIA (Mockup 30) ============

// As parcelas em atraso da carteira, na ordem de vencimento. Nada e inventado aqui: a
// triagem e um recorte da mesma lista.
const inadimplenciaSeed = PARCELAS_CARTEIRA.filter((p) => p.diasAtraso > 0)
  .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  .map((p) => {
    const c = CARTEIRA[p.contrato];
    return {
      parcelaId: p.parcelaId,
      agendaId: AGENDA_ID,
      contratoId: COBRANCA_CONTRATO_ID,
      tomadorId: TOMADOR_ID,
      numeroParcela: p.numero,
      status: p.status,
      dataVencimento: p.vencimento,
      diasAtraso: p.diasAtraso,
      valorOriginal: p.valor,
      codigoParcela: `P${String(p.numero).padStart(3, '0')}`,
      totalParcelas: p.totalParcelas,
      contratoCurto: p.contrato,
      contratoTipo: c.tipo,
      tomadorNome: c.tomador,
      tomadorDocumento: c.documento,
    };
  });

// Detalhe de TODA parcela da carteira (Mockup 31): o link de qualquer lista abre uma
// parcela com o mesmo numero, vencimento, valor e status que a lista mostrava. Mora de
// 0,033% ao dia e multa de 2% sobre o principal, so nas que estao em atraso.
for (const p of PARCELAS_CARTEIRA) {
  const c = CARTEIRA[p.contrato];
  const centavos = (valor: number) => Math.round(valor * 100) / 100;
  detalheParcela[p.parcelaId] = valorAtualizado(
    p.parcelaId,
    p.numero,
    p.status,
    p.vencimento,
    p.principal,
    p.juros,
    p.diasAtraso > 0 ? centavos(p.valor * 0.00033 * p.diasAtraso) : 0,
    p.diasAtraso > 0 ? centavos(p.valor * 0.02) : 0,
    p.paga ? p.valor : 0,
    {
      diasAtraso: p.diasAtraso,
      contratoCurto: p.contrato,
      contratoTipo: c.tipo,
      tomador: c.tomador,
      parcelasTotais: p.totalParcelas,
      valorTotalContrato: c.contratado,
    },
  );
}

// ============ RECEBIMENTOS DA AGENDA FINANCEIRA (Mockup 29) ============

// Uma linha por parcela da carteira: as pagas viram recebimento conciliado, as demais
// entram com valor recebido zero. A tela soma os proprios agregados desta lista, entao o
// recebido, o em atraso e o a vencer batem com a Cobranca e com a inadimplencia.
function recebimentosSeed(): Record<string, unknown>[] {
  return PARCELAS_CARTEIRA.map((p, i) => {
    const c = CARTEIRA[p.contrato];
    return {
      recebimentoId: novoId('c0000000', 400 + i),
      parcelaId: p.parcelaId,
      statusParcela: p.status,
      valorRecebido: p.paga ? p.valor : 0,
      dataRecebimento: `${p.dataPagamento ?? p.vencimento}T11:20:00-03:00`,
      meioPagamento: p.paga ? c.meio : 'BOLETO',
      identificadorExterno: p.paga
        ? `comp-${p.contrato}-${String(p.numero).padStart(2, '0')}`
        : null,
      movimentacaoEscrowId: p.paga ? ESCROW_MOV_ID : null,
      novo: false,
      contrato: p.contrato,
      recebedor: c.tomador,
      vencimento: `${p.vencimento}T12:00:00-03:00`,
      dataPagamento: p.dataPagamento ? `${p.dataPagamento}T11:20:00-03:00` : null,
      valorParcela: p.valor,
    };
  });
}

const recebimentos: Record<string, unknown>[] = recebimentosSeed();

// ============ AGENDA DO CONTRATO (Mockup 32) ============

// Cada contrato da carteira tem um UUID de rota; o id curto continua sendo o que a tela
// mostra, no mesmo padrao ja homologado. 5b771c05 reaproveita o contrato assinado que ja
// existia, para os fluxos e testes anteriores continuarem valendo.
const CONTRATO_UUID: Record<ChaveContrato, string> = {
  '5b771c03': '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c03',
  '5b771c05': COBRANCA_CONTRATO_ID,
  '5b771c06': '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c06',
  '5b771c08': '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c08',
};

const DOCUMENTOS_CONTRATO = [
  { nome: 'Contrato assinado', tipo: 'PDF', tamanho: '245 KB' },
  { nome: 'Cédula de crédito', tipo: 'PDF', tamanho: '180 KB' },
  { nome: 'Plano de pagamento', tipo: 'PDF', tamanho: '120 KB' },
];

// Agenda montada a partir das mesmas parcelas da carteira: contratado, pagas, em aberto,
// inadimplentes e proximo vencimento sao somados da lista que a propria agenda devolve.
function agendaDoContrato(chave: ChaveContrato) {
  const c = CARTEIRA[chave];
  const parcelas = PARCELAS_CARTEIRA.filter((p) => p.contrato === chave);
  const emAberto = parcelas.filter((p) => !p.paga);
  const proxima = emAberto.find((p) => p.diasAtraso === 0) ?? emAberto[0] ?? null;
  return {
    id: novoId('a0000000', 900 + Object.keys(CARTEIRA).indexOf(chave)),
    contratoId: CONTRATO_UUID[chave],
    numeroParcelas: c.prazo,
    // Total a pagar: soma das parcelas (principal + juros), e nao o valor contratado.
    valorTotal: Math.round(parcelas.reduce((soma, p) => soma + p.valor, 0) * 100) / 100,
    dataGeracao: `${c.primeiroVencimento}T09:12:00-03:00`,
    parcelas: parcelas.map((p) => ({
      id: p.parcelaId,
      numero: p.numero,
      principal: p.principal,
      juros: p.juros,
      multa: 0,
      encargos: 0,
      total: p.valor,
      dataVencimento: p.vencimento,
      status: p.status,
      // --- apresentacao (Mockup 32) ---
      diasAtraso: p.diasAtraso,
      dataPagamento: p.dataPagamento,
      meioPagamento: p.paga ? c.meio : null,
    })),
    // --- apresentacao (Mockup 32) ---
    contratoCurto: chave,
    produto: c.tipo,
    tomador: c.tomador,
    valorContratado: c.contratado,
    // Liberado = contratado menos a taxa de originacao de 4% retida no desembolso.
    valorLiberado: Math.round(c.contratado * (1 - TARIFA_ORIGINACAO_PCT) * 100) / 100,
    vencimentoFinal: parcelas[parcelas.length - 1].vencimento,
    statusContrato: parcelas.some((p) => p.diasAtraso > 0) ? 'Em atraso' : 'Em andamento',
    parcelasPagas: c.pagas,
    parcelasEmAberto: emAberto.length,
    parcelasInadimplentes: parcelas.filter((p) => p.diasAtraso > 0).length,
    proximoVencimento: proxima ? proxima.vencimento : null,
    documentos: DOCUMENTOS_CONTRATO,
  };
}

const agendasPorContrato = new Map<string, ReturnType<typeof agendaDoContrato>>();
for (const chave of Object.keys(CARTEIRA) as ChaveContrato[]) {
  const agenda = agendaDoContrato(chave);
  agendasPorContrato.set(CONTRATO_UUID[chave], agenda);
  agendasPorContrato.set(chave, agenda);
}

// Pix Automatico: uma autorizacao ativa e uma aguardando o aceite do pagador, sobre contratos da carteira.
const agendaParaPix = (contratoId: string) =>
  agendasPorContrato.get(contratoId) as unknown as AgendaPagamentoResponse | undefined;
const SEMENTES_PIX = {
  ativa: CONTRATO_UUID['5b771c03'],
  pendente: CONTRATO_UUID['5b771c06'],
};
semearPix(agendaParaPix, SEMENTES_PIX);

// Segredo TOTP do dev-offline (Mockup 34). O desenho traz uma chave com 0/1/8/9, que nao
// existem no alfabeto Base32 (A-Z e 2-7); aqui a chave e valida de verdade. Ainda assim o
// codigo aceito e fixo: nenhum aplicativo autenticador real vai gerar o mesmo numero.
const TOTP_SECRET = 'JBSWY3DPK5Q6V7HZM4PLR2NXW7T3Y6DF';

// Estado do step-up do dev-offline (Mockup 33): desafios abertos, o codigo TOTP aceito e
// os codigos de backup de uso unico.
const stepUpDesafios = new Set<string>();
const STEP_UP_TOTP = '123456';
const STEP_UP_BACKUP = new Set(['SEP-BACKUP-01', 'SEP-BACKUP-02', 'SEP-BACKUP-03']);
let stepUpSeq = 0;

// Idempotency-Key -> { hash do payload, resposta original } para detectar replay vs conflito.
const recebimentoPorChave = new Map<string, { hash: string; response: Record<string, unknown> }>();
let recebimentoSeq = 0;
let eventoSeq = 0;

function novoId(prefixo: string, seq: number): string {
  return `${prefixo}-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

function renegociacaoFake(
  id: string,
  parcelaOriginalId: string,
  status: string,
  dados: {
    novoValorParcela: number;
    novoVencimento: string;
    numeroParcelas: number;
    desconto: number;
  },
  dataDecisao: string | null = null,
  agendaSubstitutaId: string | null = null,
) {
  return {
    id,
    parcelaOriginalId,
    agendaOriginalId: AGENDA_ID,
    tomadorId: TOMADOR_ID,
    status,
    statusParcelaAnterior: 'ATRASADA',
    novoValorParcela: dados.novoValorParcela,
    novoVencimento: dados.novoVencimento,
    numeroParcelas: dados.numeroParcelas,
    desconto: dados.desconto,
    propostaPor: adminUsuario.id,
    dataProposta: now,
    dataExpiracao: '2026-06-12T18:30:00-03:00',
    dataDecisao,
    agendaSubstitutaId,
  };
}

function seedRenegociacoes(): Record<string, ReturnType<typeof renegociacaoFake>> {
  return {
    [RENEG_PARA_ACEITE_ID]: renegociacaoFake(
      RENEG_PARA_ACEITE_ID,
      PARCELA_INADIMPLENTE_ID,
      'PROPOSTA',
      {
        novoValorParcela: 950.0,
        novoVencimento: '2026-07-10',
        numeroParcelas: 6,
        desconto: 50.0,
      },
    ),
    [RENEG_PARA_RECUSA_ID]: renegociacaoFake(
      RENEG_PARA_RECUSA_ID,
      PARCELA_ATRASADA_ID,
      'PROPOSTA',
      {
        novoValorParcela: 980.0,
        novoVencimento: '2026-07-10',
        numeroParcelas: 4,
        desconto: 20.0,
      },
    ),
    [RENEG_DECIDIDA_ID]: renegociacaoFake(
      RENEG_DECIDIDA_ID,
      PARCELA_PARA_RECEBIMENTO_ID,
      'ACEITA',
      { novoValorParcela: 900.0, novoVencimento: '2026-07-10', numeroParcelas: 3, desconto: 100.0 },
      now,
      AGENDA_SUBSTITUTA_ID,
    ),
  };
}

let renegociacoes = seedRenegociacoes();

// Restaura o estado mutavel da cobranca (as decisoes de renegociacao) para o seed. Passou a
// importar quando surgiu `GET /cobranca/renegociacoes`: antes so o proprio id decidido enxergava
// a mutacao, agora a listagem enxerga, e um teste de aceite mudaria a contagem do seguinte.
export function resetCobrancaState(): void {
  renegociacoes = seedRenegociacoes();
  semearPix(agendaParaPix, SEMENTES_PIX);
}

const cobrancaHandlers = [
  http.get(`${baseUrl}/cobranca/contratos/:contratoId/agenda`, ({ params }) => {
    const contratoId = params['contratoId'] as string;
    const path = `/api/v1/cobranca/contratos/${contratoId}/agenda`;
    if (contratoId === CONTRATO_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato de outro tomador', path);
    }
    const agenda = agendasPorContrato.get(contratoId);
    if (!agenda) {
      return errorResponse(404, 'Not Found', 'Agenda nao encontrada', path);
    }
    return HttpResponse.json(agenda);
  }),

  http.get(`${baseUrl}/cobranca/recebimentos`, () => HttpResponse.json(recebimentos)),

  http.get(`${baseUrl}/cobranca/inadimplencia`, ({ request }) => {
    const url = new URL(request.url);
    const min = url.searchParams.get('dias_atraso_min');
    const max = url.searchParams.get('dias_atraso_max');
    const status = url.searchParams.get('status');
    let linhas = inadimplenciaSeed;
    if (status) {
      linhas = linhas.filter((l) => l.status === status);
    }
    if (min) {
      linhas = linhas.filter((l) => l.diasAtraso >= Number(min));
    }
    if (max) {
      linhas = linhas.filter((l) => l.diasAtraso <= Number(max));
    }
    return HttpResponse.json(linhas);
  }),

  http.post(`${baseUrl}/cobranca/parcelas/:id/recebimentos`, async ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/cobranca/parcelas/${id}/recebimentos`;
    const chave = request.headers.get('Idempotency-Key');
    if (!chave || !IDEMPOTENCY_KEY_PATTERN.test(chave)) {
      return errorResponse(
        400,
        'Bad Request',
        "Header 'Idempotency-Key' ausente ou invalido",
        path,
      );
    }
    if (id === PARCELA_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Sem permissao para registrar recebimento', path);
    }
    const body = (await request.json()) as Record<string, unknown>;
    const hash = JSON.stringify(body);
    const anterior = recebimentoPorChave.get(chave);
    if (anterior) {
      if (anterior.hash !== hash) {
        return errorResponse(
          409,
          'Conflict',
          'Idempotency-Key reapresentada com payload divergente',
          path,
        );
      }
      return HttpResponse.json({ ...anterior.response, novo: false });
    }
    const detalhe = detalheParcela[id];
    if (!detalhe) {
      return errorResponse(404, 'Not Found', 'Parcela nao encontrada', path);
    }
    if (!STATUS_PERMITEM_RECEBIMENTO.includes(detalhe.status)) {
      return errorResponse(409, 'Conflict', 'Parcela em estado nao-recebivel', path);
    }
    recebimentoSeq += 1;
    const response = {
      recebimentoId: novoId('c0000000', recebimentoSeq),
      parcelaId: id,
      statusParcela: 'PARCIALMENTE_PAGA',
      valorRecebido: body['valorRecebido'],
      dataRecebimento: body['dataRecebimento'],
      meioPagamento: body['meioPagamento'],
      identificadorExterno: body['identificadorExterno'] ?? null,
      movimentacaoEscrowId: ESCROW_MOV_ID,
      novo: true,
    };
    recebimentoPorChave.set(chave, { hash, response });
    recebimentos.unshift(response);
    return HttpResponse.json(response, { status: 200 });
  }),

  http.post(`${baseUrl}/cobranca/parcelas/:id/contato`, async ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/cobranca/parcelas/${id}/contato`;
    const body = (await request.json()) as { descricao?: string; diasAtraso?: number };
    if (!body.descricao) {
      return errorResponse(400, 'Bad Request', 'descricao obrigatoria', path);
    }
    if (!detalheParcela[id]) {
      return errorResponse(404, 'Not Found', 'Parcela nao encontrada', path);
    }
    eventoSeq += 1;
    return HttpResponse.json(
      {
        id: novoId('d0000000', eventoSeq),
        parcelaId: id,
        tipo: 'CONTATO_MANUAL',
        canal: null,
        template: null,
        status: 'SUCESSO',
        diasAtraso: body.diasAtraso ?? null,
        descricao: body.descricao,
        registradoPor: adminUsuario.id,
        dataEvento: now,
      },
      { status: 201 },
    );
  }),

  http.post(`${baseUrl}/cobranca/parcelas/:id/renegociacao`, async ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/cobranca/parcelas/${id}/renegociacao`;
    if (!request.headers.get('X-Step-Up-Token')) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    const detalhe = detalheParcela[id];
    if (!detalhe) {
      return errorResponse(404, 'Not Found', 'Parcela nao encontrada', path);
    }
    if (id === PARCELA_RENEG_ATIVA_ID) {
      return errorResponse(409, 'Conflict', 'Ja existe renegociacao ativa pra parcela', path);
    }
    if (!STATUS_PERMITEM_RENEGOCIACAO.includes(detalhe.status)) {
      return errorResponse(409, 'Conflict', 'Parcela em estado nao-renegociavel', path);
    }
    const body = (await request.json()) as {
      novoValorParcela: number;
      novoVencimento: string;
      numeroParcelas: number;
      desconto: number;
    };
    return HttpResponse.json(renegociacaoFake(RENEG_CRIADA_ID, id, 'PROPOSTA', body), {
      status: 201,
    });
  }),

  // Listagem da carteira de renegociacoes. Existia so a consulta por id, entao o painel da
  // Cobranca anunciava um total digitado no HTML. Filtro opcional por status, no mesmo formato dos
  // demais filtros de listagem (query param simples, valor do enum).
  http.get(`${baseUrl}/cobranca/renegociacoes`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const todas = Object.values(renegociacoes);
    return HttpResponse.json(status ? todas.filter((r) => r.status === status) : todas);
  }),

  http.patch(`${baseUrl}/cobranca/renegociacoes/:id/aceite`, ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/cobranca/renegociacoes/${id}/aceite`;
    if (!request.headers.get('X-Step-Up-Token')) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    const renegociacao = renegociacoes[id];
    if (!renegociacao) {
      return errorResponse(404, 'Not Found', 'Renegociacao nao encontrada', path);
    }
    if (renegociacao.status !== 'PROPOSTA') {
      return errorResponse(409, 'Conflict', 'Renegociacao ja decidida ou expirada', path);
    }
    renegociacao.status = 'ACEITA';
    renegociacao.dataDecisao = now;
    renegociacao.agendaSubstitutaId = AGENDA_SUBSTITUTA_ID;
    return HttpResponse.json(renegociacao);
  }),

  http.patch(`${baseUrl}/cobranca/renegociacoes/:id/recusa`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/cobranca/renegociacoes/${id}/recusa`;
    const renegociacao = renegociacoes[id];
    if (!renegociacao) {
      return errorResponse(404, 'Not Found', 'Renegociacao nao encontrada', path);
    }
    if (renegociacao.status !== 'PROPOSTA') {
      return errorResponse(409, 'Conflict', 'Renegociacao ja decidida ou expirada', path);
    }
    renegociacao.status = 'RECUSADA';
    renegociacao.dataDecisao = now;
    return HttpResponse.json(renegociacao);
  }),

  // Por id mantido por ultimo: as rotas com sub-segmento (/recebimentos, /contato,
  // /renegociacao) ja casaram por metodo/caminho antes deste GET de detalhe.
  http.get(`${baseUrl}/cobranca/parcelas/:id`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/cobranca/parcelas/${id}`;
    if (id === PARCELA_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Parcela de contrato de outro tomador', path);
    }
    const detalhe = detalheParcela[id];
    if (!detalhe) {
      return errorResponse(404, 'Not Found', 'Parcela nao encontrada', path);
    }
    return HttpResponse.json(detalhe);
  }),
];

// Mocks alinhados ao PRD §21 (contratos iniciais dos endpoints).
// Sucesso login usa admin@empresa.com / 123456.
// 401: credenciais invalidas. 409: cadastro com duplicado@empresa.com.
// --- Backoffice e financeiro operacional (F-Sprint 10 / backend Sprint 14 + Pix 20-21) ---
// Identificadores deterministicos para dev-offline e specs do BackofficeService. Fixtures
// nao guardam payload bruto de webhook/provider, CPF/CNPJ completo, chave Pix, dados
// bancarios ou tokens — apenas ids, status e textos operacionais.
const ITEM_ABERTO_ID = 'c0000000-0000-4000-8000-000000000001'; // ABERTO / WEBHOOK_FALHOU
const ITEM_EM_TRATAMENTO_ID = 'c0000000-0000-4000-8000-000000000002'; // EM_TRATAMENTO / COBRANCA_INADIMPLENTE
const ITEM_RESOLVIDO_ID = 'c0000000-0000-4000-8000-000000000003'; // RESOLVIDO (final)
const ITEM_IGNORADO_ID = 'c0000000-0000-4000-8000-000000000004'; // IGNORADO (final)
const ITEM_DESEMBOLSO_PIX_ID = 'c0000000-0000-4000-8000-000000000005'; // ABERTO / DESEMBOLSO_PIX_FALHOU
const ITEM_RECEBIMENTO_PIX_ID = 'c0000000-0000-4000-8000-000000000006'; // ABERTO / RECEBIMENTO_PIX_DIVERGENTE
// id 'c0000000-...-0000000000aa' (usado nas specs) cai no 404 generico de item nao encontrado.
const WEBHOOK_EVENT_ID = 'd0000000-0000-4000-8000-000000000001';
// Entidade do item de fila DESEMBOLSO_PIX_FALHOU: precisa ser um id de transferencia real, e nao
// um id proprio de evento. Com o id antigo ('d0000000-...-002') o atalho "Reconsultar status" das
// Divergencias caia em "Desembolso nao encontrado". Aponta para a transferencia com provider
// indisponivel, coerente com a falha que abriu o item.
const PIX_ENTIDADE_ID = 'e0000000-0000-4000-8000-000000000003';

const TIPOS_CHAMADA_PROVIDER = [
  'KYC',
  'KYB',
  'PLD',
  'OPEN_FINANCE',
  'ASSINATURA_DIGITAL',
  'PIX_TRANSFERENCIA',
];

const itensFilaFake = [
  {
    id: ITEM_ABERTO_ID,
    tipo: 'WEBHOOK_FALHOU',
    prioridade: 'ALTA',
    status: 'ABERTO',
    tipoEntidade: 'WEBHOOK_EVENT_LOG',
    entidadeId: WEBHOOK_EVENT_ID,
    titulo: 'Webhook celcoin/kyc falhou no processamento',
    atribuidoA: null,
    dataAbertura: '2026-06-06T09:00:00-03:00',
    dataResolucao: null,
  },
  {
    id: ITEM_EM_TRATAMENTO_ID,
    tipo: 'COBRANCA_INADIMPLENTE',
    prioridade: 'CRITICA',
    status: 'EM_TRATAMENTO',
    tipoEntidade: 'PARCELA_COBRANCA',
    entidadeId: 'a0000000-0000-4000-8000-000000000002',
    titulo: 'Parcela inadimplente ha 35 dias',
    atribuidoA: backofficeUsuario.id,
    dataAbertura: '2026-06-05T11:30:00-03:00',
    dataResolucao: null,
  },
  {
    id: ITEM_RESOLVIDO_ID,
    tipo: 'ONBOARDING_PENDENTE',
    prioridade: 'MEDIA',
    status: 'RESOLVIDO',
    tipoEntidade: 'ONBOARDING',
    entidadeId: '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01',
    titulo: 'Onboarding aguardando revisao manual',
    atribuidoA: financeiroUsuario.id,
    dataAbertura: '2026-06-03T08:15:00-03:00',
    dataResolucao: '2026-06-04T16:40:00-03:00',
  },
  {
    id: ITEM_IGNORADO_ID,
    tipo: 'OUTRO',
    prioridade: 'BAIXA',
    status: 'IGNORADO',
    tipoEntidade: 'OUTRO',
    entidadeId: 'e0000000-0000-4000-8000-000000000009',
    titulo: 'Item duplicado de outro fluxo',
    atribuidoA: backofficeUsuario.id,
    dataAbertura: '2026-06-02T14:00:00-03:00',
    dataResolucao: '2026-06-02T15:10:00-03:00',
  },
  {
    id: ITEM_DESEMBOLSO_PIX_ID,
    tipo: 'DESEMBOLSO_PIX_FALHOU',
    prioridade: 'ALTA',
    status: 'ABERTO',
    tipoEntidade: 'PIX_TRANSFERENCIA',
    entidadeId: PIX_ENTIDADE_ID,
    titulo: 'Desembolso Pix retornou falha do provedor',
    atribuidoA: null,
    dataAbertura: '2026-06-06T10:20:00-03:00',
    dataResolucao: null,
  },
  {
    id: ITEM_RECEBIMENTO_PIX_ID,
    tipo: 'RECEBIMENTO_PIX_DIVERGENTE',
    prioridade: 'ALTA',
    status: 'ABERTO',
    tipoEntidade: 'PIX_RECEBIMENTO',
    entidadeId: 'e2000000-0000-4000-8000-000000000002',
    titulo: 'Recebimento Pix sem referencia identificada',
    atribuidoA: null,
    dataAbertura: '2026-06-06T10:40:00-03:00',
    dataResolucao: null,
  },
];

const comentariosPorItem: Record<string, unknown[]> = {
  [ITEM_EM_TRATAMENTO_ID]: [
    {
      id: 'f0000000-0000-4000-8000-000000000001',
      autorId: backofficeUsuario.id,
      conteudo: 'Tomador contatado; aguardando comprovante.',
      dataCriacao: '2026-06-05T12:00:00-03:00',
    },
  ],
};

const objetoOriginalPorItem: Record<string, unknown> = {
  [ITEM_ABERTO_ID]: {
    tipoEntidade: 'WEBHOOK_EVENT_LOG',
    entidadeId: WEBHOOK_EVENT_ID,
    status: 'FALHOU',
    descricaoCurta: 'Evento celcoin/kyc nao processado',
  },
  [ITEM_EM_TRATAMENTO_ID]: {
    tipoEntidade: 'PARCELA_COBRANCA',
    entidadeId: 'a0000000-0000-4000-8000-000000000002',
    status: 'INADIMPLENTE',
    descricaoCurta: 'Parcela 3/12 vencida',
  },
  [ITEM_DESEMBOLSO_PIX_ID]: {
    tipoEntidade: 'PIX_TRANSFERENCIA',
    entidadeId: PIX_ENTIDADE_ID,
    status: 'FALHOU',
    descricaoCurta: 'Transferencia Pix recusada pelo provedor',
  },
};

// Anti-abuso 429: conta reprocessos por entidade (reinicia a cada carga do modulo).
const contadorReprocessos = new Map<string, number>();

// Interruptor de falha so do mock, para conferir os estados de erro das telas sem backend real
// (o MSW responde no service worker, entao bloquear a requisicao pelo DevTools nao funciona).
// Duas formas de ligar, ambas aceitando varias chaves separadas por virgula:
// - URL: /app/pix/divergencias?mock_erro=fila-pix
// - console: localStorage.setItem('SEP_MOCK_ERRO', 'fila-pix')
// O sufixo `:once` falha so na primeira carga da pagina: a tela abre no painel de erro e o botao
// "Tentar novamente" ja devolve o estado normal, sem mexer na URL nem no console.
const errosSimuladosConsumidos = new Set<string>();

function chavesErroSimulado(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const doStorage = window.localStorage?.getItem('SEP_MOCK_ERRO') ?? '';
  const daUrl = new URLSearchParams(window.location.search).get('mock_erro') ?? '';
  return `${doStorage},${daUrl}`
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Nao afeta os testes: sem chave ligada, e sempre false.
function erroSimulado(chave: string): boolean {
  const chaves = chavesErroSimulado();
  if (chaves.includes(chave)) {
    return true;
  }
  const umaVez = `${chave}:once`;
  if (chaves.includes(umaVez) && !errosSimuladosConsumidos.has(umaVez)) {
    errosSimuladosConsumidos.add(umaVez);
    return true;
  }
  return false;
}

// Espelha @PreAuthorize do backend: CLIENTE nao acessa o backoffice.
function negarSeNaoOperador(path: string) {
  if (currentMockUser.role === 'CLIENTE') {
    return errorResponse(403, 'Forbidden', 'Sem permissao para o backoffice', path);
  }
  return null;
}

// @RequireStepUp no backend: sem X-Step-Up-Token o aspecto barra antes da regra.
function faltaStepUp(request: Request): boolean {
  return !request.headers.get('X-Step-Up-Token');
}

// Ordena por dataAbertura (asc/desc) no formato Spring "campo,dir"; demais campos sao
// mantidos na ordem original (o backend nao garante sort lexicografico de prioridade).
function ordenarFila<T extends { dataAbertura: string }>(itens: T[], sort: string | null): T[] {
  if (!sort) {
    return itens;
  }
  const [campo, dir] = sort.split(',');
  if (campo !== 'dataAbertura') {
    return itens;
  }
  const fator = dir === 'desc' ? -1 : 1;
  return [...itens].sort(
    (a, b) => fator * (new Date(a.dataAbertura).getTime() - new Date(b.dataAbertura).getTime()),
  );
}

// Sequencia de comentarios criados no dev-offline para gerar ids unicos.
let comentarioSeq = 0;

function paginar<T>(itens: T[], page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(itens.length / size));
  const inicio = page * size;
  const slice = itens.slice(inicio, inicio + size);
  return {
    content: slice,
    totalElements: itens.length,
    totalPages,
    number: page,
    size,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: slice.length,
    empty: slice.length === 0,
  };
}

const backofficeHandlers = [
  http.get(`${baseUrl}/backoffice/dashboard-operacional`, () => {
    const negado = negarSeNaoOperador('/api/v1/backoffice/dashboard-operacional');
    if (negado) {
      return negado;
    }
    return HttpResponse.json(buildOperationalDashboardSnapshot(operationalDashboardStore), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }),

  http.get(`${baseUrl}/backoffice/dashboard`, () => {
    const negado = negarSeNaoOperador('/api/v1/backoffice/dashboard');
    if (negado) {
      return negado;
    }
    return HttpResponse.json(
      {
        contadoresPorTipo: [
          { tipo: 'WEBHOOK_FALHOU', total: 3 },
          { tipo: 'COBRANCA_INADIMPLENTE', total: 5 },
          { tipo: 'DESEMBOLSO_PIX_FALHOU', total: 1 },
          { tipo: 'ONBOARDING_PENDENTE', total: 2 },
        ],
        contadoresPorPrioridade: [
          { prioridade: 'CRITICA', total: 2 },
          { prioridade: 'ALTA', total: 4 },
          { prioridade: 'MEDIA', total: 3 },
          { prioridade: 'BAIXA', total: 2 },
        ],
        contadoresPorStatus: [
          { status: 'ABERTO', total: 6 },
          { status: 'EM_TRATAMENTO', total: 3 },
          { status: 'RESOLVIDO', total: 10 },
          { status: 'IGNORADO', total: 4 },
        ],
        tempoMedioResolucao30d: 7200,
        itensCriticosAbertosMais48h: 2,
        topCincoTiposMaisFrequentes: [
          { tipo: 'COBRANCA_INADIMPLENTE', total: 5 },
          { tipo: 'WEBHOOK_FALHOU', total: 3 },
          { tipo: 'ONBOARDING_PENDENTE', total: 2 },
        ],
        recebimentosDoDia: RECEBIMENTOS_ULTIMO_DIA,
        inadimplenciaTotal: {
          valorTotal: INADIMPLENCIA_CARTEIRA.valorTotal,
          numeroParcelas: INADIMPLENCIA_CARTEIRA.numeroParcelas,
        },
        propostasPorStatus: [
          { status: 'EM_ANALISE', total: 4 },
          { status: 'APROVADA', total: 7 },
          { status: 'REPROVADA', total: 1 },
        ],
        geradoEm: now,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }),

  http.get(`${baseUrl}/backoffice/fila`, ({ request }) => {
    const negado = negarSeNaoOperador('/api/v1/backoffice/fila');
    if (negado) {
      return negado;
    }
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const tipo = url.searchParams.get('tipo');
    const prioridade = url.searchParams.get('prioridade');

    // Estado de erro das telas Pix (divergencias): SEP_MOCK_ERRO=fila-pix.
    if (erroSimulado('fila-pix') && tipo?.includes('PIX')) {
      return errorResponse(
        503,
        'Service Unavailable',
        'Erro ao obter dados do provider Pix. Timeout excedido.',
        '/api/v1/backoffice/fila',
      );
    }
    const dataDe = url.searchParams.get('data_abertura_de');
    const dataAte = url.searchParams.get('data_abertura_ate');
    const atribuidoA = url.searchParams.get('atribuido_a');
    const sort = url.searchParams.get('sort');
    const page = Number(url.searchParams.get('page') ?? '0');
    const size = Number(url.searchParams.get('size') ?? '20');

    const filtrados = itensFilaFake.filter(
      (item) =>
        (!status || item.status === status) &&
        (!tipo || item.tipo === tipo) &&
        (!prioridade || item.prioridade === prioridade) &&
        (!atribuidoA || item.atribuidoA === atribuidoA) &&
        (!dataDe || new Date(item.dataAbertura).getTime() >= new Date(dataDe).getTime()) &&
        (!dataAte || new Date(item.dataAbertura).getTime() <= new Date(dataAte).getTime()),
    );
    // Sort no formato Spring (campo,dir). O backend remove sort por prioridade (VARCHAR);
    // o mock so ordena por dataAbertura, espelhando o que o backend garante.
    const ordenados = ordenarFila(filtrados, sort);
    return HttpResponse.json(paginar(ordenados, page, size));
  }),

  http.get(`${baseUrl}/backoffice/fila/:id`, ({ params }) => {
    const id = params['id'] as string;
    const negado = negarSeNaoOperador(`/api/v1/backoffice/fila/${id}`);
    if (negado) {
      return negado;
    }
    const item = itensFilaFake.find((i) => i.id === id);
    if (!item) {
      return errorResponse(
        404,
        'Not Found',
        'Item nao encontrado',
        `/api/v1/backoffice/fila/${id}`,
      );
    }
    return HttpResponse.json({
      ...item,
      descricao: `Detalhe operacional do item ${item.tipo}.`,
      comentarios: comentariosPorItem[id] ?? [],
      objetoOriginal: objetoOriginalPorItem[id] ?? null,
    });
  }),

  http.post(`${baseUrl}/backoffice/fila/:id/assumir`, ({ params }) => {
    const id = params['id'] as string;
    const negado = negarSeNaoOperador(`/api/v1/backoffice/fila/${id}/assumir`);
    if (negado) {
      return negado;
    }
    const item = itensFilaFake.find((i) => i.id === id);
    if (!item) {
      return errorResponse(
        404,
        'Not Found',
        'Item nao encontrado',
        `/api/v1/backoffice/fila/${id}/assumir`,
      );
    }
    if (item.status !== 'ABERTO') {
      return errorResponse(
        409,
        'Conflict',
        'Item nao esta ABERTO',
        `/api/v1/backoffice/fila/${id}/assumir`,
      );
    }
    // Persiste a transicao para a base offline refletir o estado em reloads de lista/detalhe.
    item.status = 'EM_TRATAMENTO';
    item.atribuidoA = currentMockUser.id;
    return HttpResponse.json(item);
  }),

  http.post(`${baseUrl}/backoffice/fila/:id/comentarios`, async ({ params, request }) => {
    const id = params['id'] as string;
    const negado = negarSeNaoOperador(`/api/v1/backoffice/fila/${id}/comentarios`);
    if (negado) {
      return negado;
    }
    if (!itensFilaFake.some((i) => i.id === id)) {
      return errorResponse(
        404,
        'Not Found',
        'Item nao encontrado',
        `/api/v1/backoffice/fila/${id}/comentarios`,
      );
    }
    const body = (await request.json()) as { conteudo?: string };
    if (!body.conteudo || body.conteudo.trim().length === 0) {
      return errorResponse(
        400,
        'Bad Request',
        'Conteudo do comentario e obrigatorio',
        `/api/v1/backoffice/fila/${id}/comentarios`,
      );
    }
    comentarioSeq += 1;
    const comentario = {
      id: `f0000000-0000-4000-8000-${String(comentarioSeq).padStart(12, '0')}`,
      autorId: currentMockUser.id,
      conteudo: body.conteudo,
      dataCriacao: now,
    };
    // Persiste para o comentario aparecer no detalhe em reloads da base offline.
    (comentariosPorItem[id] ??= []).push(comentario);
    return HttpResponse.json(comentario, { status: 201 });
  }),

  http.patch(`${baseUrl}/backoffice/fila/:id/resolver`, async ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/backoffice/fila/${id}/resolver`;
    const negado = negarSeNaoOperador(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    const item = itensFilaFake.find((i) => i.id === id);
    if (!item) {
      return errorResponse(404, 'Not Found', 'Item nao encontrado', path);
    }
    const body = (await request.json()) as { justificativa?: string };
    if (!body.justificativa || body.justificativa.trim().length < 20) {
      return errorResponse(400, 'Bad Request', 'Justificativa minima de 20 caracteres', path);
    }
    if (item.status !== 'EM_TRATAMENTO') {
      return errorResponse(409, 'Conflict', 'Item nao esta em EM_TRATAMENTO', path);
    }
    item.status = 'RESOLVIDO';
    item.dataResolucao = now;
    return HttpResponse.json(item);
  }),

  http.patch(`${baseUrl}/backoffice/fila/:id/ignorar`, async ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/backoffice/fila/${id}/ignorar`;
    const negado = negarSeNaoOperador(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    const item = itensFilaFake.find((i) => i.id === id);
    if (!item) {
      return errorResponse(404, 'Not Found', 'Item nao encontrado', path);
    }
    const body = (await request.json()) as { justificativa?: string };
    if (!body.justificativa || body.justificativa.trim().length < 20) {
      return errorResponse(400, 'Bad Request', 'Justificativa minima de 20 caracteres', path);
    }
    if (item.status === 'RESOLVIDO' || item.status === 'IGNORADO') {
      return errorResponse(409, 'Conflict', 'Item ja esta em status final', path);
    }
    item.status = 'IGNORADO';
    item.dataResolucao = now;
    return HttpResponse.json(item);
  }),

  http.post(
    `${baseUrl}/backoffice/reprocessos/webhook/:webhookEventId`,
    async ({ params, request }) => {
      const webhookEventId = params['webhookEventId'] as string;
      const path = `/api/v1/backoffice/reprocessos/webhook/${webhookEventId}`;
      const negado = negarSeNaoOperador(path);
      if (negado) {
        return negado;
      }
      if (faltaStepUp(request)) {
        return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
      }
      const chave = `webhook:${webhookEventId}`;
      const usos = contadorReprocessos.get(chave) ?? 0;
      if (usos >= 3) {
        return errorResponse(429, 'Too Many Requests', 'Limite anti-abuso 3/24h excedido', path);
      }
      contadorReprocessos.set(chave, usos + 1);
      const body = (await request.json().catch(() => ({}))) as { itemId?: string };
      return HttpResponse.json(
        {
          id: 'a1000000-0000-4000-8000-000000000001',
          itemId: body.itemId ?? null,
          tipo: 'WEBHOOK',
          tipoChamada: null,
          identificadorExterno: webhookEventId,
          status: 'SUCESSO',
          resultado: 'Webhook reenfileirado para reprocessamento',
          dataDisparo: now,
          disparadoPor: currentMockUser.id,
        },
        { status: 201 },
      );
    },
  ),

  http.post(
    `${baseUrl}/backoffice/reprocessos/provider/:tipoChamada/:entidadeId`,
    async ({ params, request }) => {
      const tipoChamada = params['tipoChamada'] as string;
      const entidadeId = params['entidadeId'] as string;
      const path = `/api/v1/backoffice/reprocessos/provider/${tipoChamada}/${entidadeId}`;
      const negado = negarSeNaoOperador(path);
      if (negado) {
        return negado;
      }
      if (faltaStepUp(request)) {
        return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
      }
      if (!TIPOS_CHAMADA_PROVIDER.includes(tipoChamada)) {
        return errorResponse(400, 'Bad Request', 'tipoChamada nao suportado', path);
      }
      const chave = `provider:${tipoChamada}:${entidadeId}`;
      const usos = contadorReprocessos.get(chave) ?? 0;
      if (usos >= 3) {
        return errorResponse(429, 'Too Many Requests', 'Limite anti-abuso 3/24h excedido', path);
      }
      contadorReprocessos.set(chave, usos + 1);
      const body = (await request.json().catch(() => ({}))) as { itemId?: string };
      // PIX_TRANSFERENCIA tem handler real (reconsulta de status); os demais sao stubs no
      // backend — sinalizamos sem prometer retentativa real.
      const handlerReal = tipoChamada === 'PIX_TRANSFERENCIA';
      return HttpResponse.json(
        {
          id: 'a1000000-0000-4000-8000-000000000002',
          itemId: body.itemId ?? null,
          tipo: 'PROVIDER',
          tipoChamada,
          identificadorExterno: entidadeId,
          status: handlerReal ? 'SUCESSO' : 'PENDENTE',
          resultado: handlerReal
            ? 'Status da transferencia reconsultado no provedor'
            : 'Estrategia de reprocesso ainda nao implementada no backend',
          dataDisparo: now,
          disparadoPor: currentMockUser.id,
        },
        { status: 201 },
      );
    },
  ),
];

// --- Governanca: roles cumulativas + parametros operacionais (F-Sprint 12 / backend Sprint 18) ---
// Toda a area e ADMIN-only (hasRole('ADMIN')), inclusive leitura. Mutacoes exigem step-up
// (@RequireStepUp): sem X-Step-Up-Token o backend responde 403 antes da regra. Regras de
// auto-protecao replicadas para o dev-offline: ADMIN nao altera as proprias roles (403) e a
// ultima role nao pode ser removida (400).

// Precedencia resolvida no backend; replicada aqui so para derivar a role principal offline.
const PRECEDENCIA_ROLE = ['ADMIN', 'FINANCEIRO', 'BACKOFFICE', 'CLIENTE'];
function principalDe(roles: string[]): string {
  return PRECEDENCIA_ROLE.find((r) => roles.includes(r)) ?? roles[0];
}

// Conjunto cumulativo por usuario (id -> roles), coerente com a role principal dos fakes.
function seedRolesPorUsuario(): Record<string, string[]> {
  return {
    [adminUsuario.id]: ['ADMIN'],
    [clienteUsuario.id]: ['CLIENTE'],
    [financeiroUsuario.id]: ['FINANCEIRO'],
    [backofficeUsuario.id]: ['BACKOFFICE'],
    [multiroleUsuario.id]: ['FINANCEIRO', 'BACKOFFICE'],
  };
}
let rolesPorUsuario = seedRolesPorUsuario();

function rolesResponse(id: string) {
  const roles = rolesPorUsuario[id];
  return { roles, principal: principalDe(roles) };
}

// Espelha hasRole('ADMIN'): nenhuma role interna ou CLIENTE acessa a governanca.
function negarSeNaoAdmin(path: string) {
  if (currentMockUser.role !== 'ADMIN') {
    return errorResponse(403, 'Forbidden', 'Apenas ADMIN acessa a governanca', path);
  }
  return null;
}

// Seed fiel ao V43 (Sprint 18): todos INTEGER/DECIMAL, valor textual tipado, ativo, versao 1.
// id deterministico por posicao (parametroSeq reinicia em cada seed) para estabilidade.
let parametroSeq = 0;
function parametro(chave: string, tipo: string, valor: string, descricao: string, versao = 1) {
  parametroSeq += 1;
  return {
    id: `5f0799c0-0000-4000-8000-${String(parametroSeq).padStart(12, '0')}`,
    chave,
    tipo,
    valor,
    descricao,
    ativo: true,
    versao,
    dataModificacao: now,
  };
}

function seedParametros() {
  parametroSeq = 0;
  return [
    // Teto do regimento do SEP: nenhuma proposta pode passar de R$ 15.000,00, PF ou PJ.
    parametro('credito.valor.maximo.pf', 'DECIMAL', '15000.00', 'Valor maximo de proposta para PF'),
    parametro('credito.valor.maximo.pj', 'DECIMAL', '15000.00', 'Valor maximo de proposta para PJ'),
    parametro('credito.prazo.maximo.pf.meses', 'INTEGER', '12', 'Prazo maximo em meses para PF'),
    parametro('credito.prazo.maximo.pj.meses', 'INTEGER', '24', 'Prazo maximo em meses para PJ'),
    // versao 3 com historico de 2 alteracoes para exercitar a trilha auditavel (F-12.4/F-12.5).
    parametro(
      'credito.score.pre-aprovacao',
      'INTEGER',
      '700',
      'Score minimo para pre-aprovacao no motor de credito',
      3,
    ),
    parametro(
      'backoffice.proposta.pendente.horas',
      'INTEGER',
      '24',
      'Limite (h) para proposta EM_ANALISE virar pendencia',
    ),
    parametro(
      'backoffice.contrato.aceito.horas',
      'INTEGER',
      '48',
      'Limite (h) para contrato ACEITO sem assinatura virar pendencia',
    ),
    parametro(
      'backoffice.webhook.pendente.horas',
      'INTEGER',
      '1',
      'Limite (h) para webhook FALHOU/PENDENTE virar pendencia',
    ),
    parametro(
      'credito.open-finance.bonus.entradas.altas',
      'INTEGER',
      '200',
      'Bonus de score (entradas >= 3x parcela) no motor Open Finance',
    ),
    parametro(
      'credito.open-finance.bonus.entradas.minimas',
      'INTEGER',
      '100',
      'Bonus de score (entradas >= 1x parcela) no motor Open Finance',
    ),
    parametro(
      'credito.open-finance.penalidade.saldo.negativo',
      'INTEGER',
      '150',
      'Penalidade de score por saldo medio negativo recorrente',
    ),
  ];
}
let parametrosFake = seedParametros();

// Historico imutavel por chave (mais recente primeiro). A versao da entrada e a versao
// resultante apos a alteracao; valorAnterior e null apenas na versao inicial (nao gravada).
function versaoParametro(
  versao: number,
  valorAnterior: string | null,
  valorNovo: string,
  justificativa: string,
) {
  return {
    versao,
    valorAnterior,
    valorNovo,
    atorId: adminUsuario.id,
    justificativa,
    dataCriacao: now,
  };
}

function seedHistorico(): Record<string, ReturnType<typeof versaoParametro>[]> {
  return {
    'credito.score.pre-aprovacao': [
      versaoParametro(3, '720', '700', 'Retorno ao score padrao apos revisao de risco.'),
      versaoParametro(2, '700', '720', 'Aperto temporario em janela de maior inadimplencia.'),
    ],
  };
}
let historicoPorChave = seedHistorico();

// Espelha TipoParametroOperacional.aceita (backend): trim em todos; INTEGER em range de int;
// DECIMAL via BigDecimal (sinal, decimais, notacao cientifica); BOOLEAN case-insensitive.
function valorValidoParaTipo(tipo: string, valor: string): boolean {
  const v = valor.trim();
  switch (tipo) {
    case 'INTEGER': {
      if (!/^[+-]?\d+$/.test(v)) {
        return false;
      }
      const n = Number(v);
      return n >= -2147483648 && n <= 2147483647;
    }
    case 'DECIMAL':
      return /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(v);
    case 'BOOLEAN':
      return /^(true|false)$/i.test(v);
    default:
      return v.length > 0;
  }
}

// Restaura o estado mutavel da governanca (roles, parametros, historico) para o seed.
// Usado pelos testes para garantir independencia (F.I.R.S.T.) ao exercitar mutacoes 200.
export function resetGovernancaState(): void {
  for (const criado of usuariosFake.splice(QTD_USUARIOS_SEED)) {
    delete loginUsuarios[criado.username];
    delete senhasPorUsuario[criado.username];
  }
  usuariosCriados = 0;
  rolesPorUsuario = seedRolesPorUsuario();
  parametrosFake = seedParametros();
  historicoPorChave = seedHistorico();
}

const governancaHandlers = [
  http.get(`${baseUrl}/usuarios/:id/roles`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/usuarios/${id}/roles`;
    const negado = negarSeNaoAdmin(path);
    if (negado) {
      return negado;
    }
    if (!rolesPorUsuario[id]) {
      return errorResponse(404, 'Not Found', 'usuário não encontrado', path);
    }
    return HttpResponse.json(rolesResponse(id));
  }),

  http.put(`${baseUrl}/usuarios/:id/roles`, async ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/usuarios/${id}/roles`;
    const negado = negarSeNaoAdmin(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    // Ordem identica ao backend (GerenciarRolesUsuarioUseCase.substituir): conjunto vazio (400)
    // antes da auto-protecao (403) e da existencia do alvo (404).
    const body = (await request.json()) as { roles?: string[] };
    if (!body.roles || body.roles.length === 0) {
      return errorResponse(400, 'Bad Request', 'Conjunto de roles nao pode ser vazio', path);
    }
    if (id === currentMockUser.id) {
      return errorResponse(403, 'Forbidden', 'Nao e permitido alterar as proprias roles', path);
    }
    if (!rolesPorUsuario[id]) {
      return errorResponse(404, 'Not Found', 'usuário não encontrado', path);
    }
    rolesPorUsuario[id] = [...new Set(body.roles)];
    // O perfil exibido na lista e no detalhe acompanha a role principal, como no backend.
    const alvo = usuariosFake.find((u) => u.id === id);
    if (alvo) alvo.role = principalDe(rolesPorUsuario[id]);
    return HttpResponse.json(rolesResponse(id));
  }),

  http.post(`${baseUrl}/usuarios/:id/roles/:role`, ({ params, request }) => {
    const id = params['id'] as string;
    const role = params['role'] as string;
    const path = `/api/v1/usuarios/${id}/roles/${role}`;
    const negado = negarSeNaoAdmin(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    if (id === currentMockUser.id) {
      return errorResponse(403, 'Forbidden', 'Nao e permitido alterar as proprias roles', path);
    }
    if (!rolesPorUsuario[id]) {
      return errorResponse(404, 'Not Found', 'usuário não encontrado', path);
    }
    rolesPorUsuario[id] = [...new Set([...rolesPorUsuario[id], role])];
    return HttpResponse.json(rolesResponse(id));
  }),

  http.delete(`${baseUrl}/usuarios/:id/roles/:role`, ({ params, request }) => {
    const id = params['id'] as string;
    const role = params['role'] as string;
    const path = `/api/v1/usuarios/${id}/roles/${role}`;
    const negado = negarSeNaoAdmin(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    if (id === currentMockUser.id) {
      return errorResponse(403, 'Forbidden', 'Nao e permitido alterar as proprias roles', path);
    }
    if (!rolesPorUsuario[id]) {
      return errorResponse(404, 'Not Found', 'usuário não encontrado', path);
    }
    const atuais = rolesPorUsuario[id];
    if (atuais.length <= 1 && atuais.includes(role)) {
      return errorResponse(400, 'Bad Request', 'Nao e possivel remover a ultima role', path);
    }
    rolesPorUsuario[id] = atuais.filter((r) => r !== role);
    return HttpResponse.json(rolesResponse(id));
  }),

  http.get(`${baseUrl}/governanca/parametros`, () => {
    const path = '/api/v1/governanca/parametros';
    const negado = negarSeNaoAdmin(path);
    if (negado) {
      return negado;
    }
    return HttpResponse.json(parametrosFake);
  }),

  http.get(`${baseUrl}/governanca/parametros/:chave`, ({ params }) => {
    const chave = params['chave'] as string;
    const path = `/api/v1/governanca/parametros/${chave}`;
    const negado = negarSeNaoAdmin(path);
    if (negado) {
      return negado;
    }
    const parametroAtual = parametrosFake.find((p) => p.chave === chave);
    if (!parametroAtual) {
      return errorResponse(404, 'Not Found', 'parametro nao encontrado', path);
    }
    return HttpResponse.json({
      parametro: parametroAtual,
      historico: historicoPorChave[chave] ?? [],
    });
  }),

  http.patch(`${baseUrl}/governanca/parametros/:chave`, async ({ params, request }) => {
    const chave = params['chave'] as string;
    const path = `/api/v1/governanca/parametros/${chave}`;
    const negado = negarSeNaoAdmin(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    const parametroAtual = parametrosFake.find((p) => p.chave === chave);
    if (!parametroAtual) {
      return errorResponse(404, 'Not Found', 'parametro nao encontrado', path);
    }
    const body = (await request.json()) as { novoValor?: string; justificativa?: string };
    if (!body.justificativa || body.justificativa.trim().length === 0) {
      return errorResponse(400, 'Bad Request', 'Justificativa obrigatoria', path);
    }
    if (!body.novoValor || !valorValidoParaTipo(parametroAtual.tipo, body.novoValor)) {
      return errorResponse(
        400,
        'Bad Request',
        `Valor invalido para o tipo ${parametroAtual.tipo}`,
        path,
      );
    }
    const anterior = parametroAtual.valor;
    parametroAtual.valor = body.novoValor;
    parametroAtual.versao += 1;
    (historicoPorChave[chave] ??= []).unshift(
      versaoParametro(parametroAtual.versao, anterior, body.novoValor, body.justificativa),
    );
    return HttpResponse.json(parametroAtual);
  }),
];

// --- Pix operacional (F-Sprint 13 / backend Sprints 19-21) ---
// Identificadores deterministicos para dev-offline e specs do PixService. Fixtures nao guardam
// chave Pix em claro, payload bruto de provider, dados bancarios nem CPF/CNPJ. A chave destino
// chega no request de desembolso, mas o mock so devolve a versao mascarada — nunca a original.
const CONTRATO_DESEMBOLSO_INELEGIVEL_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772a02';
const CONTRATO_DESEMBOLSO_INEXISTENTE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b772dead';

const TRANSFERENCIA_CONCLUIDA_ID = 'e0000000-0000-4000-8000-000000000001';
const TRANSFERENCIA_PROCESSANDO_ID = 'e0000000-0000-4000-8000-000000000002';
const TRANSFERENCIA_PROVIDER_OFF_ID = 'e0000000-0000-4000-8000-000000000003';

// A parcela recebivel reusa o sentinel da cobranca para o vinculo do recebimento conciliado.
const PIX_PARCELA_RECEBIVEL_ID = PARCELA_PARA_RECEBIMENTO_ID;
const PIX_PARCELA_INELEGIVEL_ID = 'a0000000-0000-4000-8000-0000000000c1';
const PIX_PARCELA_INEXISTENTE_ID = 'a0000000-0000-4000-8000-0000000000c2';

const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const RECEBIMENTO_CONCILIADO_ID = 'e2000000-0000-4000-8000-000000000001';
const RECEBIMENTO_NAO_IDENTIFICADO_ID = 'e2000000-0000-4000-8000-000000000002';

const VALOR_DESEMBOLSO_ELEGIVEL = 10000.0;
const VALOR_PARCELA_PIX = 1000.0;

interface DesembolsoMockState {
  transferenciaId: string;
  contratoId: string;
  status: string;
  valor: number;
  chaveDestinoMascara: string;
  // Campos de apresentacao do Mockup 27. Opcionais no contrato: a tela mostra travessao
  // quando ausentes. Nenhum participa de conciliacao ou de calculo.
  [extra: string]: unknown;
}

// Mascara a chave Pix destino sem nunca devolver a original (mantem so os primeiros 3 chars).
function mascararChavePix(chave: string): string {
  return `${chave.slice(0, 3)}***`;
}

// FINANCEIRO/ADMIN: solicitar desembolso e gerar referencia (espelha @PreAuthorize do backend).
function negarSeNaoFinanceiroPix(path: string) {
  if (currentMockUser.role !== 'FINANCEIRO' && currentMockUser.role !== 'ADMIN') {
    return errorResponse(403, 'Forbidden', 'Sem permissao para a operacao Pix', path);
  }
  return null;
}

// Leituras Pix sao internas: FINANCEIRO/ADMIN/BACKOFFICE. CLIENTE nao acessa.
function negarSeNaoInternoPix(path: string) {
  if (currentMockUser.role === 'CLIENTE') {
    return errorResponse(403, 'Forbidden', 'Sem permissao para a operacao Pix', path);
  }
  return null;
}

// Carimbos da linha do tempo do Mockup 27. Cada etapa so recebe hora quando o status a
// garante: PROCESSANDO para na autorizacao e SOLICITADA para no envio ao provider.
const ETAPAS_DESEMBOLSO: { titulo: string; em: string; origem: string }[] = [
  { titulo: 'Solicitação criada', em: '2026-05-30T11:31:58-03:00', origem: 'Sistema' },
  { titulo: 'Validação dos dados', em: '2026-05-30T11:31:59-03:00', origem: 'Sistema' },
  { titulo: 'Enviado ao provider', em: '2026-05-30T11:32:01-03:00', origem: 'Sistema' },
  { titulo: 'Autorização do Pix', em: '2026-05-30T11:32:03-03:00', origem: 'Celcoin BaaS' },
  { titulo: 'Transferência realizada', em: '2026-05-30T11:32:05-03:00', origem: 'Celcoin BaaS' },
  { titulo: 'Desembolso concluído', em: '2026-05-30T11:32:10-03:00', origem: 'Sistema' },
];

const ETAPAS_CARIMBADAS: Record<string, number> = {
  CONCLUIDA: 6,
  PROCESSANDO: 4,
  SOLICITADA: 3,
  CRIADA: 1,
  FALHOU: 3,
};

function etapasDesembolso(status: string): { titulo: string; em?: string; origem?: string }[] {
  const carimbadas = ETAPAS_CARIMBADAS[status] ?? 1;
  return ETAPAS_DESEMBOLSO.map((etapa, i) => (i < carimbadas ? etapa : { titulo: etapa.titulo }));
}

function seedTransferenciasPix(): Record<string, DesembolsoMockState> {
  const base = (transferenciaId: string, status: string): DesembolsoMockState => ({
    transferenciaId,
    contratoId: CONTRATO_ASSINADO_ID,
    status,
    valor: VALOR_DESEMBOLSO_ELEGIVEL,
    chaveDestinoMascara: 'joa***',
    // Apresentacao do Mockup 27: o que vale para qualquer status.
    criadoEm: '2026-05-30T11:32:10-03:00',
    tipoOperacao: 'Desembolso de crédito',
    canal: 'PIX SPI',
    descricao: `Desembolso referente ao contrato ${CONTRATO_ASSINADO_ID}`,
    idempotencyKey: '2f6c9c05-9f2b-4c75-8f79-3c1d63b59e9f',
    nomeRecebedor: 'João da Silva',
    bancoRecebedor: 'Banco ABCD S.A. (123)',
    agenciaRecebedor: '0001',
    contaRecebedor: '12345-6',
    cpfRecebedorMascara: '123.***.***-**',
    tipoChave: 'CPF',
    propostaId: 'PROP-5b771e05',
    propostaUuid: PROPOSTA_EM_ANALISE_ID,
    tarifa: 0,
    valorLiquido: VALOR_DESEMBOLSO_ELEGIVEL,
    provedor: 'Celcoin BaaS',
    origemRecursos: 'Conta Escrow / Garantia',
    finalidade: 'Desembolso de crédito',
    centroCusto: 'Administrativo',
    tags: ['desembolso', 'credito', 'spi'],
    contratoValor: 50000.0,
    contratoAssinadoEm: '2026-05-20T00:00:00-03:00',
    contratoVencimentoFinal: '2027-05-20T00:00:00-03:00',
    propostaTomador: 'Empresa Exemplo Ltda.',
    propostaEm: '2026-05-15T00:00:00-03:00',
    propostaValorSolicitado: 50000.0,
    hashIntegridade: 'a8b9f7c3e4d5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5',
    etapas: etapasDesembolso(status),
  });
  // NSU, end-to-end e codigo de retorno so existem depois que o provider liquida.
  const concluida = base(TRANSFERENCIA_CONCLUIDA_ID, 'CONCLUIDA');
  concluida['nsu'] = '000123456789';
  concluida['endToEndId'] = 'E18236120260530113210A1B2C3D4E5F';
  concluida['situacaoProvider'] = 'Autorizado';
  concluida['codigoRetorno'] = '00 - Sucesso';
  const processando = base(TRANSFERENCIA_PROCESSANDO_ID, 'PROCESSANDO');
  processando['situacaoProvider'] = 'Autorizado';
  processando['endToEndId'] = 'E18236120260530113210A1B2C3D4E5F';
  return {
    [TRANSFERENCIA_CONCLUIDA_ID]: concluida,
    [TRANSFERENCIA_PROCESSANDO_ID]: processando,
    [TRANSFERENCIA_PROVIDER_OFF_ID]: base(TRANSFERENCIA_PROVIDER_OFF_ID, 'SOLICITADA'),
  };
}

// Recurso de referencia (sem o flag `novo`, que e definido por operacao: POST novo/reaproveitado,
// GET sempre false). codigoCopiaCola e dado de pagamento nao sensivel.
// Campos de apresentacao do Mockup 26, opcionais: quando o backend nao os envia, a tela mostra
// travessao. Nenhum deles participa de conciliacao ou de calculo.
function referenciaAtivaSeed(): Record<string, unknown> {
  const agora = '2026-04-24T17:21:15-03:00';
  const disponibilizada = '2026-04-24T17:21:16-03:00';
  const recebimentoVinculado = '2026-04-24T18:30:45-03:00';
  const conciliacao = '2026-04-24T18:31:02-03:00';
  return {
    referenciaId: REFERENCIA_ATIVA_ID,
    parcelaId: PIX_PARCELA_RECEBIVEL_ID,
    txid: `SEP${REFERENCIA_ATIVA_ID.replace(/-/g, '')}`,
    codigoCopiaCola: `00020126360014br.gov.bcb.pix0114${REFERENCIA_ATIVA_ID.slice(0, 8)}5204000053039865802BR6304ABCD`,
    valorEsperado: VALOR_PARCELA_PIX,
    status: 'ATIVA',
    novo: false,
    // Campos de apresentacao do Mockup 26
    chavePix: '11.111.111/0001-91 (CNPJ)',
    tipoChave: 'CNPJ',
    canal: 'PIX SPI',
    instituicaoRecebedora: 'Banco ABCD S.A.',
    descricao: 'Pagamento de parcela 1/12',
    criadaEm: agora,
    atualizadaEm: recebimentoVinculado,
    expiracao: '2026-04-29T23:59:59-03:00',
    periodicidade: 'Única',
    finalidade: 'Pagamento de parcela',
    contrato: 'CONT-8d991a11',
    proposta: 'PROP-5b771e05',
    tomador: 'Empresa Exemplo Ltda.',
    observacoes: null,
    tags: ['operacional', 'mensal', 'cliente-pj'],
    hashIntegridade: '9f7a2c8e5d6f7a8b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
    recebidoTotal: VALOR_PARCELA_PIX,
    quantidadeRecebimentos: 1,
    primeiroRecebimento: recebimentoVinculado,
    ultimoRecebimento: recebimentoVinculado,
    recebimentosVinculados: [
      {
        recebimentoId: RECEBIMENTO_CONCILIADO_ID,
        valor: VALOR_PARCELA_PIX,
        recebidoEm: recebimentoVinculado,
        status: 'CONCILIADO',
        nsu: '000123456789',
        metodo: 'PIX',
      },
    ],
    eventos: [
      { rotulo: 'Referência criada', dataHora: agora, origem: 'Sistema' },
      { rotulo: 'Disponibilizada para pagamento', dataHora: disponibilizada, origem: 'Sistema' },
      { rotulo: 'Recebimento vinculado', dataHora: recebimentoVinculado, origem: 'Sistema' },
      { rotulo: 'Conciliação automática', dataHora: conciliacao, origem: 'Sistema' },
      { rotulo: 'Referência ativa', dataHora: conciliacao, origem: 'Sistema' },
    ],
  };
}

function seedReferenciasPorId(): Record<string, Record<string, unknown>> {
  return { [REFERENCIA_ATIVA_ID]: referenciaAtivaSeed() };
}

function seedReferenciaPorParcela(): Map<string, Record<string, unknown>> {
  return new Map<string, Record<string, unknown>>([
    [PIX_PARCELA_RECEBIVEL_ID, referenciaAtivaSeed()],
  ]);
}

// Recebimentos sao read-only no front (conciliacao/baixa ficam no backend). A divergencia aparece
// como estado claro: NAO_IDENTIFICADO sem vinculo de parcela/referencia, com motivo preenchido.
const recebimentosPix: Record<string, Record<string, unknown>> = {
  [RECEBIMENTO_CONCILIADO_ID]: {
    recebimentoId: RECEBIMENTO_CONCILIADO_ID,
    status: 'CONCILIADO',
    valor: VALOR_PARCELA_PIX,
    endToEndId: 'E0000000020260424183000abcdef01',
    referenciaId: REFERENCIA_ATIVA_ID,
    parcelaId: PIX_PARCELA_RECEBIVEL_ID,
    recebimentoCobrancaId: 'c0000000-0000-4000-8000-000000000010',
    motivoDivergencia: null,
    recebidoEm: now,
    // --- Campos de apresentacao do Mockup 25 (nao participam de conciliacao) ---
    chavePix: '11.111.111/0001-91 (CNPJ)',
    instituicaoRecebedora: 'Banco ABCD S.A.',
    canal: 'PIX SPI',
    nsu: '000123456789',
    tipoRecebimento: 'Transferencia recebida',
    formaPagamento: 'Conta Escrow / Garantia',
    hashIntegridade: 'a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d67f8e9d0c',
    conciliacao: {
      dataHora: '2026-04-24T18:31:02-03:00',
      metodo: 'Automatico',
      responsavel: 'Sistema',
      protocolo: 'CONC-240426-183102',
    },
    parcela: {
      contrato: 'CONT-8d991a11',
      proposta: 'PROP-5b771e05',
      numero: '1 / 12',
      vencimento: '2026-07-15',
      valorOriginal: VALOR_PARCELA_PIX,
      valorPago: VALOR_PARCELA_PIX,
    },
    adicionais: {
      versaoPix: '2.0',
      tipoChave: 'CNPJ',
      valorTarifa: 0,
      iniciadorPagamento: 'Pagador',
      localizacao: 'Sao Paulo - SP',
      ipOrigem: '177.12.45.98',
    },
    complementares: {
      categoria: 'Capital de Giro',
      finalidade: 'Compra de estoque',
      centroCusto: 'Administrativo',
      observacoes: null,
      tags: ['operacional', 'mensal', 'cliente-pj'],
    },
    comprovante: {
      arquivo: 'PDF',
      tamanho: '132 KB',
      geradoEm: '2026-04-24T18:31:02-03:00',
      documentoId: '8f7e2bff-8c1a-4b2a-9b2a-3c5d2e3f7a11',
    },
    eventos: [
      {
        rotulo: 'Recebimento Pix iniciado',
        dataHora: '2026-04-24T18:30:45-03:00',
        origem: 'Sistema',
      },
      {
        rotulo: 'Pagamento recebido no SPI',
        dataHora: '2026-04-24T18:30:45-03:00',
        origem: 'Sistema',
      },
      {
        rotulo: 'Validacao de dados e chave',
        dataHora: '2026-04-24T18:30:47-03:00',
        origem: 'Sistema',
      },
      {
        rotulo: 'Conciliacao com parcela',
        dataHora: '2026-04-24T18:31:02-03:00',
        origem: 'Sistema',
      },
      {
        rotulo: 'Recebimento conciliado',
        dataHora: '2026-04-24T18:31:02-03:00',
        origem: 'Sistema',
      },
    ],
  },
  [RECEBIMENTO_NAO_IDENTIFICADO_ID]: {
    recebimentoId: RECEBIMENTO_NAO_IDENTIFICADO_ID,
    status: 'NAO_IDENTIFICADO',
    valor: 250.0,
    endToEndId: 'E0000000020260424183000fedcba02',
    referenciaId: null,
    parcelaId: null,
    recebimentoCobrancaId: null,
    motivoDivergencia: 'Referencia Pix nao localizada para o txid recebido',
    recebidoEm: now,
    // Sem vinculo nao ha conciliacao, parcela nem comprovante: a tela mostra travessao nesses
    // blocos e mantem apenas o que o evento do provider trouxe.
    chavePix: '11.111.111/0001-91 (CNPJ)',
    instituicaoRecebedora: 'Banco ABCD S.A.',
    canal: 'PIX SPI',
    nsu: '000987654321',
    tipoRecebimento: 'Transferencia recebida',
    formaPagamento: 'Conta Escrow / Garantia',
    adicionais: {
      versaoPix: '2.0',
      tipoChave: 'CNPJ',
      valorTarifa: 0,
      iniciadorPagamento: 'Pagador',
      localizacao: 'Sao Paulo - SP',
      ipOrigem: '200.145.8.32',
    },
    eventos: [
      {
        rotulo: 'Recebimento Pix iniciado',
        dataHora: '2026-04-24T18:30:45-03:00',
        origem: 'Sistema',
      },
      {
        rotulo: 'Pagamento recebido no SPI',
        dataHora: '2026-04-24T18:30:45-03:00',
        origem: 'Sistema',
      },
    ],
  },
};

let transferenciasPix = seedTransferenciasPix();
let referenciasPix = seedReferenciasPorId();
let referenciaPorParcela = seedReferenciaPorParcela();
const desembolsoPorChave = new Map<string, { hash: string; response: Record<string, unknown> }>();
let pixSeq = 100;

// Restaura o estado mutavel do Pix (transferencias, referencias e idempotencia) para o seed.
// Usado pelos testes para garantir independencia (F.I.R.S.T.) ao exercitar criacao/replay.
export function resetPixState(): void {
  transferenciasPix = seedTransferenciasPix();
  referenciasPix = seedReferenciasPorId();
  referenciaPorParcela = seedReferenciaPorParcela();
  desembolsoPorChave.clear();
  pixSeq = 100;
}

const pixHandlers = [
  http.post(`${baseUrl}/pix/desembolsos`, async ({ request }) => {
    const path = '/api/v1/pix/desembolsos';
    const negado = negarSeNaoFinanceiroPix(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    const chave = request.headers.get('Idempotency-Key');
    if (!chave || !IDEMPOTENCY_KEY_PATTERN.test(chave)) {
      return errorResponse(
        400,
        'Bad Request',
        "Header 'Idempotency-Key' ausente ou invalido",
        path,
      );
    }
    const body = (await request.json()) as {
      contratoId?: string;
      valor?: number;
      chavePixDestino?: string;
    };
    const hash = JSON.stringify(body);
    const anterior = desembolsoPorChave.get(chave);
    if (anterior) {
      if (anterior.hash !== hash) {
        return errorResponse(
          409,
          'Conflict',
          'Idempotency-Key reapresentada com payload divergente',
          path,
        );
      }
      return HttpResponse.json({ ...anterior.response, novo: false });
    }
    if (body.contratoId === CONTRATO_DESEMBOLSO_INEXISTENTE_ID) {
      return errorResponse(404, 'Not Found', 'Contrato nao encontrado', path);
    }
    if (body.contratoId === CONTRATO_DESEMBOLSO_INELEGIVEL_ID) {
      return errorResponse(
        422,
        'Unprocessable Entity',
        'Contrato inelegivel para desembolso (nao assinado, sem agenda ou escrow inoperante)',
        path,
      );
    }
    pixSeq += 1;
    const transferenciaId = novoId('e0000000', pixSeq);
    const novo: DesembolsoMockState = {
      transferenciaId,
      contratoId: body.contratoId ?? '',
      status: 'CRIADA',
      valor: body.valor ?? 0,
      chaveDestinoMascara: mascararChavePix(body.chavePixDestino ?? ''),
    };
    transferenciasPix[transferenciaId] = novo;
    const response = { ...novo, novo: true };
    desembolsoPorChave.set(chave, { hash, response });
    return HttpResponse.json(response, { status: 201 });
  }),

  http.post(`${baseUrl}/pix/desembolsos/:id/status`, ({ params, request }) => {
    const id = params['id'] as string;
    const path = `/api/v1/pix/desembolsos/${id}/status`;
    const negado = negarSeNaoInternoPix(path);
    if (negado) {
      return negado;
    }
    if (faltaStepUp(request)) {
      return errorResponse(403, 'Forbidden', 'Step-up obrigatorio', path);
    }
    const transferencia = transferenciasPix[id];
    if (!transferencia) {
      return errorResponse(404, 'Not Found', 'Transferencia nao encontrada', path);
    }
    // Provider indisponivel: devolve o status local sem mascarar a falha como sucesso.
    if (id === TRANSFERENCIA_PROVIDER_OFF_ID) {
      return HttpResponse.json({ ...transferencia, providerIndisponivel: true });
    }
    // Reconciliacao so avanca: PROCESSANDO -> CONCLUIDA ao reconsultar o provider. Os campos
    // que so existem depois da liquidacao entram junto com a transicao, e a linha do tempo
    // do Mockup 27 recebe os carimbos das etapas que o novo status garante.
    if (transferencia.status === 'PROCESSANDO') {
      transferencia.status = 'CONCLUIDA';
      transferencia['etapas'] = etapasDesembolso('CONCLUIDA');
      transferencia['nsu'] = '000123456789';
      transferencia['codigoRetorno'] = '00 - Sucesso';
    }
    return HttpResponse.json({ ...transferencia, providerIndisponivel: false });
  }),

  http.get(`${baseUrl}/pix/desembolsos/:id`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/pix/desembolsos/${id}`;
    const negado = negarSeNaoInternoPix(path);
    if (negado) {
      return negado;
    }
    const transferencia = transferenciasPix[id];
    if (!transferencia) {
      return errorResponse(404, 'Not Found', 'Transferencia nao encontrada', path);
    }
    // Leitura local: nunca chama o provider, entao providerIndisponivel e sempre false.
    return HttpResponse.json({ ...transferencia, providerIndisponivel: false });
  }),

  http.post(`${baseUrl}/pix/recebimentos/referencias`, async ({ request }) => {
    const path = '/api/v1/pix/recebimentos/referencias';
    const negado = negarSeNaoFinanceiroPix(path);
    if (negado) {
      return negado;
    }
    const body = (await request.json()) as { parcelaId?: string };
    const parcelaId = body.parcelaId ?? '';
    if (parcelaId === PIX_PARCELA_INEXISTENTE_ID) {
      return errorResponse(404, 'Not Found', 'Parcela nao encontrada', path);
    }
    if (parcelaId === PIX_PARCELA_INELEGIVEL_ID) {
      return errorResponse(
        422,
        'Unprocessable Entity',
        'Parcela nao recebivel ou sem valor em aberto',
        path,
      );
    }
    const existente = referenciaPorParcela.get(parcelaId);
    if (existente) {
      return HttpResponse.json({ ...existente, novo: false });
    }
    pixSeq += 1;
    const referenciaId = novoId('e1000000', pixSeq);
    const referencia: Record<string, unknown> = {
      referenciaId,
      parcelaId,
      txid: `SEP${referenciaId.replace(/-/g, '')}`,
      codigoCopiaCola: `00020126360014br.gov.bcb.pix0114${referenciaId.slice(0, 8)}5204000053039865802BR6304ABCD`,
      valorEsperado: VALOR_PARCELA_PIX,
      status: 'ATIVA',
    };
    referenciasPix[referenciaId] = referencia;
    referenciaPorParcela.set(parcelaId, referencia);
    return HttpResponse.json({ ...referencia, novo: true }, { status: 201 });
  }),

  http.get(`${baseUrl}/pix/recebimentos/referencias/:id`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/pix/recebimentos/referencias/${id}`;
    const negado = negarSeNaoInternoPix(path);
    if (negado) {
      return negado;
    }
    const referencia = referenciasPix[id];
    if (!referencia) {
      return errorResponse(404, 'Not Found', 'Referencia nao encontrada', path);
    }
    return HttpResponse.json({ ...referencia, novo: false });
  }),

  // Listagem dos recebimentos Pix da carteira. Precisa vir antes do GET por id, senao
  // `/recebimentos` cairia no `:id`. E a fonte do painel de status da conciliacao, que ate aqui
  // trazia um agregado digitado na tela.
  http.get(`${baseUrl}/pix/recebimentos`, () => {
    const negado = negarSeNaoInternoPix('/api/v1/pix/recebimentos');
    if (negado) {
      return negado;
    }
    return HttpResponse.json(Object.values(recebimentosPix));
  }),

  http.get(`${baseUrl}/pix/recebimentos/:id`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/pix/recebimentos/${id}`;
    const negado = negarSeNaoInternoPix(path);
    if (negado) {
      return negado;
    }
    const recebimento = recebimentosPix[id];
    if (!recebimento) {
      return errorResponse(404, 'Not Found', 'Recebimento nao encontrado', path);
    }
    return HttpResponse.json(recebimento);
  }),
];

// --- Credora (F-Sprint 11 / backend Sprints 16-17) ---
// A jornada credora e por usuario autenticado (CLIENTE) dono de uma credora — nao ha role CREDORA.
// As leituras /me, /oportunidades e /carteira respondem 404 quando o usuario nao tem credora; o
// gating real e ownership + elegibilidade no backend. Fixtures nao guardam CNPJ nao mascarado de
// terceiros, dados bancarios, chave Pix nem dado sensivel do tomador na carteira. CNPJ ja chega
// formatado como o backend (EmpresaCredoraWebMapper).
const CREDORA_ELEGIVEL_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001';
const CREDORA_INELEGIVEL_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b780002';

// Sentinelas de onboarding para o cadastro: aprovado-PJ-do-proprio-usuario (201), PF (422),
// de-outro-usuario (403); qualquer outro id -> 404.
const ONBOARDING_PJ_APROVADO_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a001';
const ONBOARDING_PF_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a002';
const ONBOARDING_DE_OUTRO_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a003';

const OPORTUNIDADE_DISPONIVEL_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b001';
const OPORTUNIDADE_DISPONIVEL_2_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b002';
const OPORTUNIDADE_ENCERRADA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b003';
const OPERACAO_ASSOCIADA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

function credoraElegivelSeed(): Record<string, unknown> {
  return {
    id: CREDORA_ELEGIVEL_ID,
    usuarioId: credoraUsuario.id,
    onboardingId: ONBOARDING_PJ_APROVADO_ID,
    cnpj: '12.345.678/0001-90',
    razaoSocial: 'Aurora Capital Investimentos LTDA',
    status: 'ATIVA',
    elegibilidade: 'ELEGIVEL',
    motivoInelegibilidade: null,
    tipoCredora: 'EMPRESA',
    capacidadeAporte: 500000.0,
    dataCriacao: now,
    dataModificacao: now,
  };
}

function credoraInelegivelSeed(): Record<string, unknown> {
  return {
    id: CREDORA_INELEGIVEL_ID,
    usuarioId: credoraInelegivelUsuario.id,
    onboardingId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a009',
    cnpj: '98.765.432/0001-10',
    razaoSocial: 'Boreal Fomento Mercantil LTDA',
    status: 'CADASTRADA',
    elegibilidade: 'INELEGIVEL',
    motivoInelegibilidade: 'Onboarding PJ reprovado na verificacao PLD',
    tipoCredora: 'EMPRESA',
    capacidadeAporte: null,
    dataCriacao: now,
    dataModificacao: now,
  };
}

function seedCredorasPorUsuario(): Record<string, Record<string, unknown>> {
  // credora@empresa.com -> ATIVA/ELEGIVEL; credora-inelegivel@empresa.com -> CADASTRADA/INELEGIVEL;
  // credora-novo@empresa.com -> ausente (404), cadastra a partir do onboarding PJ aprovado.
  return {
    [credoraUsuario.id]: credoraElegivelSeed(),
    [credoraInelegivelUsuario.id]: credoraInelegivelSeed(),
  };
}

function seedOportunidadesCredora(): Record<string, Record<string, unknown>> {
  // Valores conciliados com a carteira canonica (CARTEIRA): nenhuma operacao excede o teto de
  // R$ 15.000,00 do regimento SEP e a oportunidade 1 espelha o contrato 5b771c08 (R$ 6.000,00 em
  // 10 parcelas), que e o mesmo associado na carteira da credora.
  return {
    [OPORTUNIDADE_DISPONIVEL_ID]: {
      id: OPORTUNIDADE_DISPONIVEL_ID,
      propostaId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78d001',
      contratoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78e001',
      valor: 6000.0,
      prazoMeses: 10,
      // Espelha o contrato 5b771c08: a taxa e a dele (a credora nao rende mais do que o tomador paga).
      taxaJurosMensal: TAXA_CARTEIRA,
      status: 'DISPONIVEL',
      dataCriacao: now,
    },
    [OPORTUNIDADE_DISPONIVEL_2_ID]: {
      id: OPORTUNIDADE_DISPONIVEL_2_ID,
      propostaId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78d002',
      contratoId: null,
      valor: 4625.0,
      prazoMeses: 10,
      taxaJurosMensal: 0.019,
      status: 'DISPONIVEL',
      dataCriacao: now,
    },
    [OPORTUNIDADE_ENCERRADA_ID]: {
      id: OPORTUNIDADE_ENCERRADA_ID,
      propostaId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78d003',
      contratoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78e003',
      valor: 3125.0,
      prazoMeses: 10,
      taxaJurosMensal: 0.031,
      status: 'ENCERRADA',
      dataCriacao: now,
    },
  };
}

function operacaoAssociadaSeed(): Record<string, unknown> {
  // Carteira nasce por associacao assistida do admin (nao por interesse). Cobranca e so agregada.
  // O agregado sai do mesmo cronograma do contrato 5b771c08 na carteira de Cobranca: parcelas com juros.
  const contrato = CARTEIRA['5b771c08'];
  const plano = gerarCronograma({
    principal: contrato.contratado,
    taxaMensal: contrato.taxaMensal,
    prazoMeses: contrato.prazo,
    primeiroVencimento: contrato.primeiroVencimento,
  });
  const somaTotais = (linhas: typeof plano) =>
    Math.round(linhas.reduce((t, l) => t + l.total, 0) * 100) / 100;
  return {
    id: OPERACAO_ASSOCIADA_ID,
    contratoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78e001',
    oportunidadeId: OPORTUNIDADE_DISPONIVEL_ID,
    status: 'ASSOCIADA',
    justificativa: 'Associacao assistida apos formalizacao do contrato',
    valor: contrato.contratado,
    prazoMeses: contrato.prazo,
    taxaJurosMensal: contrato.taxaMensal,
    contratoStatus: 'ASSINADO',
    // Espelho do contrato 5b771c08 da carteira: 8 parcelas pagas ate 2026-05-30, nenhuma em atraso e a 9a
    // vencendo em 2026-06-25. Os valores sao a soma das parcelas do plano, com juros.
    cobranca: {
      numeroParcelas: contrato.prazo,
      valorTotal: somaTotais(plano),
      parcelasPagas: contrato.pagas,
      parcelasAtrasadas: 0,
      totalRecebido: somaTotais(plano.slice(0, contrato.pagas)),
      proximoVencimento: plano[contrato.pagas].vencimento,
    },
    dataCriacao: now,
  };
}

function seedCarteiraPorUsuario(): Record<string, Record<string, unknown>[]> {
  // Apenas a credora elegivel tem operacao associada; a inelegivel tem carteira vazia.
  return { [credoraUsuario.id]: [operacaoAssociadaSeed()] };
}

let credorasPorUsuario = seedCredorasPorUsuario();
let oportunidadesCredora = seedOportunidadesCredora();
let carteiraPorUsuario = seedCarteiraPorUsuario();
let interessesAtivos = new Set<string>();
let credoraSeq = 200;

// Restaura o estado mutavel da credora (cadastro, interesses) para o seed, garantindo testes
// independentes (F.I.R.S.T.) ao exercitar cadastro/interesse.
export function resetCredoraState(): void {
  credorasPorUsuario = seedCredorasPorUsuario();
  oportunidadesCredora = seedOportunidadesCredora();
  carteiraPorUsuario = seedCarteiraPorUsuario();
  interessesAtivos = new Set<string>();
  credoraSeq = 200;
}

function credoraAtual(): Record<string, unknown> | undefined {
  return credorasPorUsuario[currentMockUser.id];
}

function chaveInteresse(oportunidadeId: string): string {
  return `${currentMockUser.id}:${oportunidadeId}`;
}

const credoraHandlers = [
  http.post(`${baseUrl}/credores`, async ({ request }) => {
    const path = '/api/v1/credores';
    const body = (await request.json()) as {
      onboardingId?: string;
      tipoCredora?: string;
      capacidadeAporte?: number;
    };
    const onboardingId = body.onboardingId ?? '';
    if (onboardingId === ONBOARDING_PF_ID) {
      return errorResponse(
        422,
        'Unprocessable Entity',
        'Onboarding nao e PJ ou KYB incompleto (CRD-422-001)',
        path,
      );
    }
    if (onboardingId === ONBOARDING_DE_OUTRO_ID) {
      return errorResponse(
        403,
        'Forbidden',
        'Onboarding pertence a outro usuario (CRD-403-001)',
        path,
      );
    }
    if (onboardingId !== ONBOARDING_PJ_APROVADO_ID) {
      return errorResponse(404, 'Not Found', 'Onboarding nao encontrado', path);
    }
    if (credoraAtual()) {
      return errorResponse(
        409,
        'Conflict',
        'Usuario, onboarding ou CNPJ ja vinculado a uma credora (CRD-409-001)',
        path,
      );
    }
    credoraSeq += 1;
    const nova: Record<string, unknown> = {
      id: novoId('7f0799c0', credoraSeq),
      usuarioId: currentMockUser.id,
      onboardingId,
      cnpj: '11.222.333/0001-44',
      razaoSocial: 'Nova Credora Participacoes LTDA',
      status: 'ATIVA',
      elegibilidade: 'ELEGIVEL',
      motivoInelegibilidade: null,
      tipoCredora: body.tipoCredora ?? 'EMPRESA',
      capacidadeAporte: body.capacidadeAporte ?? null,
      dataCriacao: now,
      dataModificacao: now,
    };
    credorasPorUsuario[currentMockUser.id] = nova;
    return HttpResponse.json(nova, { status: 201 });
  }),

  http.get(`${baseUrl}/credores/me/elegibilidade`, () => {
    const path = '/api/v1/credores/me/elegibilidade';
    const credora = credoraAtual();
    if (!credora) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    return HttpResponse.json({
      status: credora['status'],
      elegibilidade: credora['elegibilidade'],
      motivoInelegibilidade: credora['motivoInelegibilidade'],
    });
  }),

  http.get(`${baseUrl}/credores/me`, () => {
    const path = '/api/v1/credores/me';
    const credora = credoraAtual();
    if (!credora) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    return HttpResponse.json(credora);
  }),

  http.get(`${baseUrl}/credores/oportunidades`, () => {
    const path = '/api/v1/credores/oportunidades';
    if (!credoraAtual()) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    const disponiveis = Object.values(oportunidadesCredora).filter(
      (o) => o['status'] === 'DISPONIVEL',
    );
    return HttpResponse.json(disponiveis);
  }),

  http.get(`${baseUrl}/credores/oportunidades/:id`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/credores/oportunidades/${id}`;
    if (!credoraAtual()) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    const oportunidade = oportunidadesCredora[id];
    if (!oportunidade) {
      return errorResponse(404, 'Not Found', 'Oportunidade nao encontrada', path);
    }
    return HttpResponse.json(oportunidade);
  }),

  http.post(`${baseUrl}/credores/oportunidades/:id/interesses`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/credores/oportunidades/${id}/interesses`;
    const credora = credoraAtual();
    if (!credora) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    const oportunidade = oportunidadesCredora[id];
    if (!oportunidade) {
      return errorResponse(404, 'Not Found', 'Oportunidade nao encontrada', path);
    }
    if (credora['status'] !== 'ATIVA' || credora['elegibilidade'] !== 'ELEGIVEL') {
      return errorResponse(
        422,
        'Unprocessable Entity',
        'Credora nao elegivel para manifestar interesse',
        path,
      );
    }
    if (oportunidade['status'] !== 'DISPONIVEL') {
      return errorResponse(422, 'Unprocessable Entity', 'Oportunidade indisponivel', path);
    }
    const chave = chaveInteresse(id);
    if (interessesAtivos.has(chave)) {
      return errorResponse(409, 'Conflict', 'Interesse ativo ja existe', path);
    }
    interessesAtivos.add(chave);
    credoraSeq += 1;
    return HttpResponse.json(
      { id: novoId('7f000001', credoraSeq), oportunidadeId: id, status: 'ATIVO', dataCriacao: now },
      { status: 201 },
    );
  }),

  http.delete(`${baseUrl}/credores/oportunidades/:id/interesses/me`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/credores/oportunidades/${id}/interesses/me`;
    if (!credoraAtual()) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    // Espelha CancelarInteresseCredoraUseCase: NAO e idempotente — sem interesse ATIVO responde 404.
    const chave = chaveInteresse(id);
    if (!interessesAtivos.has(chave)) {
      return errorResponse(404, 'Not Found', 'Interesse ativo nao encontrado', path);
    }
    interessesAtivos.delete(chave);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${baseUrl}/credores/carteira/:id`, ({ params }) => {
    const id = params['id'] as string;
    const path = `/api/v1/credores/carteira/${id}`;
    if (!credoraAtual()) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    const operacao = (carteiraPorUsuario[currentMockUser.id] ?? []).find((o) => o['id'] === id);
    if (!operacao) {
      // Ownership: operacao de outra credora ou inexistente -> 404 (nao vaza existencia).
      return errorResponse(404, 'Not Found', 'Operacao nao encontrada', path);
    }
    return HttpResponse.json(operacao);
  }),

  http.get(`${baseUrl}/credores/carteira`, () => {
    const path = '/api/v1/credores/carteira';
    if (!credoraAtual()) {
      return errorResponse(404, 'Not Found', 'Usuario nao possui credora', path);
    }
    return HttpResponse.json(carteiraPorUsuario[currentMockUser.id] ?? []);
  }),
];

export const handlers = [
  // A gestao vem antes: `/correspondentes/:id` casaria rotas como /comissoes e /auditoria.
  // A rede vem antes da gestao: `/correspondentes/me/rede/...` nao pode cair nas rotas `/me/...` genericas.
  ...criarHandlersRede(baseUrl, () => currentMockUser, errorResponse),
  ...criarHandlersGestao(baseUrl, () => currentMockUser, errorResponse),
  ...criarHandlersPixAutomatico(baseUrl, () => currentMockUser, errorResponse, agendaParaPix),
  ...criarHandlersCorrespondentes(baseUrl, () => currentMockUser, errorResponse),

  http.post(`${baseUrl}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    const candidato = loginUsuarios[body.username ?? ''];
    const usuario =
      candidato && body.password === senhaDe(body.username ?? '') ? candidato : undefined;
    if (!usuario) {
      return errorResponse(401, 'Unauthorized', 'Credenciais invalidas', '/api/v1/auth/login');
    }
    currentMockUser = usuario;
    return HttpResponse.json({
      accessToken: 'mock-jwt-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      usuario,
    });
  }),

  http.post(`${baseUrl}/usuarios`, async ({ request }) => {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      role?: string;
    };

    const username = (body.username ?? '').trim().toLowerCase();
    if (
      username === 'duplicado@empresa.com' ||
      usuariosFake.some((u) => u.username === username) ||
      loginUsuarios[username]
    ) {
      return errorResponse(409, 'Conflict', 'username ja cadastrado', '/api/v1/usuarios');
    }

    // Como o backend: o cadastro sempre nasce CLIENTE (o role do corpo e ignorado). O usuario
    // entra na lista, ganha o conjunto de roles e passa a logar com a senha informada, para o
    // "Novo usuario" da administracao levar a um detalhe que existe de fato.
    usuariosCriados += 1;
    const criadoEm = new Date().toISOString();
    const criado = {
      id: `1f0799c0-98b9-6d9d-bc4a-7d6f5b77${String(1100 + usuariosCriados).padStart(4, '0')}`,
      username,
      role: 'CLIENTE',
      precisaRedefinirSenha: false,
      mfaHabilitado: false,
      dataCriacao: criadoEm,
      dataModificacao: criadoEm,
      criadoPor: currentMockUser.username,
      modificadoPor: currentMockUser.username,
    };
    usuariosFake.push(criado);
    loginUsuarios[username] = criado;
    rolesPorUsuario[criado.id] = ['CLIENTE'];
    if (body.password) senhasPorUsuario[username] = body.password;

    return HttpResponse.json(criado, { status: 201 });
  }),

  http.post(`${baseUrl}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${baseUrl}/auth/refresh`, () =>
    HttpResponse.json({
      accessToken: 'mock-jwt-token-refresh',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: null,
      usuario: currentMockUser,
      mfaRequired: false,
      mfaChallengeId: null,
    }),
  ),

  http.post(`${baseUrl}/auth/logout-all`, () => new HttpResponse(null, { status: 204 })),

  // ===== TOTP (Mockup 34) =====
  // Setup responde sempre 200, inclusive para quem ja tem MFA: sem isso a tela ficaria
  // indemonstravel no dev-offline, porque o usuario padrao do mock volta a ser o ADMIN
  // (com MFA ligado) a cada recarga. O 409 do backend real continua tratado na tela.
  http.post(`${baseUrl}/auth/totp/setup`, () => {
    const uri = `otpauth://totp/${encodeURIComponent(`SEP:${currentMockUser.username}`)}?secret=${TOTP_SECRET}&issuer=SEP&algorithm=SHA1&digits=6&period=30`;
    return HttpResponse.json({
      secretBase32: TOTP_SECRET,
      otpAuthUri: uri,
      // QR legivel de verdade: da para escanear com um aplicativo autenticador e conferir
      // o fluxo de ponta a ponta no dev-offline.
      qrCodeDataUrl: qrDataUrl(uri),
      backupCodes: [...STEP_UP_BACKUP],
    });
  }),

  http.post(`${baseUrl}/auth/totp/confirm`, async ({ request }) => {
    const path = '/api/v1/auth/totp/confirm';
    const body = (await request.json()) as { codigo?: string };
    const codigo = (body.codigo ?? '').trim();
    // Aceita o codigo real do aplicativo autenticador (o mesmo segredo do QR) e tambem o
    // codigo fixo do dev-offline, que mantem os testes determinsticos.
    const valido = codigo === STEP_UP_TOTP || (await codigoTotpValido(TOTP_SECRET, codigo));
    if (!valido) {
      return errorResponse(422, 'Unprocessable Entity', 'Codigo invalido', path);
    }
    currentMockUser = { ...currentMockUser, mfaHabilitado: true };
    return new HttpResponse(null, { status: 204 });
  }),

  // ===== Step-up (Mockup 33) =====
  // Confirmacao adicional exigida por operacoes sensiveis. So quem tem MFA habilitado
  // consegue iniciar; o desafio vale uma tentativa e expira apos o uso.
  http.post(`${baseUrl}/auth/step-up/initiate`, () => {
    const path = '/api/v1/auth/step-up/initiate';
    if (!currentMockUser.mfaHabilitado) {
      return errorResponse(400, 'Bad Request', 'MFA nao habilitado para este usuario', path);
    }
    stepUpSeq += 1;
    const challengeId = novoId('50000000', stepUpSeq);
    stepUpDesafios.add(challengeId);
    return HttpResponse.json({ stepUpChallengeId: challengeId });
  }),

  http.post(`${baseUrl}/auth/step-up/complete`, async ({ request }) => {
    const path = '/api/v1/auth/step-up/complete';
    const body = (await request.json()) as { stepUpChallengeId?: string; codigo?: string };
    const challengeId = body.stepUpChallengeId ?? '';
    // 422 e nao 401: um codigo digitado errado nao pode derrubar a sessao. O
    // errorInterceptor global trata 401 como sessao expirada e faz logout.
    if (!stepUpDesafios.has(challengeId)) {
      return errorResponse(410, 'Gone', 'Desafio inexistente ou ja utilizado', path);
    }
    const codigo = (body.codigo ?? '').trim().toUpperCase();
    const valido =
      codigo === STEP_UP_TOTP ||
      STEP_UP_BACKUP.has(codigo) ||
      (await codigoTotpValido(TOTP_SECRET, codigo));
    if (!valido) {
      return errorResponse(422, 'Unprocessable Entity', 'Codigo invalido', path);
    }
    // Codigo de backup e de uso unico, como no backend real.
    STEP_UP_BACKUP.delete(codigo);
    stepUpDesafios.delete(challengeId);
    return HttpResponse.json({ stepUpToken: `step-up-${challengeId}` });
  }),

  http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(currentMockUser)),

  http.get(`${baseUrl}/auth/profile-operacional`, () =>
    HttpResponse.json(perfilOperacionalFake, {
      headers: { 'Cache-Control': 'no-store' },
    }),
  ),

  http.patch(`${baseUrl}/auth/profile-operacional/preferencias`, async ({ request }) => {
    const body = (await request.json()) as {
      idioma?: string;
      fusoHorario?: string;
      tema?: 'ESCURO' | 'CLARO' | 'SISTEMA';
      notificacoesAtivas?: boolean;
      canalComunicacao?: string;
    };
    if (!body.idioma || !body.fusoHorario || !body.tema || !body.canalComunicacao) {
      return errorResponse(
        400,
        'Bad Request',
        'Preferencias incompletas',
        '/api/v1/auth/profile-operacional/preferencias',
      );
    }
    perfilOperacionalFake = {
      ...perfilOperacionalFake,
      preferencias: {
        idioma: body.idioma,
        fusoHorario: body.fusoHorario,
        tema: body.tema,
        notificacoesAtivas: body.notificacoesAtivas ?? false,
        canalComunicacao: body.canalComunicacao,
      },
      atualizadoEm: new Date().toISOString(),
    };
    return HttpResponse.json(perfilOperacionalFake);
  }),

  http.get(`${baseUrl}/usuarios`, () => HttpResponse.json(usuariosFake)),

  http.get(`${baseUrl}/usuarios/:id`, ({ params }) => {
    const id = params['id'] as string;
    const found = usuariosFake.find((u) => u.id === id);
    if (!found) {
      return errorResponse(404, 'Not Found', 'usuário não encontrado', `/api/v1/usuarios/${id}`);
    }
    return HttpResponse.json(found);
  }),

  http.patch(`${baseUrl}/usuarios/:id/senha`, async ({ request, params }) => {
    const id = params['id'] as string;
    const body = (await request.json()) as { passwordAtual?: string; novaSenha?: string };
    const dono = Object.keys(loginUsuarios).find((u) => loginUsuarios[u].id === id) ?? '';

    if (body.passwordAtual !== senhaDe(dono)) {
      return errorResponse(
        400,
        'Bad Request',
        'senha atual inválida',
        `/api/v1/usuarios/${id}/senha`,
      );
    }
    const novaSenhaValida =
      Boolean(body.novaSenha) &&
      body.novaSenha!.length >= 12 &&
      /[a-z]/.test(body.novaSenha!) &&
      /[A-Z]/.test(body.novaSenha!) &&
      /\d/.test(body.novaSenha!) &&
      /[^A-Za-z0-9]/.test(body.novaSenha!);
    if (!novaSenhaValida) {
      return errorResponse(
        400,
        'Bad Request',
        'novaSenha deve ter 12+ caracteres, letras maiúsculas e minúsculas, número e símbolo',
        `/api/v1/usuarios/${id}/senha`,
      );
    }
    if (dono) {
      senhasPorUsuario[dono] = body.novaSenha!;
    }
    return new HttpResponse(null, { status: 204 });
  }),

  ...onboardingHandlers,
  ...creditoHandlers,
  ...formalizacaoHandlers,
  ...cobrancaHandlers,
  ...backofficeHandlers,
  ...governancaHandlers,
  ...pixHandlers,
  ...credoraHandlers,
];

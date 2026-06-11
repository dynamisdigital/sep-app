import { http, HttpResponse } from 'msw';

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

const usuariosFake = [
  adminUsuario,
  clienteUsuario,
  financeiroUsuario,
  backofficeUsuario,
  multiroleUsuario,
];

// Credenciais aceitas no dev-offline (senha unica 123456). Permite exercitar as jornadas
// de cobranca (FINANCEIRO) e de backoffice (BACKOFFICE), nao so ADMIN. currentMockUser
// segue o ultimo login pra /auth/me e /auth/refresh refletirem a role correta apos reload.
const loginUsuarios: Record<string, typeof adminUsuario> = {
  'admin@empresa.com': adminUsuario,
  'financeiro@empresa.com': financeiroUsuario,
  'backoffice@empresa.com': backofficeUsuario,
  'credora@empresa.com': credoraUsuario,
  'credora-inelegivel@empresa.com': credoraInelegivelUsuario,
  'credora-novo@empresa.com': credoraNovoUsuario,
};
let currentMockUser = adminUsuario;

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
const PROPOSTA_SEM_OWNERSHIP_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const ONBOARDING_NAO_APROVADO = '99999999-9999-9999-9999-999999999999';
const TOMADOR_ID = clienteUsuario.id;

function propostaFake(id: string, status: string, score: unknown = null, parecer: unknown = null) {
  return {
    id,
    tomadorId: TOMADOR_ID,
    solicitacaoOnboardingId: '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01',
    tipoOperacao: 'CAPITAL_GIRO',
    valorSolicitado: 10000.0,
    moeda: 'BRL',
    prazoMeses: 12,
    status,
    dataCriacao: now,
    dataModificacao: now,
    score,
    parecer,
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
  [PROPOSTA_OF_AUTORIZADO_ID]: propostaFake(PROPOSTA_OF_AUTORIZADO_ID, 'EM_ANALISE'),
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
    const body = (await request.json()) as { solicitacaoOnboardingId?: string };

    if (body.solicitacaoOnboardingId === ONBOARDING_NAO_APROVADO) {
      return errorResponse(
        422,
        'Unprocessable Entity',
        'Onboarding nao esta APROVADO_FINAL',
        '/api/v1/credito/propostas',
      );
    }

    return HttpResponse.json(propostaFake(PROPOSTA_CRIADA_ID, 'EM_ANALISE'), { status: 201 });
  }),

  http.get(`${baseUrl}/credito/propostas`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const todas = [
      propostasFake[PROPOSTA_EM_ANALISE_ID],
      propostasFake[PROPOSTA_PRE_APROVADA_ID],
      propostasFake[PROPOSTA_APROVADA_ID],
      propostasFake[PROPOSTA_PENDENCIA_ID],
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
        ultimaMovimentacao: {
          mediaEntradasMensal: 45000.0,
          mediaSaidasMensal: 38000.0,
          saldoMedio: 12000.0,
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

function parcelaEstatica(
  id: string,
  numero: number,
  principal: number,
  juros: number,
  multa: number,
  encargos: number,
  dataVencimento: string,
  status: string,
) {
  return {
    id,
    numero,
    principal,
    juros,
    multa,
    encargos,
    total: principal + juros + multa + encargos,
    dataVencimento,
    status,
  };
}

const agendaFake = {
  id: AGENDA_ID,
  contratoId: COBRANCA_CONTRATO_ID,
  numeroParcelas: 4,
  valorTotal: 4000.0,
  dataGeracao: now,
  parcelas: [
    parcelaEstatica(PARCELA_PENDENTE_ID, 1, 1000.0, 0, 0, 0, '2026-07-15', 'PENDENTE'),
    parcelaEstatica(PARCELA_ATRASADA_ID, 2, 1000.0, 0, 0, 0, '2026-05-15', 'ATRASADA'),
    parcelaEstatica(PARCELA_PARCIAL_ID, 3, 1000.0, 0, 0, 0, '2026-06-15', 'PARCIALMENTE_PAGA'),
    parcelaEstatica(PARCELA_PAGA_ID, 4, 1000.0, 0, 0, 0, '2026-04-15', 'PAGA'),
  ],
};

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
) {
  const valorDevidoAtualizado = principalOriginal + jurosOriginal + jurosMora + multa;
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

const inadimplenciaSeed = [
  {
    parcelaId: PARCELA_ATRASADA_ID,
    agendaId: AGENDA_ID,
    contratoId: COBRANCA_CONTRATO_ID,
    tomadorId: TOMADOR_ID,
    numeroParcela: 2,
    status: 'ATRASADA',
    dataVencimento: '2026-05-15',
    diasAtraso: 21,
    valorOriginal: 1000.0,
  },
  {
    parcelaId: PARCELA_INADIMPLENTE_ID,
    agendaId: AGENDA_ID,
    contratoId: COBRANCA_CONTRATO_ID,
    tomadorId: TOMADOR_ID,
    numeroParcela: 6,
    status: 'INADIMPLENTE',
    dataVencimento: '2026-02-01',
    diasAtraso: 124,
    valorOriginal: 1000.0,
  },
];

const recebimentos: Record<string, unknown>[] = [
  {
    recebimentoId: 'c0000000-0000-4000-8000-000000000071',
    parcelaId: PARCELA_PARCIAL_ID,
    statusParcela: 'PARCIALMENTE_PAGA',
    valorRecebido: 400.0,
    dataRecebimento: now,
    meioPagamento: 'PIX',
    identificadorExterno: 'comp-seed-001',
    movimentacaoEscrowId: ESCROW_MOV_ID,
    novo: false,
  },
];

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

const renegociacoes: Record<string, ReturnType<typeof renegociacaoFake>> = {
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
  [RENEG_PARA_RECUSA_ID]: renegociacaoFake(RENEG_PARA_RECUSA_ID, PARCELA_ATRASADA_ID, 'PROPOSTA', {
    novoValorParcela: 980.0,
    novoVencimento: '2026-07-10',
    numeroParcelas: 4,
    desconto: 20.0,
  }),
  [RENEG_DECIDIDA_ID]: renegociacaoFake(
    RENEG_DECIDIDA_ID,
    PARCELA_PARA_RECEBIMENTO_ID,
    'ACEITA',
    { novoValorParcela: 900.0, novoVencimento: '2026-07-10', numeroParcelas: 3, desconto: 100.0 },
    now,
    AGENDA_SUBSTITUTA_ID,
  ),
};

const cobrancaHandlers = [
  http.get(`${baseUrl}/cobranca/contratos/:contratoId/agenda`, ({ params }) => {
    const contratoId = params['contratoId'] as string;
    const path = `/api/v1/cobranca/contratos/${contratoId}/agenda`;
    if (contratoId === CONTRATO_SEM_OWNERSHIP_ID) {
      return errorResponse(403, 'Forbidden', 'Contrato de outro tomador', path);
    }
    if (contratoId !== COBRANCA_CONTRATO_ID) {
      return errorResponse(404, 'Not Found', 'Agenda nao encontrada', path);
    }
    return HttpResponse.json(agendaFake);
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
const PIX_ENTIDADE_ID = 'd0000000-0000-4000-8000-000000000002';

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
        recebimentosDoDia: 18450.75,
        inadimplenciaTotal: { valorTotal: 92000.0, numeroParcelas: 5 },
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
    parametro('credito.valor.maximo.pf', 'DECIMAL', '50000.00', 'Valor maximo de proposta para PF'),
    parametro(
      'credito.valor.maximo.pj',
      'DECIMAL',
      '200000.00',
      'Valor maximo de proposta para PJ',
    ),
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
      return errorResponse(404, 'Not Found', 'usuario nao encontrado', path);
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
      return errorResponse(404, 'Not Found', 'usuario nao encontrado', path);
    }
    rolesPorUsuario[id] = [...new Set(body.roles)];
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
      return errorResponse(404, 'Not Found', 'usuario nao encontrado', path);
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
      return errorResponse(404, 'Not Found', 'usuario nao encontrado', path);
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

function seedTransferenciasPix(): Record<string, DesembolsoMockState> {
  const base = (transferenciaId: string, status: string): DesembolsoMockState => ({
    transferenciaId,
    contratoId: '6f0799c0-98b9-6d9d-bc4a-7d6f5b772a01',
    status,
    valor: VALOR_DESEMBOLSO_ELEGIVEL,
    chaveDestinoMascara: 'joa***',
  });
  return {
    [TRANSFERENCIA_CONCLUIDA_ID]: base(TRANSFERENCIA_CONCLUIDA_ID, 'CONCLUIDA'),
    [TRANSFERENCIA_PROCESSANDO_ID]: base(TRANSFERENCIA_PROCESSANDO_ID, 'PROCESSANDO'),
    [TRANSFERENCIA_PROVIDER_OFF_ID]: base(TRANSFERENCIA_PROVIDER_OFF_ID, 'SOLICITADA'),
  };
}

// Recurso de referencia (sem o flag `novo`, que e definido por operacao: POST novo/reaproveitado,
// GET sempre false). codigoCopiaCola e dado de pagamento nao sensivel.
function referenciaAtivaSeed(): Record<string, unknown> {
  return {
    referenciaId: REFERENCIA_ATIVA_ID,
    parcelaId: PIX_PARCELA_RECEBIVEL_ID,
    txid: `SEP${REFERENCIA_ATIVA_ID.replace(/-/g, '')}`,
    codigoCopiaCola: `00020126360014br.gov.bcb.pix0114${REFERENCIA_ATIVA_ID.slice(0, 8)}5204000053039865802BR6304ABCD`,
    valorEsperado: VALOR_PARCELA_PIX,
    status: 'ATIVA',
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
    // Reconciliacao so avanca: PROCESSANDO -> CONCLUIDA ao reconsultar o provider.
    if (transferencia.status === 'PROCESSANDO') {
      transferencia.status = 'CONCLUIDA';
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
  return {
    [OPORTUNIDADE_DISPONIVEL_ID]: {
      id: OPORTUNIDADE_DISPONIVEL_ID,
      propostaId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78d001',
      contratoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78e001',
      valor: 25000.0,
      prazoMeses: 12,
      taxaJurosMensal: 0.025,
      status: 'DISPONIVEL',
      dataCriacao: now,
    },
    [OPORTUNIDADE_DISPONIVEL_2_ID]: {
      id: OPORTUNIDADE_DISPONIVEL_2_ID,
      propostaId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78d002',
      contratoId: null,
      valor: 40000.0,
      prazoMeses: 24,
      taxaJurosMensal: 0.019,
      status: 'DISPONIVEL',
      dataCriacao: now,
    },
    [OPORTUNIDADE_ENCERRADA_ID]: {
      id: OPORTUNIDADE_ENCERRADA_ID,
      propostaId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78d003',
      contratoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78e003',
      valor: 15000.0,
      prazoMeses: 6,
      taxaJurosMensal: 0.031,
      status: 'ENCERRADA',
      dataCriacao: now,
    },
  };
}

function operacaoAssociadaSeed(): Record<string, unknown> {
  // Carteira nasce por associacao assistida do admin (nao por interesse). Cobranca e so agregada.
  return {
    id: OPERACAO_ASSOCIADA_ID,
    contratoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78e001',
    oportunidadeId: OPORTUNIDADE_DISPONIVEL_ID,
    status: 'ASSOCIADA',
    justificativa: 'Associacao assistida apos formalizacao do contrato',
    valor: 25000.0,
    prazoMeses: 12,
    taxaJurosMensal: 0.025,
    contratoStatus: 'ASSINADO',
    cobranca: {
      numeroParcelas: 12,
      valorTotal: 27000.0,
      parcelasPagas: 2,
      parcelasAtrasadas: 0,
      totalRecebido: 4500.0,
      proximoVencimento: '2026-07-10',
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
      motivoInelegibilidade: credora['motivoInelegibilidade'] ?? null,
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
  http.post(`${baseUrl}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    const usuario = body.password === '123456' ? loginUsuarios[body.username ?? ''] : undefined;
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

    if (body.username === 'duplicado@empresa.com') {
      return errorResponse(409, 'Conflict', 'username ja cadastrado', '/api/v1/usuarios');
    }

    return HttpResponse.json(
      {
        id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771010',
        username: body.username,
        role: body.role,
        dataCriacao: now,
        dataModificacao: now,
        criadoPor: 'system',
        modificadoPor: 'system',
      },
      { status: 201 },
    );
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

  http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(currentMockUser)),

  http.get(`${baseUrl}/usuarios`, () => HttpResponse.json(usuariosFake)),

  http.get(`${baseUrl}/usuarios/:id`, ({ params }) => {
    const id = params['id'] as string;
    const found = usuariosFake.find((u) => u.id === id);
    if (!found) {
      return errorResponse(404, 'Not Found', 'usuario nao encontrado', `/api/v1/usuarios/${id}`);
    }
    return HttpResponse.json(found);
  }),

  http.patch(`${baseUrl}/usuarios/:id/senha`, async ({ request, params }) => {
    const id = params['id'] as string;
    const body = (await request.json()) as { passwordAtual?: string; novaSenha?: string };

    if (body.passwordAtual !== '123456') {
      return errorResponse(
        400,
        'Bad Request',
        'senha atual invalida',
        `/api/v1/usuarios/${id}/senha`,
      );
    }
    if (!body.novaSenha || body.novaSenha.length !== 6) {
      return errorResponse(
        400,
        'Bad Request',
        'novaSenha deve conter exatamente 6 caracteres',
        `/api/v1/usuarios/${id}/senha`,
      );
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

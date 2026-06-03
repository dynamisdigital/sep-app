import { http, HttpResponse } from 'msw';

const baseUrl = 'http://localhost:8080/api/v1';
const now = '2026-04-24T18:30:00-03:00';

const adminUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001',
  username: 'admin@empresa.com',
  role: 'ADMIN',
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const clienteUsuario = {
  id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771002',
  username: 'cliente@empresa.com',
  role: 'CLIENTE',
  dataCriacao: now,
  dataModificacao: now,
  criadoPor: 'system',
  modificadoPor: 'system',
};

const usuariosFake = [adminUsuario, clienteUsuario];

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

// Mocks alinhados ao PRD §21 (contratos iniciais dos endpoints).
// Sucesso login usa admin@empresa.com / 123456.
// 401: credenciais invalidas. 409: cadastro com duplicado@empresa.com.
export const handlers = [
  http.post(`${baseUrl}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };

    if (body.username !== 'admin@empresa.com' || body.password !== '123456') {
      return errorResponse(401, 'Unauthorized', 'Credenciais invalidas', '/api/v1/auth/login');
    }

    return HttpResponse.json({
      accessToken: 'mock-jwt-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      usuario: adminUsuario,
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
      usuario: adminUsuario,
      mfaRequired: false,
      mfaChallengeId: null,
    }),
  ),

  http.post(`${baseUrl}/auth/logout-all`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${baseUrl}/auth/me`, () => HttpResponse.json(adminUsuario)),

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
];

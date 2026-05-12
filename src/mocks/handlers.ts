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
];

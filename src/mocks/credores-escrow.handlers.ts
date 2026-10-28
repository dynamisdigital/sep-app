import { http, HttpResponse, type JsonBodyType } from 'msw';

import type {
  AlocacaoRequest,
  AlterarStatusCredorRequest,
  AporteRequest,
  DestinatarioRequest,
  SaqueRequest,
  StatusCredorGestao,
} from '../app/core/credores/credores-escrow.models';
import {
  alocar,
  alterarCategoria,
  alterarPerfilRisco,
  alterarStatusCredor,
  aprovarSaque,
  auditoriaDe,
  cancelarAlocacao,
  confirmarAporte,
  contaEscrowDe,
  credorDoUsuario,
  criarAporte,
  criarDestinatario,
  desembolsarOperacao,
  detalheCredor,
  encerrarSemFormar,
  extratoDe,
  limiteDe,
  listarAlocacoes,
  listarAportes,
  listarCredores,
  listarDestinatarios,
  listarDivergencias,
  listarOperacoesEscrow,
  listarOportunidadesAlocaveis,
  listarOportunidadesTesouraria,
  listarSaques,
  listarSaquesPendentes,
  rejeitarSaque,
  removerDestinatario,
  repassarParcela,
  resumoTesouraria,
  solicitarSaque,
  type ResultadoEscrow,
} from './data/credores-escrow.store';

interface UsuarioMock {
  id: string;
  username: string;
  role: string;
}

type ErroFn = (status: number, error: string, message: string, path: string) => Response;

const NOME_STATUS: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
};

const OPERADORES = ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'];
const GESTORES = ['BACKOFFICE', 'ADMIN'];
const TESOURARIA = ['FINANCEIRO', 'ADMIN'];

// Replays idempotentes: a mesma `Idempotency-Key` na mesma rota devolve a resposta da primeira
// chamada, sem repetir o efeito. O backend real deve fazer o mesmo (regra do projeto para dinheiro).
const respostasIdempotentes = new Map<string, { status: number; corpo: JsonBodyType }>();

/** Limpa as chaves de idempotencia; os testes chamam junto com `resetCredoresEscrowState`. */
export function resetIdempotenciaEscrow(): void {
  respostasIdempotentes.clear();
}

// Handlers da conta escrow do credor e da gestao de credores.
//  - Credor (usuario CLIENTE com credor): le a propria conta, aporta, aloca, saca. Isolamento pela
//    sessao: nenhuma rota recebe o id do credor.
//  - Backoffice: BACKOFFICE e ADMIN gerem o cadastro; FINANCEIRO e ADMIN movimentam a tesouraria.
// Todas as rotas ficam sob /credores/me/... e /backoffice/credores... ; `/credores/me` exato continua
// com o handler da credora, e estas rotas sao mais especificas.
export function criarHandlersCredoresEscrow(
  baseUrl: string,
  usuarioAtual: () => UsuarioMock,
  erro: ErroFn,
) {
  const falhar = (path: string, resultado: { status: number; erro: string }) =>
    erro(resultado.status, NOME_STATUS[resultado.status] ?? 'Error', resultado.erro, path);

  function comCredor(
    path: string,
    acao: (credorId: string) => Response | Promise<Response>,
  ): Response | Promise<Response> {
    const credor = credorDoUsuario(usuarioAtual().id);
    if (!credor) return erro(404, 'Not Found', 'Usuario nao possui credor', path);
    return acao(credor.id);
  }

  function comPapel(
    path: string,
    papeis: string[],
    acao: () => Response | Promise<Response>,
  ): Response | Promise<Response> {
    if (!papeis.includes(usuarioAtual().role)) {
      return erro(403, 'Forbidden', 'Papel sem permissao para esta operacao', path);
    }
    return acao();
  }

  /** Executa a acao uma unica vez por Idempotency-Key; sem a chave, executa sempre. */
  async function idempotente(
    request: Request,
    path: string,
    sucesso: number,
    acao: () => ResultadoEscrow<JsonBodyType>,
  ): Promise<Response> {
    const chave = request.headers.get('Idempotency-Key');
    const marca = chave ? `${usuarioAtual().id}|${path}|${chave}` : null;
    if (marca) {
      const guardada = respostasIdempotentes.get(marca);
      if (guardada) {
        return HttpResponse.json(guardada.corpo, {
          status: guardada.status,
          headers: { 'Idempotent-Replay': 'true' },
        });
      }
    }
    const resultado = acao();
    if (!resultado.ok) return falhar(path, resultado);
    if (marca) respostasIdempotentes.set(marca, { status: sucesso, corpo: resultado.valor });
    return HttpResponse.json(resultado.valor, { status: sucesso });
  }

  const credor = `${baseUrl}/credores/me`;
  const gestao = `${baseUrl}/backoffice/credores`;
  const tesouraria = `${baseUrl}/backoffice/tesouraria`;

  return [
    // ---------------- Credor: oportunidades abertas ----------------
    http.get(`${credor}/oportunidades`, () => {
      const path = '/api/v1/credores/me/oportunidades';
      return comCredor(path, () => HttpResponse.json(listarOportunidadesAlocaveis()));
    }),

    // ---------------- Credor: conta escrow ----------------
    http.get(`${credor}/escrow`, () => {
      const path = '/api/v1/credores/me/escrow';
      return comCredor(path, (id) => {
        const conta = contaEscrowDe(id);
        return conta
          ? HttpResponse.json(conta)
          : erro(404, 'Not Found', 'Conta nao encontrada', path);
      });
    }),

    http.get(`${credor}/escrow/extrato`, () =>
      comCredor('/api/v1/credores/me/escrow/extrato', (id) => HttpResponse.json(extratoDe(id))),
    ),

    // ---------------- Credor: aporte ----------------
    http.get(`${credor}/escrow/aportes`, () =>
      comCredor('/api/v1/credores/me/escrow/aportes', (id) => HttpResponse.json(listarAportes(id))),
    ),

    http.post(`${credor}/escrow/aportes`, async ({ request }) => {
      const path = '/api/v1/credores/me/escrow/aportes';
      const corpo = (await request.clone().json()) as Partial<AporteRequest>;
      return comCredor(path, (id) =>
        idempotente(request, path, 201, () => criarAporte(id, Number(corpo.valor))),
      );
    }),

    // So existe no mock: simula o webhook de deposito confirmado que o parceiro enviaria.
    http.post(`${credor}/escrow/aportes/:id/simular-confirmacao`, ({ params }) => {
      const path = `/api/v1/credores/me/escrow/aportes/${String(params['id'])}/simular-confirmacao`;
      return comCredor(path, (id) => {
        const resultado = confirmarAporte(id, String(params['id']));
        return resultado.ok ? HttpResponse.json(resultado.valor) : falhar(path, resultado);
      });
    }),

    // ---------------- Credor: alocacao ----------------
    http.get(`${credor}/alocacoes`, () =>
      comCredor('/api/v1/credores/me/alocacoes', (id) => HttpResponse.json(listarAlocacoes(id))),
    ),

    http.post(`${credor}/alocacoes`, async ({ request }) => {
      const path = '/api/v1/credores/me/alocacoes';
      const corpo = (await request.clone().json()) as Partial<AlocacaoRequest>;
      return comCredor(path, (id) =>
        idempotente(request, path, 201, () =>
          alocar(id, {
            oportunidadeId: String(corpo.oportunidadeId ?? ''),
            valor: Number(corpo.valor),
            cienciaRisco: corpo.cienciaRisco === true,
          }),
        ),
      );
    }),

    http.delete(`${credor}/alocacoes/:id`, ({ params }) => {
      const path = `/api/v1/credores/me/alocacoes/${String(params['id'])}`;
      return comCredor(path, (id) => {
        const resultado = cancelarAlocacao(id, String(params['id']));
        return resultado.ok ? new HttpResponse(null, { status: 204 }) : falhar(path, resultado);
      });
    }),

    http.get(`${credor}/limites/:oportunidadeId`, ({ params }) => {
      const path = `/api/v1/credores/me/limites/${String(params['oportunidadeId'])}`;
      return comCredor(path, (id) => {
        const resultado = limiteDe(id, String(params['oportunidadeId']));
        return resultado.ok ? HttpResponse.json(resultado.valor) : falhar(path, resultado);
      });
    }),

    // ---------------- Credor: destinatarios e saque ----------------
    http.get(`${credor}/destinatarios`, () =>
      comCredor('/api/v1/credores/me/destinatarios', (id) =>
        HttpResponse.json(listarDestinatarios(id)),
      ),
    ),

    http.post(`${credor}/destinatarios`, async ({ request }) => {
      const path = '/api/v1/credores/me/destinatarios';
      const corpo = (await request.json()) as Partial<DestinatarioRequest>;
      return comCredor(path, (id) => {
        const resultado = criarDestinatario(id, {
          banco: String(corpo.banco ?? ''),
          agencia: String(corpo.agencia ?? ''),
          conta: String(corpo.conta ?? ''),
          tipoConta: corpo.tipoConta ?? 'CORRENTE',
        });
        return resultado.ok
          ? HttpResponse.json(resultado.valor, { status: 201 })
          : falhar(path, resultado);
      });
    }),

    http.delete(`${credor}/destinatarios/:id`, ({ params }) => {
      const path = `/api/v1/credores/me/destinatarios/${String(params['id'])}`;
      return comCredor(path, (id) => {
        const resultado = removerDestinatario(id, String(params['id']));
        return resultado.ok ? new HttpResponse(null, { status: 204 }) : falhar(path, resultado);
      });
    }),

    http.get(`${credor}/saques`, () =>
      comCredor('/api/v1/credores/me/saques', (id) => HttpResponse.json(listarSaques(id))),
    ),

    http.post(`${credor}/saques`, async ({ request }) => {
      const path = '/api/v1/credores/me/saques';
      const corpo = (await request.clone().json()) as Partial<SaqueRequest>;
      return comCredor(path, (id) =>
        idempotente(request, path, 201, () =>
          solicitarSaque(id, {
            destinatarioId: String(corpo.destinatarioId ?? ''),
            valor: Number(corpo.valor),
          }),
        ),
      );
    }),

    // ---------------- Backoffice: tesouraria (antes de /:id) ----------------
    http.get(`${tesouraria}/resumo`, () => {
      const path = '/api/v1/backoffice/tesouraria/resumo';
      return comPapel(path, OPERADORES, () => HttpResponse.json(resumoTesouraria()));
    }),

    http.get(`${tesouraria}/divergencias`, () => {
      const path = '/api/v1/backoffice/tesouraria/divergencias';
      return comPapel(path, OPERADORES, () => HttpResponse.json(listarDivergencias()));
    }),

    http.get(`${tesouraria}/oportunidades`, () => {
      const path = '/api/v1/backoffice/tesouraria/oportunidades';
      return comPapel(path, OPERADORES, () => HttpResponse.json(listarOportunidadesTesouraria()));
    }),

    http.get(`${tesouraria}/operacoes`, () => {
      const path = '/api/v1/backoffice/tesouraria/operacoes';
      return comPapel(path, OPERADORES, () => HttpResponse.json(listarOperacoesEscrow()));
    }),

    http.get(`${tesouraria}/saques`, () => {
      const path = '/api/v1/backoffice/tesouraria/saques';
      return comPapel(path, OPERADORES, () => HttpResponse.json(listarSaquesPendentes()));
    }),

    http.post(`${tesouraria}/saques/:id/aprovar`, ({ params, request }) => {
      const path = `/api/v1/backoffice/tesouraria/saques/${String(params['id'])}/aprovar`;
      return comPapel(path, TESOURARIA, () =>
        idempotente(request, path, 200, () => aprovarSaque(String(params['id']))),
      );
    }),

    http.post(`${tesouraria}/saques/:id/rejeitar`, ({ params }) => {
      const path = `/api/v1/backoffice/tesouraria/saques/${String(params['id'])}/rejeitar`;
      return comPapel(path, TESOURARIA, () => {
        const resultado = rejeitarSaque(String(params['id']));
        return resultado.ok ? HttpResponse.json(resultado.valor) : falhar(path, resultado);
      });
    }),

    http.post(`${tesouraria}/oportunidades/:id/desembolsar`, async ({ params, request }) => {
      const path = `/api/v1/backoffice/tesouraria/oportunidades/${String(params['id'])}/desembolsar`;
      const corpo = (await request
        .clone()
        .json()
        .catch(() => ({}))) as { operacaoId?: string };
      return comPapel(path, TESOURARIA, () =>
        idempotente(request, path, 200, () =>
          desembolsarOperacao(
            String(params['id']),
            corpo.operacaoId ?? `op-${String(params['id'])}`,
          ),
        ),
      );
    }),

    http.post(`${tesouraria}/oportunidades/:id/encerrar`, async ({ params, request }) => {
      const path = `/api/v1/backoffice/tesouraria/oportunidades/${String(params['id'])}/encerrar`;
      const corpo = (await request.json().catch(() => ({}))) as { motivo?: string };
      return comPapel(path, TESOURARIA, () => {
        const resultado = encerrarSemFormar(
          String(params['id']),
          corpo.motivo?.trim() || 'Operação não formada',
        );
        return resultado.ok ? HttpResponse.json(resultado.valor) : falhar(path, resultado);
      });
    }),

    http.post(
      `${tesouraria}/operacoes/:id/parcelas/:numero/repasse`,
      async ({ params, request }) => {
        const path = `/api/v1/backoffice/tesouraria/operacoes/${String(params['id'])}/parcelas/${String(params['numero'])}/repasse`;
        const corpo = (await request.clone().json()) as { principal?: number; juros?: number };
        return comPapel(path, TESOURARIA, () =>
          idempotente(request, path, 200, () =>
            repassarParcela(String(params['id']), Number(params['numero']), {
              principal: Number(corpo.principal ?? 0),
              juros: Number(corpo.juros ?? 0),
            }),
          ),
        );
      },
    ),

    // ---------------- Backoffice: gestao de credores ----------------
    http.get(gestao, ({ request }) => {
      const path = '/api/v1/backoffice/credores';
      const status = new URL(request.url).searchParams.get('status');
      return comPapel(path, OPERADORES, () =>
        HttpResponse.json(listarCredores((status as StatusCredorGestao | null) ?? undefined)),
      );
    }),

    http.get(`${gestao}/:id`, ({ params }) => {
      const path = `/api/v1/backoffice/credores/${String(params['id'])}`;
      return comPapel(path, OPERADORES, () => {
        const detalhe = detalheCredor(String(params['id']));
        return detalhe
          ? HttpResponse.json(detalhe)
          : erro(404, 'Not Found', 'Credor nao encontrado', path);
      });
    }),

    http.get(`${gestao}/:id/extrato`, ({ params }) => {
      const path = `/api/v1/backoffice/credores/${String(params['id'])}/extrato`;
      return comPapel(path, OPERADORES, () => {
        if (!detalheCredor(String(params['id']))) {
          return erro(404, 'Not Found', 'Credor nao encontrado', path);
        }
        return HttpResponse.json(extratoDe(String(params['id'])));
      });
    }),

    http.get(`${gestao}/:id/auditoria`, ({ params }) => {
      const path = `/api/v1/backoffice/credores/${String(params['id'])}/auditoria`;
      return comPapel(path, OPERADORES, () => {
        if (!detalheCredor(String(params['id']))) {
          return erro(404, 'Not Found', 'Credor nao encontrado', path);
        }
        return HttpResponse.json(auditoriaDe(String(params['id'])));
      });
    }),

    http.patch(`${gestao}/:id/status`, async ({ params, request }) => {
      const path = `/api/v1/backoffice/credores/${String(params['id'])}/status`;
      const corpo = (await request.json()) as Partial<AlterarStatusCredorRequest>;
      return comPapel(path, GESTORES, () => {
        const status = corpo.status;
        if (status !== 'ATIVO' && status !== 'SUSPENSO' && status !== 'REPROVADO') {
          return erro(400, 'Bad Request', 'Status invalido', path);
        }
        const usuario = usuarioAtual();
        const resultado = alterarStatusCredor(String(params['id']), status, corpo.motivo ?? '', {
          username: usuario.username,
          role: usuario.role,
        });
        return resultado.ok ? HttpResponse.json(resultado.valor) : falhar(path, resultado);
      });
    }),

    http.patch(`${gestao}/:id/perfil-risco`, async ({ params, request }) => {
      const path = `/api/v1/backoffice/credores/${String(params['id'])}/perfil-risco`;
      const corpo = (await request.json()) as { perfilRisco?: string };
      return comPapel(path, GESTORES, () => {
        const perfil = corpo.perfilRisco;
        if (perfil !== 'CONSERVADOR' && perfil !== 'MODERADO' && perfil !== 'ARROJADO') {
          return erro(400, 'Bad Request', 'Perfil de risco invalido', path);
        }
        const usuario = usuarioAtual();
        const resultado = alterarPerfilRisco(String(params['id']), perfil, {
          username: usuario.username,
          role: usuario.role,
        });
        return resultado.ok ? HttpResponse.json(resultado.valor) : falhar(path, resultado);
      });
    }),

    http.patch(`${gestao}/:id/categoria`, async ({ params, request }) => {
      const path = `/api/v1/backoffice/credores/${String(params['id'])}/categoria`;
      const corpo = (await request.json()) as { categoria?: string };
      return comPapel(path, GESTORES, () => {
        const categoria = corpo.categoria;
        if (categoria !== 'QUALIFICADO' && categoria !== 'NAO_QUALIFICADO') {
          return erro(400, 'Bad Request', 'Categoria invalida', path);
        }
        const usuario = usuarioAtual();
        const resultado = alterarCategoria(String(params['id']), categoria, {
          username: usuario.username,
          role: usuario.role,
        });
        return resultado.ok ? HttpResponse.json(resultado.valor) : falhar(path, resultado);
      });
    }),
  ];
}

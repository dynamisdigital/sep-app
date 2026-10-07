import { http, HttpResponse } from 'msw';

import type { AgendaPagamentoResponse } from '../app/core/api/api.models';
import type { CriarAutorizacaoPixRequest } from '../app/core/pix-automatico/pix-automatico.models';
import {
  atualizarParametros,
  consultarAutorizacao,
  consultarParametros,
  criarAutorizacao,
  debitosDe,
  type ErroPix,
  listarAutorizacoes,
  resumo,
  revogar,
  simularAceite,
} from './data/pix-automatico.store';

interface UsuarioMock {
  username: string;
  role: string;
}

type ErroFn = (status: number, error: string, message: string, path: string) => Response;

const TITULO_STATUS: Record<number, string> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
};

const PAPEIS_OPERACIONAIS = ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'];

// Handlers do Pix Automatico do Credito. O que o backend precisa impor: so a equipe operacional cria e
// revoga autorizacoes, so o ADMIN mexe nos parametros, e uma chave geral desligada barra novas autorizacoes.
export function criarHandlersPixAutomatico(
  baseUrl: string,
  usuarioAtual: () => UsuarioMock,
  erro: ErroFn,
  agendaDe: (contratoId: string) => AgendaPagamentoResponse | undefined,
) {
  const url = `${baseUrl}/pix-automatico`;

  const operacional = (path: string) =>
    PAPEIS_OPERACIONAIS.includes(usuarioAtual().role)
      ? null
      : erro(403, 'Forbidden', 'Area exclusiva da equipe operacional', path);

  const falha = (e: ErroPix, path: string) =>
    erro(e.status, TITULO_STATUS[e.status] ?? 'Error', e.erro, path);

  return [
    http.get(`${url}/parametros`, () => {
      const path = '/api/v1/pix-automatico/parametros';
      return operacional(path) ?? HttpResponse.json(consultarParametros());
    }),

    http.put(`${url}/parametros`, async ({ request }) => {
      const path = '/api/v1/pix-automatico/parametros';
      if (usuarioAtual().role !== 'ADMIN') {
        return erro(403, 'Forbidden', 'Somente o administrador altera os parametros', path);
      }
      const { justificativa, ...mudanca } = (await request.json()) as Record<string, unknown> & {
        justificativa?: string;
      };
      if (!justificativa?.trim()) {
        return erro(400, 'Bad Request', 'A justificativa e obrigatoria', path);
      }
      const res = atualizarParametros(mudanca);
      return 'erro' in res ? falha(res, path) : HttpResponse.json(res);
    }),

    http.get(`${url}/resumo`, () => {
      const path = '/api/v1/pix-automatico/resumo';
      return operacional(path) ?? HttpResponse.json(resumo(agendaDe));
    }),

    http.get(`${url}/autorizacoes`, () => {
      const path = '/api/v1/pix-automatico/autorizacoes';
      return operacional(path) ?? HttpResponse.json(listarAutorizacoes());
    }),

    http.post(`${url}/autorizacoes`, async ({ request }) => {
      const path = '/api/v1/pix-automatico/autorizacoes';
      const negado = operacional(path);
      if (negado) return negado;
      const body = (await request.json()) as CriarAutorizacaoPixRequest;
      const res = criarAutorizacao(agendaDe(body.contratoId), body);
      return 'erro' in res ? falha(res, path) : HttpResponse.json(res.autorizacao, { status: 201 });
    }),

    http.post(`${url}/autorizacoes/:id/revogar`, async ({ request, params }) => {
      const path = `/api/v1/pix-automatico/autorizacoes/${String(params['id'])}/revogar`;
      const negado = operacional(path);
      if (negado) return negado;
      const body = (await request.json()) as { motivo: string };
      const res = revogar(String(params['id']), body.motivo);
      return 'erro' in res ? falha(res, path) : HttpResponse.json(res);
    }),

    http.post(`${url}/autorizacoes/:id/simular-aceite`, async ({ request, params }) => {
      const path = `/api/v1/pix-automatico/autorizacoes/${String(params['id'])}/simular-aceite`;
      const negado = operacional(path);
      if (negado) return negado;
      const body = (await request.json()) as { aceitou: boolean };
      const res = simularAceite(String(params['id']), body.aceitou);
      return 'erro' in res ? falha(res, path) : HttpResponse.json(res);
    }),

    http.get(`${url}/autorizacoes/:id/debitos`, ({ params }) => {
      const path = `/api/v1/pix-automatico/autorizacoes/${String(params['id'])}/debitos`;
      const negado = operacional(path);
      if (negado) return negado;
      const a = consultarAutorizacao(String(params['id']));
      const agenda = a ? agendaDe(a.contratoId) : undefined;
      if (!a || !agenda) return erro(404, 'Not Found', 'Autorizacao nao encontrada', path);
      return HttpResponse.json(debitosDe(a, agenda));
    }),
  ];
}

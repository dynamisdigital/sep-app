import { http, HttpResponse } from 'msw';

import type {
  ExecutarAnaliseRequest,
  ParametrosAnalise,
  RegistrarParecerRequest,
} from '../app/core/credito/analise-credito.models';
import {
  atualizarParametros,
  consultarAnalise,
  consultarParametros,
  type ErroAnalise,
  executarAnalise,
  type PropostaParaAnalise,
  registrarParecer,
} from './data/analise-credito.store';

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

// Handlers da analise de credito. O que o backend precisa impor: so a equipe operacional consulta bureaus e
// registra parecer, so o ADMIN mexe nos parametros, e consulta sem consentimento do titular e recusada.
export function criarHandlersAnaliseCredito(
  baseUrl: string,
  usuarioAtual: () => UsuarioMock,
  erro: ErroFn,
  propostaDe: (id: string) => PropostaParaAnalise | undefined,
) {
  const url = `${baseUrl}/credito`;

  const operacional = (path: string) =>
    PAPEIS_OPERACIONAIS.includes(usuarioAtual().role)
      ? null
      : erro(403, 'Forbidden', 'Área exclusiva da equipe operacional', path);

  const falha = (e: ErroAnalise, path: string) =>
    erro(e.status, TITULO_STATUS[e.status] ?? 'Error', e.erro, path);

  return [
    http.get(`${url}/analise/parametros`, () => {
      const path = '/api/v1/credito/analise/parametros';
      return operacional(path) ?? HttpResponse.json(consultarParametros());
    }),

    http.put(`${url}/analise/parametros`, async ({ request }) => {
      const path = '/api/v1/credito/analise/parametros';
      if (usuarioAtual().role !== 'ADMIN') {
        return erro(403, 'Forbidden', 'Somente o administrador altera os parâmetros', path);
      }
      const { justificativa, ...mudanca } = (await request.json()) as Partial<ParametrosAnalise> & {
        justificativa?: string;
      };
      if (!justificativa?.trim()) {
        return erro(400, 'Bad Request', 'A justificativa é obrigatória', path);
      }
      const res = atualizarParametros(mudanca);
      return 'erro' in res ? falha(res, path) : HttpResponse.json(res);
    }),

    http.get(`${url}/propostas/:id/analise`, ({ params }) => {
      const id = String(params['id']);
      const path = `/api/v1/credito/propostas/${id}/analise`;
      const negado = operacional(path);
      if (negado) return negado;
      if (!propostaDe(id)) return erro(404, 'Not Found', 'Proposta não encontrada', path);
      const a = consultarAnalise(id);
      return a
        ? HttpResponse.json(a)
        : erro(404, 'Not Found', 'Proposta ainda não analisada', path);
    }),

    http.post(`${url}/propostas/:id/analise`, async ({ request, params }) => {
      const id = String(params['id']);
      const path = `/api/v1/credito/propostas/${id}/analise`;
      const negado = operacional(path);
      if (negado) return negado;
      const body = (await request.json()) as ExecutarAnaliseRequest;
      const res = executarAnalise(propostaDe(id), body);
      return 'erro' in res ? falha(res, path) : HttpResponse.json(res.analise);
    }),

    http.post(`${url}/propostas/:id/analise/parecer`, async ({ request, params }) => {
      const id = String(params['id']);
      const path = `/api/v1/credito/propostas/${id}/analise/parecer`;
      const negado = operacional(path);
      if (negado) return negado;
      if (!propostaDe(id)) return erro(404, 'Not Found', 'Proposta não encontrada', path);
      const body = (await request.json()) as RegistrarParecerRequest;
      const res = registrarParecer(id, body, usuarioAtual().username);
      return 'erro' in res ? falha(res, path) : HttpResponse.json(res);
    }),
  ];
}

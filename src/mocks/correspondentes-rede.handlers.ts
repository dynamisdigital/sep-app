import { http, HttpResponse } from 'msw';

import type {
  AtualizarPercentuaisSubRequest,
  CriarSubRequest,
} from '../app/core/correspondentes/correspondentes-rede.models';
import { registrarAuditoria } from './data/correspondentes-gestao.store';
import {
  atualizarPercentuaisDoSub,
  carteiraDaRede,
  comissaoDaRede,
  criarSubNaRede,
  minhaPosicao,
  redeDoMajoritario,
  suspenderOuReativarSub,
  type ErroRede,
} from './data/correspondentes-rede.store';
import { correspondentePorEmail, nivelDe } from './data/correspondentes.store';

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

// Handlers da rede de sub-correspondentes. Espelham o que o backend precisa impor:
//  - so o correspondente MAJORITARIO ve e administra a propria rede; um sub nao enxerga os outros subs
//    nem o que o majoritario ganha, apenas a propria posicao (majoritario e percentuais dele);
//  - o repasse de cada sub fica abaixo do teto que o SEP fixou por produto (422 quando passa);
//  - um sub nao credencia outros subs: a rede tem um nivel so.
// Devem ser registrados ANTES dos handlers de `/correspondentes/me/...` e `/correspondentes/:id`.
export function criarHandlersRede(baseUrl: string, usuarioAtual: () => UsuarioMock, erro: ErroFn) {
  const url = `${baseUrl}/correspondentes/me`;

  const identidade = (path: string) => {
    if (usuarioAtual().role !== 'CORRESPONDENTE') {
      return { negado: erro(403, 'Forbidden', 'Area exclusiva do correspondente', path) };
    }
    const proprio = correspondentePorEmail(usuarioAtual().username);
    return proprio
      ? { proprio }
      : { negado: erro(404, 'Not Found', 'Correspondente nao encontrado', path) };
  };

  const majoritario = (path: string) => {
    const r = identidade(path);
    if (r.negado) return r;
    if (nivelDe(r.proprio.id) !== 'MAJORITARIO') {
      return {
        negado: erro(
          403,
          'Forbidden',
          'Apenas o correspondente majoritario administra a rede',
          path,
        ),
      };
    }
    return r;
  };

  const falha = (e: ErroRede, path: string) =>
    erro(e.status, TITULO_STATUS[e.status] ?? 'Error', e.erro, path);

  const auditar = (acao: Parameters<typeof registrarAuditoria>[2], id: string, detalhe: string) => {
    const u = usuarioAtual();
    registrarAuditoria(u.username, u.role, acao, 'Sub-correspondente', id, detalhe);
  };

  return [
    http.get(`${url}/rede/posicao`, () => {
      const r = identidade('/api/v1/correspondentes/me/rede/posicao');
      return r.negado ?? HttpResponse.json(minhaPosicao(r.proprio!.id));
    }),

    http.get(`${url}/rede`, () => {
      const r = majoritario('/api/v1/correspondentes/me/rede');
      return r.negado ?? HttpResponse.json(redeDoMajoritario(r.proprio!.id));
    }),

    http.post(`${url}/rede/subs`, async ({ request }) => {
      const path = '/api/v1/correspondentes/me/rede/subs';
      const r = majoritario(path);
      if (r.negado) return r.negado;
      const body = (await request.json()) as CriarSubRequest;
      const res = criarSubNaRede(r.proprio!.id, body);
      if ('erro' in res) return falha(res, path);
      auditar(
        'SUB_CRIADO',
        res.sub.id,
        `${res.sub.nome} credenciado por ${r.proprio!.nome}; aguarda a validacao do cadastro pelo SEP.`,
      );
      return HttpResponse.json(res.sub, { status: 201 });
    }),

    http.put(`${url}/rede/subs/:subId/percentuais`, async ({ request, params }) => {
      const path = `/api/v1/correspondentes/me/rede/subs/${String(params['subId'])}/percentuais`;
      const r = majoritario(path);
      if (r.negado) return r.negado;
      const body = (await request.json()) as AtualizarPercentuaisSubRequest;
      const res = atualizarPercentuaisDoSub(r.proprio!.id, String(params['subId']), body);
      if ('erro' in res) return falha(res, path);
      auditar(
        'PERCENTUAIS_SUB_ALTERADOS',
        res.sub.id,
        `${res.sub.nome}: ${res.sub.percentuais
          .map((p) => `${p.produto} ${res.anteriores[p.produto] ?? 0}% → ${p.percentualSub}%`)
          .join('; ')}. Justificativa: ${body.justificativa}`,
      );
      return HttpResponse.json(res.sub);
    }),

    http.post(`${url}/rede/subs/:subId/suspender`, ({ params }) => {
      const path = `/api/v1/correspondentes/me/rede/subs/${String(params['subId'])}/suspender`;
      const r = majoritario(path);
      if (r.negado) return r.negado;
      const res = suspenderOuReativarSub(r.proprio!.id, String(params['subId']), true);
      if ('erro' in res) return falha(res, path);
      auditar('SUB_SUSPENSO', res.sub.id, `${res.sub.nome} suspenso pelo majoritario.`);
      return HttpResponse.json(res.sub);
    }),

    http.post(`${url}/rede/subs/:subId/reativar`, ({ params }) => {
      const path = `/api/v1/correspondentes/me/rede/subs/${String(params['subId'])}/reativar`;
      const r = majoritario(path);
      if (r.negado) return r.negado;
      const res = suspenderOuReativarSub(r.proprio!.id, String(params['subId']), false);
      if ('erro' in res) return falha(res, path);
      auditar('SUB_REATIVADO', res.sub.id, `${res.sub.nome} reativado pelo majoritario.`);
      return HttpResponse.json(res.sub);
    }),

    http.get(`${url}/rede/carteira`, () => {
      const r = majoritario('/api/v1/correspondentes/me/rede/carteira');
      return r.negado ?? HttpResponse.json(carteiraDaRede(r.proprio!.id));
    }),

    http.get(`${url}/rede/comissoes`, () => {
      const r = majoritario('/api/v1/correspondentes/me/rede/comissoes');
      return r.negado ?? HttpResponse.json(comissaoDaRede(r.proprio!.id));
    }),
  ];
}

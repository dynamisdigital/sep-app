import { http, HttpResponse } from 'msw';

import type {
  EnviarDocumentosRequest,
  ReatribuirVinculoRequest,
  RenovarCadastroRequest,
  ValidarEnvioRequest,
} from '../app/core/correspondentes/correspondentes.models';
import { comissaoPrevistaDe, registrarAuditoria } from './data/correspondentes-gestao.store';
import {
  consultarCorrespondente,
  consultarRede,
  correspondentePorEmail,
  listarBaseDe,
  listarEnviosDe,
  listarOperacoesDe,
  listarTodosOsEnvios,
  processarVigencia,
  reatribuirVinculo,
  registrarEnvio,
  renovarCadastro,
  resumoDe,
  validarEnvio,
} from './data/correspondentes.store';

interface UsuarioMock {
  username: string;
  role: string;
}

type ErroFn = (status: number, error: string, message: string, path: string) => Response;

// Handlers do modulo de Correspondentes. Espelham a autorizacao que o backend precisa impor:
//  - ADMIN administra a rede (leitura, renovacao, reatribuicao, apuracao de vigencia);
//  - CORRESPONDENTE so enxerga a propria base, resolvida pela identidade e nunca por parametro;
//  - BACKOFFICE/FINANCEIRO/ADMIN validam os envios de documentos.
// Toda alteracao grava um evento de auditoria com autor, papel e valores.
export function criarHandlersCorrespondentes(
  baseUrl: string,
  usuarioAtual: () => UsuarioMock,
  erro: ErroFn,
) {
  const apenasAdmin = (path: string) =>
    usuarioAtual().role === 'ADMIN'
      ? null
      : erro(403, 'Forbidden', 'Apenas ADMIN administra a rede de correspondentes', path);

  const apenasOperador = (path: string) =>
    ['ADMIN', 'BACKOFFICE', 'FINANCEIRO'].includes(usuarioAtual().role)
      ? null
      : erro(403, 'Forbidden', 'Apenas a operacao valida envios de correspondentes', path);

  // Resolve o correspondente pela identidade da sessao: o isolamento nao depende do cliente HTTP.
  const meuCorrespondente = (path: string) => {
    if (usuarioAtual().role !== 'CORRESPONDENTE') {
      return { negado: erro(403, 'Forbidden', 'Area exclusiva do correspondente', path) };
    }
    const proprio = correspondentePorEmail(usuarioAtual().username);
    return proprio
      ? { proprio }
      : { negado: erro(404, 'Not Found', 'Correspondente nao encontrado', path) };
  };

  const auditar = (
    acao: Parameters<typeof registrarAuditoria>[2],
    entidade: string,
    id: string,
    detalhe: string,
  ) => {
    const u = usuarioAtual();
    registrarAuditoria(u.username, u.role, acao, entidade, id, detalhe);
  };

  // A comissao prevista sai do livro de comissoes, e nao de um numero fixo no cadastro.
  const comComissao = <T extends { id: string; comissaoPrevista: number }>(c: T): T => ({
    ...c,
    comissaoPrevista: comissaoPrevistaDe(c.id),
  });

  const url = `${baseUrl}/correspondentes`;

  return [
    http.get(url, () => {
      const negado = apenasAdmin('/api/v1/correspondentes');
      if (negado) return negado;
      const rede = consultarRede();
      return HttpResponse.json({ ...rede, correspondentes: rede.correspondentes.map(comComissao) });
    }),

    http.get(`${url}/me/resumo`, () => {
      const r = meuCorrespondente('/api/v1/correspondentes/me/resumo');
      if (r.negado) return r.negado;
      const resumo = resumoDe(r.proprio!.id)!;
      return HttpResponse.json({ ...resumo, correspondente: comComissao(resumo.correspondente) });
    }),

    http.get(`${url}/me/base`, () => {
      const r = meuCorrespondente('/api/v1/correspondentes/me/base');
      return r.negado ?? HttpResponse.json(listarBaseDe(r.proprio!.id));
    }),

    http.get(`${url}/me/operacoes`, () => {
      const r = meuCorrespondente('/api/v1/correspondentes/me/operacoes');
      return r.negado ?? HttpResponse.json(listarOperacoesDe(r.proprio!.id));
    }),

    http.get(`${url}/me/envios`, () => {
      const r = meuCorrespondente('/api/v1/correspondentes/me/envios');
      return r.negado ?? HttpResponse.json(listarEnviosDe(r.proprio!.id));
    }),

    http.post(`${url}/me/envios`, async ({ request }) => {
      const path = '/api/v1/correspondentes/me/envios';
      const r = meuCorrespondente(path);
      if (r.negado) return r.negado;
      if (r.proprio!.status === 'VENCIDO' || r.proprio!.status === 'SUSPENSO') {
        return erro(
          409,
          'Conflict',
          'Cadastro vencido ou suspenso: renove o cadastro para enviar documentos',
          path,
        );
      }
      const body = (await request.json()) as EnviarDocumentosRequest;
      if (!body.atestoConferencia) {
        return erro(
          400,
          'Bad Request',
          'O atesto de conferencia dos documentos e obrigatorio',
          path,
        );
      }
      if (!body.clienteNome?.trim() || !body.documentos?.length) {
        return erro(400, 'Bad Request', 'Informe o cliente e ao menos um documento', path);
      }
      const criado = registrarEnvio(r.proprio!.id, body);
      auditar(
        'ENVIO_CRIADO',
        'Envio de documentos',
        criado.id,
        `Envio de ${criado.clienteNome} com atesto de conferência.`,
      );
      return HttpResponse.json(criado, { status: 201 });
    }),

    http.get(`${url}/:id`, ({ params }) => {
      const path = `/api/v1/correspondentes/${String(params['id'])}`;
      const negado = apenasAdmin(path);
      if (negado) return negado;
      const c = consultarCorrespondente(String(params['id']));
      return c
        ? HttpResponse.json(comComissao(c))
        : erro(404, 'Not Found', 'Correspondente nao encontrado', path);
    }),

    http.get(`${url}/:id/vinculos`, ({ params }) => {
      const path = `/api/v1/correspondentes/${String(params['id'])}/vinculos`;
      const negado = apenasAdmin(path);
      return negado ?? HttpResponse.json(listarBaseDe(String(params['id'])));
    }),

    http.post(`${url}/:id/renovar-cadastro`, async ({ request, params }) => {
      const path = `/api/v1/correspondentes/${String(params['id'])}/renovar-cadastro`;
      const negado = apenasAdmin(path);
      if (negado) return negado;
      const body = (await request.json()) as RenovarCadastroRequest;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.novaValidade ?? '')) {
        return erro(400, 'Bad Request', 'Informe a nova validade (AAAA-MM-DD)', path);
      }
      const antes = consultarCorrespondente(String(params['id']));
      const c = renovarCadastro(String(params['id']), body.novaValidade);
      if (c && antes) {
        auditar(
          'CADASTRO_RENOVADO',
          'Correspondente',
          c.id,
          `${c.nome}: validade ${antes.validadeCadastro} → ${c.validadeCadastro}, dados atualizados.`,
        );
      }
      return c
        ? HttpResponse.json(comComissao(c))
        : erro(404, 'Not Found', 'Correspondente nao encontrado', path);
    }),

    http.post(`${url}/vinculos/:vinculoId/reatribuir`, async ({ request, params }) => {
      const path = `/api/v1/correspondentes/vinculos/${String(params['vinculoId'])}/reatribuir`;
      const negado = apenasAdmin(path);
      if (negado) return negado;
      const body = (await request.json()) as ReatribuirVinculoRequest;
      const v = reatribuirVinculo(
        String(params['vinculoId']),
        body.correspondenteDestinoId ?? null,
      );
      if (v) {
        auditar(
          'VINCULO_REATRIBUIDO',
          'Vínculo',
          v.id,
          `${v.clienteNome} passou para ${v.correspondenteNome ?? 'o SEP (direto)'}.`,
        );
      }
      return v ? HttpResponse.json(v) : erro(404, 'Not Found', 'Vinculo nao encontrado', path);
    }),

    http.post(`${url}/vigencia/processar`, () => {
      const negado = apenasAdmin('/api/v1/correspondentes/vigencia/processar');
      if (negado) return negado;
      const resultado = processarVigencia();
      if (resultado.vinculosEncerrados > 0) {
        auditar(
          'VINCULO_ENCERRADO',
          'Vínculo',
          'vigencia',
          `${resultado.vinculosEncerrados} vínculo(s) encerrado(s) por cadastro vencido: ${resultado.correspondentesAfetados.join(', ')}.`,
        );
      }
      return HttpResponse.json(resultado);
    }),

    http.get(`${baseUrl}/backoffice/correspondentes/envios`, () => {
      const negado = apenasOperador('/api/v1/backoffice/correspondentes/envios');
      return negado ?? HttpResponse.json(listarTodosOsEnvios());
    }),

    http.post(
      `${baseUrl}/backoffice/correspondentes/envios/:id/validar`,
      async ({ request, params }) => {
        const path = `/api/v1/backoffice/correspondentes/envios/${String(params['id'])}/validar`;
        const negado = apenasOperador(path);
        if (negado) return negado;
        const body = (await request.json()) as ValidarEnvioRequest;
        if (body.decisao === 'DEVOLVER' && !body.observacao?.trim()) {
          return erro(400, 'Bad Request', 'Informe o motivo da devolucao', path);
        }
        const envio = validarEnvio(String(params['id']), body);
        if (envio) {
          auditar(
            body.decisao === 'VALIDAR' ? 'ENVIO_VALIDADO' : 'ENVIO_DEVOLVIDO',
            'Envio de documentos',
            envio.id,
            `Envio de ${envio.clienteNome} ${body.decisao === 'VALIDAR' ? 'validado' : `devolvido: ${body.observacao}`}.`,
          );
        }
        return envio
          ? HttpResponse.json(envio)
          : erro(404, 'Not Found', 'Envio nao encontrado', path);
      },
    ),
  ];
}

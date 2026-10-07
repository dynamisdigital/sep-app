import { http, HttpResponse } from 'msw';

import type {
  AtualizarMetaRequest,
  AtualizarRegraRequest,
  CriarInteracaoRequest,
  CriarProspectRequest,
  MoverEtapaRequest,
} from '../app/core/correspondentes/correspondentes-gestao.models';
import {
  atualizarMeta,
  atualizarRegra,
  comissoesDe,
  concluirInteracao,
  criarInteracao,
  criarProspect,
  desempenhoDaRede,
  lancamentosDaRede,
  listarAuditoria,
  listarInteracoesDe,
  listarProspectsDe,
  listarRegras,
  meuDesempenho,
  moverEtapa,
  registrarAuditoria,
} from './data/correspondentes-gestao.store';
import { correspondentePorEmail } from './data/correspondentes.store';

interface UsuarioMock {
  username: string;
  role: string;
}

type ErroFn = (status: number, error: string, message: string, path: string) => Response;

const ROTULO_ETAPA: Record<string, string> = {
  PROSPECTADO: 'Prospectado',
  CONTATADO: 'Contatado',
  EM_NEGOCIACAO: 'Em negociação',
  DOCUMENTACAO: 'Documentação',
  ANALISE_CREDITO: 'Análise de crédito',
  APROVADO: 'Aprovado',
  CONTRATADO: 'Contratado',
  ATIVO: 'Ativo',
  PERDIDO: 'Perdido',
};

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Handlers da gestao comercial. Mesma regra de autorizacao do restante do modulo:
//  - CORRESPONDENTE so enxerga o proprio funil, agenda, comissoes e desempenho (identidade da sessao);
//  - ADMIN configura regras de comissao e metas e le a auditoria;
//  - toda alteracao grava um evento de auditoria com autor, papel e valores.
// Devem ser registrados ANTES dos handlers de `/correspondentes/:id`, que casariam estas rotas.
export function criarHandlersGestao(
  baseUrl: string,
  usuarioAtual: () => UsuarioMock,
  erro: ErroFn,
) {
  const url = `${baseUrl}/correspondentes`;

  const apenasAdmin = (path: string) =>
    usuarioAtual().role === 'ADMIN'
      ? null
      : erro(403, 'Forbidden', 'Apenas ADMIN acessa esta area', path);

  const meu = (path: string) => {
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

  return [
    // ---- funil
    http.get(`${url}/me/prospects`, () => {
      const r = meu('/api/v1/correspondentes/me/prospects');
      return r.negado ?? HttpResponse.json(listarProspectsDe(r.proprio!.id));
    }),

    http.post(`${url}/me/prospects`, async ({ request }) => {
      const path = '/api/v1/correspondentes/me/prospects';
      const r = meu(path);
      if (r.negado) return r.negado;
      const body = (await request.json()) as CriarProspectRequest;
      if (!body.nome?.trim() || !(body.valorEstimado > 0)) {
        return erro(400, 'Bad Request', 'Informe o nome e o valor estimado', path);
      }
      const criado = criarProspect(r.proprio!.id, body);
      auditar('PROSPECT_CRIADO', 'Prospect', criado.id, `${criado.nome} cadastrado no funil.`);
      return HttpResponse.json(criado, { status: 201 });
    }),

    http.patch(`${url}/me/prospects/:id/etapa`, async ({ request, params }) => {
      const path = `/api/v1/correspondentes/me/prospects/${String(params['id'])}/etapa`;
      const r = meu(path);
      if (r.negado) return r.negado;
      const body = (await request.json()) as MoverEtapaRequest;
      if (body.etapa === 'PERDIDO' && !body.motivoPerda?.trim()) {
        return erro(400, 'Bad Request', 'Informe o motivo da perda', path);
      }
      const res = moverEtapa(r.proprio!.id, String(params['id']), body.etapa, body.motivoPerda);
      if (!res) return erro(404, 'Not Found', 'Prospect nao encontrado', path);
      auditar(
        'PROSPECT_MOVIDO',
        'Prospect',
        res.prospect.id,
        `${res.prospect.nome}: ${ROTULO_ETAPA[res.anterior]} → ${ROTULO_ETAPA[body.etapa]}.`,
      );
      return HttpResponse.json(res.prospect);
    }),

    // ---- agenda
    http.get(`${url}/me/interacoes`, () => {
      const r = meu('/api/v1/correspondentes/me/interacoes');
      return r.negado ?? HttpResponse.json(listarInteracoesDe(r.proprio!.id));
    }),

    http.post(`${url}/me/interacoes`, async ({ request }) => {
      const path = '/api/v1/correspondentes/me/interacoes';
      const r = meu(path);
      if (r.negado) return r.negado;
      const body = (await request.json()) as CriarInteracaoRequest;
      if (!body.clienteNome?.trim() || !body.descricao?.trim() || !body.data) {
        return erro(400, 'Bad Request', 'Informe cliente, descricao e data', path);
      }
      const criada = criarInteracao(r.proprio!.id, body);
      auditar(
        'INTERACAO_REGISTRADA',
        'Interação',
        criada.id,
        `${criada.tipo} com ${criada.clienteNome} ${body.agendar ? 'agendada' : 'registrada'}.`,
      );
      return HttpResponse.json(criada, { status: 201 });
    }),

    http.post(`${url}/me/interacoes/:id/concluir`, ({ params }) => {
      const path = `/api/v1/correspondentes/me/interacoes/${String(params['id'])}/concluir`;
      const r = meu(path);
      if (r.negado) return r.negado;
      const i = concluirInteracao(r.proprio!.id, String(params['id']));
      return i ? HttpResponse.json(i) : erro(404, 'Not Found', 'Interacao nao encontrada', path);
    }),

    // ---- comissoes e desempenho do correspondente
    http.get(`${url}/me/comissoes`, () => {
      const r = meu('/api/v1/correspondentes/me/comissoes');
      return r.negado ?? HttpResponse.json(comissoesDe(r.proprio!.id));
    }),

    http.get(`${url}/me/desempenho`, () => {
      const r = meu('/api/v1/correspondentes/me/desempenho');
      return r.negado ?? HttpResponse.json(meuDesempenho(r.proprio!.id));
    }),

    // ---- administracao
    http.get(`${url}/comissoes/regras`, () => {
      const negado = apenasAdmin('/api/v1/correspondentes/comissoes/regras');
      return negado ?? HttpResponse.json(listarRegras());
    }),

    http.put(`${url}/comissoes/regras/:id`, async ({ request, params }) => {
      const path = `/api/v1/correspondentes/comissoes/regras/${String(params['id'])}`;
      const negado = apenasAdmin(path);
      if (negado) return negado;
      const body = (await request.json()) as AtualizarRegraRequest;
      if (!(body.percentual > 0 && body.percentual <= 20)) {
        return erro(400, 'Bad Request', 'O percentual deve ficar entre 0 e 20', path);
      }
      if (!body.justificativa?.trim()) {
        return erro(400, 'Bad Request', 'A justificativa e obrigatoria', path);
      }
      const res = atualizarRegra(String(params['id']), body.percentual, usuarioAtual().username);
      if (!res) return erro(404, 'Not Found', 'Regra nao encontrada', path);
      auditar(
        'REGRA_COMISSAO_ALTERADA',
        'Regra de comissão',
        res.regra.id,
        `${res.regra.produto}: ${res.anterior.toString().replace('.', ',')}% → ${body.percentual.toString().replace('.', ',')}% (versão ${res.regra.versao}). Justificativa: ${body.justificativa}`,
      );
      return HttpResponse.json(res.regra);
    }),

    http.get(`${url}/comissoes/lancamentos`, () => {
      const negado = apenasAdmin('/api/v1/correspondentes/comissoes/lancamentos');
      return negado ?? HttpResponse.json(lancamentosDaRede());
    }),

    http.get(`${url}/desempenho`, () => {
      const negado = apenasAdmin('/api/v1/correspondentes/desempenho');
      return negado ?? HttpResponse.json(desempenhoDaRede());
    }),

    http.put(`${url}/metas/:correspondenteId`, async ({ request, params }) => {
      const path = `/api/v1/correspondentes/metas/${String(params['correspondenteId'])}`;
      const negado = apenasAdmin(path);
      if (negado) return negado;
      const body = (await request.json()) as AtualizarMetaRequest;
      if (!(body.metaClientes > 0) || !(body.metaValorOriginado > 0)) {
        return erro(400, 'Bad Request', 'As metas devem ser maiores que zero', path);
      }
      const res = atualizarMeta(String(params['correspondenteId']), body);
      if (!res) return erro(404, 'Not Found', 'Meta nao encontrada', path);
      auditar(
        'META_ALTERADA',
        'Meta',
        String(params['correspondenteId']),
        `Meta: ${res.anterior.metaClientes} clientes e ${moeda(res.anterior.metaValorOriginado)} → ${body.metaClientes} clientes e ${moeda(body.metaValorOriginado)}.`,
      );
      return HttpResponse.json(res.meta);
    }),

    http.get(`${url}/auditoria`, () => {
      const negado = apenasAdmin('/api/v1/correspondentes/auditoria');
      return negado ?? HttpResponse.json(listarAuditoria());
    }),
  ];
}

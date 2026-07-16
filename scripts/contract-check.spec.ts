// Testes do verificador de contrato (F-Sprint 19, Step 119.1.2).
// Fixtures minimas — nao copiam o OpenAPI real nem dependem de /tmp.
import { describe, expect, it } from 'vitest';

// @ts-expect-error modulo .mjs de tooling, sem declaracao de tipos
import { verificarContratos } from './contract-check.mjs';

interface Resultado {
  falhas: string[];
  lacunas: string[];
  operacoesVerificadas: number;
}

function openapiComSchema(schema: object, extras: object = {}): object {
  return {
    paths: {
      '/api/v1/coisas/{id}': {
        get: {
          parameters: [{ name: 'id', in: 'path', required: true }],
          responses: {
            '200': {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/CoisaResponse' } },
              },
            },
          },
        },
      },
      ...extras,
    },
    components: { schemas: { CoisaResponse: schema } },
  };
}

function descriptorBase(
  fields: object,
  gaps: object[] = [],
): {
  knownGaps: object[];
  types: Record<string, object>;
  operations: object[];
} {
  return {
    knownGaps: gaps,
    types: { CoisaResponse: { fields } },
    operations: [
      {
        id: 'coisas.consultar',
        method: 'get',
        path: '/api/v1/coisas/{id}',
        sucesso: [200],
        response: { $type: 'CoisaResponse' },
      },
    ],
  };
}

const SCHEMA_ALINHADO = {
  properties: {
    id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['ATIVA', 'ENCERRADA'] },
    valor: { type: 'number' },
  },
};

describe('verificarContratos', () => {
  it('passa quando o contrato consumido esta alinhado', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema(SCHEMA_ALINHADO),
      descriptorBase({ id: 'string', status: { enum: ['ATIVA', 'ENCERRADA'] }, valor: 'number' }),
    );
    expect(resultado.falhas).toEqual([]);
    expect(resultado.operacoesVerificadas).toBe(1);
  });

  it('falha quando o path/metodo consumido nao existe no OpenAPI', () => {
    const descriptor = descriptorBase({ id: 'string' });
    descriptor.operations = [
      {
        id: 'coisas.remover',
        method: 'delete',
        path: '/api/v1/coisas/{id}',
        sucesso: [204],
        response: null,
      },
    ];
    const resultado: Resultado = verificarContratos(openapiComSchema(SCHEMA_ALINHADO), descriptor);
    expect(resultado.falhas).toEqual([
      expect.stringContaining('DELETE /api/v1/coisas/{id} nao existe'),
    ]);
  });

  it('falha quando um campo lido pelo frontend some do schema', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema({ properties: { id: { type: 'string' } } }),
      descriptorBase({ id: 'string', valor: 'number' }),
    );
    expect(resultado.falhas).toEqual([
      expect.stringContaining("campo 'valor' de CoisaResponse nao existe"),
    ]);
  });

  it('falha quando o tipo do campo diverge', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema({ properties: { id: { type: 'string' }, valor: { type: 'string' } } }),
      descriptorBase({ id: 'string', valor: 'number' }),
    );
    expect(resultado.falhas).toEqual([
      expect.stringContaining("frontend espera 'number', OpenAPI documenta 'string'"),
    ]);
  });

  it('aceita integer do OpenAPI para number do frontend', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema({ properties: { valor: { type: 'integer', format: 'int64' } } }),
      descriptorBase({ valor: 'number' }),
    );
    expect(resultado.falhas).toEqual([]);
  });

  it('normaliza type lista do OpenAPI 3.1 (["string","null"])', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema({ properties: { id: { type: ['string', 'null'] } } }),
      descriptorBase({ id: 'string' }),
    );
    expect(resultado.falhas).toEqual([]);
  });

  it('falha quando o enum diverge em qualquer direcao', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema({
        properties: { status: { type: 'string', enum: ['ATIVA', 'ENCERRADA', 'SUSPENSA'] } },
      }),
      descriptorBase({ status: { enum: ['ATIVA', 'ENCERRADA'] } }),
    );
    expect(resultado.falhas).toEqual([expect.stringContaining('enum divergente')]);
  });

  it('falha quando o frontend espera enum e o OpenAPI nao publica, sem gap registrado', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema({ properties: { status: { type: 'string' } } }),
      descriptorBase({ status: { enum: ['ATIVA', 'ENCERRADA'] } }),
    );
    expect(resultado.falhas).toEqual([expect.stringContaining('OpenAPI nao publica enum')]);
  });

  it('reporta lacuna sem falhar quando o enum ausente esta em knownGaps', () => {
    const resultado: Resultado = verificarContratos(
      openapiComSchema({ properties: { status: { type: 'string' } } }),
      descriptorBase({ status: { enum: ['ATIVA', 'ENCERRADA'] } }, [
        { kind: 'enum-undocumented', type: 'CoisaResponse', field: 'status', reason: 'teste' },
      ]),
    );
    expect(resultado.falhas).toEqual([]);
    expect(resultado.lacunas).toEqual([expect.stringContaining('enum nao publicado')]);
  });

  it('falha quando um status de sucesso tratado nao esta documentado', () => {
    const descriptor = descriptorBase({ id: 'string' });
    (descriptor.operations[0] as { sucesso: number[] }).sucesso = [200, 201];
    const resultado: Resultado = verificarContratos(openapiComSchema(SCHEMA_ALINHADO), descriptor);
    expect(resultado.falhas).toContainEqual(expect.stringContaining('status de sucesso 201'));
  });

  it('falha quando parametro obrigatorio documentado nao e enviado pelo frontend', () => {
    const openapi = openapiComSchema(SCHEMA_ALINHADO);
    const parametros = (openapi as { paths: Record<string, { get: { parameters: object[] } }> })
      .paths['/api/v1/coisas/{id}'].get.parameters;
    parametros.push({ name: 'Idempotency-Key', in: 'header', required: true });
    const resultado: Resultado = verificarContratos(openapi, descriptorBase({ id: 'string' }));
    expect(resultado.falhas).toEqual([
      expect.stringContaining("parametro obrigatorio 'Idempotency-Key'"),
    ]);
  });

  it('reporta lacuna sem falhar para header em knownGaps e falha para header desconhecido', () => {
    const openapi = openapiComSchema(SCHEMA_ALINHADO);
    const descriptor = descriptorBase({ id: 'string' }, [
      { kind: 'header-undocumented', header: 'X-Step-Up-Token', appliesTo: '*', reason: 'teste' },
    ]);
    (descriptor.operations[0] as { headers: string[] }).headers = [
      'X-Step-Up-Token',
      'X-Header-Inventado',
    ];
    const resultado: Resultado = verificarContratos(openapi, descriptor);
    expect(resultado.lacunas).toEqual([expect.stringContaining("header 'X-Step-Up-Token'")]);
    expect(resultado.falhas).toEqual([expect.stringContaining("header 'X-Header-Inventado'")]);
  });

  it('ignora diferencas fora dos paths consumidos', () => {
    const openapi = openapiComSchema(SCHEMA_ALINHADO, {
      '/api/v1/outra-coisa': { post: { responses: { '201': {} } } },
    });
    const resultado: Resultado = verificarContratos(
      openapi,
      descriptorBase({ id: 'string', status: { enum: ['ATIVA', 'ENCERRADA'] }, valor: 'number' }),
    );
    expect(resultado.falhas).toEqual([]);
  });

  it('valida arrays de resposta e objetos aninhados via $ref', () => {
    const openapi = {
      paths: {
        '/api/v1/coisas': {
          get: {
            responses: {
              '200': {
                content: {
                  '*/*': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/CoisaResponse' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          CoisaResponse: {
            properties: { detalhe: { $ref: '#/components/schemas/DetalheResponse' } },
          },
          DetalheResponse: { properties: { nome: { type: 'string' } } },
        },
      },
    };
    const descriptor = {
      knownGaps: [],
      types: {
        CoisaResponse: { fields: { detalhe: { $type: 'DetalheResponse' } } },
        DetalheResponse: { fields: { nome: 'string', apelido: 'string' } },
      },
      operations: [
        {
          id: 'coisas.listar',
          method: 'get',
          path: '/api/v1/coisas',
          sucesso: [200],
          response: { array: { $type: 'CoisaResponse' } },
        },
      ],
    };
    const resultado: Resultado = verificarContratos(openapi, descriptor);
    expect(resultado.falhas).toEqual([
      expect.stringContaining("campo 'apelido' de DetalheResponse nao existe"),
    ]);
  });

  it('resolve $ref aninhado no nivel do schema (alias para outro schema)', () => {
    const openapi = openapiComSchema({ $ref: '#/components/schemas/CoisaRealResponse' });
    (openapi as { components: { schemas: Record<string, object> } }).components.schemas[
      'CoisaRealResponse'
    ] = { properties: { id: { type: 'string' } } };
    const resultado: Resultado = verificarContratos(openapi, descriptorBase({ id: 'string' }));
    expect(resultado.falhas).toEqual([]);
  });

  it('nao entra em loop com $ref ciclico e reporta campos ausentes', () => {
    const openapi = openapiComSchema({ $ref: '#/components/schemas/CoisaResponse' });
    const resultado: Resultado = verificarContratos(openapi, descriptorBase({ id: 'string' }));
    expect(resultado.falhas).toEqual([expect.stringContaining("campo 'id'")]);
  });

  it('valida form params multipart contra schema multipart e query documentada', () => {
    const openapi = {
      paths: {
        '/api/v1/coisas/{id}/documentos': {
          post: {
            parameters: [
              { name: 'id', in: 'path', required: true },
              { name: 'tipo', in: 'query', required: true },
            ],
            requestBody: {
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: { arquivo: { type: 'string', format: 'binary' } },
                  },
                },
              },
            },
            responses: { '204': {} },
          },
        },
      },
      components: { schemas: {} },
    };
    const descriptor = {
      knownGaps: [],
      types: {},
      operations: [
        {
          id: 'coisas.enviarDocumento',
          method: 'post',
          path: '/api/v1/coisas/{id}/documentos',
          sucesso: [204],
          request: 'multipart',
          formParams: ['tipo', 'arquivo', 'metadados'],
          response: null,
        },
      ],
    };
    const resultado: Resultado = verificarContratos(openapi, descriptor);
    expect(resultado.falhas).toEqual([expect.stringContaining("form param 'metadados'")]);
  });

  it('falha quando o frontend envia body JSON sem requestBody documentado', () => {
    const openapi = openapiComSchema(SCHEMA_ALINHADO, {
      '/api/v1/coisas': { post: { responses: { '201': {} } } },
    });
    const descriptor = {
      knownGaps: [],
      types: { CriarCoisaRequest: { fields: { nome: 'string' } } },
      operations: [
        {
          id: 'coisas.criar',
          method: 'post',
          path: '/api/v1/coisas',
          sucesso: [201],
          request: { $type: 'CriarCoisaRequest' },
          response: null,
        },
      ],
    };
    const resultado: Resultado = verificarContratos(openapi, descriptor);
    expect(resultado.falhas).toEqual([expect.stringContaining('nao documenta requestBody')]);
  });
});

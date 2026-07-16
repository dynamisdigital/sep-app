#!/usr/bin/env node
// Verificador de contrato frontend <-> OpenAPI (F-Sprint 19).
//
// Compara os contratos declarados em contracts/consumed-contracts.json (a superficie
// que o sep-app realmente consome) com um documento OpenAPI e termina com exit code 1
// quando ha divergencia. Lacunas registradas em knownGaps sao reportadas sem falhar.
//
// Uso:
//   npm run contract:check                                  # contra contracts/openapi.snapshot.json
//   SEP_OPENAPI_SCHEMA=<path|url> npm run contract:check    # contra um OpenAPI exportado do runtime

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_PADRAO = resolve(RAIZ, 'contracts', 'openapi.snapshot.json');
const DESCRIPTOR = resolve(RAIZ, 'contracts', 'consumed-contracts.json');

const TIPOS_COMPATIVEIS = {
  string: ['string'],
  number: ['number', 'integer'],
  boolean: ['boolean'],
};

export function verificarContratos(openapi, descriptor) {
  const resultado = { falhas: [], lacunas: [], operacoesVerificadas: 0 };
  for (const operacao of descriptor.operations) {
    verificarOperacao(openapi, descriptor, operacao, resultado);
    resultado.operacoesVerificadas += 1;
  }
  return resultado;
}

function verificarOperacao(openapi, descriptor, operacao, resultado) {
  const doc = openapi.paths?.[operacao.path]?.[operacao.method];
  if (!doc) {
    resultado.falhas.push(`${operacao.id}: ${operacao.method.toUpperCase()} ${operacao.path} nao existe no OpenAPI`);
    return;
  }
  verificarParametros(doc, operacao, descriptor, resultado);
  verificarStatusDeSucesso(doc, operacao, resultado);
  verificarCorpoDaRequisicao(openapi, doc, operacao, descriptor, resultado);
  verificarCorpoDaResposta(openapi, doc, operacao, descriptor, resultado);
}

function verificarParametros(doc, operacao, descriptor, resultado) {
  const params = doc.parameters ?? [];
  const query = operacao.query ?? [];
  const headers = operacao.headers ?? [];
  const pageable = operacao.pageable ?? [];
  const formParams = operacao.formParams ?? [];

  for (const param of params) {
    if (!param.required || param.in === 'path' || param.in === 'cookie') continue;
    const atendido =
      (param.in === 'query' &&
        (query.includes(param.name) ||
          (param.name === 'pageable' && pageable.length > 0) ||
          formParams.includes(param.name))) ||
      (param.in === 'header' && headers.includes(param.name));
    if (!atendido) {
      resultado.falhas.push(
        `${operacao.id}: parametro obrigatorio '${param.name}' (${param.in}) documentado no OpenAPI nao e enviado pelo frontend`,
      );
    }
  }

  const nomesQueryDocumentados = params.filter((p) => p.in === 'query').map((p) => p.name);
  for (const nome of query) {
    if (!nomesQueryDocumentados.includes(nome) && !pageable.includes(nome)) {
      resultado.falhas.push(`${operacao.id}: frontend envia query '${nome}' nao documentada no OpenAPI`);
    }
  }
  if (pageable.length > 0 && !nomesQueryDocumentados.includes('pageable')) {
    resultado.falhas.push(`${operacao.id}: frontend pagina via page/size/sort mas OpenAPI nao documenta 'pageable'`);
  }

  const nomesHeaderDocumentados = params.filter((p) => p.in === 'header').map((p) => p.name);
  for (const nome of headers) {
    if (nomesHeaderDocumentados.includes(nome)) continue;
    if (existeGapDeHeader(descriptor, nome, operacao.id)) {
      resultado.lacunas.push(`${operacao.id}: header '${nome}' enviado pelo frontend nao documentado (lacuna conhecida)`);
    } else {
      resultado.falhas.push(`${operacao.id}: frontend envia header '${nome}' nao documentado no OpenAPI`);
    }
  }
}

function verificarStatusDeSucesso(doc, operacao, resultado) {
  for (const status of operacao.sucesso) {
    if (!doc.responses?.[String(status)]) {
      resultado.falhas.push(`${operacao.id}: status de sucesso ${status} tratado pelo frontend nao documentado no OpenAPI`);
    }
  }
}

function verificarCorpoDaRequisicao(openapi, doc, operacao, descriptor, resultado) {
  if (!operacao.request || operacao.request === 'multipart') return;
  const conteudo = extrairConteudoJson(doc.requestBody?.content);
  if (!conteudo?.schema) {
    resultado.falhas.push(`${operacao.id}: frontend envia body JSON mas OpenAPI nao documenta requestBody`);
    return;
  }
  verificarExpectativa(openapi, descriptor, operacao.request, conteudo.schema, `${operacao.id}.request`, resultado);
}

function verificarCorpoDaResposta(openapi, doc, operacao, descriptor, resultado) {
  if (operacao.response === 'binary' || operacao.response === null) return;
  for (const status of operacao.sucesso) {
    const conteudo = extrairConteudoJson(doc.responses?.[String(status)]?.content);
    if (!conteudo?.schema) {
      resultado.falhas.push(`${operacao.id}: resposta ${status} sem schema JSON no OpenAPI`);
      continue;
    }
    verificarExpectativa(openapi, descriptor, operacao.response, conteudo.schema, `${operacao.id}.response[${status}]`, resultado);
  }
}

function extrairConteudoJson(content) {
  if (!content) return undefined;
  return content['application/json'] ?? content['*/*'];
}

function verificarExpectativa(openapi, descriptor, expectativa, schema, caminho, resultado) {
  const schemaResolvido = resolverRef(openapi, schema);
  if (expectativa.array) {
    if (schemaResolvido.type !== 'array') {
      resultado.falhas.push(`${caminho}: frontend espera array, OpenAPI documenta '${tipoDoSchema(schemaResolvido)}'`);
      return;
    }
    verificarCampo(openapi, descriptor, expectativa.array, schemaResolvido.items ?? {}, `${caminho}[]`, resultado, null, null);
    return;
  }
  verificarTipoNomeado(openapi, descriptor, expectativa.$type, schemaResolvido, caminho, resultado);
}

function verificarTipoNomeado(openapi, descriptor, nomeTipo, schema, caminho, resultado) {
  const tipo = descriptor.types[nomeTipo];
  if (!tipo) {
    resultado.falhas.push(`${caminho}: tipo '${nomeTipo}' nao declarado em consumed-contracts.json`);
    return;
  }
  const propriedades = schema.properties ?? {};
  for (const [nomeCampo, especificacao] of Object.entries(tipo.fields)) {
    const propriedade = propriedades[nomeCampo];
    if (!propriedade) {
      resultado.falhas.push(`${caminho}: campo '${nomeCampo}' de ${nomeTipo} nao existe no schema OpenAPI`);
      continue;
    }
    if (existeGapDeTipoDeCampo(descriptor, nomeTipo, nomeCampo)) {
      resultado.lacunas.push(`${caminho}.${nomeCampo}: tipo divergente do runtime documentado como lacuna conhecida`);
      continue;
    }
    verificarCampo(openapi, descriptor, especificacao, propriedade, `${caminho}.${nomeCampo}`, resultado, nomeTipo, nomeCampo);
  }
}

function verificarCampo(openapi, descriptor, especificacao, propriedade, caminho, resultado, nomeTipo, nomeCampo) {
  const prop = resolverRef(openapi, propriedade);
  if (typeof especificacao === 'string') {
    verificarTipoPrimitivo(especificacao, prop, caminho, resultado);
    return;
  }
  if (especificacao.enum) {
    verificarEnum(descriptor, especificacao.enum, prop, caminho, resultado, nomeTipo, nomeCampo);
    return;
  }
  if (especificacao.$type) {
    verificarTipoNomeado(openapi, descriptor, especificacao.$type, prop, caminho, resultado);
    return;
  }
  if (especificacao.array) {
    if (tipoDoSchema(prop) !== 'array') {
      resultado.falhas.push(`${caminho}: frontend espera array, OpenAPI documenta '${tipoDoSchema(prop)}'`);
      return;
    }
    verificarCampo(openapi, descriptor, especificacao.array, prop.items ?? {}, `${caminho}[]`, resultado, nomeTipo, nomeCampo);
  }
}

function verificarTipoPrimitivo(tipoEsperado, prop, caminho, resultado) {
  const tipoOpenapi = tipoDoSchema(prop);
  const compativeis = TIPOS_COMPATIVEIS[tipoEsperado] ?? [tipoEsperado];
  if (tipoOpenapi && !compativeis.includes(tipoOpenapi)) {
    resultado.falhas.push(`${caminho}: frontend espera '${tipoEsperado}', OpenAPI documenta '${tipoOpenapi}'`);
  }
}

function verificarEnum(descriptor, enumEsperado, prop, caminho, resultado, nomeTipo, nomeCampo) {
  if (!prop.enum) {
    if (existeGapDeEnum(descriptor, nomeTipo, nomeCampo)) {
      resultado.lacunas.push(`${caminho}: enum nao publicado no OpenAPI (lacuna conhecida)`);
    } else {
      resultado.falhas.push(`${caminho}: frontend espera enum ${JSON.stringify(enumEsperado)}, OpenAPI nao publica enum`);
    }
    return;
  }
  const esperado = [...enumEsperado].sort();
  const documentado = [...prop.enum].sort();
  if (JSON.stringify(esperado) !== JSON.stringify(documentado)) {
    resultado.falhas.push(
      `${caminho}: enum divergente — frontend ${JSON.stringify(esperado)} vs OpenAPI ${JSON.stringify(documentado)}`,
    );
  }
}

function resolverRef(openapi, schema) {
  if (!schema?.$ref) return schema ?? {};
  const nome = schema.$ref.split('/').pop();
  return openapi.components?.schemas?.[nome] ?? {};
}

// OpenAPI 3.1 permite type como lista (ex.: ['string', 'null']); normaliza descartando 'null'.
function tipoDoSchema(schema) {
  const tipo = schema?.type;
  if (Array.isArray(tipo)) return tipo.filter((t) => t !== 'null')[0];
  if (!tipo && schema?.properties) return 'object';
  return tipo;
}

function existeGapDeHeader(descriptor, header, operacaoId) {
  return (descriptor.knownGaps ?? []).some(
    (gap) =>
      gap.kind === 'header-undocumented' &&
      gap.header === header &&
      (gap.appliesTo === '*' || gap.appliesTo === operacaoId),
  );
}

function existeGapDeTipoDeCampo(descriptor, tipo, campo) {
  return (descriptor.knownGaps ?? []).some(
    (gap) => gap.kind === 'field-type-mismatch' && gap.type === tipo && gap.field === campo,
  );
}

function existeGapDeEnum(descriptor, tipo, campo) {
  return (descriptor.knownGaps ?? []).some(
    (gap) => gap.kind === 'enum-undocumented' && gap.type === tipo && gap.field === campo,
  );
}

async function carregarOpenapi(origem) {
  if (/^https?:\/\//.test(origem)) {
    const resposta = await fetch(origem);
    if (!resposta.ok) throw new Error(`Falha ao baixar OpenAPI de ${origem}: HTTP ${resposta.status}`);
    return resposta.json();
  }
  return JSON.parse(readFileSync(origem, 'utf8'));
}

async function main() {
  const origem = process.env.SEP_OPENAPI_SCHEMA || SNAPSHOT_PADRAO;
  const openapi = await carregarOpenapi(origem);
  const descriptor = JSON.parse(readFileSync(DESCRIPTOR, 'utf8'));
  const { falhas, lacunas, operacoesVerificadas } = verificarContratos(openapi, descriptor);

  console.log(`contract:check — fonte: ${origem}`);
  console.log(`${operacoesVerificadas} operacoes verificadas`);
  if (lacunas.length > 0) {
    console.log(`\n${lacunas.length} lacuna(s) conhecida(s) do OpenAPI (nao bloqueiam; ver knownGaps):`);
    for (const lacuna of lacunas) console.log(`  ~ ${lacuna}`);
  }
  if (falhas.length > 0) {
    console.error(`\n${falhas.length} divergencia(s) de contrato:`);
    for (const falha of falhas) console.error(`  x ${falha}`);
    process.exit(1);
  }
  console.log('\nContrato frontend <-> OpenAPI OK.');
}

const executadoComoScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoComoScript) {
  main().catch((erro) => {
    console.error(`contract:check falhou: ${erro.message}`);
    process.exit(1);
  });
}

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
  const resultado = {
    falhas: [],
    lacunas: [],
    obsoletos: [],
    operacoesVerificadas: 0,
    // Acumuladores internos: indices de knownGaps efetivamente usados e operacoes cujo
    // path nem existe no OpenAPI (seus gaps ficam sem chance de serem consumidos).
    gapsConsumidos: new Set(),
    operacoesNaoResolvidas: new Set(),
  };
  for (const operacao of descriptor.operations) {
    verificarOperacao(openapi, descriptor, operacao, resultado);
    resultado.operacoesVerificadas += 1;
  }
  varrerGapsObsoletos(descriptor, resultado);
  const { falhas, lacunas, obsoletos, operacoesVerificadas } = resultado;
  return { falhas, lacunas, obsoletos, operacoesVerificadas };
}

function verificarOperacao(openapi, descriptor, operacao, resultado) {
  const pathItem = openapi.paths?.[operacao.path];
  const doc = pathItem?.[operacao.method];
  if (!doc) {
    resultado.falhas.push(`${operacao.id}: ${operacao.method.toUpperCase()} ${operacao.path} nao existe no OpenAPI`);
    resultado.operacoesNaoResolvidas.add(operacao.id);
    return;
  }
  // Parametros podem estar no path item (compartilhados) ou na operacao.
  const params = [...(pathItem.parameters ?? []), ...(doc.parameters ?? [])];
  verificarParametros(params, operacao, descriptor, resultado);
  verificarParametrosDePath(params, operacao, resultado);
  verificarStatusDeSucesso(doc, operacao, resultado);
  verificarStatusDeErro(doc, operacao, resultado);
  verificarHeadersDaResposta(doc, operacao, descriptor, resultado);
  verificarCorpoDaRequisicao(openapi, doc, operacao, descriptor, resultado);
  verificarCorpoDaResposta(openapi, doc, operacao, descriptor, resultado);
}

function verificarParametros(params, operacao, descriptor, resultado) {
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
    if (consumirGapDeHeader(descriptor, resultado, nome, operacao.id)) {
      resultado.lacunas.push(`${operacao.id}: header '${nome}' enviado pelo frontend nao documentado (lacuna conhecida)`);
    } else {
      resultado.falhas.push(`${operacao.id}: frontend envia header '${nome}' nao documentado no OpenAPI`);
    }
  }
}

// Todo {param} do template consumido precisa estar documentado como in=path e required.
function verificarParametrosDePath(params, operacao, resultado) {
  const documentados = params.filter((p) => p.in === 'path');
  for (const [, nome] of operacao.path.matchAll(/\{(\w+)\}/g)) {
    const param = documentados.find((p) => p.name === nome);
    if (!param) {
      resultado.falhas.push(`${operacao.id}: parametro de path '${nome}' do template nao documentado no OpenAPI`);
    } else if (!param.required) {
      resultado.falhas.push(`${operacao.id}: parametro de path '${nome}' documentado como opcional no OpenAPI`);
    }
  }
}

// responseHeaders e mapa por status ({ "200": [...] }), nao lista plana: o Retry-After so
// existe em 423/429, e iterar apenas os status de sucesso o tornava inalcancavel pelo checker.
function verificarHeadersDaResposta(doc, operacao, descriptor, resultado) {
  for (const [status, nomes] of Object.entries(operacao.responseHeaders ?? {})) {
    const documentados = Object.keys(doc.responses?.[status]?.headers ?? {});
    for (const nome of nomes) {
      if (documentados.includes(nome)) continue;
      if (consumirGapDeHeaderDeResposta(descriptor, resultado, nome, operacao.id)) {
        resultado.lacunas.push(
          `${operacao.id}: header de resposta '${nome}' lido pelo frontend nao documentado (lacuna conhecida)`,
        );
      } else {
        resultado.falhas.push(
          `${operacao.id}: frontend le header de resposta '${nome}' nao documentado no OpenAPI (status ${status})`,
        );
      }
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

// Status de erro so entram em 'erros' quando a tela ramifica por status (F-Sprint 22). As
// operacoes que usam `apiErr?.message ?? padrao` nao discriminam status e nao declaram nada:
// declarar ali seria manutencao sem assercao.
function verificarStatusDeErro(doc, operacao, resultado) {
  for (const status of operacao.erros ?? []) {
    if (!doc.responses?.[String(status)]) {
      resultado.falhas.push(`${operacao.id}: status de erro ${status} tratado pelo frontend nao documentado no OpenAPI`);
    }
  }
}

function verificarCorpoDaRequisicao(openapi, doc, operacao, descriptor, resultado) {
  if (!operacao.request) return;
  if (operacao.request === 'multipart') {
    verificarCamposMultipart(openapi, doc, operacao, resultado);
    return;
  }
  const conteudo = extrairConteudoJson(doc.requestBody?.content);
  if (!conteudo?.schema) {
    resultado.falhas.push(`${operacao.id}: frontend envia body JSON mas OpenAPI nao documenta requestBody`);
    return;
  }
  verificarExpectativa(openapi, descriptor, operacao.request, conteudo.schema, `${operacao.id}.request`, resultado, true);
}

// No Spring, @RequestParam de upload resolve tanto de query quanto de form field; o springdoc
// documenta parte como query e parte como propriedade do schema multipart. Cada formParam
// enviado pelo frontend precisa existir em um dos dois lugares.
function verificarCamposMultipart(openapi, doc, operacao, resultado) {
  const schemaMultipart = resolverRef(openapi, doc.requestBody?.content?.['multipart/form-data']?.schema);
  const propriedades = Object.keys(schemaMultipart.properties ?? {});
  const nomesQueryDocumentados = (doc.parameters ?? []).filter((p) => p.in === 'query').map((p) => p.name);
  for (const nome of operacao.formParams ?? []) {
    if (!propriedades.includes(nome) && !nomesQueryDocumentados.includes(nome)) {
      resultado.falhas.push(
        `${operacao.id}: form param '${nome}' enviado pelo frontend nao documentado no OpenAPI (nem multipart, nem query)`,
      );
    }
  }
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

function verificarExpectativa(openapi, descriptor, expectativa, schema, caminho, resultado, exigirRequired = false) {
  const schemaResolvido = resolverRef(openapi, schema);
  if (expectativa.array) {
    if (schemaResolvido.type !== 'array') {
      resultado.falhas.push(`${caminho}: frontend espera array, OpenAPI documenta '${tipoDoSchema(schemaResolvido)}'`);
      return;
    }
    verificarCampo(openapi, descriptor, expectativa.array, schemaResolvido.items ?? {}, `${caminho}[]`, resultado, null, null, exigirRequired);
    return;
  }
  verificarTipoNomeado(openapi, descriptor, expectativa.$type, schemaResolvido, caminho, resultado, exigirRequired);
}

function verificarTipoNomeado(openapi, descriptor, nomeTipo, schema, caminho, resultado, exigirRequired = false) {
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
    if (consumirGapDeTipoDeCampo(descriptor, resultado, nomeTipo, nomeCampo)) {
      resultado.lacunas.push(`${caminho}.${nomeCampo}: tipo divergente do runtime documentado como lacuna conhecida`);
      continue;
    }
    verificarCampo(openapi, descriptor, especificacao, propriedade, `${caminho}.${nomeCampo}`, resultado, nomeTipo, nomeCampo, exigirRequired);
  }
  // Em request bodies, campo obrigatorio do OpenAPI ausente do contrato do frontend e
  // divergencia: o backend passaria a rejeitar o que o frontend envia hoje.
  if (exigirRequired) {
    const declarados = Object.keys(tipo.fields);
    for (const obrigatorio of schema.required ?? []) {
      if (!declarados.includes(obrigatorio)) {
        resultado.falhas.push(
          `${caminho}: campo obrigatorio '${obrigatorio}' de ${nomeTipo} no OpenAPI nao e enviado pelo frontend`,
        );
      }
    }
  }
}

function verificarCampo(openapi, descriptor, especificacao, propriedade, caminho, resultado, nomeTipo, nomeCampo, exigirRequired = false) {
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
    verificarTipoNomeado(openapi, descriptor, especificacao.$type, prop, caminho, resultado, exigirRequired);
    return;
  }
  if (especificacao.array) {
    if (tipoDoSchema(prop) !== 'array') {
      resultado.falhas.push(`${caminho}: frontend espera array, OpenAPI documenta '${tipoDoSchema(prop)}'`);
      return;
    }
    verificarCampo(openapi, descriptor, especificacao.array, prop.items ?? {}, `${caminho}[]`, resultado, nomeTipo, nomeCampo, exigirRequired);
  }
}

function verificarTipoPrimitivo(tipoEsperado, prop, caminho, resultado) {
  const tipoOpenapi = tipoDoSchema(prop);
  if (!tipoOpenapi) {
    resultado.falhas.push(
      `${caminho}: OpenAPI nao documenta tipo (schema vazio ou $ref quebrado); frontend espera '${tipoEsperado}'`,
    );
    return;
  }
  const compativeis = TIPOS_COMPATIVEIS[tipoEsperado] ?? [tipoEsperado];
  if (!compativeis.includes(tipoOpenapi)) {
    resultado.falhas.push(`${caminho}: frontend espera '${tipoEsperado}', OpenAPI documenta '${tipoOpenapi}'`);
  }
}

function verificarEnum(descriptor, enumEsperado, prop, caminho, resultado, nomeTipo, nomeCampo) {
  if (!prop.enum) {
    if (consumirGapDeEnum(descriptor, resultado, nomeTipo, nomeCampo)) {
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
  let atual = schema ?? {};
  const visitados = new Set();
  while (atual?.$ref) {
    const nome = atual.$ref.split('/').pop();
    if (visitados.has(nome)) return {};
    visitados.add(nome);
    atual = openapi.components?.schemas?.[nome] ?? {};
  }
  return atual;
}

// OpenAPI 3.1 permite type como lista (ex.: ['string', 'null']); normaliza descartando 'null'.
function tipoDoSchema(schema) {
  const tipo = schema?.type;
  if (Array.isArray(tipo)) return tipo.filter((t) => t !== 'null')[0];
  if (!tipo && schema?.properties) return 'object';
  return tipo;
}

// Um gap so silencia o checker se for de fato usado. Registrar o consumo e o que permite
// detectar, ao fim, o gap que o backend ja fechou e ficou afirmando algo falso no JSON.
function consumirGap(descriptor, resultado, predicado) {
  const indice = (descriptor.knownGaps ?? []).findIndex(predicado);
  if (indice === -1) return false;
  resultado.gapsConsumidos.add(indice);
  return true;
}

function consumirGapDeHeader(descriptor, resultado, header, operacaoId) {
  return consumirGap(
    descriptor,
    resultado,
    (gap) =>
      gap.kind === 'header-undocumented' &&
      gap.header === header &&
      (gap.appliesTo === '*' || gap.appliesTo === operacaoId),
  );
}

function consumirGapDeHeaderDeResposta(descriptor, resultado, header, operacaoId) {
  return consumirGap(
    descriptor,
    resultado,
    (gap) =>
      gap.kind === 'response-header-undocumented' &&
      gap.header === header &&
      (gap.appliesTo === '*' || gap.appliesTo === operacaoId),
  );
}

function consumirGapDeTipoDeCampo(descriptor, resultado, tipo, campo) {
  return consumirGap(
    descriptor,
    resultado,
    (gap) => gap.kind === 'field-type-mismatch' && gap.type === tipo && gap.field === campo,
  );
}

function consumirGapDeEnum(descriptor, resultado, tipo, campo) {
  return consumirGap(
    descriptor,
    resultado,
    (gap) => gap.kind === 'enum-undocumented' && gap.type === tipo && gap.field === campo,
  );
}

// Gap nao consumido por nenhuma operacao virou afirmacao falsa sobre o backend. Excecao: se a
// operacao que ele cobre nem existe no OpenAPI, a falha ja foi reportada — nao reportar duas
// vezes a mesma causa.
function varrerGapsObsoletos(descriptor, resultado) {
  (descriptor.knownGaps ?? []).forEach((gap, indice) => {
    if (resultado.gapsConsumidos.has(indice)) return;
    if (gap.appliesTo && resultado.operacoesNaoResolvidas.has(gap.appliesTo)) return;
    resultado.obsoletos.push(`knownGaps[${indice}] (${identificarGap(gap)}) nao e consumido por nenhuma operacao`);
  });
}

function identificarGap(gap) {
  const alvo = gap.header ?? [gap.type, gap.field].filter(Boolean).join('.');
  return alvo ? `${gap.kind}: ${alvo}` : gap.kind;
}

async function carregarOpenapi(origem) {
  if (/^https?:\/\//.test(origem)) {
    const resposta = await fetch(origem, { signal: AbortSignal.timeout(30_000) });
    if (!resposta.ok) throw new Error(`Falha ao baixar OpenAPI de ${origem}: HTTP ${resposta.status}`);
    return resposta.json();
  }
  return JSON.parse(readFileSync(origem, 'utf8'));
}

async function main() {
  const origem = process.env.SEP_OPENAPI_SCHEMA || SNAPSHOT_PADRAO;
  const openapi = await carregarOpenapi(origem);
  const descriptor = JSON.parse(readFileSync(DESCRIPTOR, 'utf8'));
  const { falhas, lacunas, obsoletos, operacoesVerificadas } = verificarContratos(openapi, descriptor);

  console.log(`contract:check — fonte: ${origem}`);
  console.log(`${operacoesVerificadas} operacoes verificadas`);
  if (lacunas.length > 0) {
    console.log(`\n${lacunas.length} lacuna(s) conhecida(s) do OpenAPI (nao bloqueiam; ver knownGaps):`);
    for (const lacuna of lacunas) console.log(`  ~ ${lacuna}`);
  }
  // Gap obsoleto so bloqueia contra o snapshot versionado: rodar com SEP_OPENAPI_SCHEMA aponta
  // para um ambiente mais novo, onde o gap pode ja ter sido fechado sem o snapshot saber.
  const obsoletoBloqueia = origem === SNAPSHOT_PADRAO;
  if (obsoletos.length > 0) {
    const rotulo = obsoletoBloqueia ? 'obsoleto(s)' : 'possivelmente obsoleto(s) (nao bloqueia: fonte nao e o snapshot versionado)';
    const escrever = obsoletoBloqueia ? console.error : console.log;
    escrever(`\n${obsoletos.length} knownGap(s) ${rotulo} — o OpenAPI ja documenta o que eles silenciam; remover do JSON:`);
    for (const obsoleto of obsoletos) escrever(`  ! ${obsoleto}`);
  }
  if (falhas.length > 0) {
    console.error(`\n${falhas.length} divergencia(s) de contrato:`);
    for (const falha of falhas) console.error(`  x ${falha}`);
    process.exit(1);
  }
  if (obsoletos.length > 0 && obsoletoBloqueia) process.exit(1);
  console.log('\nContrato frontend <-> OpenAPI OK.');
}

const executadoComoScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoComoScript) {
  main().catch((erro) => {
    console.error(`contract:check falhou: ${erro.message}`);
    process.exit(1);
  });
}

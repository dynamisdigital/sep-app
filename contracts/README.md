# Contrato frontend <-> API (F-Sprint 19)

Validacao automatizada dos contratos HTTP que o `sep-app` consome contra o OpenAPI runtime do
`sep-api`. Torna divergencias de borda observaveis em CI sem depender de backend remoto.

## Arquivos

| Arquivo                      | Papel                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openapi.snapshot.json`      | Export do OpenAPI runtime do `sep-api` (`GET /v3/api-docs`), com chaves ordenadas (`jq -S`). **Gerado — nao editar manualmente.**                            |
| `openapi.snapshot.meta.json` | Commit/hash/data da fonte do snapshot e comando de regeneracao.                                                                                              |
| `consumed-contracts.json`    | Declaracao dos endpoints e DTOs que o frontend efetivamente consome (espelha `src/app/core/api/api.models.ts` e os services). E a "expectativa" do frontend. |

## Como rodar

```bash
# contra o snapshot versionado (deterministico; e o que o CI roda)
npm run contract:check

# contra um OpenAPI runtime exportado (gate local de atualizacao de contrato)
SEP_OPENAPI_SCHEMA=/tmp/sep-api-openapi.json npm run contract:check
```

Exit code diferente de zero quando um contrato consumido diverge. Lacunas conhecidas do OpenAPI
(ver `knownGaps` no descriptor) sao reportadas sem falhar o check enquanto forem reais; qualquer
divergencia nova falha.

Desde a F-Sprint 22, um `knownGap` que **nenhuma operacao consome** tambem falha o check: um gap que
o backend ja fechou e afirmacao falsa sobre a API e continuaria silenciando uma verificacao que hoje
passaria. Isso vale so contra o snapshot versionado — com `SEP_OPENAPI_SCHEMA` a fonte pode estar
adiante do snapshot, entao o aviso sai sem bloquear. Se um gap for acusado de obsoleto, remova a
entrada do `knownGaps`; se a operacao ou o campo que o consumia saiu do descriptor, e isso que
precisa voltar.

## O que o check cobre

- existencia de metodo/path consumido;
- parametros obrigatorios (query/header) documentados vs enviados pelo frontend;
- headers sensiveis (`Idempotency-Key`, `X-Step-Up-Token`) quando documentados;
- status de sucesso tratados pelo frontend;
- **status de erro declarados em `erros`** — declare um status ali **so quando a tela ramifica por
  status** (hoje `auth.login`); operacao que usa `apiErr?.message ?? padrao` nao discrimina status e
  nao declara nada, porque declarar criaria manutencao sem proteger nada;
- **headers de resposta por status** (`responseHeaders` e mapa `{ "200": [...] }`, nao lista plana) —
  e o que torna verificavel um header que so existe em resposta de erro, como o `Retry-After`;
- **`knownGaps` obsoletos**, conforme descrito acima;
- campos, tipos, enums e arrays dos DTOs de request/response consumidos.

## Limitacoes conhecidas

- O springdoc do `sep-api` nao publica `required`/`nullable` nos schemas de response
  (`required: []` em todos). Obrigatoriedade e nullability de campo **nao** sao verificaveis
  contra o runtime hoje; registrado como follow-up backend na sprint F-19.
- `X-Step-Up-Token` nao e documentado no OpenAPI em nenhuma operacao sensivel — lacuna
  registrada em `knownGaps` (follow-up backend).
- Em uploads multipart o backend usa `@RequestParam`, que o Spring resolve tambem de form field;
  o springdoc documenta como query. O descriptor usa `formParams` para esses casos.

## Atualizando o contrato

1. Suba o `sep-api` integrado (`develop`) local: `SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun`.
2. Regenere o snapshot com o comando de `openapi.snapshot.meta.json` e atualize os metadados.
3. Rode `npm run contract:check`; ajuste `consumed-contracts.json`/modelos apenas para
   divergencias reais comprovadas.

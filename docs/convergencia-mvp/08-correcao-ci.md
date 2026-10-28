# Correção do CI do PR #190 — 28/10/2026

O `npm ci` foi destravado pelo commit `3e4e974`, mas o job seguinte parava na auditoria de
dependências. Este ajuste mantém o Angular 20 e o Node 20 e atualiza as versões vulneráveis.

## Dependências e compatibilidade

- Angular de runtime/compiler: **20.3.34**; CLI e builder: **20.3.42**.
- Vite: **7.3.7**; Vitest e cobertura V8: **4.1.12**; Happy DOM: **21.0.4**.
- O lock foi gerado com **Node 20.20.2 e npm 10.9.9**. A instalação real `npm ci` passou numa
  pasta limpa contendo somente os manifestos, sem `--force`, `--legacy-peer-deps` ou omissão de scripts.
- Vitest 3 e Happy DOM 20 ainda aparecem nas faixas vulneráveis publicadas no registro npm. A
  atualização principal é restrita às ferramentas de teste; não houve migração principal do Angular.
- O builder Angular 20 declara Vitest 3 como peer opcional. O override localizado de
  `@angular/build > vitest` reutiliza a versão corrigida do projeto e impede reinstalar uma cópia
  vulnerável. Este repositório executa testes pelo CLI do Vitest, não pelo builder experimental
  `ng test`. A combinação foi validada por instalação, tipos, suíte e build. Rever esse override
  se o projeto passar a usar o builder de testes do Angular.
- A cobertura declara `include: ['src/**/*.ts']`: o Vitest 4 deixou de incluir arquivos não
  carregados por padrão. Mantê-los evita melhorar o percentual apenas por mudar o denominador.

## Auditoria online

A configuração local do npm estava com `offline=true`. Nesse modo a auditoria retornava zero
sem consultar os avisos reais. A consulta online antes da correção encontrou **27 alertas**:
11 moderados, 11 altos e 5 críticos.

O script `npm run audit` agora inclui `--offline=false`, preservando o limiar `high` do CI.
Após atualizar e instalar as dependências, a auditoria online retornou **zero vulnerabilidades**.
Esse resultado corresponde à base de avisos consultada em 28/10/2026 e deve ser repetido no CI.

## Stylelint: exceção localizada de legado

Foi mantida a alteração de configuração que já estava pendente: a regra
`no-duplicate-selectors` fica desativada somente nestes quatro arquivos:

- `backoffice/pages/backoffice-dashboard-page.component.scss`;
- `backoffice/pages/backoffice-operational-dashboard-page.component.scss`;
- `cobranca/cobranca-shell.component.scss`;
- `cobranca/pages/agenda-financeira-page.component.scss`.

São folhas com blocos sucessivos de composição, refinamento visual e responsividade. Mesclá-los
indiscriminadamente mudaria a ordem da cascata. **A duplicação não foi removida**: continua como
dívida técnica desses arquivos. As outras regras seguem ativas, e o CI continua executando
`lint:scss`. Nenhuma declaração CSS foi alterada neste ajuste; não houve validação visual nova.

## Validação local com Node 20

- `npm ci`: passou na pasta limpa e no projeto.
- Formatação, auditoria online, `contract:check` (**88 operações**), lint TS/HTML, lint SCSS e
  `typecheck:spec`: passaram.
- Suíte com cobertura: **163 arquivos e 1.596 testes passaram**.
- Build de produção: passou, com aviso de bundle inicial de **760,42 kB**, frente à meta de
  750 kB e ao limite de erro de 1 MB. O orçamento não foi aumentado.

Os resultados remotos devem ser conferidos nos checks do
[PR #190](https://github.com/dynamisdigital/sep-app/pull/190). O título foi corrigido para
“Convergência MVP × front atual (merge de mvp/develop e origin/develop)”. Não houve merge em
`develop` ou `main`.

As cinco falhas E2E preexistentes registradas no comparativo continuam fora do alcance deste
ajuste de CI; a suíte E2E completa não foi reexecutada nesta correção.

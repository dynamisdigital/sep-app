# sep-app

Frontend web Angular 20.x da plataforma SEP (Sociedade de Emprestimo entre Pessoas).

> Documentacao consolidada do produto vive no repositorio [`docs-SEP`](../docs-SEP):
> [PRD](../docs-SEP/docs-sep/PRD.md), [CONTEXT](../docs-SEP/docs-sep/CONTEXT.md), [AGENT.md](../docs-SEP/AGENT.md), [ADRs](../docs-SEP/adr/), [specs](../docs-SEP/specs/), [steps web](../docs-SEP/steps-fase-1/web/) e [docs especificos do web](../docs-SEP/repos/sep-app/).

## Infográfico Geral

![Infográfico Geral do Projeto](docs/assets/infograficos/infografico_visao_geral_projeto.png)

## Setup do desenvolvedor

Apos clonar o repositorio:

1. Instalar Node.js LTS `>= 20.x`
2. `npm ci --legacy-peer-deps` — `legacy-peer-deps` necessario porque `@angular/build` declara `vitest@^3.1.1` como peer optional, mas pinamos `vitest@^2` por compatibilidade com `@analogjs/vitest-angular@^1`
3. `npm run start` — sobe dev server em `http://localhost:4200/`

Husky + lint-staged sao instalados automaticamente via `prepare` script no `npm install`.

## Scripts npm

| Script                  | O que faz                                |
| ----------------------- | ---------------------------------------- |
| `npm run start`         | Dev server em `http://localhost:4200/`   |
| `npm run build`         | Build de producao em `dist/sep-app/`     |
| `npm run watch`         | Build em modo watch (development config) |
| `npm run lint`          | ESLint para TS + HTML                    |
| `npm run lint:scss`     | Stylelint para SCSS                      |
| `npm run lint:scss:fix` | Stylelint com `--fix`                    |
| `npm run format`        | Prettier --write                         |
| `npm run format:check`  | Prettier --check                         |
| `npm run test`          | Vitest (1 run)                           |
| `npm run test:watch`    | Vitest watch                             |
| `npm run test:coverage` | Vitest com cobertura v8 em `coverage/`   |
| `npm run e2e`           | Playwright (Chromium) com webServer auto |
| `npm run e2e:ui`        | Playwright em UI mode                    |

## Code Style

- ESLint 9 (flat config) — `eslint.config.js`
- Prettier 3 — `.prettierrc.json`
- Stylelint 16 (config standard SCSS) — `.stylelintrc.json`
- Husky 9 + lint-staged 15 (pre-commit auto-fix)
- Prefixo de seletor Angular: `sep` (componente kebab-case, diretiva camelCase)

## Testes

- **Unit**: Vitest 2 + `@analogjs/vitest-angular` (compila templates Angular).
- **E2E**: Playwright 1 (Chromium) com webServer auto em `http://localhost:4200`.
- **Mock API**: MSW 2.x. Worker browser disponivel via flag em runtime: `localStorage.setItem('NG_APP_USE_MSW', 'true')` + reload.

> MSW server (Node) sera plugado em `src/test-setup.ts` na F-Sprint 2/3, quando os primeiros testes que dependem da API entrarem. Os polyfills necessarios (Web Streams + BroadcastChannel) ja estao prontos em `src/test-polyfills.ts`.

## Estrutura de pastas

```
src/
├── app/
│   ├── core/              # auth, http, config, guards, interceptors
│   ├── shared/            # components, directives, pipes, models, utils
│   ├── layout/            # public-shell, authenticated-shell
│   ├── features/
│   │   ├── public/        # superficies Apple (landing, login, register)
│   │   └── authenticated/ # superficies Notion (dashboard, perfil, ...)
│   ├── app.ts             # componente raiz (selector: sep-root)
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.spec.ts        # smoke Vitest
├── mocks/                 # MSW handlers + browser/server
├── styles/                # tokens, mixins, apple, notion (F-Sprint 1)
├── test-polyfills.ts      # polyfills MSW (uso futuro)
├── test-setup.ts          # init TestBed Angular
├── main.ts
└── index.html
```

A separacao `features/public` (Apple) vs `features/authenticated` (Notion) materializa a fronteira do PRD (estado de autenticacao = `/auth/me`).

## Continuous Integration

`.github/workflows/ci.yml` (`name: CI-APP`) roda em pushes para `feature/**`, `develop` e `main`, alem de PRs para `develop` e `main`.

A pipeline tem duas fases:

1. `Test, Lint, Coverage` — instala dependencias com `npm ci --legacy-peer-deps`, roda `format:check`, `lint`, `lint:scss` e `test:coverage`, e publica o artifact `web-coverage` (relatorio v8) com retention 14 dias.
2. `Build` — depende da fase anterior, reinstala dependencias com `npm ci --legacy-peer-deps`, roda `npm run build` e publica o artifact `web-build` a partir de `dist/` com retention 14 dias.

## Stack

- Angular 20.3.x (Standalone Components, Signals, strict)
- SCSS puro — sem Bootstrap/Tailwind/Material
- ESLint 9 + Prettier 3 + Stylelint 16
- Husky 9 + lint-staged 15
- Vitest 2 + `@analogjs/vitest-angular` 1 + happy-dom
- Playwright 1 (Chromium)
- MSW 2

Detalhes: [PRD §11](../docs-SEP/docs-sep/PRD.md), [ADR 0002](../docs-SEP/adr/0002-design-systems-apple-e-notion-com-scss-puro.md), [ADR 0003](../docs-SEP/adr/0003-stack-angular-20-ionic-8-capacitor-6.md).

## Tema claro e escuro

O SEP renderiza a mesma interface em dois temas. O componente **não conhece a paleta**: ele declara função — "superfície elevada", "texto secundário", "borda sutil" — e o tema resolve o valor.

### Como o tema é trocado

`ThemeService` (`src/app/core/theme/theme.service.ts`) aplica a classe `.dark` no elemento raiz, persiste a escolha em `localStorage` (`SEP_THEME`) e, na primeira visita, respeita o `prefers-color-scheme` do sistema. O componente raiz (`App`) injeta o serviço, o que garante que o tema seja aplicado em **qualquer** rota, inclusive nas que não montam o shell.

### Onde vivem os tokens

| Arquivo                          | O que define                                                                |
| -------------------------------- | --------------------------------------------------------------------------- |
| `src/styles/_sep-ds-tokens.scss` | Tokens do New Design System (trios HSL, consumidos por `hsl(var(--token))`) |
| `src/styles/_sep-op-tokens.scss` | Tokens da superfície operacional, claro em `:root` e escuro em `.dark`      |

### As duas camadas de token da superfície operacional

**Semânticos** — o que os componentes consomem:

- superfícies: `--sep-canvas`, `--sep-surface`, `--sep-surface-2`, `--sep-surface-3`, `--sep-surface-elevated`, `--sep-surface-hover`, `--sep-surface-active`, `--sep-surface-sunken`, `--sep-overlay`
- texto: `--sep-text`, `--sep-text-strong`, `--sep-text-secondary`, `--sep-text-muted`, `--sep-text-inverse`
- bordas: `--sep-border-subtle`, `--sep-border`, `--sep-border-strong`
- acentos: `--sep-accent`, `--sep-accent-strong`, `--sep-glow`, `--sep-on-accent`
- estados: `--sep-success`, `--sep-warning`, `--sep-danger`, `--sep-info`, `--sep-purple`
- campos: `--sep-field-bg`, `--sep-field-border`, `--sep-field-placeholder`
- elevação: `--sep-shadow-sm`, `--sep-shadow`, `--sep-shadow-lg`, `--sep-focus-ring`
- invariantes: `--sep-on-tint` (texto sobre tinta saturada, branco nos dois temas)

**Canais** (`--sep-c-*`) — o mesmo valor em trio RGB, para compor transparência:

```scss
border: 1px solid rgb(var(--sep-c-blue) / 45%);
background: rgb(var(--sep-c-surf2) / 72%);
```

Um token por nível de opacidade faria a lista explodir sem ganho semântico; o canal resolve isso com uma entrada por cor.

### Como usar

```scss
.meu-cartao {
  color: var(--sep-text);
  background: var(--sep-surface-2);
  border: 1px solid var(--sep-border);
  box-shadow: var(--sep-shadow);
}
```

### Como acrescentar um token

1. Confirme que nenhum token existente já cumpre a função — a lista acima é curta de propósito.
2. Declare o par claro e escuro em `_sep-op-tokens.scss`, nos **dois** blocos.
3. Se o valor for composto com transparência em algum lugar, declare também o canal `--sep-c-*`.
4. Verifique o contraste do par claro contra `--sep-surface-3`, que é a superfície clara mais escura.

### Como testar os dois temas

Force o tema antes de carregar a página:

```ts
await page.addInitScript(() => window.localStorage.setItem('SEP_THEME', 'light'));
```

Compare o tema escuro contra a referência homologada por diferença de pixels, e não a olho: consolidar valores próximos é esperado, mas mudança estrutural é regressão.

### Exceções conhecidas

- **Cores em TypeScript** (~90 ocorrências): tintas de avatar, séries de gráfico e medidores calculados em código. Não passam pelo SCSS e continuam iguais nos dois temas.
- **Assets rasterizados**: o logotipo e o HUD do rodapé são PNG desenhados para fundo escuro e ficam apagados no tema claro. Precisam de variante clara — é arte, não CSS.
- `--sep-on-tint` é invariante por decisão: a tinta que ele contrasta também não muda com o tema.

## Responsividade: full, half e third

O componente reage ao **espaço que recebeu**, e não à largura da janela. Um painel pode ocupar um terço de um monitor 4K e a tela inteira de um notebook estreito: são apresentações diferentes, e nenhuma delas é descrita por "desktop" ou "mobile".

| Modo    | Quando                    | O que muda                                                                     |
| ------- | ------------------------- | ------------------------------------------------------------------------------ |
| `full`  | container ≥ 960px         | Estado base. É o visual homologado; não se escreve dentro de nenhum mixin.     |
| `half`  | 620px ≤ container < 960px | Grade de duas colunas vira uma, ações secundárias recolhem, rótulos compactam. |
| `third` | container < 620px         | Só o essencial: hierarquia vertical, ação primária, complementos recolhíveis.  |

As fronteiras vivem em **um só lugar por linguagem**: `core/layout/sep-layout-mode.ts` (TypeScript) e `styles/_sep-responsivo.scss` (SCSS). São o mesmo contrato visto de dois lados.

### Como um componente entra no contrato

A área que distribui o espaço já é container: `.op-content` no shell operacional e `.site-content` no site institucional. Basta consultar:

```scss
@use '../../../styles/tela-operacional-tema' as tema;

.minha-grade {
  grid-template-columns: repeat(3, minmax(0, 1fr)); // full: estado base
}

@include tema.resp-half {
  .minha-grade {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@include tema.resp-third {
  .minha-grade {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

No site público o mesmo contrato chega por `@use "../shared/site-tema" as site;` e `@include site.half { … }`.

### Antes de usar o contrato, tente a geometria

Quando os itens são **intercambiáveis** — cartões de métrica, atalhos, etapas —, a própria grade resolve, sem limiar nenhum para manter:

```scss
@include tema.grade-fluida(190px, 14px);
// vira: repeat(auto-fit, minmax(min(100%, 190px), 1fr))
```

A única decisão real é a largura abaixo da qual o cartão deixa de ser legível. Use o contrato para o que a geometria não resolve: ordem de leitura, o que recolher, o que vira menu.

**Meça a área real antes de trocar por `auto-fit`.** A fila operacional tem cinco métricas em ~855px úteis (o resto é a coluna lateral): com mínimo legível de 190px, `auto-fit` cai para quatro colunas mais uma órfã. Onde a conta não fecha, a grade fixa com `minmax(0, 1fr)` continua sendo a resposta certa, e quem estreita os cartões é o contrato.

### A página precisa declarar o container

`@container` sem container ancestral **nunca casa** — a regra compila, passa no lint e não faz nada. As telas montadas sobre `tema.base('pxNN')` já recebem a declaração pelo mixin `shell()`. As que têm folha própria precisam declará-la à mão:

```scss
/* stylelint-disable-next-line selector-pseudo-element-no-unknown -- ::ng-deep é do Angular */
:host ::ng-deep .op-content:has(> .minha-page) {
  container: sep-conteudo / inline-size;
}
```

Foi o que faltava em `profile` e em `propostas`: as consultas estavam escritas e inertes.

### Auto-ajuste dos widgets

Regra do produto: **o que não cabe na lateral desce; o que ainda não couber aparece atrás de uma barra de rolagem. Nada some.**

Três camadas, da mais específica para a mais geral:

1. **Geometria** — fileiras de cartões equivalentes usam `repeat(auto-fit, minmax(min(100%, Xpx), 1fr))`. O cartão que não cabe desce sozinho, sem nenhum limiar para manter. `X` é a largura medida na tela homologada, para o número de colunas do visual aceito ser preservado.
2. **Largura natural do widget** — layouts assimétricos (principal + lateral, fileiras de filtro) mantêm as faixas e ganham `@container (max-width: Npx)`, onde `N` é a soma medida das próprias faixas. Não é um número escolhido: é a medida do widget.
3. **Rede da moldura** — em `@container sep-app (width <= 1080px)`, dentro da área de conteúdo: `min-width: 0` nos contêineres, `white-space: normal` nos textos (exceto célula de tabela) e `overflow: auto` em cartões e painéis. Só permite encolher, quebrar e rolar — nunca faz nada crescer.

A moldura (`.op-dashboard`) é container **sempre**, e não só com enquadramento ativo: o usuário redimensiona a janela do navegador tanto quanto usa o widget do cabeçalho.

### Por que não há recálculo

Cada modo é CSS resolvido pelo navegador **quando o container muda de tamanho**, e só então — não há laço, não há medição por quadro, não há recomputação a cada renderização. O único JavaScript envolvido é um `resize` passivo no `ViewportPresetService`, que apenas atualiza qual preset está em vigor. Ajustada uma vez, a configuração de cada tela vale como padrão até a janela mudar de tamanho de novo.

### Quando o modo precisa existir em código

Se a decisão muda o **comportamento** — quantas colunas consultar, se a ação vai para um menu —, use a diretiva:

```html
<section sepLayoutMode #modo="sepLayoutMode">@if (modo.modo() === 'third') { … }</section>
```

Uma única implementação de `ResizeObserver` para todo o produto. Precedência: **override explícito vence o automático** — `sepLayoutMode="third"` força o modo, útil em demonstração e captura de tela.

### Altura é outro eixo

Altura curta e largura curta são problemas diferentes: a primeira pede menos folga, a segunda pede outra organização. Por isso a altura tem mixins próprios (`tema.resp-altura-curta`, `tema.resp-altura-muito-curta`) e não entra no contrato horizontal.

### Media query ainda é legítima

Permanecem justificadas as que tratam de: `prefers-reduced-motion`, impressão, ponteiro, orientação, **altura** e a **moldura do shell** — a barra lateral e o cabeçalho dividem a janela, então é a janela que eles medem.

O que não é legítimo é uma tela escolher um número próprio de largura para reorganizar o próprio conteúdo.

### Como testar

`e2e/responsividade.spec.ts` estreita o container e mantém o viewport fixo, depois repete em viewports diferentes — é assim que se prova que os dois eixos são independentes.

### Anti-patterns

- Criar breakpoint de largura novo numa folha de tela.
- Ler `window.innerWidth` num componente, ou registrar listener de resize próprio.
- Esconder conteúdo crítico de operação para caber.
- `overflow: hidden` para sumir com layout quebrado, em vez de reorganizar.
- Diminuir a fonte como estratégia principal de caber.
- A página conhecer o CSS interno dos filhos.

## Desenvolvimento e responsabilidades técnicas

Esta seção registra **autoria técnica e responsabilidade pelo desenvolvimento**. Não constitui declaração de titularidade jurídica nem de propriedade intelectual sobre o código.

### Frontend

**Daniel Möllmann — Desenvolvedor Frontend**

Responsável pelo desenvolvimento e implementação da camada de apresentação do Projeto SEP neste repositório: componentes, páginas, layouts, os dois shells (operacional e público), navegação e roteamento, responsividade, estados de interface, transformação dos mockups homologados em interfaces funcionais, padronização visual, componentes reutilizáveis e integração da camada de apresentação com os serviços do sistema.

Tecnologias efetivamente presentes neste repositório: **Angular 20 · TypeScript · SCSS · RxJS**, com Vitest, Playwright e MSW na camada de testes.

> O [ADR 0003](../docs-SEP/adr/0003-stack-angular-20-ionic-8-capacitor-6.md) também cita Ionic e Capacitor no plano de stack do produto. Nenhum dos dois está instalado neste repositório, e por isso não constam acima.

### Backend e infraestrutura

**Maurício Chaves — Backend & Infrastructure**

Responsável pelas camadas de backend, serviços server-side e infraestrutura do Projeto SEP. O código correspondente vive em repositório próprio; aqui existe apenas o workflow de CI do próprio frontend (`.github/workflows/ci.yml`).

### Onde a autoria está registrada

| Local                                        | O que registra                                            |
| -------------------------------------------- | --------------------------------------------------------- |
| Esta seção do `README.md`                    | Divisão de responsabilidades entre as camadas             |
| `package.json` › `contributors`              | As duas frentes, com o papel de cada uma                  |
| `src/app/core/project-info.ts`               | Metadado consumido pela aplicação (versão e créditos)     |
| Cabeçalho dos arquivos estruturais           | `main.ts`, raiz, configuração, roteamento, shells e temas |
| Painel de **Ajuda** do cabeçalho operacional | Créditos visíveis ao usuário, em "Sobre o sistema"        |
| Histórico Git                                | Autoria commit a commit, preservada e não reescrita       |

## Conventional Commits

Mensagens de commit seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).
Exemplos:

```
feat(auth): adicionar guard com integracao /auth/me
fix(layout): corrigir overflow do sidebar Notion
chore: atualizar Angular 20.3.20
docs(adr): adicionar ADR 0009
```

## F-Sprints

- F-Sprint 0 — Setup Angular + Tooling (este branch)
- F-Sprint 1 — Tokens SCSS Apple/Notion + Showcase
- F-Sprint 2 — Telas publicas Apple (landing, login, register) com MSW
- F-Sprint 3 — Auth real, shell Notion, guards, interceptors
- F-Sprint 4 — Telas autenticadas + smoke E2E

Detalhamento: [docs-SEP/specs/fase-1/](../docs-SEP/specs/fase-1/) (100-104) e [docs-SEP/steps-fase-1/web/](../docs-SEP/steps-fase-1/web/).

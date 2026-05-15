# sep-app

Frontend web Angular 20.x da plataforma SEP (Sociedade de Emprestimo entre Pessoas).

> Documentacao consolidada do produto vive no repositorio [`docs-SEP`](../docs-SEP):
> [PRD](../docs-SEP/docs-sep/PRD.md), [CONTEXT](../docs-SEP/docs-sep/CONTEXT.md), [AGENT.md](../docs-SEP/AGENT.md), [ADRs](../docs-SEP/adr/), [specs](../docs-SEP/specs/), [steps web](../docs-SEP/steps-fase-1/web/) e [docs especificos do web](../docs-SEP/repos/sep-app/).

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

# Comparativo: MVP (`sep-app`) × front atual (`sep-app 16062026`)

Levantamento de 26/10/2026. O **MVP** é o repositório `sep-app` (branch `develop`, último commit em 21/08/2026).
O **atual** é `sep-app 16062026` (branch `escritorio-2026-10-26`). Existe ainda `sep-app 16062026_old`, um marco
intermediário de 17/07/2026.

## 1. As duas linhas divergiram em 12/06/2026

Não são versões em sequência: partem do mesmo commit (`2352779`, de 12/06/2026) e cada uma recebeu trabalho próprio.

- O MVP ganhou **58 commits** só dele (sprints 16 a 25 do front).
- O atual ganhou **62 commits** só dele (site, correspondentes, escrow, tour, demonstração).

## 2. Números

| | MVP | Intermediário (`_old`) | Atual |
| --- | --- | --- | --- |
| Linhas (ts/html/scss) | ~39 mil | ~105 mil | ~164 mil |
| Arquivos `.ts` / componentes | 241 / 84 | 278 / 97 | 423 / 130 |
| Testes unitários / e2e | 96 / 12 | 110 / 23 | 135 / 25 |
| Rotas distintas (`path:` únicos) | 64 | 67 | 98 |
| Mock (`handlers.ts`) | 3.243 linhas | 3.541 | 4.091 |
| Docs `.md` no repositório | 0 (a documentação do MVP fica no `docs-SEP`) | 53 | 75 |

## 3. O que só o MVP tem (precisa vir para o atual)

| Item | Origem no MVP |
| --- | --- |
| Matching de aporte da credora (`credora/matching`) | sprint 18 |
| Renegociação do tomador (`parcelas/:id/renegociacao`) | sprint 16 |
| Chaves Pix (`pix/chaves`) | sprint 20 |
| Conciliação financeira | sprint 17 |
| Bloqueio de conta por tentativas de login (lockout) | sprints 21 e 23 |
| Aviso de cookies | sprint 25 |
| Contrato de erro da API (`api-error`, `retry-after`) | sprints 22 e 24 |
| Verificador de contrato contra o OpenAPI (`contracts/`, `scripts/contract-check.mjs`) | CI |
| `dependabot.yml`, `npm audit`, Angular 20.3.27 e CLI 20.3.33 | tooling |
| e2e `account-locked`, `aviso-cookies`, `credora-matching`, `pix-chaves` | testes |

## 4. O que só o atual tem (precisa de backend: ver `modulos/`)

Correspondentes e Meu Backoffice, rede de sub-correspondentes, credores e conta escrow, Pix Automático, análise de
crédito, glossário, site público (blog, investidores, FAQ, transparência, antifraude), tour assistido e demonstração.

## 5. Simulação de merge (feita numa cópia descartável)

Trazer o `develop` do MVP para o atual, sem confirmar nada:

| Resultado | Quantidade |
| --- | --- |
| Arquivos do MVP que entram sem conflito | 73 |
| Arquivos mesclados sem conflito | 182 |
| Arquivos em conflito | 73 (35 de teste e 38 de código/templates) |

Conflitos concentrados em: login e interceptors, `app.ts` e `app.html`, cobrança (parcela), Pix (divergências),
carteira da credora, `handlers.ts` (4 trechos), `styles/index.scss`, `package.json` e `package-lock.json`.

## 6. Plano de convergência

1. Branch `convergencia-mvp-2026-10-26` com o merge. Núcleo (login, interceptors, contrato de erro, lockout, cookies,
   `contracts/`, CI): prevalece o MVP. Módulos que o Daniel ampliou (cobrança, Pix, credora, landing): mantém o atual e
   incorpora o que o MVP acrescentou.
2. Build, lint e todos os testes verdes antes de qualquer push. Sem escrita em `develop` ou `main`.
3. Separação de ambientes (ver `00-responsabilidades-e-ambientes.md`).
4. Documentos por módulo e entrega ao backend (esta pasta).

### Situação em 28/10/2026

Passos 1 e 2 concluídos: merge feito, lint, formatação, build, `contract:check` (88 operações) e testes
unitários verdes. O e2e achou o que o merge deixou desalinhado, já corrigido:

- **Aviso de cookies do MVP × specs do atual.** O aviso reserva 10rem no rodapé do `body` e quebrava as
  specs que medem altura ou clicam no rodapé. A suíte agora parte com o aviso dispensado
  (`playwright.config.ts`); só `aviso-cookies.spec.ts` o reexibe.
- **Menu.** "Chaves Pix" e "Matching de credoras" só existiam no `sidenav` antigo. Entraram no shell
  operacional (filho de Pix e item de Operação, ambos FINANCEIRO e ADMIN).
  Em 29/10/2026 as quatro telas (Chaves Pix e as três do Matching) passaram para o layout do tema do SEP, com
  acentuação, critérios do matching em português, ajuda contextual e tour assistido. Detalhes em
  [`modulos/08-chaves-pix-e-matching-de-credoras.md`](modulos/08-chaves-pix-e-matching-de-credoras.md).
- **Rota duplicada.** `/politica-de-privacidade` existia nas duas bases; ficou a página do atual (11
  seções). `politica-privacidade/` (MVP) foi removida: o inventário de cookies e
  de chaves do navegador (`sep-refresh`, `SEP_ACCESS_TOKEN`, `SEP_PENDING_MFA_CHALLENGE`, `SEP_THEME`,
  `SEP_AVISO_COOKIES`) migrou para a seção 9 da página atual, junto de um spec que trava esse inventário.
  O aviso de "pendente de revisão jurídica" e a lista de seções pendentes não migraram, porque a página
  atual já tem base legal, direitos e encarregado; o texto da seção 9 ainda precisa de revisão jurídica.
- **Specs do MVP** ajustadas ao menu em cascata e a nomes acentuados.
- **Segundo merge (`origin/develop`, sprints 26 a 28 do MVP).** O `develop` do `origin` tinha andado 37 commits
  depois do primeiro merge (códigos de erro, central de notificações, contract-check com typecheck, Angular
  20.3.31). Entrou na mesma branch. O `typecheck:spec` agora é exigido pelo CI e pelo pre-push; os 56 erros de
  tipo dos specs foram corrigidos.
- **Central de notificações.** A página `/app/notificacoes` e o contador de não lidas vieram do MVP, mas só tinham
  porta no cabeçalho antigo. O shell operacional ganhou o link com a contagem na barra de ícones, distinto do sino
  de alertas (que são recortes dos dados da tela).
- **Últimas telas do MVP no tema do SEP (29/10/2026).** Uma varredura das rotas autenticadas achou só duas telas
  ainda dentro do cabeçalho e do menu antigos (sem `immersive: true`): a **Central de notificações** e a
  **Proposta de renegociação do tomador**. As duas passaram para o shell operacional, com a folha de estilo do
  tema (`tela-operacional-tema` e `-blocos`), textos acentuados e rotas marcadas como `immersive`. A central
  ganhou indicadores (total e não lidas) e entrada na Ajuda; a renegociação manteve o diálogo de confirmação
  com foco preso e a regra de MFA e *step-up*. O rótulo do link da central (`Notificações, 3 não lidas`) também
  foi acentuado. Sobraram, fora das rotas, só componentes pequenos de status (chips) e a vitrine do design
  system, que não são telas. O layout antigo (`layout/shell`, cabeçalho, menu e trilha) segue existindo apenas
  como moldura das rotas não imersivas; hoje nenhuma rota o usa.

Cinco specs e2e já falhavam **antes** do merge, na `escritorio-2026-10-26`, e seguem pendentes (não são do
merge): `cobranca` (painel de inadimplência), `credores-escrow` (conta de destino e saque), `governanca`
(chips de papéis), `onboarding` (PJ, `APROVADO_FINAL`) e `site-institucional` (menu da landing).

**Por que o MVP manda no núcleo:** é a espinha dorsal que o backend já acompanha (contrato de erro, lockout,
OpenAPI). Os módulos novos entram em cima dela, sem mudar a base.

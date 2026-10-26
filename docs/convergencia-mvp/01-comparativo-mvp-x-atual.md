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

**Por que o MVP manda no núcleo:** é a espinha dorsal que o backend já acompanha (contrato de erro, lockout,
OpenAPI). Os módulos novos entram em cima dela, sem mudar a base.

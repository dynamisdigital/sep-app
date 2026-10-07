# Handoff do escritório · 07/10/2026 · Correspondentes

> Como usar: quando o Daniel pedir para **carregar o handoff de correspondentes de 07/10**, leia este
> arquivo inteiro e depois os que ele cita.

- **Branch:** `escritorio-2026-10-07` (criada do `0081976`, o mesmo ponto de `escritorio-2026-10-02`).
- **Commit:** `50391af` — módulo de Correspondentes (Meu Backoffice, rede, contratos, funil de prospecção,
  agenda, comissões, desempenho, relatórios e auditoria, com dados fictícios), envios no backoffice e roteiro
  do tour. 14 arquivos alterados (+459/−4) e 109 novos, entre código e a pasta de apresentação.
- **Origem do trabalho:** feito em Casa em 07/10 e trazido ao escritório por cópia dos arquivos (Casa: working
  tree sem commit; o repositório de Casa não foi alterado). O ruído de ~350 arquivos \"modificados\" em Casa é só
  fim de linha (`core.autocrlf=true`); o conteúdo que muda é o de 14 arquivos.
- **Testes:** `vitest run` → 745 passed em 98 arquivos, nos dois nós. Hooks do commit (lint-staged) passaram.
- **Relatório e publicação:** `docs/atualizacao-07102026/` (apresentação, PDF
  `SEP_Correspondentes_Daniel_Mollmann_07102026.pdf`, `publicar/`, `MENSAGEM_DIRETORIA.txt` e
  `PASSO_A_PASSO_PUBLICACAO.md`). **Ainda não publicado no Netlify.**
- **Contrato do backend:** `docs/atualizacao-07102026/CONTRATO_BACKEND_CORRESPONDENTES.md`.
- **Fora do commit, de propósito:** `_nul`, `diag.json` e as imagens soltas em `image/`.
- **Nota de ambiente (escritório):** o commit só passa os hooks com o Git for Windows de `C:\Pastas\Arquivos\Git`;
  o git do GitHub Desktop cai no bash do WSL e o husky não acha o `npx`.
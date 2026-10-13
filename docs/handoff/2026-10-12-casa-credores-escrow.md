# Handoff de casa · 12/10/2026 · Credores e conta escrow

> Como usar no escritório: quando o Daniel pedir para **carregar o handoff de casa de 12/10 (credores e
> escrow)**, leia este arquivo inteiro e depois os que ele cita. Faça as atualizações no SEP do escritório
> conforme abaixo.

## Aviso importante: o módulo do credor já foi feito em Casa

O handoff de 08/10 (`2026-10-08-casa-tour-e-credor.md`, item 4) dizia que o desenvolvimento do credor
continuaria no escritório. **Isso foi superado:** o módulo foi desenvolvido em Casa entre 10 e 12/10 e está
descrito aqui. **Não refaça** a gestão de credores nem a tesouraria no escritório. Receba a branch abaixo
e continue a partir dela.

## Onde está o trabalho

- **Branch:** `casa-2026-10-12` (GitHub, `dynamisdigital/sep-app`), criada de `escritorio-2026-10-09` no
  commit `ee0dfcb`, o último do escritório que Casa tinha. Se o escritório avançou depois disso,
  integre com merge normal; não houve conflito conhecido na criação.
- **Para receber:** `git fetch origin` e `git switch casa-2026-10-12`. Para integrar na linha do
  escritório: `git switch escritorio-2026-10-09` e `git merge casa-2026-10-12`. Não escrever em
  `develop` nem em `main`, e sem force push.
- **Ponto de retorno:** `ee0dfcb` (`escritorio-2026-10-09`) é o estado anterior a tudo isto.

## O que foi feito (dados fictícios, MSW)

### 1. Conta escrow do credor (`/app/credora/conta`, `/alocacoes`, `/saques`)

Credor PF ou PJ (papel `CLIENTE`; não existe papel `CREDORA`). O saldo nunca é digitado: é a soma de um
**livro-razão** de lançamentos imutáveis em baldes (`DISPONIVEL`, `RESERVADO`, `EM_OPERACAO`, `EXTERNO`).

- **Conta escrow e extrato:** saldo por balde, aporte por Pix fictício, extrato.
- **Alocações:** reservar saldo em oportunidades, respeitando o limite de **R$ 15.000 por credor por
  devedor** (isento para investidor qualificado, art. 24 da Res. CMN 5.050).
- **Saques:** para destinatário cadastrado, com aprovação pela operação.
- Código: `src/app/features/authenticated/credora/escrow/` e `src/app/core/credores/`
  (`escrow-ledger.ts` tem as regras puras: livro-razão, limite, rateio, prazos).

### 2. Backoffice: gestão de credores e tesouraria

- **Credores** (`/app/backoffice/credores` e `/credores/:id`): fila de cadastros, detalhe e decisões
  (aprovar, suspender etc.).
- **Tesouraria** (`/app/backoffice/tesouraria`): formação das operações, desembolso, **repasse das
  parcelas** aos credores e aprovação de saques.
- Código: `src/app/features/authenticated/backoffice/pages/credor*` e `tesouraria-page*`.

### 3. Mock e regras

`src/mocks/credores-escrow.handlers.ts` e `src/mocks/data/credores-escrow.store.ts`, com **idempotência**
(`Idempotency-Key`, resposta repetida com `Idempotent-Replay: true`), autorização por papel e erros
`400/403/404/409/422`. Registrado em `src/mocks/handlers.ts`.

### 4. Tour assistido (5 roteiros novos)

`src/app/core/tour/roteiros/escrow.roteiro.ts`: Conta escrow e extrato, Alocar recursos, Sacar saldo
(credor), Credores e Tesouraria da escrow (backoffice).

### 5. Contrato para o backend

`docs/backend/ESCROW_CREDORES_CONTRATO_BACKEND.md`: conceitos, livro-razão, regras, papéis, rotas, erros,
**lacunas** (o que o mock não faz), decisões abertas para a SEP, perguntas para a Celcoin e para o jurídico,
e ordem sugerida de implementação. Os testes do store e do ledger são a especificação executável.

### 6. Outras mudanças no mesmo conjunto (revisar)

- `src/main.ts` + `src/app/core/env/precarregar-imagens.ts`: pré-carrega as imagens do site na abertura.
- `angular.json`: **orçamentos de build aumentados** (aviso de bundle de 500 kB para 750 kB; estilo de
  componente 16/28 kB para 32/48 kB) e `allowedCommonJsDependencies` (canvg, core-js, html2canvas, raf,
  rgbcolor). Foi feito para o build parar de avisar; vale o escritório confirmar se aceita os novos limites.
- Menus e rotas: `Credora` aparece também para `ADMIN` (sidenav e shell); a área `meu-backoffice` passou a
  aceitar `ADMIN` além de `CORRESPONDENTE` (**atenção:** as rotas `/me/*` do correspondente respondem 403
  para ADMIN; confirmar se é intencional).
- Página inicial (`landing`): a **faixa do topo com o aviso antifraude** (e o link "Saiba como se proteger")
  foi removida, e o link da área do investidor passou para dentro do cabeçalho, abaixo do botão de tema e do
  Entrar. Confirmar com o Daniel se a retirada do aviso antifraude da página inicial é intencional (a
  página `/antifraude` continua existindo).
- Shell da credora: atalhos da conta escrow, alocações e saques para o investidor, sem exigir credora PJ.
- Cobrança: `agenda-tomador-page` ganhou o alvo das ações rápidas (parcela mais atrasada ou próxima a vencer).
- E2E: `e2e/credores-escrow.spec.ts` (Playwright).

## Estado verificado em Casa (13/10)

- ESLint, Prettier, compilação (`tsc`) e build (`ng build`) limpos.
- Stylelint: os 117 avisos antigos de seletores duplicados continuam (dívida já declarada em relatórios
  anteriores); nada novo.
- Testes: **995 aprovados em 124 arquivos** (suíte completa). Os arquivos do módulo somam cerca de 110
  testes novos (store 45, ledger 22, serviço 13, telas de credor e backoffice).

- O e2e `credores-escrow.spec.ts` **não foi executado nesta preparação**. Rodar no escritório:
  `npx playwright test e2e/credores-escrow.spec.ts`.
- Roteiros novos de tour: **não foram executados de ponta a ponta nesta preparação**. Rodar:
  `node docs/atualizacao-07102026/verificar-tours.js` (com `npm start -- --port 4200`), ou os roteiros de
  escrow pelo painel de Ajuda.

## O que o agente do escritório deve fazer

1. Receber e integrar a branch (acima) e rodar `npx vitest run --testTimeout=60000`.
2. Rodar o e2e e os roteiros de escrow (acima) e anotar o resultado.
3. Se o relatório da Diretoria for atualizado, incluir o módulo de credores e escrow: telas, regras
   (livro-razão, limite por credor por devedor, idempotência), os 5 roteiros e as lacunas do contrato.
4. Decisões em aberto para o Daniel e o jurídico estão na seção 8 do contrato (`docs/backend/`) e na
   seção 4 da análise (`docs/analise-credor/`): credor pessoa física, investidor qualificado, captação,
   e quem opera o relacionamento com o credor.
5. **Pagamento e custódia reais dependem da Celcoin e do jurídico**; nada disto movimenta dinheiro de
   verdade (tudo é fictício).

## Fora deste commit, de propósito (ficaram só em Casa, sem versionar)

- `AGENTS.md`: cópia do `CLAUDE.md` para outro agente de IDE.
- `tour_demo/`: arquivos de exemplo de um tour de IDE, não do SEP.
- `login.png` (captura de tela), `_nul` e `diag.json` (resíduos).

## Atenção

- O Windows mostra centenas de arquivos como modificados por fim de linha (CRLF/LF). Use
  `git diff --name-only` para ver só o que mudou de verdade.
- O push de Casa pelo terminal do agente falha por falta de login do GitHub; o envio é feito pelo Daniel
  (VS Code, Source Control, Publish Branch).

# Convergência MVP × projeto atual: pacote de documentação

**Autor:** Daniel Möllmann (Frontend) · **Destinatário principal:** Maurício Chaves (Backend e infraestrutura)
**Data:** 26/10/2026 · **Situação:** versão preliminar em Markdown

Este pacote reúne, em um só lugar, o que foi construído no front depois do MVP e o que o backend precisa
entregar para o front deixar de usar dados fictícios (MSW). Cada módulo tem o mesmo roteiro: **por que ele
existe no fluxo do SEP**, **as telas**, **o que o front já faz**, **o que o backend precisa fazer** e **o que
está em aberto**.

## Como ler

| Documento | Para quê |
| --- | --- |
| [00-responsabilidades-e-ambientes.md](00-responsabilidades-e-ambientes.md) | Quem faz o quê (Daniel × Maurício) e a separação entre ambiente fictício e real |
| [01-comparativo-mvp-x-atual.md](01-comparativo-mvp-x-atual.md) | Diferenças entre o MVP (`sep-app`) e o front atual, e o plano de convergência |
| [modulos/01-correspondentes-e-meu-backoffice.md](modulos/01-correspondentes-e-meu-backoffice.md) | Rede de correspondentes, prospecção, agenda, comissões, desempenho |
| [modulos/02-rede-de-sub-correspondentes.md](modulos/02-rede-de-sub-correspondentes.md) | Sub-correspondentes, teto e repasse |
| [modulos/03-credores-e-conta-escrow.md](modulos/03-credores-e-conta-escrow.md) | Conta escrow do credor, alocação, tesouraria, saques |
| [modulos/04-pix-automatico.md](modulos/04-pix-automatico.md) | Cobrança das parcelas por Pix Automático |
| [modulos/05-analise-de-credito.md](modulos/05-analise-de-credito.md) | Bureaus, score interno explicável e parecer |
| [modulos/06-glossario-e-ajuda.md](modulos/06-glossario-e-ajuda.md) | Glossário técnico e ajuda do sistema |
| [modulos/07-site-publico-e-demonstracao.md](modulos/07-site-publico-e-demonstracao.md) | Site institucional, blog, investidores e demonstração |
| [08-correcao-ci.md](08-correcao-ci.md) | Correção da auditoria do PR #190, compatibilidade do tooling e limites da validação |
| [09-observacoes-para-o-backend.md](09-observacoes-para-o-backend.md) | O que o backend confirma ou decide depois do fechamento do front (28/10/2026) |

Os contratos detalhados que já existem continuam sendo a fonte da verdade e são citados em cada módulo:
[`CONTRATO_BACKEND_CORRESPONDENTES.md`](../atualizacao-07102026/CONTRATO_BACKEND_CORRESPONDENTES.md),
[`ESCROW_CREDORES_CONTRATO_BACKEND.md`](../backend/ESCROW_CREDORES_CONTRATO_BACKEND.md),
[`ANALISE_DE_CREDITO.md`](../atualizacao-07102026/ANALISE_DE_CREDITO.md) e
[`VIABILIDADE_PIX_AUTOMATICO.md`](../atualizacao-07102026/VIABILIDADE_PIX_AUTOMATICO.md).

## Quadro geral: o que o backend já tem e o que falta

Levantamento feito em 26/10/2026 sobre `sep-api` (branch `develop`, último commit de 03/08/2026), olhando os
controllers e o domínio. É uma leitura do código, sem executar a API: confirme na sua visão antes de
planejar.

| Módulo novo do front | No `sep-api` hoje | Falta para o front sair do mock |
| --- | --- | --- |
| Correspondentes e Meu Backoffice | Sem módulo próprio | Papel, entidade, vínculo, base, envios, comissões, funil, agenda, relatórios |
| Rede de sub-correspondentes | Sem módulo próprio | Hierarquia, teto de repasse, posição do sub |
| Credores e conta escrow | `credores` com matching, carteira, oportunidades e aportes; `escrow` com domínio e provedor (Celcoin e fake), **sem endpoints REST** | Endpoints `/credores/me/escrow`, tesouraria, saques, destinatários, gestão de credores, idempotência, webhook |
| Pix Automático | Só Pix de chaves, desembolsos e recebimentos | Recorrência, cobranças por parcela, parceiro (PSP) |
| Análise de crédito | `credito` com propostas, parecer e Open Finance | Consulta a bureaus, score interno, capacidade de pagamento, regras |
| Glossário e ajuda | Não se aplica | Nada: é conteúdo do front |
| Site público e demonstração | Não se aplica | Nada para a demonstração; o blog pode virar API no futuro |

## O que também está neste pacote

- [`imagens/`](imagens/): telas capturadas do sistema com dados fictícios. O módulo de correspondentes, o Pix
  Automático e a análise de crédito reaproveitam as capturas já existentes em
  [`../atualizacao-07102026/imagens/`](../atualizacao-07102026/imagens/).
- [`capturar-telas.cjs`](capturar-telas.cjs): script que refaz as capturas novas (`npm run start -- --port 4200`
  e depois `node docs/convergencia-mvp/capturar-telas.cjs`).

## Relatório na IDE

A IDE (Möllmann Studio IDE) já gera relatórios em Markdown e HTML em *Produtividade e relatório* e os registra
na lista de relatórios (`reporting.register_report`). A ideia é publicar este pacote lá como relatório
eventual; o que falta decidir está em [00-responsabilidades-e-ambientes.md](00-responsabilidades-e-ambientes.md),
seção 4.

## Avisos de revisão (26/10/2026)

- As capturas de `../atualizacao-07102026/imagens/` (módulos 1, 2, 4 e 5) são de 07/10 e mostram a **marca anterior** ("SEP"). As novas, em
  `imagens/`, já têm "Dynamis SEP". Se for publicar, refazer as antigas com um script equivalente ao `capturar-telas.cjs`.
- O levantamento do `sep-api` é leitura de código (controllers e domínio), sem rodar a API: o Maurício deve confirmar o que já está implementado.
- Números do comparativo: contagem por nome de arquivo e por `path:` únicos; refazer após o merge de convergência.

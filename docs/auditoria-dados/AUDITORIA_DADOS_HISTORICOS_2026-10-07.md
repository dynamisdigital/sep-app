# Auditoria dos dados históricos — 07/10/2026

Pedido: verificar se valores, parcelas e juros dos dados históricos batem entre si e com as regras do SEP.
Método: os dados de demonstração foram lidos pelas mesmas rotas que as telas usam (propostas, contratos,
agendas, inadimplência, recebimentos, correspondentes, comissões, credora) e conferidos por aritmética
(tabela Price, soma de parcelas, base × percentual, teto do regimento). Cada achado virou uma correção ou um
teste que impede a volta do problema.

Regras de referência: taxa padrão da oferta **2,4% a.m.**, tarifa de originação **4%** retida no desembolso,
teto do regimento **R$ 15.000,00 por operação**, valor liberado = contratado − tarifa.

## O que estava errado e foi corrigido

| # | Onde | Achado | Correção |
|---|---|---|---|
| 1 | Propostas de crédito (8) | A parcela estimada era `valor ÷ prazo`, sem juros, ao lado do texto "2,4% a.m.". R$ 1.250 em 12× aparecia como R$ 104,17; pela tabela Price a 2,4% é **R$ 121,12**. R$ 3.125 em 36×: R$ 86,81 contra **R$ 130,62**. | Parcela calculada pela tabela Price na taxa que a própria proposta anuncia. |
| 2 | Simulador de nova proposta | Calculava com **1,85% a.m.**, enquanto as propostas anunciavam 2,4%: duas taxas para o mesmo produto. | O simulador e as propostas leem a mesma política (`core/financeiro/politica-credito`). A carência escolhida entra no cálculo. |
| 3 | Carteira de Cobrança (4 contratos, R$ 15.000 contratados) | **Juros zero** em todas as parcelas: o total a pagar era igual ao contratado. | Parcelas com principal + juros (Price, 2,4% a.m.): total a pagar passa a **R$ 17.050,38**; juros totais R$ 2.050,38. |
| 4 | Tela inicial da Cobrança | 4 contratos e 40 parcelas digitados na tela, diferentes da agenda: o contrato 5b771c05 mostrava as parcelas 9/10 e 10/10 "agendadas" enquanto a agenda dizia inadimplente. Os alertas citavam "parcela 4/24" de um contrato de 10 parcelas. | A tela lê a agenda de cada contrato. Contratado, em aberto, parcelas, atrasos, alertas, acordos e recebimentos de 30 dias saem desses dados. |
| 5 | Cobrança: recebimentos (30 dias) | R$ 3.075,13 e "+12,4%" digitados; eixo do gráfico em "30k". | Soma das parcelas pagas na janela, comparada à janela anterior; gráfico e eixos do mesmo dado. |
| 6 | Cobrança: acordos ativos | "2 acordos, R$ 2.125" digitado. | Renegociações aceitas da carteira (quantidade e valor). |
| 7 | Correspondentes: contratos | Seis contratos entre **R$ 18.000 e R$ 120.000**, acima do teto de R$ 15.000. Parcelas digitadas com taxa implícita de 1,77% a 2,78% a.m. | Todos ≤ R$ 15.000; parcela pela tabela Price a 2,4%. Propostas e funil de prospecção também dentro do teto. |
| 8 | Correspondentes: comissão de originação | A regra diz "% sobre o valor liberado", mas o cálculo usava o valor contratado. | Base = contratado − 4% de tarifa (R$ 12.000 → R$ 11.520; 2% = R$ 230,40). |
| 9 | Correspondentes: metas | Metas de R$ 60.000 a R$ 150.000 por correspondente, feitas para os contratos fora do teto. | Metas reescaladas para a base real (R$ 30.000 a R$ 45.000). |
| 10 | Carteira da credora | Parcelas de R$ 600 sem juros e taxa de **2,5%** na oportunidade, acima dos 2,4% que o tomador paga: a credora não pode render mais que o tomador. | Mesmo cronograma do contrato 5b771c08 (R$ 682,01 por parcela), taxa de 2,4%; recebido e total saem do plano. |

Parcelas da carteira de Cobrança (R$ 15.000 contratados, 10 parcelas cada):

| Contrato | Contratado | Parcela antes | Parcela agora | Juros totais | Total a pagar |
|---|---|---|---|---|---|
| 5b771c03 | R$ 1.250,00 | R$ 125,00 | R$ 142,09 | R$ 170,87 | R$ 1.420,87 |
| 5b771c05 | R$ 3.125,00 | R$ 312,50 | R$ 355,22 | R$ 427,14 | R$ 3.552,14 |
| 5b771c06 | R$ 4.625,00 | R$ 462,50 | R$ 525,72 | R$ 632,20 | R$ 5.257,20 |
| 5b771c08 | R$ 6.000,00 | R$ 600,00 | R$ 682,01 | R$ 820,17 | R$ 6.820,17 |

## O que passou na conferência (sem correção)

- Correspondentes: pago = parcelas pagas × parcela, saldo a receber = parcelas em aberto, e cada lançamento de
  comissão = base × percentual (35 lançamentos, 0 divergências). O resumo por situação fecha com a soma dos lançamentos.
- Cobrança: a inadimplência e os recebimentos já eram recortes das mesmas parcelas da carteira.
- O teto de R$ 15.000 por operação na carteira de Cobrança e nas propostas de crédito.

## O que ficou como está, de propósito

- **Exemplos isolados do Pix** (desembolso de R$ 1.250 de um contrato "CONT-8d991a11" e o painel operacional do
  mockup): são ilustrações sem contrato na carteira. Entram no mesmo trabalho de tornar os painéis do Pix reais,
  já anotado como pendência.
- **IOF**: a estimativa de 3,38% do simulador é uma aproximação rotulada como estimada; o IOF devido é apurado
  na liberação e depende da regra vigente do Banco Central. Fica parametrizável em `politica-credito`.

## Como não voltar

- `src/app/core/financeiro/calculo-financeiro.ts`: a matemática (Price, cronograma, custo efetivo) existe em um
  lugar só, com testes.
- `src/mocks/consistencia-dos-dados.spec.ts`: 8 verificações automatizadas (principal soma o contratado, total
  soma o valor a pagar, taxa na primeira parcela, teto do regimento, inadimplência e recebimentos fecham com as
  agendas, parcela estimada = Price, comissão = base × percentual). Se alguém digitar uma parcela sem juros de novo,
  o teste falha.

# Conta escrow dos credores: contrato para o backend

**Data:** 10/10/2026
**Origem:** fluxo operacional implementado no frontend com dados fictícios (MSW), validado por testes
unitários (Vitest) e e2e (Playwright). Este documento descreve o que o mock faz hoje, para o backend
reproduzir, e o que o mock **não** faz, para o backend decidir.
**Fontes no repositório (fonte da verdade do contrato):**

| Assunto                                            | Arquivo                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Tipos (request/response)                           | `src/app/core/credores/credores-escrow.models.ts`                   |
| Regras puras (livro-razão, limite, rateio, prazos) | `src/app/core/credores/escrow-ledger.ts` (+ `.spec.ts`)             |
| Rotas, papéis, idempotência                        | `src/mocks/credores-escrow.handlers.ts`                             |
| Regras de negócio e erros (store do mock)          | `src/mocks/data/credores-escrow.store.ts` (+ `.spec.ts`, 43 testes) |
| Análise de gestão do credor                        | `docs/analise-credor/GESTAO_DO_CREDOR_2026-10-08.md`                |

Os testes do store e do ledger são a especificação executável: o backend deve passar nos mesmos casos.

## 1. Conceitos

- **Credor:** investidor que empresta. PF ou PJ. Usuário com papel `CLIENTE` vinculado a um credor
  (não existe papel `CREDORA`). Isolamento pela sessão: nenhuma rota do credor recebe o id dele.
- **Conta escrow:** conta vinculada na Celcoin (BaaS), segregada do patrimônio da SEP. O saldo **nunca é
  digitado**: é sempre a soma dos lançamentos do livro-razão.
- **Baldes (buckets):** `DISPONIVEL` e `RESERVADO` são caixa na escrow; `EM_OPERACAO` é o principal
  emprestado (a receber); `EXTERNO` é tudo fora da escrow.
  - `totalCustodiado = disponivel + reservado`; `patrimonio = disponivel + reservado + emOperacao`.
- **Oportunidade:** crédito de um devedor aberto à alocação. **Operação:** oportunidade formada e
  desembolsada.

## 2. Livro-razão (regra central)

Lançamentos **imutáveis** e de partida dobrada simples: cada um move valor de um balde a outro. Erro se
corrige com lançamento de estorno, nunca com edição.

| Tipo                | De → Para                |
| ------------------- | ------------------------ |
| `APORTE`            | EXTERNO → DISPONIVEL     |
| `RESERVA`           | DISPONIVEL → RESERVADO   |
| `LIBERACAO_RESERVA` | RESERVADO → DISPONIVEL   |
| `DESEMBOLSO`        | RESERVADO → EM_OPERACAO  |
| `RETORNO_PRINCIPAL` | EM_OPERACAO → DISPONIVEL |
| `RETORNO_JUROS`     | EXTERNO → DISPONIVEL     |
| `SAQUE`             | DISPONIVEL → EXTERNO     |
| `TARIFA`            | DISPONIVEL → EXTERNO     |

Invariantes que o backend deve garantir (no banco, não só na aplicação):

1. Nenhum balde fica negativo (`DISPONIVEL`, `RESERVADO`, `EM_OPERACAO`).
2. Valores em centavos inteiros internamente (o mock expõe reais com 2 casas, `number`). Recomendado
   expor também inteiros em centavos ou string decimal para evitar ponto flutuante.
3. Tabela de lançamentos _append-only_ (sem UPDATE/DELETE; permissão de banco).
4. Conciliação periódica: soma dos lançamentos por credor = saldo informado pela Celcoin.

## 3. Regras de negócio

| Regra                                 | Valor / comportamento                                                                                                                  | Origem                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Limite por credor **por devedor**     | R$ 15.000 em saldo devedor, credor não qualificado. Qualificado é isento (`isento: true`, `disponivel: null`)                                           | Res. CMN 5.050, art. 24        |
| Repasse ao devedor                    | até **5 dias úteis** após a formação                                                                                                   | art. 21                        |
| Retorno ao credor                     | até **1 dia útil** após cada parcela paga                                                                                              | art. 21                        |
| Devolução se a operação não se formar | até **1 dia útil**                                                                                                                     | art. 21                        |
| Ciência de risco                      | obrigatória em toda alocação (`cienciaRisco: true`) e registrada com data                                                              | art. 20, IX                    |
| Perfil de risco do credor             | apurado e alterável pelo backoffice                                                                                                    | art. 28                        |
| Qualificado                           | exige termo assinado (`termoQualificadoEm`)                                                                                            | Res. CVM 30/2021               |
| Saque                                 | só para destinatário **previamente cadastrado** e de **mesma titularidade**                                                            | exigência Celcoin + antifraude |
| Saque: maker-checker                  | quem solicita é diferente de quem aprova; aprovação por `FINANCEIRO` ou `ADMIN`                                                        | controle interno               |
| Rateio da parcela                     | principal e juros divididos **separadamente** entre os credores, proporcional ao alocado, método do maior resto, soma exata ao centavo | `ratear` / `ratearParcela`     |
| Dias úteis                            | calendário nacional de feriados (o mock usa lista simplificada)                                                                        | —                              |

Formação da operação: só é possível desembolsar quando as reservas cobrem **100%** do valor da
oportunidade. Alocação não pode exceder o que falta para fechar. Cancelamento de alocação só enquanto
`RESERVADA`.

## 4. Papéis

| Grupo      | Papéis                              | Pode                                                                        |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Credor     | `CLIENTE` com credor                | ler conta, aportar, alocar, cancelar reserva, cadastrar destinatário, sacar |
| OPERADORES | `BACKOFFICE`, `FINANCEIRO`, `ADMIN` | ler tesouraria e credores                                                   |
| GESTORES   | `BACKOFFICE`, `ADMIN`               | alterar status, perfil de risco e categoria do credor                       |
| TESOURARIA | `FINANCEIRO`, `ADMIN`               | aprovar/rejeitar saque, desembolsar, encerrar, repassar parcela             |

Resposta `403` para papel sem permissão; `404` quando o usuário não tem credor.

## 5. Rotas

Prefixo `/api/v1`. Datas ISO-8601. Erros no formato padrão do projeto (`status`, `error`, `message`,
`path`).

### 5.1 Credor (`/credores/me`)

| Método e rota                               | Corpo                                     | Resposta                         | Observações                                        |
| ------------------------------------------- | ----------------------------------------- | -------------------------------- | -------------------------------------------------- |
| `GET /credores/me/oportunidades`            | —                                         | `OportunidadeAlocavelResponse[]` | só abertas                                         |
| `GET /credores/me/escrow`                   | —                                         | `ContaEscrowResponse`            | saldo + dados da conta vinculada                   |
| `GET /credores/me/escrow/extrato`           | —                                         | `LancamentoEscrow[]`             | mais recentes primeiro                             |
| `GET /credores/me/escrow/aportes`           | —                                         | `AporteResponse[]`               |                                                    |
| `POST /credores/me/escrow/aportes`          | `{ valor }`                               | `201 AporteResponse`             | gera Pix (ver §7.3). **Idempotency-Key**           |
| `GET /credores/me/alocacoes`                | —                                         | `AlocacaoResponse[]`             |                                                    |
| `POST /credores/me/alocacoes`               | `{ oportunidadeId, valor, cienciaRisco }` | `201 AlocacaoResponse`           | **Idempotency-Key**                                |
| `DELETE /credores/me/alocacoes/{id}`        | —                                         | `204`                            | só `RESERVADA`; gera `LIBERACAO_RESERVA`           |
| `GET /credores/me/limites/{oportunidadeId}` | —                                         | `LimiteDevedorResponse`          |                                                    |
| `GET /credores/me/destinatarios`            | —                                         | `DestinatarioResponse[]`         | conta mascarada                                    |
| `POST /credores/me/destinatarios`           | `{ banco, agencia, conta, tipoConta }`    | `201 DestinatarioResponse`       | `409` se repetida                                  |
| `DELETE /credores/me/destinatarios/{id}`    | —                                         | `204`                            |                                                    |
| `GET /credores/me/saques`                   | —                                         | `SaqueResponse[]`                |                                                    |
| `POST /credores/me/saques`                  | `{ destinatarioId, valor }`               | `201 SaqueResponse`              | status `AGUARDANDO_APROVACAO`. **Idempotency-Key** |

> `POST /credores/me/escrow/aportes/{id}/simular-confirmacao` **só existe no mock**: simula o webhook
> de depósito. Não implementar.

### 5.2 Tesouraria (`/backoffice/tesouraria`)

| Método e rota                               | Papéis     | Corpo                  | Resposta                                 |
| ------------------------------------------- | ---------- | ---------------------- | ---------------------------------------- |
| `GET /resumo`                               | OPERADORES | —                      | `TesourariaResumoResponse`               |
| `GET /divergencias`                         | OPERADORES | —                      | `DivergenciaEscrow[]`                    |
| `GET /oportunidades`                        | OPERADORES | —                      | `OportunidadeTesourariaResponse[]`       |
| `GET /operacoes`                            | OPERADORES | —                      | `OperacaoEscrowResponse[]`               |
| `GET /saques`                               | OPERADORES | —                      | `SaqueResponse[]` (pendentes)            |
| `POST /saques/{id}/aprovar`                 | TESOURARIA | —                      | `200 SaqueResponse`. **Idempotency-Key** |
| `POST /saques/{id}/rejeitar`                | TESOURARIA | —                      | `200 SaqueResponse`                      |
| `POST /oportunidades/{id}/desembolsar`      | TESOURARIA | `{ operacaoId? }`      | `200`. **Idempotency-Key**               |
| `POST /oportunidades/{id}/encerrar`         | TESOURARIA | `{ motivo }`           | `200`; devolve as reservas               |
| `POST /operacoes/{id}/parcelas/{n}/repasse` | TESOURARIA | `{ principal, juros }` | `200`. **Idempotency-Key**               |

### 5.3 Gestão de credores (`/backoffice/credores`)

| Método e rota              | Papéis     | Corpo                | Resposta                  |
| -------------------------- | ---------- | -------------------- | ------------------------- |
| `GET ?status=`             | OPERADORES | —                    | `CredorGestaoResponse[]`  |
| `GET /{id}`                | OPERADORES | —                    | `CredorGestaoResponse`    |
| `GET /{id}/extrato`        | OPERADORES | —                    | `LancamentoEscrow[]`      |
| `GET /{id}/auditoria`      | OPERADORES | —                    | `EventoAuditoriaCredor[]` |
| `PATCH /{id}/status`       | GESTORES   | `{ status, motivo }` | `CredorGestaoResponse`    |
| `PATCH /{id}/perfil-risco` | GESTORES   | `{ perfilRisco }`    | `CredorGestaoResponse`    |
| `PATCH /{id}/categoria`    | GESTORES   | `{ categoria }`      | `CredorGestaoResponse`    |

Transições de status: `EM_ANALISE → ATIVO | REPROVADO`; `ATIVO ↔ SUSPENSO`. `REPROVADO` é terminal
(exige novo cadastro). Motivo é obrigatório. Reprovar só é possível em `EM_ANALISE`. Toda decisão grava
evento de auditoria (autor, papel, descrição, data). Marcar `QUALIFICADO` exige termo assinado.

## 6. Erros e status HTTP usados pelo mock

| Status | Quando                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `400`  | status/perfil/categoria inválidos                                                                                                                                                                                                                                                                |
| `403`  | papel sem permissão                                                                                                                                                                                                                                                                              |
| `404`  | credor, oportunidade, aporte, alocação, destinatário, saque ou operação inexistente                                                                                                                                                                                                              |
| `409`  | aporte já confirmado; saque já decidido; parcela já repassada; conta de destino repetida; status já aplicado                                                                                                                                                                                     |
| `422`  | credor não está `ATIVO` (aportar/alocar/sacar); valor ≤ 0; oportunidade indisponível; valor passa do que falta; limite por devedor excedido; reservas não cobrem 100%; saldo insuficiente; destino de outra titularidade; principal da parcela maior que o em operação do credor; motivo ausente |

## 7. Lacunas: o que o mock não faz e o backend precisa decidir

### 7.1 Segurança

1. **Step-up MFA (TOTP)** nas operações de dinheiro: saque, aprovação de saque, desembolso, repasse,
   alteração de status. O mock não exige. As telas já seguem o padrão `/app/step-up` de outros módulos
   (ver Pix e Cobrança); falta ligar.
2. **Maker-checker real:** o mock não impede que o mesmo usuário solicite e aprove. Backend deve rejeitar
   (`403`) quando `aprovador == solicitante`.
3. **Cadastro de destinatário** deve pedir confirmação adicional e ter carência antes do primeiro saque
   (antifraude). Hoje é imediato.
4. Auditoria de **leitura** de dados sensíveis e trilha completa de toda escrita (a do mock cobre só
   decisões sobre o credor).
5. Rate limit nas rotas de dinheiro.

### 7.2 Idempotência

- O mock implementa `Idempotency-Key` em aporte, alocação, saque, aprovar saque, desembolsar e repassar:
  mesma chave + mesma rota + mesmo usuário devolve **o mesmo corpo e status**, com cabeçalho
  `Idempotent-Replay: true`, sem repetir o efeito.
- Não cobre: rejeitar saque, encerrar oportunidade, destinatários, mudanças de status (têm proteção por
  estado, via `409`).
- Backend: persistir a chave com hash do corpo; mesma chave com corpo diferente → `422`; expirar em
  janela definida (sugestão 24 h). Além disso, **cada lançamento deve ter chave de negócio única**
  (ex.: `operacaoId + parcela + tipo`) para o repasse nunca duplicar mesmo sem o cabeçalho.

### 7.3 Integração Celcoin (a confirmar na documentação e com o gerente de conta)

- **Aporte:** o mock gera um Pix fictício e confirma por botão. Real: criar cobrança/QR na conta
  vinculada do credor e confirmar **por webhook** de crédito. Precisa de: validação de assinatura do
  webhook, deduplicação por id do evento, reprocessamento e fila de eventos sem credor identificável
  (alimenta `APORTE_SEM_CREDOR`).
- **Saque:** o mock "executa" na aprovação. Real: transferência assíncrona; status intermediário
  (`PROCESSANDO`), confirmação ou falha por webhook; falha estorna o `SAQUE` (alimenta
  `SAQUE_NAO_EXECUTADO`). O enum `StatusSaque` precisará de mais estados.
- **Desembolso ao devedor:** o mock só move saldo entre baldes. Real: pagamento ao devedor dentro de
  5 dias úteis, com comprovante.
- **Recebimento da parcela do tomador:** o mock não liga a parcela Pix/cobrança do tomador ao repasse; o
  `principal`/`juros` do repasse é informado pela tesouraria. Real: o repasse deve nascer do pagamento
  confirmado da parcela (cobrança), com `principal` e `juros` calculados pelo cronograma, não digitados.
- **Estrutura da conta:** uma subconta/conta virtual por credor, ou uma escrow única com razão interno?
  O mock assume razão por credor e saldo reconciliado.
- **Conciliação:** rotina diária comparando extrato Celcoin × livro-razão, gerando `DivergenciaEscrow`
  (`APORTE_SEM_CREDOR`, `VALOR_DIVERGENTE`, `SAQUE_NAO_EXECUTADO`). O mock só lista divergências fixas.
- **Tarifas:** o tipo `TARIFA` existe no razão, mas o mock não cobra. Definir quem paga (SEP ou credor).

### 7.4 Dados e fluxo

- **Cadastro do credor** (hoje semeado): KYC/KYB e PLD, aceite de termos, apuração do perfil de risco
  (questionário) e termo de investidor qualificado com comprovação. O mock já exibe os campos, mas o
  fluxo de entrada não existe.
- **Formação da operação:** o mock exige 100% de cobertura. Definir prazo de captação, rateio quando há
  excesso de demanda e o que acontece ao vencer o prazo (devolver automaticamente em 1 dia útil).
- **Inadimplência:** não modelada. Falta o fluxo de parcela atrasada, recuperação, e como o prejuízo é
  refletido no `EM_OPERACAO` do credor.
- **Cronograma:** o mock usa tabela Price com `gerarCronograma` (ver `calculo-financeiro`); o backend
  deve ser a fonte única e o frontend passar a só exibir.
- **Relatórios regulatórios:** divulgação mensal de inadimplência por classificação de risco (arts. 25–27)
  e informe de rendimentos ao credor.

### 7.5 Operação

- Paginação e filtros (as listas do mock devolvem tudo).
- Exportação do extrato (CSV/PDF).
- Notificações ao credor (aporte confirmado, parcela recebida, saque executado).

## 8. Decisões abertas para a SEP

1. **Aceitar credor pessoa física?** O mock aceita PF e PJ. A norma permite (art. 16), mas exige perfil
   e limite; confirmar com o jurídico e com a Celcoin se a conta escrow de PF é viável no contrato atual.
2. ~~Qual é o limite de R$ 15.000?~~ **Decidido (10/10/2026, Daniel):** o credor pode ter vários
   tomadores; o limite de R$ 15.000 vale **por par credor × tomador** (mesma SEP), e emprestar a outro
   tomador abre um novo limite. Pelo voto do CMN 89/2022 (art. 24), o que conta é o **somatório dos
   saldos devedores**, então cada parcela de principal paga reabre espaço. O mock aplica assim: reserva
   conta inteira; operação em curso conta o principal desembolsado menos os `RETORNO_PRINCIPAL`. Pendente
   só a confirmação do jurídico com o texto publicado da Res. 5.050 (e o §1, limites próprios da SEP).
3. **Quem opera a tesouraria?** O mock separa `FINANCEIRO`/`ADMIN` (movimenta dinheiro) de
   `BACKOFFICE` (gere cadastro). Confirmar se é essa a segregação desejada.
4. **Critério de aprovação do cadastro do credor:** automático (KYC/PLD aprovado) ou revisão manual
   sempre? O mock tem fila manual (`EM_ANALISE`).
5. **Tarifas:** quem arca com o custo de Pix, TED e manutenção da conta.
6. **Retenção e prova:** tempo de guarda do livro-razão e da auditoria.

## 9. Perguntas para a Celcoin

1. O contrato atual cobre conta escrow/vinculada **por credor** (subcontas)? Limite de subcontas e custo.
2. A conta escrow admite credor pessoa física? Quais documentos o KYC exige?
3. Lista de **webhooks** disponíveis (crédito de Pix, falha/confirmação de transferência), formato,
   assinatura, política de retentativa e ambiente de sandbox.
4. A transferência é permitida apenas para **destino cadastrado e de mesma titularidade**? Isso é
   configurável por nós ou imposto por vocês?
5. Existe consulta de saldo/extrato por subconta para a conciliação diária?
6. SLA e janelas de operação (Pix 24×7; TED em horário bancário).
7. Como é a segregação patrimonial e a posição da Celcoin em caso de insolvência da SEP.

## 10. Perguntas para o jurídico

1. A estrutura (escrow Celcoin, razão por credor) atende aos arts. 21, 22 e 32 da Res. CMN 5.050/2022?
2. O limite de R$ 15.000 por par credor × tomador, contado pelo saldo devedor, confere com o texto publicado da Res. 5.050 (art. 24) e com o regimento?
3. Modelo de **ciência de risco** (art. 20, IX) e do **termo de investidor qualificado**.
4. A SEP pode captar credores por terceiros/correspondentes (o art. 15 não menciona)?
5. Vigência de resolução posterior que tenha revogado ou alterado a 5.050/2022 (a análise anterior
   apontou a Res. 5.177/2024 como ponto a confirmar).

## 11. Ordem sugerida de implementação

1. Livro-razão + saldo + extrato (com testes de invariantes) e `GET /credores/me/escrow*`.
2. Aporte com webhook Celcoin (sandbox) + idempotência.
3. Oportunidades, alocação, limite e cancelamento.
4. Gestão de credores (status, perfil, categoria, auditoria).
5. Desembolso, encerramento e devolução.
6. Repasse de parcela ligado ao pagamento confirmado do tomador.
7. Saque com maker-checker, step-up e execução assíncrona.
8. Conciliação e divergências; relatórios regulatórios.

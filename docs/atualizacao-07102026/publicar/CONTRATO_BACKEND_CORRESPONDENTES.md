# Módulo de Correspondentes — apoio técnico ao backend

**Destinatário:** responsável pelo backend e infraestrutura (Maurício Chaves)
**Autor:** Daniel Möllmann, Frontend Development
**Data:** 07/10/2026
**Situação:** proposta de contrato. O front já funciona contra dados fictícios (MSW) seguindo exatamente
este contrato; nada aqui foi publicado no backend.

Este documento diz o que o front espera, o que o backend precisa garantir e **por que** cada decisão
foi tomada. Onde a regra é incerta ou depende do jurídico, está marcado como **EM ABERTO**.

---

## 1. Princípio que governa todo o desenho

> **Quem capta o cliente não é quem decide o crédito.**

O correspondente capta, atesta a conferência de documentos e acompanha sua base. Analisar, aprovar,
formalizar e liberar crédito continuam exclusivos de BACKOFFICE, FINANCEIRO e ADMIN.

**Por quê:** o SEP movimenta dinheiro e dados sensíveis. Se a carteira comercial der acesso, ainda que
parcial, à decisão de crédito, um correspondente poderia influenciar a própria comissão. A separação
precisa existir no backend (`@PreAuthorize`), porque o front só esconde telas.

**Consequência prática:** `CORRESPONDENTE` **não** entra em nenhuma das listas de papéis dos módulos de
Onboarding, Crédito, Formalização, Cobrança, Pix e Backoffice. Ele ganha rotas próprias, de leitura da
própria base e de envio.

---

## 2. Papel e autorização

### 2.1 Novo valor de `UsuarioRole`

Acrescentar `CORRESPONDENTE` ao enum. O front já o reconhece (`api.models.ts`).

### 2.2 Matriz de acesso

| Recurso | ADMIN | BACKOFFICE | FINANCEIRO | CORRESPONDENTE | CLIENTE |
|---|:-:|:-:|:-:|:-:|:-:|
| Rede de correspondentes (listar, detalhar, renovar) | ✔ | — | — | — | — |
| Reatribuir vínculo / apurar vigência | ✔ | — | — | — | — |
| Própria base, resumo e envios (`/me/*`) | — | — | — | ✔ | — |
| Contratos, propostas e parcelas dos clientes da própria base (leitura) | — | — | — | ✔ | — |
| Funil, agenda, comissões e desempenho **próprios** (`/me/*`) | — | — | — | ✔ | — |
| Regras de comissão, metas, ranking da rede e auditoria | ✔ | — | — | — | — |
| Criar envio de documentos | — | — | — | ✔ | — |
| Listar e validar envios | ✔ | ✔ | ✔ | — | — |
| Decisão de crédito, formalização, Pix | conforme hoje | conforme hoje | conforme hoje | **nunca** | — |

### 2.3 Acúmulo de papéis

**Recomendação:** `CORRESPONDENTE` **não pode ser acumulado** com ADMIN, BACKOFFICE ou FINANCEIRO.

**Por quê:** o papel principal é calculado pela precedência `ADMIN > FINANCEIRO > BACKOFFICE > CLIENTE`
e o front decide menu e rota por ele. Uma mesma pessoa captando e validando seria exatamente o conflito
que o princípio da seção 1 evita. A validação deve estar na API de papéis (`PUT /usuarios/{id}/roles`),
devolvendo 422 com mensagem clara. Se o negócio precisar acumular `CORRESPONDENTE` com `CLIENTE` (o
correspondente que também toma crédito), definir isso explicitamente e proibir que ele atue sobre a
própria operação.

### 2.4 Isolamento da base (o ponto mais importante)

- As rotas `/correspondentes/me/*` **não recebem identificador**. O `correspondente_id` é resolvido a
  partir da identidade autenticada (claim do token ou consulta pelo `usuario_id`).
- **Nunca** aceitar `correspondenteId` vindo de parâmetro, corpo ou cabeçalho para filtrar a base de
  quem está autenticado.
- Toda consulta de clientes, propostas, parcelas e inadimplência exposta ao correspondente precisa de
  predicado de escopo **na camada de dados** (repositório ou filtro de linha), não só no controller.
- Recurso de outro correspondente: responder **404**, não 403. Isso evita que se descubra, por
  tentativa, quais identificadores existem (enumeração).

**Por quê:** é o risco de maior impacto do módulo. Um erro de escopo expõe CPF, renda e contratos de
clientes de terceiros (LGPD). Pedir testes automatizados de acesso indevido (IDOR) como critério de
aceite: o correspondente A tenta ler, por identificador, cada recurso do correspondente B e recebe 404.

---

## 3. Modelo de dados proposto

```
correspondente
  id, usuario_id (único), nome, cpf (criptografado), email, telefone,
  status, validade_cadastro (date), cadastro_atualizado_em,
  criado_em, atualizado_em, criado_por, atualizado_por

correspondente_cadastro_historico        -- uma linha por renovação/atualização
  id, correspondente_id, validade_anterior, validade_nova,
  dados_atualizados (bool), responsavel_id, motivo, criado_em

vinculo_cliente_correspondente           -- a entidade central
  id, cliente_id, correspondente_id (nulo = direto SEP),
  status, inicio (date), fim (date), motivo_fim,
  origem (CAPTACAO | ELEICAO_CLIENTE | TRANSFERENCIA_ADMIN),
  criado_em, criado_por

envio_documentos
  id, correspondente_id, cliente_id, status, enviado_em,
  atesto_conferencia (bool), atesto_texto_versao, atesto_ip, atesto_em,
  observacao_backoffice, validado_por, validado_em

envio_documentos_item
  id, envio_id, tipo, nome_arquivo, storage_key, tamanho, sha256, content_type

comissao_regra                           -- versionada, ver seção 8
comissao_lancamento                      -- ledger imutável, ver seção 8
```

Mais: acrescentar à **proposta** o campo `correspondente_informado_id` (nulo = nenhum), ver seção 5.

### Por que o vínculo é uma entidade, e não um campo no cliente

Um campo `correspondente_id` em `cliente` perde o histórico. Quem tem direito à comissão de um
contrato assinado em março, se o cliente trocou de correspondente em setembro? Sem vínculo com
**vigência** (início e fim), qualquer apuração retroativa vira disputa. Com ele, cada evento
financeiro é atribuído ao vínculo que estava vigente **na data do evento**.

### Restrições obrigatórias

- **Um único vínculo vigente por cliente:** índice único parcial em `(cliente_id)` onde
  `status = 'VIGENTE'` (ou `fim IS NULL`). Impede dois correspondentes com direito sobre o mesmo
  cliente por corrida ou erro de tela.
- `fim >= inicio`; `motivo_fim` obrigatório quando `fim` preenchido.
- Vínculo **nunca é apagado nem editado em retrospecto**: encerra-se e cria-se outro.

---

## 4. Ciclo de vida do cadastro do correspondente

```
PENDENTE ──aprovação──▶ ATIVO ──(D-30)──▶ A_VENCER ──(validade < hoje)──▶ VENCIDO
                          ▲                    │                              │
                          └──────── renovação + atualização de dados ─────────┘
ATIVO | A_VENCER ──ação do admin──▶ SUSPENSO ──ação do admin──▶ ATIVO
qualquer ──ação do admin──▶ INATIVO (terminal)
```

- `A_VENCER` e `VENCIDO` são **derivados** da data de validade; não precisam de job para existir, só
  para gerar efeitos (aviso e perda de base).
- O front hoje usa janela de **30 dias** para `A_VENCER`. Tornar isso **parâmetro** (ver parâmetros
  operacionais já existentes em `/admin/parametros`), e não constante.
- Renovação exige **atualização de dados**: a regra de negócio diz que cadastro "desatualizado" também
  faz perder a base. O backend precisa definir o que é "desatualizado" (sugestão: `cadastro_atualizado_em`
  mais antigo que N meses, com N parametrizável).
- `POST /correspondentes/{id}/renovar-cadastro` deve exigir **step-up (TOTP)**, pois muda a elegibilidade
  de pagamento e de posse de clientes.

---

## 5. Regras de perda de base

Três gatilhos encerram um vínculo `VIGENTE`:

| # | Gatilho | `motivo_fim` | Quem detecta |
|---|---|---|---|
| 1 | Cadastro do correspondente vencido ou desatualizado | `CADASTRO_VENCIDO` | Job diário |
| 2 | Proposta do cliente assinada **sem citar** o correspondente | `PROPOSTA_SEM_CITACAO` | Evento de assinatura |
| 3 | Cliente elege outro correspondente ou o SEP direto | `ELEICAO_CLIENTE` | Ação registrada |

Depois da perda, o cliente pode eleger outro correspondente ou ficar direto com o SEP
(`correspondente_id` nulo, `status = DIRETO_SEP`).

### 5.1 Job de vigência

- Agendado (diário), **idempotente** (rodar duas vezes no mesmo dia não encerra nada em duplicidade),
  com lock distribuído para não rodar em paralelo em duas instâncias.
- Registra em auditoria cada vínculo encerrado: quem (sistema), quando, motivo, correspondente afetado.
- Notifica o correspondente em **D-30, D-7 e D-0** (o front já tem o serviço de notificações para
  consumir isso).
- No front há o botão "Apurar vigências (simulação)", que chama `POST /correspondentes/vigencia/processar`.
  **Em produção esse endpoint não deve existir como ação de tela**: ou some, ou fica restrito a ADMIN
  com step-up para reprocessamento manual.

### 5.2 Citação do correspondente na proposta

A regra 2 só é verificável se a proposta registrar **quem foi citado**. Pedido ao backend:

- Campo `correspondente_informado_id` na proposta (nulo = nenhum), preenchido no fluxo de formalização.
- No evento de assinatura, comparar com o vínculo vigente do cliente. Divergência encerra o vínculo
  (`PROPOSTA_SEM_CITACAO`).

**Por quê:** sem esse dado o gatilho não é auditável; viraria julgamento manual.

**EM ABERTO (negócio):** se o cliente cita **outro** correspondente na proposta, o vínculo passa
automaticamente a esse outro (`ELEICAO_CLIENTE`) ou depende de confirmação do SEP?

---

## 6. Endpoints (contrato que o front consome)

Base: `/api/v1`. Os tipos exatos estão em
`src/app/core/correspondentes/correspondentes.models.ts`.

### Administração (ADMIN)

| Método | Rota | Descrição | Observação |
|---|---|---|---|
| GET | `/correspondentes` | Rede e indicadores consolidados | Paginar quando a rede crescer |
| GET | `/correspondentes/{id}` | Detalhe | 404 se inexistente |
| GET | `/correspondentes/{id}/vinculos` | Vínculos vigentes e encerrados | Inclui histórico |
| POST | `/correspondentes/{id}/renovar-cadastro` | Renova validade `{ novaValidade }` | **Step-up**; auditar |
| POST | `/correspondentes/vinculos/{id}/reatribuir` | `{ correspondenteDestinoId \| null }` | **Step-up**; auditar; encerra e cria vínculo |
| POST | `/correspondentes/vigencia/processar` | Apuração manual | Ver seção 5.1 |

### Correspondente (CORRESPONDENTE) — sempre a própria base

| Método | Rota | Descrição |
|---|---|---|
| GET | `/correspondentes/me/resumo` | Cadastro, contadores e comissão prevista |
| GET | `/correspondentes/me/base` | Clientes vinculados e histórico |
| GET | `/correspondentes/me/operacoes` | Propostas e contratos dos clientes da base, **com parcelas** (ver seção 6.1) |
| GET | `/correspondentes/me/envios` | Envios de documentos próprios |
| POST | `/correspondentes/me/envios` | Cria envio (ver seção 7) |

### 6.1 Acompanhamento da carteira (contratos e parcelas)

O correspondente captou o cliente e é quem faz o acompanhamento, então precisa ver **se o contrato está
em dia e quanto vale a parcela**. O front já consome isto:

- `GET /correspondentes/me/operacoes` devolve, por operação: número, tipo (`PROPOSTA` ou `CONTRATO`),
  produto, situação (`EM_ANALISE`, `EM_FORMALIZACAO`, `EM_DIA`, `EM_ATRASO`, `QUITADO`, `RECUSADA`),
  valor contratado, **valor da parcela**, total e pagas, parcelas vencidas, valor pago, **valor em
  atraso**, saldo a receber, próximo vencimento e a lista de parcelas (número, vencimento, valor,
  situação, data de pagamento, dias de atraso).
- `GET /correspondentes/me/resumo` traz o bloco `carteira`: contratos ativos, valor contratado, valor em
  atraso, saldo a receber, parcelas pagas, a vencer e vencidas, **inadimplência (%)**, contagem por
  situação e o valor a receber nos próximos seis meses (alimenta os gráficos).
- `GET /correspondentes` (ADMIN) passa a trazer, por correspondente, `valorCarteira`, `valorEmAtraso` e
  `inadimplenciaPct`.

**Regras:**

1. **Origem dos dados:** são derivados de Formalização (contrato) e Cobrança (parcelas). O correspondente
   **não escreve** nada neles. Recomendo um *read model* próprio (visão ou tabela de leitura) para não
   expor as tabelas operacionais e para a consulta da base ser barata.
2. **Escopo pelo vínculo vigente:** só entram operações de clientes com **vínculo vigente** com o
   correspondente. Perdida a base, **a leitura acaba junto**, inclusive do que já foi contratado.
   *Por quê:* o vínculo é o que legitima o acesso a dados do cliente. Manter a leitura depois da perda
   seria acesso sem base legal.
3. **Inadimplência:** parcelas vencidas ÷ parcelas já devidas (vencidas mais as pagas). Fixar essa
   definição com a Cobrança, para o número do correspondente bater com o da cobrança.
4. **Minimização:** o correspondente vê situação, valores e parcelas. **Não** vê score, renda, parecer
   de crédito nem dados de pagamento do cliente além do status.
5. **Desempenho:** o resumo é consultado a cada abertura do painel; calcular no banco com índice por
   `vinculo` e, se preciso, materializar por correspondente.

### Backoffice (BACKOFFICE, FINANCEIRO, ADMIN)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/backoffice/correspondentes/envios` | Envios para validação |
| POST | `/backoffice/correspondentes/envios/{id}/validar` | `{ decisao: VALIDAR \| DEVOLVER, observacao }` |

### Códigos de erro esperados

| Código | Quando |
|---|---|
| 400 | Atesto ausente; cliente ou documentos ausentes; devolução sem observação; data inválida |
| 403 | Papel sem acesso à rota |
| 404 | Recurso inexistente **ou de outro correspondente** |
| 409 | Envio com cadastro `VENCIDO` ou `SUSPENSO`; vínculo já encerrado; segundo vínculo vigente |
| 422 | Acúmulo de papéis proibido |

O formato de erro é o mesmo do restante da API (`ApiErrorResponse`), que o front já trata.

---

## 7. Envio de documentos, atesto e fila do backoffice

Fluxo: correspondente envia → atesta que **conferiu os documentos com os originais** → envio fica
`EM_VALIDACAO` e é sinalizado como formalizado → entra na fila operacional → backoffice **valida ou
devolve** (devolução exige motivo) → correspondente acompanha o retorno.

### 7.1 O atesto é registro jurídico

Gravar, de forma imutável: `correspondente_id`, data e hora, IP, **versão do texto** do atesto exibido
e o identificador do envio. O front envia `atestoConferencia: true`; o servidor **não confia** nisso
sozinho e deve registrar a versão do texto vigente.

**Por quê:** se um documento se mostrar adulterado, o SEP precisa provar quem atestou, quando e sob qual
declaração.

### 7.2 Upload real (hoje o front só envia nome e tipo)

A tela atual mostra o seletor de arquivo, mas **não transmite o conteúdo**: depende do contrato de
armazenamento. Requisitos sugeridos:

- Tipos permitidos (PDF, JPEG, PNG), tamanho máximo, quantidade máxima por envio, todos parametrizados.
- Varredura antivírus antes de disponibilizar ao backoffice.
- Hash **SHA-256** de cada arquivo, o mesmo padrão já usado nas versões de contrato da Formalização.
- Armazenamento fora do banco, com chave não previsível e URL assinada de curta duração para leitura.
- Documentos de terceiros **mascarados** em listagens (padrão já adotado nas telas).

### 7.3 Integração com a fila

O envio deve gerar um item na fila operacional. Hoje `TipoItemFila` não tem tipo para isso.

- Sugestão: novo valor `DOCUMENTOS_CORRESPONDENTE`, com prioridade e SLA parametrizáveis.
- O front hoje lista os envios em `/app/backoffice/correspondentes`. Quando o tipo existir, o item
  também aparecerá em `/app/backoffice/fila` e essa tela passa a ser o detalhe do item.
- **Atenção:** o front tem mapas fechados por `TipoItemFila`. Acrescentar o tipo exige um ajuste
  coordenado no front; avisar antes de publicar.

---

## 8. Comissionamento e pagamento via Pix

> **Nada disto foi implementado no front além de um valor fictício de "comissão prevista".** Depende de
> validação jurídica e fiscal (seção 11).

### 8.1 Regras configuráveis, nunca no código

Reaproveitar a infraestrutura de **parâmetros operacionais versionados** (já usada para o teto de
crédito), com alteração auditada, justificativa e step-up.

Tabela `comissao_regra` (versionada): produto, base de cálculo (valor liberado, parcela recebida),
percentual ou valor fixo, gatilho de pagamento, período de apuração, vigência da regra, correspondente
específico (opcional).

**Por quê:** as regras vão mudar por produto, por período e por correspondente. Código fixo obrigaria
publicação a cada ajuste comercial.

### 8.2 Ledger imutável

`comissao_lancamento`: nunca se altera nem se apaga. Correção é **novo lançamento** (estorno com sinal
contrário) referenciando o original.

Campos: `correspondente_id`, `vinculo_id`, `regra_id` (versão usada), `evento_origem`
(contrato/parcela), `valor`, `competencia`, `status` (`PREVISTA`, `DISPONIVEL`, `PAGA`, `ESTORNADA`),
`data_evento`.

**Por quê:** é a única forma de reconstruir, meses depois, por que um correspondente recebeu determinado
valor. Também sustenta o estorno em cancelamento.

### 8.3 Atribuição ao vínculo vigente na data do evento

Cada lançamento aponta para o `vinculo_id` vigente **na data do evento gerador**. Assim, perder a base
depois não apaga comissão já gerada, e eventos posteriores à perda não geram comissão para quem perdeu.

**EM ABERTO (negócio):** a comissão **recorrente** (por parcela recebida) continua após a perda do
vínculo, ou corta na data da perda? Recomendo decidir antes de modelar o gatilho, pois muda o ledger.

### 8.4 Pagamento via Pix do SEP

Reaproveitar o fluxo Pix existente de desembolso, com os mesmos controles:

- **Step-up (TOTP)** na autorização do lote de pagamento.
- **Idempotência** por `(correspondente, competência, lote)`: reenvio não paga duas vezes.
- **Conciliação** com o retorno do provedor; item pago só vira `PAGA` após confirmação.
- Chave Pix do correspondente **validada e titularidade conferida** com o CPF cadastrado (pagar a conta
  de terceiro é o vetor clássico de fraude).
- Segregação de funções: quem **configura** regra não é quem **autoriza** o pagamento.

---

## 9. Auditoria

Registrar, com autor, data e hora, IP e valores antes e depois:

- cadastro, atualização, renovação, suspensão e inativação de correspondente;
- criação, encerramento, transferência e reatribuição de vínculo (incluindo o motivo);
- criação e decisão de envio de documentos;
- alteração de regra de comissão e autorização de pagamento;
- toda leitura de dados de cliente por correspondente (log de acesso, ver seção 10).

**Por quê:** é o que sustenta a resposta a um titular (LGPD), a uma fiscalização e a uma disputa de
comissão.

---

## 10. LGPD e segurança

- **Base legal e finalidade:** o correspondente trata dados do cliente em nome do SEP. Definir se atua
  como operador, formalizar em contrato e registrar o **termo de ciência/autorização do cliente** para o
  tratamento e o envio de documentos. Validar com o jurídico/DPO.
- **Minimização:** o correspondente vê apenas o necessário para captar e acompanhar a própria base:
  documento mascarado, situação do vínculo e, dos contratos que captou, situação, valor da parcela,
  parcelas e atraso (seção 6.1). Não expor renda, score nem parecer de crédito. O acesso a esses dados
  cessa quando o vínculo deixa de estar vigente.
- **MFA obrigatório** para o papel `CORRESPONDENTE`, dado o volume de dados pessoais e o impacto
  financeiro. O fluxo TOTP já existe.
- **Rate limit** nas rotas `/me/*` e no upload; bloqueio e alerta em padrão anormal de consulta.
- **Sessão** com expiração curta e invalidação imediata quando o cadastro passa a `VENCIDO`, `SUSPENSO`
  ou `INATIVO`: um correspondente suspenso não pode continuar operando com o token em curso.
- **Retenção:** definir prazo de guarda dos documentos enviados e dos logs, e rotina de descarte.

---

## 11. Pontos que dependem do jurídico e do fiscal (EM ABERTO)

Não são decisões de código; o front só reflete o que for definido.

1. **Enquadramento regulatório.** Se o modelo do SEP admite correspondente **pessoa física**, e em que
   condições de contrato, registro e responsabilidade. A norma de correspondentes no País é a Resolução
   CMN 4.935/2021; confirmar aplicabilidade e vigência com o jurídico.
2. **Tributação da comissão paga a pessoa física** (retenções e documento fiscal ou recibo). Muda o
   dado que o pagamento carrega e o ledger.
3. **Responsabilidade do correspondente pelo atesto** e consequência de atesto falso, em contrato.
4. **Base legal LGPD** e papel de operador/controlador.
5. **Prazo de validade do cadastro** e o que caracteriza "desatualizado".

---

## 12. Testes de aceite sugeridos

1. Correspondente A não lê, por identificador, nenhum recurso do B (404 em todos os endpoints).
2. `CORRESPONDENTE` recebe 403 em Crédito, Formalização, Cobrança, Pix e Backoffice.
3. Cadastro vencido: a apuração encerra os vínculos com `CADASTRO_VENCIDO`; rodar de novo não duplica.
4. Dois vínculos vigentes para o mesmo cliente são impossíveis (constraint).
5. Envio sem atesto, com cadastro vencido ou com arquivo inválido é rejeitado.
6. Devolução sem observação é rejeitada.
7. Renovação e reatribuição sem step-up são rejeitadas.
8. Comissão gerada antes da perda do vínculo permanece; evento posterior não gera.
9. Pagamento reenviado não paga duas vezes (idempotência).
10. O correspondente só lê contratos e parcelas de clientes com vínculo vigente; ao perder o vínculo, a
    consulta volta vazia (e o contrato do ex-cliente responde 404).
11. A inadimplência da carteira bate com a da Cobrança para o mesmo conjunto de contratos.

---

## 13. Sugestão de entrega em fases

| Fase | Backend entrega | Front entrega (já pronto com mock) |
|---|---|---|
| 1 | Papel, entidade `correspondente`, ciclo de vida, vínculo, endpoints `/me/resumo` e `/me/base`, auditoria | Meu Back Office, Rede, Detalhe |
| 1b | `/me/operacoes` e bloco `carteira` (read model de contratos e parcelas, seção 6.1) | Painel com gráficos, Contratos, Detalhe das parcelas |
| 1c | Funil, agenda, comissões (livro e regras), metas, desempenho, auditoria e relatórios (seções 15 a 18) | Prospecção, Agenda, Comissões, Desempenho, Relatórios, e as três telas da administração |
| 2 | Upload real, atesto registrado, tipo de item na fila, `/me/envios`, validação | Envio de documentos, Envios de correspondentes |
| 3 | Job de vigência, avisos D-30/D-7/D-0, campo de citação na proposta | Avisos no painel, notificações |
| 4 | Regras e ledger de comissão, pagamento via Pix | Comissões, relatórios (ainda não construídos) |
| 5 | Metas, ranking, performance da rede | Painéis da rede (ainda não construídos) |

A fase 1 pode começar sem decisão jurídica. As fases 3 e 4 dependem da seção 11.

---

## 14. Como o front troca o mock pelo backend

- Os contratos estão em `src/app/core/correspondentes/correspondentes.models.ts` e o transporte em
  `correspondentes.service.ts`. Se o backend seguir os nomes e formatos acima, **não há alteração de
  tela**: basta o ambiente apontar para a API real.
- O mock vive em `src/mocks/correspondentes.handlers.ts` e `src/mocks/data/correspondentes.store.ts`, e
  espelha as regras desta seção. Ele pode servir de **especificação executável**: o spec
  `correspondentes.store.spec.ts` descreve em testes o comportamento esperado de vigência, reatribuição
  e validação.
- Qualquer diferença de nome ou formato deve ser combinada antes: o front ajusta o tipo, não a tela.

---

## 15. Funil de prospecção e agenda de relacionamento

**Para quê:** o módulo não pode começar só quando o cliente contrata. O correspondente precisa
organizar quem ainda não contratou e registrar o relacionamento.

### Endpoints (todos `/correspondentes/me/*`, sempre a própria base)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/me/prospects` | Prospects do correspondente, em todas as etapas |
| POST | `/me/prospects` | Cria prospect (nasce `PROSPECTADO`) |
| PATCH | `/me/prospects/{id}/etapa` | `{ etapa, motivoPerda? }`; `PERDIDO` exige motivo |
| GET | `/me/interacoes` | Compromissos e histórico |
| POST | `/me/interacoes` | Registra (já ocorreu) ou agenda (futuro) |
| POST | `/me/interacoes/{id}/concluir` | Conclui um compromisso |

### Regras

1. **Etapas:** `PROSPECTADO → CONTATADO → EM_NEGOCIACAO → DOCUMENTACAO → ANALISE_CREDITO → APROVADO →
   CONTRATADO → ATIVO`, mais `PERDIDO` (com motivo). **`ANALISE_CREDITO`, `APROVADO` e `CONTRATADO` não
   podem ser definidas pelo correspondente de forma livre**: devem refletir o estado real da proposta
   na esteira do SEP. *Por quê:* o princípio da seção 1. Se o correspondente pudesse marcar "aprovado",
   o funil viraria uma declaração dele sobre uma decisão que não é dele. No mock a tela deixa avançar
   todas as etapas para demonstrar o fluxo; **no backend, as etapas de decisão são derivadas, e o
   correspondente só move as etapas comerciais** (até `DOCUMENTACAO`).
2. **Status da interação:** `REGISTRADA`, `AGENDADA`, `CONCLUIDA` e `ATRASADA`. `ATRASADA` é **derivada**
   (agendada com data vencida), e não gravada: evita job e inconsistência.
3. **Conflito de captação:** o mesmo CPF/CNPJ pode ser prospectado por dois correspondentes, ou já ser
   cliente de um deles. Definir a regra de **primeiro registro vigente** e como o conflito é tratado
   (bloqueio, aviso ao administrador, ou disputa). **EM ABERTO (negócio).** *Por quê:* sem regra, o
   prospect vira fonte de disputa de comissão.
4. **Do prospect ao cliente:** ao ser contratado, o prospect gera o vínculo (seção 3) com
   `origem = CAPTACAO`. O elo prospect → vínculo deve ser gravado.

### LGPD

Prospect é dado pessoal coletado **antes** de qualquer relação. Definir a base legal (consentimento ou
legítimo interesse, com teste de balanceamento), a finalidade, o **prazo de retenção** (sugestão:
descarte de `PERDIDO` e de prospect inativo após prazo parametrizado) e o direito de exclusão.
Minimizar: nome, tipo, telefone, produto e valor estimado. Não coletar documento no funil.

---

## 16. Comissionamento, metas, desempenho e ranking

### 16.1 Comissionamento (detalhamento da seção 8)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/me/comissoes` | CORRESPONDENTE | Resumo e lançamentos próprios |
| GET | `/comissoes/regras` | ADMIN | Regras vigentes |
| PUT | `/comissoes/regras/{id}` | ADMIN | `{ percentual, justificativa }`; cria **nova versão** |
| GET | `/comissoes/lancamentos` | ADMIN | Livro da rede |

- **Regra versionada com vigência por data:** a versão aplicada a um evento é a **vigente na data do
  evento**, e o lançamento **grava a versão usada**. Alterar a regra hoje **não** recalcula o passado.
  *Aviso:* o mock recalcula pela regra vigente para ser simples; **isso não deve ser copiado**.
- **Percentual:** o front limita a faixa (0 a 20%) só como conveniência; o limite real é do backend, e a
  alteração exige **justificativa**, **step-up (TOTP)** e **segregação de funções** (quem altera regra não
  autoriza pagamento).
- **Situações:** `PREVISTA` (parcela ainda a vencer), `DISPONIVEL`, `PAGA`, `ESTORNADA`. Parcela vencida
  e não paga **não gera** comissão. Estorno é **novo lançamento** que referencia o original.
- **Vínculo:** o evento só gera comissão se ocorreu dentro da vigência do vínculo (seção 8.3). O que já
  foi gerado permanece depois da perda da base; o futuro deixa de nascer.

### 16.2 Metas, desempenho e ranking

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/me/desempenho` | CORRESPONDENTE | Seus indicadores, sua meta e **sua** posição |
| GET | `/desempenho` | ADMIN | Ranking e metas da rede |
| PUT | `/metas/{correspondenteId}` | ADMIN | `{ metaClientes, metaValorOriginado }` |

**Definições de indicador a fixar com a Cobrança e a Formalização**, para o número do correspondente bater
com o do restante do SEP:

- **Clientes captados:** vínculos criados por `CAPTACAO` no período.
- **Crédito originado:** soma do valor **liberado** (e não só proposto) dos contratos dos clientes captados.
- **Conversão:** prospects `CONTRATADO` ou `ATIVO` ÷ prospects cadastrados no período.
- **Inadimplência:** parcelas vencidas ÷ parcelas já devidas da carteira vigente.
- **Atingimento da meta:** média do atingimento de clientes e de valor (ou outra regra; **EM ABERTO**).

**Privacidade do ranking:** o correspondente recebe **só a própria posição e o total** de correspondentes.
Nomes e números dos demais ficam restritos ao ADMIN. *Por quê:* evita exposição entre concorrentes diretos
da mesma rede e reduz risco de dados pessoais de terceiros.

**Período da meta:** o mock usa o ano. Definir periodicidade (mensal, trimestral, anual) e histórico das
metas anteriores (a meta é versionada, como a regra).

---

## 17. Auditoria

`GET /correspondentes/auditoria` (ADMIN, **somente leitura**). Exportação em CSV pelo front, com
neutralização de fórmulas (o utilitário do sistema já faz).

### Modelo do evento

```
evento_auditoria
  id, quando (timestamp com fuso), ator (usuário), papel, acao, entidade, entidade_id,
  detalhe (texto legível), valores_antes (json), valores_depois (json), ip, user_agent, origem
```

### Catálogo mínimo de ações

`CADASTRO_RENOVADO`, `VINCULO_REATRIBUIDO`, `VINCULO_ENCERRADO`, `ENVIO_CRIADO`, `ENVIO_VALIDADO`,
`ENVIO_DEVOLVIDO`, `REGRA_COMISSAO_ALTERADA`, `META_ALTERADA`, `PROSPECT_CRIADO`, `PROSPECT_MOVIDO`,
`INTERACAO_REGISTRADA`. Acrescentar: aprovação e suspensão de correspondente, geração e autorização de
pagamento de comissão, **leitura de dados de cliente por correspondente** e login/logout.

### Requisitos

1. **Append-only:** nenhum perfil, nem ADMIN, edita ou apaga evento. Considerar encadeamento por hash
   (cada evento guarda o hash do anterior) para detectar adulteração.
2. **Gravar na mesma transação** da alteração: ou os dois acontecem, ou nenhum. *Por quê:* auditoria que
   pode ficar para trás não prova nada.
3. **Valores antes e depois** para alterações de regra, meta, validade e vínculo.
4. **Quem audita:** hoje ADMIN. Recomendo um perfil de **auditoria/compliance** separado, para que o
   administrador não seja o único a revisar as próprias ações.
5. **Retenção:** prazo definido com o jurídico; o log de acesso a dado pessoal tem prazo próprio.
6. **Sem excesso de dado pessoal no `detalhe`:** usar o identificador e mascarar documento.

---

## 18. Relatórios

O front gera hoje cinco relatórios CSV do correspondente (carteira, parcelas, comissões, funil e agenda)
e três da administração (comissões da rede, desempenho e auditoria), **a partir dos dados que a API já
devolveu** à própria pessoa. Isso evita endpoint extra, mas tem limite.

**Para o backend:**

- Relatório grande ou de longo período deve ser **gerado no servidor** (assíncrono, com notificação),
  **com a mesma regra de escopo** das telas, e entregue por URL assinada e de curta duração.
- Registrar em auditoria **quem exportou o quê**.
- Manter a neutralização de **injeção de fórmula** em CSV e o BOM para abrir acentos no Excel.
- Não incluir no relatório do correspondente nenhum dado que a tela dele não mostra.

---

## 19. Testes de aceite adicionais

12. Correspondente A não lê nem altera prospect, interação, comissão ou desempenho do B (404).
13. O correspondente não consegue levar um prospect às etapas de decisão (`ANALISE_CREDITO`,
    `APROVADO`, `CONTRATADO`) por conta própria.
14. Alterar regra de comissão cria nova versão, exige justificativa e TOTP, e **não altera lançamentos
    já gerados**; o lançamento novo registra a versão aplicada.
15. Parcela vencida e não paga não gera comissão; parcela paga gera uma vez só (idempotência por parcela).
16. Após a perda do vínculo, o que já foi gerado permanece e eventos posteriores não geram comissão.
17. O correspondente vê a própria posição no ranking e nenhum dado de outro correspondente.
18. Toda alteração de regra, meta, vínculo e envio grava evento de auditoria **na mesma transação**, e a
    tentativa de editar ou apagar um evento é recusada.
19. Exportação de relatório respeita o escopo e neutraliza fórmulas em CSV.

---

## 20. Rede de sub-correspondentes

O correspondente **majoritário** pode credenciar **sub-correspondentes**, que também lançam clientes. O
majoritário acompanha a carteira e a comissão da rede inteira e define quanto de cada comissão repassa a
cada sub, sempre **abaixo do teto que o SEP fixa por produto**. A rede tem **um nível só**: um sub não
credencia outros subs.

### 20.1 Modelo

- `Correspondente.nivel`: `MAJORITARIO` ou `SUB`; `Correspondente.majoritarioId` (nulo no majoritário).
- `RegraComissao.tetoSub`: maior percentual que o SEP aceita repassar a um sub naquele produto.
  Restrição: `0 <= tetoSub <= percentual` da regra. É alterado pela administração, com justificativa,
  TOTP e nova versão da regra (mesma mecânica da seção 16.1).
- `PercentualSub(subId, produto, percentual)`: o repasse que o majoritário definiu. Restrição:
  `percentual <= tetoSub` **da regra vigente**. Cada alteração gera versão e entra na auditoria.
- Status do sub: `PENDENTE` (cadastro enviado, aguardando a validação do SEP), `ATIVO` ou `SUSPENSO`. Só
  `ATIVO` capta e lança clientes.

### 20.2 Regra de repasse

Para cada evento de comissão de um cliente do sub, com `bruta = base x percentual da regra`:

- comissão do sub = `base x percentual do sub` (lançamento do próprio sub);
- margem do majoritário = `bruta - comissão do sub` (lançamento `MARGEM_SUB` do majoritário).

A soma dos dois **é igual à comissão bruta**. Se o teto da regra baixar depois, os lançamentos já gerados
**não mudam**; só os novos usam o percentual vigente. Eventos estornados estornam as duas pontas.

### 20.3 Isolamento

- O majoritário vê a própria carteira e a de **seus** subs; nunca a de outro majoritário (404).
- O sub vê **somente a própria carteira e a própria comissão**, o nome do majoritário e **os próprios
  percentuais**. Não vê outros subs nem a margem do majoritário.
- Cliente captado por um sub fica com **vínculo no sub**; as regras de perda de base da seção 5 valem para
  ele. Suspender ou descredenciar o sub **não** transfere clientes sozinho: a administração decide.

### 20.4 Endpoints

| Método e rota                                   | Papel                | Descrição                                                                 |
| ----------------------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| `GET /correspondentes/me/rede/posicao`          | CORRESPONDENTE       | Nível, majoritário (se sub) e os próprios percentuais.                    |
| `GET /correspondentes/me/rede`                  | majoritário          | Subs, tetos por produto e consolidado da rede.                            |
| `POST /correspondentes/me/rede/subs`            | majoritário          | Credencia um sub (`nome, cpf, email, telefone, percentuais[]`). 201.      |
| `PUT /correspondentes/me/rede/subs/{id}/percentuais` | majoritário     | `{percentuais[], justificativa}`.                                         |
| `POST /correspondentes/me/rede/subs/{id}/suspender` e `/reativar` | majoritário | Muda o status; 409 se o cadastro ainda é `PENDENTE`.        |
| `GET /correspondentes/me/rede/carteira`         | majoritário          | Operações próprias e dos subs, com `origem`.                              |
| `GET /correspondentes/me/rede/comissoes`        | majoritário          | Comissão por origem: bruta, repasse e líquida.                            |
| `PUT /correspondentes/comissoes/regras/{id}`    | ADMIN                | Passa a aceitar `tetoSub`; 400 se fora de `0..percentual`.                |

Erros: `403` para sub (ou não correspondente) nas rotas de majoritário; `404` para sub de outra rede;
`409` para e-mail já cadastrado; `422` quando algum percentual passa do `tetoSub` (a mensagem diz o
produto e o teto); `400` para dados inválidos ou justificativa ausente.

### 20.5 Auditoria

Ações novas: `SUB_CRIADO`, `PERCENTUAIS_SUB_ALTERADOS` (guardar valor anterior e novo por produto e a
justificativa), `SUB_SUSPENSO`, `SUB_REATIVADO`, e a alteração de `tetoSub` na regra. Mesma exigência da
seção 17: gravar na mesma transação e impedir edição.

### 20.6 Em aberto (jurídico e fiscal)

- Natureza da relação entre majoritário e sub (subcontratação do correspondente bancário): o regulamento
  aplicável pode exigir **cadastro e validação do sub pelo SEP**, que o front já trata como `PENDENTE`.
- Quem paga a comissão do sub: hoje o desenho assume pagamento pelo SEP ao sub, com a margem ao majoritário;
  se o majoritário pagar o sub, há implicação fiscal e de retenção a definir.
- Responsabilidade do majoritário pela conduta e pela documentação enviada por seus subs.

## 21. Testes de aceite da rede

20. Um repasse acima do `tetoSub` da regra é recusado (422) na criação e na alteração do sub.
21. A soma da comissão do sub com a margem do majoritário é igual à comissão bruta, evento a evento.
22. O sub não lê dados de outro sub nem a margem do majoritário (403 ou 404).
23. Um majoritário não altera nem lê sub de outra rede (404).
24. Baixar o `tetoSub` não altera lançamentos já gerados.
25. Sub `PENDENTE` ou `SUSPENSO` não lança cliente nem gera comissão.
